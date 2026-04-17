"""
Agent 8: Early Warning (Post-Disbursement Daily)
Claude fetches live news and macro data to detect credit deterioration signals.
Adjusts live risk score and triggers alerts on threshold breaches.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import EARLY_WARNING_TOOLS, SECTOR_MONITOR_TOOLS
from core.credit_state import log_agent, add_alert
from data.jobs_data import get_job_signals
from data.consumer_signals import get_consumer_signals

_CONSUMER_SECTORS = {"Consumer & Retail", "Healthcare", "Food & Agriculture"}


class EarlyWarningAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Early Warning"

    @property
    def role(self) -> str:
        return (
            "You are a portfolio risk manager — the system's tripwire. "
            "You detect early signs of credit deterioration before quarterly filings reveal them. "
            "You look for patterns across news, sentiment, and macro signals that precede defaults. "
            "Fetch fresh news to independently verify what other agents reported. "
            "Fetch macro data to assess whether the macro environment is worsening for this borrower. "
            "Then synthesize everything — news signals, sentiment trend, macro — to update the live risk score. "
            "Warning levels: GREEN (normal), AMBER (increased monitoring), RED (watchlist), BLACK (immediate action)."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        ticker = credit_state["ticker"]
        original_risk_score = credit_state.get("risk_score", 50)
        live_risk_score = credit_state.get("live_risk_score", original_risk_score)
        sentiment_score = credit_state.get("sentiment_score", "NEUTRAL")
        sentiment_trend = credit_state.get("sentiment_trend", [])
        news_signals = credit_state.get("news_signals", [])
        internal_rating = credit_state.get("internal_rating", "BB")

        # Pre-fetch alternative data and store in credit_state for UI display
        sector = credit_state.get("sector", "")
        job_data = get_job_signals(company)
        credit_state["job_signals"] = job_data

        if sector in _CONSUMER_SECTORS:
            consumer_data = get_consumer_signals(company)
            credit_state["consumer_signals"] = consumer_data
        else:
            consumer_data = None

        task = f"""
Early warning assessment for {company} (ticker: {ticker}).

BASELINE (at underwriting):
- Original risk score: {original_risk_score}/100
- Internal rating: {internal_rating}

CURRENT STATE:
- Live risk score: {live_risk_score}/100
- Current sentiment: {sentiment_score}
- Sentiment trend (last 5): {json.dumps(sentiment_trend[-5:], default=str)}

RECENT NEWS SIGNALS:
{json.dumps(news_signals[-3:], indent=2, default=str)[:1000]}

ALTERNATIVE DATA (pre-fetched):
Job Signal: {json.dumps(job_data, default=str)}
{f"Consumer Signal (Yelp): {json.dumps(consumer_data, default=str)}" if consumer_data else "Consumer Signal: N/A — B2B or non-consumer sector"}

Use your tools to:
1. Fetch fresh company news independently — look for anything the other agents may have missed
2. Fetch macro snapshot — assess if macro deterioration amplifies this borrower's risk

Produce structured JSON early warning assessment:
{{
  "warning_level": "GREEN | AMBER | RED | BLACK",
  "updated_live_risk_score": integer_0_to_100,
  "score_change_from_original": integer,
  "score_change_rationale": "explain what drove the score change",
  "active_warnings": [
    {{
      "warning_type": "NEWS | MACRO | SENTIMENT | FINANCIAL | COMBINED",
      "description": "specific thing detected",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL"
    }}
  ],
  "macro_risk_contribution": "how macro environment is affecting this credit",
  "monitoring_recommendation": "NORMAL | INCREASED | WATCHLIST | IMMEDIATE_REVIEW",
  "early_warning_summary": "concise 2-sentence summary for credit officer"
}}
"""

        result = self.run_agentic_loop_json(self.role, task, EARLY_WARNING_TOOLS)

        new_score = result.get("updated_live_risk_score", live_risk_score)
        credit_state["live_risk_score"] = new_score
        credit_state["early_warning_flags"] = result.get("active_warnings", [])

        # Alert on significant score deterioration
        score_change = new_score - original_risk_score
        if score_change >= 15:
            add_alert(
                credit_state,
                trigger=f"Risk score deteriorated {score_change} pts: {original_risk_score} → {new_score}/100",
                severity="CRITICAL" if score_change >= 25 else "HIGH",
                action_required="Immediate escalation to senior credit officer.",
            )

        warning_level = result.get("warning_level", "GREEN")
        if warning_level in ["RED", "BLACK"]:
            add_alert(
                credit_state,
                trigger=f"Early Warning level: {warning_level} — {company}",
                severity="CRITICAL" if warning_level == "BLACK" else "HIGH",
                action_required=result.get("early_warning_summary", "Immediate review required."),
            )

        credit_state = log_agent(credit_state, self.name)
        return credit_state

    def run_sector(self, sector_state: dict) -> dict:
        """Sector-level early warning — assesses macro + sector news for deterioration signals."""
        sector       = sector_state["sector"]
        keywords     = sector_state["keywords"]
        deals        = sector_state["deals_in_sector"]
        news_signals = sector_state.get("news_signals", [])

        role = (
            "You are a portfolio risk manager running early warning surveillance by sector. "
            "You detect early signs of credit deterioration across an entire sector before they appear "
            "in company financials. Synthesize sector news and macro data to assess sector-wide risk. "
            "Warning levels: GREEN (normal), AMBER (increased monitoring), RED (watchlist), BLACK (immediate action)."
        )

        task = f"""
Sector early warning assessment for: {sector}
Loans at risk: {len(deals)} ({', '.join(d.get('company', '') for d in deals[:5])}{'...' if len(deals) > 5 else ''})
Keywords: {', '.join(keywords[:5])}

Recent news signals:
{json.dumps(news_signals[-1:], indent=2, default=str)[:800] if news_signals else "None yet — fetch fresh sector news first."}

Use your tools to:
1. Fetch fresh sector news for independent verification
2. Fetch macro snapshot — assess if macro environment amplifies sector risk

Produce structured JSON:
{{
  "warning_level": "GREEN | AMBER | RED | BLACK",
  "sector_risk_score": integer 0-100,
  "active_warnings": [
    {{
      "warning_type": "NEWS | MACRO | REGULATORY | COMMODITY | COMBINED",
      "description": "specific signal detected",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL"
    }}
  ],
  "macro_risk_contribution": "how macro environment affects this sector",
  "affected_loan_count": integer,
  "monitoring_recommendation": "NORMAL | INCREASED | WATCHLIST | IMMEDIATE_REVIEW",
  "early_warning_summary": "concise 2-sentence summary for credit officer"
}}
"""
        result = self.run_agentic_loop_json(role, task, SECTOR_MONITOR_TOOLS)

        sector_state["sector_risk_score"] = result.get("sector_risk_score", 30)
        sector_state["early_warning_flags"] = result.get("active_warnings", [])

        warning_level = result.get("warning_level", "GREEN")
        if warning_level in ["RED", "BLACK"]:
            add_alert(
                sector_state,
                trigger=f"Early Warning {warning_level} — {sector} sector",
                severity="CRITICAL" if warning_level == "BLACK" else "HIGH",
                action_required=result.get("early_warning_summary", f"Review all {sector} loans immediately."),
            )
        elif warning_level == "AMBER":
            add_alert(
                sector_state,
                trigger=f"Increased monitoring — {sector} sector showing stress signals",
                severity="MEDIUM",
                action_required=result.get("early_warning_summary", f"Increase monitoring frequency for {sector} loans."),
            )

        sector_state = log_agent(sector_state, self.name)
        return sector_state
