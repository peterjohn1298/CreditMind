"""
Growth Capital Analyst — specialist agent for non-sponsored growth capital loans.
Focuses on management quality, revenue trajectory, key-man risk, and warrant structuring
since there is no PE sponsor backstop.
"""

from agents.base_agent import BaseAgent
from core.tools import GROWTH_CAPITAL_TOOLS


_SYSTEM = """You are a specialist credit analyst for non-sponsored growth capital lending.
Unlike LBO debt, you are lending to a founder or management team — there is no PE sponsor
to inject equity or support a restructuring if things go wrong.

Your analysis focuses on 5 things standard LBO analysts underweight:
1. MANAGEMENT QUALITY — Is this team capable of executing the growth plan? Track record?
2. REVENUE TRAJECTORY — Is growth sustainable or a one-time spike? Recurring vs. project revenue?
3. KEY-MAN RISK — Is the business dependent on one or two people? What happens if they leave?
4. RUNWAY TO PROFITABILITY — If EBITDA is thin, how long until the business self-funds debt service?
5. WARRANT / EQUITY KICKER SIZING — Given higher risk, how much upside should the fund capture?

Be conservative. Without a sponsor, the fund's only recovery is the business itself."""


class GrowthCapitalAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Growth Capital Analyst"

    @property
    def role(self) -> str:
        return "Specialist analysis for non-sponsored growth capital: management, trajectory, key-man, warrants"

    def run(self, credit_state: dict) -> dict:
        company     = credit_state.get("company", "Unknown")
        ticker      = credit_state.get("ticker", "")
        sector      = credit_state.get("sector", "")
        loan_amount = credit_state.get("loan_amount", 0)
        loan_tenor  = credit_state.get("loan_tenor", 4)
        sponsor     = credit_state.get("sponsor", "")
        fin         = credit_state.get("financial_analysis", {})
        ebitda_data = credit_state.get("ebitda_analysis", {})
        adj_ebitda  = ebitda_data.get("conservative_adjusted_ebitda", 0)

        task = f"""Perform growth capital specialist analysis for {company}.

DEAL CONTEXT:
- Company: {company} {'('+ticker+')' if ticker else '(private)'}
- Sector: {sector}
- Sponsor: {sponsor if sponsor else 'NON-SPONSORED — no PE backstop'}
- Loan: ${loan_amount/1e6:.1f}M, {loan_tenor}-year tenor
- Adjusted EBITDA: ${adj_ebitda/1e6:.1f}M (from prior analysis)
- Financial Health: {fin.get('overall_financial_health', 'unknown')}

ANALYZE:
1. Revenue quality and growth trajectory {'using ticker data' if ticker else '— use sector context and macro'}
2. Job signals (hiring trends reveal growth vs. stagnation)
3. Current macro impact on this sector's growth companies
4. Key-man risk indicators from news
5. Appropriate warrant / equity kicker sizing given risk

Return JSON:
{{
  "management_quality_score": 1-10,
  "management_assessment": "assessment of management track record and capability",
  "revenue_quality": "recurring | project | mixed",
  "revenue_growth_rate": "X% — estimated or derived",
  "growth_sustainability": "HIGH | MEDIUM | LOW",
  "growth_rationale": "why growth is or isn't sustainable",
  "key_man_risk": "HIGH | MEDIUM | LOW",
  "key_man_details": "who the key people are and what happens if they leave",
  "runway_analysis": {{
    "current_ebitda_margin": "X%",
    "interest_burden": "$XM at current loan pricing",
    "dscr_current": "Xx",
    "months_to_self_sustaining": "estimate"
  }},
  "warrant_recommendation": {{
    "warrant_pct_equity": "X% fully diluted",
    "strike_price_multiple": "Xx MOIC or $X per share",
    "pik_option": true/false,
    "pik_spread_increment": "if PIK, additional +X bps"
  }},
  "no_sponsor_risk_premium": "additional spread warranted above sponsored deal: +X bps",
  "growth_capital_specific_covenants": ["list of covenants specific to this loan type"],
  "overall_growth_capital_assessment": "3-4 sentence summary"
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
        credit_state["agent_log"] = credit_state.get("agent_log", [])
        credit_state["agent_log"].append({"agent": self.name, "status": "complete"})
        return credit_state
