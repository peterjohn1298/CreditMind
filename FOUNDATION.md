# CreditMind — Foundation Document
**Autonomous Credit Intelligence Platform**
Single source of truth for the full team. Do not duplicate this into other docs — update here.

---

## What We Are Building

CreditMind is an autonomous credit intelligence platform for private credit lenders. It runs AI agents that manage the full credit lifecycle — from initial due diligence through ongoing post-disbursement portfolio monitoring.

**Target users:** Private credit funds (direct lending, unitranche, mezzanine) managing mid-market corporate loan portfolios.

**Core value proposition:** Replace 2–8 hours of manual analyst work per deal with autonomous AI agents that run in seconds, continuously, across an entire portfolio.

---

## Core Architecture

```
INPUT: PDF Documents + Loan Parameters
              ↓
┌─────────────────────────────────────────────────┐
│  PHASE 1 — DUE DILIGENCE                        │
│                                                 │
│  Wave 1 (parallel):                             │
│    Agent 1:  Financial Analyst                  │
│    Agent 2:  EBITDA Analyst (QoE validation)    │
│    Agent 3:  Commercial Analyst (CIM review)    │
│    Agent 4:  Legal Analyst                      │
│                    ↓                            │
│  Wave 2 (sequential):                           │
│    Agent 5:  Credit Modeler                     │
│    Agent 6:  Stress Tester                      │
│    Agent 7:  Risk Scorer → auto-reject if ≥75   │
│    Agent 8:  Covenant Designer                  │
│                    ↓                            │
│    Output:   IC Memo Writer (full IC memo)      │
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

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.11 |
| UI (legacy) | Streamlit |
| Frontend (new) | Next.js 15 (App Router) |
| AI | Claude API (claude-sonnet-4-6) with tool use |
| Backend API | FastAPI (port 8000) |
| Document Parsing | Claude Document API + pypdf text extraction |
| Macro Data | FRED API |
| News Data | NewsAPI |
| CI/CD | GitHub Actions |
| Deployment | Streamlit Community Cloud (legacy) / Vercel (frontend) |

---

## Repository Structure

```
creditmind/
├── agents/          # AI agents (financial, EBITDA, legal, risk, sector monitor, etc.)
├── api/             # FastAPI backend (main.py — 12 endpoints, port 8000)
├── core/            # Orchestrator, credit state, document processor, tools
├── data/            # Data modules (Python) + JSON config files
│   ├── gics_taxonomy.json      # Full GICS hierarchy — all 11 sectors
│   ├── sector_etfs.json        # Sector → SPDR ETF mapping + SPY benchmark
│   └── news_sources.json       # Stress-signal keywords per sector
├── demo/            # Demo content for UI development and demo day
│   ├── demo_portfolio.json     # 6 sample deals, $330M total exposure
│   ├── demo_sector_event.json  # OPEC+ energy stress scenario
│   └── DEMO_SCRIPT.md          # Demo day walkthrough script
├── docs/            # Documentation and research
│   ├── DESIGN_RESEARCH.md      # UI design decisions for Abraham
│   └── COMPETITIVE_ANALYSIS.md # Bloomberg/Moody's/S&P comparison
├── frontend/        # Next.js 15 application
├── outputs/         # Credit memo formatter
├── scripts/         # PDF generators + test documents
├── tests/           # pytest test suite
├── FOUNDATION.md    # This file — single source of truth
├── streamlit_app.py # Legacy Streamlit UI
└── requirements.txt
```

---

## Sector Intelligence System

### What It Does
The Sector Intelligence System is a new capability layer (Phase 2 extension) that monitors macro and sector-level risk signals in real time and maps them to specific loans in the portfolio. It runs three agents:

| Agent | Function |
|---|---|
| **SectorMonitorAgent** | Fetches news per sector using keyword lists in `data/news_sources.json`. Pulls sector ETF price data via yfinance using the ticker map in `data/sector_etfs.json`. Computes a sector stress score (0–100) for each of the 11 GICS sectors. |
| **ContagionAgent** | When a sector stress score breaches a threshold (default: ≥ 60), runs contagion analysis across the entire portfolio. Maps each loan's `gics_sector_id` (from `data/gics_taxonomy.json`) to the stressed sector. Classifies each deal as: direct exposure, indirect (supply chain), or no exposure. |
| **SectorForecasterAgent** | Generates a 30-day sector stress forecast using ETF momentum, news velocity, and FRED macro indicators. Outputs a time-series signal per sector used by the frontend heat map. |

### Data Files Required
- `data/gics_taxonomy.json` — maps each loan's industry to a GICS sector ID
- `data/sector_etfs.json` — sector → ETF ticker map for yfinance price pulls
- `data/news_sources.json` — keyword lists for NewsAPI sector monitoring

### Output
- Sector stress score (0–100) per sector, updated daily
- Contagion analysis report per sector event (direct / indirect / no exposure)
- 30-day forward stress forecast per sector
- Alert objects per affected deal, written to portfolio state

---

## Frontend Architecture

### Framework
Next.js 15 with App Router. Hosted separately from the Python backend.

### Pages and Routes

| Route | Page | Description |
|---|---|---|
| `/dashboard` | Portfolio Dashboard | Full portfolio table — all deals, risk scores, alert counts, sector tags, status badges |
| `/sector-intelligence` | Sector Intelligence Hub | 11-sector heat map, stress scores, ETF performance, 30-day forecast chart, contagion event cards |
| `/alerts` | Alerts & Actions | Chronological alert feed with severity tiers, deal links, audit trail, acknowledge/resolve workflow |
| `/portfolio` | Portfolio Detail | Filterable/sortable deal table with sector filter, risk score filter, status filter |
| `/deal/[id]` | Company Detail | Single deal view — loan metadata, rating history chart, open alerts, contagion exposure |
| `/reports` | Reports | IC memo viewer, quarterly report download, export functions |

### Design System
- Color: Charcoal (`#111318`) base, Indigo (`#5B6BFF`) accent
- Typography: Inter (body/headings) + JetBrains Mono (all numeric values)
- Components: Tailwind CSS with shadcn/ui primitives
- Charts: Recharts — mixed line + bar combinations
- Animation: Subtle only (150–200ms transitions, skeleton loaders)

