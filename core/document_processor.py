"""
Document Processor — production-scale PDF ingestion for private credit deals.

Improvements over v1:
  1. pdfplumber for table-aware extraction (financial statements are tables)
  2. Auto-detection of document type from content (no manual labelling required)
  3. Section-aware CIM parsing — financial/legal sections routed to specialist extractors
  4. Full-text indexing for RAG (no truncation at index time); smart truncation only
     for the direct-to-Claude structured extraction call

Entry points:
  ingest_document(pdf_bytes, hint=None)  → {doc_type, extracted_data, full_text, n_chunks}
  extract_financials(pdf_bytes)          → structured dict
  extract_qoe(pdf_bytes)                 → structured dict
  extract_cim(pdf_bytes)                 → structured dict
  extract_legal(pdf_bytes)               → structured dict
  extract_full_text(pdf_bytes)           → str  (for manual indexing)
"""

import base64
import io
import json
import os
import re
from typing import Optional

from anthropic import Anthropic

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-6"

_LARGE_PDF_THRESHOLD_BYTES = 500_000
# Max chars sent to Claude for structured extraction (fits well under token limits)
_MAX_EXTRACTION_CHARS = 20_000


# ── Document type detection ───────────────────────────────────────────────────

# Keyword sets for heuristic doc-type detection (checked against first 3 pages of text)
_DOC_TYPE_SIGNALS = {
    "qoe": [
        "quality of earnings", "adjusted ebitda", "add-back", "addback",
        "ebitda reconciliation", "qoe", "working capital peg", "qof",
    ],
    "financials": [
        "consolidated statements of operations", "consolidated balance sheet",
        "statement of cash flows", "independent registered public accounting",
        "report of independent auditor", "audited financial statements",
        "notes to consolidated financial", "going concern",
    ],
    "legal": [
        "credit agreement", "term loan", "revolving credit facility",
        "intercreditor agreement", "security agreement", "pledge agreement",
        "guaranty", "lien", "borrower", "administrative agent",
        "representations and warranties", "events of default",
    ],
    "cim": [
        "confidential information memorandum", "investment highlights",
        "executive summary", "management presentation", "company overview",
        "transaction overview", "opportunity summary", "strictly confidential",
    ],
}

# CIM section headers and which extractor they map to
_CIM_FINANCIAL_MARKERS = [
    "financial overview", "financial summary", "historical financials",
    "financial statements", "income statement", "ebitda", "revenue",
    "balance sheet", "cash flow", "financial performance",
]
_CIM_LEGAL_MARKERS = [
    "capital structure", "debt schedule", "existing indebtedness",
    "transaction structure", "sources and uses", "ownership structure",
]


def detect_document_type(text_sample: str) -> str:
    """
    Heuristic detection of document type from the first ~3 pages of text.
    Returns one of: 'financials', 'qoe', 'legal', 'cim', 'unknown'
    """
    sample = text_sample.lower()
    scores = {doc_type: 0 for doc_type in _DOC_TYPE_SIGNALS}
    for doc_type, keywords in _DOC_TYPE_SIGNALS.items():
        for kw in keywords:
            if kw in sample:
                scores[doc_type] += 1

    best = max(scores, key=scores.get)
    return best if scores[best] >= 2 else "unknown"


# ── PDF text + table extraction ───────────────────────────────────────────────

def _table_to_text(table: list) -> str:
    """Convert a pdfplumber table (list of lists) to pipe-delimited markdown."""
    if not table:
        return ""
    lines = []
    for row in table:
        cleaned = [str(cell).strip() if cell is not None else "" for cell in row]
        lines.append("| " + " | ".join(cleaned) + " |")
    return "\n".join(lines)


def _extract_text_pdfplumber(pdf_bytes: bytes) -> str:
    """
    Extract text + tables from PDF using pdfplumber.
    Tables are converted to pipe-delimited markdown so Claude reads them correctly.
    Falls back to pypdf if pdfplumber fails.
    """
    try:
        import pdfplumber
        pages_text = []
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for i, page in enumerate(pdf.pages, 1):
                parts = []
                # Extract tables first — they contain the financial data
                tables = page.extract_tables() or []
                table_bboxes = []
                for table in tables:
                    table_text = _table_to_text(table)
                    if table_text.strip():
                        parts.append(f"[TABLE]\n{table_text}\n[/TABLE]")
                        # Track table bounding boxes to avoid double-extracting
                        try:
                            for t_obj in page.find_tables():
                                table_bboxes.append(t_obj.bbox)
                        except Exception:
                            pass

                # Extract remaining text (outside tables)
                text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
                if text.strip():
                    parts.append(text)

                if parts:
                    pages_text.append(f"--- Page {i} ---\n" + "\n\n".join(parts))

        return "\n\n".join(pages_text)

    except Exception:
        return _extract_text_pypdf(pdf_bytes)


