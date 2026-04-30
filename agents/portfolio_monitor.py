"""
Agent 9: Portfolio Monitor (Post-Disbursement Quarterly)
Claude fetches current financials and compares them to the original underwriting model.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import PORTFOLIO_MONITOR_TOOLS
from core.credit_state import log_agent, add_alert


class PortfolioMonitorAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Portfolio Monitor"

    @property
    def role(self) -> str:
        return (
            "You are a portfolio management analyst conducting a quarterly performance review. "
            "You compare a borrower's current financial performance against the original underwriting model. "
            "Fetch the current income statement, cash flow, and key metrics yourself — "
            "then compare them to what was projected at origination. "
            "Flag material variances: revenue misses > 10%, margin compression > 200bps, "
            "leverage increases > 0.5x, FCF deterioration > 20%."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        ticker = credit_state["ticker"]
        original_financial = credit_state.get("financial_analysis", {})
        original_underwriting = credit_state.get("underwriting_metrics", {})
        internal_rating = credit_state.get("internal_rating", "Unknown")

        task = f"""
Quarterly portfolio review for {company} (ticker: {ticker}).
Current internal rating: {internal_rating}

ORIGINAL FINANCIAL ANALYSIS (at underwriting):
{json.dumps(original_financial, indent=2, default=str)[:1200]}

ORIGINAL UNDERWRITING METRICS:
{json.dumps(original_underwriting, indent=2, default=str)[:800]}

Use your tools to fetch the current financial data:
- Income statement: check revenue trend and margins vs. original
- Cash flow statement: verify FCF quality and debt service capacity
- Key metrics: get current ratios for direct comparison

Produce structured JSON quarterly performance report:
{{
  "revenue_performance": "ABOVE_PLAN | ON_PLAN | BELOW_PLAN | SIGNIFICANTLY_BELOW",
  "revenue_variance_pct": number_or_null,
  "margin_trend": "EXPANDING | STABLE | COMPRESSING | SIGNIFICANTLY_COMPRESSING",
  "leverage_change": "IMPROVING | STABLE | INCREASING | SIGNIFICANTLY_INCREASING",
  "cash_flow_quality": "IMPROVING | STABLE | DETERIORATING",
  "material_variances": [
    {{
      "metric": "metric name",
      "original_value": value_at_underwriting,
      "current_value": current_fetched_value,
      "variance_pct": percentage_change,
      "assessment": "POSITIVE | NEUTRAL | NEGATIVE | MATERIAL_NEGATIVE"
    }}
  ],
  "portfolio_health_score": integer_0_to_100,
  "action_required": "NONE | MONITOR | COVENANT_REVIEW | CREDIT_REVIEW | RESTRUCTURE",
  "portfolio_summary": "2-3 sentence summary for credit committee"
}}
"""

        result = self.run_agentic_loop_json(self.role, task, PORTFOLIO_MONITOR_TOOLS)
        credit_state["portfolio_health"] = result

        action = result.get("action_required", "NONE")
        if action in ["CREDIT_REVIEW", "RESTRUCTURE"]:
            add_alert(
                credit_state,
                trigger=f"Quarterly portfolio review: {action} recommended for {company}",
                severity="HIGH",
                action_required=result.get("portfolio_summary", "Credit review required."),
            )

        credit_state = self._log_and_audit(credit_state)
        return credit_state
