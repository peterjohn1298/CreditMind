"""
Agent 7: Risk Scorer (Wave 2 — sequential)
Synthesizes all due diligence outputs to assign an internal credit rating,
probability of default, and composite risk score.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import GET_COMPANY_NEWS, GET_MACRO_SNAPSHOT
from core.credit_state import log_agent, add_alert


class RiskScorerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Risk Scorer"

    @property
    def role(self) -> str:
        return (
            "You are a credit risk officer at a private credit fund. "
            "You synthesize all due diligence — financial, EBITDA, commercial, legal, "
            "credit model, and stress test — to assign a final risk rating. "
            "Rating scale: AAA (0-10) → AA (10-20) → A (20-30) → BBB (30-45) → "
            "BB (45-55) → B (55-65) → CCC (65-75) → CC (75-85) → C/D (85-100). "
            "For private credit: BB/B is the typical sweet spot. "
            "CCC or below = distressed, reject unless exceptional security. "
            "Fetch current news and macro to check for any late-breaking information. "
            "Be conservative — private credit has limited liquidity if you're wrong."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        loan_amount = credit_state["loan_amount"]

        financial  = credit_state.get("financial_analysis", {})
        ebitda     = credit_state.get("ebitda_analysis", {})
        commercial = credit_state.get("commercial_analysis", {})
        legal      = credit_state.get("legal_analysis", {})
        model      = credit_state.get("credit_model", {})
        stress     = credit_state.get("stress_test", {})

        task = f"""
Assign a credit risk rating for {company} (${loan_amount:,.0f} loan).

FINANCIAL ANALYSIS:     {json.dumps(financial, default=str)[:600]}
EBITDA ANALYSIS:        {json.dumps(ebitda, default=str)[:500]}
COMMERCIAL ANALYSIS:    {json.dumps(commercial, default=str)[:500]}
LEGAL ANALYSIS:         {json.dumps(legal, default=str)[:400]}
CREDIT MODEL:           {json.dumps(model, default=str)[:600]}
STRESS TEST VERDICT:    {json.dumps(stress.get("stress_verdict"), default=str)}
STRESS SCENARIOS:       {json.dumps(stress.get("scenarios"), default=str)[:500]}

Fetch current news and macro snapshot for any late-breaking information.

Return JSON risk assessment:
{{
  "composite_risk_score": integer_0_to_100,
  "probability_of_default": float_0_to_1,
  "internal_rating": "AAA | AA | A | BBB | BB | B | CCC | CC | C | D",
  "rating_rationale": "detailed rationale citing specific metrics from all agents",
  "scorecard": {{
    "financial_quality":    {{"score": "1-5", "weight": "20%", "notes": "brief"}},
    "ebitda_quality":       {{"score": "1-5", "weight": "20%", "notes": "brief"}},
    "business_quality":     {{"score": "1-5", "weight": "20%", "notes": "brief"}},
    "leverage_profile":     {{"score": "1-5", "weight": "20%", "notes": "brief"}},
    "stress_resilience":    {{"score": "1-5", "weight": "10%", "notes": "brief"}},
    "legal_structural":     {{"score": "1-5", "weight": "10%", "notes": "brief"}}
  }},
  "key_risk_drivers":   ["driver1", "driver2", "driver3"],
  "mitigating_factors": ["factor1", "factor2"],
  "news_risk_flags":    ["any late-breaking news that affects the rating"],
  "recommendation":     "APPROVE | CONDITIONAL | REJECT",
  "recommendation_rationale": "clear explanation with specific conditions if CONDITIONAL",
  "watch_items": ["items to monitor post-close"]
}}
"""

        result = self.run_agentic_loop_json(
            self.role, task,
            tools=[GET_COMPANY_NEWS, GET_MACRO_SNAPSHOT]
        )

        credit_state["risk_score"] = result.get("composite_risk_score")
        credit_state["internal_rating"] = result.get("internal_rating")
        credit_state["live_risk_score"] = result.get("composite_risk_score")
        credit_state["risk_assessment"] = result

        score = result.get("composite_risk_score", 50)
        if score >= 65:
            add_alert(
                credit_state,
                trigger=f"High risk score: {score}/100 ({result.get('internal_rating')})",
                severity="CRITICAL" if score >= 75 else "HIGH",
                action_required="Senior credit officer review required before IC submission.",
            )

        credit_state = log_agent(credit_state, self.name)
        return credit_state
