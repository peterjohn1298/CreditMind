"""
Tool Executor — maps Claude tool_use requests to actual function calls.
Called inside the agentic loop in base_agent.py.
"""

import json
import yfinance as yf

from data.financial_data import (
    get_key_metrics,
    get_company_info,
    get_sec_filings,
    _df_to_dict,
)
from data.news_data import get_company_news, get_sector_news
from data.macro_data import get_macro_snapshot
from data.jobs_data import get_job_signals
from data.consumer_signals import get_consumer_signals
from data.sec_edgar import scan_sec_8k_filings


def execute_tool(tool_name: str, tool_input: dict) -> str:
    """
    Execute a tool call and return a JSON string result.
    Output is capped at 3500 chars to keep context manageable.
    """
    try:
        result = _dispatch(tool_name, tool_input)
    except Exception as e:
        result = {"error": f"{tool_name} failed: {str(e)}"}

    serialized = json.dumps(result, default=str)
    # Hard cap — prevents single tool result from blowing up context
    if len(serialized) > 3500:
        serialized = serialized[:3500] + '... [truncated]"}'
    return serialized


def _dispatch(tool_name: str, tool_input: dict):
    if tool_name == "get_income_statement":
        stock = yf.Ticker(tool_input["ticker"])
        return _df_to_dict(stock.financials)

    elif tool_name == "get_balance_sheet":
        stock = yf.Ticker(tool_input["ticker"])
        return _df_to_dict(stock.balance_sheet)

    elif tool_name == "get_cash_flow":
        stock = yf.Ticker(tool_input["ticker"])
        return _df_to_dict(stock.cashflow)

    elif tool_name == "get_key_metrics":
        return get_key_metrics(tool_input["ticker"])

    elif tool_name == "get_company_info":
        return get_company_info(tool_input["ticker"])

    elif tool_name == "get_sec_filings":
        filing_types = tool_input.get("filing_types", ["10-K", "10-Q", "8-K"])
        return get_sec_filings(tool_input["ticker"], filing_types)

    elif tool_name == "get_company_news":
        limit = min(int(tool_input.get("limit", 15)), 20)
        return get_company_news(tool_input["ticker"], limit=limit)

    elif tool_name == "get_sector_news":
        limit = min(int(tool_input.get("limit", 15)), 20)
        return get_sector_news(tool_input["keywords"], limit=limit)

    elif tool_name == "get_macro_snapshot":
        return get_macro_snapshot()

    elif tool_name == "get_job_signals":
        return get_job_signals(tool_input["company"])

    elif tool_name == "get_consumer_signals":
        location = tool_input.get("location", "US")
        return get_consumer_signals(tool_input["company"], location=location)

    elif tool_name == "get_enterprise_value":
        ticker = tool_input["ticker"]
        stock  = yf.Ticker(ticker)
        info   = stock.info or {}
        return {
            "ticker":            ticker,
            "market_cap":        info.get("marketCap"),
            "enterprise_value":  info.get("enterpriseValue"),
            "ev_ebitda":         info.get("enterpriseToEbitda"),
            "ev_revenue":        info.get("enterpriseToRevenue"),
            "total_debt":        info.get("totalDebt"),
            "cash":              info.get("totalCash"),
            "net_debt":          (info.get("totalDebt") or 0) - (info.get("totalCash") or 0),
            "forward_pe":        info.get("forwardPE"),
            "price_to_book":     info.get("priceToBook"),
        }

    elif tool_name == "get_receivables_metrics":
        ticker = tool_input["ticker"]
        stock  = yf.Ticker(ticker)
        bs     = _df_to_dict(stock.balance_sheet)
        info   = stock.info or {}

        # DSO = (AR / Revenue) * 365
        revenue = info.get("totalRevenue", 0) or 0
        try:
            ar_raw = bs.get("Accounts Receivable") or bs.get("Net Receivables") or {}
            ar     = list(ar_raw.values())[0] if ar_raw else 0
            dso    = round((ar / revenue) * 365, 1) if revenue and ar else None
        except Exception:
            ar, dso = None, None

        try:
            inv_raw = bs.get("Inventory") or {}
            inv     = list(inv_raw.values())[0] if inv_raw else 0
        except Exception:
            inv = None

        cogs = info.get("grossProfit") and info.get("totalRevenue") and (info["totalRevenue"] - info["grossProfit"])
        inv_turnover = round(cogs / inv, 1) if (cogs and inv and inv > 0) else None

        return {
            "ticker":                  ticker,
            "accounts_receivable":     ar,
            "days_sales_outstanding":  dso,
            "inventory":               inv,
            "inventory_turnover":      inv_turnover,
            "total_revenue":           revenue,
            "current_assets":          info.get("totalCurrentAssets"),
            "current_liabilities":     info.get("totalCurrentLiabilities"),
            "working_capital":         ((info.get("totalCurrentAssets") or 0) - (info.get("totalCurrentLiabilities") or 0)) or None,
            "quick_ratio":             info.get("quickRatio"),
            "current_ratio":           info.get("currentRatio"),
        }

    elif tool_name == "scan_ma_news":
        sectors  = tool_input.get("sectors", [])
        keywords = tool_input.get("keywords", ["acquisition", "buyout", "private equity"])
        combined = keywords + sectors
        return get_sector_news(combined, limit=15)

    elif tool_name == "scan_sec_edgar":
        keywords  = tool_input.get("keywords", ["acquisition", "credit agreement"])
        days_back = int(tool_input.get("days_back", 30))
        return scan_sec_8k_filings(keywords, days_back=days_back)

    elif tool_name == "retrieve_document_section":
        from core.document_indexer import retrieve
        deal_id  = tool_input["deal_id"]
        doc_type = tool_input["doc_type"]
        query    = tool_input["query"]
        top_k    = min(int(tool_input.get("top_k", 4)), 8)
        return retrieve(deal_id, doc_type, query, top_k)

    else:
        return {"error": f"Unknown tool: {tool_name}"}
