"""
IC Committee Agent — Stage 4
Owner: Peter

Simulates an Investment Committee review of a fully underwritten deal.
Takes the complete credit_state (post-DD) and runs a structured deliberation:
  - Challenges key assumptions the IC would probe
  - Stress-tests the base case
  - Assigns approval status with explicit conditions
  - Identifies open questions before approval can be granted
"""

from agents.base_agent import BaseAgent
from core.tools import IC_COMMITTEE_TOOLS
from core.credit_policy import get_policy_context_for_agents


_POLICY_CONTEXT = get_policy_context_for_agents()

_SYSTEM_PROMPT = f"""{_POLICY_CONTEXT}

You are a panel of senior investment committee members at a direct lending fund.
You are reviewing a deal that has completed full due diligence. Your job is to:

1. CHALLENGE the key credit assumptions — revenue projections, EBITDA margins, leverage tolerance
2. STRESS TEST the base case — what happens if revenue falls 15%? If rates rise 100bps?
3. PROBE the weak points — what would make this deal go wrong?
4. SET CONDITIONS — what must be true / contractually locked before you approve?
5. DECIDE — Approve, Conditionally Approve, or Reject with clear rationale

Speak as an experienced IC panel. Be direct, critical, and specific.
Think about: downside scenarios, sponsor alignment, exit risk, covenant headroom,
macro sensitivity, and concentration risk.

Your output will be used to finalize credit agreement terms and conditions."""


class ICCommitteeAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "IC Committee"

    @property
    def role(self) -> str:
        return "Investment Committee deliberation — challenge assumptions, set conditions, render approval decision"

    def run(self, credit_state: dict) -> dict:
        company         = credit_state.get("company", "Unknown")
        ticker          = credit_state.get("ticker", "")
        loan_amount     = credit_state.get("loan_amount", 0)
        loan_tenor      = credit_state.get("loan_tenor", 5)
        loan_type       = credit_state.get("loan_type", "Term Loan")
        sector          = credit_state.get("sector", "")
        sponsor         = credit_state.get("sponsor", "")
        risk_score      = credit_state.get("risk_score", 50)
        internal_rating = credit_state.get("internal_rating", "B+")
        approval_status = credit_state.get("approval_status", "CONDITIONAL")

        # Pull key outputs from prior DD agents
        fin_health      = credit_state.get("financial_analysis", {}).get("overall_financial_health", "ADEQUATE")
        ebitda          = credit_state.get("ebitda_analysis", {})
        credit_model    = credit_state.get("credit_model", {})
        stress_test     = credit_state.get("stress_test_results", {})
        covenant_terms  = credit_state.get("covenant_recommendation", {})
        ic_memo         = credit_state.get("ic_memo", {})
        early_warnings  = credit_state.get("early_warning_flags", [])
        recommendation  = credit_state.get("recommendation", "")

        leverage        = credit_model.get("leverage_multiple", "N/A")
        dscr            = credit_model.get("dscr", "N/A")
        ebitda_adj      = ebitda.get("conservative_adjusted_ebitda", 0)

        task = f"""Review this deal for Investment Committee approval.

DEAL SUMMARY:
- Company: {company} {'('+ticker+')' if ticker else '(private)'}
- Sector: {sector} | Sponsor: {sponsor if sponsor else 'Non-sponsored'}
- Loan: ${loan_amount/1e6:.1f}M {loan_type}, {loan_tenor}-year tenor
- Risk Score: {risk_score}/100 | Internal Rating: {internal_rating}
- Financial Health: {fin_health}
- Adjusted EBITDA: ${ebitda_adj/1e6:.1f}M (if available)
- Leverage: {leverage}x Net Debt/EBITDA
- DSCR: {dscr}x
- Analyst Recommendation: {recommendation if recommendation else 'See IC memo'}
- Agent Pre-decision: {approval_status}

EARLY WARNING FLAGS:
{chr(10).join(['- ' + str(f.get('description', f)) for f in early_warnings[:5]]) if early_warnings else '- None identified'}

KEY COVENANT PROPOSALS:
{chr(10).join(['- ' + str(k) + ': ' + str(v) for k, v in list(covenant_terms.items())[:5]]) if covenant_terms else '- See covenant structurer output'}

IC MEMO EXECUTIVE SUMMARY:
{ic_memo.get('executive_summary', ic_memo.get('overview', 'See full memo')) if ic_memo else 'Not available'}

STRESS TEST RESULTS:
{str(stress_test)[:800] if stress_test else 'Not available'}

INSTRUCTIONS:
{"Use tools to verify current market conditions and any recent company/sector news that the IC should know." if ticker else "Use tools to check macro conditions and sector dynamics relevant to the IC discussion."}

As an IC panel, challenge the following and render a decision:
1. Is the EBITDA adjusted correctly? What's the bear case EBITDA?
2. At current rates (check macro), what is the cash interest burden? Can the company service it?
3. What is the biggest single risk that could cause a loss of principal?
4. Are the covenants tight enough? What headroom does the borrower have?
5. What conditions must be met before funding?

Return JSON:
{{
  "company": "{company}",
  "ic_decision": "APPROVE | CONDITIONAL_APPROVE | REJECT",
  "approval_conditions": [
    {{"condition": "description", "rationale": "why required", "deadline": "at closing | 60 days post-close | quarterly"}}
  ],
  "ic_challenge_questions": [
    {{"question": "the IC challenge", "agent_answer": "your assessment", "risk_level": "HIGH | MEDIUM | LOW"}}
  ],
  "stress_scenarios": [
    {{"scenario": "description", "ebitda_impact": "-X%", "leverage_impact": "+Xx", "outcome": "covenant breach | manageable | default risk"}}
  ],
  "final_terms_recommended": {{
    "max_loan_amount": 0,
    "max_leverage": 0.0,
    "pricing": "SOFR + X bps",
    "tenor": "{loan_tenor} years",
    "mandatory_amortization": "X% per annum",
    "key_covenants": ["list"],
    "call_protection": "description"
  }},
  "dissenting_views": ["any minority IC views or reservations"],
  "ic_rationale": "3-4 sentence IC deliberation summary and basis for decision"
}}"""

        result = self.run_agentic_loop_json(
            system_prompt=_SYSTEM_PROMPT,
            initial_message=task,
            tools=IC_COMMITTEE_TOOLS,
            max_iterations=10,
        )

        credit_state["ic_decision"]           = result.get("ic_decision", "CONDITIONAL_APPROVE")
        credit_state["ic_committee_output"]   = result
        credit_state["approval_conditions"]   = result.get("approval_conditions", [])
        credit_state["final_terms"]           = result.get("final_terms_recommended", {})
        credit_state["agent_log"] = credit_state.get("agent_log", [])
        credit_state["agent_log"].append({
            "agent":    self.name,
            "decision": result.get("ic_decision"),
        })
        return credit_state
