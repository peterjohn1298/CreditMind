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

Write the memo in this structure:
1. EXECUTIVE SUMMARY (recommendation + one paragraph rationale)
2. BORROWER OVERVIEW (company, sector, business description)
3. FINANCIAL ANALYSIS (key metrics, trends, strengths/weaknesses)
4. CREDIT ASSESSMENT (DSCR, debt capacity, serviceability)
5. INDUSTRY & MARKET POSITION (peer comparison, macro context)
6. RISK FACTORS (key risks and mitigants)
7. LOAN STRUCTURE & COVENANTS (proposed terms, covenants, pricing)
8. RECOMMENDATION (APPROVE / CONDITIONAL APPROVAL / REJECT with conditions)

Use professional banking language. Be specific with numbers. Be concise but thorough.
"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    memo_text = response.content[0].text
    credit_state["credit_memo"] = memo_text
    return memo_text


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
