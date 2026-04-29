"""
Agent 1: Financial Analyst (Wave 1 — runs in parallel)
Reads extracted financial statements and produces a 3-year historical analysis.
Uses document data — no ticker or yfinance dependency.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import GET_MACRO_SNAPSHOT
from core.credit_state import log_agent


class FinancialAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Financial Analyst"

    @property
    def role(self) -> str:
        return (
            "You are a senior financial analyst at a private credit fund. "
            "You analyze 3 years of audited financial statements to assess credit quality. "
            "You focus on trends — improving or deteriorating — not just point-in-time snapshots. "
            "Key questions: Is revenue growing organically or through acquisitions? "
            "Are margins expanding or compressing? Is FCF conversion high or low? "
            "Is leverage increasing or decreasing? "
            "Fetch macro context to understand the environment these financials were produced in. "
            "Be specific — cite exact numbers from the data."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        loan_amount = credit_state["loan_amount"]

        financial_data = credit_state.get("documents", {}).get("financials")

        if not financial_data:
            credit_state["financial_analysis"] = {
                "error": "No financial statements uploaded.",
                "overall_financial_health": "UNKNOWN",
            }
            return log_agent(credit_state, self.name)

        task = f"""
Conduct a 3-year financial analysis of {company} for a ${loan_amount:,.0f} credit assessment.

AUDITED FINANCIAL STATEMENTS (extracted):
{json.dumps(financial_data, indent=2, default=str)[:3000]}

Fetch the macro snapshot for environmental context.

Produce JSON financial analysis:
{{
  "revenue_trend": {{
    "cagr_3yr": null,
    "description": "organic vs acquired growth, trajectory",
    "year_over_year": {{"yr1_to_yr2": null, "yr2_to_yr3": null}}
  }},
  "profitability": {{
    "gross_margin":     {{"current": null, "trend": "EXPANDING | STABLE | COMPRESSING"}},
    "ebitda_margin":    {{"current": null, "trend": "EXPANDING | STABLE | COMPRESSING"}},
    "operating_margin": {{"current": null, "trend": "EXPANDING | STABLE | COMPRESSING"}},
    "net_margin":       {{"current": null, "trend": "EXPANDING | STABLE | COMPRESSING"}},
    "assessment": "brief assessment"
  }},
  "liquidity": {{
    "current_ratio":  null,
    "cash_balance":   null,
    "cash_trend":     "BUILDING | STABLE | DECLINING",
    "assessment": "brief assessment"
  }},
  "leverage": {{
    "total_debt":     null,
    "debt_trend":     "DECREASING | STABLE | INCREASING",
    "net_debt":       null,
    "assessment": "brief assessment"
  }},
  "cash_flow_quality": {{
    "operating_cf":       null,
    "capex":              null,
    "free_cash_flow":     null,
    "fcf_conversion":     "FCF as % of EBITDA",
    "assessment": "HIGH | MEDIUM | LOW"
  }},
  "liquidity_forecast_13_week": {{
    "starting_cash":            null,
    "weekly_operating_cash_in": null,
    "weekly_operating_cash_out": null,
    "weekly_debt_service":      null,
    "minimum_balance_week":     "week_number_1_to_13",
    "minimum_balance":          null,
    "ending_cash":              null,
    "weekly_path": [
      {{ "week": 1, "starting": null, "operating_in": null, "operating_out": null, "debt_service": null, "ending": null }}
    ],
    "covenant_headroom_at_min":  "$M cushion vs minimum-liquidity covenant at week of trough",
    "assessment": "ADEQUATE | TIGHT | CRITICAL",
    "note": "Build a forward 13-week cash projection using the most recent quarterly cash burn rate. Required for stressed/watchlist names; for healthy names, populate at least starting_cash, ending_cash, minimum_balance, and assessment."
  }},
  "audit_flags": {{
    "clean_opinion": true_or_false,
    "going_concern": true_or_false,
    "restatements":  true_or_false,
    "notes_of_concern": ["any significant accounting notes"]
  }},
  "macro_context": "how macro environment affected these financials",
  "key_strengths":  ["strength1", "strength2"],
  "key_concerns":   ["concern1", "concern2"],
  "overall_financial_health": "STRONG | ADEQUATE | WEAK | DISTRESSED"
}}
"""

        result = self.run_agentic_loop_json(self.role, task, tools=[GET_MACRO_SNAPSHOT])
        credit_state["financial_analysis"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state