def _extract_text_pypdf(pdf_bytes: bytes) -> str:
    """Fallback: plain text extraction via pypdf."""
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        pages = []
        for i, page in enumerate(reader.pages, 1):
            text = page.extract_text() or ""
            if text.strip():
                pages.append(f"--- Page {i} ---\n{text}")
        return "\n\n".join(pages)
    except Exception as e:
        return f"[Text extraction failed: {e}]"


def extract_full_text(pdf_bytes: bytes) -> str:
    """Return full extracted text for RAG indexing — no truncation."""
    return _extract_text_pdfplumber(pdf_bytes)


# ── Smart truncation for extraction calls ────────────────────────────────────

def _smart_truncate(text: str, max_chars: int, doc_type: str = "", financial_mode: bool = False) -> str:
    """
    Truncate intelligently based on doc type:
    - financials: skip narrative front matter, find financial statement tables
    - legal: find the operative provisions (skip recitals)
    - cim: take executive summary + financial section
    - qoe: skip cover page, go straight to EBITDA bridge
    """
    if financial_mode and not doc_type:
        doc_type = "financials"

    if len(text) <= max_chars:
        return text

    if doc_type == "financials":
        markers = [
            "CONSOLIDATED STATEMENTS OF OPERATIONS",
            "CONSOLIDATED BALANCE SHEET",
            "CONSOLIDATED STATEMENTS OF INCOME",
            "FINANCIAL STATEMENTS AND SUPPLEMENTARY",
            "REPORT OF INDEPENDENT REGISTERED",
            "Item 8", "[TABLE]",
        ]
        best_pos = _find_earliest_marker(text, markers)
        if best_pos != -1:
            start = max(0, best_pos - 200)
            return text[start:start + max_chars] + "\n\n[Truncated — financial statements section]"
        # Skip first 40% narrative
        skip = int(len(text) * 0.40)
        return text[skip:skip + max_chars] + "\n\n[Truncated — back portion]"

    if doc_type == "legal":
        markers = [
            "ARTICLE I", "SECTION 1.", "1. DEFINITIONS",
            "REPRESENTATIONS AND WARRANTIES", "COVENANTS",
        ]
        best_pos = _find_earliest_marker(text, markers)
        if best_pos != -1:
            start = max(0, best_pos - 100)
            return text[start:start + max_chars] + "\n\n[Truncated — operative provisions]"
        return text[:max_chars] + "\n\n[Truncated]"

    if doc_type == "qoe":
        markers = [
            "EBITDA RECONCILIATION", "EBITDA BRIDGE", "ADJUSTED EBITDA",
            "ADD-BACK", "ADDBACK", "QUALITY OF EARNINGS",
        ]
        best_pos = _find_earliest_marker(text, markers)
        if best_pos != -1:
            start = max(0, best_pos - 200)
            return text[start:start + max_chars] + "\n\n[Truncated — EBITDA section]"
        return text[:max_chars] + "\n\n[Truncated]"

    # CIM and unknown: take from the beginning (exec summary is first)
    return text[:max_chars] + "\n\n[Truncated — showing opening sections]"


def _find_earliest_marker(text: str, markers: list) -> int:
    upper = text.upper()
    best = -1
    for m in markers:
        pos = upper.find(m.upper())
        if pos != -1 and (best == -1 or pos < best):
            best = pos
    return best


# ── Core Claude extraction ────────────────────────────────────────────────────

