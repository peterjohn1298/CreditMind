"""
News Data Layer — yfinance news feed (no API key required).
Provides company news for sentiment analysis and early warning signals.
"""

import yfinance as yf
from datetime import datetime, timedelta


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
