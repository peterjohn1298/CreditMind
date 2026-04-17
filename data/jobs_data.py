"""
Jobs Data Layer — Arbeitnow API for job posting signals (alternative data).
No API key required. Open position counts and role mix are leading indicators
of business health — hiring surges signal growth, distress keywords flag trouble.
"""

import requests
from datetime import datetime


_GROWTH_KEYWORDS   = {"engineer", "developer", "product", "sales", "account", "marketing", "growth"}
_FINANCE_KEYWORDS  = {"finance", "accounting", "controller", "treasury", "analyst", "fp&a"}
_LEGAL_KEYWORDS    = {"legal", "compliance", "regulatory", "counsel", "attorney", "audit"}
_DISTRESS_KEYWORDS = {"restructuring", "severance", "wind down", "workforce reduction",
                      "rightsizing", "reduction in force", "rif ", "layoff"}


def get_job_signals(company: str) -> dict:
    """
    Fetch open job postings for a company via Arbeitnow (no API key required)
    and classify into a hiring signal.

    Signal meanings:
      SURGE       — large open position count, growth-oriented roles dominant
      GROWTH      — healthy hiring, mostly engineering/sales
      STABLE      — normal baseline hiring activity
      CONTRACTING — low posting count may signal hiring freeze or contraction
      DISTRESS    — distress keywords detected in job titles/descriptions
    """
    try:
        resp = requests.get(
            "https://www.arbeitnow.com/api/job-board-api",
            params={"search": company},
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json().get("data", [])
        total   = len(results)

    except Exception as e:
        return {"error": str(e)}

    breakdown    = {"engineering_product": 0, "sales_marketing": 0,
                    "finance_operations": 0, "legal_compliance": 0, "other": 0}
    distress_found = []

    for job in results:
        text = (job.get("title", "") + " " + job.get("description", "")[:200]).lower()

        if any(k in text for k in _DISTRESS_KEYWORDS):
            kw = next(k for k in _DISTRESS_KEYWORDS if k in text)
            if kw.strip() not in distress_found:
                distress_found.append(kw.strip())

        if any(k in text for k in {"engineer", "developer", "product"}):
            breakdown["engineering_product"] += 1
        elif any(k in text for k in {"sales", "account", "marketing", "growth"}):
            breakdown["sales_marketing"] += 1
        elif any(k in text for k in _FINANCE_KEYWORDS):
            breakdown["finance_operations"] += 1
        elif any(k in text for k in _LEGAL_KEYWORDS):
            breakdown["legal_compliance"] += 1
        else:
            breakdown["other"] += 1

    if distress_found:
        signal    = "DISTRESS"
        rationale = f"Distress-related keywords found in postings: {', '.join(distress_found[:3])}"
    elif total >= 100:
        signal    = "SURGE"
        rationale = f"{total} open positions — aggressive hiring across multiple functions"
    elif total >= 30:
        signal    = "GROWTH"
        rationale = f"{total} open positions — healthy, growth-oriented hiring pace"
    elif total >= 10:
        signal    = "STABLE"
        rationale = f"{total} open positions — normal baseline activity"
    else:
        signal    = "CONTRACTING"
        rationale = f"Only {total} open positions — low hiring activity may signal contraction or freeze"

    return {
        "company":           company,
        "open_positions":    total,
        "hiring_signal":     signal,
        "signal_rationale":  rationale,
        "role_breakdown":    breakdown,
        "distress_keywords": distress_found,
        "data_source":       "Arbeitnow",
        "as_of":             datetime.utcnow().date().isoformat(),
    }
