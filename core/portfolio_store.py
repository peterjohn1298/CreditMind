"""
Portfolio Store — manages multiple active deals in Streamlit session state.
Provides CRUD operations for the deal portfolio.
"""

import streamlit as st
from datetime import datetime


def _init():
    if "portfolio" not in st.session_state:
        st.session_state.portfolio = {}


def add_deal(credit_state: dict) -> str:
    _init()
    deal_id = credit_state["deal_id"]
    st.session_state.portfolio[deal_id] = credit_state
    return deal_id


def update_deal(credit_state: dict):
    _init()
    deal_id = credit_state["deal_id"]
    st.session_state.portfolio[deal_id] = credit_state


def get_deal(deal_id: str) -> dict:
    _init()
    return st.session_state.portfolio.get(deal_id)


def get_all_deals() -> list:
    _init()
    return list(st.session_state.portfolio.values())


def get_active_deals() -> list:
    """Deals that have been disbursed and are under monitoring."""
    return [
        d for d in get_all_deals()
        if d.get("loan_status") in ["DISBURSED", "MONITORING"]
    ]


def get_portfolio_summary() -> dict:
    deals = get_all_deals()
    active = get_active_deals()

    total_exposure = sum(d.get("loan_amount", 0) for d in active)
    watchlist = [d for d in active if d.get("loan_status") == "WATCHLIST" or
                 any(f.get("severity") in ["HIGH", "CRITICAL"]
                     for f in d.get("early_warning_flags", []))]
    all_alerts = []
    for d in deals:
        all_alerts.extend([a for a in d.get("human_alerts", []) if not a.get("resolved")])

    return {
        "total_deals":      len(deals),
        "active_loans":     len(active),
        "in_diligence":     len([d for d in deals if d.get("status") == "DUE_DILIGENCE"]),
        "watchlist":        len(watchlist),
        "total_exposure":   total_exposure,
        "pending_alerts":   len(all_alerts),
        "critical_alerts":  len([a for a in all_alerts if a.get("severity") == "CRITICAL"]),
    }


def get_all_alerts() -> list:
    """Return all unresolved alerts across entire portfolio, sorted by severity."""
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    all_alerts = []
    for deal in get_all_deals():
        for alert in deal.get("human_alerts", []):
            if not alert.get("resolved"):
                alert["_company"] = deal.get("company", "Unknown")
                alert["_deal_id"] = deal.get("deal_id", "")
                all_alerts.append(alert)
    return sorted(all_alerts, key=lambda a: severity_order.get(a.get("severity", "LOW"), 3))


def resolve_alert(deal_id: str, alert_index: int, resolved_by: str = "Loan Officer"):
    deal = get_deal(deal_id)
    if deal and alert_index < len(deal.get("human_alerts", [])):
        deal["human_alerts"][alert_index]["resolved"] = True
        deal["human_alerts"][alert_index]["resolved_by"] = resolved_by
        deal["human_alerts"][alert_index]["resolved_at"] = datetime.now().isoformat()
        update_deal(deal)
