"""
Agent 10: Covenant Compliance (Post-Disbursement, Quarterly)
Checks every covenant against latest financials. Flags breaches and headroom.
"""

import json
from agents.base_agent import BaseAgent
from data.financial_data import get_key_metrics
from core.credit_state import log_agent, add_alert


class CovenantComplianceAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Covenant Compliance"

    @property
    def role(self) -> str:
        return (
            "You are a loan administration officer at a commercial bank. "
            "Your job is to check a borrower's compliance with all loan covenants each quarter. "
            "You identify breaches, near-breaches, and headroom on each financial test. "
            "A breach must be escalated immediately to legal and the credit committee."
        )

    def run(self, credit_state: dict) -> dict:
        ticker = credit_state["ticker"]
        company = credit_state["company"]
        recommended_covenants = credit_state.get("recommended_covenants", {})
        financial_covenants = recommended_covenants.get("financial_covenants", [])
        loan_amount = credit_state["loan_amount"]

        current_metrics = get_key_metrics(ticker)

        user_message = f"""
Perform quarterly covenant compliance check for {company} ({ticker}).
Loan amount: ${loan_amount:,.0f}

COVENANT PACKAGE:
{json.dumps(financial_covenants, indent=2, default=str)}

CURRENT FINANCIAL METRICS:
{json.dumps(current_metrics, indent=2, default=str)}

Check each covenant and produce structured JSON:
{{
  "covenant_checks": [
    {{
      "covenant_name": "name",
      "threshold": "the required level",
      "actual_value": null,
      "headroom": "how far from breach",
      "status": "COMPLIANT | NEAR_BREACH | BREACHED | WAIVER_NEEDED",
      "notes": "brief note"
    }}
  ],
  "overall_compliance": "FULLY_COMPLIANT | NEAR_BREACH | BREACH_DETECTED",
  "breach_details": null_or_description,
  "waiver_required": true/false,
  "recommended_action": "action to take",
  "compliance_summary": "summary for credit committee"
}}
"""

        result = self.call_claude_json(self.role, user_message)
        credit_state["covenant_status"] = result

        # Immediate escalation on breach
        overall = result.get("overall_compliance", "FULLY_COMPLIANT")
        if overall == "BREACH_DETECTED":
            add_alert(
                credit_state,
                trigger="COVENANT BREACH DETECTED",
                severity="CRITICAL",
                action_required="Immediate escalation to Legal + Credit Committee. " + (result.get("breach_details") or ""),
            )
        elif overall == "NEAR_BREACH":
            add_alert(
                credit_state,
                trigger="Covenant near-breach detected",
                severity="MEDIUM",
                action_required="Increased monitoring. Discuss with borrower.",
            )

        credit_state = log_agent(credit_state, self.name)
        return credit_state
