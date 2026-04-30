"""
ESG Screening Agent — runs alongside DD (Wave 1 parallel-eligible).
Owner: Abraham Tomy

Screens against the fund's ESG policy: hard exclusions, soft flags, and
sector-specific deep-dives (carbon for energy/materials/industrials,
patient safety for healthcare, labor for >500-employee firms, etc.).

Required by ESG Policy in data/credit_policy.json (>$75M deals require
mandatory screening; CreditMind Capital is a UN PRI signatory).
"""

import json
from agents.base_agent import BaseAgent
from core.tools import ESG_TOOLS
from core.credit_state import log_agent, add_alert


_SYSTEM_PROMPT = """You are an ESG (Environmental, Social, Governance) analyst at a direct
lending fund that is a UN Principles for Responsible Investment (PRI) signatory.

Your screening produces three independent E / S / G scores plus an overall verdict.

ENVIRONMENTAL (E)
- Carbon intensity: high for energy, materials, industrials, mining, aviation,
  shipping. Score against sector peers.
- Climate transition risk: regulated emissions exposure, stranded-asset risk,
  carbon-pricing vulnerability, physical climate risk to operations.
- Pollution / waste / water-use risk where material to operations.

SOCIAL (S)
- Labor practices for firms > 500 employees: union relations, OSHA history,
  forced-labor risk in supply chain.
- Customer / patient safety for healthcare, food, consumer products.
- Community impact for industrial sites, energy projects.
- Supply-chain ethics for apparel, consumer brands, electronics.

GOVERNANCE (G)
- Board independence and composition (especially for sponsor-backed deals
  where the sponsor controls).
- Audit quality, recent restatements, material weaknesses.
- Related-party transactions, executive compensation alignment.
- Whistleblower / ethics history.

HARD EXCLUSIONS (auto REJECT)
The fund prohibits: tobacco production, controversial weapons, thermal coal
mining, predatory lending, adult entertainment, gambling > 25% revenue,
and any company on the UN PRI no-lend list.

OUTPUT must score E, S, G separately on a 0-100 scale (lower = better) and
flag any hard exclusion. Be specific and cite source where possible.
"""


class ESGScreeningAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "ESG Screening"

    @property
    def role(self) -> str:
        return _SYSTEM_PROMPT

    def run(self, credit_state: dict) -> dict:
        company  = credit_state.get("company", "Unknown")
        ticker   = credit_state.get("ticker", "")
        sector   = credit_state.get("sector", "Unknown")
        loan_amt = credit_state.get("loan_amount", 0)
        prefilled = credit_state.get("prefilled_application", {})
        esg_flag_input = prefilled.get("esg_flags", "") or credit_state.get("esg_flags", "")

        # Skip mandatory screening only if loan < $75M and no flags pre-noted
        is_mandatory = loan_amt > 75_000_000 or bool(esg_flag_input)

        task = f"""
ESG screen for {company} ({ticker or 'private'}) — proposed loan ${loan_amt:,.0f} in sector "{sector}".
Mandatory threshold ($75M) reached: {is_mandatory}.
Pre-noted ESG flag from application: {esg_flag_input or "(none)"}

Use your tools to:
1. Pull company info and recent news for ESG signals.
2. Pull SEC filings for governance / related-party / restatement disclosures.
3. Search news for environmental incidents, labor disputes, ethics violations.

Score E / S / G on a 0-100 scale (lower is better — 0 = best in class, 100 = severe issues):

Produce structured JSON ESG screen:
{{
  "environmental": {{
    "score":             integer_0_to_100,
    "carbon_intensity":  "LOW | MEDIUM | HIGH | VERY_HIGH",
    "transition_risk":   "LOW | MEDIUM | HIGH | EXTREME",
    "physical_risk":     "LOW | MEDIUM | HIGH",
    "key_findings":      ["specific finding 1", "specific finding 2"]
  }},
  "social": {{
    "score":             integer_0_to_100,
    "labor_practices":   "STRONG | ADEQUATE | CONCERNING | POOR",
    "customer_safety":   "STRONG | ADEQUATE | CONCERNING | POOR | NA",
    "supply_chain":      "STRONG | ADEQUATE | CONCERNING | POOR | NA",
    "key_findings":      ["specific finding 1", "specific finding 2"]
  }},
  "governance": {{
    "score":             integer_0_to_100,
    "board_independence": "STRONG | ADEQUATE | WEAK | NA_PRIVATE",
    "audit_quality":     "CLEAN | RESTATEMENTS_PRIOR | MATERIAL_WEAKNESSES",
    "related_party_risk": "NONE | DISCLOSED | UNDISCLOSED_SUSPECTED",
    "key_findings":      ["specific finding 1", "specific finding 2"]
  }},
  "hard_exclusion_check": {{
    "tobacco":           true_or_false,
    "controversial_weapons": true_or_false,
    "thermal_coal":      true_or_false,
    "predatory_lending": true_or_false,
    "adult_entertainment": true_or_false,
    "gambling_over_25pct": true_or_false,
    "any_hard_exclusion": true_or_false,
    "exclusion_rationale": "if any_hard_exclusion is true, explain"
  }},
  "overall_score":      integer_0_to_100,
  "overall_verdict":    "PROCEED | PROCEED_WITH_CONDITIONS | EDD_REQUIRED | REJECT",
  "ic_memo_required_section": "1-2 paragraph ESG section to include in IC memo",
  "lp_disclosure_items": ["item 1", "item 2"],
  "esg_summary":        "2-3 sentence executive summary"
}}

If overall_score > 70 or any hard exclusion, set verdict to REJECT.
If overall_score 50-70 or any soft flag triggered, set EDD_REQUIRED.
Otherwise PROCEED with appropriate conditions.
"""

        result = self.run_agentic_loop_json(self.role, task, ESG_TOOLS)
        credit_state["esg_screen"] = result

        # Alert escalation
        verdict = result.get("overall_verdict", "")
        if verdict == "REJECT":
            add_alert(
                credit_state,
                trigger=f"ESG hard exclusion: {result.get('esg_summary', verdict)}",
                severity="CRITICAL",
                action_required=result.get("hard_exclusion_check", {}).get("exclusion_rationale", "ESG officer review required."),
            )
        elif verdict == "EDD_REQUIRED":
            add_alert(
                credit_state,
                trigger=f"ESG enhanced due diligence required: {result.get('esg_summary', verdict)}",
                severity="HIGH",
                action_required="ESG officer enhanced due diligence required before IC.",
            )

        credit_state = log_agent(credit_state, self.name)
        return credit_state
