"""
Agent 2: EBITDA Analyst (Wave 1 — runs in parallel)
Reads the Quality of Earnings report and audited financials.
Validates every add-back. Produces the clean, defensible EBITDA figure
that underpins all leverage and coverage calculations.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import EBITDA_ANALYST_TOOLS
from core.credit_state import log_agent


class EBITDAAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "EBITDA Analyst"

    @property
    def role(self) -> str:
        return (
            "You are a senior accounting analyst at a private credit fund. "
            "Your sole job is to validate the borrower's EBITDA figure. "
            "You review every add-back with professional skepticism — management always overstates. "
            "Categorize each add-back: SUPPORTABLE (clearly one-time, well-documented), "
            "QUESTIONABLE (recurring disguised as one-time, or undocumented), "
            "REJECT (no basis for add-back). "
            "Your adjusted EBITDA is the number the credit model will be built on. "
            "Be conservative. The fund's recovery in a default scenario depends on this number being real."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        loan_amount = credit_state["loan_amount"]
        deal_id = credit_state["deal_id"]

        qoe_data = credit_state.get("documents", {}).get("qoe")
        financial_data = credit_state.get("documents", {}).get("financials")
        rag_available = credit_state.get("rag_index_summary", "")

        if not qoe_data and not financial_data:
            credit_state["ebitda_analysis"] = {
                "error": "No QoE or financial documents uploaded.",
                "adjusted_ebitda": None,
            }
            return self._log_and_audit(credit_state)

        retrieval_instruction = ""
        available_docs = []
        if rag_available and "qoe" in rag_available:
            available_docs.append("qoe")
        if rag_available and "financials" in rag_available:
            available_docs.append("financials")

        if available_docs:
            doc_list = " or ".join(f'"{d}"' for d in available_docs)
            retrieval_instruction = f"""
DOCUMENT RETRIEVAL AVAILABLE (Deal ID: {deal_id}):
Use retrieve_document_section(deal_id="{deal_id}", doc_type={doc_list}, query="...") to
search the full uploaded documents for specific EBITDA evidence. Recommended queries:
  - "EBITDA add-backs adjustments non-recurring one-time"
  - "management fees consulting fees eliminated"
  - "pro forma synergies acquisition costs"
  - "reported EBITDA adjusted EBITDA reconciliation"
  - "restructuring charges write-offs"
For each add-back you identify, note the source page as a citation.
"""

        task = f"""
Validate the EBITDA figure for {company}.
Proposed loan: ${loan_amount:,.0f}
{retrieval_instruction}
QUALITY OF EARNINGS REPORT DATA (pre-extracted):
{json.dumps(qoe_data, indent=2, default=str)[:1500] if qoe_data else "Not provided"}

AUDITED FINANCIALS DATA (pre-extracted):
{json.dumps(financial_data, indent=2, default=str)[:1500] if financial_data else "Not provided"}

Review every add-back with professional skepticism. Challenge:
- "One-time" costs that appear in multiple years
- Pro-forma adjustments for deals not yet closed
- Synergies that are speculative
- Management fee eliminations (standard but should be verified)
- Any add-back exceeding 10% of reported EBITDA

INDUSTRY BENCHMARK CONTEXT (S&P Add-back Study, 2015-2024):
Across rated leveraged-finance issuers, EBITDA add-backs averaged ~29% of reported EBITDA.
- BELOW 24%: clean QoE, conservative management
- 24-34%: in line with market — moderate scrutiny
- 35-50%: aggressive — material risk that "true" EBITDA is far below marketed figure
- ABOVE 50%: highly aggressive — adjustments alone are creating the credit story
Benchmark adjustment_as_pct_of_reported against this distribution and surface the comparison
in the vs_sp_benchmark field.

CITATION GUIDE — for every cited field use this structure:
  {{"value": <number>, "confidence": "HIGH | MEDIUM | LOW", "source_page": <int or null>, "source_quote": "<verbatim excerpt, max 120 chars, or null>"}}
  confidence: HIGH = explicitly stated | MEDIUM = calculated from stated values | LOW = estimated or not found

Produce JSON EBITDA analysis:
{{
  "reported_ebitda": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
  "add_back_analysis": [
    {{
      "name": "add-back name",
      "amount": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
      "category": "management_fee | one_time_cost | pro_forma | synergy | other",
      "verdict": "SUPPORTABLE | QUESTIONABLE | REJECT",
      "rationale": "specific reason for verdict",
      "adjusted_amount": null
    }}
  ],
  "total_supportable_adjustments": null,
  "total_questionable_adjustments": null,
  "total_rejected_adjustments": null,
  "conservative_adjusted_ebitda": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
  "base_adjusted_ebitda": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
  "adjustment_quality_score": "HIGH | MEDIUM | LOW",
  "adjustment_as_pct_of_reported": null,
  "vs_sp_benchmark": "BELOW | INLINE | ABOVE | HIGHLY_AGGRESSIVE",
  "vs_sp_benchmark_note": "1-sentence interpretation vs the 29% industry average",
  "key_concerns": ["concern1", "concern2"],
  "ebitda_conclusion": "overall assessment of EBITDA quality and reliability"
}}

conservative_adjusted_ebitda = reported + supportable adjustments only
base_adjusted_ebitda = reported + supportable + questionable adjustments
"""

        result = self.run_agentic_loop_json_validated(
            self.role, task, tools=EBITDA_ANALYST_TOOLS, credit_state=credit_state
        )
        credit_state["ebitda_analysis"] = result
        credit_state = self._log_and_audit(credit_state)
        return credit_state
