"""
Agent 8: Early Warning (Post-Disbursement)
Adjusts live risk score based on daily signals. Triggers human alerts on threshold breaches.
"""

import json
from agents.base_agent import BaseAgent
from core.credit_state import log_agent, add_alert


ALERT_THRESHOLDS = {
    "score_drop_15": {"severity": "HIGH", "action": "Immediate escalation to senior credit officer."},
    "score_drop_25": {"severity": "CRITICAL", "action": "Credit committee review required."},
    "consecutive_negative_3": {"severity": "MEDIUM", "action": "Portfolio manager notified."},
    "ceo_resignation": {"severity": "HIGH", "action": "Senior credit officer review."},
    "fraud_investigation": {"severity": "CRITICAL", "action": "Legal + credit committee."},
    "covenant_proximity": {"severity": "MEDIUM", "action": "Monitor closely — covenant breach approaching."},
}


class EarlyWarningAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Early Warning"

    @property
    def role(self) -> str:
        return (
            "You are a portfolio risk manager at a commercial bank. "
            "Your job is to detect early signs of credit deterioration and adjust the live risk score accordingly. "
            "You look for patterns across news, sentiment, and financial signals that precede defaults. "
            "You are the system's tripwire — you catch problems before quarterly filings reveal them."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        original_risk_score = credit_state.get("risk_score", 50)
        live_risk_score = credit_state.get("live_risk_score", original_risk_score)
        sentiment_score = credit_state.get("sentiment_score", "NEUTRAL")
        sentiment_trend = credit_state.get("sentiment_trend", [])
        news_signals = credit_state.get("news_signals", [])
        internal_rating = credit_state.get("internal_rating", "BB")

        user_message = f"""
Assess early warning indicators for {company}.

ORIGINAL RISK SCORE (at underwriting): {original_risk_score}/100
CURRENT LIVE RISK SCORE: {live_risk_score}/100
INTERNAL RATING: {internal_rating}
CURRENT SENTIMENT: {sentiment_score}
SENTIMENT TREND (last 5): {json.dumps(sentiment_trend[-5:], indent=2, default=str)}
RECENT NEWS SIGNALS: {json.dumps(news_signals[-3:], indent=2, default=str)}

Produce structured JSON early warning assessment:
{{
  "warning_level": "GREEN | AMBER | RED | BLACK",
  "updated_live_risk_score": integer_0_to_100,
  "score_change_from_original": integer,
  "active_warnings": [
    {{
      "warning_type": "type",
      "description": "what was detected",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL"
    }}
  ],
  "monitoring_recommendation": "NORMAL | INCREASED | WATCHLIST | IMMEDIATE_REVIEW",
  "early_warning_summary": "concise summary for credit officer"
}}

Warning levels:
- GREEN: No concerns. Normal monitoring.
- AMBER: Some deterioration signals. Increased monitoring.
- RED: Material deterioration. Watchlist. Consider calling covenants.
- BLACK: Severe deterioration. Immediate action required.
"""

        result = self.call_claude_json(self.role, user_message)

        # Update live risk score
        new_score = result.get("updated_live_risk_score", live_risk_score)
        credit_state["live_risk_score"] = new_score
        credit_state["early_warning_flags"] = result.get("active_warnings", [])

        # Trigger alerts based on score movement
        score_drop = original_risk_score - new_score  # negative = deterioration
        if score_drop <= -15:
            add_alert(
                credit_state,
                trigger=f"Risk score deteriorated {abs(score_drop)} points from {original_risk_score} to {new_score}",
                severity="HIGH" if score_drop > -25 else "CRITICAL",
                action_required=ALERT_THRESHOLDS["score_drop_15"]["action"],
            )

        warning_level = result.get("warning_level", "GREEN")
        if warning_level in ["RED", "BLACK"]:
            add_alert(
                credit_state,
                trigger=f"Early Warning level: {warning_level}",
                severity="CRITICAL" if warning_level == "BLACK" else "HIGH",
                action_required=result.get("early_warning_summary", "Immediate review required."),
            )

        credit_state = log_agent(credit_state, self.name)
        return credit_state
