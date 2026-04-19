# CreditMind — John's Work Brief

**Project:** CreditMind — AI-Powered Private Credit Underwriting Platform  
**Your Role:** Deal Lifecycle & Loan Type Specialists Lead  
**Your GitHub Username:** jbhbsbl-netizen  
**Your Branch:** `feature/john`  
**Leader:** Peter (peterjohn1298) — approves all PRs  

---

## What Is CreditMind?

CreditMind is an AI-powered platform that automates the full private credit underwriting process. It has 30 intelligent agents — each powered by Claude Sonnet AI — that analyze loan applications from start to finish: financial analysis, credit modeling, stress testing, risk scoring, IC memo writing, deal structuring, and ongoing portfolio monitoring.

Every agent calls real financial APIs, reasons over the data autonomously, and passes structured results to the next agent in the pipeline.

---

## Your Role in the Pipeline

You own two distinct parts of the system:

**1. The deal lifecycle** — agents that manage the deal journey before and after the core credit analysis:
```
Origination Scout → Deal Screener → [Core DD Pipeline] → Documentation Agent → Closing Agent
```

**2. The loan type specialists** — agents that run after Wave 2 and apply loan-structure-specific analysis:
```
[Wave 2 complete: risk score, covenants, credit model available]
      ↓
Loan-Type Specialist (YOUR ZONE — one of 7 depending on deal type)
      ↓
Credit Underwriter → IC Memo → IC Committee
```

**The full pipeline for context:**
```
Deal submitted
      ↓
YOUR ZONE: Origination Scout + Deal Screener (initial screening)
      ↓
WAVE 1 — Abraham's zone (financial, EBITDA, commercial, industry analysis)
      ↓
WAVE 2 — Peter's zone (credit model, stress test, risk score, covenants)
      ↓
YOUR ZONE: Loan-Type Specialist (loan-structure-specific analysis)
      ↓
Peter's zone: Credit Underwriter → IC Memo → IC Committee
      ↓
YOUR ZONE: Documentation Agent → Closing Agent
```

---

## Files You Own

### Deal Lifecycle Agents
| File | What It Does | When It Runs |
|---|---|---|
| `agents/origination_scout.py` | Screens inbound deal opportunities, scores strategic fit | Before DD begins |
| `agents/deal_screener.py` | Initial screening against minimum credit criteria | Before DD begins |
| `agents/documentation_agent.py` | Generates term sheets, credit agreements, conditions precedent | After IC approval |
| `agents/closing_agent.py` | Closing checklist, conditions satisfaction, final sign-off | Before disbursement |

### Loan Type Specialist Agents
| File | Loan Type | Primary Focus |
|---|---|---|
| `agents/growth_capital_analyst.py` | Growth Capital | ARR, NRR, Burn Multiple, Rule of 40 |
| `agents/unitranche_analyst.py` | Unitranche | Blended rate, first/second lien attachment |
| `agents/mezzanine_analyst.py` | Mezzanine | PIK toggle, equity kicker, subordination risk |
| `agents/borrowing_base_analyst.py` | Revolver / ABL | Borrowing base certificate, eligible receivables |
| `agents/bridge_exit_analyst.py` | Bridge Loan | Exit strategy viability, refinancing risk |
| `agents/distressed_analyst.py` | Distressed Debt | Recovery rate analysis, restructuring options |
| `agents/project_finance_analyst.py` | Project Finance | SPV waterfall, DSCR under construction risk |

### Supporting Files
| File | What It Does |
|---|---|
| `core/loan_types.py` | Loan type configs — max leverage, min DSCR, spread, auto-reject threshold |
| `outputs/credit_memo.py` | Credit memo formatting and export |

**Do not touch any files outside this list without coordinating with Peter first.**

---

## How the Agents Work (Technical)

All agents follow the same pattern — inherited from `agents/base_agent.py`:

```python
def run(self, credit_state: dict) -> dict:
    result = self.run_agentic_loop(
        system_prompt="You are a specialist credit analyst for growth capital loans...",
        initial_message="Analyze this deal...",
        tools=[GET_FINANCIAL_DATA, GET_SECTOR_NEWS, ...]
    )
    credit_state["specialist_analysis"] = parse(result)
    return credit_state
```

**What `run_agentic_loop` does:**
1. Sends the task + available tools to Claude Sonnet
2. Claude decides which tools to call, in what order, how many times
3. Tools execute and return real data
4. Claude reasons over the data and produces a structured analysis
5. Loop exits when Claude stops calling tools

When you edit an agent, you are editing:
- **The system prompt** — Claude's specialist persona and analytical framework
- **The tools list** — what data sources Claude can access
- **The output parsing** — how Claude's response maps to `credit_state` keys

---

## Loan Type Configs — `core/loan_types.py`

Each loan type has a config object with these fields:

```python
@dataclass
class LoanTypeConfig:
    display_name: str
    max_leverage: float          # Maximum acceptable Debt/EBITDA ratio
    min_dscr: float              # Minimum Debt Service Coverage Ratio
    typical_spread_bps: int      # Typical spread over base rate (basis points)
    covenant_type: str           # "maintenance" | "incurrence" | "hybrid"
    auto_reject_risk_score: int  # Risk score above which deal is auto-rejected
    primary_metric: str          # The most important metric for this loan type
    primary_metric_label: str    # Human-readable label for the primary metric
```

