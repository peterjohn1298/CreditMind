"""
Project Finance Analyst — specialist agent for infrastructure / project finance.
Non-recourse debt to an SPV. Analysis is asset-level, not company-level.
Core metric: DSCR on contracted project cash flows.
"""

from agents.base_agent import BaseAgent
from core.tools import PROJECT_FINANCE_TOOLS


_SYSTEM = """You are a specialist project finance analyst at an infrastructure debt fund.
Project finance is fundamentally different from corporate lending:

- You lend to an SPV (Special Purpose Vehicle), not a company
- The debt is NON-RECOURSE — if the project fails, you cannot chase the sponsors
- Repayment comes ONLY from the project's own cash flows
- There must be contracted cash flows — without an offtake agreement, there is no loan
- Construction risk: the project doesn't generate cash until it's built

Your analysis framework:
1. PROJECT CASH FLOW — Model revenue from offtake agreement + operating costs = DSCR
2. OFFTAKE CERTAINTY — Who is buying the output? Are they creditworthy? Is the contract bankable?
3. CONSTRUCTION RISK — Who builds it? What is the EPC contract structure? Cost overrun risk?
4. TECHNOLOGY RISK — Proven technology or novel? What is the P90 production estimate?
5. REGULATORY/PERMITTING — Are permits in place? What is the regulatory risk?
6. RESERVE ACCOUNTS — Debt service reserve, O&M reserve, major maintenance reserve

DSCR below 1.20x = danger zone. Target 1.30x minimum in base case.
Think about what happens when production is 10% below forecast."""


class ProjectFinanceAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Project Finance Analyst"

    @property
    def role(self) -> str:
        return "Infrastructure/project finance specialist: DSCR modeling, offtake analysis, construction risk, reserve accounts"

    def run(self, credit_state: dict) -> dict:
        company      = credit_state.get("company", "Unknown")
        ticker       = credit_state.get("ticker", "")
        sector       = credit_state.get("sector", "")
        loan_amount  = credit_state.get("loan_amount", 0)
        loan_tenor   = credit_state.get("loan_tenor", 15)
        project_type = credit_state.get("project_type", "infrastructure")
        offtake_type = credit_state.get("offtake_type", "power purchase agreement")
        total_capex  = credit_state.get("total_project_capex", loan_amount * 1.4)
        equity_pct   = credit_state.get("equity_pct", 30)
        ebitda       = credit_state.get("ebitda_analysis", {}).get("conservative_adjusted_ebitda", 0)

        task = f"""Perform project finance specialist analysis for {company}.

PROJECT CONTEXT:
- Project: {company} {'('+ticker+')' if ticker else '(private SPV)'}
- Sector / Asset Type: {sector} — {project_type}
- Debt: ${loan_amount/1e6:.1f}M non-recourse, {loan_tenor}-year tenor
- Total Project Capex: ${total_capex/1e6:.1f}M
- Equity: {equity_pct}% (${total_capex * equity_pct/100/1e6:.1f}M)
- Debt: {100-equity_pct}% (${loan_amount/1e6:.1f}M)
- Offtake: {offtake_type}
- Estimated annual EBITDA / project CF: ${ebitda/1e6:.1f}M (if available)

Check sector news for this infrastructure type (energy prices, policy, regulatory changes),
macro for interest rate environment (project debt is long-duration — rate sensitive),
and any company/project-level data available.

Return JSON:
{{
  "project_overview": {{
    "project_type":     "{project_type}",
    "asset_description": "brief description of what this project is",
    "spv_structure":    "description of SPV and sponsor equity arrangement",
    "total_capex":      "${total_capex/1e6:.1f}M",
    "debt_equity_split": "{100-equity_pct}% / {equity_pct}%",
    "construction_period": "X months",
    "operations_start": "estimated date"
  }},
  "dscr_analysis": {{
    "annual_contracted_revenue": "$XM (from offtake)",
    "annual_operating_costs":    "$XM",
    "annual_net_cash_flow":      "$XM",
    "annual_debt_service":       "$XM (P+I on ${loan_amount/1e6:.0f}M over {loan_tenor}y)",
    "base_case_dscr":            "Xx",
    "p90_dscr":                  "Xx (at 90th percentile production)",
    "minimum_dscr_year":         "year X — Xx DSCR",
    "dscr_verdict":              "STRONG (>1.50x) | ADEQUATE (1.30-1.50x) | TIGHT (1.10-1.30x) | INSUFFICIENT (<1.10x)"
  }},
  "offtake_analysis": {{
    "offtake_type":            "{offtake_type}",
    "offtake_counterparty":    "who is buying the output",
    "counterparty_credit":     "creditworthiness of offtaker",
    "contract_length":         "X years",
    "price_structure":         "fixed | indexed | merchant",
    "volume_commitment":       "X% of capacity contracted",
    "uncontracted_exposure":   "X% merchant / spot risk",
    "offtake_certainty_score": 1-10
  }},
  "construction_risk": {{
    "epc_contractor":          "who builds it (if known)",
    "epc_structure":           "lump-sum turnkey | cost-plus | other",
    "construction_completion_risk": "HIGH | MEDIUM | LOW",
    "cost_overrun_risk":       "HIGH | MEDIUM | LOW",
    "completion_guarantee":    "sponsor completion guarantee? yes/no",
    "technology_risk":         "proven | first-of-kind | novel",
    "construction_reserve_required": "$XM"
  }},
  "reserve_account_requirements": {{
    "debt_service_reserve":    "$XM (X months debt service)",
    "om_reserve":              "$XM",
    "major_maintenance_reserve": "$XM",
    "total_reserves":          "$XM"
  }},
  "macro_and_regulatory_risks": [
    {{"risk": "description", "severity": "HIGH | MEDIUM | LOW", "mitigation": "how to address"}}
  ],
  "project_finance_covenants": {{
    "min_dscr_maintenance":    "≥ 1.30x rolling 12-month",
    "distribution_lock_up":    "No distributions unless DSCR ≥ 1.20x and reserves funded",
    "insurance_requirements":  "all-risk, business interruption, third-party liability",
    "change_in_offtake":       "fund consent required for any offtake amendment",
    "construction_milestone_covenants": ["list of key milestones and breach consequences"]
  }},
  "project_pricing": {{
    "recommended_spread":      "X bps over SOFR/treasury",
    "benchmark":               "SOFR | 10yr treasury (long-duration usually uses treasury)",
    "all_in_rate":             "X%",
    "amortization_profile":    "sculpted to DSCR — target X% annual principal"
  }},
  "project_verdict": "PROCEED | PROCEED_WITH_CONDITIONS | PASS",
  "overall_project_finance_assessment": "3-4 sentence summary"
}}"""

        result = self.run_agentic_loop_json(
            system_prompt=_SYSTEM,
            initial_message=task,
            tools=PROJECT_FINANCE_TOOLS,
            max_iterations=10,
        )

        credit_state["project_finance_analysis"] = result
        credit_state["project_dscr"]            = result.get("dscr_analysis", {}).get("base_case_dscr")
        credit_state["offtake_analysis"]        = result.get("offtake_analysis", {})
        credit_state["construction_risk"]       = result.get("construction_risk", {})
        credit_state["reserve_requirements"]    = result.get("reserve_account_requirements", {})
        credit_state["agent_log"] = credit_state.get("agent_log", [])
        credit_state["agent_log"].append({"agent": self.name, "status": "complete"})
        return credit_state
