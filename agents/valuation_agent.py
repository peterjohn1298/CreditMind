"""
Valuation Agent — quarterly Level 3 fair-value marking under ASC 820.
Owner: Abraham Tomy

Two modes:
  1. mark_loan(deal)         — per-deal yield-based fair value calibration
                               with credit-quality drift assessment
  2. detect_inconsistency()  — portfolio-wide qualitative NLP scan that
                               surfaces drift, divergent assumptions,
                               and stale comparables across the book

Together these address:
  - LP-grade quarterly marks under ASC 820 Level 3
  - The "Mark Inconsistency Detector" rectification — practitioners need
    to know not just "what is each loan worth" but "are our marks
    internally consistent" (the BDC markdown surprises that hit Blue Owl,
    Apollo, and others were caused by inconsistency, not bad valuation)
"""

import json
from agents.base_agent import BaseAgent
from core.tools import VALUATION_TOOLS
from core.credit_state import log_agent, add_alert


_MARK_SYSTEM = """You are a Level 3 valuation analyst at a direct lending fund operating
under ASC 820 (Fair Value Measurement). Your job is to produce a defensible quarterly
mark for a private credit loan.

For a performing loan, fair value = par × (1 + yield_at_origination - current_market_yield),
adjusted for credit-quality drift. The four key inputs:

1. ORIGINATION YIELD — what the borrower is contractually paying us (SOFR + spread + OID amort).
2. CURRENT MARKET YIELD — what a comparable new loan would price at today.
   Pull current SOFR + a sector-and-rating-appropriate spread.
3. CREDIT-QUALITY DRIFT — has the borrower's risk profile changed since origination?
   If risk score has worsened, mark down further. If improved, mark up (but cap upside).
4. ILLIQUIDITY DISCOUNT — Level 3 assets typically carry 50-200bp liquidity discount.

Output a single mark with a defensible bridge and a confidence level. The mark must be
justifiable to the auditor and to LPs.
"""

_INCONSISTENCY_SYSTEM = """You are a senior valuation-committee analyst conducting the
quarterly portfolio-wide consistency review. You are NOT marking individual loans here.
Your job is to spot internal inconsistency across the book.

The 2025-2026 BDC valuation surprise (Blue Owl, Apollo) wasn't caused by individual
mark errors — it was caused by inconsistency: two loans in similar sectors with similar
credit profiles marked at materially different yields. LPs noticed; regulators noticed.

Scan the marks across the full portfolio for:
  (a) DIVERGENT YIELDS for similar sector + rating combinations
  (b) STALE COMPARABLES — marks based on a comparable transaction that closed > 6 months ago
  (c) RATING-MARK MISMATCHES — a B-rated loan marked at par while peer B-rated loans are at 95
  (d) CREDIT-DRIFT IGNORANCE — loans whose live_risk_score has worsened materially
      (>10 points) but whose mark hasn't reflected it
  (e) SECTOR INCONSISTENCY — within-sector mark dispersion that exceeds peer standard
      deviation

Output structured findings, each ranked HIGH / MEDIUM / LOW with a specific recommendation.
"""


