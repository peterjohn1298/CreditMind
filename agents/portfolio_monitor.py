"""
Agent 9: Portfolio Monitor (Post-Disbursement, Quarterly)
Tracks actual financial performance vs. original underwriting model.
"""

import json
from agents.base_agent import BaseAgent
from data.financial_data import get_financial_statements, get_key_metrics
from core.credit_state import log_agent, add_alert


class PortfolioMonitorAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Portfolio Monitor"

    @property
    def role(self) -> str:
        return (
            "You are a portfolio management analyst at a commercial bank. "
            "Your job is to compare a borrower's current financial performance against "
            "the projections made at loan origination and flag any material variances. "
            "You focus on revenue trends, margin compression, cash burn, and leverage changes."
        )

    def run(self, credit_state: dict) -> dict:
        ticker = credit_state["ticker"]
        company = credit_state["company"]
        original_financial = credit_state.get("financial_analysis", {})
        original_underwriting = credit_state.get("underwriting_metrics", {})
        internal_rating = credit_state.get("internal_rating", "Unknown")

        current_metrics = get_key_metrics(ticker)
        current_statements = get_financial_statements(ticker)

        user_message = f"""
Perform a quarterly portfolio review for {company} ({ticker}).

ORIGINAL FINANCIAL ANALYSIS (at underwriting):
{json.dumps(original_financial, indent=2, default=str)}

ORIGINAL UNDERWRITING METRICS:
{json.dumps(original_underwriting, indent=2, default=str)}

CURRENT FINANCIAL METRICS:
{json.dumps(current_metrics, indent=2, default=str)}

CURRENT RATING: {internal_rating}

Compare performance and produce structured JSON:
{{
  "revenue_performance": "ABOVE_PLAN | ON_PLAN | BELOW_PLAN | SIGNIFICANTLY_BELOW",
  "margin_trend": "EXPANDING | STABLE | COMPRESSING | SIGNIFICANTLY_COMPRESSING",
  "leverage_change": "IMPROVING | STABLE | INCREASING | SIGNIFICANTLY_INCREASING",
  "cash_flow_quality": "IMPROVING | STABLE | DETERIORATING",
  "material_variances": [
    {{
      "metric": "metric name",
      "original_value": null,
      "current_value": null,
      "variance_pct": null,
      "assessment": "brief note"
    }}
  ],
  "portfolio_health_score": integer_0_to_100,
  "action_required": "NONE | MONITOR | COVENANT_REVIEW | CREDIT_REVIEW | RESTRUCTURE",
  "portfolio_summary": "2-3 sentence summary for credit committee"
}}
"""

        result = self.call_claude_json(self.role, user_message)
        credit_state["portfolio_health"] = result

        # Trigger alert if action required
        action = result.get("action_required", "NONE")
        if action in ["CREDIT_REVIEW", "RESTRUCTURE"]:
            add_alert(
                credit_state,
                trigger=f"Quarterly portfolio review: {action} recommended",
                severity="HIGH",
                action_required=result.get("portfolio_summary", "Credit review required."),
            )

        credit_state = log_agent(credit_state, self.name)
        return credit_state
