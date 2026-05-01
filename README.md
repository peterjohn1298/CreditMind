# CreditMind

**AI-Native Private Credit Intelligence Platform** — autonomous AI agents managing the full credit lifecycle for private credit funds.

[![CI](https://github.com/peterjohn1298/CreditMind/actions/workflows/ci.yml/badge.svg)](https://github.com/peterjohn1298/CreditMind/actions/workflows/ci.yml)

---

## What It Does

CreditMind replaces the manual workflows of a private credit team — origination screening, full underwriting, post-disbursement monitoring, quarterly valuation marks, and LP reporting — with AI agents that run autonomously on a live portfolio of 50 companies.

**Target users:** Private credit funds (direct lending, unitranche, mezzanine) managing mid-market corporate loan portfolios up to $10B AUM.

---

## Live Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel (Next.js) | Set via `NEXT_PUBLIC_API_URL` |
| Backend API | Railway (FastAPI) | Configured in Railway project settings |

The backend triggers a full sector monitoring run on every deploy. The frontend polls for completion and surfaces live AI-generated alerts automatically.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  ORIGINATION                                            │
│  Origination Scout → Deal Screener → Policy Checker     │
│  (news scan + sector check + fund mandate fit)          │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  UNDERWRITING (9 agents, sequential)                    │
│                                                         │
│  Financial Analyst  → EBITDA Analyst (add-back QA)      │
│  Credit Modeler     → Covenant Structurer               │
│  KYC / AML          → Legal Analyst                     │
│  Early Warning      → IC Committee → Term Sheet         │
└──────────────────────────┬──────────────────────────────┘
                           ↓
                   Human IC Review Gate
                           ↓
┌─────────────────────────────────────────────────────────┐
│  POST-DISBURSEMENT MONITORING                           │
│                                                         │
│  Daily (per company):                                   │
│    News Intelligence · Sentiment Scorer · Early Warning │
│                                                         │
│  Daily (per sector — 11 sectors sequentially):          │
│    News Intelligence (sector) · Early Warning (sector)  │
│                                                         │
│  Quarterly (per company):                               │
│    Portfolio Monitor · Covenant Compliance              │
│    Rating Reviewer · Valuation Agent                    │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  REPORTING                                              │
│  LP Reporting Agent → ILPA RT 2.0 + Performance +      │
│  Capital Call / Distribution Notices                    │
└─────────────────────────────────────────────────────────┘
```

### Dynamic Routing
- Risk score ≥ 75 at underwriting → auto-reject, covenant design skipped
- Covenant breach detected → immediate escalation, rating review fast-tracked
- Early Warning RED/BLACK → CRITICAL alert, rating downgrade executed automatically
- Shadow default signals (PIK toggle, covenant waiver, LME) → flagged as pre-default, HIGH/CRITICAL severity

---

## Key Features

### Origination
- Live news scan on any company using Finnhub
- Sector stress check against current portfolio concentration
- Fund mandate policy fit check before analyst time is spent

### Underwriting
- 9-agent sequential pipeline producing a full credit file
- EBITDA forensics: conservative / base / bull scenarios, add-back validation
- IC Committee deliberation with conditions and final terms
- Term sheet generation with red lines and concession map
- Closing CP tracker with funds flow

### Portfolio Management
- 50-company live portfolio with real-time risk scores and internal ratings
- Policy Compliance Banner: sector concentration, sponsor concentration, deployment %
- Per-deal: covenant status, rating history decision trail, upgrade/downgrade triggers

### Monitoring
- Background monitoring fires on every deploy and every manual Refresh
- Sequential sector processing (12s sleep between sectors) to respect API rate limits
- Alternative data: LinkedIn job signals + Yelp consumer sentiment for relevant sectors
- Shadow default detection: PIK additions, covenant amendments, LME maneuvers

### Sector Intelligence
- 11-sector heatmap with live stress scores
- Contagion analysis: click a sector to see which portfolio loans are exposed and by how much
- 4-agent AI analysis pipeline with written sector brief
- 6-month sector stress forecast

### Valuation
- ASC 820 Level 3 fair-value marks per loan (yield-based)
- Portfolio-wide mark inconsistency scan: divergent yields, stale comparables, rating-mark mismatches
- Mark confidence scoring

### LP Reporting
- ILPA Reporting Template 2.0: NAV bridge, cash flows, fees, capital account by LP class
- ILPA Performance Template: TVPI, DPI, RVPI, IRR (gross and net), peer benchmark
- LP Notice Generator: capital call and distribution notices, pro-rata across LP roster

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Recharts |
| Backend API | FastAPI (Python 3.11) |
| AI | Claude API — `claude-sonnet-4-6` with tool use |
| News Data | Finnhub |
| Macro Data | FRED API |
| SEC Filings | SEC EDGAR API |
| Consumer Signals | Yelp Fusion API |
| Job Signals | LinkedIn / job posting heuristics |
| CI/CD | GitHub Actions |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway |

---

## Project Structure

```
creditmind/
├── agents/              # 30+ AI agents (underwriting, monitoring, reporting)
│   ├── base_agent.py    # agentic loop with tool use + JSON extraction
│   ├── early_warning.py # daily risk surveillance + rating migration
│   ├── news_intelligence.py
│   ├── lp_reporting.py
│   ├── valuation_agent.py
│   └── ...
├── api/
│   └── main.py          # FastAPI routes + background monitoring scheduler
├── core/
│   ├── orchestrator.py  # underwriting pipeline runner
│   ├── credit_state.py  # shared deal state + alert system
│   ├── credit_policy.py # fund mandate policy engine
│   └── tools.py         # Claude tool definitions
├── data/
│   ├── macro_data.py    # FRED API
│   ├── news_data.py     # Finnhub
│   ├── sec_edgar.py     # SEC EDGAR
│   ├── consumer_signals.py  # Yelp
│   ├── jobs_data.py     # job signal data
│   ├── sector_stress.py # quantitative sector stress model
│   └── seed_portfolio.py    # 50-company demo portfolio
├── frontend/            # Next.js app
│   ├── app/             # page routes (dashboard, portfolio, monitoring, etc.)
│   ├── components/      # UI components
│   ├── context/         # CreditContext (global state + API polling)
│   └── lib/             # API client, types, utils, mock data
├── tests/               # pytest suite
└── requirements-api.txt # backend dependencies
```

---

## Run Locally

### Backend

```bash
git clone https://github.com/peterjohn1298/CreditMind.git
cd CreditMind
pip install -r requirements-api.txt
cp .env.example .env   # add ANTHROPIC_API_KEY, FINNHUB_API_KEY, FRED_API_KEY
uvicorn api.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

App runs at `http://localhost:3000`.

---

## Environment Variables

### Backend (`.env`)

| Variable | Required | Source |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | console.anthropic.com |
| `FINNHUB_API_KEY` | Yes | finnhub.io |
| `FRED_API_KEY` | Yes | fred.stlouisfed.org |
| `YELP_API_KEY` | No | yelp.com/developers |

### Frontend (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL (e.g. `https://your-app.railway.app`) |

---

## Run Tests

```bash
pytest tests/ -v
```

---

## Fund Policy Configuration

Fund mandate parameters are set in `data/credit_policy.json` and enforced by `core/credit_policy.py`. Default configuration:

- Fund size: $8B
- Max single sector concentration: 25% of NAV
- Soft warning threshold: 20% of NAV
- Max single sponsor concentration: 15%
- Max non-sponsored exposure: 20%
- Max distressed exposure: 10%

These thresholds drive the Policy Compliance Banner on the Portfolio and Dashboard pages.

---

## Monitoring Cadence

On every deploy and every manual Refresh:
1. Backend triggers `_run_sector_monitoring()` in a background thread
2. 11 sectors run sequentially (News Intelligence + Early Warning per sector)
3. 12-second sleep between sectors to respect Anthropic API rate limits
4. Frontend polls `/api/refresh/status` every 5 seconds until complete
5. Alerts, sector heatmap, and portfolio data refresh automatically

Worst-case runtime: ~4–5 minutes for a full 11-sector pass.
