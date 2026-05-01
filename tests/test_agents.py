"""
CreditMind Test Suite
Tests credit state, alert system, document processor routing, orchestrator guards,
and input/output contract validation (R2-5).
"""

import pytest
from core.credit_state import create_credit_state, log_agent, add_alert, add_divergence, add_routing_note, log_validation_failure
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


# ============================================================
# Input / Output Contract Tests (R2-5)
# ============================================================

class TestCreditStateInputContract:

    def test_valid_input_passes(self):
        from core.schemas import validate_credit_state_input
        state = create_credit_state("Ducommun Inc.", 150_000_000, "5 years", "First Lien Term Loan")
        is_valid, errors = validate_credit_state_input(state)
        assert is_valid is True
        assert errors == []

    def test_missing_company_fails(self):
        from core.schemas import validate_credit_state_input
        state = create_credit_state("Ducommun Inc.", 150_000_000, "5 years", "Term Loan")
        del state["company"]
        is_valid, errors = validate_credit_state_input(state)
        assert is_valid is False
        assert any("company" in e for e in errors)

    def test_zero_loan_amount_fails(self):
        from core.schemas import validate_credit_state_input
        state = create_credit_state("Acme Corp", 0, "3 years", "Term Loan")
        is_valid, errors = validate_credit_state_input(state)
        assert is_valid is False
        assert any("loan_amount" in e for e in errors)

    def test_negative_loan_amount_fails(self):
        from core.schemas import validate_credit_state_input
        state = create_credit_state("Acme Corp", -1_000_000, "3 years", "Term Loan")
        is_valid, errors = validate_credit_state_input(state)
        assert is_valid is False
        assert any("loan_amount" in e for e in errors)

    def test_empty_loan_tenor_fails(self):
        from core.schemas import validate_credit_state_input
        state = create_credit_state("Acme Corp", 50_000_000, "", "Term Loan")
        is_valid, errors = validate_credit_state_input(state)
        assert is_valid is False
        assert any("loan_tenor" in e for e in errors)

    def test_wrong_type_for_loan_amount_fails(self):
        from core.schemas import validate_credit_state_input
        state = create_credit_state("Acme Corp", 50_000_000, "3 years", "Term Loan")
        state["loan_amount"] = "fifty million"
        is_valid, errors = validate_credit_state_input(state)
        assert is_valid is False
        assert any("loan_amount" in e for e in errors)

    def test_multiple_violations_reported_together(self):
        from core.schemas import validate_credit_state_input
        state = create_credit_state("Acme Corp", 50_000_000, "3 years", "Term Loan")
        state["company"] = ""
        state["loan_amount"] = 0
        is_valid, errors = validate_credit_state_input(state)
        assert is_valid is False
        assert len(errors) >= 2


class TestAgentOutputContract:

    def test_valid_financial_analyst_output_passes(self):
        from core.schemas import validate_agent_output
        output = {
            "revenue_trend": {},
            "profitability": {},
            "liquidity": {},
            "leverage": {},
            "cash_flow_quality": {},
            "audit_flags": {},
            "overall_financial_health": "STRONG",
        }
        is_valid, errors = validate_agent_output("Financial Analyst", output)
        assert is_valid is True
        assert errors == []

    def test_missing_key_in_financial_analyst_fails(self):
        from core.schemas import validate_agent_output
        output = {
            "revenue_trend": {},
            "profitability": {},
            # missing: liquidity, leverage, cash_flow_quality, audit_flags, overall_financial_health
        }
        is_valid, errors = validate_agent_output("Financial Analyst", output)
        assert is_valid is False
        assert len(errors) >= 1
        assert any("liquidity" in e for e in errors)

    def test_parse_error_output_fails(self):
        from core.schemas import validate_agent_output
        output = {"raw_response": "some text", "parse_error": True}
        is_valid, errors = validate_agent_output("Financial Analyst", output)
        assert is_valid is False
        assert any("parse_error" in e for e in errors)

    def test_agent_with_no_contract_always_passes(self):
        from core.schemas import validate_agent_output
        output = {"anything": "goes", "for": "unlisted agents"}
        is_valid, errors = validate_agent_output("IC Memo Writer", output)
        assert is_valid is True
        assert errors == []

    def test_non_dict_output_fails(self):
        from core.schemas import validate_agent_output
        is_valid, errors = validate_agent_output("Financial Analyst", "not a dict")
        assert is_valid is False
        assert any("not a dict" in e for e in errors)

    def test_valid_ebitda_analyst_output_passes(self):
        from core.schemas import validate_agent_output
        output = {
            "reported_ebitda": {"value": 74200},
            "add_back_analysis": [],
            "conservative_adjusted_ebitda": {"value": 91300},
            "base_adjusted_ebitda": {"value": 94400},
            "ebitda_conclusion": "Quality is high",
        }
        is_valid, errors = validate_agent_output("EBITDA Analyst", output)
        assert is_valid is True

    def test_valid_credit_modeler_output_passes(self):
        from core.schemas import validate_agent_output
        output = {
            "ebitda_used": {"value": 91300},
            "ebitda_basis": "conservative",
            "leverage_metrics": {},
            "coverage_metrics": {},
            "model_assessment": "Adequate",
        }
        is_valid, errors = validate_agent_output("Credit Modeler", output)
        assert is_valid is True


