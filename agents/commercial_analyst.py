"""
Agent 3: Commercial Analyst (Wave 1 — runs in parallel)
Reads the CIM and assesses market position, competitive dynamics,
revenue quality, customer concentration, and management depth.
"""

import json
from agents.base_agent import BaseAgent
from core.tools import COMMERCIAL_ANALYST_TOOLS
from core.credit_state import log_agent


class CommercialAnalystAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "Commercial Analyst"

    @property
    def role(self) -> str:
        return (
            "You are a commercial due diligence analyst at a private credit fund. "
            "You assess the business quality behind the financial numbers. "
            "Your job: is this a good business? Is the revenue sustainable? "
            "Is the market growing or shrinking? Is management capable? "
            "You read the CIM with healthy skepticism — management always presents the best case. "
            "You use current news and macro context to validate or challenge the CIM narrative. "
            "A strong credit needs a strong business behind it."
        )

    def run(self, credit_state: dict) -> dict:
        company = credit_state["company"]
        sponsor = credit_state.get("sponsor", "Not specified")
        deal_id = credit_state["deal_id"]

        cim_data = credit_state.get("documents", {}).get("cim")
        rag_available = credit_state.get("rag_index_summary", "")

        if not cim_data:
            credit_state["commercial_analysis"] = {
                "error": "No CIM document uploaded.",
                "business_quality": "UNKNOWN",
            }
            return log_agent(credit_state, self.name)

        retrieval_instruction = ""
        if rag_available and "cim" in rag_available:
            retrieval_instruction = f"""
DOCUMENT RETRIEVAL AVAILABLE (Deal ID: {deal_id}):
Use retrieve_document_section(deal_id="{deal_id}", doc_type="cim", query="...") to search the
full CIM for specific evidence. Recommended queries:
  - "revenue breakdown by segment product geography"
  - "customer concentration top customers retention"
  - "competitive landscape market share competitors"
  - "management team background experience"
  - "investment highlights growth strategy"
  - "key risks business risks"
Cite page numbers from retrieval results to support your findings.
"""

        task = f"""
Assess the commercial quality of {company} for a private credit investment.
PE Sponsor: {sponsor}
{retrieval_instruction}
CIM DATA (pre-extracted):
{json.dumps(cim_data, indent=2, default=str)[:2000]}

Use your tools to:
1. Use retrieve_document_section to search the full CIM for specific evidence (if available)
2. Fetch recent news about {company} to validate or challenge the CIM narrative
3. Fetch macro snapshot to assess sector-level tailwinds and headwinds

CITATION GUIDE — for every cited field use this structure:
  {{"value": <number or string>, "confidence": "HIGH | MEDIUM | LOW", "source_page": <int or null>, "source_quote": "<verbatim excerpt, max 120 chars, or null>"}}
  confidence: HIGH = explicitly stated | MEDIUM = inferred from stated data | LOW = estimated or not found

Then produce a rigorous commercial assessment JSON:
{{
  "business_quality_score": "A | B | C | D",
  "market_assessment": {{
    "market_size": "description with figures",
    "growth_rate": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
    "market_position": "LEADER | STRONG | AVERAGE | WEAK",
    "market_tailwinds": ["tailwind1", "tailwind2"],
    "market_headwinds": ["headwind1", "headwind2"]
  }},
  "revenue_quality": {{
    "recurring_revenue_pct": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
    "revenue_visibility": "HIGH | MEDIUM | LOW",
    "customer_concentration_risk": "HIGH | MEDIUM | LOW",
    "top_customer_pct": {{"value": null, "confidence": "HIGH|MEDIUM|LOW", "source_page": null, "source_quote": null}},
    "churn_risk": "HIGH | MEDIUM | LOW",
    "assessment": "brief assessment"
  }},
  "competitive_position": {{
    "moat_strength": "STRONG | MODERATE | WEAK | NONE",
    "moat_sources": ["source1", "source2"],
    "competitive_threats": ["threat1", "threat2"],
    "pricing_power": "STRONG | MODERATE | WEAK"
  }},
  "management_assessment": {{
    "depth": "STRONG | ADEQUATE | THIN",
    "track_record": "STRONG | ADEQUATE | LIMITED | UNKNOWN",
    "key_person_risk": "HIGH | MEDIUM | LOW",
    "assessment": "brief assessment"
  }},
  "sponsor_assessment": {{
    "sponsor_quality": "TIER_1 | TIER_2 | TIER_3 | DIRECT",
    "sector_expertise": "HIGH | MEDIUM | LOW",
    "track_record_in_sector": "brief note",
    "support_likelihood": "HIGH | MEDIUM | LOW"
  }},
  "news_findings": "what current news reveals about the business",
  "macro_sensitivity": "how exposed is this business to current macro environment",
  "cim_vs_reality_gaps": ["discrepancy1", "discrepancy2"],
  "key_commercial_risks": ["risk1", "risk2", "risk3"],
  "overall_commercial_verdict": "STRONG | ADEQUATE | WEAK | AVOID"
}}
"""

        result = self.run_agentic_loop_json(
            self.role, task,
            tools=COMMERCIAL_ANALYST_TOOLS,
        )
        credit_state["commercial_analysis"] = result
        credit_state = log_agent(credit_state, self.name)
        return credit_state
