# CreditMind — Abraham's Work Brief

**Project:** CreditMind — AI-Powered Private Credit Underwriting Platform  
**Your Role:** Underwriting & Financial Analysis Lead  
**Your GitHub Username:** Abrahamgeorge97  
**Your Branch:** `feature/abraham`  
**Leader:** Peter (peterjohn1298) — approves all PRs  

---

## What Is CreditMind?

CreditMind is an AI-powered platform that automates the full private credit underwriting process. It has 30 intelligent agents — each powered by Claude Sonnet AI — that analyze loan applications from start to finish: financial analysis, credit modeling, stress testing, risk scoring, IC memo writing, deal structuring, and ongoing portfolio monitoring.

Every agent calls real financial APIs (SEC EDGAR, Yahoo Finance, Finnhub), reasons over the data autonomously, and passes structured results to the next agent in the pipeline.

---

## Your Role in the Pipeline

You own **Wave 1** — the first set of agents that run at the start of every deal analysis. Wave 1 agents run in parallel and form the foundation that every downstream agent builds on.

**The full pipeline looks like this:**

```
Deal submitted
      ↓
WAVE 1 — YOUR ZONE (runs in parallel)
  ├── Financial Analyst       ← YOU OWN THIS
  ├── EBITDA Analyst          ← YOU OWN THIS
  ├── Commercial Analyst      ← YOU OWN THIS
  └── Industry Benchmarker    ← YOU OWN THIS
      ↓
WAVE 2 — Peter's zone (runs sequentially)
  ├── Credit Modeler
  ├── Stress Tester
  ├── Risk Scorer
  └── Covenant Designer
      ↓
Loan-Type Specialist (John's zone)
      ↓
Credit Underwriter → IC Memo → IC Committee → Documentation → Closing
```

**Critical:** Every agent in Wave 2 and beyond reads directly from what your agents write. If your output is weak or missing, the entire deal analysis suffers. Your work sets the quality ceiling for everything downstream.

---

## Files You Own

### Your Agents
| File | What It Does |
|---|---|
| `agents/financial_analyst.py` | Reads financial statements, computes revenue trends, EBITDA, leverage, DSCR, cash flow |
| `agents/ebitda_analyst.py` | Quality of earnings analysis, EBITDA adjustments, sustainability of earnings |
| `agents/commercial_analyst.py` | Market position, competitive dynamics, customer/revenue concentration |
| `agents/industry_benchmarker.py` | Benchmarks borrower metrics against sector peers using real market data |

### Your Data Layer
| File | What It Does |
|---|---|
| `data/financial_data.py` | Yahoo Finance integration — income statement, balance sheet, cash flow |
| `data/macro_data.py` | Macro indicators — Fed funds rate, CPI, credit spreads, GDP growth |
| `data/sec_edgar.py` | SEC EDGAR — fetches 10-K, 10-Q, and 8-K filings |

### Shared Tool Infrastructure (you maintain these)
| File | What It Does |
|---|---|
| `core/tools.py` | Tool definitions — JSON schema for Claude's tool-use API |
| `core/tool_executor.py` | Tool execution — handles each tool call Claude makes |

**Do not touch any files outside this list without coordinating with Peter first.**

---

## How the Agents Work (Technical)

All agents follow the same pattern — inherited from `agents/base_agent.py`:

```python
# Every agent does this:
def run(self, credit_state: dict) -> dict:
    result = self.run_agentic_loop(
        system_prompt="You are a financial analyst...",
        initial_message="Analyze this company...",
        tools=[GET_FINANCIAL_DATA, GET_SEC_FILINGS, ...]
    )
    credit_state["financial_analysis"] = parse(result)
    return credit_state
```

**What `run_agentic_loop` does:**
1. Sends the task + available tools to Claude Sonnet
2. Claude decides which tools to call, in what order, how many times
3. Tools execute and return real data (Yahoo Finance, SEC, etc.)
4. Claude reasons over the data and produces a final answer
5. Loop exits when Claude stops calling tools

When you edit an agent, you are editing:
- **The system prompt** — Claude's persona, instructions, and analytical framework
- **The tools list** — what data sources Claude can access
- **The output parsing** — how Claude's response maps to `credit_state` keys

---

## Output Schemas — Do Not Change Without Telling Peter

