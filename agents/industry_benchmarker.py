"""
Agent 3: Industry Benchmarker
Compares borrower ratios against sector peers.
Identifies if borrower is an outlier in its industry.
"""

import json
from agents.base_agent import BaseAgent
from data.financial_data import get_company_info, get_key_metrics
from data.macro_data import get_macro_snapshot
from core.credit_state import log_agent


# Sector median benchmarks (industry-standard ranges)
SECTOR_BENCHMARKS = {
    "Technology": {
        "current_ratio": 2.0, "debt_to_equity": 0.5, "net_margin": 0.18,
        "operating_margin": 0.20, "return_on_equity": 0.20,
    },
    "Healthcare": {
        "current_ratio": 1.8, "debt_to_equity": 0.6, "net_margin": 0.10,
        "operating_margin": 0.15, "return_on_equity": 0.15,
    },
    "Financials": {
        "current_ratio": 1.2, "debt_to_equity": 2.0, "net_margin": 0.20,
        "operating_margin": 0.25, "return_on_equity": 0.12,
    },
    "Energy": {
        "current_ratio": 1.3, "debt_to_equity": 0.8, "net_margin": 0.08,
        "operating_margin": 0.15, "return_on_equity": 0.10,
    },
    "Consumer Cyclical": {
        "current_ratio": 1.5, "debt_to_equity": 0.7, "net_margin": 0.06,
        "operating_margin": 0.10, "return_on_equity": 0.14,
    },
    "Industrials": {
        "current_ratio": 1.4, "debt_to_equity": 0.6, "net_margin": 0.07,
        "operating_margin": 0.12, "return_on_equity": 0.13,
    },
    "default": {
        "current_ratio": 1.5, "debt_to_equity": 0.7, "net_margin": 0.08,
        "operating_margin": 0.12, "return_on_equity": 0.12,
    },
}


class IndustryBenchmarkerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Industry Benchmarker"

    @property
    def role(self) -> str:
        return (
            "You are a credit research analyst specializing in sector analysis. "
            "Your job is to compare a borrower's financial profile against industry benchmarks "
            "and identify whether the company is an outlier — positively or negatively — in its sector."
        )

    def run(self, credit_state: dict) -> dict:
        ticker = credit_state["ticker"]
        company = credit_state["company"]
        financial_analysis = credit_state.get("financial_analysis", {})
        underwriting = credit_state.get("underwriting_metrics", {})

        info = get_company_info(ticker)
        metrics = get_key_metrics(ticker)
        macro = get_macro_snapshot()

        sector = info.get("sector", "default")
        benchmarks = SECTOR_BENCHMARKS.get(sector, SECTOR_BENCHMARKS["default"])

        user_message = f"""
Benchmark {company} ({ticker}) against its sector peers.

SECTOR: {sector}
INDUSTRY: {info.get('industry', 'Unknown')}

BORROWER METRICS:
{json.dumps(metrics, indent=2, default=str)}

SECTOR MEDIAN BENCHMARKS:
{json.dumps(benchmarks, indent=2)}

MACRO ENVIRONMENT:
{json.dumps(macro, indent=2, default=str)}

FINANCIAL ANALYSIS SUMMARY:
{json.dumps(financial_analysis, indent=2, default=str)}

Produce a structured JSON benchmark report:
{{
  "sector": "{sector}",
  "industry": "{info.get('industry', 'Unknown')}",
  "peer_comparison": {{
    "current_ratio": {{"borrower": null, "sector_median": null, "assessment": "ABOVE | IN-LINE | BELOW"}},
    "debt_to_equity": {{"borrower": null, "sector_median": null, "assessment": "ABOVE | IN-LINE | BELOW"}},
    "net_margin": {{"borrower": null, "sector_median": null, "assessment": "ABOVE | IN-LINE | BELOW"}},
    "operating_margin": {{"borrower": null, "sector_median": null, "assessment": "ABOVE | IN-LINE | BELOW"}},
    "return_on_equity": {{"borrower": null, "sector_median": null, "assessment": "ABOVE | IN-LINE | BELOW"}}
  }},
  "sector_risk_factors": ["factor1", "factor2"],
  "competitive_position": "LEADER | AVERAGE | LAGGARD",
  "macro_sensitivity": "how sensitive is this sector/company to current macro environment",
  "benchmark_summary": "2-3 sentence summary of borrower vs peers"
}}
"""

        result = self.call_claude_json(self.role, user_message)
        credit_state["industry_benchmark"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state
