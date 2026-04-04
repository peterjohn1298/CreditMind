"""
Document Processor — sends uploaded PDFs directly to Claude for extraction.
Claude reads the actual document and extracts structured financial data.

Strategy:
  - Small PDFs (<500KB): sent via Claude document API (native, best for formatted docs)
  - Large PDFs (>=500KB): text extracted via PyPDF2, sent as plain text (avoids rate limits)
"""

import base64
import io
import json
import os
from anthropic import Anthropic

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-6"

# PDFs larger than this are text-extracted instead of sent as document blocks
_LARGE_PDF_THRESHOLD_BYTES = 500_000
# Max characters of extracted text to send (~3,500 tokens — well under 30k/min limit)
_MAX_TEXT_CHARS = 14_000


def _extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract plain text from a PDF using pypdf (falls back to PyPDF2)."""
    try:
        try:
            import pypdf as pdf_lib
        except ImportError:
            import PyPDF2 as pdf_lib

        reader = pdf_lib.PdfReader(io.BytesIO(pdf_bytes))
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages.append(f"--- Page {i+1} ---\n{text}")
        return "\n\n".join(pages)
    except Exception as e:
        return f"[Text extraction failed: {e}]"


def _smart_truncate(text: str, max_chars: int, financial_mode: bool = False) -> str:
    """
    Truncate text intelligently.
    financial_mode: for annual reports, skip narrative front matter and
    jump to the financial statements section (usually in the back half).
    """
    if len(text) <= max_chars:
        return text

    if financial_mode:
        # Search for financial statement section markers
        markers = [
            "CONSOLIDATED STATEMENTS OF OPERATIONS",
            "CONSOLIDATED BALANCE SHEET",
            "CONSOLIDATED STATEMENTS OF INCOME",
            "FINANCIAL STATEMENTS AND SUPPLEMENTARY",
            "REPORT OF INDEPENDENT REGISTERED",
            "Item 8",
        ]
        best_pos = -1
        for marker in markers:
            pos = text.upper().find(marker.upper())
            if pos != -1 and (best_pos == -1 or pos < best_pos):
                best_pos = pos

        if best_pos != -1:
            # Start from 500 chars before the marker to catch context
            start = max(0, best_pos - 500)
            excerpt = text[start:start + max_chars]
            return excerpt + "\n\n[Document truncated — showing financial statements section]"

        # Fallback: skip first 40% (narrative) and take from there
        skip = int(len(text) * 0.40)
        return text[skip:skip + max_chars] + "\n\n[Document truncated — showing back portion]"

    # Default: take from the beginning
    return text[:max_chars] + "\n\n[Document truncated for length]"


def _extract(pdf_bytes: bytes, prompt: str, financial_mode: bool = False) -> dict:
    """Core extraction: send PDF to Claude, get structured JSON back.

    Routes large PDFs through text extraction to avoid rate limits.
    financial_mode: uses smarter truncation to find financial statement tables.
    """
    system = (
        "You are a financial document analyst for a private credit fund. "
        "Extract data precisely from the document. "
        "Only extract numbers and text that are explicitly present — never hallucinate figures. "
        "If a figure is not in the document, return null for that field. "
        "Respond with valid JSON only. No explanation, no markdown fences."
    )

    if len(pdf_bytes) >= _LARGE_PDF_THRESHOLD_BYTES:
        # Large PDF — extract text and send as plain text message
        full_text = _extract_text_from_pdf(pdf_bytes)
        extracted_text = _smart_truncate(full_text, _MAX_TEXT_CHARS, financial_mode=financial_mode)
        content = f"DOCUMENT TEXT:\n\n{extracted_text}\n\n---\n\n{prompt}"
        messages = [{"role": "user", "content": content}]
    else:
        # Small PDF — use native document API
        b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": b64,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ]

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=system,
        messages=messages,
    )

    raw = response.content[0].text
    try:
        clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(clean)
    except json.JSONDecodeError:
        return {"raw_response": raw, "parse_error": True}


def extract_financials(pdf_bytes: bytes) -> dict:
    """
    Extract 3-year income statement, balance sheet, and cash flow
    from audited financial statements PDF.
    """
    prompt = """
Extract the following from these financial statements. Use the actual years shown in the document.
All monetary values in thousands (USD) unless document states otherwise — note the unit.