### API Connection
Frontend fetches data from the FastAPI backend at `http://localhost:8000` (development) or the deployed API URL (production). All data fetching uses the 12 REST endpoints defined in `api/main.py`. No direct database access from the frontend.

---

## API Layer

**Framework:** FastAPI | **Port:** 8000 | **File:** `api/main.py`

All endpoints return JSON. Authentication: not implemented in V1 (internal demo use).

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check — returns API status and version |
| `/portfolio` | GET | Returns full portfolio of all active deals with current risk scores |
| `/portfolio/{deal_id}` | GET | Returns single deal details by deal ID |
| `/portfolio/seed` | POST | Seeds the demo portfolio (50-company dataset) into memory on startup |
| `/alerts` | GET | Returns all open alerts across the portfolio, sorted by severity |
| `/alerts/{deal_id}` | GET | Returns all alerts for a specific deal |
| `/alerts/{alert_id}/resolve` | POST | Marks an alert as resolved and logs the timestamp and user action |
| `/sector/stress` | GET | Returns current sector stress scores for all 11 GICS sectors |
| `/sector/{sector_name}/events` | GET | Returns sector event history and contagion analysis for a named sector |
| `/sector/{sector_name}/forecast` | GET | Returns 30-day sector stress forecast for a named sector |
| `/contagion/analyze` | POST | Triggers contagion analysis for a given sector event payload |
| `/reports/{deal_id}` | GET | Returns IC memo and monitoring reports for a specific deal |

---

## Week 6 Architecture Roadmap — Agentic RAG

### Problem: 10-K Truncation

Wave 1 agents currently receive a truncated document window. Large 10-Ks and CIMs are cut off mid-document, meaning sections like MD&A, risk factors, and footnotes are silently dropped before an agent ever reads them. This is the primary limit on analysis depth.

### Target Architecture: Section-Indexed Retrieval

The Week 6 architecture replaces the truncated window with **agentic RAG** (Retrieval-Augmented Generation):

```
CURRENT (truncated window):
  Document → clip to N chars → agent receives single flat blob

WEEK 6 (agentic RAG):
  Document → section parser → vector index (MD&A, Risk Factors, Financials, Notes, ...)
                                     ↓
  Each Wave 1 agent issues targeted retrieval queries
  against the index for the sections it needs:
    Financial Analyst   → "income statement", "cash flow", "debt schedule"
    EBITDA Analyst      → "EBITDA", "add-backs", "non-recurring items"
    Legal Analyst       → "litigation", "covenant", "material contracts"
    Commercial Analyst  → "market position", "competition", "growth strategy"
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Index at **section level**, not page level | Sections map to agent responsibilities — Financial Analyst should not retrieve MD&A prose when it needs the income statement |
| Each Wave 1 agent issues its **own retrieval queries** | Agents know what they need; centralized retrieval misses agent-specific context |
| Retrieval integrated into the **agentic tool loop** | Agents call a `RETRIEVE_DOCUMENT_SECTION` tool alongside existing tools — no change to orchestrator |
| Fallback to full-text for short documents | Documents under ~20 pages do not need indexing — current flat window remains as fallback |

### Implementation Sketch

1. `core/document_indexer.py` — parse uploaded PDF into named sections; embed with a lightweight model; store in an in-memory vector store (e.g. FAISS or ChromaDB)
2. New tool: `RETRIEVE_DOCUMENT_SECTION(query: str, top_k: int)` — returns the top-k most relevant chunks for a query
3. Add `RETRIEVE_DOCUMENT_SECTION` to Wave 1 agent tool sets in `core/tools.py`
4. Agent prompts updated to call retrieval before analysis rather than reading a pre-injected blob

### Status

Not yet implemented. Planned for Week 6 following final submission. The current truncated-window approach is adequate for the prototype demo but will be replaced before production use with multi-hundred-page credit agreements.

---

## Team Assignments

| Team Member | Role | Owns |
|---|---|---|
| **Peter** | Lead Engineer — Agents & Orchestration | `agents/`, `core/`, agent logic, sector intelligence system, contagion engine |
| **John** | Backend Engineer — API | `api/main.py`, all 12 FastAPI endpoints, data seeding, API deployment |
| **Abraham** | Frontend Engineer — UI | `frontend/`, all 6 Next.js pages, design system, component library, API integration |
| **Jasmin** | Research, Data & Documentation | `data/*.json`, `demo/`, `docs/`, GICS taxonomy, sector ETF map, news keywords, demo content, design research, competitive analysis |

### File Ownership Rules
- Jasmin does NOT touch: `.py` files, `package.json`, `requirements.txt`, `agents/`, `core/`, `api/`, `frontend/`
- Peter does NOT touch: `frontend/`, `api/main.py`, `docs/`, `demo/`
- Abraham does NOT touch: `agents/`, `core/`, `data/*.py`, `api/main.py`
- John does NOT touch: `agents/`, `core/`, `frontend/`
