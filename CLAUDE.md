# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all tests
pytest tests/ -v

# Run a single test
pytest tests/test_agents.py::test_create_credit_state_structure -v

# Run the Streamlit UI (legacy)
streamlit run streamlit_app.py

# Run the FastAPI backend
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Required env vars:** `ANTHROPIC_API_KEY`, `FRED_API_KEY`, `FINNHUB_API_KEY`, `DATABASE_URL` (Railway Postgres — auto-injected), `YELP_API_KEY` (optional)

## Architecture

### Agent Pattern
All agents inherit from `agents/base_agent.py`. Every agent runs a Claude tool-use agentic loop via `run_agentic_loop()` or `run_agentic_loop_json()` — Claude autonomously decides which tools to call and when. The loop exits on `stop_reason == "end_turn"`. Max 10 iterations per agent; last text response is returned if limit is hit.

To add a new agent: subclass `BaseAgent`, implement `name`, `role`, and `run(credit_state)`. Register its tool set in `core/tools.py` and add a handler in `core/tool_executor.py`.

### Credit State
The `credit_state` dict (`core/credit_state.py`) is the single shared object passed through the entire pipeline. It holds all agent outputs, alerts, routing notes, and deal metadata. Never mutate it directly — use `log_agent()`, `add_alert()`, `add_routing_note()`. Agents read prior agents' outputs from this state to build on each other's work.

### Full Deal Lifecycle Coverage
CreditMind now covers all 6 stages of the private credit lifecycle:

| Stage | Agent | Endpoint |
|---|---|---|
| 1. Origination | `origination_scout.py` | `POST /api/origination-scan` |
| 2. Screening | `deal_screener.py` | `POST /api/screen-deal` |
| 3. Due Diligence | 11 DD agents | `POST /api/underwrite` |
| 4. IC Approval | `ic_committee.py` | `POST /api/ic-committee` |
| 5. Documentation | `documentation_agent.py` | `POST /api/generate-docs` |
| 6. Closing | `closing_agent.py` | `POST /api/closing-checklist` |

CP status updates via `PATCH /api/closing-checklist/{deal_id}/cp`.

### Orchestration Flow
`core/orchestrator.py` has three orchestrators:
- **`DueDiligenceOrchestrator`** — Wave 1 (4 agents, parallel via `core/parallel_runner.py`) → Wave 2 (4 agents, sequential) → IC Memo. Dynamic routing: no docs → abort; DISTRESSED health → fast-track; risk_score ≥ 75 → auto-reject; covenant breach → skip rating reviewer.
- **`DailyMonitoringOrchestrator`** — News + Sentiment + EarlyWarning in parallel per deal.
- **`QuarterlyReviewOrchestrator`** — PortfolioMonitor → CovenantCompliance → RatingReviewer sequentially.

### Tool System
Tools are defined as Claude API schemas in `core/tools.py`. Each agent gets a specific tool subset (e.g., `FINANCIAL_ANALYST_TOOLS`). `core/tool_executor.py` maps tool names to actual function calls. When adding a tool: define the schema in `tools.py`, add the execution handler in `tool_executor.py`, and add it to the relevant agent tool sets.

Tool results are capped at 3500 chars in `execute_tool()` to prevent context blowup.

### Data Sources
- `data/financial_data.py` — yfinance (income statement, balance sheet, cash flow, key metrics, company info, SEC filings)
- `data/news_data.py` — yfinance for company news; Finnhub (`/news?category=general`) for sector news with keyword filtering
- `data/macro_data.py` — FRED API (rates, spreads, GDP, VIX)
- `data/gics_taxonomy.json` — GICS sector hierarchy for mapping deals to sectors
- `data/sector_etfs.json` — sector → SPDR ETF ticker map
- `data/news_sources.json` — stress-signal keyword lists per sector

### Credit Policy
`data/credit_policy.json` — the governing policy document (fund mandate, loan parameters, concentration limits, prohibited investments, approval authority matrix, watch list criteria, covenant standards, ESG policy). This is the human-readable source of truth.

`core/credit_policy.py` — the enforcement engine. Key functions:
- `check_new_deal(deal, portfolio)` → `PolicyResult` — run before DD; returns hard blocks, escalations, warnings
- `check_existing_deal(deal)` → `PolicyResult` — run by monitoring agents for watch list triggers
- `summarize_portfolio_vs_policy(portfolio)` → dashboard dict — concentration checks across portfolio
- `get_policy_context_for_agents()` → string injected into IC committee and deal screener system prompts

The orchestrator runs `check_new_deal()` at the start of DD. Hard blocks (`HARD_BLOCK`) abort the pipeline immediately. Escalations (`ESCALATION_REQUIRED`) proceed but generate alerts and require IC approval.

Policy endpoints: `GET /api/policy`, `GET /api/policy/portfolio-compliance`, `POST /api/policy/check-deal`, `GET /api/policy/watch-list`.

### Persistent Storage
`data/db.py` is the persistence layer — SQLAlchemy Core against Railway Postgres. Three tables: `deals` (JSONB), `sector_alerts` (JSONB), `sector_scores` (int). On startup, `api/main.py` calls `init_db()`, then loads persisted state into `_portfolio`/`_sector_alerts`/`_sector_scores`. If the DB is empty (first boot), the seed portfolio is written in. Falls back silently to in-memory-only mode if `DATABASE_URL` is not set. Every mutation (`save_deal`, `save_sector_alerts`, `save_sector_scores`) is a no-op on failure — DB writes must never crash the API.

### Background Scheduler
`api/main.py` runs an APScheduler `BackgroundScheduler` registered in the FastAPI startup event. Two jobs:
- **`sector_monitoring`**: `IntervalTrigger(hours=6)` — calls `_run_sector_monitoring()` which runs 11 sectors in parallel and persists results.
- **`daily_monitoring`**: `CronTrigger(hour=2)` — calls `_run_daily_monitoring_all()` which runs `DailyMonitoringOrchestrator` for watchlist/stressed deals and any deal with active alerts (max 3 workers to respect API rate limits).

Job status is visible at `GET /api/refresh-status` in the `scheduled_jobs` field.

### Alert System
Alerts are written into `credit_state["human_alerts"]` via `add_alert()`. `core/alert_system.py` provides `get_pending_alerts()` and `resolve_alert()`. No external notifications — alerts are surfaced in the UI only.

## Team File Ownership

| Member | Owns |
|---|---|
| **Peter** | `agents/`, `core/`, sector intelligence, contagion engine |
| **John** | `api/main.py`, all FastAPI endpoints |
| **Abraham** | `frontend/`, all Next.js pages and components |
| **Jasmin** | `data/*.json`, `demo/`, `docs/` — no `.py` files |

Do not edit files outside your ownership area without coordinating with the owner. Always branch off `master` — never push directly to `master`.

## Key Conventions

- Agents output structured JSON as their final message (`run_agentic_loop_json`). The system prompt appends a JSON-only instruction automatically.
- `credit_state` keys for agent outputs follow the pattern: `financial_analysis`, `ebitda_analysis`, `credit_model`, `risk_score`, `stress_test`, etc. Check `core/credit_state.py` for the full schema before adding new keys.
- The FastAPI backend (`api/main.py`) is the production entry point — Railway deploys via `uvicorn api.main:app`. The Streamlit app is legacy.
- Demo test documents (Ducommun DCO) live in `scripts/` — use these for end-to-end pipeline testing.
