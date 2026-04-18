"""
CreditMind Credit Policy Enforcement Engine.
Owner: Peter

Loads credit_policy.json and enforces it programmatically at three points:
  1. Pre-screening — before DD starts (hard blocks + warnings)
  2. Pre-IC — after DD, before IC committee (flag policy breaches)
  3. Portfolio monitoring — watch list triggers on existing deals

All public functions return PolicyResult objects so callers can decide
whether to block, warn, or escalate without parsing raw strings.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


# ── Load policy document once at import ─────────────────────────────────────

_POLICY_PATH = Path(__file__).parent.parent / "data" / "credit_policy.json"

try:
    with open(_POLICY_PATH) as f:
        POLICY: dict = json.load(f)
except Exception:
    POLICY = {}


# ── Result types ─────────────────────────────────────────────────────────────

@dataclass
class PolicyViolation:
    rule:        str
    description: str
    severity:    str   # "HARD_BLOCK" | "ESCALATION_REQUIRED" | "WARNING"
    section:     str   # which policy section triggered this


@dataclass
class PolicyResult:
    compliant:       bool
    hard_blocks:     list[PolicyViolation] = field(default_factory=list)
    escalations:     list[PolicyViolation] = field(default_factory=list)
    warnings:        list[PolicyViolation] = field(default_factory=list)
    approval_level:  str                   = "IC — Simple Majority"
    watch_list:      bool                  = False
    watch_triggers:  list[str]             = field(default_factory=list)
    policy_summary:  str                   = ""

    @property
    def can_proceed(self) -> bool:
        return len(self.hard_blocks) == 0

    def to_dict(self) -> dict:
        return {
            "compliant":       self.compliant,
            "can_proceed":     self.can_proceed,
            "hard_blocks":     [{"rule": v.rule, "description": v.description, "severity": v.severity, "section": v.section} for v in self.hard_blocks],
            "escalations":     [{"rule": v.rule, "description": v.description, "severity": v.severity, "section": v.section} for v in self.escalations],
            "warnings":        [{"rule": v.rule, "description": v.description, "severity": v.severity, "section": v.section} for v in self.warnings],
            "approval_level":  self.approval_level,
            "watch_list":      self.watch_list,
            "watch_triggers":  self.watch_triggers,
            "policy_summary":  self.policy_summary,
        }


# ── Main entry points ─────────────────────────────────────────────────────────

def check_new_deal(deal: dict, portfolio: dict[str, dict], fund_size: float = 1_000_000_000) -> PolicyResult:
    """
    Full policy check for a new deal before DD or IC.
    Checks: prohibited investments, loan parameters, concentration limits, approval authority.

    Args:
        deal: deal dict (from credit_state or teaser). Must have: company, sector, loan_type,
              loan_amount, leverage (optional), internal_rating (optional), sponsor (optional).
        portfolio: current _portfolio dict.
        fund_size: committed fund size in USD. Default $1B.
    """
    result = PolicyResult(compliant=True)
    violations: list[PolicyViolation] = []

    company     = deal.get("company", "")
    sector      = deal.get("sector", "")
    sponsor     = deal.get("sponsor", "")
    loan_amount = float(deal.get("loan_amount", 0))
    loan_type   = deal.get("loan_type_canonical") or deal.get("loan_type", "senior_secured")
    leverage    = float(deal.get("leverage") or deal.get("credit_model", {}).get("leverage_multiple") or 0)
    rating      = deal.get("internal_rating") or deal.get("current_rating", "B+")
    risk_score  = float(deal.get("risk_score") or deal.get("live_risk_score") or 0)
    is_sponsored = bool(sponsor)

    # 1. Prohibited investments
    violations += _check_prohibited(company, sector, deal)

    # 2. Loan parameter limits
    violations += _check_loan_parameters(loan_type, loan_amount, leverage, rating)

    # 3. Concentration limits
    violations += _check_concentration(sector, sponsor, loan_amount, portfolio, fund_size, is_sponsored)

    # 4. Non-sponsored limit
    if not is_sponsored:
        violations += _check_non_sponsored_limit(loan_amount, portfolio, fund_size)

    # 5. Geographic check (basic — flag if non-US)
    country = deal.get("country", "US")
    if country and country.upper() not in ("US", "USA", "UNITED STATES", ""):
        violations.append(PolicyViolation(
            rule="geographic_restriction",
            description=f"Borrower country '{country}' is non-US. Requires unanimous IC approval.",
            severity="ESCALATION_REQUIRED",
            section="fund_mandate",
        ))

    # Bucket violations
    for v in violations:
        if v.severity == "HARD_BLOCK":
            result.hard_blocks.append(v)
        elif v.severity == "ESCALATION_REQUIRED":
            result.escalations.append(v)
        else:
            result.warnings.append(v)

    result.compliant      = len(result.hard_blocks) == 0 and len(result.escalations) == 0
    result.approval_level = get_approval_level(loan_amount, escalations=result.escalations)
    result.watch_list     = risk_score >= 65
    if result.watch_list:
        result.watch_triggers.append(f"Risk score {risk_score:.0f} ≥ 65 threshold")

    _set_policy_summary(result, company, loan_amount, loan_type)
    return result


def check_existing_deal(deal: dict) -> PolicyResult:
    """
    Watch list and escalation checks for a deal already in the portfolio.
    Called by monitoring agents to determine if a deal needs escalation.
    """
    result = PolicyResult(compliant=True)
    triggers: list[str] = []

    company       = deal.get("company", "Unknown")
    risk_score    = float(deal.get("risk_score") or deal.get("live_risk_score") or 0)
    leverage      = float(deal.get("credit_model", {}).get("leverage_multiple") or 0)
    closing_lev   = float(deal.get("closing_leverage") or leverage or 0)
    dscr          = float(deal.get("credit_model", {}).get("dscr") or 0)
    loan_type     = deal.get("loan_type_canonical", "senior_secured")
    alerts        = deal.get("human_alerts", [])
    has_breach    = any(a.get("trigger", "").lower().find("covenant") >= 0 for a in alerts)
    sector_score  = float(deal.get("sector_stress_score") or 0)

    cfg_params    = POLICY.get("loan_parameters", {}).get(loan_type, {})
    min_dscr      = float(cfg_params.get("min_dscr", 1.5))

    if risk_score >= 65:
        triggers.append(f"Risk score {risk_score:.0f} ≥ 65")
    if closing_lev and leverage > closing_lev + 1.0:
        triggers.append(f"Leverage {leverage:.1f}x exceeds closing leverage {closing_lev:.1f}x + 1.0x")
    if dscr and dscr < min_dscr - 0.25:
        triggers.append(f"DSCR {dscr:.2f}x below minimum {min_dscr:.2f}x - 0.25x")
    if has_breach:
        triggers.append("Covenant breach detected in alerts")
        result.escalations.append(PolicyViolation(
            rule="covenant_breach_escalation",
            description="Covenant breach requires IC notification within 2 business days",
            severity="ESCALATION_REQUIRED",
            section="watch_list_criteria",
        ))
    if sector_score >= 70:
        triggers.append(f"Sector stress score {sector_score:.0f} ≥ 70")

    result.watch_list    = len(triggers) > 0
    result.watch_triggers = triggers
    result.compliant     = not result.watch_list
    result.policy_summary = (
        f"{company}: {'WATCH LIST — ' + '; '.join(triggers) if triggers else 'Compliant — no watch list triggers'}"
    )
    return result


def get_approval_level(loan_amount: float, escalations: list[PolicyViolation] = None) -> str:
    """Return the approval authority level required for a given loan amount and escalation flags."""
    escalations = escalations or []
    has_escalation = len(escalations) > 0

    if loan_amount <= 25_000_000 and not has_escalation:
        return "VP / Director (with MD co-sign)"
    elif loan_amount <= 75_000_000 and not has_escalation:
        return "Managing Director"
    elif loan_amount <= 200_000_000 and not has_escalation:
        return "IC — Simple Majority (3 of 5)"
    elif loan_amount <= 350_000_000 and not has_escalation:
        return "IC — Supermajority (4 of 5)"
    elif has_escalation:
        return "IC — Supermajority (4 of 5) — policy exception required"
    else:
        return "IC — Unanimous (5 of 5)"


def get_policy_context_for_agents() -> str:
    """
    Return a concise policy summary string for injection into agent system prompts.
    Agents use this to ensure their recommendations stay within policy bounds.
    """
    if not POLICY:
        return "Credit policy not loaded."

    params  = POLICY.get("loan_parameters", {})
    conc    = POLICY.get("concentration_limits", {})
    ratings = POLICY.get("risk_rating_scale", {}).get("ratings", [])
    mandate = POLICY.get("fund_mandate", {})

    lines = [
        "=== CREDITMIND CREDIT POLICY — BINDING CONSTRAINTS ===",
        "",
        f"Fund: {POLICY.get('_meta', {}).get('document', 'CreditMind Capital Fund I')}",
        f"Strategy: {mandate.get('strategy', 'Senior secured direct lending, US middle market')}",
        "",
        "LOAN SIZE LIMITS:",
    ]
    for lt, cfg in params.items():
        min_s = cfg.get("min_loan_size") or cfg.get("min_facility_size", 0)
        max_s = cfg.get("max_loan_size") or cfg.get("max_facility_size", 0)
        if min_s and max_s:
            lines.append(f"  {lt}: ${min_s/1e6:.0f}M – ${max_s/1e6:.0f}M")

    lines += [
        "",
        "LEVERAGE LIMITS (max Net Debt/EBITDA):",
    ]
    for lt, cfg in params.items():
        lev = cfg.get("max_leverage") or cfg.get("max_total_leverage")
        if lev:
            lines.append(f"  {lt}: {lev:.1f}x")

    lines += [
        "",
        "CONCENTRATION LIMITS:",
        f"  Single borrower: {conc.get('single_borrower', {}).get('limit_pct', 8)}% of NAV",
        f"  Single sector:   {conc.get('single_sector', {}).get('limit_pct', 20)}% of NAV",
        f"  Single sponsor:  {conc.get('single_sponsor', {}).get('limit_pct', 15)}% of NAV",
        f"  Non-sponsored:   {conc.get('non_sponsored', {}).get('limit_pct', 20)}% of NAV (total)",
        "",
        "PROHIBITED: Cannabis, payday lending, adult entertainment, tobacco, coal mining,",
        "  private prisons, companies under active SEC/DOJ investigation, OFAC sanctioned entities.",
        "",
        "MINIMUM RATING: B- for senior/unitranche/bridge. B for growth capital. CCC+ for mezz/distressed.",
        "",
        "WATCH LIST TRIGGERS: Risk score ≥ 65, leverage > closing + 1x, DSCR below min - 0.25x,",
        "  any covenant breach, CEO/CFO departure, sector stress ≥ 70.",
        "",
        "Your recommendations MUST stay within these parameters.",
        "If a deal requires a policy exception, state it explicitly and flag for IC waiver.",
        "=== END POLICY SUMMARY ===",
    ]
    return "\n".join(lines)


def summarize_portfolio_vs_policy(portfolio: dict[str, dict], fund_size: float = 1_000_000_000) -> dict:
    """
    Generate a portfolio-level policy compliance dashboard.
    Used by the monitoring page and IC committee.
    """
    if not portfolio:
        return {"status": "empty", "deals": 0}

    total_deployed  = sum(d.get("loan_amount", 0) for d in portfolio.values())
    sector_totals: dict[str, float] = {}
    sponsor_totals: dict[str, float] = {}
    non_sponsored_total = 0.0
    pik_total = 0.0
    distressed_total = 0.0
    watch_list_deals = []

    conc = POLICY.get("concentration_limits", {})

    for deal in portfolio.values():
        amt      = float(deal.get("loan_amount", 0))
        sector   = deal.get("sector", "Unknown")
        sponsor  = deal.get("sponsor", "")
        lt       = deal.get("loan_type_canonical") or deal.get("loan_type", "senior_secured")
        rs       = float(deal.get("risk_score") or deal.get("live_risk_score") or 0)

        sector_totals[sector]    = sector_totals.get(sector, 0) + amt
        if sponsor:
            sponsor_totals[sponsor] = sponsor_totals.get(sponsor, 0) + amt
        else:
            non_sponsored_total += amt
        if lt in ("mezzanine", "bridge", "distressed"):
            pik_total += amt
        if lt == "distressed":
            distressed_total += amt
        if rs >= 65:
            watch_list_deals.append(deal.get("company", deal.get("deal_id", "Unknown")))

    nav = fund_size

    def _pct(amt):
        return round(amt / nav * 100, 1) if nav else 0

    breaches = []
    warnings_list = []

    # Check sector concentration
    sector_limit = conc.get("single_sector", {}).get("limit_pct", 20)
    sector_hard  = conc.get("single_sector", {}).get("hard_limit_pct", 25)
    for s, amt in sector_totals.items():
        pct = _pct(amt)
        if pct >= sector_hard:
            breaches.append(f"HARD BREACH: {s} sector at {pct}% (hard limit {sector_hard}%)")
        elif pct >= sector_limit:
            warnings_list.append(f"WARNING: {s} sector at {pct}% (soft limit {sector_limit}%)")

    # Check sponsor concentration
    sponsor_limit = conc.get("single_sponsor", {}).get("limit_pct", 15)
    for sp, amt in sponsor_totals.items():
        pct = _pct(amt)
        if pct >= sponsor_limit:
            warnings_list.append(f"WARNING: {sp} sponsor at {pct}% (limit {sponsor_limit}%)")

    # Check non-sponsored
    ns_limit = conc.get("non_sponsored", {}).get("limit_pct", 20)
    ns_pct   = _pct(non_sponsored_total)
    if ns_pct >= ns_limit:
        warnings_list.append(f"WARNING: Non-sponsored deals at {ns_pct}% (limit {ns_limit}%)")

    # Check distressed
    dist_limit = conc.get("distressed_special_sit", {}).get("limit_pct", 10)
    dist_pct   = _pct(distressed_total)
    if dist_pct >= dist_limit:
        warnings_list.append(f"WARNING: Distressed at {dist_pct}% (limit {dist_limit}%)")

    return {
        "status":                "BREACH" if breaches else ("WARNING" if warnings_list else "COMPLIANT"),
        "total_deals":           len(portfolio),
        "total_deployed_usd":    total_deployed,
        "deployment_pct":        _pct(total_deployed),
        "sector_concentration":  {s: {"usd": amt, "pct_nav": _pct(amt)} for s, amt in sector_totals.items()},
        "sponsor_concentration": {sp: {"usd": amt, "pct_nav": _pct(amt)} for sp, amt in sponsor_totals.items()},
        "non_sponsored_pct":     ns_pct,
        "distressed_pct":        dist_pct,
        "watch_list_deals":      watch_list_deals,
        "watch_list_count":      len(watch_list_deals),
        "policy_breaches":       breaches,
        "policy_warnings":       warnings_list,
    }


# ── Private helpers ───────────────────────────────────────────────────────────

def _check_prohibited(company: str, sector: str, deal: dict) -> list[PolicyViolation]:
    violations = []
    prohibited = POLICY.get("prohibited_investments", {})

    prohibited_sectors = [s.lower() for s in prohibited.get("sectors", [])]
    sector_lower       = sector.lower()
    company_lower      = company.lower()

    # Sector hard blocks
    _SECTOR_KEYWORDS = {
        "cannabis":       ["cannabis", "marijuana", "weed", "dispensary"],
        "payday":         ["payday", "predatory", "check cashing"],
        "adult":          ["adult entertainment", "pornography", "strip club"],
        "tobacco":        ["tobacco", "cigarette", "vaping", "e-cigarette manufacturer"],
        "coal":           ["coal mining", "coal-fired", "thermal coal"],
        "prison":         ["private prison", "correctional facility", "detention center"],
        "weapons_banned": ["landmine", "cluster munition"],
        "mlm":            ["multi-level marketing", "pyramid scheme", "mlm"],
    }

    for category, keywords in _SECTOR_KEYWORDS.items():
        if any(kw in sector_lower or kw in company_lower for kw in keywords):
            violations.append(PolicyViolation(
                rule=f"prohibited_sector_{category}",
                description=f"'{sector}' / '{company}' matches prohibited investment category: {category}. Fund policy prohibits this investment.",
                severity="HARD_BLOCK",
                section="prohibited_investments",
            ))

    return violations


def _check_loan_parameters(loan_type: str, loan_amount: float, leverage: float, rating: str) -> list[PolicyViolation]:
    violations = []
    params = POLICY.get("loan_parameters", {})

    # Normalize loan_type to policy key
    lt_map = {
        "senior_secured": "senior_secured",
        "growth_capital": "growth_capital",
        "unitranche":     "unitranche",
        "mezzanine":      "mezzanine",
        "revolver":       "revolver",
        "bridge":         "bridge",
        "distressed":     "distressed",
        "project_finance": None,  # not in policy — hard block
    }

    policy_key = lt_map.get(loan_type)

    if policy_key is None:
        violations.append(PolicyViolation(
            rule="prohibited_instrument_project_finance",
            description="Project finance is a prohibited instrument under Fund I mandate. Requires separate infrastructure fund mandate.",
            severity="HARD_BLOCK",
            section="fund_mandate",
        ))
        return violations

    cfg = params.get(policy_key, {})
    if not cfg:
        return violations

    # Loan size
    min_size = cfg.get("min_loan_size") or cfg.get("min_facility_size", 0)
    max_size = cfg.get("max_loan_size") or cfg.get("max_facility_size", float("inf"))

    if loan_amount < min_size:
        violations.append(PolicyViolation(
            rule="loan_size_below_minimum",
            description=f"Loan amount ${loan_amount/1e6:.1f}M is below policy minimum ${min_size/1e6:.0f}M for {policy_key}.",
            severity="WARNING",
            section="loan_parameters",
        ))
    if loan_amount > max_size:
        violations.append(PolicyViolation(
            rule="loan_size_exceeds_maximum",
            description=f"Loan amount ${loan_amount/1e6:.1f}M exceeds policy maximum ${max_size/1e6:.0f}M for {policy_key}.",
            severity="ESCALATION_REQUIRED",
            section="loan_parameters",
        ))

    # Leverage
    max_lev = cfg.get("max_leverage") or cfg.get("max_total_leverage", 0)
    if max_lev and leverage and leverage > max_lev:
        severity = "HARD_BLOCK" if leverage > max_lev + 1.0 else "ESCALATION_REQUIRED"
        violations.append(PolicyViolation(
            rule="leverage_exceeds_maximum",
            description=f"Leverage {leverage:.1f}x exceeds policy maximum {max_lev:.1f}x for {policy_key}. {'Exceeds hard limit.' if severity == 'HARD_BLOCK' else 'IC waiver required.'}",
            severity=severity,
            section="loan_parameters",
        ))

    # Rating floor
    min_rating = cfg.get("min_internal_rating", "B-")
    if rating and not _rating_meets_minimum(rating, min_rating):
        violations.append(PolicyViolation(
            rule="rating_below_floor",
            description=f"Internal rating '{rating}' is below policy floor '{min_rating}' for {policy_key}.",
            severity="ESCALATION_REQUIRED",
            section="loan_parameters",
        ))

    return violations


def _check_concentration(
    sector: str, sponsor: str, loan_amount: float,
    portfolio: dict[str, dict], fund_size: float, is_sponsored: bool
) -> list[PolicyViolation]:
    violations = []
    conc = POLICY.get("concentration_limits", {})
    if not fund_size:
        return violations

    # Current sector exposure
    sector_total = sum(
        float(d.get("loan_amount", 0))
        for d in portfolio.values()
        if d.get("sector", "") == sector
    )
    sector_pct     = (sector_total + loan_amount) / fund_size * 100
    sector_limit   = conc.get("single_sector", {}).get("limit_pct", 20)
    sector_hard    = conc.get("single_sector", {}).get("hard_limit_pct", 25)

    if sector_pct >= sector_hard:
        violations.append(PolicyViolation(
            rule="sector_concentration_hard_breach",
            description=f"Adding this deal brings {sector} sector to {sector_pct:.1f}% of NAV — exceeds hard limit of {sector_hard}%. Requires unanimous IC.",
            severity="ESCALATION_REQUIRED",
            section="concentration_limits",
        ))
    elif sector_pct >= sector_limit:
        violations.append(PolicyViolation(
            rule="sector_concentration_soft_breach",
            description=f"Adding this deal brings {sector} sector to {sector_pct:.1f}% of NAV — exceeds soft limit of {sector_limit}%. IC approval required.",
            severity="ESCALATION_REQUIRED",
            section="concentration_limits",
        ))

    # Sponsor concentration
    if sponsor:
        sponsor_total = sum(
            float(d.get("loan_amount", 0))
            for d in portfolio.values()
            if d.get("sponsor", "") == sponsor
        )
        sponsor_pct   = (sponsor_total + loan_amount) / fund_size * 100
        sponsor_limit = conc.get("single_sponsor", {}).get("limit_pct", 15)

        if sponsor_pct >= sponsor_limit:
            violations.append(PolicyViolation(
                rule="sponsor_concentration_breach",
                description=f"Adding this deal brings {sponsor} sponsor exposure to {sponsor_pct:.1f}% of NAV — exceeds limit of {sponsor_limit}%.",
                severity="ESCALATION_REQUIRED",
                section="concentration_limits",
            ))

    # Single borrower
    borrower_pct   = loan_amount / fund_size * 100
    borrower_limit = conc.get("single_borrower", {}).get("limit_pct", 8)
    borrower_hard  = conc.get("single_borrower", {}).get("hard_limit_pct", 10)

    if borrower_pct >= borrower_hard:
        violations.append(PolicyViolation(
            rule="single_borrower_hard_breach",
            description=f"Loan of ${loan_amount/1e6:.0f}M is {borrower_pct:.1f}% of NAV — exceeds hard limit of {borrower_hard}%. Requires unanimous IC.",
            severity="ESCALATION_REQUIRED",
            section="concentration_limits",
        ))
    elif borrower_pct >= borrower_limit:
        violations.append(PolicyViolation(
            rule="single_borrower_soft_breach",
            description=f"Loan of ${loan_amount/1e6:.0f}M is {borrower_pct:.1f}% of NAV — exceeds soft limit of {borrower_limit}%. IC approval required.",
            severity="WARNING",
            section="concentration_limits",
        ))

    return violations


def _check_non_sponsored_limit(loan_amount: float, portfolio: dict[str, dict], fund_size: float) -> list[PolicyViolation]:
    conc = POLICY.get("concentration_limits", {})
    ns_limit = conc.get("non_sponsored", {}).get("limit_pct", 20)
    ns_total = sum(
        float(d.get("loan_amount", 0))
        for d in portfolio.values()
        if not d.get("sponsor")
    )
    ns_pct = (ns_total + loan_amount) / fund_size * 100
    if ns_pct >= ns_limit:
        return [PolicyViolation(
            rule="non_sponsored_limit_breach",
            description=f"Non-sponsored deals would reach {ns_pct:.1f}% of NAV — exceeds {ns_limit}% policy limit. IC approval required.",
            severity="ESCALATION_REQUIRED",
            section="concentration_limits",
        )]
    return []


_RATING_ORDER = ["D", "C-", "C", "C+", "B-", "B", "B+", "A-", "A"]


def _rating_meets_minimum(rating: str, minimum: str) -> bool:
    """Return True if rating >= minimum in credit quality."""
    try:
        return _RATING_ORDER.index(rating) >= _RATING_ORDER.index(minimum)
    except ValueError:
        return True  # unknown rating — don't block


def _set_policy_summary(result: PolicyResult, company: str, loan_amount: float, loan_type: str):
    parts = []
    if result.hard_blocks:
        parts.append(f"BLOCKED ({len(result.hard_blocks)} hard violations)")
    elif result.escalations:
        parts.append(f"ESCALATION REQUIRED ({len(result.escalations)} issues)")
    elif result.warnings:
        parts.append(f"WARNINGS ({len(result.warnings)} items)")
    else:
        parts.append("COMPLIANT")

    parts.append(f"Approval: {result.approval_level}")
    if result.watch_list:
        parts.append(f"Watch list triggers: {'; '.join(result.watch_triggers)}")

    result.policy_summary = f"{company} ${loan_amount/1e6:.0f}M {loan_type} — " + " | ".join(parts)
