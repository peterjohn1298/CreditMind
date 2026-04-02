"""
Agent 1: Financial Analyst
Claude autonomously fetches financial statements, ratios, and macro context.
It decides what data it needs and calls tools until it can produce a complete analysis.
"""

from agents.base_agent import BaseAgent
from core.tools import FINANCIAL_ANALYST_TOOLS
from core.credit_state import log_agent


class FinancialAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Financial Analyst"

    @property
    def role(self) -> str:
        return (
            "You are a senior financial analyst at a commercial bank conducting a credit assessment. "
            "You have access to tools to fetch financial statements, ratios, SEC filings, and macro data. "
            "Use the tools to gather the data you need — income statement for revenue and profitability trends, "
            "balance sheet for leverage and liquidity, cash flow for FCF quality, key metrics for ratios, "
            "and macro snapshot for environmental context. "
            "Be precise, cite specific numbers, and flag any material concerns. "
            "Fetch what you need — do not guess or hallucinate numbers."
        )

    def run(self, credit_state: dict) -> dict:
        ticker = credit_state["ticker"]
        company = credit_state["company"]

        task = f"""
Conduct a comprehensive financial analysis of {company} (ticker: {ticker}) for a credit assessment.

Use your tools to fetch the data you need. At minimum:
- Fetch the income statement to assess revenue trend and profitability
- Fetch the balance sheet to assess leverage and liquidity
- Fetch cash flow to assess FCF quality and debt serviceability
- Fetch key metrics for pre-calculated ratios
- Fetch macro snapshot for environmental context

After gathering data, produce a structured JSON financial analysis:
{{
  "revenue_trend": "description of 3-year revenue trend with specific numbers",
  "profitability": {{
    "gross_margin": value_or_null,
    "operating_margin": value_or_null,
    "net_margin": value_or_null,
    "ebitda_margin": value_or_null,
    "assessment": "STRONG | ADEQUATE | WEAK"
  }},
  "liquidity": {{
    "current_ratio": value_or_null,
    "quick_ratio": value_or_null,
    "cash_position": value_or_null,
    "assessment": "STRONG | ADEQUATE | WEAK"
  }},
  "leverage": {{
    "debt_to_equity": value_or_null,
    "total_debt": value_or_null,
    "net_debt": value_or_null,
    "assessment": "LOW | MODERATE | HIGH | VERY_HIGH"
  }},
  "cash_flow_quality": "assessment of operating vs free cash flow with specific figures",
  "macro_context": "how the current macro environment affects this borrower",
  "key_strengths": ["strength1", "strength2", "strength3"],
  "key_concerns": ["concern1", "concern2"],
  "overall_financial_health": "STRONG | ADEQUATE | WEAK | DISTRESSED",
  "data_quality_note": "any gaps or limitations in the data fetched"
}}
"""

        result = self.run_agentic_loop_json(self.role, task, FINANCIAL_ANALYST_TOOLS)
        credit_state["financial_analysis"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state
