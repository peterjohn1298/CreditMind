"""
Agent 2: Credit Underwriter
Claude autonomously fetches additional data to calculate DSCR, debt capacity,
interest coverage, and FCF-to-debt. Builds on Agent 1's financial analysis.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import UNDERWRITER_TOOLS
from core.credit_state import log_agent


class CreditUnderwriterAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Credit Underwriter"

    @property
    def role(self) -> str:
        return (
            "You are a credit underwriter at a commercial bank specializing in corporate lending. "
            "You assess a borrower's ability to service a specific loan. "
            "You focus on debt serviceability: DSCR, interest coverage, leverage capacity, FCF adequacy. "
            "You have tools to fetch additional financial data if the prior analysis is insufficient. "
            "Always fetch the cash flow statement to verify FCF — do not rely on ratios alone."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        ticker = credit_state["ticker"]
        loan_amount = credit_state["loan_amount"]
        loan_tenor = credit_state["loan_tenor"]
        loan_type = credit_state["loan_type"]
        financial_analysis = credit_state.get("financial_analysis", {})

        task = f"""
Underwrite a loan for {company} (ticker: {ticker}).

LOAN PARAMETERS:
- Amount: ${loan_amount:,.0f}
- Tenor: {loan_tenor}
- Type: {loan_type}

FINANCIAL ANALYSIS FROM AGENT 1:
{json.dumps(financial_analysis, indent=2, default=str)[:2000]}

Use your tools to fetch any additional data you need to calculate:
1. DSCR (Debt Service Coverage Ratio) — you need EBITDA or operating cash flow and estimate debt service
2. Interest coverage ratio — EBIT / interest expense
3. Debt capacity — how much total debt this company can support
4. FCF to debt ratio — fetch cash flow statement to verify

Produce structured JSON underwriting assessment:
{{
  "dscr": {{
    "value": number_or_null,
    "calculation_note": "how you calculated it and which data you used",
    "assessment": "STRONG (>1.5) | ADEQUATE (1.2-1.5) | WEAK (1.0-1.2) | INSUFFICIENT (<1.0)"
  }},
  "interest_coverage_ratio": {{
    "value": number_or_null,
    "assessment": "STRONG (>5x) | ADEQUATE (3-5x) | WEAK (1.5-3x) | INSUFFICIENT (<1.5x)"
  }},
  "debt_capacity": {{
    "estimated_max_debt": number_or_null,
    "requested_loan_pct_of_capacity": number_or_null,
    "assessment": "WITHIN_CAPACITY | AT_LIMIT | EXCEEDS_CAPACITY"
  }},
  "free_cash_flow_to_debt": {{
    "annual_fcf": number_or_null,
    "years_to_repay": number_or_null,
    "assessment": "STRONG | ADEQUATE | WEAK"
  }},
  "loan_serviceability": "SERVICEABLE | MARGINAL | NOT_SERVICEABLE",
  "underwriter_notes": "key observations, assumptions made, and concerns",
  "recommended_loan_size": number_or_null
}}
"""

        result = self.run_agentic_loop_json(self.role, task, UNDERWRITER_TOOLS)
        credit_state["underwriting_metrics"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state
