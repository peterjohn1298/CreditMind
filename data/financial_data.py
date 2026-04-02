"""
Financial Data Layer — yfinance + SEC EDGAR (no API key required).
Production swap: replace with LSEG / financialdatasets.ai by updating this file only.
"""

import yfinance as yf
import requests
import json
from typing import Optional


EDGAR_HEADERS = {"User-Agent": "CreditMind creditmind-app@example.com"}


def _df_to_dict(df) -> dict:
    """Convert a yfinance DataFrame to a JSON-safe dict with string keys.

    yfinance returns DataFrames whose column headers are pandas Timestamps.
    json.dumps raises TypeError on non-string dict keys, so we stringify them here.
    """
    if df is None or df.empty:
        return {}
    return {
        str(col): {str(idx): val for idx, val in df[col].items()}
        for col in df.columns
    }


def get_financial_statements(ticker: str) -> dict:
    """Fetch income statement, balance sheet, and cash flow via yfinance."""
    stock = yf.Ticker(ticker)
    try:
        return {
            "ticker": ticker,
            "income_statement": _df_to_dict(stock.financials),
            "balance_sheet": _df_to_dict(stock.balance_sheet),
            "cash_flow": _df_to_dict(stock.cashflow),
            "quarterly_income": _df_to_dict(stock.quarterly_financials),
            "quarterly_balance": _df_to_dict(stock.quarterly_balance_sheet),
        }
    except Exception as e:
        return {"ticker": ticker, "error": str(e)}


def get_company_info(ticker: str) -> dict:
    """Fetch company metadata, sector, industry, and key stats."""
    stock = yf.Ticker(ticker)
    try:
        info = stock.info
        return {
            "name": info.get("longName", ticker),
            "sector": info.get("sector", "Unknown"),
            "industry": info.get("industry", "Unknown"),
            "country": info.get("country", "Unknown"),
            "market_cap": info.get("marketCap"),
            "employees": info.get("fullTimeEmployees"),
            "description": info.get("longBusinessSummary", ""),
            "website": info.get("website", ""),
            "exchange": info.get("exchange", ""),
            "currency": info.get("financialCurrency", "USD"),
        }
    except Exception as e:
        return {"error": str(e)}


def get_key_metrics(ticker: str) -> dict:
    """Fetch key financial ratios directly from yfinance."""
    stock = yf.Ticker(ticker)
    info = stock.info
    return {
        "current_ratio": info.get("currentRatio"),
        "quick_ratio": info.get("quickRatio"),
        "debt_to_equity": info.get("debtToEquity"),
        "return_on_equity": info.get("returnOnEquity"),
        "return_on_assets": info.get("returnOnAssets"),
        "profit_margins": info.get("profitMargins"),
        "operating_margins": info.get("operatingMargins"),
        "ebitda_margins": info.get("ebitdaMargins"),
        "revenue_growth": info.get("revenueGrowth"),
        "earnings_growth": info.get("earningsGrowth"),
        "total_debt": info.get("totalDebt"),
        "total_cash": info.get("totalCash"),
        "free_cashflow": info.get("freeCashflow"),
        "operating_cashflow": info.get("operatingCashflow"),
        "ebitda": info.get("ebitda"),
        "total_revenue": info.get("totalRevenue"),
        "gross_profits": info.get("grossProfits"),
        "interest_expense": info.get("interestExpense"),
    }


def get_cik_from_ticker(ticker: str) -> Optional[str]:
    """Look up SEC CIK number from ticker symbol."""
    try:
        url = "https://www.sec.gov/files/company_tickers.json"
        response = requests.get(url, headers=EDGAR_HEADERS, timeout=10)
        data = response.json()
        for entry in data.values():
            if entry.get("ticker", "").upper() == ticker.upper():
                return str(entry["cik_str"]).zfill(10)
        return None
    except Exception:
        return None


def get_sec_filings(ticker: str, filing_types: list = ["10-K", "10-Q", "8-K"]) -> list:
    """Fetch recent SEC filings for a company."""
    cik = get_cik_from_ticker(ticker)
    if not cik:
        return []
    try:
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        response = requests.get(url, headers=EDGAR_HEADERS, timeout=10)
        data = response.json()
        filings = data.get("filings", {}).get("recent", {})

        results = []
        for i, form in enumerate(filings.get("form", [])):
            if form in filing_types:
                results.append({
                    "form": form,
                    "filing_date": filings["filingDate"][i],
                    "report_date": filings["reportDate"][i],
                    "accession_number": filings["accessionNumber"][i],
                    "url": f"https://www.sec.gov/Archives/edgar/full-index/{filings['accessionNumber'][i].replace('-', '')}/",
                })
        return results[:10]
    except Exception as e:
        return [{"error": str(e)}]


def get_peer_tickers(ticker: str) -> list:
    """Get sector peers for industry benchmarking via yfinance."""
    stock = yf.Ticker(ticker)
    try:
        return stock.info.get("recommendationKey", [])
    except Exception:
        return []
