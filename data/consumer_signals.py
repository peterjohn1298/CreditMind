"""
Consumer Signals Layer — Yelp Fusion API (alternative data).
Review count, ratings, and recent review sentiment serve as foot traffic
and customer satisfaction proxies for consumer-facing borrowers.
Most relevant for: retail, restaurants, healthcare clinics, gyms, hospitality.
"""

import os
import requests
from datetime import datetime


_NEGATIVE_KEYWORDS = {"closed", "closing", "out of business", "shut down", "no longer",
                      "terrible", "awful", "disgusting", "horrible", "avoid", "scam", "fraud"}
_POSITIVE_KEYWORDS = {"excellent", "outstanding", "amazing", "highly recommend",
                      "best", "wonderful", "fantastic", "great service"}


def get_consumer_signals(company: str, location: str = "US") -> dict:
    """
    Fetch Yelp data for a consumer-facing business and return credit-relevant signals.

    Returns review count, star rating, recent review sentiment, and a composite
    consumer_signal (STRONG / STABLE / WEAKENING / DISTRESS).
    """
    api_key = os.environ.get("YELP_API_KEY", "")
    if not api_key:
        return {"error": "YELP_API_KEY not configured in environment"}

    headers = {"Authorization": f"Bearer {api_key}"}

    # Step 1 — find the business
    try:
        search_resp = requests.get(
            "https://api.yelp.com/v3/businesses/search",
            headers=headers,
            params={"term": company, "location": location, "limit": 1},
            timeout=10,
        )
        search_resp.raise_for_status()
        businesses = search_resp.json().get("businesses", [])
        if not businesses:
            return {"error": f"No Yelp listing found for '{company}'"}
        biz = businesses[0]
    except Exception as e:
        return {"error": str(e)}

    biz_id      = biz.get("id")
    rating      = biz.get("rating", 0)
    review_count = biz.get("review_count", 0)
    categories  = [c.get("title", "") for c in biz.get("categories", [])]
    is_closed   = biz.get("is_closed", False)

    # Step 2 — fetch 3 most recent reviews
    recent_reviews = []
    review_sentiment = "NEUTRAL"
    closure_flag = False

    try:
        rev_resp = requests.get(
            f"https://api.yelp.com/v3/businesses/{biz_id}/reviews",
            headers=headers,
            params={"sort_by": "newest", "limit": 3},
            timeout=10,
        )
        if rev_resp.status_code == 200:
            reviews = rev_resp.json().get("reviews", [])
            for r in reviews:
                text = r.get("text", "").lower()
                recent_reviews.append({
                    "rating": r.get("rating"),
                    "text":   r.get("text", "")[:150],
                    "date":   r.get("time_created", "")[:10],
                })
                if any(k in text for k in _NEGATIVE_KEYWORDS):
                    closure_flag = True

            avg_recent = sum(r["rating"] for r in recent_reviews) / len(recent_reviews) if recent_reviews else rating
            if avg_recent >= 4.0:
                review_sentiment = "POSITIVE"
            elif avg_recent >= 3.0:
                review_sentiment = "NEUTRAL"
            else:
                review_sentiment = "NEGATIVE"
    except Exception:
        pass  # reviews are supplemental — don't fail the whole call

    # Derive composite consumer signal
    if is_closed or closure_flag:
        signal    = "DISTRESS"
        rationale = "Business appears closed or closure signals detected in recent reviews"
    elif rating < 3.0 or review_sentiment == "NEGATIVE":
        signal    = "WEAKENING"
        rationale = f"Low rating ({rating}★) and/or negative recent reviews indicate declining customer satisfaction"
    elif rating >= 4.0 and review_count >= 100 and review_sentiment != "NEGATIVE":
        signal    = "STRONG"
        rationale = f"High rating ({rating}★) with {review_count} reviews — strong customer engagement"
    else:
        signal    = "STABLE"
        rationale = f"Rating {rating}★ across {review_count} reviews — no significant consumer-side deterioration"

    return {
        "company":          company,
        "yelp_name":        biz.get("name", company),
        "rating":           rating,
        "review_count":     review_count,
        "review_sentiment": review_sentiment,
        "recent_reviews":   recent_reviews,
        "categories":       categories,
        "is_closed":        is_closed,
        "consumer_signal":  signal,
        "signal_rationale": rationale,
        "data_source":      "Yelp Fusion",
        "as_of":            datetime.utcnow().date().isoformat(),
    }
