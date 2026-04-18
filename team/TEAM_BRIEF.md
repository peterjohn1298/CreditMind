# CreditMind — Team Brief & Work Division

**Project:** CreditMind  
**GitHub:** https://github.com/peterjohn1298/CreditMind  
**Leader:** Peter (peterjohn1298) — all PRs require his approval before merging  
**Stack:** Python · FastAPI · Streamlit · Next.js · PostgreSQL (Railway) · Claude AI (Anthropic)

---

## What Is CreditMind?

CreditMind is an AI-powered private credit underwriting platform. It uses 30 intelligent agents — each powered by Claude Sonnet — to analyze loan applications end-to-end: from origination through due diligence, IC committee review, documentation, closing, and ongoing portfolio monitoring.

Each agent autonomously calls real financial APIs (SEC EDGAR, Yahoo Finance, Finnhub, macro data), reasons over the results, and hands off structured outputs to the next agent in the pipeline.

**The pipeline works like this:**
```
Deal submitted → Policy check → Wave 1 (parallel analysis) → Wave 2 (credit modeling)
→ Loan-type specialist → Credit underwriter → IC Memo → IC Committee → Documentation → Closing

Post-disbursement:
Daily   → News Intelligence + Sentiment Scorer + Early Warning
Quarterly → Portfolio Monitor + Covenant Compliance + Rating Reviewer
```

---

## Tech Stack — What You Need to Know

| Layer | Technology | Purpose |
|---|---|---|
| Backend API | FastAPI (`api/main.py`) | REST endpoints, background scheduler |
| UI (Python) | Streamlit (`streamlit_app.py`) | Main app interface |
| UI (Web) | Next.js (`frontend/`) | Modern web frontend |
| AI Agents | Anthropic Claude Sonnet 4.6 | All 30 agents |
| Database | PostgreSQL via SQLAlchemy (`data/db.py`) | Persistent deal/portfolio storage |
| Deployment | Railway (backend) + Vercel (frontend) | Production hosting |
| Secrets | Railway env vars + GitHub Secrets | API keys (never in code) |

**Key environment variables (already configured in Railway):**
- `ANTHROPIC_API_KEY` — powers all 30 agents
- `FINNHUB_API_KEY` — sector news and sentiment
- `DATABASE_URL` — Railway PostgreSQL connection

---

## How Every Agent Works (Read This First)

All 30 agents inherit from `agents/base_agent.py`. The pattern is identical for every agent:

1. Agent receives a `credit_state` dict (the shared deal record passed through the entire pipeline)
2. Agent calls `run_agentic_loop()` — Claude receives a task + a set of tools
3. Claude autonomously decides which tools to call, in what order, how many times
4. Loop exits when Claude has gathered enough data and issues a final answer
5. Agent writes its output back into `credit_state` and returns it

When you modify an agent, you are editing:
- The **system prompt** — Claude's role and instructions
- The **tools list** — what data Claude is allowed to fetch
- The **output schema** — what keys the agent writes back to `credit_state`

Never hardcode data or logic directly — Claude should reason over real API data.

---

## Git Workflow — Follow This Every Time

```
1. Always start from the latest master:
   git checkout your-branch
   git pull origin master

2. Do your work — only touch files in your zone (see your section below)

3. Commit clearly:
   git add <specific files>
   git commit -m "[YourName] Brief description of what changed and why"

4. Push:
   git push origin your-branch

5. Open a Pull Request on GitHub:
   - Go to github.com/peterjohn1298/CreditMind
   - Click "Compare & pull request"
   - Base branch: master
   - Title format: "[Abraham] Add sector volatility scoring to EBITDA analyst"
   - Submit

6. Wait for Chief of Staff review (runs automatically, ~1 minute)
   - ✅ CLEARED → ping Peter for final approval
   - 🔴 BLOCKED → read the comment, fix the issue, push again
```

**Never push directly to `master`. All work goes through your branch → PR → CoS review → Peter approval.**

---

## Chief of Staff — Automated PR Reviewer

Every PR you open is automatically reviewed by an AI Chief of Staff agent before Peter sees it. It checks:

- Did you touch files outside your assigned zone?
- Did you alter shared interfaces (function signatures, API schemas) that others depend on?
- Does your change logically conflict with another team member's work?

It posts a detailed comment on your PR within ~1 minute. If blocked, the comment tells you exactly what to fix. You do not need to ask Peter — just fix the issue and push again.

---

---

# PETER — Leader, Architecture & Credit Intelligence

**GitHub:** peterjohn1298  
**Branch:** master (you push directly — you are the only one who can)  
**Role:** You own the critical credit judgment layer and all infrastructure.

## Your Files