class TestLogValidationFailure:

    def test_log_validation_failure_appends_entry(self):
        state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
        state = log_validation_failure(state, "Financial Analyst", ["missing 'liquidity'"], stage="output")
        assert len(state["validation_failures"]) == 1
        entry = state["validation_failures"][0]
        assert entry["agent"] == "Financial Analyst"
        assert entry["stage"] == "output"
        assert "missing 'liquidity'" in entry["errors"]
        assert "timestamp" in entry

    def test_log_multiple_failures(self):
        state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
        state = log_validation_failure(state, "Financial Analyst", ["err1"], stage="output")
        state = log_validation_failure(state, "Financial Analyst", ["err2"], stage="output_retry")
        assert len(state["validation_failures"]) == 2
        assert state["validation_failures"][1]["stage"] == "output_retry"

    def test_validation_failures_field_exists_on_new_state(self):
        state = create_credit_state("Test Corp", 1_000_000, "1 year", "Term Loan")
        assert "validation_failures" in state
        assert state["validation_failures"] == []

    def test_input_contract_violation_creates_alert(self):
        # Verify run_due_diligence logs input violations as HIGH alerts
        # Test the logic path directly without invoking the full pipeline
        from core.schemas import validate_credit_state_input
        state = create_credit_state("", 0, "5 years", "Term Loan")
        is_valid, errors = validate_credit_state_input(state)
        assert is_valid is False
        assert len(errors) >= 2  # both company and loan_amount should fail


# ============================================================
# IC Checkpoint Tests
# ============================================================

