"""
Closing Agent — Stage 6
Owner: Peter

Generates a conditions precedent (CP) checklist and funds flow summary
for closing a private credit transaction. Tracks CP completion status
and calculates closing readiness score.

This is a logic/workflow agent — minimal tool use, maximum structure.
"""

from datetime import datetime, timedelta
from agents.base_agent import BaseAgent


_STANDARD_CPS = [
    # Legal
    ("Executed Credit Agreement and all ancillary documents",            "legal",   "at_closing"),
    ("Executed Security Agreement (first lien on all assets)",           "legal",   "at_closing"),
    ("Corporate authorizations / board resolutions",                     "legal",   "at_closing"),
    ("Legal opinions from borrower's counsel",                           "legal",   "at_closing"),
    ("UCC financing statements filed and lien searches clear",           "legal",   "at_closing"),
    ("Intellectual property security agreement (if applicable)",         "legal",   "at_closing"),
    ("Intercreditor Agreement (if multiple lenders)",                    "legal",   "at_closing"),
    # Financial / Diligence
    ("Quality of Earnings report reviewed and accepted",                 "diligence", "pre_closing"),
    ("Audited financial statements for last 3 fiscal years",             "diligence", "pre_closing"),
    ("Most recent interim financial statements (≤ 90 days old)",         "diligence", "pre_closing"),
    ("Compliance certificate confirming no MAC since diligence close",   "diligence", "at_closing"),
    ("Covenant compliance certificate (initial test at closing)",        "diligence", "at_closing"),
    # Structural
    ("Cap table and corporate structure chart",                          "structural", "pre_closing"),
    ("Confirmation no existing debt conflicting with lien priority",     "structural", "pre_closing"),
    ("Insurance certificates naming fund as additional insured",         "structural", "at_closing"),
    ("No Material Adverse Change certification",                         "structural", "at_closing"),
    # Operational
    ("KYC / AML clearance for borrower and guarantors",                 "compliance", "pre_closing"),
    ("OFAC / sanctions screening complete",                              "compliance", "pre_closing"),
    ("Environmental representations and disclosures received",           "compliance", "pre_closing"),
    # Funds Flow
    ("Closing funds flow memo executed by all parties",                  "funds_flow", "at_closing"),
    ("Escrow account established (if applicable)",                       "funds_flow", "at_closing"),
    ("Origination fee wired to fund",                                    "funds_flow", "at_closing"),
    ("Loan proceeds disbursed to borrower / escrow",                     "funds_flow", "at_closing"),
]


class ClosingAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Closing Agent"

    @property
    def role(self) -> str:
        return "Generates CP checklist, funds flow summary, and closing readiness assessment"

    def run(self, credit_state: dict) -> dict:
        company      = credit_state.get("company", "Unknown")
        sector       = credit_state.get("sector", "")
        sponsor      = credit_state.get("sponsor", "")
        loan_amount  = credit_state.get("loan_amount", 0)
        loan_type    = credit_state.get("loan_type", "Term Loan")
        loan_tenor   = credit_state.get("loan_tenor", 5)

        ic_decision   = credit_state.get("ic_decision", "CONDITIONAL_APPROVE")
        conditions    = credit_state.get("approval_conditions", [])
        final_terms   = credit_state.get("final_terms", {})
        term_sheet    = credit_state.get("term_sheet", {})
        credit_model  = credit_state.get("credit_model", {})

        is_lbo         = bool(sponsor)
        has_revolver   = "revolver" in loan_type.lower() or "rcf" in loan_type.lower()
        has_mezz       = "mezz" in loan_type.lower() or "subordinat" in loan_type.lower()
        origination_fee = float(final_terms.get("origination_fee", "2").replace("%", "") or 2) / 100

        today        = datetime.now()
        target_close = today + timedelta(days=14)

        # Build CP checklist
        cp_checklist = []
        for desc, category, timing in _STANDARD_CPS:
            cp_checklist.append({
                "cp":       desc,
                "category": category,
                "timing":   timing,
                "status":   "pending",
                "owner":    _cp_owner(category),
                "notes":    "",
            })

        # Add LBO-specific CPs
        if is_lbo:
            cp_checklist.append({
                "cp":       f"PE sponsor equity contribution confirmed (${loan_amount * 0.4 / 1e6:.0f}M+ implied equity)",
                "category": "structural",
                "timing":   "at_closing",
                "status":   "pending",
                "owner":    "sponsor counsel",
                "notes":    "",
            })
            cp_checklist.append({
                "cp":       "Management equity rollover / incentive plan documents",
                "category": "structural",
                "timing":   "at_closing",
                "status":   "pending",
                "owner":    "borrower counsel",
                "notes":    "",
            })

        # Add revolver-specific CPs
        if has_revolver:
            cp_checklist.append({
                "cp":       "Borrowing base certificate delivered",
                "category": "diligence",
                "timing":   "at_closing",
                "status":   "pending",
                "owner":    "borrower",
                "notes":    "",
            })

        # Add IC conditions as deal-specific CPs
        for cond in conditions:
            desc_text = cond.get("condition", str(cond))
            timing_text = "post_closing_60d" if "post-close" in cond.get("deadline", "").lower() else "at_closing"
            cp_checklist.append({
                "cp":       f"[IC Condition] {desc_text}",
                "category": "ic_condition",
                "timing":   timing_text,
                "status":   "pending",
                "owner":    "fund / borrower",
                "notes":    cond.get("rationale", ""),
            })

        # Funds flow
        fee_amount       = loan_amount * origination_fee
        net_proceeds     = loan_amount - fee_amount

        funds_flow = {
            "total_facility":    f"${loan_amount/1e6:.1f}M",
            "origination_fee":   f"${fee_amount/1e6:.2f}M ({origination_fee*100:.1f}%)",
            "net_proceeds_to_borrower": f"${net_proceeds/1e6:.1f}M",
            "use_of_proceeds":   "Acquisition financing" if is_lbo else "General corporate purposes / growth capital",
            "disbursement_mechanism": "Escrow release at closing" if is_lbo else "Direct wire to borrower",
            "settlement_date":   target_close.strftime("%Y-%m-%d"),
        }

        # Calculate readiness score
        # Blocked until IC approves
        if ic_decision == "REJECT":
            readiness_score = 0
            readiness_status = "BLOCKED"
        elif ic_decision == "CONDITIONAL_APPROVE":
            readiness_score = 35
            readiness_status = "CONDITIONS_PENDING"
        else:
            readiness_score = 55
            readiness_status = "APPROVED_DOCS_PENDING"

        closing_output = {
            "company":              company,
            "closing_readiness_score": readiness_score,
            "closing_readiness_status": readiness_status,
            "target_closing_date":  target_close.strftime("%Y-%m-%d"),
            "estimated_days_to_close": 14,
            "cp_checklist":         cp_checklist,
            "total_cps":            len(cp_checklist),
            "cps_satisfied":        0,
            "cps_pending":          len(cp_checklist),
            "funds_flow":           funds_flow,
            "outstanding_items":    [
                "Execute and negotiate credit agreement",
                "Deliver all CP documents to fund counsel",
                "Complete KYC / AML / OFAC screening",
                "Confirm final sources and uses",
                "Schedule closing call with all parties",
            ],
            "closing_checklist_summary": (
                f"{company} closing package initiated. "
                f"{len(cp_checklist)} conditions precedent identified across legal, diligence, structural, compliance, and funds flow. "
                f"IC decision: {ic_decision}. "
                f"Target close: {target_close.strftime('%B %d, %Y')}."
            ),
        }

        credit_state["closing_output"]     = closing_output
        credit_state["cp_checklist"]       = cp_checklist
        credit_state["funds_flow"]         = funds_flow
        credit_state["closing_readiness"]  = readiness_score
        credit_state["agent_log"] = credit_state.get("agent_log", [])
        credit_state["agent_log"].append({
            "agent":           self.name,
            "cps_generated":   len(cp_checklist),
            "readiness_score": readiness_score,
        })
        return credit_state


def _cp_owner(category: str) -> str:
    return {
        "legal":      "fund counsel / borrower counsel",
        "diligence":  "borrower",
        "structural": "borrower counsel",
        "compliance": "fund compliance",
        "funds_flow": "fund operations",
        "ic_condition": "fund / borrower",
    }.get(category, "TBD")
