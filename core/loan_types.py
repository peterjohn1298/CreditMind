"""
Loan type definitions for all private credit instruments.
Each config drives: agent pipeline, covenant templates, risk thresholds,
pricing benchmarks, and specialist agent selection.
"""

from dataclasses import dataclass, field
from typing import Optional


# ── Canonical loan type identifiers ─────────────────────────────────────────

SENIOR_SECURED    = "senior_secured"
GROWTH_CAPITAL    = "growth_capital"
UNITRANCHE        = "unitranche"
MEZZANINE         = "mezzanine"
REVOLVER          = "revolver"
BRIDGE            = "bridge"
DISTRESSED        = "distressed"
PROJECT_FINANCE   = "project_finance"

ALL_LOAN_TYPES = [
    SENIOR_SECURED, GROWTH_CAPITAL, UNITRANCHE,
    MEZZANINE, REVOLVER, BRIDGE, DISTRESSED, PROJECT_FINANCE,
]

# Aliases used in forms and teasers → canonical
LOAN_TYPE_ALIASES = {
    "term loan":               SENIOR_SECURED,
    "term loan b":             SENIOR_SECURED,
    "tl b":                    SENIOR_SECURED,
    "direct lending":          SENIOR_SECURED,
    "senior secured":          SENIOR_SECURED,
    "lbo debt":                SENIOR_SECURED,
    "growth capital":          GROWTH_CAPITAL,
    "minority lending":        GROWTH_CAPITAL,
    "growth equity debt":      GROWTH_CAPITAL,
    "unitranche":              UNITRANCHE,
    "uni-tranche":             UNITRANCHE,
    "mezzanine":               MEZZANINE,
    "mezz":                    MEZZANINE,
    "subordinated debt":       MEZZANINE,
    "sub debt":                MEZZANINE,
    "revolver":                REVOLVER,
    "revolving credit":        REVOLVER,
    "revolving credit facility": REVOLVER,
    "rcf":                     REVOLVER,
    "abl":                     REVOLVER,
    "asset based lending":     REVOLVER,
    "bridge":                  BRIDGE,
    "bridge loan":             BRIDGE,
    "bridge financing":        BRIDGE,
    "distressed":              DISTRESSED,
    "special situations":      DISTRESSED,
    "dip":                     DISTRESSED,
    "dip financing":           DISTRESSED,
    "rescue financing":        DISTRESSED,
    "project finance":         PROJECT_FINANCE,
    "infrastructure":          PROJECT_FINANCE,
    "infrastructure debt":     PROJECT_FINANCE,
    "project debt":            PROJECT_FINANCE,
}


def normalize_loan_type(raw: str) -> str:
    """Map any loan type string to a canonical identifier."""
    return LOAN_TYPE_ALIASES.get(raw.lower().strip(), SENIOR_SECURED)


# ── Per-loan-type configuration ──────────────────────────────────────────────

@dataclass
class LoanTypeConfig:
    loan_type:            str
    display_name:         str
    description:          str

    # Risk thresholds
    max_leverage:         float         # Net Debt / EBITDA ceiling
    min_dscr:             float         # Minimum debt service coverage
    min_interest_coverage: float        # Min EBIT / Interest Expense
    auto_reject_risk_score: int         # Risk score above which auto-reject

    # Pricing
    typical_spread_bps:   int           # Over SOFR
    spread_range:         tuple[int, int]
    has_pik_option:       bool
    has_equity_kicker:    bool
    origination_fee_pct:  float

    # Structure
    typical_tenor_years:  int
    is_non_recourse:      bool          # True for project finance
    is_subordinated:      bool          # True for mezzanine
    is_revolving:         bool          # True for revolver
    requires_sponsor:     bool
    call_protection:      str
    amortization:         str

    # Covenants
    covenant_type:        str           # maintenance | incurrence | borrowing_base | project | none
    key_covenant_metrics: list[str]
    covenant_template:    dict[str, str]

    # Pipeline
    specialist_agent:     Optional[str] # module.ClassName of specialist agent
    skip_commercial_if_no_cim: bool
    key_risk_drivers:     list[str]

    # Output labels
    primary_metric:       str           # what the memo leads with
    primary_metric_label: str


