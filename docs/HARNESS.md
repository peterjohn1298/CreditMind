# CreditMind — Harness Architecture

> "The model is rented. The harness is owned. In finance, that is where the durable value lives."

This document maps CreditMind to the five harness pillars described in the AI-agents harness lecture. It is the demo narrative and the regulator-readable map of the system's controls.

---

## Why the harness matters in finance

A chatbot that hallucinates a recipe wastes a dinner. A credit underwriting agent that hallucinates a covenant violates federal banking guidance, triggers Model Risk Management escalation, and under the **EU AI Act high-risk provisions effective August 2026** exposes the institution to penalties of up to **7% of global annual turnover**.

Finance has two structural reasons the harness is harder here than anywhere else:

1. **Audit trails are not engineering hygiene — they are legal artefacts.** A bank cannot tell a regulator "the LLM said so." It must show: the input that was retrieved, the tool that was called, the verification that was run, the human who signed off, and the timestamp on each.
2. **Federal Reserve SR 11-7** already specifies six distinct control surfaces. Not suggestions — the regulatory floor.

CreditMind is built around the harness, not around the model. The model is Claude. It is replaceable. Everything we own lives in the harness.

---

## The five pillars, mapped to CreditMind

### Pillar 1 — Tool execution
**Definition:** controlled calls to live financial-data APIs.

| File | Role |
|---|---|
| `core/tools.py` | Every Claude tool is defined here as an explicit JSON schema with named, typed inputs. No free-form web access. |
| `core/tool_executor.py` | Maps tool names to actual function calls. Tool results are capped at 3500 characters in `execute_tool()` to prevent context blow-up. |
| `data/financial_data.py`, `data/news_data.py`, `data/macro_data.py`, `data/sec_edgar.py`, `data/jobs_data.py`, `data/consumer_signals.py` | Each external API has a dedicated, parameterised wrapper. No raw `requests.get`. |

Agents do not have unrestricted tool use. Each agent is configured with an explicit subset of tools (e.g. `FINANCIAL_ANALYST_TOOLS`, `SCREENING_TOOLS`, `KYC_AML_TOOLS`). A tool that doesn't exist in that subset cannot be called.

### Pillar 2 — Persistence
**Definition:** the audit contract — the immutable record a regulator can reconstruct.

This is the pillar the lecture explicitly named CreditMind for: *"the persistence and human gate story."*

| File | Role |
|---|---|
| `core/credit_state.py` | The single shared object passed through the entire pipeline. Every agent's outputs land in named keys. Mutations only via `log_agent()`, `add_alert()`, `add_routing_note()` — never direct dict edits. Each call appends to `agent_log[]` with `{agent, timestamp, token_cost, latency_ms, model, rationale}`. |
| `data/db.py` | SQLAlchemy Core against Railway Postgres. Three tables — `deals` (JSONB), `sector_alerts` (JSONB), `sector_scores` (int). Every `_portfolio` mutation persists via `save_deal()` / `save_portfolio()`. |
| `agents/base_agent.py` | All agents inherit. The `run_agentic_loop` records token usage and latency per iteration. |
| Per-deal commit: every wave writes to credit_state before the next wave reads. The orchestrator never lets Wave 2 read from Wave 1 until Wave 1 has logged. |

A regulator can request the full lifecycle of any single deal, by `deal_id`, from origination through closing — every agent that touched it, every tool it called, every output it produced — reconstructed deterministically from Postgres.

### Pillar 3 — Verification
**Definition:** calibrated confidence — not model self-assessment, but track-record-backed.

| Mechanism | Where |
|---|---|
| Confidence + citations on every extracted field | Added in commit `ef91ffe` ("R2-3"). Every numeric or factual extraction by `financial_analyst`, `ebitda_analyst`, `commercial_analyst`, `legal_analyst`, `credit_modeler` carries `confidence` (HIGH/MEDIUM/LOW) and `source_citation` (specific document section / SEC filing / news article). |
| Ducommun faithfulness benchmark | Added in commit `1b021e2` ("R2-4"). `benchmark/cases/ducommun_case.json` defines a labelled ground truth. `benchmark/run.py` re-runs the agent pipeline and `benchmark/scorer.py` measures faithfulness vs. the labelled answers. Results land in `benchmark/results/` with per-agent score and timestamp. |
| Cross-source reconciliation | The Documentation Agent and IC Committee both verify that EBITDA in `financial_analysis` matches EBITDA in `ebitda_analysis` (after add-backs). Divergence flags via `add_divergence()`. |
| Schema validation | Pydantic input/output contracts (commit `4317e0e`, "R2-5") reject malformed agent output before downstream agents read it. |

Verification is not "the model said it was 80% confident." It is "the agent's outputs vs. labelled benchmarks, plus cross-source reconciliation, plus schema gates."

### Pillar 4 — Guardrails
**Definition:** typed schemas, not prose instructions.