The downstream agents read these exact keys from `credit_state`. If you rename or remove a key, you will break the Credit Modeler, Stress Tester, and Risk Scorer.

### `financial_analyst` must write:
```python
credit_state["financial_analysis"] = {
    "overall_financial_health": "STRONG" | "ADEQUATE" | "WEAK" | "DISTRESSED",
    "revenue_trend": str,           # e.g. "Growing 12% YoY"
    "ebitda_margin": float,         # e.g. 0.22 for 22%
    "leverage_ratio": float,        # Total Debt / EBITDA
    "dscr": float,                  # Debt Service Coverage Ratio
    "free_cash_flow": float,        # in $ millions
    "key_findings": [str],          # list of bullet-point findings
}
```

### `ebitda_analyst` must write:
```python
credit_state["ebitda_analysis"] = {
    "reported_ebitda": float,
    "adjusted_ebitda": float,
    "adjustments": [str],           # list of add-backs/deductions
    "ebitda_quality": "HIGH" | "MEDIUM" | "LOW",
    "sustainability_assessment": str,
}
```

### `industry_benchmarker` must write:
```python
credit_state["industry_benchmarks"] = {
    "sector": str,
    "peer_leverage_median": float,
    "peer_ebitda_margin_median": float,
    "peer_dscr_median": float,
    "borrower_vs_peers": str,       # e.g. "Above median on leverage, below on margins"
}
```

---

## Your Focus Areas

### 1. Handle Private Companies Gracefully
Many borrowers won't have a stock ticker. `data/financial_data.py` currently relies on Yahoo Finance (which needs a ticker). Improve it to fall back to manually entered financials from `credit_state["prefilled_application"]` when no ticker is available.

### 2. Strengthen SEC EDGAR Integration
`data/sec_edgar.py` fetches filings. Improve parsing of:
- **8-K material events** — flag material adverse changes, executive departures, litigation
- **10-K risk factors** — extract and summarize the top 5 risk factors for the analyst agents to reason over

### 3. Improve EBITDA Normalization
The EBITDA analyst should identify and separately flag:
- One-time items (restructuring charges, legal settlements)
- Management add-backs (stock comp, D&A adjustments)
- Run-rate vs. LTM distinctions
- Pro forma adjustments for acquisitions

### 4. Enrich Industry Benchmarking
The industry benchmarker should produce sector-specific benchmarks for leverage, DSCR, and margins. Use Finnhub and SEC data to derive these from real peer companies, not hardcoded values.

---

## Git Workflow

```bash
# Step 1 — Always start fresh from master
git checkout feature/abraham
git pull origin master

# Step 2 — Do your work (only your files)

# Step 3 — Commit
git add agents/financial_analyst.py data/financial_data.py  # specific files only
git commit -m "[Abraham] Improve private company fallback in financial analyst"

# Step 4 — Push
git push origin feature/abraham

# Step 5 — Open a Pull Request on GitHub
# Go to github.com/peterjohn1298/CreditMind
# Click "Compare & pull request" → base: master
# Title: "[Abraham] Brief description"
# Submit — Chief of Staff reviews automatically in ~1 minute
```

---

## How to Use Claude Code

When starting a Claude Code session, paste this at the beginning:

> "I am working on CreditMind, an AI-powered private credit underwriting platform built with Python, FastAPI, and Streamlit. I am Abraham and I own the Wave 1 financial analysis agents and the data layer. All agents inherit from `agents/base_agent.py` and use `run_agentic_loop()` with the Anthropic Claude Sonnet tool-use API. My agents write structured outputs into a shared `credit_state` dict that is passed through the entire pipeline. The downstream Credit Modeler, Stress Tester, and Risk Scorer all depend on the keys my agents produce. My files are: `agents/financial_analyst.py`, `agents/ebitda_analyst.py`, `agents/commercial_analyst.py`, `agents/industry_benchmarker.py`, `data/financial_data.py`, `data/macro_data.py`, `data/sec_edgar.py`, `core/tools.py`, `core/tool_executor.py`. I want to [describe your task]."

---

## One Rule

Never push directly to `master`. All your work goes through `feature/abraham` → Pull Request → Chief of Staff review → Peter's approval.

**Questions?** Reach out to Peter directly.
