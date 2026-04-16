"""
News Data Layer — yfinance for company news, NewsAPI for sector keyword search.
"""

import os
import requests
import yfinance as yf
from datetime import datetime, timedelta


def get_sector_news(keywords: list, limit: int = 15) -> list:
    """Fetch recent news for a sector using keyword search via NewsAPI."""
    api_key = os.environ.get("NEWSAPI_KEY", "")
    if not api_key:
        return [{"error": "NEWSAPI_KEY not configured in environment"}]

    # Use top 3 keywords joined with OR for a focused query
    query = " OR ".join(f'"{k}"' for k in keywords[:3])
    try:
        resp = requests.get(
            "https://newsapi.org/v2/everything",
            params={
                "q": query,
                "sortBy": "publishedAt",
                "pageSize": min(limit, 20),
                "language": "en",
                "apiKey": api_key,
            },
            timeout=10,
        )
        resp.raise_for_status()
        articles = resp.json().get("articles", [])
        return [
            {
                "title": a.get("title", ""),
                "source": a.get("source", {}).get("name", ""),
                "published_at": a.get("publishedAt", ""),
                "description": a.get("description", ""),
                "url": a.get("url", ""),
            }
            for a in articles
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