LOAN_CONFIGS: dict[str, LoanTypeConfig] = {

    SENIOR_SECURED: LoanTypeConfig(
        loan_type            = SENIOR_SECURED,
        display_name         = "Senior Secured Direct Lending",
        description          = "First-lien term loan to PE-backed company. Standard mid-market structure.",
        max_leverage         = 6.5,
        min_dscr             = 1.5,
        min_interest_coverage = 2.0,
        auto_reject_risk_score = 75,
        typical_spread_bps   = 550,
        spread_range         = (475, 650),
        has_pik_option       = False,
        has_equity_kicker    = False,
        origination_fee_pct  = 2.0,
        typical_tenor_years  = 5,
        is_non_recourse      = False,
        is_subordinated      = False,
        is_revolving         = False,
        requires_sponsor     = True,
        call_protection      = "102 / 101 / par",
        amortization         = "1% per annum + cash flow sweep",
        covenant_type        = "maintenance",
        key_covenant_metrics = ["net_leverage", "interest_coverage", "min_liquidity"],
        covenant_template    = {
            "max_net_leverage":        "≤ [closing leverage + 0.5x]",
            "min_interest_coverage":   "≥ 2.0x",
            "min_liquidity":           "≥ $[X]M unrestricted cash",
            "capex_limit":             "≤ $[X]M per annum",
            "restricted_payments":     "No dividends unless leverage < [X]x",
        },
        specialist_agent     = None,
        skip_commercial_if_no_cim = True,
        key_risk_drivers     = ["leverage", "ebitda_quality", "sector_stress", "sponsor_track_record", "fcf_conversion"],
        primary_metric       = "leverage_multiple",
        primary_metric_label = "Net Debt / EBITDA",
    ),

    GROWTH_CAPITAL: LoanTypeConfig(
        loan_type            = GROWTH_CAPITAL,
        display_name         = "Growth Capital Lending",
        description          = "Senior or subordinated debt to founder/non-sponsored company seeking expansion capital.",
        max_leverage         = 5.0,
        min_dscr             = 1.75,
        min_interest_coverage = 2.5,
        auto_reject_risk_score = 70,
        typical_spread_bps   = 650,
        spread_range         = (575, 800),
        has_pik_option       = True,
        has_equity_kicker    = True,
        origination_fee_pct  = 2.5,
        typical_tenor_years  = 4,
        is_non_recourse      = False,
        is_subordinated      = False,
        is_revolving         = False,
        requires_sponsor     = False,
        call_protection      = "103 / 102 / 101 / par",
        amortization         = "2% per annum + cash flow sweep",
        covenant_type        = "maintenance",
        key_covenant_metrics = ["net_leverage", "revenue_growth", "min_liquidity", "management_quality"],
        covenant_template    = {
            "max_net_leverage":        "≤ [closing leverage + 0.25x] — tighter than sponsored",
            "min_revenue_growth":      "≥ [X]% YoY — growth covenant unique to this type",
            "min_interest_coverage":   "≥ 2.5x",
            "min_liquidity":           "≥ $[X]M (higher cushion — no sponsor backstop)",
            "key_man_clause":          "Loan callable if [founder name] departs without approved replacement",
            "equity_kicker":           "Warrants for [X]% of equity at [X]x MOIC",
        },
        specialist_agent     = "agents.growth_capital_analyst.GrowthCapitalAnalystAgent",
        skip_commercial_if_no_cim = False,
        key_risk_drivers     = ["management_quality", "growth_execution_risk", "no_sponsor_backstop", "key_man_risk", "runway_to_profitability"],
        primary_metric       = "revenue_growth",
        primary_metric_label = "Revenue Growth Rate",
    ),

    UNITRANCHE: LoanTypeConfig(
        loan_type            = UNITRANCHE,
        display_name         = "Unitranche",
        description          = "Single blended tranche covering senior + junior debt. May include first-out / last-out split.",
        max_leverage         = 7.0,
        min_dscr             = 1.25,
        min_interest_coverage = 1.75,
        auto_reject_risk_score = 78,
        typical_spread_bps   = 625,
        spread_range         = (550, 750),
        has_pik_option       = True,
        has_equity_kicker    = False,
        origination_fee_pct  = 2.0,
        typical_tenor_years  = 6,
        is_non_recourse      = False,
        is_subordinated      = False,
        is_revolving         = False,
        requires_sponsor     = True,
        call_protection      = "102 / 101 / par",
        amortization         = "1% per annum",
        covenant_type        = "maintenance",
        key_covenant_metrics = ["net_leverage", "interest_coverage", "min_liquidity", "first_out_coverage"],
        covenant_template    = {
            "max_net_leverage":        "≤ [closing leverage + 0.5x]",
            "min_interest_coverage":   "≥ 1.75x (lower — blended rate is higher)",
            "min_liquidity":           "≥ $[X]M",
            "first_out_test":          "First-out lenders can call at leverage > [X]x",
            "agreement_among_lenders": "First-out receives 100% principal before last-out recovers",
        },
        specialist_agent     = "agents.unitranche_analyst.UnitrancheAnalystAgent",
        skip_commercial_if_no_cim = True,
        key_risk_drivers     = ["blended_leverage", "first_last_out_split", "coverage_at_high_rate", "exit_multiple"],
        primary_metric       = "leverage_multiple",
        primary_metric_label = "Total Debt / EBITDA (Blended)",
    ),

    MEZZANINE: LoanTypeConfig(
        loan_type            = MEZZANINE,
        display_name         = "Mezzanine Finance",
        description          = "Subordinated debt below senior lender. PIK interest + equity warrants. Recovery depends on EV > senior debt.",
        max_leverage         = 8.0,
        min_dscr             = 1.0,
        min_interest_coverage = 1.25,
        auto_reject_risk_score = 82,
        typical_spread_bps   = 1100,
        spread_range         = (900, 1400),
        has_pik_option       = True,
        has_equity_kicker    = True,
        origination_fee_pct  = 3.0,
        typical_tenor_years  = 7,
        is_non_recourse      = False,
        is_subordinated      = True,
        is_revolving         = False,
        requires_sponsor     = True,
        call_protection      = "Make-whole (year 1-2), then 103/102/101/par",
        amortization         = "PIK — no cash amortization",
        covenant_type        = "incurrence",
        key_covenant_metrics = ["total_leverage", "ev_to_total_debt", "senior_coverage", "recovery_analysis"],
        covenant_template    = {
            "max_total_leverage":      "≤ [closing leverage + 1.0x] (incurrence test only)",
            "senior_leverage_cap":     "Senior debt may not exceed [X]x without mezz consent",
            "change_of_control":       "Put right at 101 on change of control",
            "equity_kicker":           "Warrants for [X]% fully diluted equity at [X]x strike",
            "pik_toggle":              "Interest payable PIK at [X]% or cash at [X]%",
        },
        specialist_agent     = "agents.mezzanine_analyst.MezzanineAnalystAgent",
        skip_commercial_if_no_cim = True,
        key_risk_drivers     = ["enterprise_value", "recovery_in_default", "subordination_risk", "pik_compounding", "exit_multiple"],
        primary_metric       = "ev_to_total_debt",
        primary_metric_label = "Enterprise Value / Total Debt",
    ),

    REVOLVER: LoanTypeConfig(
        loan_type            = REVOLVER,
        display_name         = "Revolving Credit Facility (ABL/RCF)",
        description          = "Revolving commitment sized against borrowing base (receivables + inventory). Funds drawn as needed.",
        max_leverage         = 5.5,
        min_dscr             = 1.5,
        min_interest_coverage = 2.0,
        auto_reject_risk_score = 72,
        typical_spread_bps   = 350,
        spread_range         = (250, 500),
        has_pik_option       = False,
        has_equity_kicker    = False,
        origination_fee_pct  = 1.5,
        typical_tenor_years  = 3,
        is_non_recourse      = False,
        is_subordinated      = False,
        is_revolving         = True,
        requires_sponsor     = False,
        call_protection      = "None (revolving)",
        amortization         = "Revolving — no amortization",
        covenant_type        = "borrowing_base",
        key_covenant_metrics = ["borrowing_base_utilization", "eligible_receivables", "dso", "inventory_turnover"],
        covenant_template    = {
            "borrowing_base":          "[80]% eligible receivables + [50]% eligible inventory",
            "springing_leverage":      "Leverage test only when >35% drawn — ≤ [X]x",
            "min_availability":        "Must maintain ≥ $[X]M undrawn capacity at all times",
            "monthly_bbc":             "Borrowing base certificate delivered within 15 days of month-end",
            "field_exam":              "Annual collateral field exam by fund",
            "concentration_limit":     "No single debtor > [X]% of eligible receivables",
        },
        specialist_agent     = "agents.borrowing_base_analyst.BorrowingBaseAnalystAgent",
        skip_commercial_if_no_cim = False,
        key_risk_drivers     = ["receivables_quality", "dso_trend", "inventory_liquidation_value", "customer_concentration", "seasonal_draws"],
        primary_metric       = "borrowing_base_coverage",
        primary_metric_label = "Borrowing Base Coverage",
    ),

    BRIDGE: LoanTypeConfig(
        loan_type            = BRIDGE,
        display_name         = "Bridge Loan",
        description          = "Short-term financing (6–18 months) pending permanent capital raise or transaction close.",
        max_leverage         = 7.0,
        min_dscr             = 1.0,
        min_interest_coverage = 1.5,
        auto_reject_risk_score = 80,
        typical_spread_bps   = 800,
        spread_range         = (650, 1000),
        has_pik_option       = True,
        has_equity_kicker    = False,
        origination_fee_pct  = 2.5,
        typical_tenor_years  = 1,
        is_non_recourse      = False,
        is_subordinated      = False,
        is_revolving         = False,
        requires_sponsor     = False,
        call_protection      = "1% break fee if repaid before 6 months",
        amortization         = "Bullet — no amortization (bridge structure)",
        covenant_type        = "incurrence",
        key_covenant_metrics = ["exit_certainty", "interim_liquidity", "leverage"],
        covenant_template    = {
            "maturity_date":           "12 months (6-month extension option at +100bps)",
            "mandatory_prepayment":    "100% of net proceeds from permanent financing",
            "break_fee":               "1.0% if repaid within 6 months",
            "extension_option":        "One 6-month extension at borrower's option, spread + 100bps",
            "exit_milestones":         "Must demonstrate active process for permanent financing by month 3",
        },
        specialist_agent     = "agents.bridge_exit_analyst.BridgeExitAnalystAgent",
        skip_commercial_if_no_cim = False,
        key_risk_drivers     = ["exit_certainty", "permanent_financing_market", "interim_cash_flow", "refinancing_risk"],
        primary_metric       = "exit_certainty_score",
        primary_metric_label = "Exit Certainty Score",
    ),

    DISTRESSED: LoanTypeConfig(
        loan_type            = DISTRESSED,
        display_name         = "Distressed / Special Situations",
        description          = "Lending to financially stressed companies. Forensic analysis, recovery waterfall, restructuring path.",
        max_leverage         = 10.0,
        min_dscr             = 0.8,
        min_interest_coverage = 1.0,
        auto_reject_risk_score = 95,
        typical_spread_bps   = 1400,
        spread_range         = (1000, 2000),
        has_pik_option       = True,
        has_equity_kicker    = True,
        origination_fee_pct  = 4.0,
        typical_tenor_years  = 2,
        is_non_recourse      = False,
        is_subordinated      = False,
        is_revolving         = False,
        requires_sponsor     = False,
        call_protection      = "Make-whole",
        amortization         = "Cash sweep if available",
        covenant_type        = "none",
        key_covenant_metrics = ["recovery_rate", "enterprise_value", "existing_debt_stack", "restructuring_path"],
        covenant_template    = {
            "milestones":              "Operational milestones — EBITDA recovery targets quarterly",
            "cash_dominion":           "Fund controls cash — all receipts deposited to blocked account",
            "management_change":       "Right to replace CEO/CFO if EBITDA misses by >20%",
            "restructuring_support":   "Borrower must cooperate with any out-of-court restructuring",
            "equity_conversion":       "Right to convert to equity at par if default continues >90 days",
        },
        specialist_agent     = "agents.distressed_analyst.DistressedAnalystAgent",
        skip_commercial_if_no_cim = False,
        key_risk_drivers     = ["recovery_rate", "asset_coverage", "management_credibility", "restructuring_viability", "existing_creditor_dynamics"],
        primary_metric       = "recovery_rate",
        primary_metric_label = "Estimated Recovery Rate",
    ),

    PROJECT_FINANCE: LoanTypeConfig(
        loan_type            = PROJECT_FINANCE,
        display_name         = "Infrastructure / Project Finance",
        description          = "Non-recourse debt to an SPV against contracted project cash flows. DSCR-based, staged disbursement.",
        max_leverage         = 8.0,
        min_dscr             = 1.3,
        min_interest_coverage = 1.3,
        auto_reject_risk_score = 72,
        typical_spread_bps   = 250,
        spread_range         = (175, 375),
        has_pik_option       = False,
        has_equity_kicker    = False,
        origination_fee_pct  = 1.5,
        typical_tenor_years  = 15,
        is_non_recourse      = True,
        is_subordinated      = False,
        is_revolving         = False,
        requires_sponsor     = False,
        call_protection      = "Make-whole (matches project tenor)",
        amortization         = "Sculpted to cash flow — target DSCR 1.3x minimum",
        covenant_type        = "project",
        key_covenant_metrics = ["project_dscr", "offtake_certainty", "construction_completion", "reserve_accounts"],
        covenant_template    = {
            "min_dscr":                "≥ 1.30x on a rolling 12-month basis",
            "debt_service_reserve":    "6 months debt service in blocked reserve account",
            "construction_reserve":    "Funded at financial close, released against milestones",
            "offtake_requirement":     "≥ [X]% of capacity under contracted offtake agreement",
            "construction_completion": "Target date + 6-month grace period",
            "insurance_proceeds":      "All insurance paid to fund-controlled account",
            "restricted_distributions": "No distributions unless DSCR ≥ 1.20x and reserves funded",
        },
        specialist_agent     = "agents.project_finance_analyst.ProjectFinanceAnalystAgent",
        skip_commercial_if_no_cim = False,
        key_risk_drivers     = ["offtake_certainty", "construction_risk", "dscr_base_case", "technology_risk", "regulatory_risk", "counterparty_credit"],
        primary_metric       = "project_dscr",
        primary_metric_label = "Project DSCR",
    ),
}


def get_config(loan_type: str) -> LoanTypeConfig:
    """Get config for a loan type. Falls back to senior_secured if unknown."""
    canonical = normalize_loan_type(loan_type)
    return LOAN_CONFIGS.get(canonical, LOAN_CONFIGS[SENIOR_SECURED])
