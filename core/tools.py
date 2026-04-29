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

GET_SECTOR_NEWS = {
    "name": "get_sector_news",
    "description": (
        "Fetch recent finance news from Finnhub filtered by sector keywords. "
        "Use this when monitoring a sector rather than a specific company. "
        "Pass the most relevant keywords for the sector (e.g. ['crude oil', 'OPEC', 'oil prices'])."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "keywords": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Keywords to search (top 3 will be used). E.g. ['crude oil', 'OPEC']",
            },
            "limit": {
                "type": "integer",
                "description": "Number of articles to fetch (1-20). Default 15.",
            },
        },
        "required": ["keywords"],
    },
}

GET_CONSUMER_SIGNALS = {
    "name": "get_consumer_signals",
    "description": (
        "Fetch alternative data: Yelp rating, review count, and recent review sentiment for a consumer-facing business. "
        "ONLY USE for companies with physical consumer locations: retail stores, clinics, gyms, restaurants, pharmacies, bariatric/behavioral health centers. "
        "DO NOT use for: defense contractors, manufacturers, logistics operators, chemical companies, energy infrastructure, B2B tech, or financial services — these have no Yelp presence. "
        "Declining ratings or negative recent reviews are leading indicators of foot traffic and revenue deterioration before financials reflect it."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "company":  {"type": "string", "description": "Business name as it would appear on Yelp, e.g. 'Planet Fitness'"},
            "location": {"type": "string", "description": "City or state to narrow search, e.g. 'New York' or 'US'. Default: US"},
        },
        "required": ["company"],
    },
}

GET_JOB_SIGNALS = {
    "name": "get_job_signals",
    "description": (
        "Fetch alternative data: open job posting count and hiring signal via Arbeitnow. "
        "BEST FOR: technology services, BPO, software, managed services, and consumer-facing companies that post jobs publicly. "
        "AVOID FOR: defense contractors, industrial manufacturers, oilfield services, chemical plants, logistics operators — "
        "these post on industry-specific boards not covered here, and low counts would be a false distress signal. "
        "A surge signals growth; distress keywords (restructuring, RIF, layoffs) signal deterioration."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "company": {"type": "string", "description": "Full company name, e.g. 'Ducommun Incorporated'"},
        },
        "required": ["company"],
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

GET_ENTERPRISE_VALUE = {
    "name": "get_enterprise_value",
    "description": (
        "Fetch enterprise value, EV/EBITDA multiple, market cap, and total debt for a company. "
        "Critical for mezzanine and distressed analysis — determines whether EV exceeds total debt "
        "(i.e., whether subordinated lenders have any recovery in a default scenario). "
        "Also use for unitranche exit multiple analysis."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol"},
        },
        "required": ["ticker"],
    },
}

GET_RECEIVABLES_METRICS = {
    "name": "get_receivables_metrics",
    "description": (
        "Fetch accounts receivable, days sales outstanding (DSO), inventory, inventory turnover, "
        "and working capital metrics. Essential for revolving credit / ABL borrowing base analysis — "
        "determines how much the fund can advance against receivables and inventory. "
        "Also use for bridge loans where working capital is the primary liquidity source."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol"},
        },
        "required": ["ticker"],
    },
}

SCAN_MA_NEWS = {
    "name": "scan_ma_news",
    "description": (
        "Scan Finnhub finance news for M&A activity and deal flow signals in target sectors. "
        "Pass sector names and deal-type keywords to find acquisition targets, PE-backed companies, "
        "leveraged buyout announcements, and management buyouts. Use for origination intelligence."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "sectors": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Target sectors to scan, e.g. ['Healthcare', 'Technology', 'Industrials']",
            },
            "keywords": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Additional M&A keywords, e.g. ['acquisition', 'buyout', 'private equity', 'leveraged']",
            },
        },
        "required": ["sectors"],
    },
}

