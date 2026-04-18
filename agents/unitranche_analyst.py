"""
Unitranche Analyst — specialist agent for unitranche financing.
Focuses on blended pricing, first-out/last-out split, and Agreement Among Lenders (AAL) terms.
"""

from agents.base_agent import BaseAgent
from core.tools import UNITRANCHE_TOOLS


_SYSTEM = """You are a specialist structuring analyst for unitranche financing at a direct lending fund.
Unitranche combines senior and junior debt into one blended instrument — you hold the whole thing,
or you split it into first-out (FO) and last-out (LO) tranches and sell the FO to a bank.

Your analysis focuses on:
1. BLENDED PRICING — What is the appropriate all-in yield given the blended risk?
2. FIRST-OUT / LAST-OUT ECONOMICS — If structuring a FO/LO split, what are the economics of each?
3. COVERAGE AT BLENDED RATE — With a ~9-10% all-in rate, can the borrower comfortably service debt?
4. EXIT MULTIPLE ANALYSIS — Is the leverage sustainable through to exit, or does EBITDA need to grow substantially?
5. AGREEMENT AMONG LENDERS — What protections does the last-out lender need?

Key risk: unitranche allows higher leverage than pure senior. Ensure EBITDA growth supports the leverage."""


class UnitrancheAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Unitranche Analyst"

    @property
    def role(self) -> str:
        return "Unitranche pricing, FO/LO split structuring, AAL terms, and blended coverage analysis"

    def run(self, credit_state: dict) -> dict:
        company     = credit_state.get("company", "Unknown")
        ticker      = credit_state.get("ticker", "")
        sector      = credit_state.get("sector", "")
        loan_amount = credit_state.get("loan_amount", 0)
        loan_tenor  = credit_state.get("loan_tenor", 6)
        credit_model = credit_state.get("credit_model", {})
        leverage     = credit_model.get("leverage_multiple", "N/A")
        ebitda       = credit_state.get("ebitda_analysis", {}).get("conservative_adjusted_ebitda", 0)

        task = f"""Perform unitranche specialist analysis for {company}.

DEAL CONTEXT:
- Company: {company} {'('+ticker+')' if ticker else '(private)'}
- Sector: {sector}
- Loan: ${loan_amount/1e6:.1f}M unitranche, {loan_tenor}-year tenor
- Leverage: {leverage}x Net Debt / EBITDA
- Adjusted EBITDA: ${ebitda/1e6:.1f}M

Check current macro (SOFR rate) and cash flow data to complete this analysis.

Return JSON:
{{
  "blended_pricing": {{
    "sofr_current": "X%",
    "unitranche_spread": "X bps",
    "all_in_yield": "X%",
    "annual_cash_interest": "$XM",
    "dscr_at_blended_rate": "Xx"
  }},
  "fo_lo_split_recommended": true/false,
  "fo_lo_structure": {{
    "first_out_amount": "$XM (X%)",
    "first_out_pricing": "SOFR + X bps",
    "last_out_amount": "$XM (X%)",
    "last_out_pricing": "SOFR + X bps",
    "aal_key_terms": ["list of Agreement Among Lenders key provisions"]
  }},
  "exit_multiple_analysis": {{
    "current_leverage": "{leverage}x",
    "exit_leverage_target": "Xx (at maturity)",
    "ebitda_growth_required": "X% CAGR to reach target",
    "exit_enterprise_value": "$XM at Xx EV/EBITDA",
    "implied_equity_return": "XxMOIC to sponsor"
  }},
  "coverage_stress_test": {{
    "base_case_dscr": "Xx",
    "ebitda_minus_15pct_dscr": "Xx",
    "rate_plus_100bps_dscr": "Xx",
    "minimum_acceptable_dscr": "1.25x for unitranche"
  }},
  "unitranche_vs_split_cap_stack": "recommendation on whether unitranche or senior+mezz is better structure",
  "unitranche_specific_covenants": ["covenants specific to unitranche structure"],
  "overall_unitranche_assessment": "3-4 sentence summary"
}}"""

        result = self.run_agentic_loop_json(
            system_prompt=_SYSTEM,
            initial_message=task,
            tools=UNITRANCHE_TOOLS,
            max_iterations=8,
        )

        credit_state["unitranche_analysis"]  = result
        credit_state["fo_lo_structure"]      = result.get("fo_lo_structure", {})
        credit_state["blended_pricing"]      = result.get("blended_pricing", {})
        credit_state["agent_log"] = credit_state.get("agent_log", [])
        credit_state["agent_log"].append({"agent": self.name, "status": "complete"})
        return credit_state
