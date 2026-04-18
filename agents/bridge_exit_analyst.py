"""
Bridge Exit Analyst — specialist agent for bridge loans.
Core question: how certain is the exit to permanent financing?
Bridge loans are only safe if we're confident the borrower can refinance within the term.
"""

from agents.base_agent import BaseAgent
from core.tools import BRIDGE_TOOLS


_SYSTEM = """You are a specialist bridge loan analyst at a direct lending fund.
Bridge loans are short-term (6–18 months). The ONLY question that matters is:
  "Will this borrower be able to refinance or repay within the term?"

You underwrite the EXIT, not just the company. Key questions:
1. WHAT IS THE EXIT? Permanent bank financing, bond issuance, asset sale, equity raise, IPO?
2. HOW CERTAIN IS IT? Is the market open for this type of exit? What's the timeline?
3. INTERIM CASH FLOW — Can the company service bridge debt while the exit is being arranged?
4. WHAT IF THE EXIT FAILS? Extension risk — what are our options if they can't refinance?
5. PRICING FOR RISK — Bridge loans carry +200-300bps over term loans. Is this sufficient?

The #1 risk in bridge lending is the exit failing and being stuck in a long-term loan
you priced as short-term."""


class BridgeExitAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Bridge Exit Analyst"

    @property
    def role(self) -> str:
        return "Bridge loan specialist: exit certainty analysis, interim cash flow, extension risk"

    def run(self, credit_state: dict) -> dict:
        company      = credit_state.get("company", "Unknown")
        ticker       = credit_state.get("ticker", "")
        sector       = credit_state.get("sector", "")
        loan_amount  = credit_state.get("loan_amount", 0)
        loan_tenor   = credit_state.get("loan_tenor", 1)
        exit_type    = credit_state.get("bridge_exit_type", "permanent financing")
        credit_model = credit_state.get("credit_model", {})
        dscr         = credit_model.get("dscr", "N/A")
        ebitda       = credit_state.get("ebitda_analysis", {}).get("conservative_adjusted_ebitda", 0)

        task = f"""Perform bridge loan exit analysis for {company}.

DEAL CONTEXT:
- Company: {company} {'('+ticker+')' if ticker else '(private)'}
- Sector: {sector}
- Bridge loan: ${loan_amount/1e6:.1f}M, {loan_tenor*12:.0f}-month term
- Planned exit: {exit_type}
- DSCR: {dscr}x
- Adjusted EBITDA: ${ebitda/1e6:.1f}M

Check current news (is permanent financing market open?), macro conditions
(are credit markets tight? is M&A active?), and company cash flow.

Return JSON:
{{
  "exit_analysis": {{
    "planned_exit_type": "{exit_type}",
    "exit_market_conditions": "FAVORABLE | NEUTRAL | UNFAVORABLE",
    "exit_market_rationale": "current state of the relevant financing market",
    "comparable_transactions": "recent comparable exits in this sector/size",
    "exit_timeline_estimate": "X months — realistic timeline",
    "exit_certainty_score": 1-10
  }},
  "interim_cash_flow": {{
    "monthly_interest_at_bridge_rate": "$XM",
    "monthly_operating_cf": "$XM estimated",
    "interim_coverage_ratio": "Xx",
    "liquidity_runway_months": "X months before liquidity squeeze",
    "adequate_for_bridge_term": true/false
  }},
  "exit_failure_scenarios": [
    {{
      "scenario": "what could prevent the exit",
      "probability": "LOW | MEDIUM | HIGH",
      "consequence": "what happens to our loan",
      "mitigation": "how we protect ourselves"
    }}
  ],
  "extension_provisions_recommended": {{
    "extension_available": true/false,
    "extension_length": "X months",
    "extension_fee": "X%",
    "extension_spread_step": "+X bps per month",
    "extension_conditions": ["what must be true for extension to be granted"]
  }},
  "bridge_pricing_recommendation": {{
    "spread_over_term_loan": "+X bps",
    "all_in_rate": "SOFR + X bps",
    "origination_fee": "X%",
    "break_fee": "X% if repaid < 6 months",
    "exit_fee": "X% on repayment"
  }},
  "exit_milestones_required": [
    {{"milestone": "description", "deadline": "month X", "consequence_if_missed": "event of default | step-up | right to demand exit"}}
  ],
  "bridge_verdict": "PROCEED | PROCEED_WITH_CONDITIONS | PASS",
  "overall_bridge_assessment": "3-4 sentence summary"
}}"""

        result = self.run_agentic_loop_json(
            system_prompt=_SYSTEM,
            initial_message=task,
            tools=BRIDGE_TOOLS,
            max_iterations=8,
        )

        credit_state["bridge_exit_analysis"]   = result
        credit_state["exit_certainty_score"]   = result.get("exit_analysis", {}).get("exit_certainty_score")
        credit_state["extension_provisions"]   = result.get("extension_provisions_recommended", {})
        credit_state["agent_log"] = credit_state.get("agent_log", [])
        credit_state["agent_log"].append({"agent": self.name, "status": "complete"})
        return credit_state
