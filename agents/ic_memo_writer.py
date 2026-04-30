"""
Agent 14: IC Memo Writer
Synthesizes all agent outputs into a full institutional credit memo.
This is the final output — what goes to the Investment Committee.
"""

import json
from agents.base_agent import BaseAgent
from core.credit_state import log_agent


class ICMemoWriterAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "IC Memo Writer"

    @property
    def role(self) -> str:
        return (
            "You are a senior credit officer writing an Investment Committee memo "
            "for a leading private credit fund. "
            "Your memo must be institutional quality — precise, analytical, and actionable. "
            "Structure: Executive Summary → Company Overview → Market Analysis → "
            "Financial Analysis → EBITDA Analysis → Credit Metrics → Stress Testing → "
            "Legal & Structure → Risk Factors → Covenant Package → Recommendation. "
            "Use specific numbers. Cite the data. Be direct about risks. "
            "The IC will make a multi-million dollar decision based on this document."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        sponsor = credit_state.get("sponsor", "Not specified")
        loan_amount = credit_state["loan_amount"]
        loan_tenor = credit_state["loan_tenor"]
        loan_type = credit_state["loan_type"]

        financial  = credit_state.get("financial_analysis", {})
        ebitda     = credit_state.get("ebitda_analysis", {})
        commercial = credit_state.get("commercial_analysis", {})
        legal      = credit_state.get("legal_analysis", {})
        model      = credit_state.get("credit_model", {})
        stress     = credit_state.get("stress_test", {})
        risk       = credit_state.get("risk_assessment", {})
        covenants  = credit_state.get("covenant_package", {})

        task = f"""
Write a full Investment Committee credit memo for the following deal.

DEAL SUMMARY:
- Borrower: {company}
- Sponsor: {sponsor}
- Facility: ${loan_amount:,.0f} | {loan_tenor} | {loan_type}
- Recommendation: {risk.get("recommendation", "TBD")}
- Internal Rating: {risk.get("internal_rating", "TBD")}

AGENT OUTPUTS TO SYNTHESIZE:

Financial Analysis:
{json.dumps(financial, indent=2, default=str)[:800]}

EBITDA Analysis:
{json.dumps(ebitda, indent=2, default=str)[:800]}

Commercial Analysis:
{json.dumps(commercial, indent=2, default=str)[:800]}

Legal Analysis:
{json.dumps(legal, indent=2, default=str)[:600]}

Credit Model:
{json.dumps(model, indent=2, default=str)[:800]}

Stress Test:
{json.dumps(stress, indent=2, default=str)[:800]}

Risk Assessment:
{json.dumps(risk, indent=2, default=str)[:600]}

Covenant Package:
{json.dumps(covenants, indent=2, default=str)[:600]}

Write the full IC memo in markdown format with clear section headers.
Every section must contain specific numbers and analytical conclusions.
Do not pad with generic statements — every sentence must add information.

Structure:
# INVESTMENT COMMITTEE MEMORANDUM

## EXECUTIVE SUMMARY
## 1. TRANSACTION OVERVIEW
## 2. COMPANY & MARKET OVERVIEW
## 3. FINANCIAL ANALYSIS
## 4. EBITDA & QUALITY OF EARNINGS
## 5. CREDIT METRICS
## 6. STRESS TESTING
## 7. LEGAL & CAPITAL STRUCTURE
## 8. KEY RISKS & MITIGANTS
## 9. PROPOSED COVENANT PACKAGE
## 10. RECOMMENDATION
"""

        raw = self.run_agentic_loop(self.role, task, tools=[])
        credit_state["ic_memo"] = raw
        credit_state = self._log_and_audit(credit_state)
        return credit_state
