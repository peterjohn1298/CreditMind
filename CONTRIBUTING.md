# CreditMind — Team Contribution Guide

## Branch Strategy

```
main          ← protected. Only merged PRs land here. This is what gets deployed.
  └── develop ← integration branch. All feature branches merge here first.
        ├── feature/data-layer
        ├── feature/pre-disbursement
        ├── feature/post-disbursement-daily
        └── feature/post-disbursement-quarterly
```

**Rules:**
- Never commit directly to `main` or `develop`
- Always work on your assigned feature branch
- Open a Pull Request to merge into `develop`
- At least one teammate must review and approve before merge

---

## Team Assignments

| Member | Branch | Owns |
|---|---|---|
| Peter | `feature/pre-disbursement` | `agents/financial_analyst.py`, `agents/credit_underwriter.py`, `outputs/credit_memo.py` |
| Member 2 | `feature/risk-and-benchmarking` | `agents/risk_scorer.py`, `agents/industry_benchmarker.py`, `data/macro_data.py` |
| Member 3 | `feature/covenants-and-compliance` | `agents/covenant_structurer.py`, `agents/covenant_compliance.py`, `agents/rating_reviewer.py` |
| Member 4 | `feature/post-disbursement-daily` | `agents/news_intelligence.py`, `agents/sentiment_scorer.py`, `agents/early_warning.py`, `agents/portfolio_monitor.py`, `app.py` |

Shared ownership (discuss before changing):
- `core/credit_state.py` — shared state object
- `core/orchestrator.py` — orchestrator
- `data/financial_data.py` — data layer
- `requirements.txt`

---

## Daily Workflow

### First time setup
```bash
git clone https://github.com/YOUR_ORG/creditmind.git
cd creditmind
git checkout develop
git checkout -b feature/your-branch-name
pip install -r requirements.txt
cp .env.example .env   # then fill in your API keys
```

### Every working session
```bash
# 1. Pull latest from develop before you start
git checkout develop
git pull origin develop
git checkout feature/your-branch-name
git merge develop        # bring your branch up to date

# 2. Do your work
# ... write code ...

# 3. Run tests before pushing
pytest tests/ -v

# 4. Stage and commit
git add agents/your_agent.py tests/test_your_agent.py
git commit -m "feat: [description of what you built]"

# 5. Push your branch
git push origin feature/your-branch-name

# 6. Open a Pull Request on GitHub → base: develop
```

---

## Commit Message Convention

```
feat: add risk scorer agent with PD calculation
fix: handle missing DSCR when cash flow data unavailable
test: add covenant compliance edge case tests
docs: update contributing guide with branch names
refactor: simplify credit_state alert structure
```

---

## Pull Request Checklist

Before opening a PR, confirm:
- [ ] `pytest tests/ -v` passes locally (all green)
- [ ] Your agent has at least 2 tests in `tests/test_agents.py`
- [ ] No API keys committed (check `.env` is in `.gitignore`)
- [ ] PR description explains what the agent does and what you tested

---

## Running the App Locally

```bash
cd creditmind
streamlit run app.py
```

---

## Questions / Conflicts

If two members need to change a shared file (`credit_state.py`, `orchestrator.py`):
1. Discuss on the group chat first
2. One person makes the change
3. Everyone else pulls `develop` before continuing