**Credit intelligence (the most sensitive layer — your banking background applies directly here):**
- `agents/ic_committee.py` — IC committee deliberation and final credit decision
- `agents/ic_memo_writer.py` — Investment committee memo generation
- `agents/risk_scorer.py` — Composite risk scoring (0–100)
- `agents/stress_tester.py` — Downside scenario stress testing
- `agents/credit_modeler.py` — Leverage, DSCR, amortization modeling
- `agents/credit_underwriter.py` — Final serviceability synthesis

**Core pipeline:**
- `core/orchestrator.py` — Full pipeline routing and wave management
- `core/parallel_runner.py` — Parallel agent execution
- `core/credit_policy.py` — Hard blocks, escalations, concentration limits
- `core/credit_state.py` — Shared deal record structure

**Infrastructure:**
- `api/main.py` — FastAPI routes + APScheduler background jobs
- `app.py` — Flask compatibility layer
- `streamlit_app.py` — Streamlit UI (structure and backend wiring)
- `data/db.py` — SQLAlchemy + Railway PostgreSQL
- `data/seed_portfolio.py` — Demo portfolio data
- `team/` and `.github/` — CoS system (already built)

## Focus Areas

Your primary focus is ensuring the **credit judgment agents reflect real private credit standards**. As the team member with the deepest banking background, you should:

1. **Review and tighten the IC Committee agent** (`agents/ic_committee.py`) — ensure the deliberation logic mirrors how a real IC committee would weigh leverage, coverage, sponsor quality, and market conditions
2. **Calibrate risk scoring thresholds** (`agents/risk_scorer.py`) — the auto-reject threshold varies by loan type; validate these against real-world credit policy
3. **Strengthen stress testing scenarios** (`agents/stress_tester.py`) — ensure downside cases (rate shock, revenue decline, EBITDA compression) are realistic and loan-type-specific
4. **Maintain the orchestrator** — as the team adds agents or features, you own routing logic

## How to Use Claude Code on Your Files

When working with Claude Code, provide this context:
> "I am working on CreditMind, an AI-powered credit underwriting platform. I own the credit intelligence agents. The agents use Claude Sonnet 4.6 via the Anthropic tool-use API. Each agent inherits from `agents/base_agent.py` and calls `run_agentic_loop()`. The shared deal record is a dict called `credit_state` passed through the full pipeline. I want to improve [specific agent]."

---

---

# ABRAHAM — Underwriting & Financial Analysis

**GitHub:** Abrahamgeorge97  
**Branch:** feature/abraham  
**Role:** You own the financial data layer and the Wave 1 analysis agents that form the foundation of every credit decision.

## Your Files

**Wave 1 agents (run in parallel at the start of every deal):**
- `agents/financial_analyst.py` — Reads financial statements, computes revenue, EBITDA, debt metrics, cash flow
- `agents/ebitda_analyst.py` — Quality of earnings, EBITDA adjustments, sustainability analysis
- `agents/commercial_analyst.py` — Market position, competitive dynamics, customer concentration
- `agents/industry_benchmarker.py` — Benchmarks borrower metrics against sector peers

**Data layer (the tools your agents call):**
- `data/financial_data.py` — Yahoo Finance integration (income statement, balance sheet, cash flow)
- `data/macro_data.py` — Macro indicators (Fed rate, CPI, credit spreads, GDP)
- `data/sec_edgar.py` — SEC EDGAR filings (10-K, 10-Q, 8-K)

