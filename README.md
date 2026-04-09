# CreditMind

**Autonomous Credit Intelligence Platform** — AI agents that manage the full credit lifecycle for private credit lenders.

[![CI](https://github.com/peterjohn1298/CreditMind/actions/workflows/ci.yml/badge.svg)](https://github.com/peterjohn1298/CreditMind/actions/workflows/ci.yml)
[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://creditmind-kujyspvs8dn5skfdiwcglw.streamlit.app/)

---

## What It Does

Upload deal documents (financial statements, QoE, CIM, legal DD) and set loan parameters. CreditMind runs 11 autonomous AI agents that replicate the work of a full private credit team — from initial due diligence through ongoing portfolio monitoring.

Target users: Private credit funds (direct lending, unitranche, mezzanine) managing mid-market corporate loan portfolios.

---

## Architecture

```
INPUT: PDF Documents + Loan Parameters
              ↓
┌─────────────────────────────────────────────────┐
│  PHASE 1 — DUE DILIGENCE                        │
│                                                 │
│  Wave 1 (parallel):                             │
│    Agent 1: Financial Analyst                   │
│    Agent 2: EBITDA Analyst (QoE validation)     │
│    Agent 3: Commercial Analyst (CIM review)     │
│    Agent 4: Legal Analyst                       │
│                    ↓                            │
│  Wave 2 (sequential):                           │
│    Agent 5: Credit Modeler                      │
│    Agent 6: Stress Tester                       │
│    Agent 7: Risk Scorer → auto-reject if ≥75   │
│    Agent 8: Covenant Designer                   │
│                    ↓                            │
│    Output: IC Memo Writer (full IC memo)        │
└─────────────────────────────────────────────────┘
              ↓
        Human IC Review Gate
              ↓
┌─────────────────────────────────────────────────┐
│  PHASE 2 — PORTFOLIO MONITORING                 │
│                                                 │
│  Daily (parallel):                              │
│    Agent 9:  News Intelligence                  │
│    Agent 10: Sentiment Scorer                   │
│    Agent 11: Early Warning System               │
│                                                 │
│  Quarterly (sequential):                        │
│    Agent 12: Portfolio Monitor                  │
│    Agent 13: Covenant Compliance                │
│    Agent 14: Rating Reviewer                    │
└─────────────────────────────────────────────────┘
              ↓
OUTPUT: IC Memo + Daily Briefings + Quarterly Reports + Escalation Alerts
```

### Dynamic Routing
- No documents → pipeline aborts immediately
- DISTRESSED financial health → adds HIGH alert, fast-tracks to risk scoring
- Risk score ≥ 75 → auto-reject path, covenant design skipped
- Covenant breach detected → rating reviewer skipped, escalated to credit committee

---

## Stack

| Layer | Technology |
|---|---|
| Language | Python 3.11 |
| UI | Streamlit |
| AI | Claude API (claude-sonnet-4-6) with tool use |
| Document Parsing | Claude Document API + pypdf text extraction |
| Macro Data | FRED API |
| News Data | NewsAPI |
| CI/CD | GitHub Actions |
| Deployment | Streamlit Community Cloud |

---

## Data Pipeline

```
PDF Upload → document_processor.py
    ├── Small PDFs (<500KB): Claude Document API (native)
    └── Large PDFs (≥500KB): pypdf text extraction → smart truncation
                                  → financial_mode: jumps to Item 8

Macro Data → data/macro_data.py → FRED API (rates, spreads, GDP)
News Data  → data/news_data.py  → NewsAPI (company + macro signals)
```

---

## Project Structure

```
creditmind/
├── agents/          # 14 AI agents (financial, EBITDA, legal, risk, etc.)
├── core/            # orchestrator, credit state, document processor, tools
├── data/            # financial, macro, and news data fetchers
├── outputs/         # credit memo formatter
├── scripts/         # PDF generators + test documents (Ducommun DCO)
├── tests/           # pytest test suite
├── streamlit_app.py # main UI
└── requirements.txt
```

---

## Run Locally

```bash
git clone https://github.com/peterjohn1298/CreditMind.git
cd CreditMind
pip install -r requirements.txt
cp .env.example .env   # add ANTHROPIC_API_KEY
streamlit run streamlit_app.py
```

## Run Tests

```bash
pytest tests/ -v
```

---

## Demo Documents (Ducommun Incorporated — DCO)

Test documents are included in `scripts/` for end-to-end pipeline testing:

| Document | File | Description |
|---|---|---|
| Financial Statements | `ducommun_annual_report_2025.pdf` | FY2024 Annual Report (5.3MB) |
| Quality of Earnings | `ducommun_qoe_report.pdf` | Synthetic QoE — $91.3M adj. EBITDA |
| CIM | `ducommun_cim.pdf` | Synthetic CIM — $150M TLB deal |

Deal parameters: Ducommun Inc · $150M · 5yr · First Lien Term Loan · Sponsor: KKR
