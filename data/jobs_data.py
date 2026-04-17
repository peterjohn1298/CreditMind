"""
Jobs Data Layer — Adzuna API for job posting signals (alternative data).
Open position counts and role mix are leading indicators of business health.
"""

import os
import requests
from datetime import datetime, timedelta


_GROWTH_KEYWORDS     = {"engineer", "developer", "product", "sales", "account", "marketing", "growth"}
_FINANCE_KEYWORDS    = {"finance", "accounting", "controller", "treasury", "analyst", "fp&a"}
_LEGAL_KEYWORDS      = {"legal", "compliance", "regulatory", "counsel", "attorney", "audit"}
_DISTRESS_KEYWORDS   = {"restructuring", "severance", "wind down", "workforce reduction",
                        "rightsizing", "reduction in force", "rif ", "layoff"}


def get_job_signals(company: str, limit: int = 50) -> dict:
    """
    Fetch open job postings for a company via Adzuna and classify into a hiring signal.

    Signal meanings:
      SURGE       — large open position count, growth-oriented roles dominant
      GROWTH      — healthy hiring, mostly engineering/sales
      STABLE      — normal baseline hiring activity
      CONTRACTING — low posting count relative to company size signals
      DISTRESS    — distress keywords detected in job descriptions
    """
    app_id  = os.environ.get("ADZUNA_APP_ID", "")
    app_key = os.environ.get("ADZUNA_APP_KEY", "")
    if not app_id or not app_key:
        return {"error": "ADZUNA_APP_ID or ADZUNA_APP_KEY not configured"}

    try:
        resp = requests.get(
            "https://api.adzuna.com/v1/api/jobs/us/search/1",
            params={
                "app_id":          app_id,
                "app_key":         app_key,
                "what_or":         company,
                "results_per_page": min(limit, 50),
                "sort_by":         "date",
            },
            timeout=10,
        )
        resp.raise_for_status()
        data    = resp.json()
        results = data.get("results", [])
        total   = data.get("count", 0)

    except Exception as e:
        return {"error": str(e)}

    # Classify roles
    breakdown = {"engineering_product": 0, "sales_marketing": 0,
                 "finance_operations": 0, "legal_compliance": 0, "other": 0}
    distress_found = []

    for job in results:
        title = (job.get("title", "") + " " + job.get("description", "")[:200]).lower()

        if any(k in title for k in _DISTRESS_KEYWORDS):
            kw = next(k for k in _DISTRESS_KEYWORDS if k in title)
            if kw.strip() not in distress_found:
                distress_found.append(kw.strip())

        if any(k in title for k in _GROWTH_KEYWORDS):
            breakdown["engineering_product" if any(k in title for k in {"engineer","developer","product"}) else "sales_marketing"] += 1
        elif any(k in title for k in _FINANCE_KEYWORDS):
            breakdown["finance_operations"] += 1
        elif any(k in title for k in _LEGAL_KEYWORDS):
            breakdown["legal_compliance"] += 1
        else:
            breakdown["other"] += 1

    # Derive signal
    if distress_found:
        signal = "DISTRESS"
        rationale = f"Distress-related keywords detected in postings: {', '.join(distress_found[:3])}"
    elif total >= 100:
        signal = "SURGE"
        rationale = f"{total} open positions — aggressive hiring across multiple functions"
    elif total >= 30:
        signal = "GROWTH"
        rationale = f"{total} open positions — healthy, growth-oriented hiring pace"
    elif total >= 10:
        signal = "STABLE"
        rationale = f"{total} open positions — normal baseline activity"
    else:
        signal = "CONTRACTING"
        rationale = f"Only {total} open positions — low hiring activity may signal contraction or freeze"

    return {
        "company":              company,
        "open_positions":       total,
        "hiring_signal":        signal,
        "signal_rationale":     rationale,
        "role_breakdown":       breakdown,
        "distress_keywords":    distress_found,
        "data_source":          "Adzuna",
        "as_of":                datetime.utcnow().date().isoformat(),
    }
