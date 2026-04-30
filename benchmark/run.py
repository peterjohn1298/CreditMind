"""
Benchmark Runner — scores CreditMind agent outputs against Ducommun ground truth.

Usage:
  python benchmark/run.py                        # score latest saved result
  python benchmark/run.py --live                 # run full pipeline + score (costs API calls)
  python benchmark/run.py --result results/x.json  # score a specific saved result

Pass gate: faithfulness >= 0.85  (exits with code 1 if gate fails)

The pass gate is the submission quality gate — if faithfulness drops below 0.85,
the pipeline has regressed and must not be submitted.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Resolve project root so this script works from any working directory
_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(_ROOT))

_GROUND_TRUTH_PATH = Path(__file__).parent / "ground_truth" / "ducommun_2024.json"
_CASE_PATH         = Path(__file__).parent / "cases" / "ducommun_case.json"
_RESULTS_DIR       = Path(__file__).parent / "results"

from benchmark.scorer import (
    score_numeric_field,
    score_qualitative_field,
    compute_faithfulness,
    FAITHFULNESS_THRESHOLD,
)


def _load_json(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


def _get_nested(obj: dict, path: str):
    """Traverse dot-separated path in a nested dict. Returns None if missing."""
    parts = path.split(".")
    for p in parts:
        if not isinstance(obj, dict):
            return None
        obj = obj.get(p)
    return obj


def _latest_result() -> Path:
    results = sorted(_RESULTS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not results:
        return None
    return results[0]


def run_live_pipeline() -> dict:
    """Run the full CreditMind pipeline against Ducommun PDFs and return credit_state."""
    from dotenv import load_dotenv
    load_dotenv(_ROOT / ".env")

    case = _load_json(_CASE_PATH)
    docs_meta = case.get("_meta", {}).get("documents", {})

    from core.document_processor import (
        extract_financials, extract_qoe, extract_cim, extract_full_text,
    )
    from core.orchestrator import run_due_diligence

    documents = {}
    documents_raw = {}

    for doc_type, rel_path in docs_meta.items():
        pdf_path = _ROOT / rel_path
        if not pdf_path.exists():
            print(f"  [WARN] PDF not found: {pdf_path} — skipping {doc_type}")
            continue
        pdf_bytes = pdf_path.read_bytes()
        print(f"  Extracting {doc_type} ({len(pdf_bytes)//1024}KB)...")
        if doc_type == "financials":
            documents[doc_type] = extract_financials(pdf_bytes)
        elif doc_type == "qoe":
            documents[doc_type] = extract_qoe(pdf_bytes)
        elif doc_type == "cim":
            documents[doc_type] = extract_cim(pdf_bytes)
        documents_raw[doc_type] = extract_full_text(pdf_bytes)

    print("  Running due diligence pipeline...")
    credit_state = run_due_diligence(
        company=case["company"],
        loan_amount=case["loan_amount"],
        loan_tenor=case["loan_tenor"],
        loan_type=case["loan_type"],
        documents=documents,
        documents_raw=documents_raw,
        sponsor=case.get("sponsor"),
        deal_type=case.get("deal_type", "direct"),
    )

    # Save result
    _RESULTS_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = _RESULTS_DIR / f"ducommun_{ts}.json"
    with open(out_path, "w") as f:
        json.dump(credit_state, f, indent=2, default=str)
    print(f"  Saved pipeline output → {out_path}")
    return credit_state


def score(credit_state: dict, ground_truth: dict, verbose: bool = True) -> dict:
    """Score a credit_state dict against ground truth. Returns full report."""

    if verbose:
        print("\n" + "="*60)
        print("  CREDITmind FAITHFULNESS BENCHMARK — Ducommun 2024")
        print("="*60)

    numeric_results = []
    for field_name, gt in ground_truth["numeric_fields"].items():
        # Map ground truth field name → credit_state path
        extracted = _extract_field(credit_state, field_name)
        result = score_numeric_field(field_name, extracted, gt)
        numeric_results.append(result)
        if verbose:
            icon = "PASS" if result["pass"] else "FAIL"
            delta = f"  delta={result['delta_pct']}%" if result["delta_pct"] is not None else ""
            print(f"  [{icon}] {field_name:<35} extracted={result['extracted']}  expected={result['expected']}{delta}")

    if verbose:
        print()
        print("  Qualitative checks (LLM-as-auditor, model: claude-opus-4-7):")

    qualitative_results = []
    for check in ground_truth["qualitative_checks"]:
        agent_output = _get_nested(credit_state, check["agent_output_path"])
        if agent_output is None:
            result = {"id": check["id"], "pass": False, "score": 0.0, "rationale": "Field not found in output"}
        else:
            result = score_qualitative_field(check, agent_output)
        qualitative_results.append(result)
        if verbose:
            icon = "PASS" if result["pass"] else "FAIL"
            print(f"  [{icon}] {check['id']:<35} score={result['score']:.2f}  {result['rationale'][:70]}")

    summary = compute_faithfulness(numeric_results, qualitative_results)

    if verbose:
        print()
        print("="*60)
        verdict = "PASS" if summary["pass"] else "FAIL"
        print(f"  Faithfulness: {summary['faithfulness']:.3f}  |  Gate: >={FAITHFULNESS_THRESHOLD}  |  {verdict}")
        print(f"  Fields: {summary['fields_passed']}/{summary['total_fields']} passed")
        print("="*60 + "\n")

    return {
        "summary": summary,
        "numeric": numeric_results,
        "qualitative": qualitative_results,
        "ground_truth_source": str(_GROUND_TRUTH_PATH),
        "auditor_model": summary.get("auditor_model"),
        "timestamp": datetime.now().isoformat(),
    }


def _extract_field(cs: dict, field_name: str):
    """Map ground truth field names to credit_state paths."""
    mapping = {
        "revenue_ltm":                  "documents.financials.income_statement.revenue.year1",
        "reported_ebitda":              "ebitda_analysis.reported_ebitda",
        "conservative_adjusted_ebitda": "ebitda_analysis.conservative_adjusted_ebitda",
        "base_adjusted_ebitda":         "ebitda_analysis.base_adjusted_ebitda",
        "ebitda_margin_conservative_pct": "financial_analysis.profitability.ebitda_margin",
        "interest_expense":             "documents.financials.income_statement.interest_expense.year1",
        "da_expense":                   None,   # not directly in credit_state
        "total_debt_proforma":          "credit_model.pro_forma_total_debt",
        "total_leverage_x":             "credit_model.leverage_metrics.total_leverage",
        "interest_coverage_x":          "credit_model.coverage_metrics.interest_coverage",
        "defense_revenue_pct":          "commercial_analysis.revenue_quality.top_customer_pct",
        "revenue_cagr_3yr_pct":         "financial_analysis.revenue_trend.cagr_3yr",
    }
    path = mapping.get(field_name)
    if path is None:
        return None
    return _get_nested(cs, path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CreditMind faithfulness benchmark")
    parser.add_argument("--live",   action="store_true", help="Run full pipeline (costs API calls)")
    parser.add_argument("--result", type=str, default=None, help="Path to a saved result JSON")
    args = parser.parse_args()

    gt = _load_json(_GROUND_TRUTH_PATH)

    if args.live:
        print("Running live pipeline against Ducommun PDFs...")
        credit_state = run_live_pipeline()
    elif args.result:
        print(f"Loading result from {args.result}")
        credit_state = _load_json(Path(args.result))
    else:
        latest = _latest_result()
        if latest is None:
            print("No saved results found. Run with --live to generate one.")
            print("  python benchmark/run.py --live")
            sys.exit(0)
        print(f"Scoring latest result: {latest}")
        credit_state = _load_json(latest)

    report = score(credit_state, gt)

    # Save benchmark report
    _RESULTS_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = _RESULTS_DIR / f"benchmark_report_{ts}.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"Report saved: {report_path}")

    # Exit with code 1 if gate fails — CI/submission gate
    if not report["summary"]["pass"]:
        print(f"GATE FAILED: faithfulness {report['summary']['faithfulness']:.3f} < {FAITHFULNESS_THRESHOLD}")
        sys.exit(1)
