"""
Agent 7: Sentiment Scorer (Post-Disbursement)
Classifies news sentiment and tracks 30-day rolling trend.
"""

import json
from agents.base_agent import BaseAgent
from core.credit_state import log_agent, add_alert, add_divergence


class SentimentScorerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Sentiment Scorer"

    @property
    def role(self) -> str:
        return (
            "You are a quantitative analyst specializing in credit sentiment. "
            "Your job is to score the sentiment of recent news signals and detect trends "
            "that may indicate deteriorating creditworthiness before it shows up in financials."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        ticker = credit_state["ticker"]
        news_signals = credit_state.get("news_signals", [])
        current_risk_score = credit_state.get("live_risk_score", 50)
        internal_rating = credit_state.get("internal_rating", "Unknown")

        if not news_signals:
            credit_state["sentiment_score"] = "NEUTRAL"
            credit_state = log_agent(credit_state, self.name)
            return credit_state

        latest_news = news_signals[-1] if news_signals else {}

        user_message = f"""
Score the sentiment for {company} ({ticker}) based on recent news signals.

CURRENT CREDIT STANDING: {internal_rating} | Risk Score: {current_risk_score}/100

LATEST NEWS ANALYSIS:
{json.dumps(latest_news, indent=2, default=str)}

ALL NEWS SIGNALS (rolling history):
{json.dumps(news_signals[-5:], indent=2, default=str)}

Produce structured JSON sentiment assessment:
{{
  "current_sentiment": "POSITIVE | NEUTRAL | NEGATIVE | VERY_NEGATIVE",
  "sentiment_score": integer_-100_to_100,
  "trend": "IMPROVING | STABLE | DETERIORATING | RAPIDLY_DETERIORATING",
  "consecutive_negative_days": integer,
  "material_flags": ["list of specific red flags if any"],
  "risk_score_adjustment": integer_between_-20_and_20,
  "adjusted_risk_score": integer_0_to_100,
  "alert_required": true/false,
  "alert_reason": "reason if alert_required is true"
}}

Note: risk_score_adjustment is how much the sentiment warrants moving the risk score.
Negative = improvement, Positive = deterioration.
"""

        result = self.call_claude_json(self.role, user_message)

        credit_state["sentiment_score"] = result.get("current_sentiment", "NEUTRAL")
        credit_state["sentiment_trend"].append({
            "score": result.get("sentiment_score"),
            "trend": result.get("trend"),
        })

        # Check for divergence between financial rating and sentiment
        current_sentiment = result.get("current_sentiment", "NEUTRAL")
        if current_sentiment == "VERY_NEGATIVE" and internal_rating in ["AAA", "AA", "A", "BBB"]:
            add_divergence(
                credit_state,
                f"Divergence: {internal_rating} rating but sentiment is VERY_NEGATIVE. "
                f"News signals may be leading indicators of financial deterioration."
            )

        credit_state = log_agent(credit_state, self.name)
        return credit_state
