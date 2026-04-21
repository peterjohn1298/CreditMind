"""
Sector Stress Scoring Engine — quantitative composite score (0–100).

Replaces Claude's pure qualitative judgment with a weighted formula:

  Component           Weight   Source
  ──────────────────  ──────   ──────────────────────────────────────────────
  Macro stress          20%    FRED: HY credit spreads + VIX
  Market momentum       25%    yfinance: sector ETF 30-day return vs SPY
  News sentiment        35%    Finnhub/Claude: tone + material event flags
  Portfolio signals     20%    Deal risk scores + covenant breaches + watchlist

Claude still narrates and may nudge the score ±10 for qualitative factors,
but the numeric anchor is this formula.
"""

import json
import logging
import os
from pathlib import Path

import requests
import yfinance as yf

log = logging.getLogger("creditmind.sector_stress")

# ── Sector → GICS → ETF mapping ───────────────────────────────────────────────

_PORTFOLIO_TO_GICS: dict[str, str] = {
    "Aerospace & Defense":    "Industrials",
    "Healthcare":             "Health Care",
    "Health Care":            "Health Care",
    "Energy":                 "Energy",
    "Materials":              "Materials",
    "Industrials":            "Industrials",
    "Consumer Discretionary": "Consumer Discretionary",
    "Consumer & Retail":      "Consumer Discretionary",
    "Consumer Staples":       "Consumer Staples",
    "Financials":             "Financials",
    "Financial Services":     "Financials",
    "Information Technology": "Information Technology",
    "Technology":             "Information Technology",
    "Technology Services":    "Information Technology",
    "Communication Services": "Communication Services",
    "Utilities":              "Utilities",
    "Real Estate":            "Real Estate",
    "Specialty Chemicals":    "Materials",
    "Food & Agriculture":     "Consumer Staples",
    "Logistics":              "Industrials",
}

_GICS_TO_ETF: dict[str, str] = {
    "Energy":                 "XLE",
    "Materials":              "XLB",
    "Industrials":            "XLI",
    "Consumer Discretionary": "XLY",
    "Consumer Staples":       "XLP",
    "Health Care":            "XLV",
    "Financials":             "XLF",
    "Information Technology": "XLK",
    "Communication Services": "XLC",
    "Utilities":              "XLU",
    "Real Estate":            "XLRE",
}


def _sector_etf(sector: str) -> str | None:
    gics = _PORTFOLIO_TO_GICS.get(sector, sector)
    return _GICS_TO_ETF.get(gics)


# ── Component 1: Macro stress (FRED) ──────────────────────────────────────────

_FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"


def _fred_latest(series_id: str) -> float | None:
    api_key = os.getenv("FRED_API_KEY", "")
    if not api_key:
        return None
    try:
        resp = requests.get(_FRED_BASE, params={
            "series_id": series_id,
            "api_key": api_key,
            "file_type": "json",
            "sort_order": "desc",
            "limit": 1,
        }, timeout=8)
        obs = resp.json().get("observations", [])
        val = obs[0]["value"] if obs else None
        return float(val) if val and val != "." else None
    except Exception as e:
        log.warning(f"FRED fetch failed ({series_id}): {e}")
        return None


def _hy_spread_stress(spread_pct: float) -> float:
    """
    HY OAS spread (BAMLH0A0HYM2) in % (e.g. 3.5 = 350 bps).
    Historical normal ~350 bps. Wider = more stress.
    """
    if spread_pct < 3.0:   return 10.0   # historically tight, benign
    if spread_pct < 3.5:   return 20.0
    if spread_pct < 4.0:   return 35.0
    if spread_pct < 5.0:   return 52.0
    if spread_pct < 6.0:   return 68.0
    if spread_pct < 7.0:   return 80.0
    return 90.0


def _vix_stress(vix: float) -> float:
    if vix < 15:   return 5.0
    if vix < 20:   return 18.0
    if vix < 25:   return 32.0
    if vix < 30:   return 50.0
    if vix < 40:   return 68.0
    return 85.0


