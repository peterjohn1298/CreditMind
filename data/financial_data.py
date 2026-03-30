"""
Financial Data Layer — yfinance + SEC EDGAR (no API key required).
Production swap: replace with LSEG / financialdatasets.ai by updating this file only.
"""

import yfinance as yf
import requests
import json
from typing import Optional


EDGAR_HEADERS = {"User-Agent": "CreditMind creditmind-app@example.com"}


def get_financial_statements(ticker: str) -> dict:
    """Fetch income statement, balance sheet, and cash flow via yfinance."""
    stock = yf.Ticker(ticker)
    try:
        return {
            "ticker": ticker,
            "income_statement": stock.financials.to_dict() if not stock.financials.empty else {},
            "balance_sheet": stock.balance_sheet.to_dict() if not stock.balance_sheet.empty else {},
            "cash_flow": stock.cashflow.to_dict() if not stock.cashflow.empty else {},
            "quarterly_income": stock.quarterly_financials.to_dict() if not stock.quarterly_financials.empty else {},
            "quarterly_balance": stock.quarterly_balance_sheet.to_dict() if not stock.quarterly_balance_sheet.empty else {},
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
