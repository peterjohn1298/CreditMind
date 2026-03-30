"""
Agent 6: News Intelligence (Post-Disbursement)
Searches for company news daily. Flags material events.
"""

import json
from agents.base_agent import BaseAgent
from data.news_data import get_news_summary
from core.credit_state import log_agent


MATERIAL_EVENT_KEYWORDS = [
    "CEO resignation", "fraud", "investigation", "SEC probe", "lawsuit",
    "bankruptcy", "default", "downgrade", "layoffs", "revenue warning",
    "earnings miss", "accounting restatement", "M&A", "acquisition",
    "regulatory action", "fine", "settlement", "credit watch",
]


class NewsIntelligenceAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "News Intelligence"

    @property
    def role(self) -> str:
        return (
            "You are a credit surveillance analyst at a bank. "
            "Your job is to scan recent news about a borrower and identify any material events "
            "that could affect their creditworthiness. "
            "You look for: management changes, legal/regulatory issues, M&A, earnings warnings, "
            "competitive threats, and any event that a credit officer would want to know about."
        )

    def run(self, credit_state: dict) -> dict:
        ticker = credit_state["ticker"]
        company = credit_state["company"]
        internal_rating = credit_state.get("internal_rating", "Unknown")
        risk_score = credit_state.get("live_risk_score", 50)

        news = get_news_summary(ticker)

        user_message = f"""
Analyze recent news for {company} ({ticker}).
Current internal rating: {internal_rating} | Risk score: {risk_score}/100

NEWS ARTICLES:
{json.dumps(news, indent=2, default=str)}

MATERIAL EVENT KEYWORDS TO WATCH: {', '.join(MATERIAL_EVENT_KEYWORDS)}

Produce structured JSON news analysis:
{{
  "total_articles_reviewed": number,
  "material_events_detected": [
    {{
      "headline": "article title",
      "event_type": "category of event",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL",
      "credit_implication": "how this affects credit risk",
      "published_at": "date"
    }}
  ],
  "overall_news_tone": "POSITIVE | NEUTRAL | NEGATIVE | MIXED",
  "credit_relevant_summary": "2-3 sentence summary of credit-relevant news",
  "escalation_required": true/false,
  "escalation_reason": "reason if escalation_required is true"
}}
"""

        result = self.call_claude_json(self.role, user_message)

        # Append to rolling news signals
        credit_state["news_signals"].append(result)

        credit_state = log_agent(credit_state, self.name)
        return credit_state
