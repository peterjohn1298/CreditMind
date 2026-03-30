"""
CreditMind — Autonomous Credit Intelligence Platform
Streamlit UI: 4 tabs covering the full credit lifecycle.
"""

import streamlit as st
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from core.orchestrator import (
    run_full_underwriting,
    DailyMonitoringOrchestrator,
    QuarterlyReviewOrchestrator,
)
from core.alert_system import get_pending_alerts, get_alert_summary, resolve_alert
from outputs.credit_memo import generate_credit_memo, get_memo_header

# --- Page config ---
st.set_page_config(
    page_title="CreditMind",
    page_icon="🏦",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --- Session state init ---
if "credit_state" not in st.session_state:
    st.session_state.credit_state = None
if "agent_progress" not in st.session_state:
    st.session_state.agent_progress = []

# --- Sidebar ---
st.sidebar.title("🏦 CreditMind")
st.sidebar.caption("Autonomous Credit Intelligence Platform")
st.sidebar.markdown("---")

if st.session_state.credit_state:
    cs = st.session_state.credit_state
    st.sidebar.markdown(f"**Borrower:** {cs['company']} ({cs['ticker']})")
    st.sidebar.markdown(f"**Loan:** ${cs['loan_amount']:,.0f}")
    st.sidebar.markdown(f"**Status:** `{cs['loan_status']}`")
    if cs.get("internal_rating"):
        st.sidebar.markdown(f"**Rating:** `{cs['internal_rating']}`")
    if cs.get("live_risk_score") is not None:
        st.sidebar.markdown(f"**Live Risk Score:** `{cs['live_risk_score']}/100`")

    alerts = get_pending_alerts(cs)
    if alerts:
        st.sidebar.markdown("---")
        st.sidebar.markdown(f"**Alerts:** {len(alerts)} pending")
        for a in alerts[:3]:
            severity_icon = {"LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🟠", "CRITICAL": "🔴"}.get(a["severity"], "⚪")
            st.sidebar.markdown(f"{severity_icon} {a['trigger'][:50]}...")

# --- Tabs ---
tab1, tab2, tab3, tab4 = st.tabs([
    "Pre-Disbursement",
    "Post-Disbursement",
    "Portfolio View",
    "Alert Center",
])


# ============================================================
# TAB 1: PRE-DISBURSEMENT
# ============================================================
with tab1:
    st.header("Pre-Disbursement Underwriting")
    st.caption("Run the full underwriting pipeline. Review the credit memo. Approve or reject.")

    with st.form("underwriting_form"):
        col1, col2 = st.columns(2)
        with col1:
            company = st.text_input("Company Name", value="Apple Inc.")
            ticker = st.text_input("Ticker Symbol", value="AAPL")
            loan_amount = st.number_input(
                "Loan Amount (USD)", min_value=1_000_000, max_value=5_000_000_000,
                value=50_000_000, step=1_000_000, format="%d"
            )
        with col2:
            loan_tenor = st.selectbox("Loan Tenor", ["1 year", "2 years", "3 years", "5 years", "7 years", "10 years"])
            loan_type = st.selectbox("Loan Type", [
                "Term Loan A", "Term Loan B", "Revolving Credit Facility",
                "Bridge Loan", "Syndicated Loan", "Project Finance"
            ])

        submitted = st.form_submit_button("Run Underwriting Pipeline", type="primary")

    if submitted:
        progress_bar = st.progress(0)
        status_text = st.empty()
        agent_outputs = st.empty()

        completed_agents = []
        total_agents = 5

        def on_agent_complete(agent_name, state):
            completed_agents.append(agent_name)
            progress = len(completed_agents) / total_agents
            progress_bar.progress(progress)
            status_text.markdown(f"**Running:** {agent_name} ✓")

        with st.spinner("Running underwriting agents..."):
            credit_state = run_full_underwriting(
                company=company,
                ticker=ticker,
                loan_amount=loan_amount,
                loan_tenor=loan_tenor,
                loan_type=loan_type,
                on_agent_complete=on_agent_complete,
            )

        progress_bar.progress(1.0)
        status_text.markdown("**All agents complete.**")
        st.session_state.credit_state = credit_state
        st.success("Underwriting pipeline complete.")

    # Display results if available
    if st.session_state.credit_state:
        cs = st.session_state.credit_state

        # Agent outputs summary
        st.markdown("---")
        st.subheader("Agent Outputs")

        col1, col2, col3, col4, col5 = st.columns(5)
        agents_display = [
            ("Financial Analyst", "financial_analysis", col1),
            ("Credit Underwriter", "underwriting_metrics", col2),
            ("Industry Benchmarker", "industry_benchmark", col3),
            ("Risk Scorer", "_risk_scorer_full", col4),
            ("Covenant Structurer", "recommended_covenants", col5),
        ]

        for agent_name, key, col in agents_display:
            with col:
                data = cs.get(key)
                if data:
                    st.success(f"✓ {agent_name}")
                else:
                    st.warning(f"⏳ {agent_name}")

        # Key metrics
        st.markdown("---")
        st.subheader("Key Credit Metrics")
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Internal Rating", cs.get("internal_rating", "—"))
        col2.metric("Risk Score", f"{cs.get('risk_score', '—')}/100")

        risk_full = cs.get("_risk_scorer_full", {})
        col3.metric("Recommendation", risk_full.get("recommendation", "—"))

        dscr = cs.get("underwriting_metrics", {}).get("dscr", {}).get("value", "—")
        col4.metric("DSCR", f"{dscr}" if dscr != "—" else "—")

        # Credit Memo
        st.markdown("---")
        st.subheader("Credit Memo")

        if cs.get("credit_memo"):
            st.markdown(cs["credit_memo"])
        else:
            if st.button("Generate Credit Memo"):
                with st.spinner("Drafting credit memo..."):
                    memo = generate_credit_memo(cs)
                    st.session_state.credit_state["credit_memo"] = memo
                st.rerun()

        # Approval gate
        st.markdown("---")
        st.subheader("Loan Officer Decision")
        col1, col2, col3 = st.columns(3)

        with col1:
            if st.button("APPROVE", type="primary", use_container_width=True):
                st.session_state.credit_state["loan_status"] = "APPROVED"
                st.session_state.credit_state["approval_date"] = datetime.now().isoformat()
                st.success("Loan APPROVED. Post-disbursement monitoring activated.")

        with col2:
            if st.button("CONDITIONAL", use_container_width=True):
                st.session_state.credit_state["loan_status"] = "CONDITIONAL"
                st.warning("Conditional approval. Conditions must be met before disbursement.")

        with col3:
            if st.button("REJECT", use_container_width=True):
                st.session_state.credit_state["loan_status"] = "REJECTED"
                st.error("Loan REJECTED.")


# ============================================================
# TAB 2: POST-DISBURSEMENT
# ============================================================
with tab2:
    st.header("Post-Disbursement Monitoring")
    st.caption("Daily news intelligence, sentiment tracking, and early warning system.")

    cs = st.session_state.credit_state
    if not cs or cs.get("loan_status") not in ["APPROVED", "DISBURSED"]:
        st.info("No approved loan in session. Approve a loan in Pre-Disbursement first.")
    else:
        st.markdown(f"**Monitoring:** {cs['company']} ({cs['ticker']}) | Status: `{cs['loan_status']}`")

        if st.button("Run Daily Monitoring", type="primary"):
            with st.spinner("Running daily monitoring agents..."):
                orchestrator = DailyMonitoringOrchestrator()
                st.session_state.credit_state = orchestrator.run(cs)
            st.success("Daily monitoring complete.")

        if cs.get("sentiment_score"):
            col1, col2, col3 = st.columns(3)
            col1.metric("Sentiment", cs.get("sentiment_score", "—"))
            col2.metric("Live Risk Score", f"{cs.get('live_risk_score', '—')}/100",
                        delta=str(cs.get('live_risk_score', 0) - cs.get('risk_score', 0)))
            warnings = cs.get("early_warning_flags", [])
            col3.metric("Active Warnings", len(warnings))

        if cs.get("news_signals"):
            st.markdown("---")
            st.subheader("Latest News Analysis")
            latest = cs["news_signals"][-1]
            st.json(latest)

        if cs.get("early_warning_flags"):
            st.markdown("---")
            st.subheader("Early Warning Flags")
            for flag in cs["early_warning_flags"]:
                severity = flag.get("severity", "LOW")
                icon = {"LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🟠", "CRITICAL": "🔴"}.get(severity, "⚪")
                st.markdown(f"{icon} **{flag.get('warning_type', '')}** — {flag.get('description', '')}")


# ============================================================
# TAB 3: PORTFOLIO VIEW
# ============================================================
with tab3:
    st.header("Portfolio View")
    st.caption("Quarterly performance review, covenant compliance, and rating reassessment.")

    cs = st.session_state.credit_state
    if not cs:
        st.info("No active loan in session.")
    else:
        if st.button("Run Quarterly Review", type="primary"):
            with st.spinner("Running quarterly review agents..."):
                orchestrator = QuarterlyReviewOrchestrator()
                st.session_state.credit_state = orchestrator.run(cs)
            st.success("Quarterly review complete.")

        if cs.get("current_rating"):
            col1, col2, col3 = st.columns(3)
            col1.metric("Current Rating", cs.get("current_rating", "—"),
                        delta=f"from {cs.get('internal_rating', '—')}")
            health = cs.get("portfolio_health", {})
            col2.metric("Portfolio Health Score", health.get("portfolio_health_score", "—"))
            covenant = cs.get("covenant_status", {})
            col3.metric("Covenant Status", covenant.get("overall_compliance", "—"))

        if cs.get("portfolio_health"):
            st.subheader("Portfolio Health")
            st.json(cs["portfolio_health"])

        if cs.get("covenant_status"):
            st.subheader("Covenant Compliance")
            st.json(cs["covenant_status"])

        if cs.get("_rating_review_full"):
            st.subheader("Rating Review")
            review = cs["_rating_review_full"]
            action = review.get("rating_action", "MAINTAIN")
            action_color = {"UPGRADE": "success", "MAINTAIN": "info", "DOWNGRADE": "error", "WATCHLIST": "warning"}
            getattr(st, action_color.get(action, "info"))(
                f"Rating Action: **{action}** — {review.get('previous_rating')} → {review.get('recommended_rating')}"
            )
            st.markdown(review.get("rating_rationale", ""))


# ============================================================
# TAB 4: ALERT CENTER
# ============================================================
with tab4:
    st.header("Alert Center")
    st.caption("All pending escalations requiring human review.")

    cs = st.session_state.credit_state
    if not cs:
        st.info("No active loan in session.")
    else:
        summary = get_alert_summary(cs)
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("🔴 Critical", summary.get("CRITICAL", 0))
        col2.metric("🟠 High", summary.get("HIGH", 0))
        col3.metric("🟡 Medium", summary.get("MEDIUM", 0))
        col4.metric("🟢 Low", summary.get("LOW", 0))

        st.markdown("---")
        pending = get_pending_alerts(cs)
        if not pending:
            st.success("No pending alerts.")
        else:
            for i, alert in enumerate(pending):
                severity = alert.get("severity", "LOW")
                icon = {"LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🟠", "CRITICAL": "🔴"}.get(severity, "⚪")
                with st.expander(f"{icon} [{severity}] {alert.get('trigger', '')}", expanded=(severity == "CRITICAL")):
                    st.markdown(f"**Action Required:** {alert.get('action_required', '')}")
                    st.caption(f"Triggered: {alert.get('timestamp', '')}")
                    if st.button(f"Mark Resolved", key=f"resolve_{i}"):
                        st.session_state.credit_state = resolve_alert(cs, i, "Loan Officer")
                        st.rerun()

        if cs.get("divergence_flags"):
            st.markdown("---")
            st.subheader("Divergence Flags")
            st.caption("Cases where agents disagree — requires human judgment.")
            for flag in cs["divergence_flags"]:
                st.warning(f"⚠️ {flag.get('message', '')}")
