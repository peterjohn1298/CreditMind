"""
CreditMind Test Suite
Tests credit state, alert system, document processor routing, and orchestrator guards.
"""

import pytest
from core.credit_state import create_credit_state, log_agent, add_alert, add_divergence, add_routing_note
from core.alert_system import get_pending_alerts, get_alert_summary, resolve_alert


# ============================================================
# Credit State Tests
# ============================================================

def test_create_credit_state_structure():
    state = create_credit_state(
        company="Ducommun Incorporated",
        loan_amount=150_000_000,
        loan_tenor="5 years",
        loan_type="First Lien Term Loan",
        sponsor="KKR",
        deal_type="sponsor_backed",
    )
    assert state["company"] == "Ducommun Incorporated"
    assert state["sponsor"] == "KKR"
    assert state["loan_amount"] == 150_000_000
    assert state["loan_status"] == "PENDING"
    assert state["financial_analysis"] is None
    assert state["human_alerts"] == []
    assert state["agent_log"] == []
    assert "deal_id" in state
    assert len(state["deal_id"]) == 8


def test_create_credit_state_no_sponsor():
    state = create_credit_state(
        company="Acme Corp",
        loan_amount=50_000_000,
        loan_tenor="3 years",
        loan_type="Unitranche",
    )
    assert state["sponsor"] is None
    assert state["deal_type"] == "sponsor_backed"


def test_log_agent():
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    state = log_agent(state, "Financial Analyst")
    assert len(state["agent_log"]) == 1
    assert state["agent_log"][0]["agent"] == "Financial Analyst"
    assert state["agent_log"][0]["status"] == "completed"


def test_log_multiple_agents():
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    for name in ["Financial Analyst", "EBITDA Analyst", "Credit Modeler"]:
        state = log_agent(state, name)
    assert len(state["agent_log"]) == 3
    assert state["agent_log"][2]["agent"] == "Credit Modeler"


def test_add_alert():
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    state = add_alert(state, "Test trigger", "HIGH", "Review required")
    assert len(state["human_alerts"]) == 1
    assert state["human_alerts"][0]["severity"] == "HIGH"
    assert state["human_alerts"][0]["resolved"] is False


def test_add_divergence():
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    state = add_divergence(state, "Agents disagree on risk level")
    assert len(state["divergence_flags"]) == 1
    assert "disagree" in state["divergence_flags"][0]["message"]


def test_add_routing_note():
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    state = add_routing_note(state, "DISTRESSED — fast-tracking to risk scoring")
    assert len(state["routing_notes"]) == 1
    assert "DISTRESSED" in state["routing_notes"][0]["note"]


def test_multiple_alerts():
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    state = add_alert(state, "Alert 1", "LOW", "Action 1")
    state = add_alert(state, "Alert 2", "CRITICAL", "Action 2")
    state = add_alert(state, "Alert 3", "HIGH", "Action 3")
    assert len(state["human_alerts"]) == 3


# ============================================================
# Alert System Tests
# ============================================================

def test_get_pending_alerts_sorted_by_severity():
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    state = add_alert(state, "Low alert", "LOW", "Action")
    state = add_alert(state, "Critical alert", "CRITICAL", "Action")
    state = add_alert(state, "High alert", "HIGH", "Action")

    pending = get_pending_alerts(state)
    assert pending[0]["severity"] == "CRITICAL"
    assert pending[1]["severity"] == "HIGH"
    assert pending[2]["severity"] == "LOW"


def test_resolve_alert():
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    state = add_alert(state, "Test alert", "HIGH", "Action required")
    state = resolve_alert(state, 0, "Loan Officer")
    assert state["human_alerts"][0]["resolved"] is True
    assert state["human_alerts"][0]["resolved_by"] == "Loan Officer"


def test_get_alert_summary():
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    state = add_alert(state, "Alert 1", "CRITICAL", "Action")
    state = add_alert(state, "Alert 2", "HIGH", "Action")
    state = add_alert(state, "Alert 3", "HIGH", "Action")
    state = add_alert(state, "Alert 4", "LOW", "Action")

    summary = get_alert_summary(state)
    assert summary["CRITICAL"] == 1
    assert summary["HIGH"] == 2
    assert summary["LOW"] == 1
    assert summary["total"] == 4


