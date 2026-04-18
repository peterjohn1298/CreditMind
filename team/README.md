# CreditMind — Team Workflow Guide

## Team

| Name | Role | Branch | GitHub Username |
|---|---|---|---|
| Peter | Leader — Architecture, Infra & Credit Intelligence | `master` | peterjohn1298 |
| Abraham | Underwriting & Financial Analysis | `feature/abraham` | Abrahamgeorge97 |
| John | Deal Lifecycle & Loan Type Specialists | `feature/john` | jbhbsbl-netizen |
| Jasmine | Design Lead — UI & Aesthetics | `design/jasmine` | jasminkaur9 |

---

## How It Works

### The Chief of Staff
Every time Abraham, John, or Jasmine opens a Pull Request, an automated **Chief of Staff** agent reviews it before Peter ever sees it. The CoS:

1. Checks that the author only touched files in their assigned zone
2. Flags any edits to shared modules that need Peter's attention
3. Uses Claude AI to detect logical conflicts and integration risks with other members' work
4. Posts a detailed verdict comment on the PR

**Two outcomes:**
- ✅ **CLEARED** — No issues found. Peter reviews and approves.
- 🔴 **BLOCKED** — Issues found. Team member must fix and re-push. Peter is not involved until it's cleared.

---

## Day-to-Day Workflow

### For Abraham, John & Jasmine

**Step 1 — Get the latest code**
```bash
git checkout your-branch
git pull origin master
```

**Step 2 — Do your work**
Only edit files in your assigned zone (see `ownership_map.json`).

**Step 3 — Push your changes**
```bash
git add .
git commit -m "brief description of what you did"
git push origin your-branch
```

**Step 4 — Open a Pull Request on GitHub**
- Go to github.com/peterjohn1298/CreditMind
- Click "Compare & pull request"
- Set base branch to `master`
- Title your PR clearly: `[Abraham] Add SEC filing parser for 10-K data`
- Submit

**Step 5 — Wait for Chief of Staff**
The CoS review runs automatically (takes ~1 minute). Check the comment it posts on your PR.

- If ✅ CLEARED → ping Peter for final approval
- If 🔴 BLOCKED → read the issues, fix them on your branch, push again

---

## File Ownership Zones

### Peter
- `api/master.py`, `app.py`, `streamlit_app.py`
- `core/orchestrator.py`, `core/parallel_runner.py`, `core/credit_policy.py`, `core/credit_state.py`
- `agents/ic_committee.py`, `agents/ic_memo_writer.py`, `agents/risk_scorer.py`, `agents/stress_tester.py`, `agents/credit_modeler.py`, `agents/credit_underwriter.py`
- `data/db.py`, `data/seed_portfolio.py`
- `team/`, `.github/`

### Abraham
- `agents/financial_analyst.py`, `agents/ebitda_analyst.py`, `agents/commercial_analyst.py`, `agents/industry_benchmarker.py`
- `data/financial_data.py`, `data/macro_data.py`, `data/sec_edgar.py`
- `core/tools.py`, `core/tool_executor.py`

### John
- `agents/origination_scout.py`, `agents/deal_screener.py`, `agents/documentation_agent.py`, `agents/closing_agent.py`
- All loan type agents: `agents/growth_capital_analyst.py`, `agents/unitranche_analyst.py`, `agents/mezzanine_analyst.py`, `agents/borrowing_base_analyst.py`, `agents/bridge_exit_analyst.py`, `agents/distressed_analyst.py`, `agents/project_finance_analyst.py`
- `core/loan_types.py`, `outputs/credit_memo.py`

### Jasmine
- Everything inside `frontend/` — full ownership of the UI/design layer

### Shared (requires Peter approval)
- `agents/portfolio_monitor.py`, `agents/covenant_compliance.py`, `agents/rating_reviewer.py`
- `agents/news_intelligence.py`, `agents/sentiment_scorer.py`, `agents/early_warning.py`
- `agents/legal_analyst.py`, `agents/covenant_structurer.py`
- `data/news_data.py`, `data/consumer_signals.py`, `data/jobs_data.py`
- `core/alert_system.py`, `core/portfolio_store.py`, `core/document_processor.py`

---

## One Rule
**Never push directly to `master`.** All changes go through your branch → PR → Chief of Staff review → Peter approval. This keeps the production app stable at all times.

---

## Setup Checklist (Peter — one-time)

- [ ] Add `ANTHROPIC_API_KEY` to GitHub repository secrets (Settings → Secrets → Actions)
- [ ] Fill in Abraham, John, and Jasmine's GitHub usernames in `team/ownership_map.json`
- [ ] Enable branch protection on `master`: require PR + passing status checks before merge
- [ ] Invite Abraham, John, Jasmine as collaborators on the GitHub repo
