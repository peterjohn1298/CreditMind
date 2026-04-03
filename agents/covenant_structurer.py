"""
Agent 8: Covenant Designer (Wave 2 — sequential)
Designs the full covenant package using stress test results to set
precise thresholds with defensible headroom.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import GET_MACRO_SNAPSHOT
from core.credit_state import log_agent


class CovenantStructurerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Covenant Designer"

    @property
    def role(self) -> str:
        return (
            "You are a structured finance specialist at a private credit fund. "
            "You design loan covenants using the stress test results as your guide. "
            "Covenant thresholds must be set between the base case and downside scenario — "
            "tight enough to catch deterioration early, loose enough not to trip in normal operations. "
            "Rule: covenant should breach in downside but not in base case. "
            "Always calculate and state the headroom percentage. "
            "Tighter covenants for weaker credits (B/CCC), looser for stronger (BBB/BB). "
            "Fetch macro to calibrate pricing to current benchmark rates."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        loan_amount = credit_state["loan_amount"]
        loan_tenor = credit_state["loan_tenor"]
        loan_type = credit_state["loan_type"]

        model   = credit_state.get("credit_model", {})
        stress  = credit_state.get("stress_test", {})
        risk    = credit_state.get("risk_assessment", {})
        rating  = credit_state.get("internal_rating", "BB")
        score   = credit_state.get("risk_score", 50)

        task = f"""
Design the covenant package for {company}.
Facility: ${loan_amount:,.0f} | {loan_tenor} | {loan_type}
Rating: {rating} | Risk Score: {score}/100

CREDIT MODEL:
{json.dumps(model, indent=2, default=str)[:1200]}

STRESS TEST SCENARIOS:
{json.dumps(stress.get("scenarios", {{}}), indent=2, default=str)[:1200]}

BREAK-EVEN ANALYSIS:
{json.dumps(stress.get("break_even_analysis", {{}}), indent=2, default=str)[:400]}

RISK ASSESSMENT:
{json.dumps(risk, indent=2, default=str)[:600]}

Fetch macro snapshot for current benchmark rates and pricing.

Covenant design rule:
- Set threshold between base case metric and downside metric
- Aim for 15-25% headroom from current level in base case
- For leverage: set maximum at midpoint between base and downside leverage
- For coverage: set minimum at midpoint between base and downside DSCR

Return JSON covenant package:
{{
  "financial_covenants": [
    {{
      "name": "e.g. Maximum Total Net Leverage",
      "metric": "what is measured",
      "base_case_level": null,
      "downside_level": null,
      "proposed_threshold": null,
      "headroom_from_base_case_pct": null,
      "testing_frequency": "quarterly",
      "cure_rights": "equity cure allowed: yes/no with conditions",
      "rationale": "why this specific threshold"
    }}
  ],
  "negative_covenants": [
    "No additional financial indebtedness exceeding $Xm without lender consent",
    "No dividends or distributions while leverage exceeds Xx",
    "No acquisitions exceeding $Xm without lender consent"
  ],
  "reporting_covenants": [
    "Quarterly management accounts within 45 days of quarter end",
    "Annual audited accounts within 120 days of year end",
    "Immediate notification of material adverse change"
  ],
  "security_package": {{
    "type": "first lien | second lien | unsecured",
    "assets_secured": ["asset1", "asset2"],
    "guarantee_structure": "description"
  }},
  "pricing": {{
    "benchmark": "SOFR | LIBOR | fixed",
    "spread_bps": null,
    "all_in_rate": null,
    "upfront_fee_bps": null,
    "undrawn_fee_bps": null,
    "pricing_rationale": "based on rating and current macro rates"
  }},
  "covenant_package_strength": "TIGHT | STANDARD | LOOSE",
  "covenant_summary": "2-3 sentence summary of the protection package"
}}
"""

        result = self.run_agentic_loop_json(self.role, task, tools=[GET_MACRO_SNAPSHOT])
        credit_state["covenant_package"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state