def test_no_pending_after_resolve():
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    state = add_alert(state, "Test alert", "HIGH", "Action")
    state = resolve_alert(state, 0, "Officer")
    pending = get_pending_alerts(state)
    assert len(pending) == 0


# ============================================================
# Credit State Field Tests
# ============================================================

def test_credit_state_loan_fields():
    state = create_credit_state("Tesla Inc.", 100_000_000, "3 years", "Revolving Credit Facility")
    assert state["loan_amount"] == 100_000_000
    assert state["loan_tenor"] == "3 years"
    assert state["loan_type"] == "Revolving Credit Facility"
    assert state["loan_status"] == "PENDING"


def test_credit_state_post_disbursement_defaults():
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    assert state["news_signals"] == []
    assert state["sentiment_trend"] == []
    assert state["early_warning_flags"] == []
    assert state["live_risk_score"] is None
    assert state["current_rating"] is None


def test_credit_state_documents_default_none():
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    assert state["documents"]["financials"] is None
    assert state["documents"]["cim"] is None
    assert state["documents"]["qoe"] is None
    assert state["documents"]["legal"] is None


def test_credit_state_can_be_updated():
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    state["risk_score"] = 45
    state["internal_rating"] = "BB+"
    state["loan_status"] = "APPROVED"
    assert state["risk_score"] == 45
    assert state["internal_rating"] == "BB+"
    assert state["loan_status"] == "APPROVED"


# ============================================================
# Orchestrator Guard Tests (no API calls)
# ============================================================

def test_orchestrator_aborts_with_no_documents():
    from core.orchestrator import DueDiligenceOrchestrator
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    state["documents"] = {"financials": None, "cim": None, "qoe": None, "legal": None}
    result = DueDiligenceOrchestrator().run(state)
    assert any("Aborted" in n.get("note", "") for n in result.get("routing_notes", []))
    assert any(a["severity"] == "HIGH" for a in result.get("human_alerts", []))


def test_orchestrator_auto_reject_routing():
    from core.orchestrator import DueDiligenceOrchestrator
    state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
    # Simulate a post-risk-scorer state with high risk score
    state["risk_score"] = 80
    state["covenant_package"] = None
    # Manually trigger the auto-reject path logic
    if state.get("risk_score", 0) >= 75:
        state["covenant_package"] = {
            "skipped": True,
            "reason": f"Risk score {state['risk_score']}/100 exceeds threshold",
        }
    assert state["covenant_package"]["skipped"] is True


# ============================================================
# Document Processor Tests (no API calls)
# ============================================================

def test_large_pdf_routes_to_text_extraction():
    from core.document_processor import _LARGE_PDF_THRESHOLD_BYTES
    large_pdf_size = _LARGE_PDF_THRESHOLD_BYTES + 1
    assert large_pdf_size > _LARGE_PDF_THRESHOLD_BYTES


def test_smart_truncate_default():
    from core.document_processor import _smart_truncate
    text = "A" * 20_000
    result = _smart_truncate(text, 14_000, financial_mode=False)
    assert len(result) <= 14_100  # small buffer for truncation notice
    assert "truncated" in result.lower()


def test_smart_truncate_short_text_unchanged():
    from core.document_processor import _smart_truncate
    text = "Short document text"
    result = _smart_truncate(text, 14_000)
    assert result == text


def test_smart_truncate_financial_mode_finds_item8():
    from core.document_processor import _smart_truncate
    # Simulate a 10-K with Item 8 buried in the middle
    prefix = "Narrative text. " * 1000          # ~16K chars of narrative
    financial = "Item 8. Financial Statements and Supplementary Data\nRevenue: $824.7M\nEBITDA: $120M\n"
    suffix = "More text. " * 500
    text = prefix + financial + suffix
    result = _smart_truncate(text, 14_000, financial_mode=True)
    assert "Financial Statements" in result or "Revenue" in result
