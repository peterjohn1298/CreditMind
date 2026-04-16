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

    else:
        return {"error": f"Unknown tool: {tool_name}"}
