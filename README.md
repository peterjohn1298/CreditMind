# CreditMind

Autonomous Credit Intelligence Platform — AI agents that manage the full credit lifecycle.

## Architecture
- **Pre-Disbursement:** 5 agents (Financial Analyst → Credit Underwriter → Industry Benchmarker → Risk Scorer → Covenant Structurer)
- **Post-Disbursement Daily:** 3 agents (News Intelligence → Sentiment Scorer → Early Warning)
- **Post-Disbursement Quarterly:** 3 agents (Portfolio Monitor → Covenant Compliance → Rating Reviewer)

## Stack
Python · Streamlit · Claude API · yfinance · SEC EDGAR · FRED

## Run locally
```bash
pip install -r requirements.txt
streamlit run app.py
```