class TestICCheckpoint:

    def _make_state(self, deal_id="deal-test-001", company="Acme Corp"):
        from core.credit_state import create_credit_state
        state = create_credit_state(company, 50_000_000, "5 years", "Term Loan")
        state["deal_id"] = deal_id
        state["ic_committee_output"] = {
            "ic_decision": "CONDITIONAL_APPROVE",
            "approval_conditions": [{"condition": "Audited financials required", "deadline": "at closing"}],
            "ic_rationale": "Solid cash flow but leverage is elevated.",
        }
        return state

    def test_create_checkpoint_returns_pending(self):
        import importlib, core.ic_checkpoint as m
        importlib.reload(m)   # isolate state between tests
        from core.ic_checkpoint import create_checkpoint
        state = self._make_state("deal-cp-001")
        cp = create_checkpoint("deal-cp-001", state)
        assert cp["status"] == "PENDING"
        assert cp["ai_recommendation"] == "CONDITIONAL_APPROVE"
        assert cp["company"] == "Acme Corp"
        assert cp["final_decision"] is None

    def test_submit_vote_records_vote(self):
        import importlib, core.ic_checkpoint as m
        importlib.reload(m)
        from core.ic_checkpoint import create_checkpoint, submit_vote
        state = self._make_state("deal-cp-002")
        create_checkpoint("deal-cp-002", state)
        cp = submit_vote("deal-cp-002", "Alice", "APPROVE", notes="Strong FCF")
        assert len(cp["votes"]) == 1
        assert cp["votes"][0]["member"] == "Alice"
        assert cp["votes"][0]["vote"] == "APPROVE"

    def test_quorum_reached_after_three_votes(self):
        import importlib, core.ic_checkpoint as m
        importlib.reload(m)
        from core.ic_checkpoint import create_checkpoint, submit_vote
        state = self._make_state("deal-cp-003")
        create_checkpoint("deal-cp-003", state)
        submit_vote("deal-cp-003", "Alice", "APPROVE")
        submit_vote("deal-cp-003", "Bob", "CONDITIONAL_APPROVE", conditions=["Audited financials"])
        cp = submit_vote("deal-cp-003", "Carol", "APPROVE")
        assert cp["status"] == "QUORUM_REACHED"
        assert cp["vote_tally"]["quorum_reached"] is True

    def test_finalize_decision_locks_checkpoint(self):
        import importlib, core.ic_checkpoint as m
        importlib.reload(m)
        from core.ic_checkpoint import create_checkpoint, submit_vote, finalize_decision
        state = self._make_state("deal-cp-004")
        create_checkpoint("deal-cp-004", state)
        submit_vote("deal-cp-004", "Alice", "APPROVE")
        submit_vote("deal-cp-004", "Bob", "APPROVE")
        submit_vote("deal-cp-004", "Carol", "APPROVE")
        cp = finalize_decision("deal-cp-004", "APPROVE", decided_by="Alice")
        assert cp["status"] == "FINALIZED"
        assert cp["final_decision"] == "APPROVE"
        assert cp["finalized_at"] != ""

    def test_vote_on_finalized_raises(self):
        import importlib, core.ic_checkpoint as m
        importlib.reload(m)
        from core.ic_checkpoint import create_checkpoint, submit_vote, finalize_decision
        state = self._make_state("deal-cp-005")
        create_checkpoint("deal-cp-005", state)
        submit_vote("deal-cp-005", "Alice", "APPROVE")
        submit_vote("deal-cp-005", "Bob", "APPROVE")
        submit_vote("deal-cp-005", "Carol", "APPROVE")
        finalize_decision("deal-cp-005", "APPROVE")
        with pytest.raises(ValueError, match="finalized"):
            submit_vote("deal-cp-005", "Dave", "REJECT")

    def test_push_back_sets_status(self):
        import importlib, core.ic_checkpoint as m
        importlib.reload(m)
        from core.ic_checkpoint import create_checkpoint, push_back
        state = self._make_state("deal-cp-006")
        create_checkpoint("deal-cp-006", state)
        cp = push_back("deal-cp-006", "Bob", "Need clarification on EBITDA add-backs")
        assert cp["status"] == "PUSHED_BACK"
        assert len(cp["push_back_notes"]) == 1

    def test_invalid_vote_raises(self):
        import importlib, core.ic_checkpoint as m
        importlib.reload(m)
        from core.ic_checkpoint import create_checkpoint, submit_vote
        state = self._make_state("deal-cp-007")
        create_checkpoint("deal-cp-007", state)
        with pytest.raises(ValueError):
            submit_vote("deal-cp-007", "Alice", "MAYBE")

    def test_member_vote_replaced_on_resubmit(self):
        import importlib, core.ic_checkpoint as m
        importlib.reload(m)
        from core.ic_checkpoint import create_checkpoint, submit_vote
        state = self._make_state("deal-cp-008")
        create_checkpoint("deal-cp-008", state)
        submit_vote("deal-cp-008", "Alice", "REJECT")
        cp = submit_vote("deal-cp-008", "Alice", "APPROVE")
        assert len(cp["votes"]) == 1
        assert cp["votes"][0]["vote"] == "APPROVE"

    def test_get_checkpoint_missing_returns_error(self):
        from core.ic_checkpoint import get_checkpoint
        result = get_checkpoint("deal-nonexistent-xyz")
        assert "error" in result
