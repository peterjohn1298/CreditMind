"""
Orchestrator — runs agents sequentially and manages the credit lifecycle.
Pre-disbursement: Agents 1-5
Post-disbursement: Agents 6-8 (daily), Agents 9-11 (quarterly)
"""

from core.credit_state import create_credit_state, log_agent

from agents.financial_analyst import FinancialAnalystAgent
from agents.credit_underwriter import CreditUnderwriterAgent
from agents.industry_benchmarker import IndustryBenchmarkerAgent
from agents.risk_scorer import RiskScorerAgent
from agents.covenant_structurer import CovenantStructurerAgent

from agents.news_intelligence import NewsIntelligenceAgent
from agents.sentiment_scorer import SentimentScorerAgent
from agents.early_warning import EarlyWarningAgent

from agents.portfolio_monitor import PortfolioMonitorAgent
from agents.covenant_compliance import CovenantComplianceAgent
from agents.rating_reviewer import RatingReviewerAgent


class PreDisbursementOrchestrator:
    """Runs Agents 1-5 sequentially to produce a credit memo."""

    def __init__(self):
        self.agents = [
            FinancialAnalystAgent(),
            CreditUnderwriterAgent(),
            IndustryBenchmarkerAgent(),
            RiskScorerAgent(),
            CovenantStructurerAgent(),
        ]

    def run(self, credit_state: dict, on_agent_complete=None) -> dict:
        """
        Run all pre-disbursement agents.
        on_agent_complete: optional callback(agent_name, credit_state) for UI progress updates.
        """
        for agent in self.agents:
            credit_state = agent.run(credit_state)
            if on_agent_complete:
                on_agent_complete(agent.name, credit_state)
        return credit_state


class DailyMonitoringOrchestrator:
    """Runs Agents 6-8 for daily post-disbursement monitoring."""

    def __init__(self):
        self.agents = [
            NewsIntelligenceAgent(),
            SentimentScorerAgent(),
            EarlyWarningAgent(),
        ]

    def run(self, credit_state: dict, on_agent_complete=None) -> dict:
        for agent in self.agents:
            credit_state = agent.run(credit_state)
            if on_agent_complete:
                on_agent_complete(agent.name, credit_state)
        return credit_state


class QuarterlyReviewOrchestrator:
    """Runs Agents 9-11 for quarterly portfolio review."""

    def __init__(self):
        self.agents = [
            PortfolioMonitorAgent(),
            CovenantComplianceAgent(),
            RatingReviewerAgent(),
        ]

    def run(self, credit_state: dict, on_agent_complete=None) -> dict:
        for agent in self.agents:
            credit_state = agent.run(credit_state)
            if on_agent_complete:
                on_agent_complete(agent.name, credit_state)
        return credit_state


def run_full_underwriting(
    company: str,
    ticker: str,
    loan_amount: float,
    loan_tenor: str,
    loan_type: str,
    on_agent_complete=None,
) -> dict:
    """
    Entry point: create state + run full pre-disbursement pipeline.
    Returns credit_state with all agent outputs populated.
    """
    credit_state = create_credit_state(
        company=company,
        ticker=ticker,
        loan_amount=loan_amount,
        loan_tenor=loan_tenor,
        loan_type=loan_type,
    )
    orchestrator = PreDisbursementOrchestrator()
    return orchestrator.run(credit_state, on_agent_complete=on_agent_complete)
