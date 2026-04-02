"""
Agent 4: Risk Scorer
Synthesizes all prior agent outputs + can fetch live news and macro data
to assign PD score, internal rating, and composite risk score.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import RISK_SCORER_TOOLS
from core.credit_state import log_agent, add_alert


class RiskScorerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Risk Scorer"

    @property
    def role(self) -> str:
        return (
            "You are a credit risk officer at a commercial bank. "
            "You synthesize financial analysis, underwriting metrics, and industry benchmarks "
            "to assign a Probability of Default (PD), an internal credit rating (AAA to D), "
            "and a composite risk score from 0 (no risk) to 100 (certain default). "
            "You can fetch current news and macro data to supplement the prior analysis. "
            "Be conservative — err on the side of caution when data is ambiguous. "
            "Rating guidance: AAA-BBB = investment grade; BB-B = sub-investment grade; CCC-D = distressed."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        ticker = credit_state["ticker"]
        loan_amount = credit_state["loan_amount"]

        financial = credit_state.get("financial_analysis", {})
        underwriting = credit_state.get("underwriting_metrics", {})
        benchmark = credit_state.get("industry_benchmark", {})

        task = f"""
Assign a credit risk score for {company} (ticker: {ticker}).
Loan requested: ${loan_amount:,.0f}

FINANCIAL ANALYSIS (Agent 1):
{json.dumps(financial, indent=2, default=str)[:1200]}

UNDERWRITING METRICS (Agent 2):
{json.dumps(underwriting, indent=2, default=str)[:1000]}

INDUSTRY BENCHMARK (Agent 3):
{json.dumps(benchmark, indent=2, default=str)[:800]}

You may use your tools to:
- Fetch current news to check for material events not captured in financials
- Fetch macro snapshot to assess environmental risk

Produce structured JSON risk assessment:
{{
  "composite_risk_score": integer_0_to_100,
  "probability_of_default": float_0_to_1,
  "internal_rating": "AAA | AA | A | BBB | BB | B | CCC | CC | C | D",
  "rating_rationale": "detailed explanation citing specific metrics",
  "key_risk_drivers": ["driver1", "driver2", "driver3"],
  "mitigating_factors": ["factor1", "factor2"],
  "recommendation": "APPROVE | CONDITIONAL | REJECT",
  "recommendation_rationale": "clear explanation",
  "watch_items": ["item1", "item2"],
  "news_risk_flags": ["any material news events that affected this score"]
}}
"""

        result = self.run_agentic_loop_json(self.role, task, RISK_SCORER_TOOLS)

        credit_state["risk_score"] = result.get("composite_risk_score")
        credit_state["internal_rating"] = result.get("internal_rating")
        credit_state["live_risk_score"] = result.get("composite_risk_score")
        credit_state["_risk_scorer_full"] = result

        score = result.get("composite_risk_score", 50)
        if score >= 65:
            add_alert(
                credit_state,
                trigger=f"High risk score: {score}/100 ({result.get('internal_rating')})",
                severity="HIGH" if score < 75 else "CRITICAL",
                action_required="Senior credit officer review required before approval.",
            )

        credit_state = log_agent(credit_state, self.name)
        return credit_state
