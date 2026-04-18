"""
Orchestrator — manages the full credit lifecycle with dynamic routing.

Due Diligence:
  Wave 1 (parallel): Financial, EBITDA, Commercial, Legal analysts
  Wave 2 (sequential): Credit Modeler, Stress Tester, Risk Scorer, Covenant Designer
  Output: IC Memo Writer

Post-Disbursement Daily:
  Parallel across portfolio: News, Sentiment, Early Warning

Post-Disbursement Quarterly:
  Parallel across portfolio: Covenant Compliance, Portfolio Monitor, Rating Reviewer

Dynamic routing:
  - No documents uploaded → abort with clear error
  - DISTRESSED financial health → skip commercial, fast-track to risk scoring
  - Risk score >= 75 → auto-reject, skip covenant design
  - Covenant breach → skip rating reviewer (already escalated)
"""

from core.credit_state import create_credit_state, log_agent, add_alert, add_routing_note
from core.parallel_runner import run_parallel_wave
from core.credit_policy import check_new_deal, check_existing_deal, get_policy_context_for_agents

from agents.financial_analyst import FinancialAnalystAgent
from agents.ebitda_analyst import EBITDAAnalystAgent
from agents.commercial_analyst import CommercialAnalystAgent
from agents.legal_analyst import LegalAnalystAgent
from agents.credit_modeler import CreditModelerAgent
from agents.stress_tester import StressTesterAgent
from agents.risk_scorer import RiskScorerAgent
from agents.covenant_structurer import CovenantStructurerAgent
from agents.ic_memo_writer import ICMemoWriterAgent

from agents.news_intelligence import NewsIntelligenceAgent
from agents.sentiment_scorer import SentimentScorerAgent
from agents.early_warning import EarlyWarningAgent
from agents.portfolio_monitor import PortfolioMonitorAgent
from agents.covenant_compliance import CovenantComplianceAgent
from agents.rating_reviewer import RatingReviewerAgent

from agents.credit_underwriter import CreditUnderwriterAgent
from agents.industry_benchmarker import IndustryBenchmarkerAgent

from agents.growth_capital_analyst import GrowthCapitalAnalystAgent
from agents.unitranche_analyst import UnitrancheAnalystAgent
from agents.mezzanine_analyst import MezzanineAnalystAgent
from agents.borrowing_base_analyst import BorrowingBaseAnalystAgent
from agents.bridge_exit_analyst import BridgeExitAnalystAgent
from agents.distressed_analyst import DistressedAnalystAgent
from agents.project_finance_analyst import ProjectFinanceAnalystAgent

from core.loan_types import (
    get_config, normalize_loan_type,
    SENIOR_SECURED, GROWTH_CAPITAL, UNITRANCHE,
    MEZZANINE, REVOLVER, BRIDGE, DISTRESSED, PROJECT_FINANCE,
)

# Map loan type → specialist agent class
_SPECIALIST_AGENTS = {
    GROWTH_CAPITAL:  GrowthCapitalAnalystAgent,
    UNITRANCHE:      UnitrancheAnalystAgent,
    MEZZANINE:       MezzanineAnalystAgent,
    REVOLVER:        BorrowingBaseAnalystAgent,
    BRIDGE:          BridgeExitAnalystAgent,
    DISTRESSED:      DistressedAnalystAgent,
    PROJECT_FINANCE: ProjectFinanceAnalystAgent,
}


