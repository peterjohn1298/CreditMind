"""
Alert System — manages human escalation logic and alert formatting.
"""

from datetime import datetime


SEVERITY_ORDER = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}

SEVERITY_COLOR = {
    "LOW": "🟢",
    "MEDIUM": "🟡",
    "HIGH": "🟠",
    "CRITICAL": "🔴",
}


def get_pending_alerts(credit_state: dict) -> list:
    """Return all unresolved human alerts, sorted by severity."""
    alerts = [a for a in credit_state.get("human_alerts", []) if not a.get("resolved", False)]
    return sorted(alerts, key=lambda x: SEVERITY_ORDER.get(x.get("severity", "LOW"), 0), reverse=True)


def resolve_alert(credit_state: dict, index: int, resolved_by: str) -> dict:
    """Mark a specific alert as resolved."""
    alerts = credit_state.get("human_alerts", [])
    if 0 <= index < len(alerts):
        alerts[index]["resolved"] = True
        alerts[index]["resolved_by"] = resolved_by
        alerts[index]["resolved_at"] = datetime.now().isoformat()
    return credit_state


def get_alert_summary(credit_state: dict) -> dict:
    """Return a summary of alert counts by severity."""
    pending = get_pending_alerts(credit_state)
    summary = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "total": len(pending)}
    for alert in pending:
        severity = alert.get("severity", "LOW")
        summary[severity] = summary.get(severity, 0) + 1
    return summary


def format_alert_for_display(alert: dict) -> str:
    """Format a single alert for human-readable display."""
    severity = alert.get("severity", "LOW")
    icon = SEVERITY_COLOR.get(severity, "⚪")
    return (
        f"{icon} [{severity}] {alert.get('trigger', '')}\n"
        f"   Action: {alert.get('action_required', '')}\n"
        f"   Time: {alert.get('timestamp', '')}"
    )
