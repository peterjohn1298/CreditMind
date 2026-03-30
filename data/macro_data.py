"""
Macro Data Layer — FRED API (Federal Reserve Economic Data).
Provides macroeconomic context for credit risk assessment.
"""

import os
import requests
from datetime import datetime, timedelta


FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"
FRED_API_KEY = os.getenv("FRED_API_KEY")


MACRO_SERIES = {
    "fed_funds_rate":     "FEDFUNDS",
    "cpi_inflation":      "CPIAUCSL",
    "unemployment_rate":  "UNRATE",
    "gdp_growth":         "A191RL1Q225SBEA",
    "10yr_treasury":      "GS10",
    "credit_spreads_hy":  "BAMLH0A0HYM2",
    "credit_spreads_ig":  "BAMLC0A0CM",
    "vix":                "VIXCLS",
}


def get_series(series_id: str, periods: int = 4) -> list:
    """Fetch the last N observations of a FRED series."""
    if not FRED_API_KEY:
        return [{"error": "FRED_API_KEY not set"}]
    try:
        params = {
            "series_id": series_id,
            "api_key": FRED_API_KEY,
            "file_type": "json",
            "sort_order": "desc",
            "limit": periods,
        }
        response = requests.get(FRED_BASE, params=params, timeout=10)
        data = response.json()
        observations = data.get("observations", [])
        return [{"date": o["date"], "value": o["value"]} for o in observations]
    except Exception as e:
        return [{"error": str(e)}]


def get_macro_snapshot() -> dict:
    """Fetch current macro environment — used by all agents for context."""
    snapshot = {}
    for name, series_id in MACRO_SERIES.items():
        observations = get_series(series_id, periods=2)
        if observations and "error" not in observations[0]:
            snapshot[name] = {
                "current": observations[0]["value"],
                "prior": observations[1]["value"] if len(observations) > 1 else None,
                "date": observations[0]["date"],
            }
        else:
            snapshot[name] = {"current": "N/A", "prior": None, "date": None}
    return snapshot


def get_sector_benchmarks(sector: str) -> dict:
    """
    Return sector-relevant macro indicators.
    Extend this with sector-specific FRED series as needed.
    """
    base = get_macro_snapshot()
    return {
        "macro": base,
        "sector": sector,
        "note": "Sector-specific benchmarks to be added per industry vertical.",
    }
