"""
LP Reporting Agent — generates ILPA-format quarterly LP reports.
Owner: Abraham Tomy

Three artefacts:
  1. ILPA Reporting Template 2.0 — quarterly fund-level NAV, cash flows, fees,
     expenses (mandatory format for major LPs from Q1 2026)
  2. ILPA Performance Template — TVPI, DPI, RVPI, IRR (gross + net)
  3. Capital Call / Distribution Notice — per-LP allocation notices

This agent works off the portfolio data already in CreditMind plus a small
fund-metadata block. Output is structured JSON — the frontend renders it as
a downloadable .docx / .xlsx-equivalent table and the LP letter format.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import GET_MACRO_SNAPSHOT
from core.credit_state import log_agent


_REPORTING_SYSTEM = """You are a fund operations analyst at a direct lending fund preparing
the quarterly LP report under ILPA Reporting Template 2.0 (effective Q1 2026 for major LPs).

Your output is a structured JSON document covering all sections required by ILPA RT 2.0:
  - Capital Account Statement (per LP class)
  - Schedule of Investments
  - Schedule of Realised Investments
  - Fees and Expenses Detail
  - Fund-level Cash Flows
  - NAV Bridge (prior NAV → distributions → contributions → P&L → ending NAV)

Be precise. Numbers must reconcile across sections.
"""


_PERFORMANCE_SYSTEM = """You are computing the ILPA Performance Template for a quarterly LP report.

Output the standard performance metrics, GROSS of fees and NET of fees:
  - TVPI (Total Value to Paid-In Capital)
  - DPI  (Distributions to Paid-In Capital)
  - RVPI (Residual Value to Paid-In Capital)
  - IRR  (Net IRR using actual cash flows)
  - PIC% (Paid-In Capital as % of commitments)

Also include benchmark comparisons against:
  - Cliffwater Direct Lending Index (or Cliffwater BDC Index)
  - Senior Loan Fund peer median

Be specific about assumptions (J-curve, vintage benchmark, etc.).
"""


_NOTICE_SYSTEM = """You are drafting a per-LP Capital Call or Distribution Notice for the
quarterly cycle. The notice must include:

  - LP name, commitment, % of fund
  - Call/distribution amount in USD
  - Purpose (specific deal funding, fee payment, or distribution source)
  - Wire instructions reminder
  - Due date (T+10 business days for calls)
  - Updated paid-in / unfunded balance
  - Brief plain-English context for the LP

Tone is professional but personable. Each LP gets a tailored notice.
"""


class LPReportingAgent(BaseAgent):
    """Generates the three ILPA artefacts from portfolio + fund metadata."""

    @property
    def name(self) -> str:
        return "LP Reporting"

    @property
    def role(self) -> str:
        return "Generates ILPA Reporting Template 2.0, Performance Template, and capital call/distribution notices"

    # ---------------------------------------------------------------------
    # Artefact 1 — ILPA Reporting Template 2.0
    # ---------------------------------------------------------------------

    def generate_reporting_template(self, portfolio: dict[str, dict], fund_meta: dict) -> dict:
        deals = list(portfolio.values())
        total_invested = sum(float(d.get("loan_amount", 0)) for d in deals)
        # NAV approximation: use valuation_mark fair_value_usd if present, else par
        nav = sum(
            (d.get("valuation_mark", {}) or {}).get("fair_value_usd") or float(d.get("loan_amount", 0))
            for d in deals
        )
        sector_summary: dict[str, float] = {}
        rating_summary: dict[str, int] = {}
        for d in deals:
            s = d.get("sector", "Unknown")
            sector_summary[s] = sector_summary.get(s, 0) + float(d.get("loan_amount", 0))
            r = d.get("internal_rating", "Unrated")
            rating_summary[r] = rating_summary.get(r, 0) + 1

        deals_summary = [
            {
                "deal_id":      d.get("deal_id"),
                "company":      d.get("company"),
                "sector":       d.get("sector"),
                "loan_amount":  d.get("loan_amount"),
                "rating":       d.get("internal_rating"),
                "status":       d.get("status"),
                "fair_value":   (d.get("valuation_mark", {}) or {}).get("fair_value_usd"),
            }
            for d in deals
        ]

        task = f"""
Build the quarterly ILPA Reporting Template 2.0 LP statement for the fund.

FUND METADATA:
{json.dumps(fund_meta, indent=2, default=str)}

PORTFOLIO SUMMARY:
- Active deals: {len(deals)}
- Total invested capital: ${total_invested:,.0f}
- Approximate NAV (sum of fair values / par): ${nav:,.0f}
- Sector breakdown: {json.dumps({k: float(v) for k, v in sector_summary.items()})}
- Rating breakdown: {json.dumps(rating_summary)}

DEAL DETAIL ({len(deals_summary)} deals):
{json.dumps(deals_summary[:30], indent=2, default=str)[:3000]}

