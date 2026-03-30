"""
Agent 11: Rating Reviewer (Post-Disbursement, Quarterly)
Reassesses internal credit rating. Recommends Upgrade / Maintain / Downgrade / Watchlist.
Triggers credit committee review if downgrade.
"""

import json
from agents.base_agent import BaseAgent
from core.credit_state import log_agent, add_alert, add_divergence


class RatingReviewerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Rating Reviewer"

    @property
    def role(self) -> str:
        return (
            "You are a credit rating committee member at a commercial bank. "
            "Your job is to conduct a quarterly review of a borrower's internal credit rating. "
            "You consider the full picture: financial performance, sentiment, early warnings, "
            "covenant compliance, and portfolio health. "
            "Your rating recommendation triggers the bank's review process."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        original_rating = credit_state.get("internal_rating", "BB")
        current_rating = credit_state.get("current_rating", original_rating)
        live_risk_score = credit_state.get("live_risk_score", 50)
        original_risk_score = credit_state.get("risk_score", 50)

        portfolio_health = credit_state.get("portfolio_health", {})
        covenant_status = credit_state.get("covenant_status", {})
        sentiment_score = credit_state.get("sentiment_score", "NEUTRAL")
        early_warnings = credit_state.get("early_warning_flags", [])
        divergence_flags = credit_state.get("divergence_flags", [])

        user_message = f"""
Conduct quarterly rating review for {company}.

ORIGINAL RATING AT UNDERWRITING: {original_rating}
CURRENT RATING: {current_rating}
ORIGINAL RISK SCORE: {original_risk_score}/100
LIVE RISK SCORE: {live_risk_score}/100
CURRENT SENTIMENT: {sentiment_score}

PORTFOLIO HEALTH:
{json.dumps(portfolio_health, indent=2, default=str)}

COVENANT STATUS:
{json.dumps(covenant_status, indent=2, default=str)}

EARLY WARNINGS:
{json.dumps(early_warnings, indent=2, default=str)}

DIVERGENCE FLAGS:
{json.dumps(divergence_flags, indent=2, default=str)}

Produce structured JSON rating review:
{{
  "previous_rating": "{current_rating}",
  "recommended_rating": "AAA | AA | A | BBB | BB | B | CCC | CC | C | D",
  "rating_action": "UPGRADE | MAINTAIN | DOWNGRADE | WATCHLIST",
  "notches_changed": integer,
  "rating_rationale": "detailed explanation",
  "positive_factors": ["factor1", "factor2"],
  "negative_factors": ["factor1", "factor2"],
  "outlook": "POSITIVE | STABLE | NEGATIVE | DEVELOPING",
  "credit_committee_review_required": true/false,
  "review_summary": "summary for credit committee memo"
}}
"""

        result = self.call_claude_json(self.role, user_message)

        new_rating = result.get("recommended_rating", current_rating)
        rating_action = result.get("rating_action", "MAINTAIN")

        credit_state["current_rating"] = new_rating

        # Divergence: check if rating reviewer disagrees with risk scorer
        if rating_action == "DOWNGRADE" and live_risk_score < 45:
            add_divergence(
                credit_state,
                f"Rating Reviewer recommends DOWNGRADE to {new_rating}, "
                f"but live risk score is only {live_risk_score}/100. Manual review recommended."
            )

        # Trigger credit committee on downgrade
        if rating_action in ["DOWNGRADE", "WATCHLIST"]:
            add_alert(
                credit_state,
                trigger=f"Rating action: {rating_action} — {current_rating} → {new_rating}",
                severity="HIGH",
                action_required=f"Credit committee review triggered. {result.get('review_summary', '')}",
            )

        credit_state["_rating_review_full"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state
