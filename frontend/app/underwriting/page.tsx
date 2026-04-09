"use client";

import { useState } from "react";
import { Upload, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Printer, Zap } from "lucide-react";
import Select from "@/components/ui/Select";
import AgentProgress from "@/components/ui/AgentProgress";
import RatingBadge from "@/components/ui/RatingBadge";
import RiskGauge from "@/components/ui/RiskGauge";
import type { AgentStatus } from "@/lib/types";
import { underwrite } from "@/lib/api";
import { cn } from "@/lib/utils";

const UPLOAD_ZONES = [
  { label: "Financial Statements", sub: "3-year audited financials" },
  { label: "Quality of Earnings",  sub: "QoE report PDF" },
  { label: "CIM",                  sub: "Confidential Information Memo" },
  { label: "Legal Docs",           sub: "Capital structure, debt agreements" },
];

const AGENT_WAVES: AgentStatus[][] = [
  [
    { name: "Financial Analyst",   status: "pending" },
    { name: "EBITDA Analyst",      status: "pending" },
    { name: "Commercial Analyst",  status: "pending" },
    { name: "Legal Analyst",       status: "pending" },
  ],
  [
    { name: "Credit Modeler",      status: "pending" },
    { name: "Stress Tester",       status: "pending" },
    { name: "Risk Scorer",         status: "pending" },
    { name: "Covenant Structurer", status: "pending" },
    { name: "IC Memo Writer",      status: "pending" },
  ],
];

// Demo company — Peter has real PDFs for Ducommun in scripts/
const DEMO_COMPANY = {
  company: "Ducommun Incorporated",
  ticker: "DCO",
  sponsor: "Demo Portfolio",
  deal_type: "Term Loan B",
  loan_amount: "120",
  tenor: "5",
  facility: "First Lien Term Loan",
};

// Memo section display names
const MEMO_SECTION_LABELS: Record<string, string> = {
  executive_summary:     "Executive Summary",
  business_overview:     "Business Overview",
  financial_analysis:    "Financial Analysis",
  credit_analysis:       "Credit Analysis",
  industry_analysis:     "Industry & Market Position",
  risk_factors:          "Key Risk Factors",
  covenant_package:      "Proposed Covenant Package",
  stress_testing:        "Stress Testing & Scenarios",
  esg_considerations:    "ESG Considerations",
  recommendation:        "Investment Committee Recommendation",
};

type Phase = "form" | "running" | "done";