class DueDiligenceOrchestrator:
    """
    Runs the full due diligence pipeline.
    Wave 1 agents run in parallel. Wave 2 agents run sequentially.
    Dynamic routing based on outputs at each stage.
    """

    def run(self, credit_state: dict, on_agent_complete=None, portfolio: dict = None) -> dict:

        def _complete(name, state):
            if on_agent_complete:
                on_agent_complete(name, state)

        # --- Resolve loan type config and inject into state ---
        raw_loan_type = credit_state.get("loan_type", SENIOR_SECURED)
        canonical     = normalize_loan_type(raw_loan_type)
        cfg           = get_config(canonical)
        credit_state["loan_type_canonical"]   = canonical
        credit_state["loan_type_config"]      = {
            "display_name":         cfg.display_name,
            "max_leverage":         cfg.max_leverage,
            "min_dscr":             cfg.min_dscr,
            "typical_spread_bps":   cfg.typical_spread_bps,
            "covenant_type":        cfg.covenant_type,
            "auto_reject_score":    cfg.auto_reject_risk_score,
            "primary_metric":       cfg.primary_metric,
            "primary_metric_label": cfg.primary_metric_label,
        }
        add_routing_note(credit_state, f"Loan type: {cfg.display_name} ({canonical})")

        # --- Policy compliance check ---
        _live_portfolio = portfolio or {}
        try:
            policy_result = check_new_deal(credit_state, _live_portfolio)
            credit_state["policy_check"] = policy_result.to_dict()
            if not policy_result.can_proceed:
                add_routing_note(credit_state, f"POLICY BLOCK: {policy_result.policy_summary}")
                for v in policy_result.hard_blocks:
                    add_alert(credit_state, trigger=v.description, severity="CRITICAL",
                              action_required=f"Policy hard block: {v.rule}. Deal cannot proceed.")
                credit_state["status"] = "POLICY_BLOCKED"
                return credit_state
            if policy_result.escalations:
                for v in policy_result.escalations:
                    add_alert(credit_state, trigger=v.description, severity="HIGH",
                              action_required=f"Policy escalation required: {v.rule}")
        except Exception:
            pass  # policy check failure must never block DD

        # --- Guard: project finance has no docs requirement (SPV) ---
        docs = credit_state.get("documents", {})
        has_docs = any(v is not None for v in docs.values())
        if not has_docs and canonical not in (PROJECT_FINANCE, DISTRESSED, BRIDGE):
            add_routing_note(credit_state, "Aborted: no documents uploaded.")
            add_alert(
                credit_state,
                trigger="No documents provided — due diligence cannot proceed",
                severity="HIGH",
                action_required="Upload at least one document (financial statements, CIM, or QoE).",
            )
            return credit_state

        # ============================================================
        # WAVE 1 — PARALLEL
        # ============================================================
        wave1_agents = []

        # Always run Financial Analyst if financials available
        if docs.get("financials"):
            wave1_agents.append(FinancialAnalystAgent())

        # EBITDA Analyst if QoE or financials available
        if docs.get("qoe") or docs.get("financials"):
            wave1_agents.append(EBITDAAnalystAgent())

        # Commercial Analyst if CIM available
        if docs.get("cim"):
            wave1_agents.append(CommercialAnalystAgent())

        # Legal Analyst if legal docs available
        if docs.get("legal"):
            wave1_agents.append(LegalAnalystAgent())

        # Industry Benchmarker: always run — uses ticker if available, else sector benchmarks
        wave1_agents.append(IndustryBenchmarkerAgent())

        if not wave1_agents:
            add_routing_note(credit_state, "No agents could run — insufficient documents.")
            return credit_state

        credit_state = run_parallel_wave(wave1_agents, credit_state, on_agent_complete)

        # Check if financial health is DISTRESSED — affects routing
        financial = credit_state.get("financial_analysis", {})
        health = financial.get("overall_financial_health", "ADEQUATE")

        if health == "DISTRESSED":
            add_routing_note(
                credit_state,
                "DISTRESSED financial health detected. Fast-tracking to risk scoring."
            )
            add_alert(
                credit_state,
                trigger=f"Borrower financial health: DISTRESSED",
                severity="HIGH",
                action_required="Heightened scrutiny required. Consider rejection.",
            )

        # ============================================================
        # WAVE 2 — SEQUENTIAL
        # ============================================================

        # Agent 5: Credit Modeler
        agent5 = CreditModelerAgent()
        credit_state = agent5.run(credit_state)
        _complete(agent5.name, credit_state)

        # Agent 6: Stress Tester
        agent6 = StressTesterAgent()
        credit_state = agent6.run(credit_state)
        _complete(agent6.name, credit_state)

        # Agent 7: Risk Scorer
        agent7 = RiskScorerAgent()
        credit_state = agent7.run(credit_state)
        _complete(agent7.name, credit_state)

        risk_score    = credit_state.get("risk_score", 50)
        reject_thresh = cfg.auto_reject_risk_score

        # Auto-reject routing: threshold varies by loan type
        if risk_score >= reject_thresh:
            add_routing_note(
                credit_state,
                f"Auto-reject path: risk score {risk_score}/100 ≥ {reject_thresh} threshold for {cfg.display_name}. Covenant design skipped."
            )
            credit_state["covenant_package"] = {
                "skipped": True,
                "reason": f"Risk score {risk_score}/100 exceeds {cfg.display_name} threshold of {reject_thresh} — deal recommended for rejection.",
            }
            _complete("Covenant Designer", credit_state)
        else:
            # Agent 8: Covenant Designer (uses loan_type_config for covenant_type)
            agent8 = CovenantStructurerAgent()
            credit_state = agent8.run(credit_state)
            _complete(agent8.name, credit_state)

        # ============================================================
        # SPECIALIST AGENT — loan-type-specific analysis
        # Runs after Wave 2 so it has risk score, covenants, and credit model
        # ============================================================
        specialist_cls = _SPECIALIST_AGENTS.get(canonical)
        if specialist_cls:
            specialist = specialist_cls()
            add_routing_note(credit_state, f"Running specialist agent: {specialist.name}")
            credit_state = specialist.run(credit_state)
            _complete(specialist.name, credit_state)

        # ============================================================
        # CREDIT UNDERWRITER — synthesizes final serviceability assessment
        # Runs after all analysis + specialist so it has the full picture
        # ============================================================
        underwriter = CreditUnderwriterAgent()
        add_routing_note(credit_state, "Running credit underwriter: final serviceability synthesis")
        credit_state = underwriter.run(credit_state)
        _complete(underwriter.name, credit_state)

        # ============================================================
        # OUTPUT: IC Memo
        # ============================================================
        memo_agent = ICMemoWriterAgent()
        credit_state = memo_agent.run(credit_state)
        _complete(memo_agent.name, credit_state)

        credit_state["status"] = "IC_REVIEW"
        return credit_state


