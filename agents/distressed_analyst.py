"""
Distressed Analyst — specialist agent for distressed / special situations lending.
Forensic financial analysis + recovery waterfall + restructuring path assessment.
"""

from agents.base_agent import BaseAgent
from core.tools import DISTRESSED_TOOLS


_SYSTEM = """You are a distressed debt specialist at a special situations fund.
You lend to companies that are already in financial difficulty — they can't access
normal credit markets. You take higher risk for higher return.

Distressed analysis is fundamentally different from normal credit analysis:
1. FORENSIC ACCOUNTING — Management has often been hiding problems. Find them.
   Look for: revenue pull-forward, expense capitalization, goodwill impairments, restatements.
2. EXISTING DEBT STACK — Who are the existing creditors? What are their rights?
   Can our new money prime existing creditors (DIP)? What are the intercreditor dynamics?
3. RECOVERY WATERFALL — In a liquidation or restructuring, what do we recover?
   EV analysis + priority waterfall = recovery estimate.
4. RESTRUCTURING PATH — Is the business viable with a restructured balance sheet?
   Out-of-court (consent solicitation) vs. Chapter 11 vs. liquidation?
5. MANAGEMENT CREDIBILITY — Did management cause the distress? Can they fix it?
   Should we require management changes as a condition of lending?

You are lending to prevent a bankruptcy, not prevent a loss. Be forensic."""


class DistressedAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Distressed Analyst"

    @property
    def role(self) -> str:
        return "Distressed specialist: forensic accounting, debt stack, recovery waterfall, restructuring path"

    def run(self, credit_state: dict) -> dict:
        company      = credit_state.get("company", "Unknown")
        ticker       = credit_state.get("ticker", "")
        sector       = credit_state.get("sector", "")
        loan_amount  = credit_state.get("loan_amount", 0)
        loan_tenor   = credit_state.get("loan_tenor", 2)
        credit_model = credit_state.get("credit_model", {})
        total_debt   = credit_model.get("total_debt", 0)
        ebitda       = credit_state.get("ebitda_analysis", {}).get("conservative_adjusted_ebitda", 0)
        fin          = credit_state.get("financial_analysis", {})

        task = f"""Perform distressed / special situations analysis for {company}.

DEAL CONTEXT:
- Company: {company} {'('+ticker+')' if ticker else '(private)'}
- Sector: {sector}
- New money: ${loan_amount/1e6:.1f}M distressed loan, {loan_tenor}-year tenor
- Existing debt: ${total_debt/1e6:.1f}M total debt (before new money)
- Adjusted EBITDA: ${ebitda/1e6:.1f}M (management adj. — verify)
- Financial Health: {fin.get('overall_financial_health', 'DISTRESSED')}

Fetch SEC filings (look for restatements, going-concern, impairments),
enterprise value (for recovery), recent news (what caused the distress),
macro context, and cash flow analysis.

Return JSON:
{{
  "distress_diagnosis": {{
    "primary_cause": "what caused the financial distress",
    "secondary_causes": ["list"],
    "is_operational_distress": true/false,
    "is_financial_distress": true/false,
    "going_concern_risk": "HIGH | MEDIUM | LOW",
    "restatement_risk": "any signs of accounting irregularities"
  }},
  "forensic_accounting_flags": [
    {{"flag": "description", "severity": "HIGH | MEDIUM | LOW", "implication": "what it means for our analysis"}}
  ],
  "existing_debt_stack": {{
    "estimated_senior_secured": "$XM",
    "estimated_unsecured": "$XM",
    "estimated_other": "$XM",
    "existing_creditor_dynamics": "description of existing lender group",
    "new_money_priority": "SUPER_SENIOR (DIP) | PARI_PASSU | SUBORDINATED",
    "priming_risk": "risk that existing creditors challenge our new money priority"
  }},
  "recovery_waterfall": {{
    "ev_bear_case": "$XM",
    "ev_base_case": "$XM",
    "total_debt_incl_new_money": "$XM",
    "senior_recovery_bear": "X%",
    "senior_recovery_base": "X%",
    "new_money_recovery_bear": "X%",
    "new_money_recovery_base": "X%",
    "recovery_verdict": "ADEQUATE | MARGINAL | INADEQUATE"
  }},
  "restructuring_path_analysis": {{
    "preferred_path": "out_of_court | chapter_11 | liquidation",
    "out_of_court_feasibility": "HIGH | MEDIUM | LOW — why",
    "chapter_11_timeline": "X months estimated",
    "viable_with_restructured_balance_sheet": true/false,
    "ebitda_needed_for_viability": "$XM",
    "operational_changes_required": ["list of changes needed"]
  }},
  "management_assessment": {{
    "caused_distress": true/false,
    "management_change_required": true/false,
    "recommended_changes": "description",
    "turnaround_capability": "STRONG | ADEQUATE | INADEQUATE"
  }},
  "distressed_pricing": {{
    "all_in_yield": "X% (including PIK)",
    "cash_coupon":  "X%",
    "pik_coupon":   "X%",
    "equity_conversion_right": "right to convert to X% equity at par",
    "origination_fee": "X%",
    "minimum_return_target": "X% IRR"
  }},
  "protective_provisions": [
    "cash dominion — all receipts to fund-controlled account",
    "operational milestones with 30-day cure periods",
    "fund approval required for any new debt or asset sales > $XM"
  ],
  "distressed_verdict": "RESCUE_LOAN | DIP_FINANCING | PASS",
  "overall_distressed_assessment": "3-4 sentence summary"
}}"""

        result = self.run_agentic_loop_json(
            system_prompt=_SYSTEM,
            initial_message=task,
            tools=DISTRESSED_TOOLS,
            max_iterations=12,
        )

        credit_state["distressed_analysis"]   = result
        credit_state["recovery_waterfall"]    = result.get("recovery_waterfall", {})
        credit_state["restructuring_path"]    = result.get("restructuring_path_analysis", {})
        credit_state["forensic_flags"]        = result.get("forensic_accounting_flags", [])
        credit_state["agent_log"] = credit_state.get("agent_log", [])
        credit_state["agent_log"].append({"agent": self.name, "status": "complete"})
        return credit_state