SCAN_SEC_EDGAR = {
    "name": "scan_sec_edgar",
    "description": (
        "Search SEC EDGAR full-text for recent 8-K material event filings. Free API, no key required. "
        "Use to find companies that recently filed material events: acquisitions, debt issuances, "
        "management changes, covenant waivers, or going-concern disclosures. "
        "Pass M&A keywords and sector names to surface origination opportunities."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "keywords": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Keywords to search in 8-K filings, e.g. ['acquisition', 'credit agreement', 'term loan']",
            },
            "days_back": {
                "type": "integer",
                "description": "How many days back to search. Default 30.",
            },
        },
        "required": ["keywords"],
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
    GET_JOB_SIGNALS,
    GET_CONSUMER_SIGNALS,
]

SECTOR_MONITOR_TOOLS = [
    GET_SECTOR_NEWS,
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

ORIGINATION_TOOLS = [
    SCAN_MA_NEWS,
    SCAN_SEC_EDGAR,
    GET_SECTOR_NEWS,
    GET_MACRO_SNAPSHOT,
    GET_COMPANY_INFO,
    GET_COMPANY_NEWS,
]

SCREENING_TOOLS = [
    GET_COMPANY_INFO,
    GET_KEY_METRICS,
    GET_INCOME_STATEMENT,
    GET_COMPANY_NEWS,
    GET_MACRO_SNAPSHOT,
]

IC_COMMITTEE_TOOLS = [
    GET_KEY_METRICS,
    GET_MACRO_SNAPSHOT,
    GET_COMPANY_NEWS,
    GET_INCOME_STATEMENT,
    GET_CASH_FLOW,
]

DOCUMENTATION_TOOLS = [
    GET_MACRO_SNAPSHOT,
    GET_KEY_METRICS,
]

GROWTH_CAPITAL_TOOLS = [
    GET_COMPANY_INFO,
    GET_INCOME_STATEMENT,
    GET_KEY_METRICS,
    GET_CASH_FLOW,
    GET_COMPANY_NEWS,
    GET_JOB_SIGNALS,
    GET_MACRO_SNAPSHOT,
]

MEZZANINE_TOOLS = [
    GET_ENTERPRISE_VALUE,
    GET_KEY_METRICS,
    GET_INCOME_STATEMENT,
    GET_BALANCE_SHEET,
    GET_CASH_FLOW,
    GET_MACRO_SNAPSHOT,
]

UNITRANCHE_TOOLS = [
    GET_KEY_METRICS,
    GET_INCOME_STATEMENT,
    GET_BALANCE_SHEET,
    GET_CASH_FLOW,
    GET_MACRO_SNAPSHOT,
]

REVOLVER_TOOLS = [
    GET_RECEIVABLES_METRICS,
    GET_BALANCE_SHEET,
    GET_KEY_METRICS,
    GET_INCOME_STATEMENT,
    GET_MACRO_SNAPSHOT,
]

BRIDGE_TOOLS = [
    GET_KEY_METRICS,
    GET_INCOME_STATEMENT,
    GET_CASH_FLOW,
    GET_COMPANY_NEWS,
    GET_MACRO_SNAPSHOT,
]

DISTRESSED_TOOLS = [
    GET_ENTERPRISE_VALUE,
    GET_KEY_METRICS,
    GET_INCOME_STATEMENT,
    GET_BALANCE_SHEET,
    GET_CASH_FLOW,
    GET_SEC_FILINGS,
    GET_COMPANY_NEWS,
    GET_MACRO_SNAPSHOT,
]

PROJECT_FINANCE_TOOLS = [
    GET_SECTOR_NEWS,
    GET_MACRO_SNAPSHOT,
    GET_KEY_METRICS,
    GET_INCOME_STATEMENT,
    GET_CASH_FLOW,
]

KYC_AML_TOOLS = [
    GET_COMPANY_INFO,
    GET_COMPANY_NEWS,
    GET_SEC_FILINGS,
    SCAN_SEC_EDGAR,
]