Produce structured JSON ILPA RT 2.0:
{{
  "report_period":      "Q__ YYYY",
  "report_date":        "YYYY-MM-DD",
  "fund_name":          "",
  "fund_size":          null,
  "commitments":        null,
  "called_to_date":     null,
  "uncalled":           null,

  "capital_account": [
    {{ "lp_class": "Class A LPs", "commitment": null, "called": null, "distributed": null, "nav": null }}
  ],

  "schedule_of_investments": [
    {{ "company": "", "sector": "", "rating": "", "cost_basis": null, "fair_value": null, "ownership_pct": null }}
  ],

  "schedule_of_realised": [
    {{ "company": "", "exit_type": "REPAID | REFINANCED | RESTRUCTURED | DEFAULTED", "realized_proceeds": null, "moic": null, "irr": null }}
  ],

  "fees_and_expenses": {{
    "management_fee":        null,
    "incentive_fee":         null,
    "professional_fees":     null,
    "fund_admin":            null,
    "audit":                 null,
    "other":                 null,
    "total":                 null
  }},

  "cash_flows_quarter": {{
    "contributions":         null,
    "distributions":         null,
    "investment_proceeds":   null,
    "investment_outflows":   null,
    "fees_paid":             null,
    "net_cash_flow":         null
  }},

  "nav_bridge": {{
    "opening_nav":           null,
    "contributions":         null,
    "distributions":         null,
    "realized_pnl":          null,
    "unrealized_pnl":        null,
    "fees":                  null,
    "ending_nav":            null
  }},

  "concentration_disclosures": {{
    "top_5_borrowers":       [],
    "top_5_sectors":         [],
    "top_5_sponsors":        []
  }},

  "narrative": "1-2 paragraph quarter-in-review for the LP letter",
  "ilpa_compliance":         "RT_2_0_COMPLIANT | NEEDS_REVIEW",
  "auditor_review_status":   "REVIEWED | UNREVIEWED | DRAFT"
}}

Be specific and reconcile numbers. If exact data is unavailable, populate with realistic
placeholder estimates anchored to the portfolio summary above and mark with a note.
"""
        return self.run_agentic_loop_json(_REPORTING_SYSTEM, task, [])

    # ---------------------------------------------------------------------
    # Artefact 2 — ILPA Performance Template
    # ---------------------------------------------------------------------

    def generate_performance_template(self, portfolio: dict[str, dict], fund_meta: dict) -> dict:
        deals = list(portfolio.values())
        total_invested = sum(float(d.get("loan_amount", 0)) for d in deals)
        approx_fv = sum(
            (d.get("valuation_mark", {}) or {}).get("fair_value_usd") or float(d.get("loan_amount", 0))
            for d in deals
        )

        task = f"""
Compute the ILPA Performance Template for the fund.

FUND METADATA:
{json.dumps(fund_meta, indent=2, default=str)}

PORTFOLIO METRICS:
- Active investments: {len(deals)}
- Cost basis (par): ${total_invested:,.0f}
- Approximate fair value: ${approx_fv:,.0f}
- Implied unrealized P&L: ${approx_fv - total_invested:,.0f}

Use the macro tool to fetch current Cliffwater Direct Lending Index reference if available.

Produce structured JSON ILPA Performance Template:
{{
  "as_of_date":            "YYYY-MM-DD",
  "vintage_year":          null,
  "fund_age_years":        null,
  "since_inception": {{
    "tvpi_gross": null, "tvpi_net": null,
    "dpi_gross":  null, "dpi_net":  null,
    "rvpi_gross": null, "rvpi_net": null,
    "irr_gross":  null, "irr_net":  null,
    "moic_gross": null, "moic_net": null,
    "pic_pct":    null
  }},
  "ytd": {{ "irr_gross": null, "irr_net": null, "loss_rate_pct": null }},
  "quarterly_history": [
    {{ "quarter": "", "nav": null, "tvpi_net": null, "irr_net": null }}
  ],
  "benchmark_comparison": {{
    "cliffwater_dli_irr":   null,
    "fund_outperformance_bps": null,
    "peer_median_irr":      null
  }},
  "loss_history": {{
    "realised_losses":      null,
    "loss_rate_pct":        null,
    "default_count":        null
  }},
  "attribution": {{
    "income_yield":         null,
    "spread_compression":   null,
    "credit_losses":        null,
    "management_fees":      null,
    "incentive_fees":       null
  }},
  "narrative": "performance discussion paragraph",
  "ilpa_compliance":  "PT_COMPLIANT | NEEDS_REVIEW"
}}
"""
        return self.run_agentic_loop_json(_PERFORMANCE_SYSTEM, task, [GET_MACRO_SNAPSHOT])

    # ---------------------------------------------------------------------
    # Artefact 3 — Capital call / distribution notices
    # ---------------------------------------------------------------------

    def generate_notice(
        self,
        notice_type: str,
        amount: float,
        purpose: str,
        lp_roster: list[dict],
        fund_meta: dict,
    ) -> dict:
        task = f"""
Generate a per-LP {notice_type.upper()} notice batch.

EVENT:
- Type:    {notice_type}  (one of: capital_call, distribution)
- Amount:  ${amount:,.0f}
- Purpose: {purpose}

FUND METADATA:
{json.dumps(fund_meta, indent=2, default=str)}

LP ROSTER ({len(lp_roster)} LPs):
{json.dumps(lp_roster, indent=2, default=str)}

Allocate the amount pro-rata by LP commitment %. For each LP, generate a personalised
notice paragraph and reconcile updated paid-in / unfunded balances.

Produce JSON:
{{
  "notice_type":      "capital_call | distribution",
  "event_date":       "YYYY-MM-DD",
  "due_date":         "YYYY-MM-DD",
  "total_amount":     null,
  "purpose":          "",
  "lp_notices": [
    {{
      "lp_id":              null,
      "lp_name":            "",
      "commitment":         null,
      "ownership_pct":      null,
      "amount":             null,
      "updated_paid_in":    null,
      "updated_unfunded":   null,
      "notice_paragraph":   "personalised LP-specific paragraph"
    }}
  ],
  "wire_instructions_reminder": "JPMorgan Chase, ABA xxxxx, A/c xxxxx — see exhibit B",
  "fund_note":                "1-2 sentence executive note from the GP"
}}
"""
        return self.run_agentic_loop_json(_NOTICE_SYSTEM, task, [])

    # Compatibility shim — required by base_agent
    def run(self, credit_state: dict) -> dict:
        return credit_state
