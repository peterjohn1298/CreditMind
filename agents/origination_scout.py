"""
Origination Scout Agent — Stage 1
Owner: Peter

Scans market signals (Finnhub M&A news, SEC EDGAR 8-K filings, sector macro)
to surface private credit deal opportunities matching the fund's investment criteria.
Runs on-demand or scheduled weekly.
"""

from agents.base_agent import BaseAgent
from core.tools import ORIGINATION_TOOLS


_SYSTEM_PROMPT = """You are a private credit origination analyst at a direct lending fund.
Your job is to scan public market signals and identify companies that may be seeking
private credit financing — either for a leveraged buyout, growth capital, refinancing,
or debt restructuring.

Use your tools to:
1. Scan M&A news in the target sectors for acquisition activity and PE deal flow
2. Search SEC EDGAR 8-K filings for companies that recently entered credit agreements,
   disclosed acquisitions, or filed going-concern / covenant waiver notices
3. Check macro conditions to assess which sectors have favorable credit dynamics
4. Look up company details for any promising candidates

For each opportunity, assess:
- Why they may need private credit (growth capital, LBO debt, refi, distress)
- Fit against fund criteria (sector, size, sponsor type)
- Urgency / timing signal (when might they come to market)
- Risk flags that might disqualify them

Output a ranked list of actionable origination opportunities."""


class OriginationScoutAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Origination Scout"

    @property
    def role(self) -> str:
        return "Scans deal flow signals to surface private credit origination opportunities"

    def run(self, credit_state: dict) -> dict:
        criteria = credit_state.get("fund_criteria", {})

        target_sectors   = criteria.get("target_sectors", ["Healthcare", "Technology", "Industrials", "Consumer"])
        ebitda_min       = criteria.get("ebitda_min", 10_000_000)
        ebitda_max       = criteria.get("ebitda_max", 150_000_000)
        loan_size_min    = criteria.get("loan_size_min", 25_000_000)
        loan_size_max    = criteria.get("loan_size_max", 500_000_000)
        exclude_sectors  = criteria.get("exclude_sectors", [])
        preferred_sponsors = criteria.get("preferred_sponsors", [])

        task = f"""Scan for private credit origination opportunities matching our fund's criteria:

FUND INVESTMENT CRITERIA:
- Target sectors: {', '.join(target_sectors)}
- Excluded sectors: {', '.join(exclude_sectors) if exclude_sectors else 'None'}
- EBITDA range: ${ebitda_min/1e6:.0f}M – ${ebitda_max/1e6:.0f}M
- Loan size range: ${loan_size_min/1e6:.0f}M – ${loan_size_max/1e6:.0f}M
- Preferred sponsors: {', '.join(preferred_sponsors) if preferred_sponsors else 'Any institutional PE sponsor'}
- Instrument: Senior secured direct lending, unitranche preferred

INSTRUCTIONS:
1. Scan M&A news in our target sectors for acquisition activity suggesting LBO debt demand
2. Search SEC EDGAR for recent 8-K filings disclosing credit agreements, acquisitions, or distress
3. Check macro backdrop for any sectors under rate/tariff/regulatory pressure (distressed opps)
4. For the top 3–5 opportunities found, look up company info for sizing validation

Return a JSON object:
{{
  "scan_date": "ISO date",
  "macro_backdrop": "2-3 sentence macro summary relevant to deal flow",
  "opportunities": [
    {{
      "company": "company name",
      "sector": "sector",
      "opportunity_type": "LBO debt | growth capital | refinancing | distressed",
      "signal_source": "M&A news | SEC 8-K | sector stress | sponsor activity",
      "signal_summary": "what the signal says",
      "estimated_ebitda": "range if estimable, else null",
      "estimated_loan_size": "range if estimable, else null",
      "fit_score": 1-10,
      "fit_rationale": "why this matches our criteria",
      "timing": "near-term (0-3 months) | medium-term (3-9 months) | watch list",
      "risk_flags": ["list of disqualifying or caution flags"],
      "recommended_action": "outreach | monitor | pass"
    }}
  ],
  "sectors_to_watch": ["sectors with elevated deal flow signals"],
  "pass_reasons": ["signals that were evaluated but passed over, and why"]
}}"""

        result = self.run_agentic_loop_json(
            system_prompt=_SYSTEM_PROMPT,
            initial_message=task,
            tools=ORIGINATION_TOOLS,
            max_iterations=12,
        )

        credit_state["origination_scan"] = result
        credit_state["agent_log"] = credit_state.get("agent_log", [])
        credit_state["agent_log"].append({
            "agent": self.name,
            "opportunities_found": len(result.get("opportunities", [])),
        })
        return credit_state
