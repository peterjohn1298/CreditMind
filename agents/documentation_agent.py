"""
Documentation Agent — Stage 5
Owner: Peter

Generates a structured term sheet and negotiation guide based on IC-approved terms.
Does NOT draft the full legal credit agreement — that requires external counsel.
Output: term sheet sections, key negotiation points, red lines, borrower pushback map.
"""

from agents.base_agent import BaseAgent
from core.tools import DOCUMENTATION_TOOLS


_SYSTEM_PROMPT = """You are a senior structuring lawyer and credit professional at a direct lending fund.
You have received Investment Committee approval for a deal with specific conditions and final terms.
Your job is to translate those IC-approved terms into a structured term sheet and negotiation guide.

You produce:
1. TERM SHEET — the commercial terms that will anchor the credit agreement
2. RED LINES — terms that are non-negotiable from the fund's perspective
3. CONCESSION MAP — terms where the fund can flex, and how far
4. BORROWER PUSHBACK PREDICTION — what the sponsor/borrower will argue and our response
5. CONDITIONS PRECEDENT LIST — standard + deal-specific CPs that must be satisfied at closing

Use the macro tool to check current SOFR rate for accurate all-in pricing.
Be precise about numbers, percentages, and definitions.
This term sheet will be used as the basis for the credit agreement negotiations."""


class DocumentationAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Documentation Agent"

    @property
    def role(self) -> str:
        return "Translates IC-approved terms into structured term sheet and negotiation guide"

    def run(self, credit_state: dict) -> dict:
        company      = credit_state.get("company", "Unknown")
        sector       = credit_state.get("sector", "")
        sponsor      = credit_state.get("sponsor", "")
        loan_amount  = credit_state.get("loan_amount", 0)
        loan_tenor   = credit_state.get("loan_tenor", 5)
        loan_type    = credit_state.get("loan_type", "Term Loan")

        ic_decision   = credit_state.get("ic_decision", "CONDITIONAL_APPROVE")
        final_terms   = credit_state.get("final_terms", {})
        conditions    = credit_state.get("approval_conditions", [])
        covenant_rec  = credit_state.get("covenant_recommendation", {})
        credit_model  = credit_state.get("credit_model", {})
        ebitda_adj    = credit_state.get("ebitda_analysis", {}).get("conservative_adjusted_ebitda", 0)
        leverage      = credit_model.get("leverage_multiple", "N/A")

        pricing       = final_terms.get("pricing", "SOFR + 575 bps")
        max_loan      = final_terms.get("max_loan_amount", loan_amount)
        max_leverage  = final_terms.get("max_leverage", 5.5)
        amortization  = final_terms.get("mandatory_amortization", "1% per annum")
        call_protect  = final_terms.get("call_protection", "102/101/par")

        task = f"""Generate a term sheet and negotiation guide for this IC-approved deal.

APPROVED DEAL:
- Borrower: {company}
- Sector: {sector}
- Sponsor: {sponsor if sponsor else 'Non-sponsored'}
- Instrument: {loan_type}
- Committed Amount: ${max_loan/1e6:.1f}M
- Tenor: {loan_tenor} years
- IC Decision: {ic_decision}

IC-APPROVED COMMERCIAL TERMS:
- Pricing: {pricing}
- Max Leverage: {max_leverage:.1f}x Net Debt/EBITDA
- Amortization: {amortization}
- Call Protection: {call_protect}
- Adjusted EBITDA (Agreed): ${ebitda_adj/1e6:.1f}M (if available)
- Current Leverage: {leverage}x

IC CONDITIONS TO BE REFLECTED IN DOCS:
{chr(10).join(['- ' + c.get('condition', str(c)) for c in conditions[:6]]) if conditions else '- Standard closing conditions apply'}

PROPOSED COVENANTS:
{chr(10).join(['- ' + str(k) + ': ' + str(v) for k, v in list(covenant_rec.items())[:6]]) if covenant_rec else '- Standard covenant package'}

INSTRUCTIONS:
1. Check current SOFR rate via macro tool — calculate all-in rate (SOFR + spread)
2. Generate complete term sheet
3. Identify the 3 hardest negotiation points for this specific deal
4. Map out borrower pushback and our responses
5. Generate the conditions precedent checklist

Return JSON:
{{
  "company": "{company}",
  "term_sheet": {{
    "facility_overview": {{
      "borrower": "{company}",
      "facility_type": "{loan_type}",
      "committed_amount": "${max_loan/1e6:.1f}M",
      "tenor": "{loan_tenor} years",
      "maturity_date": "calculated from today"
    }},
    "pricing": {{
      "benchmark": "SOFR (check current rate)",
      "spread": "X bps",
      "all_in_rate": "SOFR + X bps = Y%",
      "floor": "1.00%",
      "pik_option": "None | Available at +X bps",
      "origination_fee": "X%",
      "unused_commitment_fee": "X bps (if revolver)"
    }},
    "amortization": {{
      "mandatory_amortization": "{amortization}",
      "excess_cash_flow_sweep": "X% of ECF > $Xm",
      "call_protection": "{call_protect}"
    }},
    "covenants": {{
      "financial_covenants": [
        {{"covenant": "name", "threshold": "value", "test_frequency": "quarterly"}}
      ],
      "negative_covenants": ["list of key restrictions"],
      "reporting_covenants": ["list of reporting requirements"]
    }},
    "security": "First lien on all assets, including IP, receivables, equity of subsidiaries",
    "guarantees": "Full parent and subsidiary guarantee",
    "conditions_precedent": [
      {{"cp": "description", "type": "standard | deal-specific", "timing": "at closing | post-close"}}
    ]
  }},
  "red_lines": [
    {{"term": "what it is", "our_position": "what we require", "rationale": "why non-negotiable"}}
  ],
  "concession_map": [
    {{"term": "what it is", "our_opening": "starting position", "max_flex": "how far we can go", "trigger": "what would justify conceding"}}
  ],
  "borrower_pushback_map": [
    {{"borrower_ask": "what they'll request", "our_response": "how we counter", "acceptable_compromise": "if any"}}
  ],
  "negotiation_priority": "3-4 sentence summary of the most critical negotiation points for this specific deal"
}}"""

        result = self.run_agentic_loop_json(
            system_prompt=_SYSTEM_PROMPT,
            initial_message=task,
            tools=DOCUMENTATION_TOOLS,
            max_iterations=8,
        )

        credit_state["term_sheet"]          = result.get("term_sheet", {})
        credit_state["red_lines"]           = result.get("red_lines", [])
        credit_state["concession_map"]      = result.get("concession_map", [])
        credit_state["borrower_pushback"]   = result.get("borrower_pushback_map", [])
        credit_state["documentation_output"] = result
        credit_state["agent_log"] = credit_state.get("agent_log", [])
        credit_state["agent_log"].append({"agent": self.name, "status": "term_sheet_generated"})
        return credit_state