export default function Underwriting() {
  const [phase, setPhase]       = useState<Phase>("form");
  const [agents, setAgents]     = useState<AgentStatus[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["executive_summary", "recommendation"]));
  const [result, setResult]     = useState<{
    risk_score: number;
    rating: string;
    recommendation: string;
    approval: string;
    memo_sections: Record<string, string>;
    company: string;
  } | null>(null);
  const [form, setForm] = useState({
    company: "", ticker: "", sponsor: "", deal_type: "Term Loan B",
    loan_amount: "", tenor: "5", facility: "Senior Secured",
  });

  const isDemo = form.company === DEMO_COMPANY.company && form.ticker === DEMO_COMPANY.ticker;

  function toggleDemo() {
    if (isDemo) {
      setForm({ company: "", ticker: "", sponsor: "", deal_type: "Term Loan B", loan_amount: "", tenor: "5", facility: "Senior Secured" });
    } else {
      setForm({
        company:     DEMO_COMPANY.company,
        ticker:      DEMO_COMPANY.ticker,
        sponsor:     DEMO_COMPANY.sponsor,
        deal_type:   DEMO_COMPANY.deal_type,
        loan_amount: DEMO_COMPANY.loan_amount,
        tenor:       DEMO_COMPANY.tenor,
        facility:    DEMO_COMPANY.facility,
      });
    }
  }

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handlePrint() {
    window.print();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhase("running");
    setResult(null);

    const allAgents = [...AGENT_WAVES[0], ...AGENT_WAVES[1]];
    setAgents(allAgents.map((a) => ({ ...a, status: "pending" })));

    for (let i = 0; i < allAgents.length; i++) {
      await sleep(400);
      setAgents((prev) => prev.map((a, idx) => idx === i ? { ...a, status: "running" } : a));
      await sleep(800 + Math.random() * 600);
      setAgents((prev) => prev.map((a, idx) => idx === i ? { ...a, status: "complete", duration: `${(1 + Math.random()).toFixed(1)}s` } : a));
    }

    try {
      const res = await underwrite({
        company: form.company, ticker: form.ticker,
        loan_amount: parseFloat(form.loan_amount) * 1_000_000,
        loan_tenor: parseInt(form.tenor),
        loan_type: form.facility, sponsor: form.sponsor,
      });
      setResult({
        risk_score:    res.risk_score ?? 55,
        rating:        res.internal_rating ?? "BB-",
        recommendation: res.recommendation ?? "Subject to covenant compliance and quarterly review.",
        approval:      res.approval_status ?? "CONDITIONAL",
        memo_sections: res.memo_sections ?? {},
        company:       form.company,
      });
    } catch {
      setResult({
        risk_score: 55, rating: "BB-",
        recommendation: "Manual review required. API unavailable — showing demo output.",
        approval: "CONDITIONAL",
        company: form.company,
        memo_sections: {
          executive_summary: `${form.company} is a sponsor-backed ${form.facility} opportunity with a ${form.loan_amount}M exposure across a ${form.tenor}-year tenor. The credit presents balanced risk/return characteristics consistent with a BB- internal rating.`,
          financial_analysis: "Revenue growth of 8.2% YoY. Adjusted EBITDA of $42M with 18.4% margin. Leverage of 4.2x total debt/EBITDA, within covenant threshold of 5.0x. Interest coverage ratio of 2.8x vs 2.5x minimum. Free cash flow conversion of 74%.",
          risk_factors: "Key risks include: (1) Sector concentration in defense manufacturing subject to federal budget cycles; (2) Customer concentration — top 3 customers represent 58% of revenue; (3) Supply chain exposure to aerospace-grade titanium and rare earth components.",
          covenant_package: "Proposed covenants: Total Leverage <= 5.0x (tested quarterly); Interest Coverage Ratio >= 2.5x; Minimum Liquidity $15M; CapEx limitation $25M annually; Change of Control 101% put.",
          recommendation: "CONDITIONAL APPROVAL. Recommend proceeding subject to: (1) Receipt of audited FY2025 financials; (2) Legal review of existing debt documentation; (3) Sponsor equity commitment confirmation of 40% of total capitalisation.",
        },
      });
    }
    setPhase("done");
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* ── Left — Form ──────────────────────────────────────────────────── */}
      <div className="space-y-5">
        <div className="bg-navy-800 border border-navy-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-primary font-semibold">Deal Information</p>
            <button onClick={toggleDemo}
              className={cn(
                "flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                isDemo
                  ? "bg-warning/10 border-warning/30 text-warning hover:bg-warning/20"
                  : "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20"
              )}>
              <Zap size={12} />
              {isDemo ? "Clear Demo" : "Load Demo Deal"}
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            {[
              { label: "Company Name", key: "company", placeholder: "e.g. Acme Corp" },
              { label: "Ticker",       key: "ticker",  placeholder: "e.g. ACME" },
              { label: "PE Sponsor",   key: "sponsor", placeholder: "e.g. Blackstone" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-muted text-xs uppercase tracking-wider block mb-1">{label}</label>
                <input value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} required
                  className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2 text-primary text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors" />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted text-xs uppercase tracking-wider block mb-1">Loan Amount ($M)</label>
                <input value={form.loan_amount} onChange={(e) => setForm((f) => ({ ...f, loan_amount: e.target.value }))}
                  placeholder="e.g. 120" type="number" required
                  className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2 text-primary font-mono text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors" />
              </div>
              <div>
                <label className="text-muted text-xs uppercase tracking-wider block mb-1">Tenor (years)</label>
                <Select
                  value={`${form.tenor} years`}
                  onChange={(v) => setForm((f) => ({ ...f, tenor: v.replace(" years","") }))}
                  options={["3 years","4 years","5 years","6 years","7 years","8 years"]}
                  className="w-full" />
              </div>
            </div>

            <div>
              <label className="text-muted text-xs uppercase tracking-wider block mb-1">Facility Type</label>
              <Select
                value={form.facility}
                onChange={(v) => setForm((f) => ({ ...f, facility: v }))}
                options={["First Lien Term Loan","Unitranche","Term Loan A","Term Loan B","Revolving Credit Facility","Senior Secured","Senior Unsecured"]}
                className="w-full" />
            </div>

            <button type="submit" disabled={phase !== "form"}
              className="w-full bg-accent text-white rounded-md px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
              {phase === "form" ? "Run Underwriting Pipeline" : "Running…"}
            </button>

            {phase === "done" && (
              <button type="button" onClick={() => { setPhase("form"); setResult(null); setAgents([]); }}
                className="w-full border border-navy-600 text-muted rounded-md px-4 py-2 text-sm hover:text-primary hover:border-navy-500 transition-colors">
                New Deal
              </button>
            )}
          </form>
        </div>

        {/* Document Uploads */}
        <div className="bg-navy-800 border border-navy-700 rounded-lg p-6">
          <p className="text-primary font-semibold mb-4">Document Upload</p>
          <div className="grid grid-cols-2 gap-3">
            {UPLOAD_ZONES.map(({ label, sub }) => (
              <div key={label}
                className="border-2 border-dashed border-navy-600 rounded-lg p-4 flex flex-col items-center gap-2 hover:border-accent/50 transition-colors cursor-pointer group">
                <Upload size={18} className="text-muted group-hover:text-accent transition-colors" />
                <p className="text-primary text-xs font-medium text-center">{label}</p>
                <p className="text-muted text-[10px] text-center">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right — Progress / Result ────────────────────────────────────── */}
      <div className="space-y-5">
        {phase === "form" && (
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-8 flex flex-col items-center justify-center text-center gap-3">
            <Zap size={32} className="text-accent opacity-40" />
            <p className="text-muted text-sm">Fill in the deal information and click Run, or use the <span className="text-accent font-semibold">Load Demo Deal</span> button to see a live example.</p>
          </div>
        )}

        {(phase === "running" || phase === "done") && (
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-6">
            <p className="text-primary font-semibold mb-4">Agent Pipeline</p>
            <p className="text-muted text-[10px] uppercase tracking-widest mb-2">Wave 1 — Parallel Analysis</p>
            <AgentProgress agents={agents.slice(0, 4)} />
            <div className="my-3 border-t border-navy-700" />
            <p className="text-muted text-[10px] uppercase tracking-widest mb-2">Wave 2 — Credit Modeling</p>
            <AgentProgress agents={agents.slice(4)} />
          </div>
        )}

        {phase === "done" && result && (
          <>
            {/* Score + Decision */}
            <div className="bg-navy-800 border border-navy-700 rounded-lg p-6 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-primary font-semibold">Underwriting Result</p>
                <button onClick={handlePrint}
                  className="flex items-center gap-1.5 border border-navy-600 text-muted rounded-md px-3 py-1.5 text-xs hover:text-primary hover:border-navy-500 transition-colors">
                  <Printer size={12} />
                  Export PDF
                </button>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <RiskGauge score={result.risk_score} size="lg" />
                  <p className="text-muted text-[10px] mt-1 uppercase tracking-wider">Risk Score</p>
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Internal Rating</p>
                    <RatingBadge rating={result.rating} />
                  </div>
                  <div>
                    <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Recommendation</p>
                    <p className="text-primary text-xs leading-relaxed">{result.recommendation}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "APPROVE",     status: "APPROVE",      icon: CheckCircle, cls: "border-success text-success hover:bg-success/10" },
                  { label: "CONDITIONAL", status: "CONDITIONAL",  icon: AlertCircle, cls: "border-warning text-warning hover:bg-warning/10" },
                  { label: "REJECT",      status: "REJECT",       icon: XCircle,     cls: "border-danger  text-danger  hover:bg-danger/10"  },
                ].map(({ label, status, icon: Icon, cls }) => (
                  <button key={status}
                    className={cn("flex items-center justify-center gap-2 border rounded-md py-2.5 text-sm font-semibold transition-all duration-150", cls,
                      result.approval === status ? "opacity-100 ring-1 ring-current" : "opacity-40"
                    )}>
                    <Icon size={14} />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* IC Memo Accordion */}
            {Object.keys(result.memo_sections).length > 0 && (
              <div className="bg-navy-800 border border-navy-700 rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-navy-700">
                  <p className="text-primary text-sm font-semibold">IC Credit Memo — {result.company}</p>
                  <p className="text-muted text-[10px] font-mono mt-0.5">Investment Committee Memorandum · Confidential</p>
                </div>
                <div className="divide-y divide-navy-700">
                  {Object.entries(result.memo_sections).map(([key, content]) => {
                    const label = MEMO_SECTION_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
                    const isOpen = expandedSections.has(key);
                    return (
                      <div key={key}>
                        <button onClick={() => toggleSection(key)}
                          className="w-full flex items-center justify-between px-5 py-3 hover:bg-navy-700/30 transition-colors text-left">
                          <span className="text-primary text-xs font-semibold uppercase tracking-wider">{label}</span>
                          {isOpen ? <ChevronUp size={14} className="text-muted flex-shrink-0" /> : <ChevronDown size={14} className="text-muted flex-shrink-0" />}
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4">
                            <p className="text-muted text-xs leading-relaxed whitespace-pre-wrap">{content}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
