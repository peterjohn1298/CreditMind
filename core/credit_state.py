"""
Shared Credit State — the single source of truth passed between all agents.
Every agent reads from and writes to this object.
"""

from datetime import datetime


def create_credit_state(
    company: str,
    ticker: str,
    loan_amount: float,
    loan_tenor: str,
    loan_type: str,
) -> dict:
    return {
        # --- Identity ---
        "company": company,
        "ticker": ticker,
        "loan_amount": loan_amount,
        "loan_tenor": loan_tenor,
        "loan_type": loan_type,
        "created_at": datetime.now().isoformat(),

        # --- Pre-Disbursement (populated sequentially by Agents 1-5) ---
        "financial_analysis": None,       # Agent 1: FinancialAnalyst
        "underwriting_metrics": None,     # Agent 2: CreditUnderwriter
        "industry_benchmark": None,       # Agent 3: IndustryBenchmarker
        "risk_score": None,               # Agent 4: RiskScorer (0-100)
        "internal_rating": None,          # Agent 4: e.g. "BB+"
        "recommended_covenants": None,    # Agent 5: CovenantStructurer
        "credit_memo": None,              # Final pre-approval output

        # --- Loan Status ---
        "loan_status": "PENDING",         # PENDING | APPROVED | CONDITIONAL | REJECTED | DISBURSED
        "approval_date": None,
        "approved_by": None,

        # --- Post-Disbursement (updated continuously by Agents 6-11) ---
        "news_signals": [],               # Agent 6: NewsIntelligence
        "sentiment_score": None,          # Agent 7: SentimentScorer
        "sentiment_trend": [],            # rolling 30-day
        "early_warning_flags": [],        # Agent 8: EarlyWarning
        "live_risk_score": None,          # Agent 8: drifts from original
        "portfolio_health": None,         # Agent 9: PortfolioMonitor
        "covenant_status": None,          # Agent 10: CovenantCompliance
        "current_rating": None,           # Agent 11: RatingReviewer

        # --- System ---
        "divergence_flags": [],           # when agents disagree
        "human_alerts": [],               # escalations pending human review
        "agent_log": [],                  # execution trace
    }


def log_agent(credit_state: dict, agent_name: str, status: str = "completed") -> dict:
    credit_state["agent_log"].append({
        "agent": agent_name,
        "timestamp": datetime.now().isoformat(),
        "status": status,
    })
    return credit_state


def add_alert(credit_state: dict, trigger: str, severity: str, action_required: str) -> dict:
    credit_state["human_alerts"].append({
        "trigger": trigger,
        "severity": severity,          # LOW | MEDIUM | HIGH | CRITICAL
        "action_required": action_required,
        "timestamp": datetime.now().isoformat(),
        "resolved": False,
    })
    return credit_state


def add_divergence(credit_state: dict, message: str) -> dict:
    credit_state["divergence_flags"].append({
        "message": message,
        "timestamp": datetime.now().isoformat(),
    })
    return credit_state
