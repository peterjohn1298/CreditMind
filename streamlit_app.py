"""
CreditMind — Private Credit Intelligence Platform
Streamlit UI: Due Diligence + Portfolio Monitoring
"""

import streamlit as st
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from core.orchestrator import run_due_diligence, DailyMonitoringOrchestrator, QuarterlyReviewOrchestrator
from core.document_processor import extract_financials, extract_qoe, extract_cim, extract_legal
from core.portfolio_store import (
    add_deal, update_deal, get_deal, get_all_deals,
    get_active_deals, get_portfolio_summary, get_all_alerts, resolve_alert
)

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="CreditMind",
    page_icon="🏦",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Sidebar ───────────────────────────────────────────────────────────────────
st.sidebar.title("🏦 CreditMind")
st.sidebar.caption("Private Credit Intelligence Platform")
st.sidebar.markdown("---")

summary = get_portfolio_summary()
st.sidebar.metric("Active Loans", summary["active_loans"])
st.sidebar.metric("In Diligence", summary["in_diligence"])
st.sidebar.metric("Total Exposure", f"${summary['total_exposure']:,.0f}")

if summary["critical_alerts"] > 0:
    st.sidebar.error(f"🔴 {summary['critical_alerts']} Critical Alert(s)")
if summary["watchlist"] > 0:
    st.sidebar.warning(f"🟠 {summary['watchlist']} On Watchlist")

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4 = st.tabs([
    "📋 New Deal",
    "📊 Portfolio",
    "🔍 Deal Analysis",
    "🚨 Alert Center",
])


