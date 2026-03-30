"""
Agent 4: Risk Scorer
Generates Probability of Default (PD) score, internal credit rating (AAA-D),
and composite risk score 0-100. Builds on all previous agents.
"""

import json
from agents.base_agent import BaseAgent
from core.credit_state import log_agent, add_alert


RATING_THRESHOLDS = {
    "AAA": (0, 10), "AA": (10, 20), "A": (20, 30),
    "BBB": (30, 45), "BB": (45, 55), "B": (55, 65),
    "CCC": (65, 75), "CC": (75, 85), "C": (85, 95), "D": (95, 100),
}


class RiskScorerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Risk Scorer"

    @property
    def role(self) -> str:
        return (
            "You are a credit risk officer at a commercial bank. "
            "Your job is to synthesize all available analysis and assign a Probability of Default (PD) score, "
            "an internal credit rating on the AAA-to-D scale, and a composite risk score from 0 (no risk) to 100 (certain default). "
            "Be conservative. Err on the side of caution when data is ambiguous."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        ticker = credit_state["ticker"]
        loan_amount = credit_state["loan_amount"]

        financial = credit_state.get("financial_analysis", {})
        underwriting = credit_state.get("underwriting_metrics", {})
        benchmark = credit_state.get("industry_benchmark", {})

        user_message = f"""
Assign a credit risk score for {company} ({ticker}).
Loan requested: ${loan_amount:,.0f}

FINANCIAL ANALYSIS:
{json.dumps(financial, indent=2, default=str)}

UNDERWRITING METRICS:
{json.dumps(underwriting, indent=2, default=str)}

INDUSTRY BENCHMARK:
{json.dumps(benchmark, indent=2, default=str)}

Produce a structured JSON risk assessment:
{{
  "composite_risk_score": integer_0_to_100,
  "probability_of_default": float_0_to_1,
  "internal_rating": "AAA | AA | A | BBB | BB | B | CCC | CC | C | D",
  "rating_rationale": "explanation of rating decision",
  "key_risk_drivers": ["driver1", "driver2", "driver3"],
  "mitigating_factors": ["factor1", "factor2"],
  "recommendation": "APPROVE | CONDITIONAL | REJECT",
  "recommendation_rationale": "clear explanation",
  "watch_items": ["item1", "item2"]
}}

Rating guidance:
- AAA-BBB: Investment grade. Low default risk. Generally approvable.
- BB-B: Sub-investment grade. Moderate risk. Conditional approval with covenants.
- CCC-D: High default risk. Rejection recommended unless exceptional collateral.
"""

        result = self.call_claude_json(self.role, user_message)

        credit_state["risk_score"] = result.get("composite_risk_score")
        credit_state["internal_rating"] = result.get("internal_rating")
        credit_state["live_risk_score"] = result.get("composite_risk_score")  # baseline for post-disbursement tracking

        # Trigger human alert if high risk
        score = result.get("composite_risk_score", 50)
        if score >= 65:
            credit_state = add_alert(
                credit_state,
                trigger=f"High risk score: {score}/100 ({result.get('internal_rating')})",
                severity="HIGH",
                action_required="Senior credit officer review required before approval.",
            )

        credit_state["_risk_scorer_full"] = result  # preserve full output for memo
        credit_state = log_agent(credit_state, self.name)
        return credit_state
