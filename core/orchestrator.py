"""
Orchestrator — manages the credit lifecycle with dynamic routing.

Dynamic routing means the orchestrator reads each agent's output and
decides what happens next — not just running agents blindly in sequence.

Pre-disbursement routing logic:
  - DISTRESSED financial health → skip Industry Benchmarker (fast-track to risk scoring)
  - Risk score >= 75 → auto-reject, skip Covenant Structurer
  - No financial data → abort early with clear error

Post-disbursement routing:
  - Covenant breach → skip Rating Reviewer (already escalated to credit committee)
"""

from core.credit_state import create_credit_state, log_agent, add_alert

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
    """
    Runs Agents 1-5 with dynamic routing.
    Each agent's output is inspected before deciding whether to continue.
    """

    def run(self, credit_state: dict, on_agent_complete=None) -> dict:

        def _complete(agent, state):
            if on_agent_complete:
                on_agent_complete(agent.name, state)

        # --- Agent 1: Financial Analyst ---
        agent1 = FinancialAnalystAgent()
        credit_state = agent1.run(credit_state)
        _complete(agent1, credit_state)

        financial = credit_state.get("financial_analysis", {})
        health = financial.get("overall_financial_health", "ADEQUATE")

        # Abort if no usable financial data
        if financial.get("parse_error") or not financial:
            credit_state["_routing_note"] = "Aborted: Financial Analyst returned no usable data."
            credit_state["loan_status"] = "REJECTED"
            add_alert(
                credit_state,
                trigger="Financial data unavailable — underwriting aborted",
                severity="HIGH",
                action_required="Manually verify ticker and resubmit.",
            )
            return credit_state

        # --- Agent 2: Credit Underwriter ---
        agent2 = CreditUnderwriterAgent()
        credit_state = agent2.run(credit_state)
        _complete(agent2, credit_state)

        # --- Agent 3: Industry Benchmarker ---
        # Skip if borrower is already DISTRESSED — benchmarking adds little value
        if health == "DISTRESSED":
            credit_state["_routing_note"] = (
                "Industry Benchmarker skipped: borrower financial health is DISTRESSED. "
                "Fast-tracked to risk scoring."
            )
            credit_state["industry_benchmark"] = {
                "skipped": True,
                "reason": "Borrower classified as DISTRESSED — benchmarking bypassed.",
            }
            if on_agent_complete:
                on_agent_complete("Industry Benchmarker", credit_state)
        else:
            agent3 = IndustryBenchmarkerAgent()
            credit_state = agent3.run(credit_state)
            _complete(agent3, credit_state)

        # --- Agent 4: Risk Scorer ---
        agent4 = RiskScorerAgent()
        credit_state = agent4.run(credit_state)
        _complete(agent4, credit_state)

        risk_score = credit_state.get("risk_score", 50)

        # Auto-reject on very high risk — skip covenant structuring
        if risk_score >= 75:
            credit_state["_routing_note"] = (
                f"Covenant Structurer skipped: risk score {risk_score}/100 exceeds auto-reject threshold (75). "
                "Loan recommended for rejection."
            )
            credit_state["recommended_covenants"] = {
                "skipped": True,
                "reason": f"Risk score {risk_score}/100 exceeds threshold — no covenant package prepared.",
            }
            if on_agent_complete:
                on_agent_complete("Covenant Structurer", credit_state)

            add_alert(
                credit_state,
                trigger=f"Auto-reject threshold breached: risk score {risk_score}/100",
                severity="CRITICAL",
                action_required="Senior credit officer must review before final decision.",
            )
            return credit_state

        # --- Agent 5: Covenant Structurer ---
        agent5 = CovenantStructurerAgent()
        credit_state = agent5.run(credit_state)
        _complete(agent5, credit_state)

        return credit_state


class DailyMonitoringOrchestrator:
    """Runs Agents 6-8 for daily post-disbursement monitoring."""

    def run(self, credit_state: dict, on_agent_complete=None) -> dict:
        agents = [
            NewsIntelligenceAgent(),
            SentimentScorerAgent(),
            EarlyWarningAgent(),
        ]
        for agent in agents:
            credit_state = agent.run(credit_state)
            if on_agent_complete:
                on_agent_complete(agent.name, credit_state)
        return credit_state


class QuarterlyReviewOrchestrator:
    """
    Runs Agents 9-11 for quarterly review with routing:
    - Covenant breach → skip Rating Reviewer (credit committee already alerted)
    """

    def run(self, credit_state: dict, on_agent_complete=None) -> dict:

        def _complete(agent, state):
            if on_agent_complete:
                on_agent_complete(agent.name, state)

        # --- Agent 9: Portfolio Monitor ---
        agent9 = PortfolioMonitorAgent()
        credit_state = agent9.run(credit_state)
        _complete(agent9, credit_state)

        # --- Agent 10: Covenant Compliance ---
        agent10 = CovenantComplianceAgent()
        credit_state = agent10.run(credit_state)
        _complete(agent10, credit_state)

        covenant_status = credit_state.get("covenant_status", {})
        overall_compliance = covenant_status.get("overall_compliance", "FULLY_COMPLIANT")

        # If breach detected, credit committee is already alerted — Rating Reviewer
        # would duplicate the escalation and add noise
        if overall_compliance == "BREACH_DETECTED":
            credit_state["_routing_note"] = (
                "Rating Reviewer skipped: covenant breach already escalated to credit committee."
            )
            credit_state["_rating_review_full"] = {
                "skipped": True,
                "reason": "Covenant breach detected — rating review deferred to credit committee session.",
            }
            if on_agent_complete:
                on_agent_complete("Rating Reviewer", credit_state)
            return credit_state

        # --- Agent 11: Rating Reviewer ---
        agent11 = RatingReviewerAgent()
        credit_state = agent11.run(credit_state)
        _complete(agent11, credit_state)

        return credit_state


def run_full_underwriting(
    company: str,
    ticker: str,
    loan_amount: float,
    loan_tenor: str,
    loan_type: str,
    on_agent_complete=None,
) -> dict:
    """Entry point: create state + run pre-disbursement pipeline."""
    credit_state = create_credit_state(
        company=company,
        ticker=ticker,
        loan_amount=loan_amount,
        loan_tenor=loan_tenor,
        loan_type=loan_type,
    )
    orchestrator = PreDisbursementOrchestrator()
    return orchestrator.run(credit_state, on_agent_complete=on_agent_complete)
