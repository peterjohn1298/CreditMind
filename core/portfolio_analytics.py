"""
Portfolio Analytics — pure aggregation over the in-memory portfolio.

Three analyses surfaced via /api/portfolio/* endpoints (Wave 3):
  - vintage_cohorts:    deals grouped by origination year, with performance drift
  - cross_correlation:  pairs of borrowers exposed to the same sector / sponsor /
                        contagion theme — answers "who else stresses if X stresses?"
  - sponsor_behavior:   per-sponsor leaderboard — health, exposure, problem-rate

No AI agent. No external API. All computed from the existing portfolio dict.
"""

from __future__ import annotations
from collections import defaultdict
from datetime import datetime
from typing import Iterable


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _vintage_year(deal: dict) -> int | None:
    raw = deal.get("disbursement_date") or deal.get("origination_date")
    if not raw:
        return None
    try:
        # Accepts both "YYYY-MM-DD" and full ISO timestamps
        return datetime.fromisoformat(str(raw).replace("Z", "")).year
    except Exception:
        try:
            return int(str(raw)[:4])
        except Exception:
            return None


def _is_distressed(deal: dict) -> bool:
    return deal.get("status") in ("watchlist", "stressed")


def _is_stressed(deal: dict) -> bool:
    return deal.get("status") == "stressed"


# ---------------------------------------------------------------------------
# Vintage cohort analysis
# ---------------------------------------------------------------------------

def vintage_cohorts(portfolio: dict[str, dict]) -> dict:
    """
    Group portfolio by origination year. For each cohort:
      - count, total exposure, average loan size
      - average risk score at origination vs current live score (drift)
      - watchlist + stressed count
      - sector mix (top 3)

    The drift between cohorts is the headline insight: 2021/22/23 vintages were
    underwritten in different macro regimes (low rates, soft underwriting), so
    they often look weaker today than 2024/25 cohorts.
    """
    cohorts: dict[int, list[dict]] = defaultdict(list)
    unknown: list[dict] = []

    for deal in portfolio.values():
        year = _vintage_year(deal)
        if year is None:
            unknown.append(deal)
        else:
            cohorts[year].append(deal)

    rows = []
    for year in sorted(cohorts.keys()):
        deals = cohorts[year]
        exposure        = sum(float(d.get("loan_amount", 0)) for d in deals)
        avg_loan        = exposure / len(deals) if deals else 0
        avg_orig_risk   = (
            sum(float(d.get("risk_score", 0)) for d in deals) / len(deals)
            if deals else 0
        )
        avg_live_risk   = (
            sum(float(d.get("live_risk_score") or d.get("risk_score", 0)) for d in deals)
            / len(deals) if deals else 0
        )
        risk_drift      = avg_live_risk - avg_orig_risk
        watchlist       = sum(1 for d in deals if d.get("status") == "watchlist")
        stressed        = sum(1 for d in deals if d.get("status") == "stressed")

        sector_counts: dict[str, int] = defaultdict(int)
        for d in deals:
            sector_counts[d.get("sector", "Unknown")] += 1
        top_sectors = sorted(sector_counts.items(), key=lambda kv: kv[1], reverse=True)[:3]

        rows.append({
            "vintage":            year,
            "deal_count":         len(deals),
            "total_exposure_usd": exposure,
            "avg_loan_size_usd":  avg_loan,
            "avg_origination_risk_score": round(avg_orig_risk, 1),
            "avg_live_risk_score":        round(avg_live_risk, 1),
            "risk_drift":         round(risk_drift, 1),
            "watchlist_count":    watchlist,
            "stressed_count":     stressed,
            "problem_rate_pct":   round(((watchlist + stressed) / len(deals)) * 100, 1) if deals else 0,
            "top_sectors":        [{"sector": s, "count": n} for s, n in top_sectors],
        })

    return {
        "vintages":             rows,
        "unknown_vintage_count": len(unknown),
        "summary": (
            f"{len(rows)} vintage cohorts. "
            f"Highest problem rate: {max((r['problem_rate_pct'] for r in rows), default=0)}% "
            f"in {rows[max(range(len(rows)), key=lambda i: rows[i]['problem_rate_pct'])]['vintage'] if rows else 'n/a'}."
        ),
    }


# ---------------------------------------------------------------------------
# Cross-portfolio correlation — "who else stresses if X stresses?"
# ---------------------------------------------------------------------------

