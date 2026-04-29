"""
Agent 4: Legal Analyst (Wave 1 — runs in parallel)
Reviews the capital structure, existing debt obligations, security package,
litigation, and legal risks. Flags anything that affects lender rights.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import LEGAL_ANALYST_TOOLS
from core.credit_state import log_agent, add_alert


class LegalAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Legal Analyst"

    @property
    def role(self) -> str:
        return (
            "You are a legal due diligence analyst at a private credit fund. "
            "You review capital structure, existing debt covenants, security packages, "
            "litigation, and regulatory exposure. "
            "Your job is to identify anything that restricts the new lender's rights, "
            "creates enforcement risk, or could impair recovery in a default scenario. "
            "Be specific — vague legal risk flags are not useful. "
            "Note: you provide legal intelligence, not legal opinions. "
            "Flag items requiring external counsel review."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        loan_amount = credit_state["loan_amount"]
        loan_type = credit_state["loan_type"]
        deal_id = credit_state["deal_id"]

        legal_data = credit_state.get("documents", {}).get("legal")
        financial_data = credit_state.get("documents", {}).get("financials")
        rag_available = credit_state.get("rag_index_summary", "")

        if not legal_data:
            credit_state["legal_analysis"] = {
                "error": "No legal due diligence document uploaded.",
                "overall_legal_risk": "UNKNOWN",
            }
            return log_agent(credit_state, self.name)

        retrieval_instruction = ""
        available_docs = []
        if rag_available and "legal" in rag_available:
            available_docs.append("legal")
        if rag_available and "financials" in rag_available:
            available_docs.append("financials")

        if available_docs:
            doc_list = " or ".join(f'"{d}"' for d in available_docs)
            retrieval_instruction = f"""
DOCUMENT RETRIEVAL AVAILABLE (Deal ID: {deal_id}):
Use retrieve_document_section(deal_id="{deal_id}", doc_type={doc_list}, query="...") to search
the full uploaded documents for specific legal evidence. Recommended queries:
  - "covenants restrictions additional indebtedness"
  - "security collateral pledge lien"
  - "litigation pending claims lawsuits"
  - "change of control provisions"
  - "existing debt obligations term loan revolving credit"
  - "regulatory permits licenses compliance"
Cite source_page from retrieval results to support your findings.
"""

        task = f"""
Review legal and structural risks for a {loan_type} of ${loan_amount:,.0f} to {company}.
{retrieval_instruction}
LEGAL DUE DILIGENCE DATA (pre-extracted):
{json.dumps(legal_data, indent=2, default=str)[:2000]}

FINANCIAL DATA (for debt context):
{json.dumps(financial_data, indent=2, default=str)[:800] if financial_data else "Not provided"}

Assess:
1. Capital structure — where does our proposed loan sit in the stack?
2. Existing debt — any covenants that restrict additional borrowing?
3. Security — what collateral is available and unencumbered?
4. Litigation — any material claims that could impair the business?
5. Regulatory — any licenses, permits, or regulatory risks?

Produce JSON legal analysis:
{{
  "capital_structure": {{
    "proposed_loan_seniority": "first_lien | second_lien | unitranche | mezzanine | unsecured",
    "existing_senior_debt": null,
    "existing_total_debt": null,
    "pro_forma_total_debt": null,
    "intercreditor_issues": "description or none"
  }},
  "existing_debt_covenants": [
    {{
      "facility": "facility description",
      "covenant": "covenant description",
      "restriction_on_new_debt": true_or_false,
      "impact": "how this affects our loan"
    }}
  ],
  "security_package": {{
    "available_collateral": ["asset1", "asset2"],
    "encumbered_assets": ["asset1"],
    "unencumbered_assets": ["asset1"],
    "security_quality": "STRONG | ADEQUATE | WEAK | UNSECURED",
    "enforcement_jurisdiction": "state/country"
  }},
  "litigation_assessment": {{
    "material_litigation": true_or_false,
    "total_amount_at_risk": null,
    "litigation_summary": "brief description",
    "impact_on_credit": "HIGH | MEDIUM | LOW | NONE"
  }},
  "regulatory_risk": {{
    "key_licenses": ["license1"],
    "regulatory_concerns": ["concern1"],
    "risk_level": "HIGH | MEDIUM | LOW | NONE"
  }},
  "change_of_control": "how does existing debt handle change of control",
  "items_for_external_counsel": ["item requiring legal opinion 1", "item2"],
  "overall_legal_risk": "HIGH | MEDIUM | LOW",
  "blocking_issues": ["any issues that could prevent the deal closing"],
  "legal_summary": "2-3 sentence summary for credit committee"
}}
"""

        result = self.run_agentic_loop_json(self.role, task, tools=LEGAL_ANALYST_TOOLS)
        credit_state["legal_analysis"] = result

        # Alert on blocking issues
        if result.get("blocking_issues") and not result.get("parse_error"):
            for issue in result["blocking_issues"]:
                add_alert(
                    credit_state,
                    trigger=f"Legal blocking issue: {issue}",
                    severity="HIGH",
                    action_required="External counsel review required before proceeding.",
                )

        credit_state = log_agent(credit_state, self.name)
        return credit_state
