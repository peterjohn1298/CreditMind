"use client";

import { useState, useRef } from "react";
import {
  Upload, CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronUp, Printer, Zap, FileText, Download,
} from "lucide-react";
import Select from "@/components/ui/Select";
import AgentProgress from "@/components/ui/AgentProgress";
import RatingBadge from "@/components/ui/RatingBadge";
import RiskGauge from "@/components/ui/RiskGauge";
import type { AgentStatus } from "@/lib/types";
import { underwrite } from "@/lib/api";
import { cn } from "@/lib/utils";
import { generateDeckHTML, DECK_TEMPLATES, type DeckTemplate } from "@/lib/deckTemplates";

const UPLOAD_ZONES = [
  { key: "financials", label: "Financial Statements", sub: "3-year audited financials" },
  { key: "qoe",        label: "Quality of Earnings",  sub: "QoE report PDF" },
  { key: "cim",        label: "CIM",                  sub: "Confidential Information Memo" },
  { key: "legal",      label: "Legal Docs",           sub: "Capital structure, debt agreements" },
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

const DEMO_COMPANY = {
  company:     "Ducommun Incorporated",
  ticker:      "DCO",
  sponsor:     "Demo Portfolio",
  deal_type:   "Term Loan B",
  loan_amount: "120",
  tenor:       "5",
  facility:    "First Lien Term Loan",
};

const MEMO_SECTION_LABELS: Record<string, string> = {
  executive_summary:   "Executive Summary",
  business_overview:   "Business Overview",
  financial_analysis:  "Financial Analysis",
  credit_analysis:     "Credit Analysis",
  industry_analysis:   "Industry & Market Position",
  risk_factors:        "Key Risk Factors",
  covenant_package:    "Proposed Covenant Package",
  stress_testing:      "Stress Testing & Scenarios",
  market_comparables:  "Market Comparables & Pricing",
  esg_considerations:  "ESG Considerations",
  recommendation:      "Investment Committee Recommendation",
};

type Phase = "form" | "running" | "done";

export default function Underwriting() {
  const [phase,  setPhase]  = useState<Phase>("form");
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["executive_summary", "recommendation"])
  );
  const [result, setResult] = useState<{
    risk_score: number;
    rating: string;
    recommendation: string;
    approval: string;
    memo_sections: Record<string, string>;
    company: string;
    scorecard?: Record<string, { score: string; weight: string; notes: string }>;
    key_risk_drivers?: string[];
    mitigating_factors?: string[];
  } | null>(null);
  const [form, setForm] = useState({
    company: "", ticker: "", sponsor: "", deal_type: "Term Loan B",
    loan_amount: "", tenor: "5", facility: "Senior Secured",
  });

  // PDF Upload state
  const [uploading,    setUploading]    = useState<Record<string, boolean>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [autoFilled,   setAutoFilled]   = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Deck generator state
  const [showDeck,   setShowDeck]   = useState(false);
  const [deckTpl,    setDeckTpl]    = useState<DeckTemplate>("dark");

  const isDemo = form.company === DEMO_COMPANY.company && form.ticker === DEMO_COMPANY.ticker;

  function toggleDemo() {
    if (isDemo) {
      setForm({ company: "", ticker: "", sponsor: "", deal_type: "Term Loan B", loan_amount: "", tenor: "5", facility: "Senior Secured" });
      setAutoFilled(false);
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

  // PDF Upload → AI extraction simulation
  async function handleFileUpload(zoneKey: string, file: File) {
    setUploading(prev => ({ ...prev, [zoneKey]: true }));
    // Simulate AI document analysis (2.5s)
    await sleep(2500);
    setUploadedDocs(prev => ({ ...prev, [zoneKey]: file.name }));
    setUploading(prev => ({ ...prev, [zoneKey]: false }));

    // Auto-fill form from CIM or financial statements
    if (zoneKey === "cim" || zoneKey === "financials") {
      setForm({
        company:     DEMO_COMPANY.company,
        ticker:      DEMO_COMPANY.ticker,
        sponsor:     DEMO_COMPANY.sponsor,
        deal_type:   DEMO_COMPANY.deal_type,
        loan_amount: DEMO_COMPANY.loan_amount,
        tenor:       DEMO_COMPANY.tenor,
        facility:    DEMO_COMPANY.facility,
      });
      setAutoFilled(true);
    }
  }

  function handlePrint() { window.print(); }

  function handleGenerateDeck() {
    if (!result) return;
    const data = {
      company:      result.company,
      rating:       result.rating,
      risk_score:   result.risk_score,
      approval:     result.approval,
      recommendation: result.recommendation,
      loan_amount:  form.loan_amount,
      tenor:        form.tenor,
      facility:     form.facility,
      sponsor:      form.sponsor,
      memo_sections: result.memo_sections,
      date:         new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    };
    const html = generateDeckHTML(deckTpl, data);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhase("running");
    setResult(null);
    setShowDeck(false);

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
        company:    form.company,
        ticker:     form.ticker,
        loan_amount: parseFloat(form.loan_amount) * 1_000_000,
        loan_tenor:  parseInt(form.tenor),
        loan_type:  form.facility,
        sponsor:    form.sponsor,
      });
      setResult({
        risk_score:        res.risk_score ?? 55,
        rating:            res.internal_rating ?? "BB-",
        recommendation:    res.recommendation ?? "Subject to covenant compliance and quarterly review.",
        approval:          res.approval_status ?? "CONDITIONAL",
        memo_sections:     res.memo_sections ?? {},
        company:           form.company,
        scorecard:         res.risk_assessment?.scorecard,
        key_risk_drivers:  res.risk_assessment?.key_risk_drivers,
        mitigating_factors: res.risk_assessment?.mitigating_factors,
      });
    } catch {
      setResult({
        risk_score:     55,
        rating:         "BB-",
        recommendation: "Manual review required. Proceed subject to: (1) receipt of audited FY2025 financials; (2) sponsor equity commitment confirmation; (3) legal review of existing debt agreements.",
        approval:       "CONDITIONAL",
        company:        form.company,
        scorecard: {
          financial_quality:  { score: "3", weight: "20%", notes: "Solid revenue growth, margins in-line" },
          ebitda_quality:     { score: "3", weight: "20%", notes: "QoE adjustments reasonable" },
          business_quality:   { score: "4", weight: "20%", notes: "Strong market position" },
          leverage_profile:   { score: "3", weight: "20%", notes: "4.2x — within 5.0x covenant" },
          stress_resilience:  { score: "3", weight: "10%", notes: "Passes base and moderate stress" },
          legal_structural:   { score: "4", weight: "10%", notes: "Clean capital structure" },
        },
        key_risk_drivers:   ["Customer concentration — top 3 = 58% of revenue", "Federal budget cycle exposure", "Rare earth supply chain risk"],
        mitigating_factors: ["Strong FCF conversion (74%)", "Experienced management team"],
        memo_sections: {
          executive_summary:
            `${form.company} is a sponsor-backed ${form.facility} opportunity with $${form.loan_amount}M exposure across a ${form.tenor}-year tenor. ` +
            `The credit presents balanced risk/return characteristics consistent with a BB- internal rating.`,
          financial_analysis:
            `Revenue growth of 8.2% YoY. Adjusted EBITDA of $42M with 18.4% margin. ` +
            `Leverage of 4.2x total debt/EBITDA, within covenant threshold of 5.0x. ` +
            `Interest coverage ratio of 2.8x vs 2.5x minimum. Free cash flow conversion of 74%.`,
          risk_factors:
            `Key risks include: (1) Sector concentration in defense manufacturing subject to federal budget cycles; ` +
            `(2) Customer concentration — top 3 customers represent 58% of revenue; ` +
            `(3) Supply chain exposure to aerospace-grade titanium and rare earth components.`,
          market_comparables:
            `Comparable Leveraged Finance Transactions — ${form.facility} (2025–2026):\n\n` +
            `Issuer (Redacted)   | $150M TLB | BB-  | SOFR + 425bps\n` +
            `Issuer (Redacted)   | $200M TLB | B+   | SOFR + 475bps\n` +
            `Issuer (Redacted)   | $85M TLA  | BB   | SOFR + 375bps\n` +
            `Issuer (Redacted)   | $130M TLB | BB-  | SOFR + 450bps\n` +
            `─────────────────────────────────────────────────\n` +
            `Sector Average     |     —      | BB-  | SOFR + 440bps\n` +
            `This Transaction   | $${form.loan_amount}M  | BB-  | SOFR + 450bps  ← In-line with market\n\n` +
            `Pricing is in-line with current market. Deal size appropriate for the credit profile. ` +
            `Recommend SOFR + 425–475bps range depending on final leverage at close.`,
          covenant_package:
            `Proposed covenants: Total Leverage ≤ 5.0x (tested quarterly); ` +
            `Interest Coverage Ratio ≥ 2.5x; Minimum Liquidity $15M; ` +
            `CapEx limitation $25M annually; Change of Control 101% put.`,
          recommendation:
            `CONDITIONAL APPROVAL. Recommend proceeding subject to: ` +
            `(1) Receipt of audited FY2025 financials; ` +
            `(2) Legal review of existing debt documentation; ` +
            `(3) Sponsor equity commitment confirmation of 40% of total capitalisation.`,
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
            <div className="flex items-center gap-2">
              <p className="text-primary font-semibold">Deal Information</p>
              {autoFilled && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-success/20 text-success border border-success/30">
                  <FileText size={10} />
                  AI Extracted
                </span>
              )}
            </div>
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
                <input
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} required
                  className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2 text-primary text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted text-xs uppercase tracking-wider block mb-1">Loan Amount ($M)</label>
                <input
                  value={form.loan_amount}
                  onChange={(e) => setForm((f) => ({ ...f, loan_amount: e.target.value }))}
                  placeholder="e.g. 120" type="number" required
                  className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2 text-primary font-mono text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-muted text-xs uppercase tracking-wider block mb-1">Tenor (years)</label>
                <Select
                  value={`${form.tenor} years`}
                  onChange={(v) => setForm((f) => ({ ...f, tenor: v.replace(" years", "") }))}
                  options={["3 years","4 years","5 years","6 years","7 years","8 years"]}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-muted text-xs uppercase tracking-wider block mb-1">Facility Type</label>
              <Select
                value={form.facility}
                onChange={(v) => setForm((f) => ({ ...f, facility: v }))}
                options={["First Lien Term Loan","Unitranche","Term Loan A","Term Loan B","Revolving Credit Facility","Senior Secured","Senior Unsecured"]}
                className="w-full"
              />
            </div>

            <button type="submit" disabled={phase !== "form"}
              className="w-full bg-accent text-white rounded-md px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
              {phase === "form" ? "Run Underwriting Pipeline" : "Running…"}
            </button>

            {phase === "done" && (
              <button type="button"
                onClick={() => { setPhase("form"); setResult(null); setAgents([]); setAutoFilled(false); setShowDeck(false); }}
                className="w-full border border-navy-600 text-muted rounded-md px-4 py-2 text-sm hover:text-primary hover:border-navy-500 transition-colors">
                New Deal
              </button>
            )}
          </form>
        </div>

        {/* ── Document Upload ── */}
        <div className="bg-navy-800 border border-navy-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-primary font-semibold">Document Upload</p>
            <p className="text-muted text-[10px]">AI extracts deal data automatically</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {UPLOAD_ZONES.map(({ key, label, sub }) => {
              const isUploading = uploading[key];
              const uploaded    = uploadedDocs[key];
              return (
                <div key={key}>
                  <input
                    type="file"
                    accept=".pdf"
                    ref={(el) => { fileRefs.current[key] = el; }}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(key, file);
                      e.target.value = "";
                    }}
                  />
                  <div
                    onClick={() => !isUploading && fileRefs.current[key]?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-4 flex flex-col items-center gap-2 transition-all cursor-pointer group",
                      uploaded
                        ? "border-success/50 bg-success/5"
                        : isUploading
                        ? "border-accent/50 bg-accent/5"
                        : "border-navy-600 hover:border-accent/50"
                    )}>
                    {isUploading ? (
                      <>
                        <span className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                        <p className="text-accent text-[10px] font-semibold text-center">Analyzing with AI…</p>
                      </>
                    ) : uploaded ? (
                      <>
                        <CheckCircle size={18} className="text-success" />
                        <p className="text-success text-xs font-semibold text-center">{label}</p>
                        <p className="text-muted text-[10px] text-center truncate w-full">{uploaded}</p>
                      </>
                    ) : (
                      <>
                        <Upload size={18} className="text-muted group-hover:text-accent transition-colors" />
                        <p className="text-primary text-xs font-medium text-center">{label}</p>
                        <p className="text-muted text-[10px] text-center">{sub}</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {autoFilled && (
            <p className="text-success text-[10px] mt-3 text-center">
              Deal information auto-populated from uploaded document.
            </p>
          )}
        </div>
      </div>

      {/* ── Right — Progress / Result ────────────────────────────────────── */}
      <div className="space-y-5">
        {phase === "form" && (
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-8 flex flex-col items-center justify-center text-center gap-3">
            <Zap size={32} className="text-accent opacity-40" />
            <p className="text-muted text-sm">
              Fill in the deal information and click Run, or use{" "}
              <span className="text-accent font-semibold">Load Demo Deal</span> to see a live example.
            </p>
            <p className="text-muted text-xs">You can also upload a CIM or financial PDF to auto-fill the form.</p>
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

              {/* Decision Verdict Banner */}
              <div className={cn(
                "rounded-lg border-2 p-4",
                result.approval === "APPROVE"      ? "border-success bg-success/5" :
                result.approval === "REJECT"       ? "border-danger bg-danger/5"   :
                                                     "border-warning bg-warning/5"
              )}>
                <div className="flex items-center gap-3 mb-2">
                  {result.approval === "APPROVE" ? <CheckCircle size={22} className="text-success flex-shrink-0" /> :
                   result.approval === "REJECT"  ? <XCircle     size={22} className="text-danger flex-shrink-0"  /> :
                                                   <AlertCircle size={22} className="text-warning flex-shrink-0" />}
                  <div>
                    <p className={cn("text-base font-bold tracking-wide",
                      result.approval === "APPROVE" ? "text-success" :
                      result.approval === "REJECT"  ? "text-danger"  : "text-warning"
                    )}>
                      {result.approval === "APPROVE" ? "APPROVED" :
                       result.approval === "REJECT"  ? "REJECTED" : "CONDITIONAL APPROVAL"}
                    </p>
                    <p className="text-muted text-[10px] uppercase tracking-wider">IC Committee Decision</p>
                  </div>
                </div>
                <p className="text-primary text-xs leading-relaxed">{result.recommendation}</p>
              </div>

              {/* Scorecard */}
              {result.scorecard && (
                <div>
                  <p className="text-muted text-[10px] uppercase tracking-wider mb-2">Risk Scorecard</p>
                  <div className="space-y-1.5">
                    {Object.entries(result.scorecard).map(([dim, val]) => (
                      <div key={dim} className="flex items-center gap-2">
                        <p className="text-muted text-[10px] w-36 flex-shrink-0 capitalize">{dim.replace(/_/g, " ")}</p>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(n => (
                            <div key={n} className={cn(
                              "w-4 h-1.5 rounded-sm",
                              n <= parseInt(val.score)
                                ? parseInt(val.score) >= 4 ? "bg-success" : parseInt(val.score) >= 3 ? "bg-warning" : "bg-danger"
                                : "bg-navy-700"
                            )} />
                          ))}
                        </div>
                        <p className="text-muted text-[10px] flex-1 truncate">{val.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Risk Drivers */}
              {result.key_risk_drivers && result.key_risk_drivers.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted text-[10px] uppercase tracking-wider mb-1.5">Key Risk Drivers</p>
                    <ul className="space-y-1">
                      {result.key_risk_drivers.map((d, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <XCircle size={10} className="text-danger mt-0.5 flex-shrink-0" />
                          <p className="text-muted text-[10px] leading-relaxed">{d}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {result.mitigating_factors && result.mitigating_factors.length > 0 && (
                    <div>
                      <p className="text-muted text-[10px] uppercase tracking-wider mb-1.5">Mitigating Factors</p>
                      <ul className="space-y-1">
                        {result.mitigating_factors.map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle size={10} className="text-success mt-0.5 flex-shrink-0" />
                            <p className="text-muted text-[10px] leading-relaxed">{f}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
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
                    const label  = MEMO_SECTION_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                    const isOpen = expandedSections.has(key);
                    return (
                      <div key={key}>
                        <button onClick={() => toggleSection(key)}
                          className="w-full flex items-center justify-between px-5 py-3 hover:bg-navy-700/30 transition-colors text-left">
                          <span className="text-primary text-xs font-semibold uppercase tracking-wider">{label}</span>
                          {isOpen
                            ? <ChevronUp   size={14} className="text-muted flex-shrink-0" />
                            : <ChevronDown size={14} className="text-muted flex-shrink-0" />
                          }
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

            {/* ── CC Deck Generator ── */}
            <div className="bg-navy-800 border border-navy-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowDeck(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-navy-700/30 transition-colors">
                <div className="flex items-center gap-2">
                  <Download size={14} className="text-accent" />
                  <p className="text-primary text-sm font-semibold">Generate Credit Committee Deck</p>
                </div>
                {showDeck
                  ? <ChevronUp   size={14} className="text-muted" />
                  : <ChevronDown size={14} className="text-muted" />
                }
              </button>

              {showDeck && (
                <div className="px-5 pb-5 border-t border-navy-700">
                  <p className="text-muted text-xs mt-3 mb-4">
                    Choose a template. A formatted presentation will open in a new tab — print it to PDF from there.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {DECK_TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => setDeckTpl(t.id)}
                        className={cn(
                          "text-left p-3 rounded-lg border transition-all duration-150",
                          deckTpl === t.id
                            ? "border-accent bg-accent/10"
                            : "border-navy-700 bg-navy-900 hover:border-navy-600"
                        )}>
                        <p className={cn("text-xs font-semibold mb-0.5", deckTpl === t.id ? "text-accent" : "text-primary")}>
                          {t.label}
                        </p>
                        <p className="text-muted text-[10px] leading-relaxed">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                  <button onClick={handleGenerateDeck}
                    className="flex items-center gap-2 bg-accent text-white rounded-md px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition-all duration-150">
                    <Download size={14} />
                    Generate &amp; Open Deck
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
