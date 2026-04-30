"""
Deal Screener Agent — Stage 2
Owner: Peter

Takes a deal teaser / CIM summary and outputs a go/no-go recommendation
in under 2 minutes. Checks sector fit, size fit, leverage ask, concentration
risk, and sponsor track record before committing to full diligence.
"""

from agents.base_agent import BaseAgent
from core.tools import SCREENING_TOOLS
from core.credit_policy import get_policy_context_for_agents


_POLICY_CONTEXT = get_policy_context_for_agents()

_SYSTEM_PROMPT = f"""{_POLICY_CONTEXT}

You are a senior credit analyst at a direct lending fund doing initial deal screening.
You receive a deal teaser — a brief summary of a potential loan opportunity — and must quickly
decide whether it warrants full due diligence.

Your screening checks 5 things in order:
1. SECTOR FIT — Is this a sector we lend in? Are there current sector headwinds that affect risk?
2. SIZE FIT — Does EBITDA and loan size fall within our mandate?
3. LEVERAGE FIT — Is the leverage being asked reasonable vs. sector norms and our max?
4. CONCENTRATION RISK — Do we already have too much exposure to this sector or sponsor?
5. SPONSOR / COMPANY QUALITY — Is the sponsor credible? Are there red flags in recent news?

You have access to tools to look up company financials, news, and macro context.
Be decisive — screen fast, flag issues clearly, give a recommendation.

Output structured JSON only."""


class DealScreenerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Deal Screener"

    @property
    def role(self) -> str:
        return "Rapid go/no-go screening of incoming deal teasers before full diligence"

    def run(self, credit_state: dict) -> dict:
        deal   = credit_state.get("deal_teaser", {})
        fund   = credit_state.get("fund_criteria", {})
        portfolio_summary = credit_state.get("portfolio_concentration", {})

        company        = deal.get("company", "Unknown")
        ticker         = deal.get("ticker", "")
        sector         = deal.get("sector", "")
        sponsor        = deal.get("sponsor", "")
        ebitda_est     = deal.get("estimated_ebitda", 0)
        loan_ask       = deal.get("loan_amount", 0)
        leverage_ask   = deal.get("leverage_ask", 0)
        loan_type      = deal.get("loan_type", "Term Loan B")
        deal_rationale = deal.get("rationale", "")

        fund_ebitda_min  = fund.get("ebitda_min", 10_000_000)
        fund_ebitda_max  = fund.get("ebitda_max", 150_000_000)
        fund_loan_max    = fund.get("loan_size_max", 500_000_000)
        fund_max_leverage = fund.get("max_leverage", 6.5)
        target_sectors   = fund.get("target_sectors", [])
        excluded_sectors = fund.get("exclude_sectors", [])

        sector_concentration = portfolio_summary.get("by_sector", {})
        sponsor_concentration = portfolio_summary.get("by_sponsor", {})
        sector_count  = sector_concentration.get(sector, 0)
        sponsor_count = sponsor_concentration.get(sponsor, 0)

        # ── Hard-block pre-checks (no AI call needed) ─────────────────────────
        hard_blocks = []

        if excluded_sectors and any(
            sector.lower() == s.lower() for s in excluded_sectors
        ):
            hard_blocks.append(
                f"Sector '{sector}' is on the fund's excluded-sectors list — automatic NO-GO."
            )

        if loan_ask > 0 and loan_ask > fund_loan_max:
            hard_blocks.append(
                f"Loan ask ${loan_ask/1e6:.0f}M exceeds fund maximum ${fund_loan_max/1e6:.0f}M."
            )

        if ebitda_est > 0 and ebitda_est < fund_ebitda_min:
            hard_blocks.append(
                f"Estimated EBITDA ${ebitda_est/1e6:.1f}M is below fund minimum ${fund_ebitda_min/1e6:.0f}M."
            )

        if leverage_ask > 0 and fund_max_leverage > 0 and leverage_ask > fund_max_leverage + 0.5:
            hard_blocks.append(
                f"Leverage ask {leverage_ask:.1f}x exceeds fund maximum {fund_max_leverage:.1f}x "
                f"(hard stop at {fund_max_leverage + 0.5:.1f}x)."
            )

        if sector_count >= 5:
            hard_blocks.append(
                f"Portfolio already has {sector_count} deals in '{sector}' — "
                f"sector concentration limit reached (max 5)."
            )

        if sponsor and sponsor_count >= 3:
            hard_blocks.append(
                f"Portfolio already has {sponsor_count} deals with sponsor '{sponsor}' — "
                f"sponsor concentration limit reached (max 3)."
            )

        if hard_blocks:
            result = {
                "company":  company,
                "sector":   sector,
                "sponsor":  sponsor,
                "decision": "NO-GO",
                "confidence": 10,
                "hard_blocks": hard_blocks,
                "screening_results": {
                    "sector_fit":         {"pass": "excluded" not in hard_blocks[0].lower(), "notes": ""},
                    "size_fit":           {"pass": True, "notes": ""},
                    "leverage_fit":       {"pass": True, "notes": ""},
                    "concentration_risk": {"pass": True, "notes": ""},
                    "sponsor_quality":    {"pass": True, "notes": ""},
                },
                "key_concerns":    hard_blocks,
                "key_positives":   [],
                "recommended_next_steps": "Deal does not meet minimum criteria. Do not proceed to diligence.",
                "indicative_terms_if_proceed": {},
                "screen_rationale": (
                    f"Hard-block: {hard_blocks[0]} "
                    + (f"Additional flags: {'; '.join(hard_blocks[1:])}" if len(hard_blocks) > 1 else "")
                ),
            }
            credit_state["screening_result"]   = result
            credit_state["screening_decision"] = "NO-GO"
            credit_state["hard_blocks"]        = hard_blocks
            credit_state["agent_log"] = credit_state.get("agent_log", [])
            credit_state["agent_log"].append({
                "agent":    self.name,
                "decision": "NO-GO",
                "reason":   "hard_block",
                "blocks":   hard_blocks,
            })
            return credit_state
        # ── End hard-block checks ──────────────────────────────────────────────

        task = f"""Screen this incoming deal teaser and give a go/no-go recommendation.

DEAL TEASER:
- Company: {company}
- Ticker: {ticker if ticker else 'Private company — no ticker'}
- Sector: {sector}
- Sponsor: {sponsor if sponsor else 'Non-sponsored / founder-owned'}
- Estimated EBITDA: ${ebitda_est/1e6:.1f}M
- Loan Ask: ${loan_ask/1e6:.1f}M
- Leverage Ask: {leverage_ask:.1f}x Net Debt/EBITDA
- Instrument: {loan_type}
- Deal Rationale: {deal_rationale if deal_rationale else 'Not provided'}

OUR FUND CRITERIA:
- Target sectors: {', '.join(target_sectors) if target_sectors else 'All sectors'}
- Excluded sectors: {', '.join(excluded_sectors) if excluded_sectors else 'None'}
- EBITDA range: ${fund_ebitda_min/1e6:.0f}M – ${fund_ebitda_max/1e6:.0f}M
- Max loan size: ${fund_loan_max/1e6:.0f}M
- Max leverage: {fund_max_leverage:.1f}x

CURRENT PORTFOLIO CONCENTRATION:
- Existing deals in {sector}: {sector_count}
- Existing deals with {sponsor}: {sponsor_count}

SCREENING INSTRUCTIONS:
1. {"Look up company info and recent news for " + company + " (ticker: " + ticker + ")" if ticker else "No ticker — assess from sector/sponsor context only"}
2. Check current macro conditions for {sector} sector
3. Assess all 5 screening criteria
4. Give a clear go/no-go

Return JSON:
{{
  "company": "{company}",
  "sector": "{sector}",
  "sponsor": "{sponsor}",
  "decision": "GO | NO-GO | CONDITIONAL",
  "confidence": 1-10,
  "screening_results": {{
    "sector_fit": {{"pass": true/false, "notes": ""}},
    "size_fit": {{"pass": true/false, "notes": ""}},
    "leverage_fit": {{"pass": true/false, "notes": ""}},
    "concentration_risk": {{"pass": true/false, "notes": ""}},
    "sponsor_quality": {{"pass": true/false, "notes": ""}}
  }},
  "key_concerns": ["list of specific concerns"],
  "key_positives": ["list of specific positives"],
  "recommended_next_steps": "what to do if GO or CONDITIONAL",
  "indicative_terms_if_proceed": {{
    "max_loan": "suggested max loan amount",
    "max_leverage": "suggested max leverage",
    "pricing_indication": "SOFR + X bps range",
    "key_covenant_requirements": ["list of must-have covenants"]
  }},
  "screen_rationale": "2-3 sentence overall rationale"
}}"""

        result = self.run_agentic_loop_json(
            system_prompt=_SYSTEM_PROMPT,
            initial_message=task,
            tools=SCREENING_TOOLS,
            max_iterations=8,
        )

        credit_state["screening_result"] = result
        credit_state["screening_decision"] = result.get("decision", "CONDITIONAL")
        credit_state["agent_log"] = credit_state.get("agent_log", [])
        credit_state["agent_log"].append({
            "agent": self.name,
            "decision": result.get("decision"),
            "confidence": result.get("confidence"),
        })
        return credit_state
