"""
Agent 11: Rating Reviewer (Post-Disbursement Quarterly)
Claude fetches live metrics, news, and macro data to make an independent
rating recommendation — not just rubber-stamping prior agents.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import RATING_REVIEWER_TOOLS
from core.credit_state import log_agent, add_alert, add_divergence


class RatingReviewerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Rating Reviewer"

    @property
    def role(self) -> str:
        return (
            "You are a credit rating committee member conducting a quarterly rating review. "
            "You consider financial performance, sentiment, early warnings, covenant compliance, and portfolio health. "
            "You also fetch current metrics and news independently to form your own view. "
            "Do not simply echo prior agents — challenge their conclusions if the data supports it. "
            "Rating actions: UPGRADE (credit improving), MAINTAIN (stable), "
            "DOWNGRADE (credit deteriorating), WATCHLIST (under review with negative bias). "
            "A downgrade always triggers credit committee review."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        ticker = credit_state["ticker"]
        original_rating = credit_state.get("internal_rating", "BB")
        current_rating = credit_state.get("current_rating", original_rating)
        live_risk_score = credit_state.get("live_risk_score", 50)
        original_risk_score = credit_state.get("risk_score", 50)

        portfolio_health = credit_state.get("portfolio_health", {})
        covenant_status = credit_state.get("covenant_status", {})
        sentiment_score = credit_state.get("sentiment_score", "NEUTRAL")
        early_warnings = credit_state.get("early_warning_flags", [])
        divergence_flags = credit_state.get("divergence_flags", [])

        task = f"""
Quarterly rating review for {company} (ticker: {ticker}).

RATING HISTORY:
- Original rating at underwriting: {original_rating}
- Current rating: {current_rating}
- Original risk score: {original_risk_score}/100
- Live risk score: {live_risk_score}/100

CURRENT MONITORING STATE:
- Sentiment: {sentiment_score}
- Early warnings: {json.dumps(early_warnings, default=str)[:400]}
- Divergence flags: {json.dumps(divergence_flags, default=str)[:300]}

PORTFOLIO HEALTH (Agent 9):
{json.dumps(portfolio_health, indent=2, default=str)[:600]}

COVENANT STATUS (Agent 10):
{json.dumps(covenant_status, indent=2, default=str)[:600]}

Use your tools to form an independent view:
- Fetch current key metrics to verify financial trajectory
- Fetch current news — look for anything that changes the credit picture
- Fetch macro snapshot — assess if macro tail risks affect the rating

Produce structured JSON rating review:
{{
  "previous_rating": "{current_rating}",
  "recommended_rating": "AAA | AA | A | BBB | BB | B | CCC | CC | C | D",
  "rating_action": "UPGRADE | MAINTAIN | DOWNGRADE | WATCHLIST",
  "notches_changed": integer,
  "rating_rationale": "detailed explanation citing specific data points you fetched",
  "positive_factors": ["factor1", "factor2"],
  "negative_factors": ["factor1", "factor2"],
  "independent_findings": "anything you found that prior agents did not flag",
  "outlook": "POSITIVE | STABLE | NEGATIVE | DEVELOPING",
  "credit_committee_review_required": true_or_false,
  "review_summary": "summary for credit committee memo"
}}
"""

        result = self.run_agentic_loop_json(self.role, task, RATING_REVIEWER_TOOLS)

        new_rating = result.get("recommended_rating", current_rating)
        rating_action = result.get("rating_action", "MAINTAIN")
        credit_state["current_rating"] = new_rating

        # Divergence: rating committee says downgrade but risk score is low
        if rating_action == "DOWNGRADE" and live_risk_score < 45:
            add_divergence(
                credit_state,
                f"Rating Reviewer recommends DOWNGRADE to {new_rating}, "
                f"but live risk score is only {live_risk_score}/100. Manual review recommended."
            )

        if rating_action in ["DOWNGRADE", "WATCHLIST"]:
            add_alert(
                credit_state,
                trigger=f"Rating action: {rating_action} — {current_rating} → {new_rating}",
                severity="HIGH",
                action_required=f"Credit committee review triggered. {result.get('review_summary', '')}",
            )

        credit_state["_rating_review_full"] = result
        credit_state = self._log_and_audit(credit_state)
        return credit_state
