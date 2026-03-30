"""
Agent 5: Covenant Structurer
Recommends loan covenants, collateral requirements, and financial maintenance tests
based on the borrower's risk profile.
"""

import json
from agents.base_agent import BaseAgent
from core.credit_state import log_agent


class CovenantStructurerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Covenant Structurer"

    @property
    def role(self) -> str:
        return (
            "You are a structured finance specialist at a commercial bank. "
            "Your job is to design appropriate loan covenants and collateral requirements "
            "that protect the lender while remaining commercially reasonable for the borrower. "
            "Covenants should be calibrated to the borrower's risk profile — tighter for weaker credits."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        ticker = credit_state["ticker"]
        loan_amount = credit_state["loan_amount"]
        loan_tenor = credit_state["loan_tenor"]
        loan_type = credit_state["loan_type"]

        financial = credit_state.get("financial_analysis", {})
        underwriting = credit_state.get("underwriting_metrics", {})
        risk_score = credit_state.get("risk_score", 50)
        rating = credit_state.get("internal_rating", "BB")
        risk_full = credit_state.get("_risk_scorer_full", {})

        user_message = f"""
Structure loan covenants for {company} ({ticker}).

LOAN: ${loan_amount:,.0f} | {loan_tenor} | {loan_type}
INTERNAL RATING: {rating} | RISK SCORE: {risk_score}/100

FINANCIAL PROFILE:
{json.dumps(financial, indent=2, default=str)}

UNDERWRITING METRICS:
{json.dumps(underwriting, indent=2, default=str)}

RISK ASSESSMENT:
{json.dumps(risk_full, indent=2, default=str)}

Produce structured JSON covenant recommendations:
{{
  "financial_covenants": [
    {{
      "name": "covenant name",
      "metric": "what is measured",
      "threshold": "minimum/maximum level",
      "testing_frequency": "quarterly | semi-annual | annual",
      "rationale": "why this covenant"
    }}
  ],
  "collateral_requirements": {{
    "required": true/false,
    "type": "type of collateral",
    "coverage_ratio": "e.g. 1.5x loan value",
    "notes": "additional notes"
  }},
  "negative_covenants": ["list of things borrower cannot do without lender consent"],
  "reporting_requirements": ["quarterly financials", "annual audited accounts", "etc"],
  "pricing_recommendation": {{
    "spread_over_benchmark": "e.g. SOFR + 250bps",
    "rationale": "based on rating and risk"
  }},
  "covenant_package_summary": "overall description of covenant package strength"
}}
"""

        result = self.call_claude_json(self.role, user_message)
        credit_state["recommended_covenants"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state
