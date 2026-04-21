"""
Consumer Signals Layer — Google Places API.
Replaces Yelp Fusion. Fetches business ratings, review volume,
and business_status for consumer-facing borrowers.

Key signals:
  business_status  OPERATIONAL | CLOSED_TEMPORARILY | CLOSED_PERMANENTLY
  rating           1.0–5.0 (Google star rating)
  user_ratings_total  review volume — proxy for foot traffic / business activity

Most relevant for: retail, restaurants, healthcare clinics, gyms, hospitality.
Env var required: GOOGLE_PLACES_API_KEY
"""

import os
import requests
from datetime import datetime

_PLACES_BASE = "https://maps.googleapis.com/maps/api/place"

# Fields fetched from Place Details — minimise billable field groups
_DETAIL_FIELDS = "name,rating,user_ratings_total,business_status,opening_hours,price_level,formatted_address"


def _credit_implication(signal: str, status: str, rating: float | None, reviews: int) -> str:
    if status == "CLOSED_PERMANENTLY":
        return "CRITICAL: Business marked permanently closed on Google — immediate on-site verification required."
    if status == "CLOSED_TEMPORARILY":
        return "HIGH: Business marked temporarily closed — monitor for sustained revenue impact."
    if signal == "DISTRESS":
        return f"Rating {rating}/5 across {reviews} reviews indicates significant customer dissatisfaction — potential revenue deterioration."
    if signal == "WEAKENING":
        return f"Below-average rating ({rating}/5) suggests weakening consumer sentiment — flag for next monitoring cycle."
    if signal == "STRONG":
        return f"Strong rating ({rating}/5, {reviews:,} reviews) confirms healthy consumer demand — no near-term credit concern."
    return "Stable consumer signals — rating and review volume within normal range."


def get_consumer_signals(company: str, location: str = "US") -> dict:
    """
    Fetch Google Places data for a consumer-facing business and return
    credit-relevant signals.

    Returns composite consumer_signal: STRONG | STABLE | WEAKENING | DISTRESS
    """
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
    if not api_key:
        return {"error": "GOOGLE_PLACES_API_KEY not configured in environment"}

    # ── Step 1: Text search to find the business ───────────────────────────
    try:
        search_resp = requests.get(
            f"{_PLACES_BASE}/textsearch/json",
            params={"query": f"{company} {location}", "key": api_key},
            timeout=10,
        )
        search_resp.raise_for_status()
        results = search_resp.json().get("results", [])
        if not results:
            return {"error": f"No Google Places results found for '{company}'"}
        place_id = results[0]["place_id"]
    except Exception as e:
        return {"error": f"Places search failed: {e}"}

    # ── Step 2: Fetch place details ────────────────────────────────────────
    try:
        detail_resp = requests.get(
            f"{_PLACES_BASE}/details/json",
            params={"place_id": place_id, "fields": _DETAIL_FIELDS, "key": api_key},
            timeout=10,
        )
        detail_resp.raise_for_status()
        detail = detail_resp.json().get("result", {})
    except Exception as e:
        return {"error": f"Places detail fetch failed: {e}"}

    rating         = detail.get("rating")
    review_count   = detail.get("user_ratings_total", 0)
    business_status = detail.get("business_status", "OPERATIONAL")
    open_now       = (detail.get("opening_hours") or {}).get("open_now")
    address        = detail.get("formatted_address", "")
    google_name    = detail.get("name", company)

    # ── Derive composite consumer signal ───────────────────────────────────
    if business_status == "CLOSED_PERMANENTLY":
        signal = "DISTRESS"
    elif business_status == "CLOSED_TEMPORARILY":
        signal = "WEAKENING"
    elif rating is not None and rating < 2.5:
        signal = "DISTRESS"
    elif rating is not None and rating < 3.5:
        signal = "WEAKENING"
    elif rating is not None and rating >= 4.2 and review_count >= 100:
        signal = "STRONG"
    else:
        signal = "STABLE"

    return {
        "company":          company,
        "google_name":      google_name,
        "address":          address,
        "rating":           rating,
        "review_count":     review_count,
        "business_status":  business_status,
        "open_now":         open_now,
        "consumer_signal":  signal,
        "signal_rationale": _credit_implication(signal, business_status, rating, review_count),
        "data_source":      "Google Places",
        "as_of":            datetime.utcnow().date().isoformat(),
    }