The orchestrator reads these configs and injects them into `credit_state["loan_type_config"]` before any agent runs — so every agent knows the thresholds for the specific loan type being analyzed.

---

## What Each Specialist Agent Receives

By the time your specialist agent runs, `credit_state` contains:

```python
credit_state = {
    # From Wave 1 (Abraham's agents)
    "financial_analysis": {...},      # Revenue, EBITDA, leverage, DSCR, health rating
    "ebitda_analysis": {...},         # Adjusted EBITDA, quality assessment
    "commercial_analysis": {...},     # Market position, competitive dynamics
    "industry_benchmarks": {...},     # Peer comparisons

    # From Wave 2 (Peter's agents)
    "credit_model": {...},            # Full credit model output
    "stress_test": {...},             # Downside scenario analysis
    "risk_score": int,                # 0-100 composite risk score
    "covenant_package": {...},        # Proposed covenants

    # Loan type context (from orchestrator)
    "loan_type_canonical": str,       # e.g. "growth_capital"
    "loan_type_config": {...},        # Thresholds and parameters for this type
}
```

Your specialist agent reads all of this and writes:
```python
credit_state["specialist_analysis"] = {
    "loan_type": str,
    "key_metrics": {...},             # Loan-type-specific metrics
    "structural_recommendations": [str],
    "risk_flags": [str],
    "overall_assessment": str,
}
```

---

## Your Focus Areas

### 1. Make Each Specialist Agent Genuinely Loan-Type-Specific
This is your most important task. Each specialist agent should use fundamentally different analytical frameworks:

- **Growth Capital** → Focus on ARR growth rate, Net Revenue Retention, Burn Multiple, Rule of 40. Do NOT use EBITDA-based leverage ratios — growth companies have negative EBITDA.
- **Mezzanine** → Focus on subordination risk, equity value cushion, PIK accrual impact on leverage, equity kicker valuation
- **Distressed** → Focus on asset recovery values, debt-to-asset ratios, restructuring scenarios, creditor waterfall
- **Project Finance** → Focus on the SPV structure, revenue under long-term offtake agreements, construction risk, P90 DSCR

Review each agent's system prompt and ensure it reflects real-world practice for that loan structure.

### 2. Validate Loan Type Configs
In `core/loan_types.py`, verify these reflect current market standards:
- `max_leverage` — what is typical for each structure today?
- `typical_spread_bps` — are spreads calibrated to current market?
- `auto_reject_risk_score` — distressed debt should have a higher threshold than senior secured

### 3. Strengthen the Documentation Agent
`documentation_agent.py` generates term sheets and credit agreements. It should produce realistic language for:
- Pricing (base rate + spread, floor, PIK toggle if applicable)
- Financial covenants (maintenance vs. incurrence, specific thresholds)
- Conditions precedent (tailored to loan type and deal risk)
- Representations and warranties
- Events of default

### 4. Make the Closing Agent Dynamic
`closing_agent.py` should generate a closing checklist that varies by loan type and flags unresolved conditions from the documentation agent. A project finance closing is very different from a growth capital closing.

### 5. Sharpen Deal Screening
`deal_screener.py` should hard-block deals that fail minimum criteria before DD begins:
- Below minimum loan size
- Excluded sectors (per `data/credit_policy.json`)
- Leverage already exceeds loan-type maximum
- Jurisdiction or structure not supported

---

## Git Workflow

```bash
# Step 1 — Always start fresh from master
git checkout feature/john
git pull origin master

# Step 2 — Do your work (only your files)

# Step 3 — Commit
git add agents/growth_capital_analyst.py core/loan_types.py  # specific files only
git commit -m "[John] Strengthen growth capital ARR-based analysis framework"

# Step 4 — Push
git push origin feature/john

# Step 5 — Open a Pull Request on GitHub
# Go to github.com/peterjohn1298/CreditMind
# Click "Compare & pull request" → base: master
# Title: "[John] Brief description"
# Submit — Chief of Staff reviews automatically in ~1 minute
```

---

## How to Use Claude Code

When starting a Claude Code session, paste this at the beginning:

> "I am working on CreditMind, an AI-powered private credit underwriting platform built with Python, FastAPI, and Streamlit. I am John and I own the deal lifecycle agents and all 7 loan-type specialist agents. All agents inherit from `agents/base_agent.py` and use `run_agentic_loop()` with the Anthropic Claude Sonnet tool-use API. The specialist agents run after Wave 2 and have full access to the credit state including risk score, credit model, and covenants. Loan type configs (max leverage, min DSCR, spread, auto-reject thresholds) are in `core/loan_types.py`. My files are: `agents/origination_scout.py`, `agents/deal_screener.py`, `agents/documentation_agent.py`, `agents/closing_agent.py`, `agents/growth_capital_analyst.py`, `agents/unitranche_analyst.py`, `agents/mezzanine_analyst.py`, `agents/borrowing_base_analyst.py`, `agents/bridge_exit_analyst.py`, `agents/distressed_analyst.py`, `agents/project_finance_analyst.py`, `core/loan_types.py`, `outputs/credit_memo.py`. I want to [describe your task]."

---

## One Rule

Never push directly to `master`. All your work goes through `feature/john` → Pull Request → Chief of Staff review → Peter's approval.

**Questions?** Reach out to Peter directly.