def get_macro_stress_score() -> dict:
    """
    Returns score 0–100 and component breakdown.
    Falls back to 35 (neutral-low) if FRED is unavailable.
    """
    hy_spread = _fred_latest("BAMLH0A0HYM2")
    vix       = _fred_latest("VIXCLS")

    if hy_spread is None and vix is None:
        return {"score": 35, "hy_spread": None, "vix": None, "fallback": True}

    hy_score  = _hy_spread_stress(hy_spread) if hy_spread else 35.0
    vix_score = _vix_stress(vix)             if vix       else 35.0

    score = round(0.6 * hy_score + 0.4 * vix_score, 1)
    return {
        "score":     score,
        "hy_spread": hy_spread,
        "vix":       vix,
        "hy_score":  hy_score,
        "vix_score": vix_score,
        "fallback":  False,
    }


# ── Component 2: Market momentum (yfinance ETF vs SPY) ────────────────────────

def _momentum_stress(relative_return_pct: float) -> float:
    """
    Sector ETF 30-day return relative to SPY.
    Negative = underperformance = stress.
    """
    r = relative_return_pct
    if r > 2.0:    return 10.0   # outperforming — low stress
    if r > 0.0:    return 22.0
    if r > -2.0:   return 35.0   # inline with market
    if r > -5.0:   return 52.0
    if r > -10.0:  return 68.0
    if r > -15.0:  return 80.0
    return 90.0


def get_market_momentum_score(sector: str, days: int = 30) -> dict:
    """
    Returns score 0–100 and component breakdown.
    Falls back to 35 if ETF data unavailable.
    """
    etf = _sector_etf(sector)
    if not etf:
        return {"score": 35, "etf": None, "relative_return": None, "fallback": True}

    try:
        from datetime import datetime, timedelta
        start = (datetime.now() - timedelta(days=days + 10)).strftime("%Y-%m-%d")
        etf_hist = yf.download(etf,  start=start, progress=False, auto_adjust=True)
        spy_hist = yf.download("SPY", start=start, progress=False, auto_adjust=True)

        if etf_hist.empty or spy_hist.empty or len(etf_hist) < 5:
            return {"score": 35, "etf": etf, "relative_return": None, "fallback": True}

        etf_ret = float((etf_hist["Close"].iloc[-1] / etf_hist["Close"].iloc[0] - 1) * 100)
        spy_ret = float((spy_hist["Close"].iloc[-1] / spy_hist["Close"].iloc[0] - 1) * 100)
        rel     = round(etf_ret - spy_ret, 2)
        score   = _momentum_stress(rel)

        return {
            "score":           score,
            "etf":             etf,
            "etf_return_pct":  round(etf_ret, 2),
            "spy_return_pct":  round(spy_ret, 2),
            "relative_return": rel,
            "fallback":        False,
        }
    except Exception as e:
        log.warning(f"ETF momentum fetch failed ({etf}): {e}")
        return {"score": 35, "etf": etf, "relative_return": None, "fallback": True}


# ── Component 3: News sentiment ────────────────────────────────────────────────

_TONE_BASE: dict[str, float] = {
    "POSITIVE": 15.0,
    "NEUTRAL":  30.0,
    "MIXED":    50.0,
    "NEGATIVE": 70.0,
}


def get_news_sentiment_score(news_signals: list) -> dict:
    """
    Converts Claude's news analysis output to a 0–100 score.
    news_signals: list of dicts from NewsIntelligenceAgent.run_sector()
    """
    if not news_signals:
        return {"score": 30, "tone": "NEUTRAL", "critical_events": 0, "fallback": True}

    latest = news_signals[-1] if isinstance(news_signals, list) else news_signals
    if not isinstance(latest, dict):
        return {"score": 30, "tone": "NEUTRAL", "critical_events": 0, "fallback": True}

    tone    = latest.get("overall_news_tone", "NEUTRAL").upper()
    base    = _TONE_BASE.get(tone, 30.0)
    events  = latest.get("material_events_detected", []) or []

    # Severity bonuses
    critical_count = sum(1 for e in events if e.get("severity") in ("CRITICAL", "HIGH"))
    escalation     = 1 if latest.get("escalation_required") else 0

    bonus = min(critical_count * 10 + escalation * 8, 25)   # cap bonus at +25
    score = min(round(base + bonus, 1), 100)

    return {
        "score":           score,
        "tone":            tone,
        "total_events":    len(events),
        "critical_events": critical_count,
        "escalation":      bool(escalation),
        "fallback":        False,
    }


