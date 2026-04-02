"""
Agent 10: Covenant Compliance (Post-Disbursement Quarterly)
Claude fetches current financials and checks every covenant against live numbers.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import COVENANT_COMPLIANCE_TOOLS
from core.credit_state import log_agent, add_alert


class CovenantComplianceAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Covenant Compliance"

    @property
    def role(self) -> str:
        return (
            "You are a loan administration officer conducting quarterly covenant compliance checks. "
            "You check every financial covenant against the borrower's current financials. "
            "Fetch current key metrics, balance sheet, and cash flow to get precise, up-to-date values. "
            "A covenant breach must be identified immediately — do not approximate. "
            "Calculate exact headroom for each covenant. Flag near-breaches (< 15% headroom) as NEAR_BREACH."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        ticker = credit_state["ticker"]
        recommended_covenants = credit_state.get("recommended_covenants", {})
        financial_covenants = recommended_covenants.get("financial_covenants", [])
        loan_amount = credit_state["loan_amount"]

        task = f"""
Quarterly covenant compliance check for {company} (ticker: {ticker}).
Loan amount: ${loan_amount:,.0f}

COVENANT PACKAGE TO CHECK:
{json.dumps(financial_covenants, indent=2, default=str)[:1500]}

Use your tools to fetch current financial data:
- Key metrics: for ratio-based covenants (DSCR, current ratio, debt/equity)
- Balance sheet: for leverage and net debt covenants
- Cash flow: for FCF-based covenants

For each covenant, calculate the actual current value and compare to threshold.
Headroom = (current_value - threshold) / threshold * 100 for minimums.

Produce structured JSON compliance report:
{{
  "covenant_checks": [
    {{
      "covenant_name": "name",
      "threshold": "required level",
      "actual_value": number_from_fetched_data,
      "headroom_pct": number,
      "status": "COMPLIANT | NEAR_BREACH | BREACHED | CANNOT_VERIFY",
      "data_source": "which tool/metric was used",
      "notes": "brief note"
    }}
  ],
  "overall_compliance": "FULLY_COMPLIANT | NEAR_BREACH | BREACH_DETECTED",
  "breach_details": null_or_detailed_description,
  "waiver_required": true_or_false,
  "recommended_action": "specific action to take",
  "compliance_summary": "summary for credit committee"
}}
"""

        result = self.run_agentic_loop_json(self.role, task, COVENANT_COMPLIANCE_TOOLS)
        credit_state["covenant_status"] = result

        overall = result.get("overall_compliance", "FULLY_COMPLIANT")
        if overall == "BREACH_DETECTED":
            add_alert(
                credit_state,
                trigger=f"COVENANT BREACH DETECTED — {company}",
                severity="CRITICAL",
                action_required="Immediate escalation to Legal + Credit Committee. " + (result.get("breach_details") or ""),
            )
        elif overall == "NEAR_BREACH":
            add_alert(
                credit_state,
                trigger=f"Covenant near-breach — {company}",
                severity="MEDIUM",
                action_required="Increased monitoring. Proactive discussion with borrower recommended.",
            )

        credit_state = log_agent(credit_state, self.name)
        return credit_state
