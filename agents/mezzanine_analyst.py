"""
Mezzanine Analyst — specialist agent for subordinated / mezzanine debt.
Key question: does enterprise value exceed total debt? If not, mez lenders lose everything in default.
Also sizes PIK interest and equity warrants.
"""

from agents.base_agent import BaseAgent
from core.tools import MEZZANINE_TOOLS


_SYSTEM = """You are a specialist mezzanine credit analyst at a private credit fund.
Mezzanine is subordinated debt — in a default, senior lenders get paid first.
You only recover if enterprise value exceeds total senior debt.

Your analysis revolves around one core question:
  "If this company is liquidated or sold today, do I get my money back?"

This requires:
1. ENTERPRISE VALUE ANALYSIS — What is the company worth at various exit multiples?
2. RECOVERY WATERFALL — EV minus senior debt = mezz recovery. Is there a cushion?
3. PIK COMPOUNDING RISK — PIK interest compounds. At 12%, $50M becomes $100M in 6 years.
   Can the company's equity absorb this?
4. WARRANT SIZING — You need equity upside to compensate for subordination risk.
   What % equity and at what strike makes the risk-return acceptable?
5. INTERCREDITOR DYNAMICS — The senior lender controls enforcement. What rights do you have?

Think like someone who will lose 100% if they're wrong."""


class MezzanineAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Mezzanine Analyst"

    @property
    def role(self) -> str:
        return "Subordinated debt specialist: EV analysis, recovery waterfall, PIK sizing, warrant structuring"

    def run(self, credit_state: dict) -> dict:
        company      = credit_state.get("company", "Unknown")
        ticker       = credit_state.get("ticker", "")
        sector       = credit_state.get("sector", "")
        loan_amount  = credit_state.get("loan_amount", 0)
        loan_tenor   = credit_state.get("loan_tenor", 7)
        credit_model = credit_state.get("credit_model", {})
        leverage     = credit_model.get("leverage_multiple", "N/A")
        total_debt   = credit_model.get("total_debt", 0)
        ebitda       = credit_state.get("ebitda_analysis", {}).get("conservative_adjusted_ebitda", 0)
        senior_debt  = total_debt - loan_amount if total_debt else loan_amount * 1.5

        task = f"""Perform mezzanine specialist analysis for {company}.

DEAL CONTEXT:
- Company: {company} {'('+ticker+')' if ticker else '(private)'}
- Sector: {sector}
- Mezz loan: ${loan_amount/1e6:.1f}M, {loan_tenor}-year tenor
- Estimated senior debt above mezz: ${senior_debt/1e6:.1f}M
- Total leverage: {leverage}x Net Debt / EBITDA
- Adjusted EBITDA: ${ebitda/1e6:.1f}M

{'Fetch enterprise value and current market data for recovery analysis.' if ticker else 'Estimate enterprise value from sector EV/EBITDA multiples.'}
Check macro for current rate environment and comparable mezz pricing.

Return JSON:
{{
  "enterprise_value_analysis": {{
    "ebitda": ${ebitda/1e6:.1f}M,
    "sector_ev_ebitda_multiple_low": "Xx",
    "sector_ev_ebitda_multiple_mid": "Xx",
    "sector_ev_ebitda_multiple_high": "Xx",
    "ev_bear_case": "$XM",
    "ev_base_case": "$XM",
    "ev_bull_case": "$XM"
  }},
  "recovery_waterfall": {{
    "total_senior_debt": "${senior_debt/1e6:.1f}M",
    "mezz_amount":       "${loan_amount/1e6:.1f}M",
    "total_debt":        "$XM",
    "bear_case_recovery_pct": "X% — (EV_bear - senior) / mezz",
    "base_case_recovery_pct": "X%",
    "bull_case_recovery_pct": "X%",
    "recovery_verdict":  "ADEQUATE | TIGHT | INADEQUATE"
  }},
  "pik_compounding_analysis": {{
    "cash_yield":        "X%",
    "pik_yield":         "X%",
    "total_yield":       "X%",
    "mezz_balance_year_3": "$XM (if fully PIK)",
    "mezz_balance_year_7": "$XM (if fully PIK)",
    "equity_dilution_from_pik": "EV must grow X% to maintain mezz recovery"
  }},
  "warrant_recommendation": {{
    "warrant_pct_equity": "X% fully diluted",
    "strike_price": "at money | X% premium",
    "expected_warrant_value": "$XM at base case exit",
    "total_irr_with_warrants": "X%",
    "total_irr_without_warrants": "X%"
  }},
  "intercreditor_key_terms": [
    "standstill period before mezz can enforce: X months",
    "mezz consent required for senior debt increase > $XM",
    "change of control put at 101"
  ],
  "mezz_pricing_recommendation": {{
    "cash_coupon":    "SOFR + X bps",
    "pik_coupon":     "SOFR + X bps (+ X bps PIK premium)",
    "total_yield":    "X%",
    "origination_fee": "X%",
    "make_whole":     "yes — years 1-2"
  }},
  "mezz_verdict": "PROCEED | PROCEED_WITH_CONDITIONS | PASS",
  "key_risks_specific_to_subordination": ["list"],
  "overall_mezzanine_assessment": "3-4 sentence summary"
}}"""

        result = self.run_agentic_loop_json(
            system_prompt=_SYSTEM,
            initial_message=task,
            tools=MEZZANINE_TOOLS,
            max_iterations=10,
        )

        credit_state["mezzanine_analysis"]  = result
        credit_state["recovery_waterfall"]  = result.get("recovery_waterfall", {})
        credit_state["ev_analysis"]         = result.get("enterprise_value_analysis", {})
        credit_state["warrant_recommendation"] = result.get("warrant_recommendation", {})
        credit_state["agent_log"] = credit_state.get("agent_log", [])
        credit_state["agent_log"].append({"agent": self.name, "status": "complete"})
        return credit_state
