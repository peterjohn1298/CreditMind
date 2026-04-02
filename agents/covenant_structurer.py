"""
Agent 5: Covenant Structurer
Claude fetches current balance sheet and cash flow metrics to calibrate
covenant thresholds precisely to the borrower's actual financial position.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import COVENANT_TOOLS
from core.credit_state import log_agent


class CovenantStructurerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Covenant Structurer"

    @property
    def role(self) -> str:
        return (
            "You are a structured finance specialist at a commercial bank. "
            "You design loan covenants and collateral requirements calibrated to the borrower's risk profile. "
            "Tighter covenants for weaker credits; looser for investment grade. "
            "You must fetch current key metrics and balance sheet data to set precise, "
            "defensible covenant thresholds — not generic ones. "
            "Covenants must be set with headroom: e.g. if current DSCR is 2.1x, a 1.5x minimum gives 28% headroom."
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

        task = f"""
Structure loan covenants for {company} (ticker: {ticker}).

LOAN: ${loan_amount:,.0f} | {loan_tenor} | {loan_type}
INTERNAL RATING: {rating} | RISK SCORE: {risk_score}/100

FINANCIAL PROFILE (Agent 1):
{json.dumps(financial, indent=2, default=str)[:1000]}

UNDERWRITING METRICS (Agent 2):
{json.dumps(underwriting, indent=2, default=str)[:800]}

RISK ASSESSMENT (Agent 4):
{json.dumps(risk_full, indent=2, default=str)[:600]}

Use your tools to:
- Fetch current key metrics to calibrate precise covenant thresholds with real headroom
- Fetch balance sheet to assess collateral availability and set LTV-style covenants
- Fetch macro snapshot to factor in rate environment for pricing

Produce structured JSON covenant recommendations:
{{
  "financial_covenants": [
    {{
      "name": "covenant name (e.g. Minimum DSCR)",
      "metric": "what is measured",
      "current_borrower_level": "actual current value from fetched data",
      "threshold": "covenant minimum/maximum with headroom calculation",
      "headroom_pct": "percentage headroom from current level",
      "testing_frequency": "quarterly | semi-annual | annual",
      "rationale": "why this specific threshold"
    }}
  ],
  "collateral_requirements": {{
    "required": true_or_false,
    "type": "type of collateral",
    "coverage_ratio": "e.g. 1.5x loan value",
    "notes": "additional notes"
  }},
  "negative_covenants": ["list of prohibited actions without lender consent"],
  "reporting_requirements": ["quarterly financials", "annual audited accounts", "material event notification within 5 days"],
  "pricing_recommendation": {{
    "spread_over_benchmark": "e.g. SOFR + 250bps",
    "upfront_fee": "e.g. 75bps",
    "rationale": "based on rating, risk score, and current macro rates"
  }},
  "covenant_package_summary": "overall strength and rationale of the covenant package"
}}
"""

        result = self.run_agentic_loop_json(self.role, task, COVENANT_TOOLS)
        credit_state["recommended_covenants"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state
