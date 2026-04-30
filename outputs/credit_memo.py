"""
Credit Memo Generator — produces the final pre-approval credit memo.
Synthesizes all 5 pre-disbursement agent outputs into a structured document.
"""

import json
import os
from datetime import datetime
from anthropic import Anthropic


def generate_credit_memo(credit_state: dict) -> str:
    """
    Use Claude to write a professional credit memo from the credit_state.
    Returns memo as a formatted markdown string.
    """
    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    company = credit_state["company"]
    ticker = credit_state["ticker"]
    loan_amount = credit_state["loan_amount"]
    loan_tenor = credit_state["loan_tenor"]
    loan_type = credit_state["loan_type"]
    rating = credit_state.get("internal_rating", "N/A")
    risk_score = credit_state.get("risk_score", "N/A")
    risk_full = credit_state.get("_risk_scorer_full", {})

    # Pull specialist analysis for the loan type — included in memo if present
    specialist_section = _build_specialist_section(credit_state, loan_type)

    prompt = f"""
Write a professional credit memo for a loan committee in the format used by commercial banks.

BORROWER: {company} ({ticker})
LOAN REQUEST: ${loan_amount:,.0f} | {loan_tenor} | {loan_type}
INTERNAL RATING: {rating}
RISK SCORE: {risk_score}/100

FINANCIAL ANALYSIS:
{json.dumps(credit_state.get('financial_analysis', {}), indent=2, default=str)}

UNDERWRITING METRICS:
{json.dumps(credit_state.get('underwriting_metrics', {}), indent=2, default=str)}

INDUSTRY BENCHMARK:
{json.dumps(credit_state.get('industry_benchmark', {}), indent=2, default=str)}

RISK ASSESSMENT:
{json.dumps(risk_full, indent=2, default=str)}

RECOMMENDED COVENANTS:
{json.dumps(credit_state.get('recommended_covenants', {}), indent=2, default=str)}
{specialist_section}
Write the memo in this structure:
1. EXECUTIVE SUMMARY (recommendation + one paragraph rationale)
2. BORROWER OVERVIEW (company, sector, business description)
3. FINANCIAL ANALYSIS (key metrics, trends, strengths/weaknesses)
4. LOAN-TYPE SPECIFIC ANALYSIS ({loan_type} — use the specialist section above)
5. CREDIT ASSESSMENT (key metrics for this loan type, serviceability)
6. INDUSTRY & MARKET POSITION (peer comparison, macro context)
7. RISK FACTORS (key risks and mitigants — specific to {loan_type})
8. LOAN STRUCTURE & COVENANTS (proposed terms, covenants, pricing)
9. RECOMMENDATION (APPROVE / CONDITIONAL APPROVAL / REJECT with conditions)

Use professional banking language. Be specific with numbers. Be concise but thorough.
Section 4 must use the loan-type-specific framework — not generic EBITDA leverage for growth capital,
not corporate analysis for project finance, etc.
"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    memo_text = response.content[0].text
    credit_state["credit_memo"] = memo_text
    return memo_text


def _build_specialist_section(credit_state: dict, loan_type: str) -> str:
    """
    Returns a formatted string block with loan-type-specific specialist analysis
    for inclusion in the credit memo prompt.
    """
    lt = loan_type.lower()
    lines = []

    if "growth" in lt or ("term" in lt and not credit_state.get("sponsor")):
        gc = credit_state.get("growth_capital_analysis", {})
        saas = credit_state.get("saas_kpis", {})
        if gc or saas:
            lines.append("\nGROWTH CAPITAL SPECIALIST ANALYSIS (ARR/NRR/SaaS KPIs):")
            if saas:
                lines.append(json.dumps(saas, indent=2, default=str))
            if gc.get("overall_growth_capital_assessment"):
                lines.append(f"Summary: {gc['overall_growth_capital_assessment']}")
            if gc.get("cash_runway_analysis"):
                lines.append(f"Cash Runway: {json.dumps(gc['cash_runway_analysis'], indent=2, default=str)}")

    elif "distressed" in lt or "dip" in lt:
        dist = credit_state.get("distressed_analysis", {})
        if dist:
            lines.append("\nDISTRESSED SPECIALIST ANALYSIS (Recovery Waterfall / Restructuring):")
            if dist.get("recovery_waterfall"):
                lines.append(f"Recovery Waterfall: {json.dumps(dist['recovery_waterfall'], indent=2, default=str)}")
            if dist.get("restructuring_path_analysis"):
                lines.append(f"Restructuring Path: {json.dumps(dist['restructuring_path_analysis'], indent=2, default=str)}")
            if dist.get("overall_distressed_assessment"):
                lines.append(f"Summary: {dist['overall_distressed_assessment']}")

    elif "project" in lt or "infrastructure" in lt:
        pf = credit_state.get("project_finance_analysis", {})
        if pf:
            lines.append("\nPROJECT FINANCE SPECIALIST ANALYSIS (DSCR / Offtake / Construction):")
            if pf.get("dscr_analysis"):
                lines.append(f"DSCR Analysis: {json.dumps(pf['dscr_analysis'], indent=2, default=str)}")
            if pf.get("offtake_analysis"):
                lines.append(f"Offtake: {json.dumps(pf['offtake_analysis'], indent=2, default=str)}")
            if pf.get("construction_risk"):
                lines.append(f"Construction Risk: {json.dumps(pf['construction_risk'], indent=2, default=str)}")
            if pf.get("overall_project_finance_assessment"):
                lines.append(f"Summary: {pf['overall_project_finance_assessment']}")

    elif "mezz" in lt or "subordinat" in lt or "mezzanine" in lt:
        mezz = credit_state.get("mezzanine_analysis", {})
        if mezz:
            lines.append("\nMEZZANINE SPECIALIST ANALYSIS (EV / Recovery / PIK / Warrants):")
            if mezz.get("recovery_waterfall"):
                lines.append(f"Recovery Waterfall: {json.dumps(mezz['recovery_waterfall'], indent=2, default=str)}")
            if mezz.get("pik_compounding_analysis"):
                lines.append(f"PIK Compounding: {json.dumps(mezz['pik_compounding_analysis'], indent=2, default=str)}")
            if mezz.get("overall_mezzanine_assessment"):
                lines.append(f"Summary: {mezz['overall_mezzanine_assessment']}")

    elif "bridge" in lt:
        bridge = credit_state.get("bridge_exit_analysis", {})
        if bridge:
            lines.append("\nBRIDGE SPECIALIST ANALYSIS (Exit Certainty / Extension Risk):")
            if bridge.get("exit_analysis"):
                lines.append(f"Exit Analysis: {json.dumps(bridge['exit_analysis'], indent=2, default=str)}")
            if bridge.get("interim_cash_flow"):
                lines.append(f"Interim Cash Flow: {json.dumps(bridge['interim_cash_flow'], indent=2, default=str)}")
            if bridge.get("overall_bridge_assessment"):
                lines.append(f"Summary: {bridge['overall_bridge_assessment']}")

    elif "revolver" in lt or "abl" in lt or "rcf" in lt:
        bb = credit_state.get("borrowing_base_analysis", {})
        if bb:
            lines.append("\nABL / REVOLVER SPECIALIST ANALYSIS (Borrowing Base / Collateral):")
            if bb.get("borrowing_base_calculation"):
                lines.append(f"Borrowing Base: {json.dumps(bb['borrowing_base_calculation'], indent=2, default=str)}")
            if bb.get("borrowing_base_stress_tests"):
                lines.append(f"Stress Tests: {json.dumps(bb['borrowing_base_stress_tests'], indent=2, default=str)}")
            if bb.get("overall_revolver_assessment"):
                lines.append(f"Summary: {bb['overall_revolver_assessment']}")

    elif "unitranche" in lt:
        ut = credit_state.get("unitranche_analysis", {})
        if ut:
            lines.append("\nUNITRANCHE SPECIALIST ANALYSIS (Blended Pricing / FO-LO / AAL):")
            if ut.get("blended_pricing"):
                lines.append(f"Blended Pricing: {json.dumps(ut['blended_pricing'], indent=2, default=str)}")
            if ut.get("fo_lo_structure"):
                lines.append(f"FO/LO Structure: {json.dumps(ut['fo_lo_structure'], indent=2, default=str)}")
            if ut.get("overall_unitranche_assessment"):
                lines.append(f"Summary: {ut['overall_unitranche_assessment']}")

    return "\n".join(lines) if lines else ""


def get_memo_header(credit_state: dict) -> dict:
    """Return structured header data for memo display."""
    return {
        "company": credit_state.get("company"),
        "ticker": credit_state.get("ticker"),
        "loan_amount": credit_state.get("loan_amount"),
        "loan_tenor": credit_state.get("loan_tenor"),
        "loan_type": credit_state.get("loan_type"),
        "rating": credit_state.get("internal_rating"),
        "risk_score": credit_state.get("risk_score"),
        "recommendation": credit_state.get("_risk_scorer_full", {}).get("recommendation", "PENDING"),
        "date": datetime.now().strftime("%B %d, %Y"),
    }