class ValuationAgent(BaseAgent):
    """Per-deal yield-based fair value marking."""

    @property
    def name(self) -> str:
        return "Valuation Agent"

    @property
    def role(self) -> str:
        return _MARK_SYSTEM

    def run(self, credit_state: dict) -> dict:
        company           = credit_state.get("company", "Unknown")
        ticker            = credit_state.get("ticker", "")
        sector            = credit_state.get("sector", "")
        rating            = credit_state.get("internal_rating", "B+")
        loan_amount       = credit_state.get("loan_amount", 0)
        loan_tenor        = credit_state.get("loan_tenor", 5)
        original_yield    = credit_state.get("pricing_spread_bps")
        original_risk     = credit_state.get("risk_score", 50)
        live_risk         = credit_state.get("live_risk_score") or original_risk
        status            = credit_state.get("status", "current")

        task = f"""
Mark this loan to fair value under ASC 820 (Level 3, yield-based).

Borrower:           {company} ({ticker or 'private'})
Sector:             {sector}
Internal rating:    {rating}
Loan size:          ${loan_amount:,.0f}
Loan tenor:         {loan_tenor} years
Origination spread: {original_yield} bps over SOFR (if known)
Risk score:         {original_risk} at origination → {live_risk} live (drift: {live_risk - original_risk:+d})
Current status:     {status}

Use your tools to fetch:
- Current SOFR via macro snapshot (for the floating-rate base)
- Sector context for current spread benchmark

Produce structured JSON valuation:
{{
  "par_amount":               {loan_amount},
  "current_sofr_bps":         null,
  "comparable_market_spread_bps": null,
  "comparable_market_yield_bps":  null,
  "origination_yield_bps":    null,
  "yield_differential_bps":   null,
  "credit_drift_adjustment_bps": null,
  "illiquidity_discount_bps": null,
  "all_in_mark_yield_bps":    null,
  "fair_value_pct_of_par":    null,
  "fair_value_usd":           null,
  "mark_change_from_par":     null,
  "confidence":               "HIGH | MEDIUM | LOW",
  "valuation_bridge":         "1-2 sentence reasoning chain from par to mark",
  "auditor_note":             "1-2 sentences supporting the mark for ASC 820 review",
  "lp_disclosure_summary":    "1 sentence for LP quarterly statement",
  "asc_820_level":            "LEVEL_3"
}}

Be conservative. If credit has drifted materially, reflect it in the mark.
"""

        result = self.run_agentic_loop_json(self.role, task, VALUATION_TOOLS)
        credit_state["valuation_mark"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state


class MarkInconsistencyDetector(BaseAgent):
    """Portfolio-wide consistency review across all marks."""

    @property
    def name(self) -> str:
        return "Mark Inconsistency Detector"

    @property
    def role(self) -> str:
        return _INCONSISTENCY_SYSTEM

    def run_on_portfolio(self, portfolio: dict[str, dict]) -> dict:
        marked = [
            d for d in portfolio.values()
            if d.get("valuation_mark") and d["valuation_mark"].get("fair_value_pct_of_par") is not None
        ]

        # Build a compact summary the agent can reason over
        summary_rows = []
        for d in marked:
            v = d.get("valuation_mark", {})
            summary_rows.append({
                "company":           d.get("company"),
                "sector":            d.get("sector"),
                "rating":            d.get("internal_rating"),
                "live_risk_score":   d.get("live_risk_score") or d.get("risk_score"),
                "origination_risk":  d.get("risk_score"),
                "fair_value_pct":    v.get("fair_value_pct_of_par"),
                "mark_yield_bps":    v.get("all_in_mark_yield_bps"),
                "confidence":        v.get("confidence"),
                "loan_amount":       d.get("loan_amount"),
            })

        if not summary_rows:
            return {
                "findings": [],
                "summary": "No marks generated yet. Run the Valuation Agent on individual loans first.",
                "portfolio_consistency_score": None,
                "loans_reviewed": 0,
            }

        task = f"""
You are running the quarterly portfolio-wide mark consistency review.

PORTFOLIO MARKS ({len(summary_rows)} loans currently marked):
{json.dumps(summary_rows, indent=2)}

Scan for the five inconsistency patterns described in your role. For each finding:
- Identify the deals involved
- Quantify the discrepancy
- Recommend a specific resolution (re-mark, dealer poll, hold)

Produce structured JSON consistency review:
{{
  "findings": [
    {{
      "category":          "DIVERGENT_YIELDS | STALE_COMPARABLES | RATING_MARK_MISMATCH | CREDIT_DRIFT_IGNORED | SECTOR_INCONSISTENCY",
      "severity":          "HIGH | MEDIUM | LOW",
      "deals_involved":    ["company A", "company B"],
      "description":       "specific finding in 1-2 sentences",
      "quantitative_gap":  "specific bps or % gap",
      "recommendation":    "specific re-mark or further-action recommendation"
    }}
  ],
  "by_severity": {{
    "HIGH": null,
    "MEDIUM": null,
    "LOW": null
  }},
  "portfolio_consistency_score": "0-100, where 100 = perfect consistency",
  "review_summary":        "2-3 sentence executive summary for valuation committee",
  "ic_action_required":    "specific next steps before next quarter close"
}}
"""

        result = self.run_agentic_loop_json(self.role, task, [])
        result["loans_reviewed"] = len(summary_rows)
        return result
