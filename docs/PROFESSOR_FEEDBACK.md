# Professor Feedback — Final Submission Tracker

---

## Round 1 Feedback

### Overall Assessment

> "The most complete and reproducible submission. The interface contract table — naming the data, agent, router, LLM, and audit contracts as separate guarantees — shows genuine systems thinking."

Praised (no action required):
- Interface contract table (data / agent / router / LLM / audit contracts as separate guarantees)
- Dynamic routing: auto-reject at risk score ≥ 75, fast-track on DISTRESSED health
- Human IC gate as a harness guardrail
- Early warning lead time: 11 trading days ahead of first agency action, FPR 0.08

### Items

| # | Item | Status | File(s) |
|---|---|---|---|
| R1-1 | `divergence_flags` EBITDA cross-check harness loop | **DONE 2026-04-29** | `core/orchestrator.py` |
| R1-2 | Agentic RAG roadmap in FOUNDATION.md | **DONE 2026-04-29** | `FOUNDATION.md` |

**R1-1 — What was built:** `_check_ebitda_divergence()` in `core/orchestrator.py`. Compares `credit_model.ebitda_used` against `ebitda_analysis.conservative_adjusted_ebitda` / `base_adjusted_ebitda` within ±15% tolerance. Fires after Credit Modeler (Agent 5), before Stress Tester. On divergence: HIGH alert, re-runs Credit Modeler once with conservative constraint in routing_notes. Persists after retry: CRITICAL alert, escalated to IC.

**R1-2 — What was written:** `## Week 6 Architecture Roadmap — Agentic RAG` section in `FOUNDATION.md`. Section-indexed retrieval, per-agent queries, `RETRIEVE_DOCUMENT_SECTION` tool, FAISS/ChromaDB implementation sketch.

---

## Round 2 Feedback

### Overall Assessment

> "The most ambitious AI architecture of the three: 14 agents, two-phase pipeline, real agentic tool-use loop, parallel orchestration with dynamic routing. Runs on a real Ducommun 10-K."

> "First thing to fix — the biggest credibility risk. Large PDFs are truncated to roughly 14,000 characters before being handed to the model. For credit underwriting, that's the single largest threat to output integrity. No senior credit analyst would sign a memo based on a selectively-truncated 10-K."

### Top 3 Items (Must Fix)

| # | Item | Priority | Status | File(s) |
|---|---|---|---|---|
| R2-1 | Agentic RAG — full document retrieval with citations | **CRITICAL** | **DONE 2026-04-29** | `core/document_indexer.py`, `core/tools.py`, `core/tool_executor.py`, all agents |
| R2-2 | Cross-agent EBITDA reconciliation | Already done (R1-1) | **DONE** | `core/orchestrator.py` |
| R2-3 | Confidence + citations on every extracted field | HIGH | **DONE 2026-04-29** | all agents |

### "What a Reviewer Recognizes as Mature"

| # | Item | Status | File(s) |
|---|---|---|---|
| R2-4 | Benchmark folder: labeled cases + faithfulness ≥ 0.85 gate | **DONE 2026-04-29** | `benchmark/` |
| R2-5 | Input/output contracts: schema validation, failures logged + retried | **DONE 2026-04-29** | `core/schemas.py`, `agents/base_agent.py`, 5 agents |
| R2-6 | Audit trail: per-step token cost + latency, model choice rationale | **DONE 2026-04-29** | `agents/base_agent.py`, `core/credit_state.py` |
| R2-7 | Prompt changelog: which prompts changed, which metric moved | **OPEN** | `docs/` |

---

### R2-1 Detail — Agentic RAG (CRITICAL)

**Professor's instruction:**
> "Index all four document types (financials, QoE, CIM, legal DD) by section into a vector store (Chroma or FAISS). Let each agent pull the specific passages it needs. This removes the truncation issue and, as a bonus, gives every memo section a citation — exactly the evidence trail a credit committee would demand."

**What needs to be built:**
- `core/document_indexer.py` — parse uploaded PDFs into named sections, embed, store in FAISS/Chroma
- New tool `RETRIEVE_DOCUMENT_SECTION(query, top_k)` in `core/tools.py` + handler in `core/tool_executor.py`
- Add retrieval tool to Wave 1 agent tool sets; update agent prompts to call retrieval instead of reading injected blob
- Fallback: documents under ~20 pages continue to use current flat-window approach

---

### R2-3 Detail — Confidence + Citations

**Professor's instruction:**
> "Upgrade each extraction schema from `{value}` to `{value, confidence, source_page, source_quote}`. Three wins: data-quality improvement, benchmarkable artifact (measure citation accuracy against PDF), real hallucination guarrail."

**What needs to be built:**
- Update agent output schemas in `agents/financial_analyst.py`, `agents/ebitda_analyst.py`, `agents/credit_modeler.py`, `agents/legal_analyst.py`, `agents/commercial_analyst.py` to wrap key fields with `{value, confidence, source_page, source_quote}`

---

### R2-4 Detail — Benchmark Folder

**Professor's instruction:**
> "A benchmark folder with labeled cases and a pass/fail threshold — e.g., faithfulness must stay above 0.85, otherwise the submission fails its own gate."

**What needs to be built:**
- `benchmark/` folder with labeled ground-truth cases (Ducommun 10-K as source)
- `benchmark/run.py` — compare agent outputs to ground truth, compute faithfulness score
- Pass/fail gate: faithfulness ≥ 0.85

---

### R2-5 Detail — Input/Output Contracts

**Professor's instruction:**
> "Schema validation on market/financial inputs, schema validation on agent outputs, with failures logged and retried."

---

### R2-6 Detail — Audit Trail

**Professor's instruction:**
> "Per-step traces showing token cost and execution time, plus a brief note on why you chose a given model for a given step."

---

### R2-7 Detail — Prompt Changelog

**Professor's instruction:**
> "A short prompt changelog recording which prompts changed, which benchmark metric moved, and by how much. Reviewers rarely see this from a student project."

**What needs to be built:**
- `docs/PROMPT_CHANGELOG.md` — table: date | agent | change summary | metric before | metric after
