"""
Benchmark Scorer — evaluates agent output faithfulness against labeled ground truth.

Two scoring modes:
  1. Numeric: extracted value within tolerance of ground truth
  2. Qualitative: LLM-as-judge (claude-opus-4-7) checks whether the agent's
     text output is consistent with the stated claim

Overall faithfulness = correct_fields / total_fields
Pass gate: faithfulness >= FAITHFULNESS_THRESHOLD (0.85)

Auditor model is pinned so faithfulness trend is reproducible across runs.
"""

import os
import json
import math
from typing import Any

from anthropic import Anthropic

FAITHFULNESS_THRESHOLD = 0.85
AUDITOR_MODEL = "claude-opus-4-7"   # pinned — do not change without logging in PROMPT_CHANGELOG.md

_client = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


# ── Numeric scoring ───────────────────────────────────────────────────────────

def score_numeric_field(
    field_name: str,
    extracted: Any,
    ground_truth: dict,
) -> dict:
    """
    Compare extracted value to ground truth within tolerance.
    extracted may be a plain scalar or a cited {value:...} dict.
    Returns {field, extracted_value, expected_value, pass, delta_pct, note}.
    """
    # Unwrap cited format
    if isinstance(extracted, dict):
        raw_value = extracted.get("value")
        confidence = extracted.get("confidence", "UNKNOWN")
        source_page = extracted.get("source_page")
    else:
        raw_value = extracted
        confidence = "UNKNOWN"
        source_page = None

    expected = ground_truth["value"]
    tolerance_pct = ground_truth.get("tolerance_pct")
    tolerance_abs = ground_truth.get("tolerance_abs")

    result = {
        "field": field_name,
        "expected": expected,
        "extracted": raw_value,
        "confidence": confidence,
        "source_page": source_page,
        "unit": ground_truth.get("unit", ""),
    }

    if raw_value is None:
        result["pass"] = False
        result["note"] = "NOT EXTRACTED — agent returned null"
        result["delta_pct"] = None
        return result

    try:
        extracted_num = float(raw_value)
        expected_num  = float(expected)
    except (TypeError, ValueError):
        result["pass"] = False
        result["note"] = f"Non-numeric value: {raw_value!r}"
        result["delta_pct"] = None
        return result

    if tolerance_pct is not None and expected_num != 0:
        delta_pct = abs(extracted_num - expected_num) / abs(expected_num)
        passed = delta_pct <= tolerance_pct
        result["delta_pct"] = round(delta_pct * 100, 2)
        result["tolerance"] = f"±{tolerance_pct*100:.0f}%"
    elif tolerance_abs is not None:
        delta_abs = abs(extracted_num - expected_num)
        passed = delta_abs <= tolerance_abs
        result["delta_pct"] = round(delta_abs, 3)
        result["tolerance"] = f"±{tolerance_abs}"
    else:
        passed = math.isclose(extracted_num, expected_num, rel_tol=0.01)
        result["delta_pct"] = None
        result["tolerance"] = "exact"

    result["pass"] = passed
    result["note"] = "PASS" if passed else f"FAIL — extracted {extracted_num}, expected {expected_num}"
    return result


# ── Qualitative scoring (LLM-as-judge) ───────────────────────────────────────

def score_qualitative_field(
    check: dict,
    agent_output: str,
) -> dict:
    """
    Use claude-opus-4-7 as an auditor to assess whether the agent's output
    is consistent with the ground truth claim.
    Returns {id, pass, score_0_to_1, rationale}.
    """
    if not agent_output or not str(agent_output).strip():
        return {
            "id": check["id"],
            "pass": False,
            "score": 0.0,
            "rationale": "Agent field was empty or missing.",
        }

    prompt = f"""You are an impartial credit analysis auditor. Your job is to assess whether an AI agent's output is faithful to a stated ground truth claim about a company's financials.

GROUND TRUTH CLAIM:
{check['claim']}

AGENT OUTPUT (the field being evaluated):
{str(agent_output)[:800]}

Evaluate: Is the agent's output CONSISTENT with the ground truth claim?
- Score 1.0: fully consistent, claim is clearly supported
- Score 0.7: mostly consistent, minor omissions
- Score 0.4: partially consistent, key aspect missing or understated
- Score 0.0: inconsistent or contradicts the claim

Respond with valid JSON only:
{{"score": <0.0-1.0>, "rationale": "<one sentence explanation>"}}"""

    try:
        response = _get_client().messages.create(
            model=AUDITOR_MODEL,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        clean = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        parsed = json.loads(clean)
        score = float(parsed.get("score", 0.0))
        return {
            "id": check["id"],
            "pass": score >= 0.7,
            "score": round(score, 2),
            "rationale": parsed.get("rationale", ""),
        }
    except Exception as e:
        return {
            "id": check["id"],
            "pass": False,
            "score": 0.0,
            "rationale": f"Auditor call failed: {e}",
        }


# ── Overall faithfulness ──────────────────────────────────────────────────────

def compute_faithfulness(numeric_results: list, qualitative_results: list) -> dict:
    """
    Compute overall faithfulness score and pass/fail verdict.
    Numeric fields are weighted equally with qualitative fields.
    """
    all_scores = []

    for r in numeric_results:
        all_scores.append(1.0 if r["pass"] else 0.0)

    for r in qualitative_results:
        all_scores.append(r.get("score", 0.0))

    if not all_scores:
        return {"faithfulness": 0.0, "pass": False, "total_fields": 0}

    faithfulness = sum(all_scores) / len(all_scores)
    return {
        "faithfulness": round(faithfulness, 3),
        "pass": faithfulness >= FAITHFULNESS_THRESHOLD,
        "threshold": FAITHFULNESS_THRESHOLD,
        "total_fields": len(all_scores),
        "fields_passed": sum(1 for s in all_scores if s >= 0.7),
        "auditor_model": AUDITOR_MODEL,
    }
