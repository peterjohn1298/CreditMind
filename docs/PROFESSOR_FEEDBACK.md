# Professor Feedback — Final Submission Tracker

## Overall Assessment

> "The most complete and reproducible submission. The interface contract table — naming the data, agent, router, LLM, and audit contracts as separate guarantees — shows genuine systems thinking."

Praised elements (no action required):
- Interface contract table (data / agent / router / LLM / audit contracts as separate guarantees)
- Dynamic routing: auto-reject at risk score ≥ 75, fast-track on DISTRESSED health
- Human IC gate as a harness guardrail (human-in-the-loop before credit decision proceeds)
- Early warning lead time: 11 trading days ahead of first agency action, false positive rate 0.08

---

## Feedback Items

### 1. `divergence_flags` — EBITDA cross-check harness loop

**Status: DONE — implemented 2026-04-29**

**Professor's instruction:**
> "`divergence_flags` in `credit_state.py` remains unpopulated. After Wave 2 agents write their outputs, the harness checks whether EBITDA from Financial Analyst, EBITDA Analyst, and Credit Modeler agree within a defined tolerance before the IC Memo Writer runs. If they do not, the harness routes back. The model synthesizes, the harness verifies."

**Current state:**
- `divergence_flags` field exists in `credit_state.py:82` and `add_divergence()` helper at line 108
- `core/orchestrator.py` never calls `add_divergence()` — field is always empty
- IC Memo Writer runs unconditionally after Wave 2 with no EBITDA consistency check

**What was built:**
- `_check_ebitda_divergence()` helper in `core/orchestrator.py` — compares `credit_model.ebitda_used` against `ebitda_analysis.conservative_adjusted_ebitda` and `base_adjusted_ebitda` within ±15% tolerance
- Three checks: absolute gap vs conservative, inflation above base case, basis mismatch (declared conservative but used different figure)
- Runs immediately after Credit Modeler (Agent 5) — before Stress Tester proceeds on potentially wrong numbers
- On divergence: calls `add_divergence()`, adds HIGH alert, re-runs Credit Modeler once with explicit conservative constraint in routing_notes
- If divergence persists after retry: CRITICAL alert + escalation note; IC Memo Writer still runs so committee can see the flags
- Note: Financial Analyst outputs `ebitda_margin` (%) not absolute EBITDA — check is EBITDA Analyst vs Credit Modeler (both absolute)

---

### 2. 10-K Truncation — Agentic RAG Roadmap

**Status: DONE — written into FOUNDATION.md 2026-04-29**

**Professor's instruction:**
> "The 10-K truncation issue points to agentic RAG as the Week 6 architecture: index the document by section, let each Wave 1 agent issue targeted retrieval queries rather than receiving a truncated window. Name that as the roadmap, even if the implementation follows the final submission."

**Current state:**
- Wave 1 agents receive a truncated document window — large 10-Ks are cut off
- No section-level indexing or retrieval in place

**What was written:**
- New `## Week 6 Architecture Roadmap — Agentic RAG` section in `FOUNDATION.md`
- Explains the current truncation problem, the target section-indexed retrieval architecture, key design decisions (section-level indexing, per-agent queries, `RETRIEVE_DOCUMENT_SECTION` tool in the agentic loop, fallback for short docs), and an implementation sketch (`core/document_indexer.py`, FAISS/ChromaDB, tool additions to Wave 1 agents)

---

## Summary

| # | Item | Status | File(s) |
|---|---|---|---|
| 1 | `divergence_flags` EBITDA cross-check harness loop | **DONE** | `core/orchestrator.py` |
| 2 | Agentic RAG roadmap statement | **DONE** | `FOUNDATION.md` |