def cross_correlation(portfolio: dict[str, dict], focus_deal_id: str | None = None) -> dict:
    """
    For each deal, list peers that share a stress vector. Three vectors:
      1. SECTOR — same sector_id / sector
      2. SPONSOR — same PE sponsor (relevant for sponsor-default contagion)
      3. CONTAGION — listed as a contagion target on each other (from
         contagion_flags already stored on each deal)

    The output is per-deal: each focus deal lists its top-N peers with
    pairwise overlap scores.
    """
    deals = list(portfolio.values())
    by_id: dict[str, dict] = {d["deal_id"]: d for d in deals if d.get("deal_id")}

    def _peer_overlap(a: dict, b: dict) -> tuple[float, list[str]]:
        overlap_score = 0.0
        reasons: list[str] = []

        if a.get("sector") and a.get("sector") == b.get("sector"):
            overlap_score += 0.5
            reasons.append("same sector")
        if a.get("sponsor") and a.get("sponsor") == b.get("sponsor") and a["sponsor"]:
            overlap_score += 0.4
            reasons.append("same sponsor")
        # contagion overlap — does B appear in A's contagion_flags?
        cf_a = a.get("contagion_flags") or []
        if any((cf.get("deal_id") == b.get("deal_id")) for cf in cf_a):
            overlap_score += 0.4
            reasons.append("named contagion target")
        if a.get("industry") and a.get("industry") == b.get("industry"):
            overlap_score += 0.1
            reasons.append("same industry")

        return overlap_score, reasons

    def _focus_row(focus: dict) -> dict:
        peers = []
        for other in deals:
            if other.get("deal_id") == focus.get("deal_id"):
                continue
            score, reasons = _peer_overlap(focus, other)
            if score > 0:
                peers.append({
                    "peer_deal_id":  other.get("deal_id"),
                    "peer_company":  other.get("company"),
                    "peer_sector":   other.get("sector"),
                    "peer_sponsor":  other.get("sponsor"),
                    "peer_status":   other.get("status"),
                    "peer_risk_score": other.get("live_risk_score") or other.get("risk_score"),
                    "peer_loan_amount": other.get("loan_amount"),
                    "overlap_score": round(score, 2),
                    "reasons":       reasons,
                })
        peers.sort(key=lambda p: p["overlap_score"], reverse=True)
        return {
            "focus_deal_id":  focus.get("deal_id"),
            "focus_company":  focus.get("company"),
            "focus_sector":   focus.get("sector"),
            "focus_sponsor":  focus.get("sponsor"),
            "focus_status":   focus.get("status"),
            "peers":          peers[:10],
            "total_correlated_exposure_usd": sum(
                float(p["peer_loan_amount"] or 0) for p in peers if (p["peer_loan_amount"] or 0)
            ),
        }

    if focus_deal_id and focus_deal_id in by_id:
        return _focus_row(by_id[focus_deal_id])

    # Default: return correlation rows for every deal that has at least one peer
    rows = [_focus_row(d) for d in deals]
    rows = [r for r in rows if r["peers"]]
    rows.sort(key=lambda r: r["total_correlated_exposure_usd"] or 0, reverse=True)

    return {
        "correlations":          rows,
        "deal_count_with_peers": len(rows),
        "summary": (
            f"{len(rows)} deals share at least one stress vector with another portfolio name. "
            "Click a deal to see its peer cluster."
        ),
    }


# ---------------------------------------------------------------------------
# Sponsor behavior leaderboard
# ---------------------------------------------------------------------------

def sponsor_behavior(portfolio: dict[str, dict]) -> dict:
    """
    Group portfolio by sponsor. Per sponsor:
      - total deals, total exposure
      - current / watchlist / stressed counts
      - average risk score (origination vs live)
      - "problem rate" = (watchlist + stressed) / total
      - lender treatment score:  100 * (1 - problem_rate) — higher is better
    """
    by_sponsor: dict[str, list[dict]] = defaultdict(list)
    non_sponsored: list[dict] = []

    for deal in portfolio.values():
        sp = deal.get("sponsor") or ""
        if sp.strip():
            by_sponsor[sp].append(deal)
        else:
            non_sponsored.append(deal)

    rows = []
    for sponsor, deals in by_sponsor.items():
        exposure       = sum(float(d.get("loan_amount", 0)) for d in deals)
        watch          = sum(1 for d in deals if d.get("status") == "watchlist")
        stress         = sum(1 for d in deals if d.get("status") == "stressed")
        problems       = watch + stress
        problem_rate   = (problems / len(deals) * 100) if deals else 0
        treatment_score = round(100 * (1 - problem_rate / 100), 1)

        avg_orig_risk = (
            sum(float(d.get("risk_score", 0)) for d in deals) / len(deals)
            if deals else 0
        )
        avg_live_risk = (
            sum(float(d.get("live_risk_score") or d.get("risk_score", 0)) for d in deals)
            / len(deals) if deals else 0
        )

        rows.append({
            "sponsor":              sponsor,
            "deal_count":           len(deals),
            "total_exposure_usd":   exposure,
            "current_count":        len(deals) - problems,
            "watchlist_count":      watch,
            "stressed_count":       stress,
            "problem_rate_pct":     round(problem_rate, 1),
            "lender_treatment_score": treatment_score,
            "avg_origination_risk":   round(avg_orig_risk, 1),
            "avg_live_risk":          round(avg_live_risk, 1),
            "risk_drift":             round(avg_live_risk - avg_orig_risk, 1),
            "deals":                  [
                {
                    "deal_id":  d.get("deal_id"),
                    "company":  d.get("company"),
                    "status":   d.get("status"),
                    "loan_amount": d.get("loan_amount"),
                    "risk_score":  d.get("live_risk_score") or d.get("risk_score"),
                }
                for d in deals
            ],
        })

    rows.sort(key=lambda r: r["total_exposure_usd"], reverse=True)

    return {
        "sponsors":            rows,
        "non_sponsored_count": len(non_sponsored),
        "non_sponsored_exposure_usd": sum(float(d.get("loan_amount", 0)) for d in non_sponsored),
        "summary": (
            f"{len(rows)} sponsors with active loans. "
            f"Worst lender-treatment-score: "
            f"{rows[len(rows)-1]['sponsor'] if rows else 'n/a'} "
            f"({rows[len(rows)-1]['lender_treatment_score'] if rows else 0})."
            if rows else
            "No sponsored deals in portfolio."
        ),
    }
