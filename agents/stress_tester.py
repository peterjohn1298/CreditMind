"""
Agent 6: Stress Tester (Wave 2 — sequential)
Runs three scenarios through the credit model:
  Base case, Downside, Severe Downside.
Shows exactly where covenants breach and at what revenue decline
the deal becomes unserviceable.
"""

import json
from agents.base_agent import BaseAgent
from core.credit_state import log_agent, add_alert


class StressTesterAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Stress Tester"

    @property
    def role(self) -> str:
        return (
            "You are a credit stress testing specialist at a private credit fund. "
            "You run three scenarios through the credit model to test resilience. "
            "Base case: management projections with modest 5-10% haircut. "
            "Downside: revenue -15%, EBITDA margin -200bps, capex +10%. "
            "Severe downside: revenue -25-30%, EBITDA margin -400bps — replicating a recession. "
            "For each scenario calculate all key metrics. "
            "Identify the break-even point: at what revenue decline does DSCR fall below 1.0x? "
            "Identify covenant breach points: at what EBITDA does each covenant breach? "
            "This is the most important analysis in the credit process."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        loan_amount = credit_state["loan_amount"]

        credit_model = credit_state.get("credit_model", {})
        financial = credit_state.get("financial_analysis", {})
        ebitda = credit_state.get("ebitda_analysis", {})

        task = f"""
Run stress scenarios for {company} (${loan_amount:,.0f} loan).

BASE CREDIT MODEL:
{json.dumps(credit_model, indent=2, default=str)[:2000]}

FINANCIAL ANALYSIS:
{json.dumps(financial, indent=2, default=str)[:1000]}

EBITDA ANALYSIS:
{json.dumps(ebitda, indent=2, default=str)[:800]}

Run three scenarios. For each, recalculate all metrics from scratch.

Scenario assumptions:
- BASE CASE: Revenue +3% YoY, margins stable, capex at historical average
- DOWNSIDE: Revenue -15%, EBITDA margin -200bps, capex +10%
- SEVERE: Revenue -25%, EBITDA margin -400bps, capex +15%, working capital stress

Return JSON stress test:
{{
  "scenarios": {{
    "base_case": {{
      "revenue_assumption": "description",
      "ebitda": null,
      "ebitda_margin": null,
      "total_leverage": null,
      "interest_coverage": null,
      "dscr": null,
      "fcf": null,
      "covenant_headroom_pct": null,
      "pass_fail": "PASS | MARGINAL | FAIL"
    }},
    "downside": {{
      "revenue_assumption": "description",
      "revenue_decline_pct": -15,
      "ebitda": null,
      "ebitda_margin": null,
      "total_leverage": null,
      "interest_coverage": null,
      "dscr": null,
      "fcf": null,
      "covenant_headroom_pct": null,
      "pass_fail": "PASS | MARGINAL | FAIL"
    }},
    "severe_downside": {{
      "revenue_assumption": "description",
      "revenue_decline_pct": -25,
      "ebitda": null,
      "ebitda_margin": null,
      "total_leverage": null,
      "interest_coverage": null,
      "dscr": null,
      "fcf": null,
      "covenant_headroom_pct": null,
      "pass_fail": "PASS | MARGINAL | FAIL"
    }}
  }},
  "break_even_analysis": {{
    "revenue_decline_to_dscr_1x": "percentage decline at which DSCR = 1.0x",
    "revenue_decline_to_covenant_breach": "percentage decline at which first covenant breaches",
    "ebitda_floor": "minimum EBITDA to remain solvent on debt service",
    "headroom_summary": "how much cushion exists in base case"
  }},
  "sensitivity_table": {{
    "revenue_minus_5pct":  {{"leverage": null, "dscr": null}},
    "revenue_minus_10pct": {{"leverage": null, "dscr": null}},
    "revenue_minus_15pct": {{"leverage": null, "dscr": null}},
    "revenue_minus_20pct": {{"leverage": null, "dscr": null}},
    "revenue_minus_25pct": {{"leverage": null, "dscr": null}}
  }},
  "stress_verdict": "RESILIENT | ADEQUATE | VULNERABLE | HIGH_RISK",
  "key_stress_findings": ["finding1", "finding2", "finding3"]
}}
"""

        result = self.run_agentic_loop_json(self.role, task, tools=[])
        credit_state["stress_test"] = result

        # Alert if severe downside causes failure
        severe = result.get("scenarios", {}).get("severe_downside", {})
        if severe.get("pass_fail") == "FAIL":
            add_alert(
                credit_state,
                trigger=f"Stress test: deal fails in severe downside scenario",
                severity="HIGH",
                action_required="Review deal structure. Consider reduced loan size or additional security.",
            )

        credit_state = log_agent(credit_state, self.name)
        return credit_state