Return JSON:
{
  "currency": "USD",
  "unit": "thousands | millions",
  "years": ["most_recent_year", "prior_year", "two_years_ago"],
  "income_statement": {
    "revenue":          {"year1": null, "year2": null, "year3": null},
    "gross_profit":     {"year1": null, "year2": null, "year3": null},
    "ebitda":           {"year1": null, "year2": null, "year3": null},
    "ebit":             {"year1": null, "year2": null, "year3": null},
    "interest_expense": {"year1": null, "year2": null, "year3": null},
    "net_income":       {"year1": null, "year2": null, "year3": null}
  },
  "balance_sheet": {
    "total_assets":     {"year1": null, "year2": null, "year3": null},
    "total_debt":       {"year1": null, "year2": null, "year3": null},
    "cash":             {"year1": null, "year2": null, "year3": null},
    "total_equity":     {"year1": null, "year2": null, "year3": null},
    "current_assets":   {"year1": null, "year2": null, "year3": null},
    "current_liabs":    {"year1": null, "year2": null, "year3": null}
  },
  "cash_flow": {
    "operating_cf":     {"year1": null, "year2": null, "year3": null},
    "capex":            {"year1": null, "year2": null, "year3": null},
    "free_cash_flow":   {"year1": null, "year2": null, "year3": null}
  },
  "auditor": "auditor name if present",
  "audit_opinion": "clean | qualified | adverse | disclaimer | not_found",
  "going_concern_flag": true_or_false,
  "notes_flags": ["any significant accounting notes worth flagging"]
}
"""
    return _extract(pdf_bytes, prompt, financial_mode=True)


def extract_qoe(pdf_bytes: bytes) -> dict:
    """
    Extract EBITDA adjustments and Quality of Earnings findings.
    """
    prompt = """
Extract the Quality of Earnings analysis from this report.

Return JSON:
{
  "qoe_firm": "accounting firm name",
  "period_reviewed": "e.g. LTM June 2024",
  "reported_ebitda": null,
  "add_backs": [
    {
      "name": "add-back description",
      "amount": null,
      "category": "management_fee | one_time | pro_forma | synergy | other",
      "quality": "HIGH | MEDIUM | LOW | QUESTIONABLE",
      "rationale": "why this add-back is or is not supportable"
    }
  ],
  "adjusted_ebitda": null,
  "total_adjustments": null,
  "adjustment_as_pct_of_reported": null,
  "revenue_quality": "assessment of revenue recognition and sustainability",
  "working_capital_assessment": "normal | elevated | below_normal",
  "red_flags": ["list any concerns raised in the QoE"],
  "qoe_conclusion": "overall QoE opinion summary"
}
"""
    return _extract(pdf_bytes, prompt)


def extract_cim(pdf_bytes: bytes) -> dict:

    """
    Extract company overview, market, and commercial information from CIM.
    """
    prompt = """
Extract the following from this Confidential Information Memorandum (CIM).

Return JSON:
{
  "company_overview": {
    "description": "what the company does",
    "founded": "year or null",
    "headquarters": "location",
    "employees": "headcount or null",
    "business_model": "description of how it makes money"
  },
  "market": {
    "total_addressable_market": "size and description",
    "market_growth_rate": "percentage or description",
    "market_position": "market share or rank",
    "key_trends": ["trend1", "trend2"]
  },
  "revenue_breakdown": {
    "by_product_or_segment": {"segment_name": "percentage"},
    "by_geography": {"region": "percentage"},
    "recurring_vs_onetime": "percentage recurring if mentioned"
  },
  "customers": {
    "total_customers": null,
    "top_customer_concentration": "top customer as % of revenue",
    "top_10_concentration": "top 10 as % of revenue",
    "customer_retention_rate": null,
    "key_customers": ["customer1", "customer2"]
  },
  "competitive_landscape": {
    "key_competitors": ["competitor1", "competitor2"],
    "competitive_advantages": ["advantage1", "advantage2"],
    "barriers_to_entry": ["barrier1", "barrier2"]
  },
  "management_team": [
    {"name": "name", "role": "title", "tenure_years": null, "background": "brief"}
  ],
  "investment_highlights": ["highlight1", "highlight2", "highlight3"],
  "key_risks": ["risk1", "risk2", "risk3"]
}
"""
    return _extract(pdf_bytes, prompt)


def extract_legal(pdf_bytes: bytes) -> dict:
    """
    Extract capital structure, existing debt, and legal risk information.
    """
    prompt = """
Extract the following legal and capital structure information from this document.

Return JSON:
{
  "corporate_structure": {
    "legal_entity": "entity name and type",
    "jurisdiction": "state/country of incorporation",
    "subsidiaries": ["list of key subsidiaries"],
    "ownership": "ownership structure summary"
  },
  "existing_debt": [
    {
      "facility_type": "e.g. revolving credit, term loan A",
      "lender": "lender name",
      "amount": null,
      "outstanding": null,
      "maturity": "date",
      "rate": "interest rate",
      "security": "secured | unsecured | details",
      "key_covenants": ["covenant1", "covenant2"]
    }
  ],
  "total_existing_debt": null,
  "security_package": {
    "assets_pledged": ["asset1", "asset2"],
    "guarantees": ["guarantor1"],
    "intercreditor_issues": "any intercreditor concerns"
  },
  "litigation": [
    {
      "description": "brief description",
      "amount_at_risk": null,
      "status": "pending | settled | dismissed",
      "materiality": "MATERIAL | NON-MATERIAL"
    }
  ],
  "regulatory_issues": ["any regulatory flags"],
  "change_of_control_provisions": "description if present",
  "key_legal_risks": ["risk1", "risk2"]
}
"""
    return _extract(pdf_bytes, prompt, financial_mode=True)
