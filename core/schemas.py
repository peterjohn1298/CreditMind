"""
Input/output contracts for the CreditMind pipeline.

Input contracts  — validate credit_state fields before the pipeline runs.
Output contracts — validate agent JSON outputs after each agentic loop.

Validation failures are logged to credit_state["validation_failures"] and
trigger one automatic retry of the agentic loop before continuing.
"""

from datetime import datetime

# ── Pipeline input contract ───────────────────────────────────────────────────
# Required fields in credit_state at pipeline entry and their expected types.

CREDIT_STATE_INPUT_CONTRACT: dict[str, type | tuple] = {
    "company":      str,
    "loan_amount":  (int, float),
    "loan_tenor":   str,
    "loan_type":    str,
}


# ── Agent output contracts ────────────────────────────────────────────────────
# Required top-level keys for each agent's JSON output.
# Agents not listed here have no enforced contract (pass-through).

AGENT_OUTPUT_CONTRACTS: dict[str, list[str]] = {
    "Financial Analyst": [
        "revenue_trend",
        "profitability",
        "liquidity",
        "leverage",
        "cash_flow_quality",
        "audit_flags",
        "overall_financial_health",
    ],
    "EBITDA Analyst": [
        "reported_ebitda",
        "add_back_analysis",
        "conservative_adjusted_ebitda",
        "base_adjusted_ebitda",
        "ebitda_conclusion",
    ],
    "Commercial Analyst": [
        "business_quality_score",
        "market_assessment",
        "revenue_quality",
        "competitive_position",
        "overall_commercial_verdict",
    ],
    "Legal Analyst": [
        "capital_structure",
        "security_package",
        "litigation_assessment",
        "overall_legal_risk",
    ],
    "Credit Modeler": [
        "ebitda_used",
        "ebitda_basis",
        "leverage_metrics",
        "coverage_metrics",
        "model_assessment",
    ],
}


# ── Validators ────────────────────────────────────────────────────────────────

def validate_credit_state_input(credit_state: dict) -> tuple[bool, list[str]]:
    """
    Validate pipeline input fields.

    Returns (is_valid, errors) where errors is a list of human-readable
    failure descriptions (empty when is_valid is True).
    """
    errors: list[str] = []
    for field, expected_type in CREDIT_STATE_INPUT_CONTRACT.items():
        val = credit_state.get(field)
        if val is None:
            errors.append(f"missing required input field '{field}'")
            continue
        if not isinstance(val, expected_type):
            type_name = (
                expected_type.__name__
                if hasattr(expected_type, "__name__")
                else str(expected_type)
            )
            errors.append(
                f"input field '{field}' expected {type_name}, got {type(val).__name__}"
            )
            continue
        if isinstance(val, str) and not val.strip():
            errors.append(f"input field '{field}' is an empty string")
        elif isinstance(val, (int, float)) and val <= 0:
            errors.append(f"input field '{field}' must be positive, got {val}")
    return len(errors) == 0, errors


def validate_agent_output(agent_name: str, output: dict) -> tuple[bool, list[str]]:
    """
    Validate agent JSON output against its registered contract.

    Returns (is_valid, errors).  Agents with no registered contract always pass.
    """
    if not isinstance(output, dict):
        return False, [f"output is not a dict (got {type(output).__name__})"]
    if output.get("parse_error"):
        return False, ["output has parse_error — JSON could not be decoded"]

    required = AGENT_OUTPUT_CONTRACTS.get(agent_name)
    if not required:
        return True, []   # no contract for this agent

    missing = [k for k in required if k not in output]
    if missing:
        return False, [f"missing required output field '{k}'" for k in missing]
    return True, []
