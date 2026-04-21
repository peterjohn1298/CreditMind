"""
Credit State — the single source of truth for a private credit deal.
Redesigned for private company underwriting: no ticker dependency,
document-based analysis, multi-wave agent architecture.
"""

import uuid
from datetime import datetime


def create_credit_state(
    company: str,
    loan_amount: float,
    loan_tenor: str,
    loan_type: str,
    sponsor: str = None,
    deal_type: str = "sponsor_backed",
) -> dict:
    return {
        # --- Identity ---
        "deal_id": str(uuid.uuid4())[:8].upper(),
        "company": company,
        "sponsor": sponsor,
        "deal_type": deal_type,          # sponsor_backed | direct
        "loan_amount": loan_amount,
        "loan_tenor": loan_tenor,
        "loan_type": loan_type,
        "created_at": datetime.now().isoformat(),
        "status": "DUE_DILIGENCE",       # DUE_DILIGENCE | IC_REVIEW | APPROVED | CONDITIONAL | REJECTED | MONITORING

        # --- Uploaded documents (raw extracted content from PDFs) ---
        "documents": {
            "financials": None,          # extracted from audited financials PDF
            "cim": None,                 # extracted from CIM PDF
            "qoe": None,                 # extracted from Quality of Earnings PDF
            "legal": None,               # extracted from legal due diligence PDF
        },

        # --- Wave 1 outputs (populated in parallel) ---
        "financial_analysis": None,      # Agent 1: FinancialAnalyst
        "ebitda_analysis": None,         # Agent 2: EBITDAAnalyst
        "commercial_analysis": None,     # Agent 3: CommercialAnalyst
        "legal_analysis": None,          # Agent 4: LegalAnalyst

        # --- Wave 2 outputs (populated sequentially) ---
        "credit_model": None,            # Agent 5: CreditModeler
        "stress_test": None,             # Agent 6: StressTester
        "risk_assessment": None,         # Agent 7: RiskScorer
        "covenant_package": None,        # Agent 8: CovenantDesigner

        # --- Derived from Wave 2 ---
        "internal_rating": None,
        "risk_score": None,
        "live_risk_score": None,

        # --- IC Memo ---
        "ic_memo": None,                 # full markdown memo
        "ic_memo_sections": {},          # structured sections for PDF

        # --- IC Decision ---
        "ic_decision": None,             # APPROVED | CONDITIONAL | REJECTED
        "ic_conditions": [],
        "ic_decision_date": None,
        "ic_decision_by": None,

        # --- Post-disbursement monitoring ---
        "loan_status": "PENDING",        # PENDING | DISBURSED | REPAID | DEFAULT | WATCHLIST
        "disbursement_date": None,
        "maturity_date": None,
        "news_signals": [],
        "sentiment_score": None,
        "sentiment_trend": [],
        "early_warning_flags": [],
        "portfolio_health": None,
        "covenant_status": None,
        "current_rating": None,
        "_rating_review_full": None,
        "rating_history": [],            # list of rating events: INITIAL | NEGATIVE_WATCH | DOWNGRADE | UPGRADE_ELIGIBLE

        # --- System ---
        "human_alerts": [],
        "divergence_flags": [],
        "agent_log": [],
        "routing_notes": [],
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
        "severity": severity,
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


def add_routing_note(credit_state: dict, note: str) -> dict:
    credit_state["routing_notes"].append({
        "note": note,
        "timestamp": datetime.now().isoformat(),
    })
    return credit_state


def record_initial_rating(credit_state: dict) -> dict:
    """Seed the first rating_history entry after underwriting assigns internal_rating."""
    rating = credit_state.get("internal_rating")
    score  = credit_state.get("risk_score")
    if not rating:
        return credit_state
    if "rating_history" not in credit_state:
        credit_state["rating_history"] = []
    # Only add if no INITIAL event exists yet
    if any(e.get("event_type") == "INITIAL" for e in credit_state["rating_history"]):
        return credit_state
    credit_state["rating_history"].append({
        "event_type":            "INITIAL",
        "from_rating":           None,
        "to_rating":             rating,
        "date":                  datetime.now().isoformat(),
        "risk_score_at_event":   score,
        "score_delta_from_baseline": 0,
        "warning_level":         "GREEN",
        "rationale":             f"Initial rating {rating} assigned at underwriting. Risk score {score}/100 reflects credit quality at disbursement.",
        "agent":                 "Risk Scorer",
        "action_required":       None,
    })
    return credit_state
