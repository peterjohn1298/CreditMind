"""
Agent 5: Credit Modeler (Wave 2 — sequential)
Synthesizes Wave 1 outputs into a full credit model.
Calculates leverage, coverage, FCF, and debt serviceability
using the conservative EBITDA figure from the EBITDA Analyst.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import GET_MACRO_SNAPSHOT
from core.credit_state import log_agent


class CreditModelerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Credit Modeler"

    @property
    def role(self) -> str:
        return (
            "You are a credit modeling specialist at a private credit fund. "
            "You build the credit model from the due diligence outputs. "
            "You always use the CONSERVATIVE adjusted EBITDA — never the management case. "
            "Key metrics you must calculate: total leverage, senior leverage, interest coverage, "
            "FCCR (Fixed Charge Coverage Ratio), FCF-to-debt, years to repay. "
            "Fetch the macro snapshot to get current benchmark rates for pricing. "
            "Your model is what the stress tester will use — be precise and show your calculations."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        loan_amount = credit_state["loan_amount"]
        loan_tenor = credit_state["loan_tenor"]
        loan_type = credit_state["loan_type"]

        financial = credit_state.get("financial_analysis", {})
        ebitda = credit_state.get("ebitda_analysis", {})
        legal = credit_state.get("legal_analysis", {})

        task = f"""
Build the credit model for {company}.
Proposed: ${loan_amount:,.0f} | {loan_tenor} | {loan_type}

FINANCIAL ANALYSIS (Agent 1):
{json.dumps(financial, indent=2, default=str)[:1500]}

EBITDA ANALYSIS (Agent 2):
{json.dumps(ebitda, indent=2, default=str)[:1500]}

CAPITAL STRUCTURE (Agent 4):
{json.dumps(legal.get("capital_structure", {{}}), indent=2, default=str)[:800]}

Fetch macro snapshot to get current SOFR / benchmark rates.

Build the credit model using CONSERVATIVE adjusted EBITDA.
Show all calculations explicitly.

CITATION GUIDE — for every cited field use this structure:
  {{"value": <number>, "confidence": "HIGH | MEDIUM | LOW", "source_page": <int or null>, "source_quote": "<verbatim excerpt, max 120 chars, or null>"}}
  confidence: HIGH = explicitly stated in source | MEDIUM = calculated from stated values | LOW = estimated

Return JSON credit model:
{{
  "ebitda_used": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
  "ebitda_basis": "conservative | base | management_case",
  "existing_debt": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
  "proposed_debt": null,
  "pro_forma_total_debt": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
  "leverage_metrics": {{
    "total_leverage": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
    "senior_leverage": null,
    "net_leverage": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
    "leverage_assessment": "CONSERVATIVE (<4x) | MODERATE (4-5x) | ELEVATED (5-6x) | HIGH (>6x)"
  }},
  "coverage_metrics": {{
    "interest_coverage": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
    "fccr": null,
    "dscr": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
    "coverage_assessment": "STRONG (>2.5x) | ADEQUATE (1.75-2.5x) | TIGHT (1.25-1.75x) | INSUFFICIENT (<1.25x)"
  }},
  "cash_flow_metrics": {{
    "annual_fcf": null,
    "fcf_to_debt": null,
    "years_to_repay": null,
    "cash_conversion_rate": null
  }},
  "debt_service": {{
    "annual_interest_cost": null,
    "benchmark_rate": null,
    "spread_assumption": null,
    "all_in_rate": null
  }},
  "loan_to_value": null,
  "break_even_ebitda": "minimum EBITDA needed to service debt at 1.0x coverage",
  "calculation_notes": "show key calculations",
  "model_assessment": "overall assessment of the credit model metrics"
}}
"""

        result = self.run_agentic_loop_json(self.role, task, tools=[GET_MACRO_SNAPSHOT])
        credit_state["credit_model"] = result
        credit_state = self._log_and_audit(credit_state)
        return credit_state
