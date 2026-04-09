"""
Agent 3: Industry Benchmarker
Claude fetches company info to identify the sector, then fetches relevant metrics
and macro data to benchmark the borrower against industry standards.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import BENCHMARKER_TOOLS
from core.credit_state import log_agent


# Sector median benchmarks — static reference data passed as context
SECTOR_BENCHMARKS = {
    "Technology":        {"current_ratio": 2.0, "debt_to_equity": 0.5, "net_margin": 0.18, "operating_margin": 0.20, "roe": 0.20},
    "Healthcare":        {"current_ratio": 1.8, "debt_to_equity": 0.6, "net_margin": 0.10, "operating_margin": 0.15, "roe": 0.15},
    "Financials":        {"current_ratio": 1.2, "debt_to_equity": 2.0, "net_margin": 0.20, "operating_margin": 0.25, "roe": 0.12},
    "Energy":            {"current_ratio": 1.3, "debt_to_equity": 0.8, "net_margin": 0.08, "operating_margin": 0.15, "roe": 0.10},
    "Consumer Cyclical": {"current_ratio": 1.5, "debt_to_equity": 0.7, "net_margin": 0.06, "operating_margin": 0.10, "roe": 0.14},
    "Industrials":       {"current_ratio": 1.4, "debt_to_equity": 0.6, "net_margin": 0.07, "operating_margin": 0.12, "roe": 0.13},
    "Real Estate":       {"current_ratio": 1.2, "debt_to_equity": 1.5, "net_margin": 0.20, "operating_margin": 0.35, "roe": 0.08},
    "Utilities":         {"current_ratio": 0.9, "debt_to_equity": 1.2, "net_margin": 0.12, "operating_margin": 0.20, "roe": 0.10},
    "default":           {"current_ratio": 1.5, "debt_to_equity": 0.7, "net_margin": 0.08, "operating_margin": 0.12, "roe": 0.12},
}


class IndustryBenchmarkerAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Industry Benchmarker"

    @property
    def role(self) -> str:
        return (
            "You are a credit research analyst specializing in sector analysis. "
            "Your job is to benchmark a borrower's financial ratios against its industry peers. "
            "First fetch company info to confirm the sector, then fetch key metrics to compare. "
            "Also fetch macro data to assess sector-level macro sensitivity. "
            "Identify whether the borrower is a leader, average, or laggard in its peer group."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        ticker = credit_state["ticker"]
        financial_analysis = credit_state.get("financial_analysis", {})

        task = f"""
Benchmark {company} (ticker: {ticker}) against its industry sector peers.

FINANCIAL ANALYSIS FROM AGENT 1:
{json.dumps(financial_analysis, indent=2, default=str)[:1500]}

SECTOR BENCHMARK REFERENCE DATA (industry medians):
{json.dumps(SECTOR_BENCHMARKS, indent=2)}

Steps:
1. Fetch company info to confirm the sector and industry
2. Fetch key metrics to get the borrower's actual ratios
3. Fetch macro snapshot to assess macro environment sensitivity
4. Compare borrower ratios to the appropriate sector benchmark above

Produce structured JSON benchmark report:
{{
  "sector": "confirmed sector name",
  "industry": "specific industry",
  "peer_comparison": {{
    "current_ratio":    {{"borrower": null, "sector_median": null, "assessment": "ABOVE | IN-LINE | BELOW"}},
    "debt_to_equity":   {{"borrower": null, "sector_median": null, "assessment": "ABOVE | IN-LINE | BELOW"}},
    "net_margin":       {{"borrower": null, "sector_median": null, "assessment": "ABOVE | IN-LINE | BELOW"}},
    "operating_margin": {{"borrower": null, "sector_median": null, "assessment": "ABOVE | IN-LINE | BELOW"}},
    "return_on_equity": {{"borrower": null, "sector_median": null, "assessment": "ABOVE | IN-LINE | BELOW"}}
  }},
  "sector_risk_factors": ["factor1", "factor2"],
  "macro_sensitivity": "HIGH | MEDIUM | LOW — explain why",
  "competitive_position": "LEADER | AVERAGE | LAGGARD",
  "benchmark_summary": "2-3 sentence summary of borrower vs sector peers"
}}
"""

        result = self.run_agentic_loop_json(self.role, task, BENCHMARKER_TOOLS)
        credit_state["industry_benchmark"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state
