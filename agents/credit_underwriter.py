"""
Agent 2: Credit Underwriter
Calculates DSCR, debt capacity, interest coverage, and FCF to debt.
Builds on Agent 1's financial analysis.
"""

import json
from agents.base_agent import BaseAgent
from data.financial_data import get_key_metrics
from core.credit_state import log_agent


class CreditUnderwriterAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Credit Underwriter"

    @property
    def role(self) -> str:
        return (
            "You are a credit underwriter at a commercial bank specializing in corporate lending. "
            "Your job is to assess a borrower's ability to service a specific loan. "
            "You focus on debt serviceability metrics: DSCR, interest coverage, leverage capacity, and free cash flow adequacy."
        )

    def run(self, credit_state: dict) -> dict:
        ticker = credit_state["ticker"]
        company = credit_state["company"]
        loan_amount = credit_state["loan_amount"]
        loan_tenor = credit_state["loan_tenor"]
        loan_type = credit_state["loan_type"]
        financial_analysis = credit_state.get("financial_analysis", {})

        metrics = get_key_metrics(ticker)

        user_message = f"""
You are underwriting a loan for {company} ({ticker}).

LOAN PARAMETERS:
- Amount: ${loan_amount:,.0f}
- Tenor: {loan_tenor}
- Type: {loan_type}

FINANCIAL ANALYSIS FROM PREVIOUS AGENT:
{json.dumps(financial_analysis, indent=2, default=str)}

ADDITIONAL KEY METRICS:
{json.dumps(metrics, indent=2, default=str)}

Calculate and assess the following underwriting metrics. Return structured JSON:
{{
  "dscr": {{
    "value": number_or_null,
    "calculation_note": "how you calculated it",
    "assessment": "STRONG (>1.5) | ADEQUATE (1.2-1.5) | WEAK (1.0-1.2) | INSUFFICIENT (<1.0)"
  }},
  "interest_coverage_ratio": {{
    "value": number_or_null,
    "assessment": "brief note"
  }},
  "debt_capacity": {{
    "estimated_max_debt": number_or_null,
    "requested_loan_pct_of_capacity": number_or_null,
    "assessment": "brief note"
  }},
  "free_cash_flow_to_debt": {{
    "value": number_or_null,
    "years_to_repay": number_or_null,
    "assessment": "brief note"
  }},
  "loan_serviceability": "SERVICEABLE | MARGINAL | NOT SERVICEABLE",
  "underwriter_notes": "key observations and concerns",
  "recommended_loan_size": number_or_null
}}
"""

        result = self.call_claude_json(self.role, user_message)
        credit_state["underwriting_metrics"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state
