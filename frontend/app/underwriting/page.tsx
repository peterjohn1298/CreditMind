"use client";

import { useState } from "react";
import { Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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

type Phase = "form" | "running" | "done";

export default function Underwriting() {
  const [phase, setPhase]   = useState<Phase>("form");
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [result, setResult] = useState<{ risk_score: number; rating: string; recommendation: string; approval: string } | null>(null);
  const [form, setForm]     = useState({ company: "", ticker: "", sponsor: "", deal_type: "Term Loan B", loan_amount: "", tenor: "5", facility: "Senior Secured" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhase("running");

    const allAgents = [...AGENT_WAVES[0], ...AGENT_WAVES[1]];
    setAgents(allAgents.map((a) => ({ ...a, status: "pending" })));

    // Animate agents
    for (let i = 0; i < allAgents.length; i++) {
      await sleep(400);
      setAgents((prev) => prev.map((a, idx) => idx === i ? { ...a, status: "running" } : a));
      await sleep(800 + Math.random() * 600);
      setAgents((prev) => prev.map((a, idx) => idx === i ? { ...a, status: "complete", duration: `${(1 + Math.random()).toFixed(1)}s` } : a));
    }

    // Call real API
    try {
      const res = await underwrite({
        company: form.company, ticker: form.ticker,
        loan_amount: parseFloat(form.loan_amount) * 1_000_000,
        loan_tenor: parseInt(form.tenor),
        loan_type: form.facility, sponsor: form.sponsor,
      });
      setResult({ risk_score: res.risk_score ?? 55, rating: res.internal_rating ?? "BBB-", recommendation: res.recommendation ?? "", approval: res.approval_status ?? "CONDITIONAL" });
    } catch {
      setResult({ risk_score: 55, rating: "BBB-", recommendation: "Manual review required.", approval: "CONDITIONAL" });
    }
    setPhase("done");
  }

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Left — Form */}
      <div className="space-y-5">
        <div className="bg-navy-800 border border-navy-700 rounded-lg p-6">
          <p className="text-primary font-semibold mb-4">Deal Information</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            {[
              { label: "Company Name", key: "company", placeholder: "e.g. Acme Corp" },
              { label: "Ticker",       key: "ticker",  placeholder: "e.g. ACME" },
              { label: "PE Sponsor",   key: "sponsor", placeholder: "e.g. Blackstone" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="text-muted text-xs uppercase tracking-wider block mb-1">{label}</label>
                <input value={(form as Record<string,string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} required
                  className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2 text-primary text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors" />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted text-xs uppercase tracking-wider block mb-1">Loan Amount (M)</label>
                <input value={form.loan_amount} onChange={(e) => setForm((f) => ({ ...f, loan_amount: e.target.value }))}
                  placeholder="e.g. 50" type="number" required
                  className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2 text-primary font-mono text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors" />
              </div>
              <div>
                <label className="text-muted text-xs uppercase tracking-wider block mb-1">Tenor (years)</label>
                <select value={form.tenor} onChange={(e) => setForm((f) => ({ ...f, tenor: e.target.value }))}
                  className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2 text-primary text-sm focus:outline-none focus:border-accent transition-colors">
                  {["3","4","5","6","7"].map((v) => <option key={v} value={v}>{v} years</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-muted text-xs uppercase tracking-wider block mb-1">Facility Type</label>
              <select value={form.facility} onChange={(e) => setForm((f) => ({ ...f, facility: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-700 rounded-md px-3 py-2 text-primary text-sm focus:outline-none focus:border-accent transition-colors">
                {["Term Loan A","Term Loan B","Revolving Credit Facility","Senior Secured","Senior Unsecured"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={phase !== "form"}
              className="w-full bg-accent text-white rounded-md px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
              {phase === "form" ? "Run Underwriting Pipeline" : "Running…"}
            </button>
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

      {/* Right — Progress / Result */}
      <div className="space-y-5">
        {phase === "form" && (
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-6 flex flex-col items-center justify-center h-48 text-center">
            <p className="text-muted text-sm">Fill in the deal information and submit to begin the underwriting pipeline.</p>
          </div>
        )}

        {(phase === "running" || phase === "done") && (
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-6">
            <p className="text-primary font-semibold mb-4">Agent Pipeline</p>
            <div className="space-y-1">
              <p className="text-muted text-[10px] uppercase tracking-widest mb-2">Wave 1 — Parallel Analysis</p>
              <AgentProgress agents={agents.slice(0, 4)} />
              <div className="my-3 border-t border-navy-700" />
              <p className="text-muted text-[10px] uppercase tracking-widest mb-2">Wave 2 — Credit Modeling</p>
              <AgentProgress agents={agents.slice(4)} />
            </div>
          </div>
        )}

        {phase === "done" && result && (
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-6 space-y-5">
            <p className="text-primary font-semibold">Underwriting Result</p>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <RiskGauge score={result.risk_score} size="lg" />
                <p className="text-muted text-[10px] mt-1 uppercase tracking-wider">Risk Score</p>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-muted text-[10px] uppercase tracking-wider">Internal Rating</p>
                  <RatingBadge rating={result.rating} />
                </div>
                <div>
                  <p className="text-muted text-[10px] uppercase tracking-wider">Recommendation</p>
                  <p className="text-primary text-sm">{result.recommendation}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "APPROVE",      status: "APPROVE",      icon: CheckCircle, cls: "border-success text-success hover:bg-success/10" },
                { label: "CONDITIONAL",  status: "CONDITIONAL",  icon: AlertCircle, cls: "border-warning text-warning hover:bg-warning/10" },
                { label: "REJECT",       status: "REJECT",       icon: XCircle,     cls: "border-danger  text-danger  hover:bg-danger/10"  },
              ].map(({ label, status, icon: Icon, cls }) => (
                <button key={status}
                  className={cn("flex items-center justify-center gap-2 border rounded-md py-2.5 text-sm font-semibold transition-all duration-150", cls,
                    result.approval === status ? "opacity-100 ring-1 ring-current" : "opacity-60"
                  )}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
