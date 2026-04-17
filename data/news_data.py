"""
News Data Layer — yfinance for company news, Finnhub for sector news.
"""

import os
import requests
import yfinance as yf
from datetime import datetime, timedelta


def get_sector_news(keywords: list, limit: int = 15) -> list:
    """Fetch recent finance news from Finnhub, filtered by keywords."""
    api_key = os.environ.get("FINNHUB_API_KEY", "")
    if not api_key:
        return [{"error": "FINNHUB_API_KEY not configured in environment"}]

    try:
        resp = requests.get(
            "https://finnhub.io/api/v1/news",
            params={"category": "general", "token": api_key},
            timeout=10,
        )
        resp.raise_for_status()
        articles = resp.json()

        # Filter by keywords — split phrases into individual words for broader matching
        if keywords:
            terms = {word.lower() for kw in keywords for word in kw.split()}
            articles = [
                a for a in articles
                if any(
                    term in (a.get("headline", "") + " " + a.get("summary", "")).lower()
                    for term in terms
                )
            ]

        return [
            {
                "title": a.get("headline", ""),
                "source": a.get("source", ""),
                "published_at": datetime.fromtimestamp(a.get("datetime", 0)).isoformat(),
                "description": a.get("summary", ""),
                "url": a.get("url", ""),
            }
            for a in articles[:limit]
        ]
    except Exception as e:
        return [{"error": str(e)}]


def get_company_news(ticker: str, limit: int = 20) -> list:
    """Fetch recent news articles for a company via yfinance."""
    stock = yf.Ticker(ticker)
    try:
        news = stock.news or []
        results = []
        for item in news[:limit]:
            results.append({
                "title": item.get("title", ""),
                "publisher": item.get("publisher", ""),
                "link": item.get("link", ""),
                "published_at": datetime.fromtimestamp(item.get("providerPublishTime", 0)).isoformat(),
                "type": item.get("type", ""),
                "ticker": ticker,
            })
        return results
    except Exception as e:
        return [{"error": str(e), "ticker": ticker}]


def get_news_summary(ticker: str) -> dict:
    """Return a structured news summary for agent consumption."""
    news = get_company_news(ticker, limit=20)
    if not news or "error" in news[0]:
        return {"ticker": ticker, "articles": [], "count": 0}

    return {
        "ticker": ticker,
        "articles": news,
        "count": len(news),
        "date_range": {
            "earliest": min(a["published_at"] for a in news),
            "latest": max(a["published_at"] for a in news),
        },
    }
