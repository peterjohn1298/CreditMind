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

_RATING_LADDER = [
    "AAA","AA+","AA","AA-","A+","A","A-",
    "BBB+","BBB","BBB-","BB+","BB","BB-",
    "B+","B","B-","CCC+","CCC","CCC-","CC","C","D",
]
# Upper score boundary for each rating notch (index-aligned to _RATING_LADDER)
_SCORE_BREAKPOINTS = [8,12,16,20,24,28,32,36,40,44,48,52,57,62,67,72,77,82,87,92,96,100]


def _score_to_rating_idx(score: int) -> int:
    for i, bp in enumerate(_SCORE_BREAKPOINTS):
        if score <= bp:
            return i
    return len(_RATING_LADDER) - 1


def _apply_rating_review(credit_state: dict, result: dict, new_score: int) -> dict:
    """
    Compare live_risk_score against the current rating notch. If the implied
    rating has diverged meaningfully, record a rating event and — for downgrades —
    actually update internal_rating.
    """
    from datetime import datetime as _dt

    current_rating = credit_state.get("internal_rating", "BB-")
    original_score = credit_state.get("risk_score", 50)

    if current_rating not in _RATING_LADDER:
        return credit_state

    current_idx = _RATING_LADDER.index(current_rating)
    implied_idx = _score_to_rating_idx(new_score)
    score_delta = new_score - original_score
    warning_level = result.get("warning_level", "GREEN")
    rationale = result.get("score_change_rationale", "")
    summary   = result.get("early_warning_summary", "")

    if "rating_history" not in credit_state:
        credit_state["rating_history"] = []

    # notch_diff > 0 → credit has worsened; < 0 → improved
    notch_diff = implied_idx - current_idx
    now = _dt.now().isoformat()

    if notch_diff >= 2 or (warning_level in ["RED", "BLACK"] and notch_diff >= 1):
        # ── DOWNGRADE (execute — move 1 notch) ────────────────────────────
        new_idx    = min(current_idx + 1, len(_RATING_LADDER) - 1)
        new_rating = _RATING_LADDER[new_idx]
        long_rationale = (
            f"{rationale} {summary}".strip()
            or f"Risk score deteriorated {score_delta:+d} pts to {new_score}/100, "
               f"implying {_RATING_LADDER[implied_idx]} on a quantitative basis."
        )
        credit_state["rating_history"].append({
            "event_type":            "DOWNGRADE",
            "from_rating":           current_rating,
            "to_rating":             new_rating,
            "date":                  now,
            "risk_score_at_event":   new_score,
            "score_delta_from_baseline": score_delta,
            "warning_level":         warning_level,
            "rationale":             long_rationale,
            "agent":                 "Early Warning",
            "action_required":       "Formal rating downgrade — notify credit committee and update borrower covenant file.",
        })
        credit_state["internal_rating"] = new_rating
        add_alert(
            credit_state,
            trigger=f"Rating downgraded: {current_rating} → {new_rating} | Risk score {new_score}/100",
            severity="CRITICAL",
            action_required=f"Formal rating action required. {summary}",
        )

    elif notch_diff >= 1 or (warning_level == "AMBER" and score_delta >= 8):
        # ── NEGATIVE WATCH (no rating change yet) ─────────────────────────
        credit_state["rating_history"].append({
            "event_type":            "NEGATIVE_WATCH",
            "from_rating":           current_rating,
            "to_rating":             current_rating,
            "date":                  now,
            "risk_score_at_event":   new_score,
            "score_delta_from_baseline": score_delta,
            "warning_level":         warning_level,
            "rationale":             (
                f"Risk score moved {score_delta:+d} pts to {new_score}/100. "
                f"Credit placed on negative watch. {rationale}"
            ).strip(),
            "agent":                 "Early Warning",
            "action_required":       "Increase monitoring frequency. Formal rating review scheduled for next cycle.",
        })

    elif notch_diff <= -1 and score_delta <= -8:
        # ── UPGRADE ELIGIBLE (propose — do not execute without IC approval) ─
        proposed = _RATING_LADDER[max(current_idx - 1, 0)]
        credit_state["rating_history"].append({
            "event_type":            "UPGRADE_ELIGIBLE",
            "from_rating":           current_rating,
            "to_rating":             current_rating,
            "proposed_rating":       proposed,
            "date":                  now,
            "risk_score_at_event":   new_score,
            "score_delta_from_baseline": score_delta,
            "warning_level":         warning_level,
            "rationale":             (
                f"Risk score improved {abs(score_delta)} pts to {new_score}/100. "
                f"Upgrade to {proposed} eligible pending sustained performance. {rationale}"
            ).strip(),
            "agent":                 "Early Warning",
            "action_required":       f"Schedule formal rating review. Upgrade to {proposed} may be warranted if improvement sustained one more cycle.",
        })

    return credit_state


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

        # Rating review — update internal_rating if warranted
        credit_state = _apply_rating_review(credit_state, result, new_score)

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
        """Sector-level early warning — quantitative composite score + Claude narrative."""
        sector       = sector_state["sector"]
        keywords     = sector_state["keywords"]
        deals        = sector_state["deals_in_sector"]
        news_signals = sector_state.get("news_signals", [])

        # ── Quantitative score (formula-based anchor) ──────────────────────
        from data.sector_stress import compute_sector_stress
        stress = compute_sector_stress(sector, deals, news_signals)
        formula_score = stress["composite_score"]
        components    = stress["components"]

        role = (
            "You are a portfolio risk manager running early warning surveillance by sector. "
            "You detect early signs of credit deterioration across an entire sector before they appear "
            "in company financials. A quantitative stress model has already computed a base score — "
            "your job is to validate it, add qualitative context, and adjust by ±10 points if your "
            "independent assessment materially differs. "
            "Warning levels: GREEN (normal), AMBER (increased monitoring), RED (watchlist), BLACK (immediate action)."
        )

        task = f"""
Sector early warning assessment for: {sector}
Loans at risk: {len(deals)} ({', '.join(d.get('company', '') for d in deals[:5])}{'...' if len(deals) > 5 else ''})
Keywords: {', '.join(keywords[:5])}

QUANTITATIVE MODEL OUTPUT (formula-based — use as your anchor):
  Composite stress score : {formula_score}/100
  Dominant driver        : {stress['dominant_driver']}
  ─ Macro stress         : {components['macro']['score']}/100  (HY spread: {components['macro'].get('hy_spread', 'N/A')}, VIX: {components['macro'].get('vix', 'N/A')})
  ─ Market momentum      : {components['momentum']['score']}/100  (ETF: {components['momentum'].get('etf', 'N/A')}, rel. return: {components['momentum'].get('relative_return', 'N/A')}%)
  ─ News sentiment       : {components['news']['score']}/100  (tone: {components['news'].get('tone', 'N/A')}, critical events: {components['news'].get('critical_events', 0)})
  ─ Portfolio signals    : {components['portfolio']['score']}/100  (avg risk: {components['portfolio'].get('base_risk_score', 'N/A')}, breaches: {components['portfolio'].get('covenant_breaches', 0)}, watchlist: {components['portfolio'].get('watchlist_deals', 0)})

Recent news signals:
{json.dumps(news_signals[-1:], indent=2, default=str)[:600] if news_signals else "None yet."}

Use your tools to fetch macro snapshot for independent validation.

Produce structured JSON. Set sector_risk_score to the formula score unless your qualitative
assessment warrants an adjustment of up to ±10 points — explain any adjustment in score_adjustment_rationale.

{{
  "warning_level": "GREEN | AMBER | RED | BLACK",
  "sector_risk_score": integer 0-100,
  "score_adjustment": integer (0 if no adjustment, positive = raised, negative = lowered),
  "score_adjustment_rationale": "why you adjusted, or null if no adjustment",
  "active_warnings": [
    {{
      "warning_type": "NEWS | MACRO | MARKET | PORTFOLIO | REGULATORY | COMMODITY | COMBINED",
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

        # Store the final score and the full component breakdown
        sector_state["sector_risk_score"]    = result.get("sector_risk_score", formula_score)
        sector_state["sector_stress_detail"] = stress   # full breakdown for debugging / UI
        sector_state["early_warning_flags"]  = result.get("active_warnings", [])

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
