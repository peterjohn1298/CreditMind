"""
Tool definitions for Claude's tool use API.
Each tool is a data source an agent can call. Claude decides which to invoke and when.
"""

# --- Individual tool schemas ---

GET_INCOME_STATEMENT = {
    "name": "get_income_statement",
    "description": (
        "Fetch annual income statement for a company: revenue, gross profit, EBITDA, "
        "operating income, net income across multiple years. Call this first for any revenue or profitability analysis."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol, e.g. AAPL"}
        },
        "required": ["ticker"],
    },
}

GET_BALANCE_SHEET = {
    "name": "get_balance_sheet",
    "description": (
        "Fetch annual balance sheet: total assets, total liabilities, total debt, cash and equivalents, "
        "shareholders equity, current assets and liabilities. Use for leverage and liquidity analysis."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol"}
        },
        "required": ["ticker"],
    },
}

GET_CASH_FLOW = {
    "name": "get_cash_flow",
    "description": (
        "Fetch annual cash flow statement: operating cash flow, capital expenditures, free cash flow, "
        "financing activities. Essential for debt serviceability and FCF analysis."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol"}
        },
        "required": ["ticker"],
    },
}

GET_KEY_METRICS = {
    "name": "get_key_metrics",
    "description": (
        "Fetch pre-calculated financial ratios: current ratio, quick ratio, debt/equity, ROE, ROA, "
        "profit margins, operating margins, EBITDA margins, revenue growth, total debt, free cash flow. "
        "Use this for a quick ratio overview without parsing full statements."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol"}
        },
        "required": ["ticker"],
    },
}

GET_COMPANY_INFO = {
    "name": "get_company_info",
    "description": (
        "Fetch company metadata: full name, sector, industry, country, market cap, employee count, "
        "business description, exchange. Use to understand what the company does and which sector it's in."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol"}
        },
        "required": ["ticker"],
    },
}

GET_SEC_FILINGS = {
    "name": "get_sec_filings",
    "description": (
        "Fetch recent SEC filings list for a company (10-K annual, 10-Q quarterly, 8-K material events). "
        "Use to check for recent material disclosures, restatements, or regulatory filings."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol"},
            "filing_types": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Filing types to retrieve. Defaults to ['10-K', '10-Q', '8-K']",
            },
        },
        "required": ["ticker"],
    },
}

GET_COMPANY_NEWS = {
    "name": "get_company_news",
    "description": (
        "Fetch recent news articles about a company. Returns headlines, publisher, date. "
        "Use to detect material events: management changes, fraud, lawsuits, earnings warnings, M&A, downgrades."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol"},
            "limit": {
                "type": "integer",
                "description": "Number of articles to fetch (1-20). Default 15.",
            },
        },
        "required": ["ticker"],
    },
}

GET_MACRO_SNAPSHOT = {
    "name": "get_macro_snapshot",
    "description": (
        "Fetch current macroeconomic indicators: Fed funds rate, CPI inflation, unemployment rate, "
        "GDP growth, 10yr treasury yield, high-yield and investment-grade credit spreads, VIX. "
        "Use for macro risk context and sector sensitivity analysis."
    ),
    "input_schema": {
        "type": "object",
        "properties": {},
        "required": [],
    },
}

# --- Tool sets by agent ---
# Each agent only gets the tools relevant to its job.

FINANCIAL_ANALYST_TOOLS = [
    GET_COMPANY_INFO,
    GET_INCOME_STATEMENT,
    GET_BALANCE_SHEET,
    GET_CASH_FLOW,
    GET_KEY_METRICS,
    GET_SEC_FILINGS,
    GET_MACRO_SNAPSHOT,
]

UNDERWRITER_TOOLS = [
    GET_INCOME_STATEMENT,
    GET_CASH_FLOW,
    GET_KEY_METRICS,
    GET_BALANCE_SHEET,
    GET_MACRO_SNAPSHOT,
]

BENCHMARKER_TOOLS = [
    GET_COMPANY_INFO,
    GET_KEY_METRICS,
    GET_INCOME_STATEMENT,
    GET_MACRO_SNAPSHOT,
]

RISK_SCORER_TOOLS = [
    GET_KEY_METRICS,
    GET_COMPANY_NEWS,
    GET_MACRO_SNAPSHOT,
]

COVENANT_TOOLS = [
    GET_KEY_METRICS,
    GET_BALANCE_SHEET,
    GET_CASH_FLOW,
    GET_MACRO_SNAPSHOT,
]

NEWS_INTEL_TOOLS = [
    GET_COMPANY_NEWS,
    GET_COMPANY_INFO,
    GET_SEC_FILINGS,
]

SENTIMENT_TOOLS = [
    GET_COMPANY_NEWS,
]

EARLY_WARNING_TOOLS = [
    GET_COMPANY_NEWS,
    GET_KEY_METRICS,
    GET_MACRO_SNAPSHOT,
]

PORTFOLIO_MONITOR_TOOLS = [
    GET_KEY_METRICS,
    GET_INCOME_STATEMENT,
    GET_CASH_FLOW,
    GET_BALANCE_SHEET,
]

COVENANT_COMPLIANCE_TOOLS = [
    GET_KEY_METRICS,
    GET_BALANCE_SHEET,
    GET_CASH_FLOW,
]

RATING_REVIEWER_TOOLS = [
    GET_KEY_METRICS,
    GET_COMPANY_NEWS,
    GET_MACRO_SNAPSHOT,
]
