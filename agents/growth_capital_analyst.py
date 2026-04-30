"""
Growth Capital Analyst — specialist agent for non-sponsored growth capital loans.
Focuses on ARR, NRR, Burn Multiple, and SaaS/recurring-revenue KPIs.
EBITDA leverage is NOT the primary metric here — revenue quality and growth trajectory are.
"""

from agents.base_agent import BaseAgent
from core.tools import GROWTH_CAPITAL_TOOLS


_SYSTEM = """You are a specialist credit analyst for non-sponsored growth capital lending.
Unlike LBO debt, you are lending to a founder or management team — there is no PE sponsor
to inject equity or support a restructuring if things go wrong.

CRITICAL: Do NOT use EBITDA leverage multiples as the primary underwriting metric.
Growth capital borrowers are often pre-profitability or low-margin — leverage is the wrong lens.
The correct framework is REVENUE-BASED:

1. ARR / REVENUE QUALITY — What is Annual Recurring Revenue? What % is truly recurring?
   SaaS/subscription ARR is far more defensible than project or transactional revenue.
2. NRR (Net Revenue Retention) — Are existing customers expanding (NRR > 100%) or churning?
   NRR > 110% is excellent. NRR < 90% is a red flag requiring explanation.
3. BURN MULTIPLE — (Net Burn / Net New ARR). Under 1x = efficient. Over 2x = burning to grow.
4. CAC PAYBACK — How many months to recover the cost of acquiring a customer?
   Under 18 months is healthy. Over 36 months signals unit economics problem.
5. RULE OF 40 — Revenue growth % + FCF margin %. Above 40 is strong for software.
6. KEY-MAN RISK — Without a PE sponsor, if founders leave, what happens?
7. RUNWAY TO DEBT SERVICE — How long until the business generates enough cash to cover interest?

Be conservative. Without a sponsor, the fund's only recovery is the business itself."""


class GrowthCapitalAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Growth Capital Analyst"

    @property
    def role(self) -> str:
        return "Specialist analysis for non-sponsored growth capital: ARR, NRR, Burn Multiple, SaaS KPIs, warrants"

    def run(self, credit_state: dict) -> dict:
        company     = credit_state.get("company", "Unknown")
        ticker      = credit_state.get("ticker", "")
        sector      = credit_state.get("sector", "")
        loan_amount = credit_state.get("loan_amount", 0)
        loan_tenor  = credit_state.get("loan_tenor", 4)
        sponsor     = credit_state.get("sponsor", "")
        fin         = credit_state.get("financial_analysis", {})

        # Revenue-based inputs — prefer explicitly provided SaaS metrics over EBITDA
        arr           = credit_state.get("arr", 0)            # Annual Recurring Revenue
        nrr           = credit_state.get("nrr", 0)            # Net Revenue Retention (e.g. 105 = 105%)
        burn_multiple = credit_state.get("burn_multiple", 0)  # Net Burn / Net New ARR
        revenue       = fin.get("revenue", credit_state.get("revenue", 0))
        revenue_growth = credit_state.get("revenue_growth_pct", 0)

        arr_label = f"${arr/1e6:.1f}M ARR" if arr else "ARR not provided — estimate from revenue data"
        nrr_label = f"{nrr}% NRR" if nrr else "NRR not provided — estimate from sector norms"
        bm_label  = f"{burn_multiple:.1f}x Burn Multiple" if burn_multiple else "Burn Multiple not provided"
        rev_label = f"${revenue/1e6:.1f}M revenue" if revenue else "Revenue not provided"

        task = f"""Perform growth capital specialist analysis for {company}.

DEAL CONTEXT:
- Company: {company} {'('+ticker+')' if ticker else '(private)'}
- Sector: {sector}
- Sponsor: {sponsor if sponsor else 'NON-SPONSORED — no PE backstop'}
- Loan: ${loan_amount/1e6:.1f}M, {loan_tenor}-year tenor

REVENUE-BASED METRICS (use these — NOT EBITDA leverage):
- {arr_label}
- {nrr_label}
- {bm_label}
- {rev_label} ({revenue_growth}% YoY growth if provided)

ANALYTICAL FRAMEWORK — in priority order:
1. ARR and revenue quality {'using ticker financials' if ticker else '— estimate from news/sector context'}
2. NRR trend (look for cohort stability, expansion vs. churn signals)
3. Burn Multiple efficiency (how much burn per dollar of new ARR growth?)
4. CAC payback period and LTV/CAC ratio
5. Rule of 40 (revenue growth % + FCF margin %)
6. Key-man risk — who are the critical people, what happens if they leave
7. Warrant / equity kicker sizing to compensate for higher-than-LBO risk

DO NOT use EBITDA leverage multiple as a primary go/no-go criterion.
Use cash runway (months of operating costs covered) instead of DSCR.

Return JSON:
{{
  "saas_kpis": {{
    "arr_estimate": "$XM ARR (or 'not applicable — project/transactional revenue')",
    "revenue_type": "SaaS/subscription | project-based | transactional | mixed",
    "nrr_estimate": "X% — below 90% is a red flag, above 110% is excellent",
    "burn_multiple": "Xx — under 1x efficient, over 2x burning to grow",
    "cac_payback_months": "X months — under 18 healthy, over 36 problematic",
    "rule_of_40_score": "revenue growth % + FCF margin % = XX",
    "arr_to_loan_ratio": "Xx ARR / loan — minimum 1.5x required for growth capital"
  }},
  "revenue_quality_assessment": {{
    "recurring_pct": "X% of revenue is recurring/contracted",
    "top_customer_concentration": "top customer is X% of ARR — HIGH/MEDIUM/LOW risk",
    "cohort_retention": "description of customer retention trends",
    "growth_sustainability": "HIGH | MEDIUM | LOW",
    "growth_rationale": "why growth is or isn't sustainable"
  }},
  "management_quality_score": 1-10,
  "management_assessment": "assessment of management track record and capability",
  "key_man_risk": "HIGH | MEDIUM | LOW",
  "key_man_details": "who the key people are and what happens if they leave",
  "cash_runway_analysis": {{
    "monthly_burn_estimate": "$XM/month",
    "cash_on_hand_estimate": "$XM (including loan proceeds)",
    "runway_months": "X months before cash out at current burn",
    "months_to_cash_flow_positive": "estimate — key milestone for debt service",
    "debt_service_coverage": "can the company service ${loan_amount/1e6:.1f}M loan at X% rate?"
  }},
  "warrant_recommendation": {{
    "warrant_pct_equity": "X% fully diluted",
    "strike_price_multiple": "Xx revenue multiple or at-money",
    "pik_option": true/false,
    "pik_spread_increment": "if PIK, additional +X bps",
    "rationale": "why this kicker compensates for the no-sponsor risk"
  }},
  "no_sponsor_risk_premium": "additional spread warranted above sponsored deal: +X bps",
  "growth_capital_specific_covenants": [
    "minimum ARR covenant: $XM (25% below current ARR)",
    "minimum cash covenant: $XM (3 months of burn)",
    "NRR covenant: must not fall below 85% on trailing 12-month basis",
    "key-man life/disability insurance: $XM covering founders",
    "revenue reporting: monthly ARR report within 15 days of month-end"
  ],
  "overall_growth_capital_assessment": "3-4 sentence summary focused on revenue quality and cash runway"
}}"""

        result = self.run_agentic_loop_json(
            system_prompt=_SYSTEM,
            initial_message=task,
            tools=GROWTH_CAPITAL_TOOLS,
            max_iterations=8,
        )

        credit_state["growth_capital_analysis"] = result
        credit_state["management_quality_score"] = result.get("management_quality_score")
        credit_state["key_man_risk"]             = result.get("key_man_risk")
        credit_state["warrant_recommendation"]   = result.get("warrant_recommendation", {})
        credit_state["saas_kpis"]               = result.get("saas_kpis", {})
        credit_state["agent_log"] = credit_state.get("agent_log", [])
        credit_state["agent_log"].append({"agent": self.name, "status": "complete"})
        return credit_state
