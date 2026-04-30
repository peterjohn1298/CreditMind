"""
Agent 6: News Intelligence (Post-Disbursement Daily)
Claude fetches news autonomously and decides which articles are material.
Can also pull SEC filings to cross-reference regulatory disclosures.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import NEWS_INTEL_TOOLS, SECTOR_MONITOR_TOOLS
from core.credit_state import log_agent, add_alert


class NewsIntelligenceAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "News Intelligence"

    @property
    def role(self) -> str:
        return (
            "You are a credit surveillance analyst at a bank monitoring a live loan portfolio. "
            "You scan news and regulatory filings daily to detect material events affecting creditworthiness. "
            "Material events include: CEO/CFO resignation, fraud, SEC investigation, lawsuit, bankruptcy filing, "
            "default, rating downgrade, layoffs, revenue warning, earnings miss, restatement, M&A, regulatory fines. "
            "Fetch company news. If you find potentially material events, also fetch SEC filings to verify. "
            "Do not flag routine business news — only events a credit officer must know about today."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        ticker = credit_state["ticker"]
        internal_rating = credit_state.get("internal_rating", "Unknown")
        risk_score = credit_state.get("live_risk_score", 50)

        task = f"""
Daily news surveillance for {company} (ticker: {ticker}).
Current internal rating: {internal_rating} | Live risk score: {risk_score}/100

Fetch recent company news. If you find any potentially material events,
also fetch SEC filings to check for related regulatory disclosures.

Produce structured JSON news analysis:
{{
  "total_articles_reviewed": integer,
  "material_events_detected": [
    {{
      "headline": "article title",
      "event_type": "CEO_CHANGE | FRAUD | LEGAL | REGULATORY | EARNINGS | MA | DOWNGRADE | OTHER",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL",
      "credit_implication": "specific impact on creditworthiness",
      "published_at": "date"
    }}
  ],
  "sec_filings_checked": true_or_false,
  "overall_news_tone": "POSITIVE | NEUTRAL | NEGATIVE | MIXED",
  "credit_relevant_summary": "2-3 sentence summary for portfolio manager",
  "escalation_required": true_or_false,
  "escalation_reason": "reason if escalation_required is true, else null"
}}
"""

        result = self.run_agentic_loop_json(self.role, task, NEWS_INTEL_TOOLS)
        credit_state["news_signals"].append(result)

        if result.get("escalation_required"):
            add_alert(
                credit_state,
                trigger=f"News escalation: {result.get('escalation_reason', 'Material event detected')}",
                severity="HIGH",
                action_required="Portfolio manager review of news intelligence report.",
            )

        credit_state = self._log_and_audit(credit_state)
        return credit_state

    def run_sector(self, sector_state: dict) -> dict:
        """Sector-level news surveillance — uses keyword search instead of ticker."""
        sector   = sector_state["sector"]
        keywords = sector_state["keywords"]
        deals    = sector_state["deals_in_sector"]
        total_exposure = sum(d.get("loan_amount", 0) for d in deals)

        role = (
            "You are a credit surveillance analyst monitoring a private credit portfolio by sector. "
            "You scan sector-level news to detect material events that could affect the creditworthiness "
            "of loans in that sector. Focus on: regulatory changes, commodity shocks, supply chain disruptions, "
            "industry-wide financial stress, major bankruptcies, policy changes. "
            "Do not flag routine business news — only events a credit officer must act on today."
        )

        task = f"""
Sector news surveillance for: {sector}
Portfolio exposure: {len(deals)} loans totalling ${total_exposure:,.0f}
Search keywords: {', '.join(keywords[:5])}

Fetch recent sector news using the keywords above. Identify material events that could affect
creditworthiness of loans in this sector.

Produce structured JSON:
{{
  "total_articles_reviewed": integer,
  "material_events_detected": [
    {{
      "headline": "article title",
      "event_type": "REGULATORY | COMMODITY | SUPPLY_CHAIN | FINANCIAL_STRESS | POLICY | MACRO | OTHER",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL",
      "credit_implication": "how this affects loans in {sector}",
      "published_at": "date"
    }}
  ],
  "overall_news_tone": "POSITIVE | NEUTRAL | NEGATIVE | MIXED",
  "credit_relevant_summary": "2-3 sentence summary for portfolio manager",
  "escalation_required": true or false,
  "escalation_reason": "reason if escalation_required is true, else null"
}}
"""
        result = self.run_agentic_loop_json(role, task, SECTOR_MONITOR_TOOLS)
        sector_state["news_signals"] = [result]

        if result.get("escalation_required"):
            add_alert(
                sector_state,
                trigger=f"{sector}: {result.get('escalation_reason', 'Material sector event detected')}",
                severity="HIGH",
                action_required=f"Review {len(deals)} {sector} loans. {result.get('credit_relevant_summary', '')}",
            )

        sector_state = log_agent(sector_state, self.name)
        return sector_state
