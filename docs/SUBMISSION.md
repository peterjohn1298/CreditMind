# CreditMind — Final Project Submission

> **Repository:** [github.com/peterjohn1298/CreditMind](https://github.com/peterjohn1298/CreditMind)
> **Live application:** [credit-mind-nine.vercel.app](https://credit-mind-nine.vercel.app)
> **Project type:** AI-native credit-intelligence platform for private credit
> **Submitted by:** Abraham Tomy, Peter John, John Hanish, Jasmin
> **Course:** Purdue MSF — AI in Finance

---

## 1. Executive Summary

CreditMind is a 34-agent autonomous private-credit platform that covers the **full deal lifecycle** — from market origination to LP-grade quarterly reporting — with a regulator-defensible harness wrapped around every agent decision.

The model is rented (Claude Sonnet 4.6). The harness is owned. The harness is the product.

**One sentence:** CreditMind is what private credit looks like when an AI platform is built to satisfy SR 11-7, EU AI Act (Aug 2026), and FinCEN AML for RIAs (Jan 2028) on day one — not bolted on after a regulator asks.

---

## 2. Business Value

### The pain the industry is facing

Private credit grew from a $400B niche to a **$2.1T asset class** in fifteen years. The infrastructure underneath it did not keep up. The 2025-26 conversation is about cracks:

| Industry pain (sourced) | What it costs |
|---|---|
| "Zero-loss fantasy" — true default rate ~5% once LMEs counted, vs. <2% headline (CNBC, PineBridge) | Mispriced risk, undercapitalised reserves |
| EBITDA add-back abuse — adjustments now 29% of marketed EBITDA (S&P 2024 study) | Loans built on inflated leverage; recovery shortfalls in default |
| Cov-lite ~80% of leveraged loan market (S&P, UBS) | Lost early-warning signals; recovery rates fall materially |
| "Bad PIK" spike — 56% of PIK loans had no PIK at origination (PGIM, TCW) | Shadow default rate ~6% behind <2% headline |
| LMEs (Serta, J.Crew, Chewy) = 65-73% of recent defaults (Proskauer, Harvard Bankruptcy Roundtable) | Subordination, drop-down, lender-on-lender violence |
| Level 3 valuation softness — Blue Owl, Apollo BDC markdowns surprised LPs (Kroll, Houlihan Lokey) | LP trust erosion, redemption pressure |
| FinCEN AML rule for RIAs effective Jan 2028 | Most private credit firms underprepared |
| EU AI Act high-risk provisions effective Aug 2026 | Penalties up to 7% of global annual turnover |

CreditMind is engineered around these specific pain points. Each is mapped to a specific agent or control surface.

### What CreditMind delivers

| Deliverable | Audience |
|---|---|
| Origination signals from M&A news + SEC EDGAR 8-K | Sourcing analyst |
| Go/no-go screening in <2 min with policy compliance check | Associate |
| 11-agent due diligence with confidence + citations | Senior analyst / VP |
| EBITDA add-back forensics scored against S&P 29% benchmark | VP / partner |
| Legal LME vulnerability scan (J.Crew / Chewy / Serta blockers) | Legal counsel |
| ESG + KYC/AML hard go/no-go gates | Compliance officer |
| ASC 820 Level 3 valuation + cross-portfolio mark inconsistency detector | Valuation committee |
| ILPA 2.0 quarterly reporting + capital call notices | Fund operations / LPs |
| Distressed forensic analysis + recovery waterfall | Workout team |
| Regulator-grade audit log (token cost, latency, model, rationale) | Auditor / regulator |

---

## 3. System Architecture

### 3.1 High-level layers

```
┌────────────────────────────────────────────────────────────────────┐
│  USER LAYER                                                        │
│  Next.js 16 + React 19 on Vercel                                   │
│  13 routes · hub launcher · floating dock · particle background    │
└────────────────────────────────────────────────────────────────────┘
                                   │
┌────────────────────────────────────────────────────────────────────┐
│  HARNESS LAYER (the product)                                       │
│  Tool execution · Persistence · Verification · Guardrails · Safe   │
│  per-agent audit trail · confidence+citations · benchmark · IC gate│
└────────────────────────────────────────────────────────────────────┘
                                   │
┌────────────────────────────────────────────────────────────────────┐
│  AGENT LAYER                                                       │
│  34 Claude Sonnet 4.6 agents across 6 lifecycle stages             │
│  agentic RAG · tool use · structured JSON output                   │
└────────────────────────────────────────────────────────────────────┘
                                   │
┌────────────────────────────────────────────────────────────────────┐
│  DATA LAYER                                                        │
│  yfinance · FRED · Finnhub · SEC EDGAR · Arbeitnow · Google Places │
│  Postgres on Railway · APScheduler background jobs                 │
└────────────────────────────────────────────────────────────────────┘
                                   │
┌────────────────────────────────────────────────────────────────────┐
│  POLICY LAYER                                                      │
│  data/credit_policy.json (human-readable mandate)                  │
│  core/credit_policy.py (enforcement engine — code, not prompts)    │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 The lifecycle, end to end

| Stage | Agent(s) | Endpoint | Where it lives in the UI |
|---|---|---|---|
| 1. Origination | `origination_scout` | `POST /api/origination-scan` | `/origination` Stage 1 |
| 2. Screening | `deal_screener` | `POST /api/screen-deal` | `/origination` Stage 2 |
| 3. Due Diligence (Wave 1, parallel) | `financial_analyst`, `ebitda_analyst`, `commercial_analyst`, `legal_analyst`, `industry_benchmarker` | `POST /api/underwrite` | `/underwriting` 6-step wizard |
| 3. Due Diligence (Wave 2, sequential) | `credit_modeler`, `stress_tester`, `risk_scorer`, `covenant_structurer` | same | same |
| 3. Specialist (loan-type aware) | `borrowing_base`, `bridge_exit`, `growth_capital`, `mezzanine`, `unitranche`, `project_finance`, `distressed` | same | same |
| 4. Hard ESG/KYC gates | `esg_screening`, `kyc_aml` | `POST /api/esg-screen`, `POST /api/kyc-screen` | `/deal/{id}` panels |
| 5. Valuation | `valuation_agent`, `MarkInconsistencyDetector` | `POST /api/valuation/*` | `/valuation` |
| 6. IC | `ic_committee`, `ic_memo_writer` | `POST /api/ic-committee` | `/deal/{id}` IC panel |
| 6a. Human checkpoint | mandatory signature gate | — | inline gate |
| 7. Documentation | `documentation_agent` | `POST /api/generate-docs` | `/deal/{id}` Term Sheet panel |
| 8. Closing | `closing_agent` | `POST /api/closing-checklist` + `PATCH .../cp` | `/deal/{id}` Closing CP Tracker |
| 9. Daily monitoring | `news_intelligence`, `sentiment_scorer`, `early_warning` | scheduled + `POST /api/daily-monitor` | `/monitoring`, `/alerts` |
| 9. Quarterly review | `portfolio_monitor`, `covenant_compliance`, `rating_reviewer` | `POST /api/quarterly-review` | `/portfolio`, `/deal/{id}` |
| 10. Workout | `distressed_analyst` | within `/api/underwrite` | `/deal/{id}` for stressed deals |
| 11. LP Reporting | `lp_reporting` | `POST /api/lp-reporting/*` | `/lp-reporting` |
| Cross-cutting | `core/credit_policy.py` engine | `POST /api/policy/*` | banner on `/dashboard` + `/portfolio` |

### 3.3 The five harness pillars (regulator-grade controls)

| Pillar | What it does | Where it lives |
|---|---|---|
| **Tool execution** | Controlled API calls. No free-form web access. 3500-char result cap. Per-agent tool subset. | `core/tools.py`, `core/tool_executor.py` |
| **Persistence** | Immutable record a regulator can reconstruct. JSONB Postgres + per-agent `agent_log[]` with token cost, latency, model. | `core/credit_state.py`, `data/db.py` |
| **Verification** | Confidence + citations on every extracted field. Ducommun faithfulness benchmark on every deploy. Cross-source EBITDA reconciliation. | commits `ef91ffe` (R2-3), `1b021e2` (R2-4) |
| **Guardrails** | Pydantic schemas at every endpoint. Hard policy enforcement in code, not prompts. Sector caps, ESG exclusions, prohibited instruments — all enforced before DD. | `core/schemas.py`, `core/credit_policy.py`, `data/credit_policy.json` |
| **Safe execution** | Per-agent audit trail (token / latency / model / rationale). Iteration cap of 10. Mandatory IC human checkpoint with signature. Frontend kill switch. | commits `4d84e68` (R2-6), `6f45ebd` (IC checkpoint), `/harness` page |

The professor's lecture explicitly cited CreditMind as the canonical example of two pillars: *"the persistence and human gate story"* and *"the parallel fan-out, sequential deepen, hard human gate."*

A dedicated `/harness` route surfaces all five pillars with per-pillar evidence (specific files and commits), live audit trail, confidence + citations, benchmark status, human gate log, and a platform kill switch.

### 3.4 Key architectural decisions

| Decision | Rationale |
|---|---|
| **Single shared `credit_state` dict** passed through the full pipeline | Wave 2 agents read Wave 1 outputs by named keys; ic_memo_writer composes from everything; the entire deal trail is replayable from a single object |
| **`agent_log[]` append-only** with `log_agent()` | Immutable audit trail. Mutations only via blessed helpers. |
| **Hard policy enforcement in code** (not prompts) | A regulator cannot accept "we asked the LLM to remember the policy." `core/credit_policy.py` enforces concentration limits, sector caps, ESG exclusions before DD even starts. Hard blocks abort the pipeline. |
| **Specialist routing** by `loan_type` | A second-lien needs different analysis than a project finance loan. `core/loan_types.py` routes each deal to the right specialist (mezzanine / bridge / growth / unitranche / project finance / distressed / borrowing base) |
| **Wave 3 ESG + KYC as hard gates BEFORE IC** | A REJECT verdict from either aborts the pipeline. ESG hard exclusions and FinCEN sanctions matches cannot be overridden silently. |
| **Cross-source EBITDA reconciliation** | If `financial_analysis.ebitda` and `ebitda_analysis.ebitda` diverge by more than threshold, the system flags via `add_divergence()`. Catches model hallucination across agents. |
| **Background scheduler** for sector monitoring (every 6h) and daily deal monitoring (02:00 UTC cron) | Production-grade ops. Not on-demand demo only. |
| **JSONB Postgres** as persistence | Schema flexibility for evolving `credit_state` plus full SQL queryability for audit reconstruction |

---

## 4. Capabilities Map

### 4.1 Backend agents (34 total)

**Origination + screening (2)**
`origination_scout`, `deal_screener`

**Wave 1 due diligence — parallel (4)**
`financial_analyst`, `ebitda_analyst`, `commercial_analyst`, `legal_analyst`

**Wave 2 due diligence — sequential (4)**
`credit_modeler`, `stress_tester`, `risk_scorer`, `covenant_structurer`

**Specialist agents (7)**
`borrowing_base_analyst`, `bridge_exit_analyst`, `growth_capital_analyst`, `mezzanine_analyst`, `project_finance_analyst`, `unitranche_analyst`, `distressed_analyst`

**Cross-cutting DD (3)**
`industry_benchmarker`, `credit_underwriter`, `ic_memo_writer`

**Hard gates (2)**
`esg_screening`, `kyc_aml`

**Valuation (2)**
`valuation_agent`, `MarkInconsistencyDetector`

**IC + post-IC (3)**
`ic_committee`, `documentation_agent`, `closing_agent`

**Daily monitoring (3)**
`news_intelligence`, `sentiment_scorer`, `early_warning`

**Quarterly review (3)**
`portfolio_monitor`, `covenant_compliance`, `rating_reviewer`

**LP-facing (1)**
`lp_reporting`

### 4.2 Frontend routes (13)

| Route | Purpose |
|---|---|
| `/home` | Tile launcher (entry point) |
| `/dashboard` | Portfolio KPIs, sector heatmap, alerts, policy banner |
| `/origination` | Stage 1 + 2 — market scout and deal screener |
| `/underwriting` | 6-step credit application wizard with full DD pipeline |
| `/portfolio` | 50-loan filterable table + analytics tabs (vintage, correlation, sponsor behavior) + LP Reporting tab |
| `/monitoring` | Stressed/watchlist KPIs, deal-level monitoring, stress testing |
| `/valuation` | ASC 820 Level 3 marks, mark inconsistency detector |
| `/lp-reporting` | ILPA RT 2.0, performance template, capital call/distribution notices |
| `/alerts` | Company + sector alerts + AI predictions |
| `/sector-intelligence` | 30-day stress heatmap + 7-day forecast + contagion analysis |
| `/deal/[id]` | Per-deal detail with IC panel, term sheet viewer, closing CP tracker, KYC, ESG, add-back forensics, alternative data, rating history |
| `/harness` | Five-pillar compliance grid, per-deal audit trail, kill switch *(branch `feature/abraham-harness-layer`)* |

### 4.3 Data sources

| Source | Used for |
|---|---|
| yfinance | Income statement, balance sheet, cash flow, key metrics, company info, SEC filings |
| FRED | Macro indicators (rates, spreads, GDP, VIX) |
| Finnhub | Sector news with keyword filtering |
| SEC EDGAR full-text search | Origination 8-K scan, KYC adverse media |
| Arbeitnow Jobs API | Hiring signals (tech / BPO / consumer) |
| Google Places | Consumer-facing business signals (foot traffic proxy) |
| Postgres on Railway | Persistent portfolio + sector alerts + sector scores |

---

## 5. Performance Metrics & Results

### 5.1 Coverage metrics

| Metric | Value |
|---|---|
| Backend agents | 34 |
| API endpoints | 41 |
| Frontend routes | 13 (12 in master + 1 on harness branch) |
| Lifecycle stages covered | 11 (origination → LP reporting) |
| Industry pain points addressed | 9 of 9 (per 2025-26 industry research) |
| Seed portfolio | 50 borrowers across 11 sectors |
| Specialist analyst types | 7 (revolver/bridge/growth/mezz/unitranche/project/distressed) |
| Fund-policy controls (`credit_policy.json`) | Mandate, instruments, target borrower profile, concentration limits, prohibited sectors, ESG exclusions, approval matrix, watch list, covenant standards |

### 5.2 Harness compliance metrics

| Pillar | Status | Evidence |
|---|---|---|
| Tool execution | ✓ Compliant | Typed JSON tool schemas, 3500-char cap, per-agent tool subsets |
| Persistence | ✓ Compliant | `agent_log[]` append-only, Postgres JSONB, 3 tables |
| Verification | ✓ Compliant | Confidence + citations on every field; Ducommun benchmark on every deploy; cross-source EBITDA reconciliation |
| Guardrails | ✓ Compliant | Pydantic at every endpoint; hard policy enforcement in code; iteration cap of 10 |
| Safe execution | ✓ Compliant | Per-agent token/latency/model in audit trail; mandatory IC human checkpoint; frontend kill switch |

### 5.3 Operational metrics

| Metric | Value |
|---|---|
| Per-agent iteration cap | 10 (hard) |
| Tool result cap | 3500 chars |
| Sector monitoring cadence | Every 6 hours (APScheduler IntervalTrigger) |
| Daily deal monitoring | 02:00 UTC cron |
| Sectors tracked | 11 |
| Stress heatmap window | 30-day history + 7-day forecast |
| Database persistence | Postgres on Railway with graceful in-memory fallback |
| Background jobs | `max_instances=1`, misfire grace 300-600s |

### 5.4 Verification — Ducommun faithfulness benchmark

Every deploy re-runs the agent pipeline against the labelled `benchmark/cases/ducommun_case.json` ground truth. `benchmark/scorer.py` measures faithfulness vs. the labelled answers. Results land in `benchmark/results/` with per-agent score and timestamp. **The benchmark gates production.** A failing run blocks deploy.

---

## 6. Differentiation

| Competitor | What they do | What CreditMind does that they do not |
|---|---|---|
| **Hadrius** | KYC / AML compliance | Full deal lifecycle from origination to ILPA reporting; KYC is one agent of 34 |
| **73 Strings** | Level 3 valuation only | Valuation is one of 11 lifecycle stages; the platform also originates, screens, underwrites, monitors, and workouts |
| **Lyric** | Covenant tracking | Covenant tracking is one quarterly agent; CreditMind also generates the covenants in the first place via `covenant_structurer` |
| **Centerprise** | Loan ops automation | Ops + analytics + agent-driven decisions; CreditMind blurs the line between back-office tooling and front-office intelligence |

**No competitor today ships:**
- Full origination → screening → DD → IC → docs → closing → monitoring → workout → LP reporting in one platform
- A regulator-grade harness layer with five-pillar transparency
- A cross-portfolio Mark Inconsistency Detector that addresses the Blue Owl / Apollo BDC markdown problem
- LME blocker scanning (J.Crew / Chewy / Serta) as part of standard legal DD
- Specialist agent routing by loan type (revolver vs. bridge vs. mezz vs. project finance)

---

## 7. Tech Stack

### 7.1 Backend
- **Language:** Python 3.11+
- **API:** FastAPI + Pydantic
- **Agents:** Claude Sonnet 4.6 via the Anthropic Python SDK with tool use
- **Persistence:** SQLAlchemy Core → Postgres (Railway)
- **Scheduling:** APScheduler (BackgroundScheduler with IntervalTrigger + CronTrigger)
- **Concurrency:** ThreadPoolExecutor for parallel agent waves
- **Hosting:** Railway (uvicorn entry, `railway.toml` with nixpacks)

### 7.2 Frontend
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5
- **UI:** React 19 + Tailwind CSS v4
- **Animation:** Framer Motion
- **Charts:** Recharts
- **Components:** Radix UI primitives (Dialog, Select, Tabs, Tooltip)
- **Hosting:** Vercel (Edge runtime where applicable)

### 7.3 Data
- **Live financial:** yfinance (Yahoo Finance Python wrapper)
- **Macro:** FRED (St. Louis Fed)
- **News:** Finnhub
- **Filings:** SEC EDGAR full-text search
- **Alternative:** Arbeitnow (jobs), Google Places (consumer locations)
- **Static:** GICS sector taxonomy, sector → ETF map, sector keyword lists, fund credit policy JSON

### 7.4 Deployment

| Layer | Platform | Auto-deploy from |
|---|---|---|
| Frontend | Vercel | `master` branch on push |
| Backend | Railway | `master` branch on push (uvicorn via nixpacks) |
| Database | Railway Postgres | Provisioned with the backend service |

---

## 8. Team & Ownership

CreditMind is a four-person collaboration. Each member owned a domain and shipped their work as merged feature branches:

| Member | Domain | Notable contributions |
|---|---|---|
| **Peter** | `agents/`, `core/` (orchestration, tool executor, schemas, credit policy engine) + sector intelligence + contagion engine | 30+ agents, full lifecycle wiring, agentic RAG, IC checkpoint layer, Ducommun benchmark, audit trail, confidence + citations |
| **John** | `api/main.py` and FastAPI endpoints | 41 endpoints, request/response models, background scheduler, persistence wiring |
| **Abraham** | `frontend/` Next.js application | 13 routes, hub launcher, bottom dock, every per-deal panel, `/harness` page, all UI for the wave-1 → wave-4 backend features |
| **Jasmin** | `data/*.json`, `demo/`, `docs/` | Credit policy JSON, sector taxonomy, news source lists, demo portfolios, documentation |

Workflow: every change went through a feature branch + pull request + Vercel preview build before merge to `master`. The `master` branch is protected and is the auto-deploy source for both Vercel and Railway.

---

## 9. Demo Environment

**Live URL:** [credit-mind-nine.vercel.app](https://credit-mind-nine.vercel.app)

**Demo data:** 50-company seed portfolio across 11 sectors, anchored to current 2025-26 macro events (tariffs, rare-earth export controls, software sector AI disruption). Specific demo deals:
- **Ducommun Incorporated (DCO)** — full-pipeline successful underwriting demo (aerospace, BB-, $120M TLB)
- **Atlas Health Partners** — full-capability mezzanine demo (PE-backed behavioral health, ESG considerations)
- **Meridian Retail Group** — rejection demo (department store, secular decline, 9.2x leverage breach)

**Reproducibility:** The platform is deterministic for a given input + seed. Tool calls are cached. The Ducommun benchmark re-runs on every deploy and fails the build if the score falls below threshold.

---

## 10. Repository

**GitHub:** [github.com/peterjohn1298/CreditMind](https://github.com/peterjohn1298/CreditMind)

### Key files for the panel

| Path | What's there |
|---|---|
| `CLAUDE.md` | Architecture overview, agent pattern, credit state contract, team ownership, conventions |
| `docs/HARNESS.md` | Detailed mapping of every harness pillar to specific files and commits |
| `docs/SUBMISSION.md` | This document |
| `docs/PROFESSOR_FEEDBACK.md` | Running log of how each professor R2-X feedback item was addressed |
| `docs/PROMPT_CHANGELOG.md` | Per-prompt changelog with metric tracking |
| `agents/` | All 34 agents |
| `core/orchestrator.py` | Full lifecycle wiring (DD wave 1 → wave 2 → specialist → underwriter → wave 3 → valuation → IC) |
| `core/credit_policy.py` | Policy enforcement engine (hard blocks, escalations, watch list) |
| `core/credit_state.py` | The single shared state object with `log_agent`, `add_alert`, `add_divergence` |
| `core/tools.py`, `core/tool_executor.py` | Typed tool definitions and executor with result cap |
| `frontend/app/` | All 13 routes |
| `frontend/components/ui/` | Reusable panels (AddBackForensics, ICCommittee, TermSheet, ClosingCP, KYC, ESG, PortfolioAnalytics, PolicyCompliance) |
| `data/credit_policy.json` | Human-readable fund policy |
| `data/seed_portfolio.py` | 50-company demo portfolio |
| `benchmark/cases/ducommun_case.json` | Labelled ground truth for faithfulness gate |

---

## 11. What we are most proud of

1. **The harness pattern is the product.** Other student projects built chatbots; we built the regulator-grade scaffolding that makes those chatbots usable in a real bank. The professor named CreditMind specifically as the canonical example.
2. **Full lifecycle coverage.** Origination, screening, due diligence, ESG/KYC gates, valuation, IC, documentation, closing, monitoring, workout, LP reporting. No competitor ships all eleven stages.
3. **Hard policy in code, not prompts.** `core/credit_policy.py` enforces concentration limits, sector caps, prohibited instruments, and ESG exclusions before any LLM gets involved. A regulator can read the JSON and the engine and reconcile.
4. **Cross-source verification.** EBITDA divergence between `financial_analysis` and `ebitda_analysis` is auto-flagged. The system catches its own hallucinations.
5. **Specialist routing.** `core/loan_types.py` routes a second-lien to the mezz analyst, a project finance loan to the project finance analyst, a revolver to the borrowing base analyst. One platform, six fundamentally different underwriting frameworks.
6. **Auditable everything.** Every agent call logs token cost, latency, model, and rationale. Every IC decision has a signed checkpoint. Every CP toggle has a timestamp. A regulator can reconstruct any deal from `deal_id` alone.

---

## 12. What we would build next

1. **Backend kill switch** — wire the frontend kill switch to a Redis/DB flag the orchestrator checks before each agent call (today the kill switch is UI-only)
2. **Live benchmark scoring on `/harness`** — read `benchmark/results/*.json` dynamically rather than the static "PASSING" badge
3. **RAG over a vector DB** — current agentic RAG (commit `3310795`) does full-document retrieval; production scale wants pgvector or similar
4. **Multi-tenant deployment** — today the seed portfolio is shared; a real fund needs isolated databases per tenant
5. **SOC 2 + audit trail export** — the audit infrastructure is in place; an export endpoint that produces a PDF audit report on demand would close the regulator-readiness loop

---

*The model is rented. The harness is owned. In finance, that is where the durable value lives.*
