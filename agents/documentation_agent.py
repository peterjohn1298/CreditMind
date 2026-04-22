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

        # ── Loan-type-specific term sheet addendum ────────────────────────────
        loan_type_lower = loan_type.lower()
        specialist_output = {}
        loan_type_addendum = ""

        if "revolver" in loan_type_lower or "abl" in loan_type_lower or "rcf" in loan_type_lower:
            bb = credit_state.get("borrowing_base", {})
            loan_type_addendum = f"""
REVOLVER / ABL-SPECIFIC TERMS TO INCLUDE IN TERM SHEET:
- Borrowing base formula: advance rate on eligible AR + advance rate on eligible inventory
- Net borrowing base: {bb.get('net_borrowing_base', 'to be determined from borrowing base certificate')}
- Springing leverage covenant: tested only when drawn > 35% of commitment
- BBC delivery: monthly within 15 days of month-end
- Cash dominion: triggered if availability < 15% of commitment
- Field exam: annual (semi-annual if availability < $5M)
- Unused commitment fee: 50 bps on undrawn balance
"""
            specialist_output = credit_state.get("borrowing_base_analysis", {})

        elif "bridge" in loan_type_lower:
            exit_analysis = credit_state.get("bridge_exit_analysis", {})
            exit_type = credit_state.get("bridge_exit_type", "permanent financing")
            ext_prov  = credit_state.get("extension_provisions", {})
            loan_type_addendum = f"""
BRIDGE LOAN-SPECIFIC TERMS TO INCLUDE IN TERM SHEET:
- Planned exit: {exit_type}
- Exit certainty score: {credit_state.get('exit_certainty_score', 'N/A')}/10
- Exit milestone schedule: borrower must provide evidence of exit process by month 3, term sheet by month 6
- Extension option: {ext_prov.get('extension_length', '3 months')} at {ext_prov.get('extension_fee', '1%')} fee + {ext_prov.get('extension_spread_step', '+25 bps/month')} spread step-up
- Break fee: 1% if repaid within 6 months
- Exit fee: 1% on any repayment
- Springing default: if exit process not initiated by month 4, event of default
"""
            specialist_output = exit_analysis

        elif "mezz" in loan_type_lower or "subordinat" in loan_type_lower or "mezzanine" in loan_type_lower:
            mezz = credit_state.get("mezzanine_analysis", {})
            warrant = credit_state.get("warrant_recommendation", {})
            loan_type_addendum = f"""
MEZZANINE-SPECIFIC TERMS TO INCLUDE IN TERM SHEET:
- PIK election: borrower may elect PIK on up to 100% of interest, subject to no default
- PIK spread increment: +150 bps over cash coupon if elected
- Equity warrant: {warrant.get('warrant_pct_equity', 'X%')} of fully-diluted equity
- Warrant strike: {warrant.get('strike_price', 'at-money')}
- Make-whole: applicable years 1–2
- Intercreditor agreement: standstill period {mezz.get('intercreditor_key_terms', ['24 months'])[0] if mezz.get('intercreditor_key_terms') else '24 months'}
- Change of control put: at 101% of outstanding balance
- Subordination: waterfall recovery language per intercreditor agreement
"""
            specialist_output = mezz

        elif "project" in loan_type_lower or "infrastructure" in loan_type_lower:
            pf = credit_state.get("project_finance_analysis", {})
            reserves = credit_state.get("reserve_requirements", {})
            dscr = credit_state.get("project_dscr", "1.30x")
            loan_type_addendum = f"""
PROJECT FINANCE-SPECIFIC TERMS TO INCLUDE IN TERM SHEET:
- Non-recourse: debt is limited-recourse to SPV only — no parent guarantee
- DSCR maintenance covenant: minimum {dscr if dscr else '1.30x'} on rolling 12-month basis
- Distribution lock-up: no distributions unless DSCR ≥ 1.20x and reserve accounts fully funded
- Debt service reserve account (DSRA): {reserves.get('debt_service_reserve', '6 months debt service')}
- O&M reserve: {reserves.get('om_reserve', 'to be sized')}
- Major maintenance reserve: {reserves.get('major_maintenance_reserve', 'to be sized')}
- Amortization: sculpted to project cash flows — not straight-line
- Construction milestone events of default: failure to achieve commercial operation by longstop date
- Insurance: all-risk, business interruption, third-party liability, naming fund as additional insured
- Change in offtake: fund consent required for any amendment to offtake agreement
"""
            specialist_output = pf

        elif "growth" in loan_type_lower or ("non-sponsored" in loan_type_lower) or (not sponsor and "term" in loan_type_lower):
            gc = credit_state.get("growth_capital_analysis", {})
            saas_kpis = credit_state.get("saas_kpis", {})
            warrant = credit_state.get("warrant_recommendation", {})
            loan_type_addendum = f"""
GROWTH CAPITAL-SPECIFIC TERMS TO INCLUDE IN TERM SHEET:
- Equity warrant / kicker: {warrant.get('warrant_pct_equity', 'X%')} fully-diluted equity at {warrant.get('strike_price_multiple', 'at-money')}
- PIK option: available at +{warrant.get('pik_spread_increment', '150 bps')} over cash rate, subject to no default
- Key-man provision: material adverse change / default trigger if CEO/founder departs without fund consent
- Minimum ARR covenant: ${{}}.get('arr_estimate', 'to be set at 75% of current ARR')
- Minimum cash covenant: 3 months of operating burn at all times
- NRR covenant: net revenue retention must not fall below 85% on trailing 12-month basis
- Revenue reporting: monthly ARR / MRR report within 15 days of month-end
- No-sponsor premium: additional +50–100 bps over equivalent sponsored deal
""".format(saas_kpis)
            specialist_output = gc

        elif "distressed" in loan_type_lower or "dip" in loan_type_lower or "special situation" in loan_type_lower:
            dist = credit_state.get("distressed_analysis", {})
            loan_type_addendum = f"""
DISTRESSED / SPECIAL SITUATIONS-SPECIFIC TERMS TO INCLUDE IN TERM SHEET:
- Cash dominion: all receipts to fund-controlled account from day 1
- DIP super-priority: new money primes all pre-petition debt (if DIP)
- Operational milestone covenants: 30-day cure periods before default
- Management change: fund approval required for any senior management change
- Asset sale restriction: fund consent required for any asset sale > $1M
- Equity conversion right: fund may convert at par to X% equity
- PIK component: up to 50% of interest may be PIK, compounding quarterly
- Weekly cash reporting: actual vs. projected 13-week cash flow forecast
- Priming protection: super-priority lien language protecting fund's position
"""
            specialist_output = dist
        # ── End loan-type-specific addendum ───────────────────────────────────

        # Pull specialist analysis summary if available
        specialist_summary = ""
        if specialist_output:
            assessment_key = next(
                (k for k in specialist_output if "assessment" in k.lower()), None
            )
            if assessment_key:
                specialist_summary = f"\nSPECIALIST ANALYSIS SUMMARY:\n{specialist_output[assessment_key]}\n"

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

{loan_type_addendum}{specialist_summary}
INSTRUCTIONS:
1. Check current SOFR rate via macro tool — calculate all-in rate (SOFR + spread)
2. Generate complete term sheet — incorporate ALL loan-type-specific terms listed above verbatim
3. Identify the 3 hardest negotiation points for THIS specific loan type
4. Map out borrower pushback and our responses — be specific to {loan_type} structure
5. Generate the conditions precedent checklist — include loan-type-specific CPs

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
