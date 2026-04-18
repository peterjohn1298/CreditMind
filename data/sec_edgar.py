"""
SEC EDGAR full-text search for origination intelligence.
Free API — no key required.
Scans for recent 8-K material event filings matching M&A / deal activity keywords.
"""

import requests
from datetime import datetime, timedelta


def scan_sec_8k_filings(keywords: list[str], days_back: int = 30) -> list[dict]:
    """
    Search SEC EDGAR full-text search for recent 8-K filings matching keywords.
    Useful for spotting M&A activity, management changes, debt issuances in target sectors.
    """
    base_url = "https://efts.sec.gov/LATEST/search-index"
    start_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    end_date = datetime.now().strftime("%Y-%m-%d")

    results = []
    seen_companies = set()

    for keyword in keywords[:4]:
        try:
            params = {
                "q": f'"{keyword}"',
                "forms": "8-K",
                "dateRange": "custom",
                "startdt": start_date,
                "enddt": end_date,
            }
            resp = requests.get(base_url, params=params, timeout=10,
                                headers={"User-Agent": "CreditMind Research peter@creditmind.ai"})
            if not resp.ok:
                continue

            data = resp.json()
            hits = data.get("hits", {}).get("hits", [])

            for hit in hits[:5]:
                src = hit.get("_source", {})
                company = src.get("entity_name", "")
                if not company or company in seen_companies:
                    continue
                seen_companies.add(company)
                results.append({
                    "company":       company,
                    "form":          src.get("form_type", "8-K"),
                    "filed":         src.get("file_date", ""),
                    "period":        src.get("period_of_report", ""),
                    "keyword_match": keyword,
                    "cik":           src.get("entity_id", ""),
                })
        except Exception:
            continue

    return results[:20]
