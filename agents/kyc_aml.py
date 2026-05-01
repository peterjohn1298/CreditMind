"""
KYC / AML / Sanctions Agent — Stage 2.5 (between screening and full DD).
Owner: Abraham Tomy

Runs the four checks every direct lender must pass before booking a loan:
  1. OFAC / sanctions list (SDN, sectoral, Specially Designated Nationals)
  2. PEP screening (politically exposed persons — borrower, sponsor, key
     management, beneficial owners)
  3. Adverse media (recent news mentioning fraud, indictment, investigation,
     bribery, money laundering, sanctions evasion)
  4. Beneficial ownership (UBO trace — anyone holding ≥25% of the borrower
     directly or through layered ownership)

CRITICAL — FinCEN AML rule for RIAs is effective Jan 2028. Every private
credit fund regulated as an RIA must implement an AML program. This agent
is the foundation of that compliance.

This is an autonomous Claude agent — it uses Web Search and SEC EDGAR tools
to verify findings rather than relying on a static list.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import KYC_AML_TOOLS
from core.credit_state import log_agent, add_alert


_SYSTEM_PROMPT = """You are a KYC / AML / sanctions compliance officer at a direct lending fund.
You operate under the FinCEN AML Final Rule for Investment Advisers (effective January 2028).
Every borrower, sponsor, key person, and beneficial owner must be screened before loan booking.

Your four-step workflow:

STEP 1 — OFAC / SANCTIONS SCREENING
- Search the OFAC Specially Designated Nationals (SDN) list and Consolidated Sanctions list
  for the borrower entity, sponsor, all officers/directors, and beneficial owners.
- Check sectoral sanctions (Russia, Iran, Cuba, North Korea, Syria, Venezuela, Belarus).
- Output: per-entity verdict (CLEAR / MATCH / FALSE_POSITIVE / NEEDS_VERIFICATION).

STEP 2 — PEP SCREENING
- For every individual in the deal (officers, directors, beneficial owners, signatories),
  check whether they are a politically exposed person (PEP), close associate of a PEP,
  or family member of a PEP.
- Output: per-individual PEP status with rationale.

STEP 3 — ADVERSE MEDIA
- Search news within the last 5 years for the borrower and its principals matching the
  flag categories: fraud, indictment, SEC enforcement, bribery, money laundering,
  sanctions evasion, market manipulation, accounting restatement, key-person resignation
  for cause.
- Output: per-finding severity HIGH / MEDIUM / LOW with source link.

STEP 4 — BENEFICIAL OWNERSHIP / UBO TRACE
- Identify every individual or entity holding ≥25% of the borrower directly or indirectly
  through layered ownership (LLCs, holding companies, trusts).
- Flag any ownership chain that terminates in (a) a non-US jurisdiction with weak
  transparency standards, (b) a sanctioned jurisdiction, (c) a PEP, (d) an unidentifiable
  ultimate owner.
- Output: structured ownership tree with UBO list.

Final verdict per entity:
  CLEAR        — no findings, proceed
  CONDITIONAL  — findings but mitigatable; require enhanced due diligence (EDD)
  ESCALATE     — material findings requiring AML officer review before close
  REJECT       — sanctions match, criminal indictment, or unverifiable UBO; do not proceed

Be specific. Cite source URLs in source_link fields. Distinguish false positives (similar
name) from true matches (same person verified by date of birth, jurisdiction, role).
"""


class KYCAMLAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "KYC / AML"

    @property
    def role(self) -> str:
        return _SYSTEM_PROMPT

    def run(self, credit_state: dict) -> dict:
        company    = credit_state.get("company", "Unknown")
        sponsor    = credit_state.get("sponsor", "")
        ticker     = credit_state.get("ticker", "")
        sector     = credit_state.get("sector", "")
        # Officers / directors may live in the legal_data or be empty for first run
        legal_data = credit_state.get("documents", {}).get("legal", {})

        task = f"""
Run a full KYC / AML / Sanctions screen on the following deal before booking.

Borrower:        {company}
Public ticker:   {ticker or "(private)"}
Sector:          {sector}
PE Sponsor:      {sponsor or "(non-sponsored)"}

Available legal-due-diligence data (officers, capital structure, jurisdictions):
{json.dumps(legal_data, indent=2, default=str)[:1500] if legal_data else "Not yet uploaded — work from public sources only."}