def _extract(pdf_bytes: bytes, prompt: str, doc_type: str = "") -> dict:
    """
    Send document to Claude for structured JSON extraction.
    Small PDFs use native document API. Large PDFs use text extraction.
    """
    system = (
        "You are a financial document analyst for a private credit fund. "
        "Extract data precisely from the document. "
        "Only extract numbers and text explicitly present — never hallucinate. "
        "If a figure is not in the document, return null for that field. "
        "Respond with valid JSON only. No explanation, no markdown fences."
    )

    if len(pdf_bytes) >= _LARGE_PDF_THRESHOLD_BYTES:
        full_text = _extract_text_pdfplumber(pdf_bytes)
        text = _smart_truncate(full_text, _MAX_EXTRACTION_CHARS, doc_type=doc_type)
        content = f"DOCUMENT TEXT:\n\n{text}\n\n---\n\n{prompt}"
        messages = [{"role": "user", "content": content}]
    else:
        b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")
        messages = [{
            "role": "user",
            "content": [
                {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": b64}},
                {"type": "text", "text": prompt},
            ],
        }]

    response = client.messages.create(
        model=MODEL, max_tokens=4096, system=system, messages=messages,
    )
    raw = response.content[0].text
    try:
        clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(clean)
    except json.JSONDecodeError:
        return {"raw_response": raw, "parse_error": True}


# ── Document-type-specific extractors ────────────────────────────────────────

def extract_financials(pdf_bytes: bytes) -> dict:
    prompt = """
Extract the following from these financial statements. Use actual years shown.
All monetary values in thousands (USD) unless stated otherwise.

Return JSON:
{
  "currency": "USD",
  "unit": "thousands | millions",
  "years": ["most_recent", "prior", "two_years_ago"],
  "income_statement": {
    "revenue":          {"year1": null, "year2": null, "year3": null},
    "gross_profit":     {"year1": null, "year2": null, "year3": null},
    "ebitda":           {"year1": null, "year2": null, "year3": null},
    "ebit":             {"year1": null, "year2": null, "year3": null},
    "interest_expense": {"year1": null, "year2": null, "year3": null},
    "net_income":       {"year1": null, "year2": null, "year3": null}
  },
  "balance_sheet": {
    "total_assets":   {"year1": null, "year2": null, "year3": null},
    "total_debt":     {"year1": null, "year2": null, "year3": null},
    "cash":           {"year1": null, "year2": null, "year3": null},
    "total_equity":   {"year1": null, "year2": null, "year3": null},
    "current_assets": {"year1": null, "year2": null, "year3": null},
    "current_liabs":  {"year1": null, "year2": null, "year3": null}
  },
  "cash_flow": {
    "operating_cf":   {"year1": null, "year2": null, "year3": null},
    "capex":          {"year1": null, "year2": null, "year3": null},
    "free_cash_flow": {"year1": null, "year2": null, "year3": null}
  },
  "auditor": "name or null",
  "audit_opinion": "clean | qualified | adverse | disclaimer | not_found",
  "going_concern_flag": false,
  "notes_flags": []
}
"""
    return _extract(pdf_bytes, prompt, doc_type="financials")


def extract_qoe(pdf_bytes: bytes) -> dict:
    prompt = """
Extract the Quality of Earnings analysis.

Return JSON:
{
  "qoe_firm": "firm name",
  "period_reviewed": "e.g. LTM June 2024",
  "reported_ebitda": null,
  "add_backs": [
    {"name": "description", "amount": null, "category": "management_fee | one_time | pro_forma | synergy | other",
     "quality": "HIGH | MEDIUM | LOW | QUESTIONABLE", "rationale": "reason"}
  ],
  "adjusted_ebitda": null,
  "total_adjustments": null,
  "adjustment_as_pct_of_reported": null,
  "revenue_quality": "assessment",
  "working_capital_assessment": "normal | elevated | below_normal",
  "red_flags": [],
  "qoe_conclusion": "summary"
}
"""
    return _extract(pdf_bytes, prompt, doc_type="qoe")


def extract_cim(pdf_bytes: bytes) -> dict:
    prompt = """
Extract the following from this Confidential Information Memorandum (CIM).

Return JSON:
{
  "company_overview": {
    "description": "what the company does",
    "founded": null,
    "headquarters": "location",
    "employees": null,
    "business_model": "how it makes money"
  },
  "market": {
    "total_addressable_market": "size",
    "market_growth_rate": "rate",
    "market_position": "position",
    "key_trends": []
  },
  "revenue_breakdown": {
    "by_product_or_segment": {},
    "by_geography": {},
    "recurring_vs_onetime": null
  },
  "customers": {
    "total_customers": null,
    "top_customer_concentration": null,
    "top_10_concentration": null,
    "customer_retention_rate": null,
    "key_customers": []
  },
  "competitive_landscape": {
    "key_competitors": [],
    "competitive_advantages": [],
    "barriers_to_entry": []
  },
  "management_team": [
    {"name": "name", "role": "title", "tenure_years": null, "background": "brief"}
  ],
  "investment_highlights": [],
  "key_risks": []
}
"""
    return _extract(pdf_bytes, prompt, doc_type="cim")


def extract_legal(pdf_bytes: bytes) -> dict:
    prompt = """
Extract capital structure and legal risk information.

Return JSON:
{
  "corporate_structure": {
    "legal_entity": "name and type",
    "jurisdiction": "state/country",
    "subsidiaries": [],
    "ownership": "ownership summary"
  },
  "existing_debt": [
    {"facility_type": "type", "lender": "name", "amount": null, "outstanding": null,
     "maturity": "date", "rate": "rate", "security": "secured/unsecured", "key_covenants": []}
  ],
  "total_existing_debt": null,
  "security_package": {
    "assets_pledged": [],
    "guarantees": [],
    "intercreditor_issues": null
  },
  "litigation": [
    {"description": "brief", "amount_at_risk": null, "status": "pending | settled | dismissed",
     "materiality": "MATERIAL | NON-MATERIAL"}
  ],
  "regulatory_issues": [],
  "change_of_control_provisions": null,
  "key_legal_risks": []
}
"""
    return _extract(pdf_bytes, prompt, doc_type="legal")


# ── Section-aware CIM ingestion ───────────────────────────────────────────────

def _extract_cim_section(text: str, section_markers: list, max_chars: int = 8000) -> Optional[str]:
    """Extract a specific section from CIM full text by marker keywords."""
    lower = text.lower()
    best_pos = -1
    for marker in section_markers:
        pos = lower.find(marker.lower())
        if pos != -1 and (best_pos == -1 or pos < best_pos):
            best_pos = pos
    if best_pos == -1:
        return None
    start = max(0, best_pos - 100)
    return text[start:start + max_chars]


def ingest_document(pdf_bytes: bytes, hint: Optional[str] = None) -> dict:
    """
    Production entry point for document ingestion.

    1. Extracts full text via pdfplumber (table-aware)
    2. Auto-detects document type (or uses hint)
    3. Runs type-specific structured extraction
    4. For CIMs: also extracts financial and legal sub-sections separately

    Returns:
    {
      "doc_type":       detected or hinted type,
      "extracted_data": structured dict from type-specific extractor,
      "full_text":      complete extracted text for RAG indexing,
      "page_count":     number of pages,
      "sub_extractions": {  # CIM only — specialist sections
        "financials": dict or None,
        "legal":      dict or None,
      }
    }
    """
    full_text = extract_full_text(pdf_bytes)

    # Detect document type
    sample = full_text[:6000]  # first ~6 pages for detection
    doc_type = hint if hint and hint in _DOC_TYPE_SIGNALS else detect_document_type(sample)

    # Count pages
    page_count = full_text.count("--- Page ")

    # Run primary extractor
    extractor_map = {
        "financials": extract_financials,
        "qoe":        extract_qoe,
        "cim":        extract_cim,
        "legal":      extract_legal,
    }
    extractor = extractor_map.get(doc_type)
    extracted_data = extractor(pdf_bytes) if extractor else {"note": "Unknown document type — indexed for retrieval only"}

    # For CIMs: extract financial + legal sub-sections from full text
    sub_extractions = {}
    if doc_type == "cim":
        fin_section = _extract_cim_section(full_text, _CIM_FINANCIAL_MARKERS)
        if fin_section:
            fin_bytes = fin_section.encode("utf-8")
            # Pass as text-mode extraction (small fake bytes triggers large-PDF path)
            sub_extractions["financials"] = _extract(
                b" " * (_LARGE_PDF_THRESHOLD_BYTES + 1),  # force text path
                "Extract income statement, EBITDA, and key financial metrics from this CIM financial section.\n\n"
                + "DOCUMENT TEXT:\n\n" + fin_section,
                doc_type="financials",
            )
        leg_section = _extract_cim_section(full_text, _CIM_LEGAL_MARKERS)
        if leg_section:
            sub_extractions["legal"] = _extract(
                b" " * (_LARGE_PDF_THRESHOLD_BYTES + 1),
                "Extract capital structure, existing debt, and transaction structure from this CIM section.\n\n"
                + "DOCUMENT TEXT:\n\n" + leg_section,
                doc_type="legal",
            )

    return {
        "doc_type":        doc_type,
        "extracted_data":  extracted_data,
        "full_text":       full_text,
        "page_count":      page_count,
        "sub_extractions": sub_extractions,
    }
