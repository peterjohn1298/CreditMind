"""
Agent 7: Sentiment Scorer (Post-Disbursement Daily)
Claude fetches fresh news to score sentiment independently,
then cross-checks against the news intelligence report for divergence.
"""

import json
from datetime import datetime
from agents.base_agent import BaseAgent
from core.tools import SENTIMENT_TOOLS
from core.credit_state import log_agent, add_divergence


class SentimentScorerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Sentiment Scorer"

    @property
    def role(self) -> str:
        return (
            "You are a quantitative analyst specializing in credit sentiment scoring. "
            "You score the sentiment of recent news articles on a -100 to +100 scale "
            "and detect trends that may indicate credit deterioration before it shows in financials. "
            "Fetch the latest news yourself — do not rely only on what other agents reported. "
            "Score each article individually, then produce a composite score. "
            "Negative scores = negative sentiment (deterioration risk). Positive = improving outlook."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        ticker = credit_state["ticker"]
        news_signals = credit_state.get("news_signals", [])
        current_risk_score = credit_state.get("live_risk_score", 50)
        internal_rating = credit_state.get("internal_rating", "Unknown")
        sentiment_trend = credit_state.get("sentiment_trend", [])

        task = f"""
Score credit sentiment for {company} (ticker: {ticker}).
Current rating: {internal_rating} | Live risk score: {current_risk_score}/100
Prior sentiment trend (last 5 readings): {json.dumps(sentiment_trend[-5:], default=str)}

Fetch the latest company news independently. Score sentiment based on what you find.
Compare your findings against the prior news intelligence report if available:
{json.dumps(news_signals[-1] if news_signals else {{}}, indent=2, default=str)[:800]}

Produce structured JSON sentiment assessment:
{{
  "current_sentiment": "POSITIVE | NEUTRAL | NEGATIVE | VERY_NEGATIVE",
  "sentiment_score": integer_-100_to_100,
  "article_scores": [
    {{"headline": "...", "score": integer, "rationale": "brief note"}}
  ],
  "trend": "IMPROVING | STABLE | DETERIORATING | RAPIDLY_DETERIORATING",
  "consecutive_negative_signals": integer,
  "material_flags": ["specific red flags detected"],
  "risk_score_adjustment": integer_between_-15_and_15,
  "adjusted_risk_score": integer_0_to_100,
  "alert_required": true_or_false,
  "alert_reason": "reason if alert_required, else null"
}}

Note: risk_score_adjustment is the warranted change to the live risk score.
Negative adjustment = improvement. Positive = deterioration.
"""

        result = self.run_agentic_loop_json(self.role, task, SENTIMENT_TOOLS)

        credit_state["sentiment_score"] = result.get("current_sentiment", "NEUTRAL")
        raw_score = result.get("sentiment_score", 0)  # -100 to +100
        normalized = max(0, min(100, int((raw_score + 100) / 2)))  # map to 0-100 for chart
        credit_state["sentiment_trend"].append({
            "date":  datetime.now().strftime("%Y-%m-%d"),
            "score": normalized,
            "trend": result.get("trend"),
        })

        # Divergence: high rating but very negative sentiment
        current_sentiment = result.get("current_sentiment", "NEUTRAL")
        if current_sentiment == "VERY_NEGATIVE" and internal_rating in ["AAA", "AA", "A", "BBB"]:
            add_divergence(
                credit_state,
                f"Divergence: {internal_rating} rating but sentiment is VERY_NEGATIVE. "
                "News signals may be leading indicators of financial deterioration."
            )

        credit_state = log_agent(credit_state, self.name)
        return credit_state