| Mechanism | Where |
|---|---|
| Pydantic request/response models | `api/main.py` — `UnderwriteRequest`, `DealTeaserRequest`, `KYCRequest`, `ESGRequest`, `ValuationRequest`, `LPReportingRequest`, `ClosingRequest` — every endpoint typed |
| `core/schemas.py` | Per-agent input and output schemas, validated before and after each `run()` |
| `core/credit_policy.py` | Hard policy enforcement engine. `check_new_deal()` runs before DD; hard blocks abort the pipeline. Concentration limits, prohibited investments, sector caps, geographic restrictions all enforced as code — not as system-prompt text. |
| `data/credit_policy.json` | The human-readable policy document. The enforcement engine is auto-generated from this. |
| Frontend type contracts | `frontend/lib/types.ts` — every backend response shape has a typed interface. Type errors surface at compile time, not at runtime. |

When the guard rail says "no second-lien loans without IC waiver," it is enforced by `_check_loan_parameters()` in code — not "please remember this" in a prompt.

### Pillar 5 — Safe execution
**Definition:** observable agents with cost ceilings and kill switches.

| Mechanism | Where |
|---|---|
| Per-agent audit trail | Commit `4d84e68` ("R2-6") adds `token_cost`, `latency_ms`, `model`, and `rationale` to every `agent_log` entry. Per-deal cost is the sum of all agent calls. |
| Background scheduler | `api/main.py` runs APScheduler with bounded `max_instances=1` and `misfire_grace_time` on both jobs. Sector monitoring every 6h, daily monitoring at 02:00 UTC. No runaway loops. |
| Iteration cap | `agents/base_agent.py` — the agentic loop hard-stops at 10 iterations. The last text response is returned if the cap is hit. |
| Tool-result truncation | `execute_tool()` caps any single tool response at 3500 characters. |
| Human checkpoints | The IC Gate — `human-in-the-loop IC checkpoint layer` (commit `6f45ebd`) — requires explicit human signature before any post-IC agent runs. Closing CP status updates also human-signed. |
| Live cost / token surface | Surfaced in the new `/harness` route — see "What the user sees" below. |

The orchestrator can be stopped, slowed, or audited at any point. No agent runs without observability.

---

## The IC Gate — engineered substitute for professional code

> "The routing layer is not a UX nicety. It is the engineered substitute for shame, license, and professional code... You can see this exact pattern in CreditMind's IC gate, a hard checkpoint between the credit modeler's recommendation and the actual credit decision. The gate is mandatory. No bypass, no override without a logged human signature."
> — AI Agents: Harness System Examples in Finance

A retail financial advisor is four roles in one human: client work-partner, agent of record, supervisor, judge. They navigate the seams between roles with professional code, license risk, and felt shame. An AI advisor has none of that felt weight. **The harness must substitute for it.**

CreditMind does this with the IC Gate:

1. Wave 1 (parallel) — financial, EBITDA, commercial, legal analysts run independently
2. Wave 2 (sequential) — credit modeler → stress tester → risk scorer → covenant structurer
3. Wave 3 (hard gates) — ESG and KYC/AML run; either's REJECT verdict aborts the pipeline before IC
4. **IC checkpoint** — mandatory human signature. No code path bypasses it. The human sees the full credit_state, every confidence score, every benchmark hit, and signs.
5. Documentation Agent → Closing Agent — only run AFTER signed approval
6. Every CP status change is human-signed and logged

The gate is the engineered substitute for the felt weight of a license that can be revoked.

---

## What the user sees — the `/harness` route

A dedicated route at `credit-mind-nine.vercel.app/harness` makes the harness visible:

- **Five-pillar status panel** — Tool execution, Persistence, Verification, Guardrails, Safe execution. Each shows a compliance badge and the specific files that implement it.
- **Per-agent audit trail** — for any selected deal, every agent in `agent_log[]` with token cost, latency, model, rationale, timestamp.
- **Confidence + citations view** — every extracted field with its confidence and source citation, side by side.
- **Benchmark hit rate** — Ducommun faithfulness gate, with per-agent score and the date of the last run.
- **Cost / latency budget** — total tokens and seconds per deal, against per-agent ceilings. Anything over budget is flagged.
- **Human gate log** — every IC checkpoint signed, with timestamp, signer, and the credit_state hash at signing.
- **Kill switch** — disables agent execution platform-wide. Frontend toggle, persisted.

This page is the demo headline. *Other AI projects built chatbots. We built the harness.*

---

## Five operating principles

These are committed to repo norms and applied in every commit:

1. **Build the audit contract before the agent.** If you cannot describe what a regulator will see, you do not yet have a system.
2. **Type the seams.** Every handoff between agent roles runs through a Pydantic schema or TypedDict contract. Prose handoffs fail silently.
3. **Put humans at the seams, not in the middle.** IC gate, AML escalation, suitability override, ESG hard exclusion — engineered substitutes for license and shame.
4. **Benchmark before you scale.** The Ducommun faithfulness gate runs on every deploy. A labeled case suite is the cheapest insurance a finance AI system can buy.
5. **Treat the harness as the product.** The model is rented. The harness is owned.

---

## References

- AI Agents: Harness System — https://youtu.be/ypwMwzSrHmE
- AI Agents: Harness System Examples in Finance — https://youtu.be/VrdpfoW3k5Q
- Federal Reserve SR 11-7 — Guidance on Model Risk Management
- EU AI Act, Title III (high-risk AI systems) — effective August 2026
- FinCEN AML Final Rule for Investment Advisers — effective January 2028
- Wharton-Accenture AI Workforce Report (2026)