class DailyMonitoringOrchestrator:
    """Runs daily monitoring agents in parallel for a single deal."""

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
    Runs quarterly review agents.
    Skips Rating Reviewer if covenant breach already escalated.
    """

    def run(self, credit_state: dict, on_agent_complete=None) -> dict:

        def _complete(name, state):
            if on_agent_complete:
                on_agent_complete(name, state)

        agent9 = PortfolioMonitorAgent()
        credit_state = agent9.run(credit_state)
        _complete(agent9.name, credit_state)

        agent10 = CovenantComplianceAgent()
        credit_state = agent10.run(credit_state)
        _complete(agent10.name, credit_state)

        covenant_status = credit_state.get("covenant_status", {})
        if covenant_status.get("overall_compliance") == "BREACH_DETECTED":
            add_routing_note(
                credit_state,
                "Rating Reviewer skipped: covenant breach escalated to credit committee."
            )
            _complete("Rating Reviewer", credit_state)
            return credit_state

        agent11 = RatingReviewerAgent()
        credit_state = agent11.run(credit_state)
        _complete(agent11.name, credit_state)

        return credit_state


def run_due_diligence(
    company: str,
    loan_amount: float,
    loan_tenor: str,
    loan_type: str,
    documents: dict,
    sponsor: str = None,
    deal_type: str = "sponsor_backed",
    on_agent_complete=None,
    portfolio: dict = None,
) -> dict:
    """Entry point for due diligence pipeline."""
    credit_state = create_credit_state(
        company=company,
        loan_amount=loan_amount,
        loan_tenor=loan_tenor,
        loan_type=loan_type,
        sponsor=sponsor,
        deal_type=deal_type,
    )
    credit_state["documents"] = documents
    orchestrator = DueDiligenceOrchestrator()
    return orchestrator.run(credit_state, on_agent_complete=on_agent_complete, portfolio=portfolio)


# Legacy compatibility — kept for any existing references
def run_full_underwriting(company, ticker, loan_amount, loan_tenor, loan_type,
                          sponsor=None, on_agent_complete=None, portfolio=None,
                          prefilled_application: dict = None):
    """Legacy wrapper. New code should use run_due_diligence()."""
    credit_state = run_due_diligence(
        company=company,
        loan_amount=loan_amount,
        loan_tenor=loan_tenor,
        loan_type=loan_type,
        documents={},
        sponsor=sponsor,
        on_agent_complete=on_agent_complete,
        portfolio=portfolio,
    )
    # Inject submitted application data so it persists on the deal record
    if prefilled_application:
        credit_state["prefilled_application"] = prefilled_application
        # Promote key financial fields to top-level for agent/monitoring use
        for k in ("sector", "description", "revenue_ltm", "ebitda_ltm",
                  "adj_ebitda_ltm", "total_debt_proforma", "enterprise_value",
                  "leverage_covenant", "icr_covenant", "key_risks", "esg_flags"):
            if k in prefilled_application:
                credit_state.setdefault(k, prefilled_application[k])
    return credit_state