# ── Component 4: Portfolio signals ────────────────────────────────────────────

_RATING_BASE: dict[str, float] = {
    "BB+": 25, "BB": 32, "BB-": 40,
    "B+":  52, "B":  62, "B-":  72,
    "CCC": 82, "CC": 90, "C":   95,
}


def get_portfolio_signal_score(deals: list) -> dict:
    """
    Derives a stress signal from the actual deals in this sector.
    Uses live_risk_score if available, else internal_rating as proxy.
    """
    if not deals:
        return {"score": 30, "deal_count": 0, "fallback": True}

    # Weighted average risk score (by loan amount)
    total_weight = 0.0
    weighted_sum = 0.0
    breaches     = 0
    watchlist    = 0

    for d in deals:
        amount = d.get("loan_amount", 1) or 1
        score  = d.get("live_risk_score") or d.get("risk_score")

        if score is None:
            # Fall back to rating-based proxy
            score = _RATING_BASE.get(d.get("internal_rating", "B"), 50)

        weighted_sum  += float(score) * amount
        total_weight  += amount

        status = (d.get("loan_status") or d.get("status") or "").upper()
        if status in ("BREACH", "COVENANT_BREACH"):
            breaches += 1
        if status in ("WATCHLIST", "STRESSED", "WATCH"):
            watchlist += 1

    base_score = weighted_sum / total_weight if total_weight else 50.0

    # Penalties: covenant breaches and watchlist deals signal sector stress
    breach_penalty    = min(breaches * 15, 30)
    watchlist_penalty = min(watchlist * 8, 20)

    score = min(round(base_score + breach_penalty + watchlist_penalty, 1), 100)

    return {
        "score":             score,
        "deal_count":        len(deals),
        "base_risk_score":   round(base_score, 1),
        "covenant_breaches": breaches,
        "watchlist_deals":   watchlist,
        "breach_penalty":    breach_penalty,
        "watchlist_penalty": watchlist_penalty,
        "fallback":          False,
    }


# ── Composite ─────────────────────────────────────────────────────────────────

_WEIGHTS = {
    "macro":     0.20,
    "momentum":  0.25,
    "news":      0.35,
    "portfolio": 0.20,
}


def compute_sector_stress(
    sector: str,
    deals: list,
    news_signals: list,
) -> dict:
    """
    Compute composite sector stress score (0–100) from four components.

    Returns full breakdown so agents can narrate each driver and the
    score can be stored alongside its components for the frontend.
    """
    macro     = get_macro_stress_score()
    momentum  = get_market_momentum_score(sector)
    news      = get_news_sentiment_score(news_signals)
    portfolio = get_portfolio_signal_score(deals)

    composite = round(
        _WEIGHTS["macro"]     * macro["score"]     +
        _WEIGHTS["momentum"]  * momentum["score"]  +
        _WEIGHTS["news"]      * news["score"]       +
        _WEIGHTS["portfolio"] * portfolio["score"],
        1,
    )
    composite = max(0, min(100, composite))

    # Dominant driver — whichever weighted component contributes most
    weighted = {
        "macro":     _WEIGHTS["macro"]     * macro["score"],
        "momentum":  _WEIGHTS["momentum"]  * momentum["score"],
        "news":      _WEIGHTS["news"]      * news["score"],
        "portfolio": _WEIGHTS["portfolio"] * portfolio["score"],
    }
    dominant = max(weighted, key=weighted.get)  # type: ignore[arg-type]

    return {
        "sector":          sector,
        "composite_score": composite,
        "dominant_driver": dominant,
        "weights":         _WEIGHTS,
        "components": {
            "macro":     macro,
            "momentum":  momentum,
            "news":      news,
            "portfolio": portfolio,
        },
    }