**Tool infrastructure (shared with the rest of the agents):**
- `core/tools.py` — Tool definitions (JSON schema for Claude's tool-use API)
- `core/tool_executor.py` — Tool execution handlers

## How Your Work Fits the Pipeline

Your agents run **first**, in Wave 1 (parallel). Every downstream agent — Credit Modeler, Stress Tester, Risk Scorer, IC Memo — depends on what your agents write into `credit_state`. Specifically:

- `financial_analyst` writes → `credit_state["financial_analysis"]`
- `ebitda_analyst` writes → `credit_state["ebitda_analysis"]`
- `commercial_analyst` writes → `credit_state["commercial_analysis"]`
- `industry_benchmarker` writes → `credit_state["industry_benchmarks"]`

**If your output schema changes, tell Peter immediately** — downstream agents read these keys directly.

## Focus Areas

1. **Improve financial data quality** — `data/financial_data.py` pulls from Yahoo Finance; ensure it handles private companies gracefully (no ticker) by falling back to manually entered financials from `credit_state["prefilled_application"]`
2. **Strengthen SEC EDGAR integration** — `data/sec_edgar.py` fetches filings; improve parsing of 8-K material events (risk flags) and 10-K risk factor sections
3. **Enhance EBITDA normalization** — the EBITDA analyst should identify and adjust for one-time items, management add-backs, and run-rate vs. LTM distinctions
4. **Enrich industry benchmarking** — `industry_benchmarker.py` should produce sector-specific leverage, DSCR, and margin benchmarks that Wave 2 agents can compare against

## How to Use Claude Code on Your Files

When working with Claude Code, provide this context:
> "I am working on CreditMind, an AI-powered credit underwriting platform. I own the Wave 1 financial analysis agents and the data layer. Each agent inherits from `agents/base_agent.py` and uses `run_agentic_loop()` with the Anthropic tool-use API. My agents write outputs into a shared `credit_state` dict. The downstream agents (Credit Modeler, Stress Tester, Risk Scorer) depend on keys my agents produce. I want to improve [specific agent or data module]."

### Key schemas your agents must produce

`financial_analyst` must write:
```python
credit_state["financial_analysis"] = {
    "overall_financial_health": "STRONG" | "ADEQUATE" | "WEAK" | "DISTRESSED",
    "revenue_trend": str,
    "ebitda_margin": float,
    "leverage_ratio": float,
    "dscr": float,
    "free_cash_flow": float,
    "key_findings": [str],
}
```

`industry_benchmarker` must write:
```python
credit_state["industry_benchmarks"] = {
    "sector": str,
    "peer_leverage_median": float,
    "peer_ebitda_margin_median": float,
    "peer_dscr_median": float,
    "borrower_vs_peers": str,
}
```

---

---

# JOHN — Deal Lifecycle & Loan Type Specialists

**GitHub:** jbhbsbl-netizen  
**Branch:** feature/john  
**Role:** You own the deal journey from first contact through closing, and all loan-type-specific analysis agents.

## Your Files

**Deal lifecycle agents (the origination-to-closing pipeline):**
- `agents/origination_scout.py` — Screens inbound deal opportunities, scores fit
- `agents/deal_screener.py` — Initial screening against minimum credit criteria
- `agents/documentation_agent.py` — Generates term sheets, credit agreements, conditions precedent
- `agents/closing_agent.py` — Closing checklist, conditions satisfaction, final sign-off

**Loan type specialist agents (one per loan structure):**
- `agents/growth_capital_analyst.py` — Growth capital loans (ARR, NRR, burn rate focus)
- `agents/unitranche_analyst.py` — Unitranche (blended first/second lien analysis)
- `agents/mezzanine_analyst.py` — Mezzanine debt (PIK, warrants, equity kicker analysis)
- `agents/borrowing_base_analyst.py` — Revolving credit / ABL (borrowing base certificate)
- `agents/bridge_exit_analyst.py` — Bridge loans (exit strategy, refinancing risk)
- `agents/distressed_analyst.py` — Distressed debt (recovery analysis, restructuring)
- `agents/project_finance_analyst.py` — Project finance (SPV structure, DSCR waterfall)

**Supporting files:**
- `core/loan_types.py` — Loan type configs (max leverage, min DSCR, spread, covenant type, auto-reject threshold)
- `outputs/credit_memo.py` — Credit memo formatting and export

## How Your Work Fits the Pipeline

**Loan type specialists** run after Wave 2, once the core credit model is complete. They receive the full `credit_state` (including risk score, covenants, and credit model) and add loan-structure-specific analysis. For example:
- Growth Capital analyst focuses on ARR growth rate and net retention, not EBITDA
- Distressed analyst focuses on asset recovery values and restructuring options
- Project Finance analyst focuses on the SPV waterfall and DSCR under construction risk

**Deal lifecycle agents** run on either side of the core DD pipeline:
- `origination_scout` and `deal_screener` run before DD begins
- `documentation_agent` and `closing_agent` run after IC approval

## Focus Areas

1. **Strengthen each specialist agent's analytical framework** — each loan type has fundamentally different credit metrics. The Growth Capital agent should not use EBITDA-based leverage; the Distressed agent should focus on recovery rates and debt-to-asset ratios. Review each agent's system prompt against real private credit practice.
2. **Improve `core/loan_types.py` configs** — validate that `max_leverage`, `min_dscr`, `typical_spread_bps`, and `auto_reject_risk_score` reflect current market standards for each loan type
3. **Enhance `documentation_agent.py`** — it should generate realistic term sheet language, including pricing, covenants, conditions precedent, and representations based on the deal's risk score and loan type
4. **Build out `closing_agent.py`** — closing checklist should be dynamic, varying by loan type and flagging any unresolved conditions from the documentation agent
5. **Improve deal screening logic** in `deal_screener.py` — screening criteria should hard-block deals that violate minimum size, sector exclusion, or leverage thresholds before DD begins

## How to Use Claude Code on Your Files

When working with Claude Code, provide this context:
> "I am working on CreditMind, an AI-powered credit underwriting platform. I own the deal lifecycle agents and the loan-type specialist agents. Each agent inherits from `agents/base_agent.py` and uses `run_agentic_loop()` with the Anthropic tool-use API. The specialist agents run after Wave 2 and have access to the full `credit_state` including risk score, credit model, and covenants. Loan type configs are in `core/loan_types.py`. I want to improve [specific agent]."

### Loan types and their specialist agents

| Loan Type | Specialist Agent | Primary Metric |
|---|---|---|
| Senior Secured | *(no specialist — covered by Wave 2)* | DSCR / Leverage |
| Growth Capital | `growth_capital_analyst.py` | ARR, NRR, Burn Multiple |
| Unitranche | `unitranche_analyst.py` | Blended rate, attachment point |
| Mezzanine | `mezzanine_analyst.py` | PIK toggle, equity IRR |
| Revolver / ABL | `borrowing_base_analyst.py` | Borrowing base utilization |
| Bridge | `bridge_exit_analyst.py` | Exit strategy viability |
| Distressed | `distressed_analyst.py` | Recovery rate, LTV |
| Project Finance | `project_finance_analyst.py` | P90 DSCR, construction risk |

---

---

# JASMINE — Design Lead, UI & Aesthetics

**GitHub:** jasminkaur9  
**Branch:** design/jasmine  
**Role:** You own the entire visual and user experience layer of CreditMind. You are the Design Lead — your work is what users see and interact with.

## Your Files

You own everything inside the `frontend/` directory — the Next.js web application:

```
frontend/
├── app/                  ← Page routes (Next.js App Router)
│   ├── page.tsx          ← Homepage / dashboard
│   ├── monitoring/       ← Portfolio monitoring page
│   └── ...
├── components/
│   └── ui/               ← Reusable UI components (cards, badges, alerts)
├── lib/
│   └── utils.ts          ← Utility functions
├── public/               ← Static assets (logos, icons)
├── tailwind.config.ts    ← Tailwind CSS configuration (colors, fonts, spacing)
└── package.json          ← Dependencies
```

**Tech stack for your layer:**
- **Next.js 14** (App Router) — page routing and server components
- **Tailwind CSS** — all styling (utility classes, no separate CSS files)
- **TypeScript** — type-safe component props
- **Vercel** — your changes deploy here automatically when merged

## What You Should Focus On

Your job is to make CreditMind look and feel like a professional institutional-grade financial platform. Think Bloomberg Terminal meets modern SaaS — clean, data-dense, trustworthy.

1. **Dashboard design** (`frontend/app/page.tsx`) — the main dashboard should show portfolio health at a glance: deal count, average risk score, active alerts, recent activity. Design it to be scannable in 5 seconds.
2. **Alert cards** (`frontend/components/ui/AlertCard.tsx`) — alerts are critical signals (CRITICAL / HIGH / MEDIUM severity). Style them with clear visual hierarchy — red for CRITICAL, amber for HIGH, blue for MEDIUM. Make severity unmissable.
3. **Color system** (`frontend/tailwind.config.ts`) — establish a consistent color palette: a primary brand color, semantic colors for risk levels (green = low risk, red = high/critical), neutral grays for text and backgrounds.
4. **Typography** — financial data should use a monospace or tabular font for numbers so columns align. Use a clean sans-serif for headings and body text.
5. **Responsive layout** — the app should work cleanly on both desktop (primary) and tablet.
6. **Empty states** — design helpful empty states for when there are no deals, no alerts, no portfolio companies yet.
7. **Loading states** — agent analysis takes time. Design skeleton loaders or progress indicators so users know the system is working.

## How to Use Claude Code on Your Files

When working with Claude Code, provide this context:
> "I am working on CreditMind, an AI-powered credit underwriting platform. I am the Design Lead and I own the frontend — a Next.js 14 app using the App Router and Tailwind CSS. The backend is a FastAPI app on Railway. I do not touch any Python files — only files inside the `frontend/` directory. I want to improve [specific page or component]."

## Important Rules for Your Zone

- **Never edit Python files** — your zone is `frontend/` only
- **Never edit `streamlit_app.py`** — that is Peter's file
- Do not install new npm packages without checking with Peter first (it affects the Vercel build)
- All API calls from the frontend go to the FastAPI backend — do not add new API routes yourself; ask Peter to add them

---

## Questions?

- Technical questions about the pipeline → Peter
- Financial/credit logic questions → Peter (banking background)
- Merge conflicts or overlap → Chief of Staff will flag it automatically; resolve with the relevant team member
- Can't find something in the codebase → read `core/orchestrator.py` first — it shows the full pipeline and all agent imports
