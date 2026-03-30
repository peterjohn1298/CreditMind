"""
CreditMind Test Suite
Tests data layer, credit state, orchestrator, and agent interfaces.
"""

import pytest
from unittest.mock import patch, MagicMock
from core.credit_state import create_credit_state, log_agent, add_alert, add_divergence
from core.alert_system import get_pending_alerts, get_alert_summary, resolve_alert


# ============================================================
# Credit State Tests
# ============================================================

def test_create_credit_state_structure():
    state = create_credit_state("Apple Inc.", "AAPL", 50_000_000, "5 years", "Term Loan A")
    assert state["company"] == "Apple Inc."
    assert state["ticker"] == "AAPL"
    assert state["loan_amount"] == 50_000_000
    assert state["loan_status"] == "PENDING"
    assert state["financial_analysis"] is None
    assert state["human_alerts"] == []
    assert state["agent_log"] == []


def test_log_agent():
    state = create_credit_state("Test Corp", "TEST", 1_000_000, "1 year", "Term Loan A")
    state = log_agent(state, "Financial Analyst")
    assert len(state["agent_log"]) == 1
    assert state["agent_log"][0]["agent"] == "Financial Analyst"
    assert state["agent_log"][0]["status"] == "completed"


def test_add_alert():
    state = create_credit_state("Test Corp", "TEST", 1_000_000, "1 year", "Term Loan A")
    state = add_alert(state, "Test trigger", "HIGH", "Review required")
    assert len(state["human_alerts"]) == 1
    assert state["human_alerts"][0]["severity"] == "HIGH"
    assert state["human_alerts"][0]["resolved"] is False


def test_add_divergence():
    state = create_credit_state("Test Corp", "TEST", 1_000_000, "1 year", "Term Loan A")
    state = add_divergence(state, "Agents disagree on risk level")
    assert len(state["divergence_flags"]) == 1
    assert "disagree" in state["divergence_flags"][0]["message"]


def test_multiple_alerts():
    state = create_credit_state("Test Corp", "TEST", 1_000_000, "1 year", "Term Loan A")
    state = add_alert(state, "Alert 1", "LOW", "Action 1")
    state = add_alert(state, "Alert 2", "CRITICAL", "Action 2")
    state = add_alert(state, "Alert 3", "HIGH", "Action 3")
    assert len(state["human_alerts"]) == 3


# ============================================================
# Alert System Tests
# ============================================================

def test_get_pending_alerts_sorted_by_severity():
    state = create_credit_state("Test Corp", "TEST", 1_000_000, "1 year", "Term Loan A")
    state = add_alert(state, "Low alert", "LOW", "Action")
    state = add_alert(state, "Critical alert", "CRITICAL", "Action")
    state = add_alert(state, "High alert", "HIGH", "Action")

    pending = get_pending_alerts(state)
    assert pending[0]["severity"] == "CRITICAL"
    assert pending[1]["severity"] == "HIGH"
    assert pending[2]["severity"] == "LOW"


def test_resolve_alert():
    state = create_credit_state("Test Corp", "TEST", 1_000_000, "1 year", "Term Loan A")
    state = add_alert(state, "Test alert", "HIGH", "Action required")
    state = resolve_alert(state, 0, "Loan Officer")
    assert state["human_alerts"][0]["resolved"] is True
    assert state["human_alerts"][0]["resolved_by"] == "Loan Officer"


def test_get_alert_summary():
    state = create_credit_state("Test Corp", "TEST", 1_000_000, "1 year", "Term Loan A")
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
    state = create_credit_state("Test Corp", "TEST", 1_000_000, "1 year", "Term Loan A")
    state = add_alert(state, "Test alert", "HIGH", "Action")
    state = resolve_alert(state, 0, "Officer")
    pending = get_pending_alerts(state)
    assert len(pending) == 0


# ============================================================
# Data Layer Tests (no API calls — tests structure only)
# ============================================================

def test_credit_state_loan_fields():
    state = create_credit_state("Tesla Inc.", "TSLA", 100_000_000, "3 years", "Revolving Credit Facility")
    assert state["loan_amount"] == 100_000_000
    assert state["loan_tenor"] == "3 years"
    assert state["loan_type"] == "Revolving Credit Facility"
    assert state["loan_status"] == "PENDING"


def test_credit_state_post_disbursement_defaults():
    state = create_credit_state("Test", "TST", 1_000_000, "1 year", "Term Loan A")
    assert state["news_signals"] == []
    assert state["sentiment_trend"] == []
    assert state["early_warning_flags"] == []
    assert state["live_risk_score"] is None
    assert state["current_rating"] is None


def test_credit_state_can_be_updated():
    state = create_credit_state("Test", "TST", 1_000_000, "1 year", "Term Loan A")
    state["risk_score"] = 45
    state["internal_rating"] = "BB+"
    state["loan_status"] = "APPROVED"
    assert state["risk_score"] == 45
    assert state["internal_rating"] == "BB+"
    assert state["loan_status"] == "APPROVED"