# ══════════════════════════════════════════════════════════════════════════════
# TAB 1: NEW DEAL — Due Diligence
# ══════════════════════════════════════════════════════════════════════════════
with tab1:
    st.header("Due Diligence Pipeline")
    st.caption(
        "Upload deal documents. Parallel agents analyze simultaneously. "
        "IC memo generated automatically."
    )

    col_left, col_right = st.columns([1, 1])

    with col_left:
        st.subheader("Deal Parameters")
        with st.form("deal_form"):
            company     = st.text_input("Company Name", placeholder="e.g. Acme Manufacturing LLC")
            sponsor     = st.text_input("PE Sponsor", placeholder="e.g. Apollo Global Management (leave blank if direct)")
            deal_type   = st.selectbox("Deal Type", ["sponsor_backed", "direct_origination"])
            loan_amount = st.number_input(
                "Loan Amount (USD)", min_value=1_000_000, max_value=2_000_000_000,
                value=75_000_000, step=5_000_000, format="%d"
            )
            loan_tenor  = st.selectbox("Tenor", ["1 year", "2 years", "3 years", "5 years", "7 years"])
            loan_type   = st.selectbox("Facility Type", [
                "First Lien Term Loan", "Second Lien Term Loan", "Unitranche",
                "Revolving Credit Facility", "Mezzanine", "Bridge Loan"
            ])
            submitted = st.form_submit_button("Run Due Diligence Pipeline", type="primary")

    with col_right:
        st.subheader("Upload Documents")
        st.caption("Upload what you have. Agents adapt to available documents.")

        fin_file  = st.file_uploader("📄 Audited Financial Statements (PDF)", type=["pdf"])
        qoe_file  = st.file_uploader("📄 Quality of Earnings Report (PDF)",   type=["pdf"])
        cim_file  = st.file_uploader("📄 Confidential Information Memo (PDF)", type=["pdf"])
        legal_file = st.file_uploader("📄 Legal Due Diligence (PDF)",          type=["pdf"])

        # Show what's loaded
        doc_status = {
            "Financial Statements": "✅" if fin_file else "—",
            "Quality of Earnings":  "✅" if qoe_file else "—",
            "CIM":                  "✅" if cim_file else "—",
            "Legal DD":             "✅" if legal_file else "—",
        }
        for doc, status in doc_status.items():
            st.markdown(f"{status} {doc}")

    # ── Run pipeline ──────────────────────────────────────────────────────────
    if submitted:
        if not company:
            st.error("Please enter a company name.")
        elif not any([fin_file, qoe_file, cim_file, legal_file]):
            st.error("Please upload at least one document.")
        else:
            st.markdown("---")
            st.subheader("Running Due Diligence Pipeline")

            # Agent progress display
            wave1_agents = ["Financial Analyst", "EBITDA Analyst", "Commercial Analyst", "Legal Analyst"]
            wave2_agents = ["Credit Modeler", "Stress Tester", "Risk Scorer", "Covenant Designer"]
            output_agent = ["IC Memo Writer"]

            progress_bar  = st.progress(0)
            status_text   = st.empty()
            wave1_cols    = st.columns(4)
            wave2_cols    = st.columns(4)
            output_col    = st.columns(1)[0]

            agent_placeholders = {}
            for i, name in enumerate(wave1_agents):
                agent_placeholders[name] = wave1_cols[i].empty()
                agent_placeholders[name].info(f"⏳ {name}")
            for i, name in enumerate(wave2_agents):
                agent_placeholders[name] = wave2_cols[i].empty()
                agent_placeholders[name].info(f"⏳ {name}")
            agent_placeholders["IC Memo Writer"] = output_col.empty()
            agent_placeholders["IC Memo Writer"].info("⏳ IC Memo Writer")

            completed = [0]
            total_agents = len(wave1_agents) + len(wave2_agents) + 1

            def on_complete(agent_name, state):
                completed[0] += 1
                progress_bar.progress(completed[0] / total_agents)
                status_text.markdown(f"**Completed:** {agent_name}")
                if agent_name in agent_placeholders:
                    agent_placeholders[agent_name].success(f"✓ {agent_name}")

            # Extract documents
            status_text.markdown("**Extracting documents...**")
            documents = {}
            try:
                if fin_file:
                    with st.spinner("Reading financial statements..."):
                        documents["financials"] = extract_financials(fin_file.read())
                if qoe_file:
                    with st.spinner("Reading QoE report..."):
                        documents["qoe"] = extract_qoe(qoe_file.read())
                if cim_file:
                    with st.spinner("Reading CIM..."):
                        documents["cim"] = extract_cim(cim_file.read())
                if legal_file:
                    with st.spinner("Reading legal DD..."):
                        documents["legal"] = extract_legal(legal_file.read())
            except Exception as e:
                st.error(f"Document extraction error: {e}")
                st.stop()

            status_text.markdown("**Documents extracted. Running agents...**")

            # Run pipeline
            try:
                credit_state = run_due_diligence(
                    company=company,
                    loan_amount=loan_amount,
                    loan_tenor=loan_tenor,
                    loan_type=loan_type,
                    documents=documents,
                    sponsor=sponsor if sponsor else None,
                    deal_type=deal_type,
                    on_agent_complete=on_complete,
                )
                progress_bar.progress(1.0)
                status_text.markdown("**Pipeline complete.**")

                deal_id = add_deal(credit_state)
                st.success(f"Due diligence complete. Deal ID: `{deal_id}`")

                # Quick metrics
                st.markdown("---")
                m1, m2, m3, m4 = st.columns(4)
                risk = credit_state.get("risk_assessment") or {}
                model = credit_state.get("credit_model") or {}
                lev = (model.get("leverage_metrics") or {})

                m1.metric("Internal Rating", credit_state.get("internal_rating", "—"))
                m2.metric("Risk Score", f"{credit_state.get('risk_score', '—')}/100")
                m3.metric("Recommendation", risk.get("recommendation", "—"))
                m4.metric("Total Leverage", f"{lev.get('total_leverage', '—')}x" if lev.get('total_leverage') else "—")

                # IC Memo preview
                if credit_state.get("ic_memo"):
                    st.markdown("---")
                    st.subheader("IC Memo")
                    with st.expander("View Full IC Memo", expanded=True):
                        st.markdown(credit_state["ic_memo"])

            except Exception as e:
                st.error(f"Pipeline error: {type(e).__name__}: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# TAB 2: PORTFOLIO
# ══════════════════════════════════════════════════════════════════════════════
with tab2:
    st.header("Portfolio Overview")
    st.caption("All active loans and deals in diligence.")

    deals = get_all_deals()

    if not deals:
        st.info("No deals in portfolio. Run a due diligence pipeline in the New Deal tab.")
    else:
        # Portfolio metrics
        m1, m2, m3, m4, m5 = st.columns(5)
        m1.metric("Total Deals", summary["total_deals"])
        m2.metric("Active Loans", summary["active_loans"])
        m3.metric("In Diligence", summary["in_diligence"])
        m4.metric("Watchlist", summary["watchlist"])
        m5.metric("Total Exposure", f"${summary['total_exposure']/1e6:.0f}M")

        st.markdown("---")

        # Deal table
        table_data = []
        for deal in deals:
            risk = deal.get("risk_assessment") or {}
            alerts = [a for a in deal.get("human_alerts", []) if not a.get("resolved")]
            table_data.append({
                "Deal ID":    deal.get("deal_id", "—"),
                "Company":    deal.get("company", "—"),
                "Sponsor":    deal.get("sponsor") or "Direct",
                "Amount":     f"${deal.get('loan_amount', 0)/1e6:.0f}M",
                "Rating":     deal.get("internal_rating", "—"),
                "Risk Score": f"{deal.get('risk_score', '—')}/100" if deal.get("risk_score") else "—",
                "Status":     deal.get("status", "—"),
                "Alerts":     len(alerts),
            })

        st.dataframe(table_data, use_container_width=True)

        # Monitoring controls for active deals
        active = get_active_deals()
        if active:
            st.markdown("---")
            st.subheader("Portfolio Monitoring")
            selected = st.selectbox(
                "Select deal to monitor",
                options=[d["deal_id"] for d in active],
                format_func=lambda x: next((d["company"] for d in active if d["deal_id"] == x), x)
            )

            col1, col2 = st.columns(2)
            with col1:
                if st.button("Run Daily Monitoring", type="primary"):
                    deal = get_deal(selected)
                    try:
                        with st.spinner("Running daily monitoring..."):
                            updated = DailyMonitoringOrchestrator().run(deal)
                        update_deal(updated)
                        st.success("Daily monitoring complete.")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Monitoring error: {e}")

            with col2:
                if st.button("Run Quarterly Review"):
                    deal = get_deal(selected)
                    try:
                        with st.spinner("Running quarterly review..."):
                            updated = QuarterlyReviewOrchestrator().run(deal)
                        update_deal(updated)
                        st.success("Quarterly review complete.")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Review error: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# TAB 3: DEAL ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════
with tab3:
    st.header("Deal Analysis")

    deals = get_all_deals()
    if not deals:
        st.info("No deals yet. Run due diligence in the New Deal tab.")
    else:
        selected_id = st.selectbox(
            "Select Deal",
            options=[d["deal_id"] for d in deals],
            format_func=lambda x: next(
                (f"{d['company']} ({x})" for d in deals if d["deal_id"] == x), x
            )
        )

        deal = get_deal(selected_id)
        if deal:
            st.markdown(f"**{deal['company']}** | {deal.get('loan_type')} | "
                        f"${deal['loan_amount']:,.0f} | {deal.get('loan_tenor')}")

            analysis_tabs = st.tabs([
                "Financial", "EBITDA", "Commercial", "Legal",
                "Credit Model", "Stress Test", "Risk", "Covenants", "IC Memo", "Monitoring"
            ])

            def _show(data, label=""):
                if not data:
                    st.info(f"No {label} data available.")
                elif isinstance(data, dict) and data.get("error"):
                    st.warning(data["error"])
                else:
                    st.json(data)

            with analysis_tabs[0]:
                st.subheader("Financial Analysis")
                _show(deal.get("financial_analysis"), "financial analysis")

            with analysis_tabs[1]:
                st.subheader("EBITDA Analysis")
                ebitda = deal.get("ebitda_analysis") or {}
                if ebitda and not ebitda.get("error"):
                    c1, c2, c3 = st.columns(3)
                    c1.metric("Reported EBITDA", f"${ebitda.get('reported_ebitda', 0):,.0f}" if ebitda.get('reported_ebitda') else "—")
                    c2.metric("Conservative EBITDA", f"${ebitda.get('conservative_adjusted_ebitda', 0):,.0f}" if ebitda.get('conservative_adjusted_ebitda') else "—")
                    c3.metric("EBITDA Quality", ebitda.get("adjustment_quality_score", "—"))
                _show(ebitda, "EBITDA analysis")

            with analysis_tabs[2]:
                st.subheader("Commercial Analysis")
                _show(deal.get("commercial_analysis"), "commercial analysis")

            with analysis_tabs[3]:
                st.subheader("Legal Analysis")
                _show(deal.get("legal_analysis"), "legal analysis")

            with analysis_tabs[4]:
                st.subheader("Credit Model")
                model = deal.get("credit_model") or {}
                if model and not model.get("error"):
                    lev = model.get("leverage_metrics") or {}
                    cov = model.get("coverage_metrics") or {}
                    c1, c2, c3, c4 = st.columns(4)
                    c1.metric("Total Leverage", f"{lev.get('total_leverage', '—')}x")
                    c2.metric("Senior Leverage", f"{lev.get('senior_leverage', '—')}x")
                    c3.metric("DSCR", f"{cov.get('dscr', '—')}x")
                    c4.metric("Interest Coverage", f"{cov.get('interest_coverage', '—')}x")
                _show(model, "credit model")

            with analysis_tabs[5]:
                st.subheader("Stress Test")
                stress = deal.get("stress_test") or {}
                if stress and not stress.get("error"):
                    scenarios = stress.get("scenarios", {})
                    if scenarios:
                        rows = []
                        for name, s in scenarios.items():
                            rows.append({
                                "Scenario":      name.replace("_", " ").title(),
                                "Revenue Chg":   s.get("revenue_assumption", "—"),
                                "EBITDA":        s.get("ebitda", "—"),
                                "Leverage":      f"{s.get('total_leverage', '—')}x",
                                "DSCR":          f"{s.get('dscr', '—')}x",
                                "Result":        s.get("pass_fail", "—"),
                            })
                        st.dataframe(rows, use_container_width=True)

                    breakeven = stress.get("break_even_analysis", {})
                    if breakeven:
                        st.markdown("**Break-Even Analysis**")
                        st.json(breakeven)

            with analysis_tabs[6]:
                st.subheader("Risk Assessment")
                risk = deal.get("risk_assessment") or {}
                if risk:
                    c1, c2, c3 = st.columns(3)
                    c1.metric("Rating", deal.get("internal_rating", "—"))
                    c2.metric("Risk Score", f"{deal.get('risk_score', '—')}/100")
                    c3.metric("Recommendation", risk.get("recommendation", "—"))
                _show(risk, "risk assessment")

            with analysis_tabs[7]:
                st.subheader("Covenant Package")
                covenants = deal.get("covenant_package") or {}
                if covenants and not covenants.get("skipped"):
                    pricing = covenants.get("pricing") or {}
                    if pricing:
                        st.markdown(f"**Pricing:** {pricing.get('all_in_rate', '—')} "
                                    f"({pricing.get('spread_bps', '—')}bps over {pricing.get('benchmark', 'SOFR')})")
                    financial_covenants = covenants.get("financial_covenants", [])
                    if financial_covenants:
                        st.markdown("**Financial Covenants**")
                        cov_rows = []
                        for c in financial_covenants:
                            cov_rows.append({
                                "Covenant":        c.get("name", "—"),
                                "Threshold":       c.get("proposed_threshold", "—"),
                                "Current Level":   c.get("base_case_level", "—"),
                                "Headroom":        f"{c.get('headroom_from_base_case_pct', '—')}%",
                                "Testing":         c.get("testing_frequency", "quarterly"),
                            })
                        st.dataframe(cov_rows, use_container_width=True)
                elif covenants.get("skipped"):
                    st.warning(covenants.get("reason", "Covenant design skipped."))
                else:
                    st.info("No covenant package generated yet.")

            with analysis_tabs[8]:
                st.subheader("IC Memo")
                memo = deal.get("ic_memo")
                if memo:
                    st.markdown(memo)

                    # IC Decision buttons
                    st.markdown("---")
                    st.subheader("Investment Committee Decision")
                    d1, d2, d3 = st.columns(3)
                    with d1:
                        if st.button("APPROVE", type="primary", use_container_width=True):
                            deal["ic_decision"] = "APPROVED"
                            deal["ic_decision_date"] = datetime.now().isoformat()
                            deal["loan_status"] = "DISBURSED"
                            deal["status"] = "MONITORING"
                            update_deal(deal)
                            st.success("Deal APPROVED. Loan moved to active monitoring.")
                            st.rerun()
                    with d2:
                        if st.button("CONDITIONAL", use_container_width=True):
                            deal["ic_decision"] = "CONDITIONAL"
                            deal["ic_decision_date"] = datetime.now().isoformat()
                            update_deal(deal)
                            st.warning("Conditional approval recorded.")
                            st.rerun()
                    with d3:
                        if st.button("REJECT", use_container_width=True):
                            deal["ic_decision"] = "REJECTED"
                            deal["ic_decision_date"] = datetime.now().isoformat()
                            deal["status"] = "REJECTED"
                            update_deal(deal)
                            st.error("Deal REJECTED.")
                            st.rerun()
                else:
                    st.info("IC memo not yet generated.")

            with analysis_tabs[9]:
                st.subheader("Post-Disbursement Monitoring")
                if deal.get("sentiment_score"):
                    c1, c2, c3 = st.columns(3)
                    c1.metric("Sentiment", deal.get("sentiment_score", "—"))
                    c2.metric("Live Risk Score", f"{deal.get('live_risk_score', '—')}/100")
                    c3.metric("Active Warnings", len(deal.get("early_warning_flags", [])))

                if deal.get("early_warning_flags"):
                    for flag in deal["early_warning_flags"]:
                        sev = flag.get("severity", "LOW")
                        icon = {"LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🟠", "CRITICAL": "🔴"}.get(sev, "⚪")
                        st.markdown(f"{icon} **{flag.get('warning_type', '')}** — {flag.get('description', '')}")

                if deal.get("current_rating"):
                    st.markdown(f"**Current Rating:** {deal.get('current_rating')} "
                                f"(original: {deal.get('internal_rating', '—')})")

                if deal.get("covenant_status"):
                    st.subheader("Covenant Compliance")
                    st.json(deal["covenant_status"])


# ══════════════════════════════════════════════════════════════════════════════
# TAB 4: ALERT CENTER
# ══════════════════════════════════════════════════════════════════════════════
with tab4:
    st.header("Alert Center")
    st.caption("All pending escalations across the portfolio requiring human action.")

    all_alerts = get_all_alerts()

    if not all_alerts:
        st.success("No pending alerts across portfolio.")
    else:
        severity_counts = {}
        for a in all_alerts:
            s = a.get("severity", "LOW")
            severity_counts[s] = severity_counts.get(s, 0) + 1

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("🔴 Critical", severity_counts.get("CRITICAL", 0))
        c2.metric("🟠 High",     severity_counts.get("HIGH", 0))
        c3.metric("🟡 Medium",   severity_counts.get("MEDIUM", 0))
        c4.metric("🟢 Low",      severity_counts.get("LOW", 0))

        st.markdown("---")

        for i, alert in enumerate(all_alerts):
            sev  = alert.get("severity", "LOW")
            icon = {"LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🟠", "CRITICAL": "🔴"}.get(sev, "⚪")
            company_name = alert.get("_company", "Unknown")
            deal_id = alert.get("_deal_id", "")

            with st.expander(
                f"{icon} [{sev}] {company_name} — {alert.get('trigger', '')[:80]}",
                expanded=(sev == "CRITICAL")
            ):
                st.markdown(f"**Action Required:** {alert.get('action_required', '')}")
                st.caption(f"Deal: {deal_id} | Triggered: {alert.get('timestamp', '')}")

                if st.button("Mark Resolved", key=f"resolve_{i}_{deal_id}"):
                    # Find alert index within this deal
                    deal = get_deal(deal_id)
                    if deal:
                        deal_alerts = [a for a in deal.get("human_alerts", []) if not a.get("resolved")]
                        for j, da in enumerate(deal.get("human_alerts", [])):
                            if (da.get("trigger") == alert.get("trigger") and
                                    da.get("timestamp") == alert.get("timestamp")):
                                resolve_alert(deal_id, j)
                                break
                    st.rerun()
