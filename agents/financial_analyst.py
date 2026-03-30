"""
Agent 1: Financial Analyst
Reads financial statements, calculates ratios, identifies 3-year trends.
"""

import json
from agents.base_agent import BaseAgent
from data.financial_data import get_financial_statements, get_key_metrics, get_company_info
from core.credit_state import log_agent


class FinancialAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Financial Analyst"

    @property
    def role(self) -> str:
        return (
            "You are a senior financial analyst at a commercial bank. "
            "Your job is to analyze a borrower's financial statements and produce a structured financial assessment. "
            "Be precise, cite specific numbers, and flag any material concerns."
        )

    def run(self, credit_state: dict) -> dict:
        ticker = credit_state["ticker"]
        company = credit_state["company"]

        statements = get_financial_statements(ticker)
        metrics = get_key_metrics(ticker)
        info = get_company_info(ticker)

        user_message = f"""
Analyze the following financial data for {company} ({ticker}) for a credit assessment.

COMPANY INFO:
{json.dumps(info, indent=2, default=str)}

KEY METRICS:
{json.dumps(metrics, indent=2, default=str)}

FINANCIAL STATEMENTS (annual):
Income Statement: {json.dumps(statements.get('income_statement', {}), indent=2, default=str)[:3000]}
Balance Sheet: {json.dumps(statements.get('balance_sheet', {}), indent=2, default=str)[:3000]}
Cash Flow: {json.dumps(statements.get('cash_flow', {}), indent=2, default=str)[:3000]}

Produce a structured JSON financial analysis with the following keys:
{{
  "revenue_trend": "description of 3-year revenue trend",
  "profitability": {{
    "gross_margin": value_or_null,
    "operating_margin": value_or_null,
    "net_margin": value_or_null,
    "ebitda_margin": value_or_null,
    "assessment": "brief assessment"
  }},
  "liquidity": {{
    "current_ratio": value_or_null,
    "quick_ratio": value_or_null,
    "cash_position": value_or_null,
    "assessment": "brief assessment"
  }},
  "leverage": {{
    "debt_to_equity": value_or_null,
    "total_debt": value_or_null,
    "assessment": "brief assessment"
  }},
  "cash_flow_quality": "assessment of operating vs free cash flow",
  "key_strengths": ["strength1", "strength2"],
  "key_concerns": ["concern1", "concern2"],
  "overall_financial_health": "STRONG | ADEQUATE | WEAK | DISTRESSED"
}}
"""

        result = self.call_claude_json(self.role, user_message)
        credit_state["financial_analysis"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state
