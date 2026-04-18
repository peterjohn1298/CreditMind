"""
Borrowing Base Analyst — specialist agent for revolving credit facilities / ABL.
Core question: how much can we actually advance against eligible receivables and inventory?
"""

from agents.base_agent import BaseAgent
from core.tools import REVOLVER_TOOLS


_SYSTEM = """You are a specialist asset-based lending (ABL) analyst at a direct lending fund.
For revolving credit facilities, the loan size isn't fixed — it's determined by a borrowing base:
a formula that limits draws to a percentage of eligible collateral.

Your job is to:
1. ANALYZE RECEIVABLES — What is the quality and size of accounts receivable?
   How many days does it take to collect (DSO)? Are customers concentrated?
2. ANALYZE INVENTORY — How liquid is inventory? Finished goods vs. WIP vs. raw materials?
3. BUILD BORROWING BASE — Calculate maximum available credit based on advance rates
4. STRESS TEST THE BASE — What if a major customer fails? What if DSO increases 30 days?
5. SET ADVANCE RATES — What % of eligible AR and inventory can we safely advance?
6. DESIGN SPRINGING COVENANTS — Covenants only trigger when drawn beyond a threshold

Remember: if receivables deteriorate, the borrowing base contracts and the company
must repay the excess. This is the primary risk in a revolver."""


class BorrowingBaseAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Borrowing Base Analyst"

    @property
    def role(self) -> str:
        return "ABL/revolver specialist: borrowing base calculation, advance rates, collateral monitoring design"

    def run(self, credit_state: dict) -> dict:
        company     = credit_state.get("company", "Unknown")
        ticker      = credit_state.get("ticker", "")
        sector      = credit_state.get("sector", "")
        loan_amount = credit_state.get("loan_amount", 0)
        loan_tenor  = credit_state.get("loan_tenor", 3)
        fin         = credit_state.get("financial_analysis", {})

        task = f"""Perform revolving credit / ABL borrowing base analysis for {company}.

DEAL CONTEXT:
- Company: {company} {'('+ticker+')' if ticker else '(private)'}
- Sector: {sector}
- Revolver commitment: ${loan_amount/1e6:.1f}M, {loan_tenor}-year tenor
- Financial Health: {fin.get('overall_financial_health', 'unknown')}

{'Fetch receivables metrics and balance sheet data.' if ticker else 'Estimate from sector norms and available context.'}
Also check macro for credit market conditions.

Return JSON:
{{
  "collateral_analysis": {{
    "accounts_receivable": "$XM",
    "days_sales_outstanding": "X days",
    "dso_trend": "improving | stable | deteriorating",
    "customer_concentration": "top customer is X% of AR — HIGH/MEDIUM/LOW risk",
    "eligible_ar_pct": "X% eligible after ineligibles (>90 day, contra, government, intercompany)",
    "eligible_ar_amount": "$XM",
    "inventory_amount": "$XM",
    "inventory_type": "finished goods | raw materials | WIP | mixed",
    "inventory_liquidation_value": "$XM (at X% of book)",
    "eligible_inventory_pct": "X% eligible",
    "eligible_inventory_amount": "$XM"
  }},
  "borrowing_base_calculation": {{
    "advance_rate_ar": "X% of eligible AR",
    "advance_rate_inventory": "X% of eligible inventory",
    "ar_availability": "$XM",
    "inventory_availability": "$XM",
    "gross_borrowing_base": "$XM",
    "reserves_and_carveouts": "$XM (landlord, PACA, etc.)",
    "net_borrowing_base": "$XM",
    "commitment_vs_base": "${loan_amount/1e6:.0f}M commitment vs $XM base — X% utilization"
  }},
  "borrowing_base_stress_tests": [
    {{"scenario": "top customer fails", "ar_impact": "-$XM", "base_contraction": "-$XM", "new_availability": "$XM"}},
    {{"scenario": "DSO increases 30 days", "ar_impact": "-$XM", "base_contraction": "-$XM", "new_availability": "$XM"}},
    {{"scenario": "inventory write-down 30%", "inv_impact": "-$XM", "base_contraction": "-$XM", "new_availability": "$XM"}}
  ],
  "revolver_covenant_recommendations": {{
    "advance_rate_ar":           "X%",
    "advance_rate_inventory":    "X%",
    "springing_leverage_threshold": "Tested only when >X% drawn",
    "springing_leverage_limit":  "≤ Xx when tested",
    "min_availability":          "$XM at all times",
    "bbc_frequency":             "monthly within X days of month-end",
    "dominion_trigger":          "cash dominion if availability < $XM",
    "concentration_limit":       "no single debtor > X% of eligible AR",
    "field_exam":                "annual (semi-annual if availability < $XM)"
  }},
  "revolver_sizing_recommendation": {{
    "recommended_commitment": "$XM",
    "rationale": "why this size",
    "peak_seasonal_demand": "$XM (when in year)"
  }},
  "overall_revolver_assessment": "3-4 sentence summary"
}}"""

        result = self.run_agentic_loop_json(
            system_prompt=_SYSTEM,
            initial_message=task,
            tools=REVOLVER_TOOLS,
            max_iterations=8,
        )

        credit_state["borrowing_base_analysis"]  = result
        credit_state["borrowing_base"]           = result.get("borrowing_base_calculation", {})
        credit_state["revolver_covenants"]       = result.get("revolver_covenant_recommendations", {})
        credit_state["agent_log"] = credit_state.get("agent_log", [])
        credit_state["agent_log"].append({"agent": self.name, "status": "complete"})
        return credit_state
