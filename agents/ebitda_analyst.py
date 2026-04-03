"""
Agent 2: EBITDA Analyst (Wave 1 — runs in parallel)
Reads the Quality of Earnings report and audited financials.
Validates every add-back. Produces the clean, defensible EBITDA figure
that underpins all leverage and coverage calculations.
"""

import json
from agents.base_agent import BaseAgent
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

        qoe_data = credit_state.get("documents", {}).get("qoe")
        financial_data = credit_state.get("documents", {}).get("financials")

        if not qoe_data and not financial_data:
            credit_state["ebitda_analysis"] = {
                "error": "No QoE or financial documents uploaded.",
                "adjusted_ebitda": None,
            }
            return log_agent(credit_state, self.name)

        task = f"""
Validate the EBITDA figure for {company}.
Proposed loan: ${loan_amount:,.0f}

QUALITY OF EARNINGS REPORT DATA:
{json.dumps(qoe_data, indent=2, default=str) if qoe_data else "Not provided"}

AUDITED FINANCIALS DATA:
{json.dumps(financial_data, indent=2, default=str) if financial_data else "Not provided"}

Review every add-back with professional skepticism. Challenge:
- "One-time" costs that appear in multiple years
- Pro-forma adjustments for deals not yet closed
- Synergies that are speculative
- Management fee eliminations (standard but should be verified)
- Any add-back exceeding 10% of reported EBITDA

Produce JSON EBITDA analysis:
{{
  "reported_ebitda": null,
  "add_back_analysis": [
    {{
      "name": "add-back name",
      "amount": null,
      "category": "management_fee | one_time_cost | pro_forma | synergy | other",
      "verdict": "SUPPORTABLE | QUESTIONABLE | REJECT",
      "rationale": "specific reason for verdict",
      "adjusted_amount": null
    }}
  ],
  "total_supportable_adjustments": null,
  "total_questionable_adjustments": null,
  "total_rejected_adjustments": null,
  "conservative_adjusted_ebitda": null,
  "base_adjusted_ebitda": null,
  "adjustment_quality_score": "HIGH | MEDIUM | LOW",
  "adjustment_as_pct_of_reported": null,
  "key_concerns": ["concern1", "concern2"],
  "ebitda_conclusion": "overall assessment of EBITDA quality and reliability"
}}

conservative_adjusted_ebitda = reported + supportable adjustments only
base_adjusted_ebitda = reported + supportable + questionable adjustments
"""

        result = self.run_agentic_loop_json(self.role, task, tools=[])
        credit_state["ebitda_analysis"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state
