# CreditMind

**Autonomous Credit Intelligence Platform** — AI agents that manage the full credit lifecycle of a corporate loan.

[![CI](https://github.com/peterjohn1298/CreditMind/actions/workflows/ci.yml/badge.svg)](https://github.com/peterjohn1298/CreditMind/actions/workflows/ci.yml)

---

## What It Does

You input a company name and loan parameters. CreditMind runs 11 autonomous agents that do the work of a 3-person credit team — underwriter, portfolio manager, and research analyst.

---

## Architecture

```
Input: Company + Loan Parameters
        ↓
PRE-DISBURSEMENT (Agents 1–5)
  Agent 1: Financial Analyst        → ratios, trends, 3-year analysis
  Agent 2: Credit Underwriter       → DSCR, debt capacity, FCF-to-debt
  Agent 3: Industry Benchmarker     → peer comparison, sector risk
  Agent 4: Risk Scorer              → internal rating (AAA→D), PD score
  Agent 5: Covenant Structurer      → covenants, collateral, pricing
        ↓
  Credit Memo → Human Approval Gate
        ↓
POST-DISBURSEMENT DAILY (Agents 6–8)
  Agent 6: News Intelligence        → material event detection
  Agent 7: Sentiment Scorer         → 30-day rolling sentiment trend
  Agent 8: Early Warning            → live risk score adjustment, alerts
        ↓
POST-DISBURSEMENT QUARTERLY (Agents 9–11)
  Agent 9:  Portfolio Monitor       → actual vs. underwriting model
  Agent 10: Covenant Compliance     → breach detection, headroom tracking
  Agent 11: Rating Reviewer         → upgrade/downgrade/watchlist
        ↓
Output: Credit Memo + Daily Briefings + Quarterly Reports + Escalation Alerts
```

---

## Stack

| Layer | Tool |
|---|---|
| Language | Python 3.11 |
| UI | Streamlit |
| AI | Claude API (claude-sonnet-4-6) |
| Financial Data | yfinance + SEC EDGAR |
| Macro Data | FRED API |
| CI/CD | GitHub Actions |
| Deployment | Streamlit Community Cloud |

---

## Team Branches

| Branch | Owner | Agents |
|---|---|---|
| `feature/pre-disbursement` | Peter | Agents 1–2, Credit Memo |
| `feature/risk-and-benchmarking` | Member 2 | Agents 3–4 |
| `feature/covenants-and-compliance` | Member 3 | Agents 5, 10, 11 |
| `feature/post-disbursement-daily` | Member 4 | Agents 6–8, App UI |

---

## Run Locally

```bash
git clone https://github.com/peterjohn1298/CreditMind.git
cd CreditMind
pip install -r requirements.txt
cp .env.example .env        # add your API keys
streamlit run app.py
```

## Run Tests

```bash
pytest tests/ -v
```