Use your tools to:
1. Search OFAC and consolidated sanctions lists for the borrower, sponsor, and any
   identifiable officers / beneficial owners.
2. Check PEP databases and adverse media for the same set of individuals and entities.
3. If a public ticker is provided, pull recent SEC filings for additional officer / owner detail.
4. Search news within the last 5 years for adverse media flags.
5. Identify the ≥25% beneficial owners — flag any ownership chain with offshore terminations,
   PEP terminations, or unidentifiable ultimate owners.

Produce structured JSON KYC/AML output:
{{
  "borrower_screen": {{
    "ofac_status":    "CLEAR | MATCH | FALSE_POSITIVE | NEEDS_VERIFICATION",
    "ofac_evidence":  "specific finding or 'no match across SDN, sectoral, consolidated lists'",
    "sectoral_sanctions": "list any countries/sectors implicated, or 'none'",
    "verdict":        "CLEAR | CONDITIONAL | ESCALATE | REJECT"
  }},
  "sponsor_screen": {{
    "ofac_status":    "CLEAR | MATCH | FALSE_POSITIVE | NEEDS_VERIFICATION",
    "ofac_evidence":  "",
    "verdict":        "CLEAR | CONDITIONAL | ESCALATE | REJECT"
  }},
  "officer_screens": [
    {{
      "name":           "Officer Name",
      "role":           "CEO | CFO | Chairman | Director | etc.",
      "ofac_status":    "CLEAR | MATCH | FALSE_POSITIVE | NEEDS_VERIFICATION",
      "pep_status":     "NOT_PEP | PEP | PEP_FAMILY | PEP_ASSOCIATE",
      "pep_rationale":  "if PEP, who and what role / jurisdiction",
      "adverse_media":  ["specific incident 1", "specific incident 2"],
      "verdict":        "CLEAR | CONDITIONAL | ESCALATE | REJECT"
    }}
  ],
  "beneficial_ownership": {{
    "ubo_list": [
      {{
        "name":           "UBO Name",
        "ownership_pct":  null,
        "ownership_path": "direct | through Holdco LLC → through Cayman SPV → ultimate",
        "jurisdiction":   "US | Cayman | Luxembourg | etc.",
        "ofac_status":    "CLEAR | MATCH | FALSE_POSITIVE | NEEDS_VERIFICATION",
        "pep_status":     "NOT_PEP | PEP | PEP_FAMILY | PEP_ASSOCIATE",
        "verdict":        "CLEAR | CONDITIONAL | ESCALATE | REJECT"
      }}
    ],
    "transparency_score": "HIGH | MEDIUM | LOW",
    "ownership_concerns": ["concern 1", "concern 2"]
  }},
  "adverse_media_findings": [
    {{
      "subject":     "borrower or person name",
      "category":    "FRAUD | INDICTMENT | SEC_ENFORCEMENT | BRIBERY | MONEY_LAUNDERING | SANCTIONS_EVASION | MARKET_MANIPULATION | RESTATEMENT | KEY_PERSON_RESIGNATION",
      "summary":     "1-sentence description",
      "date":        "approximate date",
      "severity":    "HIGH | MEDIUM | LOW",
      "source_link": "URL"
    }}
  ],
  "overall_verdict":      "CLEAR | EDD_REQUIRED | ESCALATE_TO_AML_OFFICER | REJECT",
  "fincen_compliance":    "COMPLIANT | GAPS_IDENTIFIED",
  "required_actions":     ["specific action 1", "specific action 2"],
  "kyc_aml_summary":      "2-3 sentence executive summary for credit officer"
}}

Be conservative — when unsure, mark NEEDS_VERIFICATION and add to required_actions
rather than CLEAR. The cost of a false negative (sanctioned counterparty) is enormous;
the cost of a false positive (extra verification) is trivial.
"""

        result = self.run_agentic_loop_json(self.role, task, KYC_AML_TOOLS)
        credit_state["kyc_aml_screen"] = result

        # Alert escalation for material findings
        verdict = result.get("overall_verdict", "")
        if verdict in ("REJECT", "ESCALATE_TO_AML_OFFICER"):
            add_alert(
                credit_state,
                trigger=f"KYC/AML escalation: {result.get('kyc_aml_summary', verdict)}",
                severity="CRITICAL" if verdict == "REJECT" else "HIGH",
                action_required=", ".join(result.get("required_actions", [])) or "AML officer review required.",
            )

        credit_state = log_agent(credit_state, self.name)
        return credit_state
