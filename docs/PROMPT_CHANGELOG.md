# Prompt Changelog

Tracks every agent prompt change, the reason it was made, and which benchmark metric moved.
Benchmark: Ducommun FY2024 faithfulness gate — target ≥ 0.85 against `benchmark/ground_truth/ducommun_2024.json`.
Auditor model: `claude-opus-4-7` (pinned in `benchmark/scorer.py` — changing it requires a new changelog entry).

---

## Format

| Date | Agent(s) | Change | Metric Before | Metric After |
|---|---|---|---|---|

"Metric before" is `—` when no baseline run existed at the time of the change.
"Metric after" is `—` when the change has not yet been scored against a live pipeline run.

---

## Entries

### 2026-04-29 — R2-1: Agentic RAG — retrieval instructions added to Wave 1 agents

**Commit:** `3310795`
**Files changed:** `agents/financial_analyst.py`, `agents/ebitda_analyst.py`, `agents/commercial_analyst.py`, `agents/legal_analyst.py`

**What changed in each prompt:**
- Added a conditional `DOCUMENT RETRIEVAL AVAILABLE (Deal ID: {deal_id})` block when the deal's RAG index is populated.
- Block instructs Claude to call `retrieve_document_section(deal_id, doc_type, query)` with targeted queries rather than relying solely on the pre-extracted blob injected into the prompt.
- Recommended query strings added per agent:
  - **Financial Analyst** (4 queries): income statement, debt obligations, cash flow, audit footnotes
  - **EBITDA Analyst** (5 queries): add-backs, management fees, pro-forma synergies, EBITDA reconciliation, restructuring
  - **Commercial Analyst** (6 queries): revenue breakdown, customer concentration, competitive landscape, management, growth strategy, key risks
  - **Legal Analyst** (6 queries): covenants, collateral/lien, litigation, change of control, existing debt, regulatory permits

**Why:** Large PDFs were being truncated to ~14,000 chars before injection. For a 200-page 10-K this discarded ~93% of the document. The agentic retrieval loop replaces truncation with on-demand section lookup via TF-IDF cosine similarity.

| Metric | Before | After |
|---|---|---|
| Effective document coverage (chars) | ~14,000 (hard cap) | Full document (indexed, retrieved on demand) |
| Source citations possible | No — truncation discards page context | Yes — `source_page` and `source_quote` available per retrieval hit |
| Benchmark faithfulness | — (benchmark not yet created) | Established baseline in same session (see R2-3/R2-4 below) |

---

### 2026-04-29 — R2-3: Confidence + citations schema added to all extracted fields

**Commit:** `ef91ffe`
**Files changed:** `agents/financial_analyst.py`, `agents/ebitda_analyst.py`, `agents/commercial_analyst.py`, `agents/legal_analyst.py`, `agents/credit_modeler.py`

**What changed in each prompt:**

**CITATION GUIDE block added to all 5 agents:**
```
CITATION GUIDE — for every cited field use this structure:
  {"value": <number>, "confidence": "HIGH | MEDIUM | LOW", "source_page": <int or null>,
   "source_quote": "<verbatim excerpt, max 120 chars, or null>"}
  confidence: HIGH = explicitly stated | MEDIUM = calculated from stated values | LOW = estimated or not found
```

**Fields upgraded from plain scalar to cited schema (by agent):**

| Agent | Fields upgraded |
|---|---|
| Financial Analyst | `revenue_trend.cagr_3yr`, `year_over_year.yr1_to_yr2/yr2_to_yr3`, all profitability margins, `current_ratio`, `cash_balance`, `total_debt`, `net_debt`, `operating_cf`, `capex`, `free_cash_flow` |
| EBITDA Analyst | `reported_ebitda`, each `add_back_analysis[].amount`, `conservative_adjusted_ebitda`, `base_adjusted_ebitda` |
| Commercial Analyst | `market_assessment.growth_rate`, `revenue_quality.recurring_revenue_pct`, `revenue_quality.top_customer_pct` |
| Legal Analyst | `capital_structure.existing_senior_debt`, `.existing_total_debt`, `.pro_forma_total_debt`, `litigation_assessment.total_amount_at_risk` |
| Credit Modeler | `ebitda_used`, `pro_forma_total_debt`, `leverage_metrics.total_leverage`, `.net_leverage`, `coverage_metrics.interest_coverage`, `.dscr` |

**Why:** Plain `{"value": X}` outputs gave no traceability. The cited schema forces agents to specify how confident they are and where the figure came from — matching the evidence standard a credit committee would require before relying on a number.

| Metric | Before | After |
|---|---|---|
| Key fields with source attribution | 0 of N extracted fields | 100% of key fields in 5 agents |
| Confidence signal available | No | Yes — HIGH / MEDIUM / LOW per field |
| Auditable extraction errors | Silent (hallucinated value indistinguishable from extracted) | Flaggable — LOW confidence + null source_page signals weak extraction |
| Benchmark faithfulness | — (benchmark created alongside this change) | Gate established: ≥ 0.85 required |

---

### 2026-04-29 — R2-4: Benchmark ground truth and faithfulness gate created

**Commit:** `1b021e2`
**Files added:** `benchmark/ground_truth/ducommun_2024.json`, `benchmark/scorer.py`, `benchmark/run.py`

This is not a prompt change — it is the measurement system that all future prompt changes are measured against.

**Baseline established:**
- 12 numeric fields from Ducommun FY2024 (revenue, EBITDA variants, leverage, coverage, etc.)
- 4 qualitative checks scored by `claude-opus-4-7` as LLM-as-judge
- Pass gate: faithfulness ≥ 0.85

**Auditor model rationale:** `claude-opus-4-7` chosen over Sonnet for the benchmark auditor because:
(a) scoring happens offline, not in the live pipeline — cost is not a constraint;
(b) the qualitative judge needs strong instruction-following to consistently apply the 0–1 rubric;
(c) pinning the model makes faithfulness scores reproducible across runs.
If the auditor model is ever changed, a new entry must be added here with before/after scores.

| Metric | Before | After |
|---|---|---|
| Automated faithfulness measurement | None | Ducommun gate: ≥ 0.85 on 16 fields |
| Source of ground truth | None | `benchmark/ground_truth/ducommun_2024.json` |
| Gate status on first run | — | Pending live pipeline run with API key |

---

## How to add an entry

When you change any agent prompt:

1. Add a row to this file **before merging**.
2. Run `python benchmark/run.py` to get the current faithfulness score.
3. If the score moves by more than ±0.05, include before/after scores in the entry.
4. If you pin a new auditor model in `benchmark/scorer.py`, add a dedicated entry explaining why.

Entries are **append-only** — do not edit or delete past entries.
