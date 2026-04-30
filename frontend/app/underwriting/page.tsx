"use client";

import { useState, useRef } from "react";
import {
  Upload, CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronUp, Printer, Zap, FileText,
  Download, ChevronRight, ChevronLeft, Building2,
  DollarSign, BarChart2, Layers, ShieldAlert, ClipboardCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Select from "@/components/ui/Select";
import AgentProgress from "@/components/ui/AgentProgress";
import RatingBadge from "@/components/ui/RatingBadge";
import RiskGauge from "@/components/ui/RiskGauge";
import TypewriterText from "@/components/ui/TypewriterText";
import AddBackForensicsPanel from "@/components/ui/AddBackForensicsPanel";
import type { AgentStatus } from "@/lib/types";
import { underwrite } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { generateDeckHTML, DECK_TEMPLATES, type DeckTemplate } from "@/lib/deckTemplates";

// ─── Step Config ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Borrower",     icon: Building2 },
  { id: 2, label: "Transaction",  icon: DollarSign },
  { id: 3, label: "Financials",   icon: BarChart2 },
  { id: 4, label: "Cap Structure",icon: Layers },
  { id: 5, label: "Risk Profile", icon: ShieldAlert },
  { id: 6, label: "Review",       icon: ClipboardCheck },
] as const;

// ─── Dropdown Options ─────────────────────────────────────────────────────────

const SECTORS = [
  "Aerospace & Defense","Healthcare","Technology","Consumer & Retail",
  "Energy","Industrials","Financial Services","Real Estate",
  "Materials","Utilities","Logistics","Specialty Chemicals",
  "Media & Entertainment","Business Services","Food & Beverage",
];

const PURPOSES = [
  "Acquisition Financing (LBO)","Add-on Acquisition","Refinancing",
  "Leveraged Recapitalization","Dividend Recapitalization",
  "Growth Capital / Expansion","Working Capital",
];

const CALL_PROTECTIONS = [
  "None","Non-Call 1 Year","Non-Call 2 Years",
  "101 soft call (6 months)","102/101/par","Make-Whole + 50bps",
];

const FACILITIES = [
  "First Lien Term Loan A","First Lien Term Loan B",
  "Unitranche","Second Lien Term Loan","Mezzanine",
  "Revolving Credit Facility","Senior Secured","Senior Unsecured",
  "Bridge Loan","Subordinated Notes",
];

const JURISDICTIONS = [
  "Delaware, USA","New York, USA","California, USA","Texas, USA",
  "Cayman Islands","Luxembourg","England & Wales","Ireland",
  "Singapore","Netherlands",
];

const ESG_OPTIONS = [
  "None identified","Environmental concerns","Social / labour issues",
  "Governance concerns","Multiple flags","Under investigation",
];

// ─── Agent Waves ─────────────────────────────────────────────────────────────

const AGENT_WAVES: AgentStatus[][] = [
  [
    { name: "Financial Analyst",  status: "pending" },
    { name: "EBITDA Analyst",     status: "pending" },
    { name: "Commercial Analyst", status: "pending" },
    { name: "Legal Analyst",      status: "pending" },
  ],
  [
    { name: "Credit Modeler",      status: "pending" },
    { name: "Stress Tester",       status: "pending" },
    { name: "Risk Scorer",         status: "pending" },
    { name: "Covenant Structurer", status: "pending" },
    { name: "IC Memo Writer",      status: "pending" },
  ],
];

// ─── Demo Deal ────────────────────────────────────────────────────────────────

const DEMO: FormState = {
  // Step 1
  company: "Ducommun Incorporated", ticker: "DCO", sponsor: "Demo Portfolio",
  sector: "Aerospace & Defense", jurisdiction: "Delaware, USA",
  description: "Ducommun is a leading provider of high-performance engineered products and structural assemblies for the aerospace and defense industry, serving major OEMs including Boeing, Lockheed Martin, and Raytheon. The company operates across structural assemblies, electronic systems, and specialty precision components.",

  // Step 2
  facility: "First Lien Term Loan B", total_facility: "200",
  loan_amount: "120", tenor: "6", purpose: "Acquisition Financing (LBO)",
  pricing_spread: "450", oid: "99.0",
  call_protection: "101 soft call (6 months)", expected_close: "2026-06-30",

  // Step 3
  revenue_ltm: "228", ebitda_ltm: "42", adj_ebitda_ltm: "45",
  revenue_growth: "8.2", capex: "12", fcf: "31",
  total_debt_proforma: "189", equity_contribution: "85", enterprise_value: "274",

  // Step 4
  first_lien: "120", second_lien: "", revolver: "30",
  leverage_covenant: "5.5", icr_covenant: "2.0",
  min_liquidity: "15", capex_limit: "25",

  // Step 5
  customer_concentration: "58", recurring_revenue: "72",
  management_tenure: "8", backlog: "380",
  key_risks: "1. Customer concentration — top 3 customers represent 58% of revenue\n2. Federal defense budget cycle exposure\n3. Supply chain reliance on aerospace-grade titanium and rare earth components",
  esg_flags: "None identified",
  notes: "Management has delivered consistent margin expansion over 3 years. Strong FCF conversion of 74%. Preferred candidate for existing portfolio add-on.",
};

// Rejection demo — structurally distressed retailer, multiple hard fails
const DEMO_REJECT: FormState = {
  company: "Meridian Retail Group", ticker: "", sponsor: "Cerberus Capital",
  sector: "Consumer & Retail", jurisdiction: "Delaware, USA",
  description: "Meridian Retail Group operates 340 mid-market department stores across 28 US states. The company has faced sustained revenue decline driven by e-commerce disruption and loss of anchor tenants. Three consecutive years of negative comparable-store sales growth and a leveraged balance sheet from a 2021 LBO leave limited financial flexibility.",

  facility: "Second Lien Term Loan", total_facility: "280",
  loan_amount: "180", tenor: "5", purpose: "Leveraged Recapitalization",
  pricing_spread: "750", oid: "96.0",
  call_protection: "102/101/par", expected_close: "2026-08-15",

  revenue_ltm: "740", ebitda_ltm: "58", adj_ebitda_ltm: "61",
  revenue_growth: "-18", capex: "42", fcf: "-8",
  total_debt_proforma: "562", equity_contribution: "60", enterprise_value: "622",

  first_lien: "370", second_lien: "180", revolver: "50",
  leverage_covenant: "6.5", icr_covenant: "1.5",
  min_liquidity: "20", capex_limit: "45",

  customer_concentration: "82", recurring_revenue: "12",
  management_tenure: "2", backlog: "",
  key_risks: "1. E-commerce disruption — online captures 34% of addressable market, accelerating\n2. Secular decline in department store foot traffic (-22% over 3 years)\n3. Leverage 9.2x — covenant breach at close\n4. Negative free cash flow — $8M outflow LTM\n5. Lease liability obligations of $1.2B across 340 stores",
  esg_flags: "Social / labour issues",
  notes: "Management team assembled 18 months ago following prior CEO departure. Turnaround plan unproven. Sponsor has invested $60M equity (9.7% of EV) — limited alignment.",
};

const BLANK: FormState = {
  company: "", ticker: "", sponsor: "", sector: "", jurisdiction: "Delaware, USA", description: "",
  facility: "First Lien Term Loan B", total_facility: "", loan_amount: "", tenor: "6",
  purpose: "", pricing_spread: "", oid: "", call_protection: "101 soft call (6 months)", expected_close: "",
  revenue_ltm: "", ebitda_ltm: "", adj_ebitda_ltm: "", revenue_growth: "", capex: "",
  fcf: "", total_debt_proforma: "", equity_contribution: "", enterprise_value: "",
  first_lien: "", second_lien: "", revolver: "",
  leverage_covenant: "", icr_covenant: "", min_liquidity: "", capex_limit: "",
  customer_concentration: "", recurring_revenue: "", management_tenure: "",
  backlog: "", key_risks: "", esg_flags: "None identified", notes: "",
};

// ─── Memo Labels ──────────────────────────────────────────────────────────────

const MEMO_SECTION_LABELS: Record<string, string> = {
  executive_summary:  "Executive Summary",
  business_overview:  "Business Overview",
  financial_analysis: "Financial Analysis",
  credit_analysis:    "Credit Analysis",
  industry_analysis:  "Industry & Market Position",
  risk_factors:       "Key Risk Factors",
  covenant_package:   "Proposed Covenant Package",
  stress_testing:     "Stress Testing & Scenarios",
  market_comparables: "Market Comparables & Pricing",
  esg_considerations: "ESG Considerations",
  recommendation:     "Investment Committee Recommendation",
};

const UPLOAD_ZONES = [
  { key: "financials", label: "Financial Statements", sub: "3-year audited financials" },
  { key: "qoe",        label: "Quality of Earnings",  sub: "QoE report PDF" },
  { key: "cim",        label: "CIM",                  sub: "Confidential Information Memo" },
  { key: "legal",      label: "Legal Docs",           sub: "Capital structure, debt agreements" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  company: string; ticker: string; sponsor: string;
  sector: string; jurisdiction: string; description: string;
  facility: string; total_facility: string; loan_amount: string;
  tenor: string; purpose: string; pricing_spread: string;
  oid: string; call_protection: string; expected_close: string;
  revenue_ltm: string; ebitda_ltm: string; adj_ebitda_ltm: string;
  revenue_growth: string; capex: string; fcf: string;
  total_debt_proforma: string; equity_contribution: string; enterprise_value: string;
  first_lien: string; second_lien: string; revolver: string;
  leverage_covenant: string; icr_covenant: string;
  min_liquidity: string; capex_limit: string;
  customer_concentration: string; recurring_revenue: string;
  management_tenure: string; backlog: string;
  key_risks: string; esg_flags: string; notes: string;
}

type Phase = "form" | "running" | "done";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function num(v: string) { const n = parseFloat(v); return isNaN(n) ? null : n; }

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="flex items-center justify-between text-muted text-[10px] uppercase tracking-wider mb-1.5">
        <span>{label}</span>
        {hint && <span className="text-muted/50 normal-case tracking-normal text-[9px]">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", mono = false, required = false }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; mono?: boolean; required?: boolean;
}) {
  return (
    <input
      value={value} required={required} type={type}
      onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={cn(
        "w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-primary text-sm placeholder:text-muted/40 focus:outline-none focus:border-accent/50 transition-colors",
        mono && "font-mono"
      )}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value} rows={rows}
      onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-primary text-sm placeholder:text-muted/40 focus:outline-none focus:border-accent/50 transition-colors resize-none leading-relaxed"
    />
  );
}

function MetricPill({ label, value, color = "#C9A84C" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-black/40 border border-white/[0.06] rounded-lg px-3 py-2 text-center">
      <p className="text-muted text-[9px] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="font-mono font-bold text-sm" style={{ color }}>{value}</p>
    </div>
  );
}

// ─── Agent Decision Summary ───────────────────────────────────────────────────

type AgentVote = "PASS" | "FLAG" | "FAIL" | "READY";

const VOTE_CONFIG: Record<AgentVote, { color: string; bg: string; border: string }> = {
  PASS:  { color: "#00D4A4", bg: "bg-success/5",  border: "border-success/20" },
  FLAG:  { color: "#FFB300", bg: "bg-warning/5",  border: "border-warning/20" },
  FAIL:  { color: "#FF3B5C", bg: "bg-danger/5",   border: "border-danger/20"  },
  READY: { color: "#7B8FF7", bg: "bg-[#7B8FF7]/5", border: "border-[#7B8FF7]/20" },
};

function scoreToVote(score: string): AgentVote {
  const n = parseInt(score);
  if (n >= 4) return "PASS";
  if (n === 3) return "FLAG";
  return "FAIL";
}

function AgentDecisionSummary({ scorecard, approval, rating, recommendation }: {
  scorecard?: Record<string, { score: string; weight: string; notes: string }>;
  approval: string;
  rating: string;
  recommendation: string;
}) {
  if (!scorecard) return null;

  const sc = scorecard;

  const agentRows: { agent: string; wave: 1 | 2; finding: string; vote: AgentVote }[] = [
    {
      agent: "Financial Analyst", wave: 1,
      finding: sc.financial_quality?.notes ?? "Financial statements reviewed",
      vote: scoreToVote(sc.financial_quality?.score ?? "3"),
    },
    {
      agent: "EBITDA Analyst", wave: 1,
      finding: sc.ebitda_quality?.notes ?? "EBITDA quality assessed",
      vote: scoreToVote(sc.ebitda_quality?.score ?? "3"),
    },
    {
      agent: "Commercial Analyst", wave: 1,
      finding: sc.business_quality?.notes ?? "Market position reviewed",
      vote: scoreToVote(sc.business_quality?.score ?? "3"),
    },
    {
      agent: "Legal Analyst", wave: 1,
      finding: sc.legal_structural?.notes ?? "Capital structure reviewed",
      vote: scoreToVote(sc.legal_structural?.score ?? "4"),
    },
    {
      agent: "Credit Modeler", wave: 2,
      finding: sc.leverage_profile?.notes ?? "Leverage model completed",
      vote: scoreToVote(sc.leverage_profile?.score ?? "3"),
    },
    {
      agent: "Stress Tester", wave: 2,
      finding: sc.stress_resilience?.notes ?? "Stress scenarios run",
      vote: scoreToVote(sc.stress_resilience?.score ?? "3"),
    },
    {
      agent: "Risk Scorer", wave: 2,
      finding: `Internal rating: ${rating}`,
      vote: approval === "REJECT" ? "FAIL" : approval === "APPROVE" ? "PASS" : "FLAG",
    },
    {
      agent: "Covenant Structurer", wave: 2,
      finding: "Covenant package structured and stress-tested",
      vote: approval === "REJECT" ? "FAIL" : "PASS",
    },
    {
      agent: "IC Memo Writer", wave: 2,
      finding: "Investment Committee memorandum prepared",
      vote: "READY",
    },
  ];

  const overallVote: AgentVote = approval === "APPROVE" ? "PASS" : approval === "REJECT" ? "FAIL" : "FLAG";
  const overallCfg = VOTE_CONFIG[overallVote];

  return (
    <div className="bg-black/30 border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <p className="text-muted text-[10px] uppercase tracking-wider">Agent Decision Trail</p>
        <span className="text-[10px] font-mono text-muted">{agentRows.filter(r => r.vote === "PASS" || r.vote === "READY").length} pass · {agentRows.filter(r => r.vote === "FLAG").length} flag · {agentRows.filter(r => r.vote === "FAIL").length} fail</span>
      </div>

      {/* Wave 1 */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-muted text-[9px] uppercase tracking-widest mb-2">Wave 1 — Parallel Analysis</p>
        <div className="space-y-1">
          {agentRows.filter(r => r.wave === 1).map((row, i) => {
            const cfg = VOTE_CONFIG[row.vote];
            return (
              <div key={i} className={cn("flex items-center gap-3 rounded px-3 py-2 border", cfg.bg, cfg.border)}>
                <span className="text-[10px] font-bold w-12 shrink-0 text-right font-mono" style={{ color: cfg.color }}>{row.vote}</span>
                <span className="text-primary text-[11px] font-semibold w-36 shrink-0">{row.agent}</span>
                <span className="text-muted text-[10px] leading-snug flex-1 min-w-0 truncate">{row.finding}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-4 my-2 border-t border-white/[0.05]" />

      {/* Wave 2 */}
      <div className="px-4 pt-1 pb-3">
        <p className="text-muted text-[9px] uppercase tracking-widest mb-2">Wave 2 — Credit Modeling</p>
        <div className="space-y-1">
          {agentRows.filter(r => r.wave === 2).map((row, i) => {
            const cfg = VOTE_CONFIG[row.vote];
            return (
              <div key={i} className={cn("flex items-center gap-3 rounded px-3 py-2 border", cfg.bg, cfg.border)}>
                <span className="text-[10px] font-bold w-12 shrink-0 text-right font-mono" style={{ color: cfg.color }}>{row.vote}</span>
                <span className="text-primary text-[11px] font-semibold w-36 shrink-0">{row.agent}</span>
                <span className="text-muted text-[10px] leading-snug flex-1 min-w-0 truncate">{row.finding}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* IC Vote bar */}
      <div className={cn("px-4 py-3 border-t flex items-center justify-between", overallCfg.bg, overallCfg.border.replace("border-", "border-t-"))}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold font-mono w-12 text-right" style={{ color: overallCfg.color }}>{overallVote}</span>
          <span className="text-primary text-[11px] font-semibold">IC Committee Final Vote</span>
        </div>
        <span className="font-mono text-[10px] font-bold" style={{ color: overallCfg.color }}>
          {approval === "APPROVE" ? "APPROVED" : approval === "REJECT" ? "REJECTED" : "CONDITIONAL APPROVAL"}
        </span>
      </div>
    </div>
  );
}

// ─── Decision Logic + Rating Sensitivity ─────────────────────────────────────

const RATING_LADDER = ["AAA","AA+","AA","AA-","A+","A","A-","BBB+","BBB","BBB-","BB+","BB","BB-","B+","B","B-","CCC+","CCC","CCC-","CC","C","D"];

type CheckStatus = "pass" | "flag" | "fail" | "n/a";

interface ThresholdCheck {
  label:     string;
  actual:    string;
  threshold: string;
  status:    CheckStatus;
  rationale: string;
}

function buildDecisionChecks(form: FormState): ThresholdCheck[] {
  const checks: ThresholdCheck[] = [];
  const n = (v: string) => { const x = parseFloat(v); return isNaN(x) ? null : x; };

  // Leverage
  const debt  = n(form.total_debt_proforma);
  const ebitda = n(form.adj_ebitda_ltm) ?? n(form.ebitda_ltm);
  const levCov = n(form.leverage_covenant) ?? 6.0;
  if (debt && ebitda) {
    const lev = debt / ebitda;
    const status: CheckStatus = lev > levCov ? "fail" : lev > levCov * 0.85 ? "flag" : "pass";
    checks.push({
      label: "Net Leverage", actual: `${lev.toFixed(1)}x`,
      threshold: `≤ ${levCov}x`, status,
      rationale: status === "pass" ? `${((levCov - lev) / levCov * 100).toFixed(0)}% headroom to covenant` : status === "fail" ? "Breaches leverage covenant at close" : "Limited headroom — monitor closely",
    });
  }

  // ICR
  const icr = n(form.icr_covenant);
  if (icr) {
    const spread = n(form.pricing_spread);
    const approxICR = ebitda && debt && spread ? (ebitda / (debt * (spread / 10000 + 0.053))).toFixed(1) : null;
    const status: CheckStatus = approxICR ? (parseFloat(approxICR) < icr ? "fail" : parseFloat(approxICR) < icr * 1.2 ? "flag" : "pass") : "n/a";
    checks.push({
      label: "Interest Coverage", actual: approxICR ? `~${approxICR}x` : "—",
      threshold: `≥ ${icr}x`, status,
      rationale: status === "pass" ? "Adequate debt service coverage" : status === "fail" ? "Below minimum coverage threshold" : "Coverage tight — stress-test required",
    });
  }

  // EBITDA Margin
  const rev = n(form.revenue_ltm);
  if (ebitda && rev) {
    const margin = (ebitda / rev) * 100;
    const status: CheckStatus = margin < 10 ? "fail" : margin < 15 ? "flag" : "pass";
    checks.push({
      label: "EBITDA Margin", actual: `${margin.toFixed(1)}%`,
      threshold: "≥ 15% preferred", status,
      rationale: status === "pass" ? "Healthy margin profile" : status === "flag" ? "Below-average margins — verify quality of earnings" : "Thin margins — limited cushion for cost increases",
    });
  }

  // FCF
  const fcf = n(form.fcf);
  const loan = n(form.loan_amount);
  if (fcf && loan) {
    const debtService = loan * 0.08;
    const coverage = fcf / debtService;
    const status: CheckStatus = coverage < 1.0 ? "fail" : coverage < 1.25 ? "flag" : "pass";
    checks.push({
      label: "FCF Debt Service",  actual: `${coverage.toFixed(1)}x`,
      threshold: "≥ 1.25x", status,
      rationale: status === "pass" ? "Strong free cash flow supports debt repayment" : status === "flag" ? "Limited FCF buffer — any EBITDA slip risks coverage" : "Insufficient FCF to service debt at current levels",
    });
  }

  // Customer concentration
  const conc = n(form.customer_concentration);
  if (conc != null) {
    const status: CheckStatus = conc > 60 ? "flag" : conc > 80 ? "fail" : "pass";
    checks.push({
      label: "Customer Concentration", actual: `${conc}%`,
      threshold: "< 50% preferred", status,
      rationale: status === "pass" ? "Diversified revenue base" : conc > 80 ? "Extreme concentration — single-customer loss is existential" : "Elevated concentration — covenant on key customer loss recommended",
    });
  }

  // Equity contribution
  const eq = n(form.equity_contribution);
  const ev = n(form.enterprise_value);
  if (eq && ev) {
    const eqPct = (eq / ev) * 100;
    const status: CheckStatus = eqPct < 25 ? "fail" : eqPct < 35 ? "flag" : "pass";
    checks.push({
      label: "Equity Contribution", actual: `${eqPct.toFixed(0)}%`,
      threshold: "≥ 35% of EV", status,
      rationale: status === "pass" ? "Sponsor skin-in-the-game confirms commitment" : status === "flag" ? "Moderate equity cushion — request sponsor equity bridge letter" : "Thin equity — limited loss absorption in downside scenario",
    });
  }

  // ESG
  if (form.esg_flags && form.esg_flags !== "None identified") {
    checks.push({
      label: "ESG Flags", actual: form.esg_flags,
      threshold: "None", status: "flag",
      rationale: "ESG flag identified — complete ESG addendum before IC submission",
    });
  }

  return checks;
}

const STATUS_CONFIG: Record<CheckStatus, { color: string; bg: string; border: string; symbol: string; label: string }> = {
  "pass":  { color: "#00D4A4", bg: "bg-success/5",  border: "border-success/20", symbol: "✓", label: "PASS"   },
  "flag":  { color: "#FFB300", bg: "bg-warning/5",  border: "border-warning/20", symbol: "⚠", label: "FLAG"   },
  "fail":  { color: "#FF3B5C", bg: "bg-danger/5",   border: "border-danger/20",  symbol: "✗", label: "FAIL"   },
  "n/a":   { color: "#64748b", bg: "bg-white/[0.02]", border: "border-white/[0.06]", symbol: "—", label: "N/A" },
};

function DecisionLogic({ form, result }: { form: FormState; result: { rating: string; approval: string } }) {
  const checks = buildDecisionChecks(form);
  if (checks.length === 0) return null;

  const passes = checks.filter(c => c.status === "pass").length;
  const flags  = checks.filter(c => c.status === "flag").length;
  const fails  = checks.filter(c => c.status === "fail").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-muted text-[10px] uppercase tracking-wider">Decision Logic — Threshold Analysis</p>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-success">{passes} PASS</span>
          {flags > 0 && <span className="text-warning">{flags} FLAG</span>}
          {fails > 0 && <span className="text-danger">{fails} FAIL</span>}
        </div>
      </div>
      <div className="space-y-1.5">
        {checks.map((c, i) => {
          const cfg = STATUS_CONFIG[c.status];
          return (
            <div key={i} className={cn("flex items-start gap-3 rounded-md px-3 py-2 border", cfg.bg, cfg.border)}>
              <span className="text-[11px] font-bold mt-0.5 shrink-0 w-3" style={{ color: cfg.color }}>{cfg.symbol}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-primary text-[11px] font-semibold">{c.label}</span>
                  <span className="font-mono text-[10px] shrink-0" style={{ color: cfg.color }}>
                    {c.actual} <span className="text-muted font-normal">vs {c.threshold}</span>
                  </span>
                </div>
                <p className="text-muted text-[10px] leading-relaxed mt-0.5">{c.rationale}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rating sensitivity */}
      <RatingSensitivity rating={result.rating} form={form} />
    </div>
  );
}

function RatingSensitivity({ rating, form }: { rating: string; form: FormState }) {
  const idx = RATING_LADDER.indexOf(rating);
  if (idx < 0) return null;
  const upgradeRating  = idx > 0  ? RATING_LADDER[idx - 1] : null;
  const downgradeRating = idx < RATING_LADDER.length - 1 ? RATING_LADDER[idx + 1] : null;

  const n = (v: string) => { const x = parseFloat(v); return isNaN(x) ? null : x; };
  const ebitda  = n(form.adj_ebitda_ltm) ?? n(form.ebitda_ltm);
  const debt    = n(form.total_debt_proforma);
  const leverage = debt && ebitda ? (debt / ebitda) : null;

  const upgradePaths: string[] = [];
  const downgradePaths: string[] = [];

  if (leverage != null) {
    if (leverage >= 4.0) upgradePaths.push(`Reduce leverage from ${leverage.toFixed(1)}x to below 4.0x through EBITDA growth or debt paydown`);
    else upgradePaths.push(`Sustain leverage below ${leverage.toFixed(1)}x across two reporting periods`);
    if (leverage >= 5.5) downgradePaths.push(`Leverage ${leverage.toFixed(1)}x — any deterioration beyond ${(leverage + 0.5).toFixed(1)}x triggers formal review`);
    else downgradePaths.push(`Leverage covenant breach above ${(n(form.leverage_covenant) ?? 6.0)}x`);
  } else {
    upgradePaths.push("Demonstrate sustained leverage below 4.0x over two quarters");
    downgradePaths.push("Covenant breach on leverage or interest coverage");
  }

  const conc = n(form.customer_concentration);
  if (conc && conc > 40) upgradePaths.push(`Reduce customer concentration from ${conc}% to below 40% through revenue diversification`);
  upgradePaths.push("Two consecutive quarters of risk score improvement with no early warning flags");
  downgradePaths.push("Risk score deterioration to 70+ / 100 sustained over one cycle");
  downgradePaths.push("Early warning flag escalation to RED or BLACK level");

  return (
    <div className="mt-3 rounded-lg border border-white/[0.07] bg-black/30 p-4">
      <p className="text-muted text-[10px] uppercase tracking-wider mb-3">Rating Sensitivity — {rating}</p>
      <div className="grid grid-cols-2 gap-3">
        {upgradeRating && (
          <div>
            <p className="text-success text-[10px] font-semibold mb-2">↑ Upgrade to {upgradeRating}</p>
            <ul className="space-y-1.5">
              {upgradePaths.slice(0, 3).map((p, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-success text-[10px] shrink-0 mt-0.5">+</span>
                  <p className="text-muted text-[10px] leading-relaxed">{p}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {downgradeRating && (
          <div>
            <p className="text-danger text-[10px] font-semibold mb-2">↓ Downgrade to {downgradeRating}</p>
            <ul className="space-y-1.5">
              {downgradePaths.slice(0, 3).map((p, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-danger text-[10px] shrink-0 mt-0.5">−</span>
                  <p className="text-muted text-[10px] leading-relaxed">{p}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function Step1({ f, set }: { f: FormState; set: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Company Name *">
          <TextInput value={f.company} onChange={v => set("company", v)} placeholder="e.g. Acme Corp" required />
        </FieldRow>
        <FieldRow label="Ticker" hint="Leave blank for private">
          <TextInput value={f.ticker} onChange={v => set("ticker", v.toUpperCase())} placeholder="e.g. ACM" mono />
        </FieldRow>
      </div>
      <FieldRow label="PE Sponsor / Owner *">
        <TextInput value={f.sponsor} onChange={v => set("sponsor", v)} placeholder="e.g. Blackstone, Apollo, Founder-owned" required />
      </FieldRow>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Sector">
          <Select value={f.sector || "Select sector"} onChange={v => set("sector", v)} options={SECTORS} className="w-full" />
        </FieldRow>
        <FieldRow label="Jurisdiction">
          <Select value={f.jurisdiction} onChange={v => set("jurisdiction", v)} options={JURISDICTIONS} className="w-full" />
        </FieldRow>
      </div>
      <FieldRow label="Business Description" hint="2–3 sentences">
        <TextArea value={f.description} onChange={v => set("description", v)} placeholder="Describe the borrower's core business, key products/services, and competitive positioning…" rows={4} />
      </FieldRow>
    </div>
  );
}

function Step2({ f, set }: { f: FormState; set: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-3">
      <FieldRow label="Facility Type *">
        <Select value={f.facility} onChange={v => set("facility", v)} options={FACILITIES} className="w-full" />
      </FieldRow>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Total Facility ($M) *">
          <TextInput value={f.total_facility} onChange={v => set("total_facility", v)} placeholder="200" type="number" mono required />
        </FieldRow>
        <FieldRow label="This Tranche ($M) *">
          <TextInput value={f.loan_amount} onChange={v => set("loan_amount", v)} placeholder="120" type="number" mono required />
        </FieldRow>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Tenor (years) *">
          <Select
            value={`${f.tenor} years`}
            onChange={v => set("tenor", v.replace(" years", ""))}
            options={["3 years","4 years","5 years","6 years","7 years","8 years","10 years"]}
            className="w-full"
          />
        </FieldRow>
        <FieldRow label="Use of Proceeds">
          <Select value={f.purpose || "Select purpose"} onChange={v => set("purpose", v)} options={PURPOSES} className="w-full" />
        </FieldRow>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FieldRow label="SOFR Spread (bps)">
          <TextInput value={f.pricing_spread} onChange={v => set("pricing_spread", v)} placeholder="450" type="number" mono />
        </FieldRow>
        <FieldRow label="OID (%)">
          <TextInput value={f.oid} onChange={v => set("oid", v)} placeholder="99.0" type="number" mono />
        </FieldRow>
        <FieldRow label="Expected Close">
          <TextInput value={f.expected_close} onChange={v => set("expected_close", v)} type="date" />
        </FieldRow>
      </div>
      <FieldRow label="Call Protection">
        <Select value={f.call_protection} onChange={v => set("call_protection", v)} options={CALL_PROTECTIONS} className="w-full" />
      </FieldRow>
    </div>
  );
}

function Step3({ f, set }: { f: FormState; set: (k: keyof FormState, v: string) => void }) {
  const leverage    = num(f.total_debt_proforma) && num(f.adj_ebitda_ltm || f.ebitda_ltm)
    ? (num(f.total_debt_proforma)! / num(f.adj_ebitda_ltm || f.ebitda_ltm)!).toFixed(1) + "x"
    : "—";
  const margin      = num(f.ebitda_ltm) && num(f.revenue_ltm)
    ? ((num(f.ebitda_ltm)! / num(f.revenue_ltm)!) * 100).toFixed(1) + "%"
    : "—";
  const evEbitda    = num(f.enterprise_value) && num(f.adj_ebitda_ltm || f.ebitda_ltm)
    ? (num(f.enterprise_value)! / num(f.adj_ebitda_ltm || f.ebitda_ltm)!).toFixed(1) + "x"
    : "—";
  const equityPct   = num(f.equity_contribution) && num(f.enterprise_value)
    ? ((num(f.equity_contribution)! / num(f.enterprise_value)!) * 100).toFixed(0) + "%"
    : "—";

  const leverageNum = parseFloat(leverage);
  const leverageColor = isNaN(leverageNum) ? "#fff" : leverageNum > 6 ? "#FF3B5C" : leverageNum > 4.5 ? "#FFB300" : "#00D4A4";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <FieldRow label="Revenue LTM ($M) *">
          <TextInput value={f.revenue_ltm} onChange={v => set("revenue_ltm", v)} placeholder="228" type="number" mono required />
        </FieldRow>
        <FieldRow label="EBITDA LTM ($M) *">
          <TextInput value={f.ebitda_ltm} onChange={v => set("ebitda_ltm", v)} placeholder="42" type="number" mono required />
        </FieldRow>
        <FieldRow label="Adj. EBITDA ($M)" hint="post QoE">
          <TextInput value={f.adj_ebitda_ltm} onChange={v => set("adj_ebitda_ltm", v)} placeholder="45" type="number" mono />
        </FieldRow>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FieldRow label="Revenue Growth (%)">
          <TextInput value={f.revenue_growth} onChange={v => set("revenue_growth", v)} placeholder="8.2" type="number" mono />
        </FieldRow>
        <FieldRow label="CapEx ($M)">
          <TextInput value={f.capex} onChange={v => set("capex", v)} placeholder="12" type="number" mono />
        </FieldRow>
        <FieldRow label="Free Cash Flow ($M)">
          <TextInput value={f.fcf} onChange={v => set("fcf", v)} placeholder="31" type="number" mono />
        </FieldRow>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FieldRow label="PF Total Debt ($M)">
          <TextInput value={f.total_debt_proforma} onChange={v => set("total_debt_proforma", v)} placeholder="189" type="number" mono />
        </FieldRow>
        <FieldRow label="Equity Contribution ($M)">
          <TextInput value={f.equity_contribution} onChange={v => set("equity_contribution", v)} placeholder="85" type="number" mono />
        </FieldRow>
        <FieldRow label="Enterprise Value ($M)">
          <TextInput value={f.enterprise_value} onChange={v => set("enterprise_value", v)} placeholder="274" type="number" mono />
        </FieldRow>
      </div>

      {/* Live computed metrics */}
      {(num(f.revenue_ltm) || num(f.total_debt_proforma)) && (
        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-white/[0.05]">
          <MetricPill label="Net Leverage" value={leverage} color={leverageColor} />
          <MetricPill label="EBITDA Margin" value={margin} color="#7B8FF7" />
          <MetricPill label="EV / EBITDA" value={evEbitda} color="#00B4D8" />
          <MetricPill label="Equity %" value={equityPct} color="#00D4A4" />
        </div>
      )}
    </div>
  );
}

function Step4({ f, set }: { f: FormState; set: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-muted text-[10px] uppercase tracking-wider">Pro Forma Debt Tranche Sizing</p>
      <div className="grid grid-cols-3 gap-3">
        <FieldRow label="First Lien ($M)">
          <TextInput value={f.first_lien} onChange={v => set("first_lien", v)} placeholder="120" type="number" mono />
        </FieldRow>
        <FieldRow label="Second Lien ($M)">
          <TextInput value={f.second_lien} onChange={v => set("second_lien", v)} placeholder="—" type="number" mono />
        </FieldRow>
        <FieldRow label="Revolver ($M)">
          <TextInput value={f.revolver} onChange={v => set("revolver", v)} placeholder="30" type="number" mono />
        </FieldRow>
      </div>

      <div className="border-t border-white/[0.05] pt-3">
        <p className="text-muted text-[10px] uppercase tracking-wider mb-3">Proposed Maintenance Covenants</p>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Max Total Leverage (x)">
            <TextInput value={f.leverage_covenant} onChange={v => set("leverage_covenant", v)} placeholder="5.5" type="number" mono />
          </FieldRow>
          <FieldRow label="Min Interest Coverage (x)">
            <TextInput value={f.icr_covenant} onChange={v => set("icr_covenant", v)} placeholder="2.0" type="number" mono />
          </FieldRow>
          <FieldRow label="Min Liquidity ($M)">
            <TextInput value={f.min_liquidity} onChange={v => set("min_liquidity", v)} placeholder="15" type="number" mono />
          </FieldRow>
          <FieldRow label="Annual CapEx Limit ($M)">
            <TextInput value={f.capex_limit} onChange={v => set("capex_limit", v)} placeholder="25" type="number" mono />
          </FieldRow>
        </div>
      </div>

      {/* Covenant headroom preview */}
      {num(f.leverage_covenant) && num(f.total_debt_proforma) && num(f.adj_ebitda_ltm || f.ebitda_ltm) && (() => {
        const actualLev = num(f.total_debt_proforma)! / num(f.adj_ebitda_ltm || f.ebitda_ltm)!;
        const maxLev    = num(f.leverage_covenant)!;
        const headroom  = ((maxLev - actualLev) / maxLev * 100).toFixed(0);
        const breach    = actualLev > maxLev;
        return (
          <div className={cn("rounded-lg px-4 py-3 border text-xs flex items-center justify-between", breach ? "border-danger/30 bg-danger/5" : "border-success/20 bg-success/5")}>
            <span className={breach ? "text-danger" : "text-success"}>
              {breach ? "⚠ Leverage covenant breached at close" : "✓ Leverage covenant satisfied at close"}
            </span>
            <span className="font-mono text-muted text-[11px]">
              {actualLev.toFixed(1)}x actual vs {maxLev}x max · {headroom}% headroom
            </span>
          </div>
        );
      })()}
    </div>
  );
}

function Step5({ f, set }: { f: FormState; set: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Top 3 Customer Conc. (%)" hint="revenue concentration">
          <TextInput value={f.customer_concentration} onChange={v => set("customer_concentration", v)} placeholder="58" type="number" mono />
        </FieldRow>
        <FieldRow label="Recurring Revenue (%)">
          <TextInput value={f.recurring_revenue} onChange={v => set("recurring_revenue", v)} placeholder="72" type="number" mono />
        </FieldRow>
        <FieldRow label="Avg Mgmt Tenure (years)">
          <TextInput value={f.management_tenure} onChange={v => set("management_tenure", v)} placeholder="8" type="number" mono />
        </FieldRow>
        <FieldRow label="Order Backlog ($M)" hint="contracted revenue">
          <TextInput value={f.backlog} onChange={v => set("backlog", v)} placeholder="380" type="number" mono />
        </FieldRow>
      </div>
      <FieldRow label="ESG Flags">
        <Select value={f.esg_flags} onChange={v => set("esg_flags", v)} options={ESG_OPTIONS} className="w-full" />
      </FieldRow>
      <FieldRow label="Key Risk Factors" hint="one per line">
        <TextArea value={f.key_risks} onChange={v => set("key_risks", v)} placeholder={"1. Customer concentration…\n2. Market cyclicality…\n3. Input cost exposure…"} rows={4} />
      </FieldRow>
      <FieldRow label="Additional Notes / Mitigants">
        <TextArea value={f.notes} onChange={v => set("notes", v)} placeholder="Supporting commentary, management quality, competitive moat, mitigating factors…" rows={3} />
      </FieldRow>
    </div>
  );
}

function Step6Review({ f }: { f: FormState }) {
  const leverage = num(f.total_debt_proforma) && num(f.adj_ebitda_ltm || f.ebitda_ltm)
    ? (num(f.total_debt_proforma)! / num(f.adj_ebitda_ltm || f.ebitda_ltm)!).toFixed(1) + "x" : "—";
  const margin = num(f.ebitda_ltm) && num(f.revenue_ltm)
    ? ((num(f.ebitda_ltm)! / num(f.revenue_ltm)!) * 100).toFixed(1) + "%" : "—";

  const sections = [
    {
      title: "Borrower",
      rows: [
        ["Company",      f.company || "—"],
        ["Ticker",       f.ticker  || "Private"],
        ["Sponsor",      f.sponsor || "—"],
        ["Sector",       f.sector  || "—"],
        ["Jurisdiction", f.jurisdiction],
      ],
    },
    {
      title: "Transaction",
      rows: [
        ["Facility",       f.facility],
        ["Total Facility", f.total_facility ? `$${f.total_facility}M` : "—"],
        ["This Tranche",   f.loan_amount    ? `$${f.loan_amount}M`    : "—"],
        ["Tenor",          f.tenor ? `${f.tenor} years` : "—"],
        ["Purpose",        f.purpose || "—"],
        ["Pricing",        f.pricing_spread ? `SOFR + ${f.pricing_spread}bps` : "—"],
        ["OID",            f.oid            ? `${f.oid}%`               : "—"],
        ["Call Protection",f.call_protection],
      ],
    },
    {
      title: "Financials (LTM)",
      rows: [
        ["Revenue",     f.revenue_ltm    ? `$${f.revenue_ltm}M`    : "—"],
        ["EBITDA",      f.ebitda_ltm     ? `$${f.ebitda_ltm}M`     : "—"],
        ["Adj. EBITDA", f.adj_ebitda_ltm ? `$${f.adj_ebitda_ltm}M` : "—"],
        ["EBITDA Margin",margin],
        ["Rev. Growth", f.revenue_growth ? `${f.revenue_growth}%`  : "—"],
        ["FCF",         f.fcf ? `$${f.fcf}M` : "—"],
        ["PF Leverage", leverage],
        ["EV",          f.enterprise_value ? `$${f.enterprise_value}M` : "—"],
      ],
    },
    {
      title: "Covenants",
      rows: [
        ["Max Leverage", f.leverage_covenant ? `${f.leverage_covenant}x` : "—"],
        ["Min ICR",      f.icr_covenant      ? `${f.icr_covenant}x`      : "—"],
        ["Min Liquidity",f.min_liquidity     ? `$${f.min_liquidity}M`    : "—"],
        ["CapEx Limit",  f.capex_limit       ? `$${f.capex_limit}M/yr`   : "—"],
      ],
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {sections.map(sec => (
          <div key={sec.title} className="bg-black/40 border border-white/[0.07] rounded-lg p-3">
            <p className="text-accent text-[10px] font-semibold uppercase tracking-wider mb-2">{sec.title}</p>
            <div className="space-y-1">
              {sec.rows.map(([k, v]) => (
                <div key={k} className="flex justify-between items-baseline gap-2">
                  <span className="text-muted text-[10px]">{k}</span>
                  <span className="text-primary text-[10px] font-mono text-right truncate max-w-[140px]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {f.key_risks && (
        <div className="bg-black/40 border border-warning/20 rounded-lg p-3">
          <p className="text-warning text-[10px] font-semibold uppercase tracking-wider mb-1.5">Key Risk Factors</p>
          <p className="text-muted text-[10px] leading-relaxed whitespace-pre-line">{f.key_risks}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Underwriting() {
  const [phase,  setPhase]  = useState<Phase>("form");
  const [step,   setStep]   = useState(1);
  const [dir,    setDir]    = useState<1 | -1>(1);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [form,   setFormState] = useState<FormState>(BLANK);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["executive_summary", "recommendation"]));
  const [typedSections,    setTypedSections]    = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{
    risk_score: number; rating: string; recommendation: string; approval: string;
    memo_sections: Record<string, string>; company: string;
    scorecard?: Record<string, { score: string; weight: string; notes: string }>;
    key_risk_drivers?: string[]; mitigating_factors?: string[];
    ebitda_analysis?: import("@/lib/types").EBITDAAnalysis;
    deal_id?: string;
  } | null>(null);

  // Upload state
  const [uploading,    setUploading]    = useState<Record<string, boolean>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [autoFilled,   setAutoFilled]   = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Deck state
  const [showDeck, setShowDeck] = useState(false);
  const [deckTpl,  setDeckTpl]  = useState<DeckTemplate>("dark");

  const isDemo       = form.company === DEMO.company;
  const isDemoReject = form.company === DEMO_REJECT.company;

  function set(k: keyof FormState, v: string) {
    setFormState(prev => ({ ...prev, [k]: v }));
  }

  function goTo(n: number) {
    setDir(n > step ? 1 : -1);
    setStep(n);
  }

  function loadDemo(preset: FormState) {
    setFormState(preset);
    setAutoFilled(false);
    setPhase("form");
    setResult(null);
    setStep(1);
    setDir(1);
  }

  function clearDemo() {
    setFormState(BLANK);
    setAutoFilled(false);
  }

  function toggleSection(key: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setTypedSections(prev => new Set(prev).add(key));
  }

  async function handleFileUpload(zoneKey: string, file: File) {
    setUploading(prev => ({ ...prev, [zoneKey]: true }));
    await sleep(2500);
    setUploadedDocs(prev => ({ ...prev, [zoneKey]: file.name }));
    setUploading(prev => ({ ...prev, [zoneKey]: false }));
    if (zoneKey === "cim" || zoneKey === "financials") {
      setFormState(DEMO);
      setAutoFilled(true);
    }
  }

  function handlePrint() { window.print(); }

  function handleGenerateDeck() {
    if (!result) return;
    const html = generateDeckHTML(deckTpl, {
      company: result.company, rating: result.rating, risk_score: result.risk_score,
      approval: result.approval, recommendation: result.recommendation,
      loan_amount: form.loan_amount, tenor: form.tenor,
      facility: form.facility, sponsor: form.sponsor,
      memo_sections: result.memo_sections,
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    });
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  }

  async function handleSubmit() {
    setPhase("running");
    setResult(null);
    setShowDeck(false);

    const allAgents = [...AGENT_WAVES[0], ...AGENT_WAVES[1]];
    setAgents(allAgents.map(a => ({ ...a, status: "pending" })));

    for (let i = 0; i < allAgents.length; i++) {
      await sleep(400);
      setAgents(prev => prev.map((a, idx) => idx === i ? { ...a, status: "running" } : a));
      await sleep(800 + Math.random() * 600);
      setAgents(prev => prev.map((a, idx) => idx === i ? { ...a, status: "complete", duration: `${(1 + Math.random()).toFixed(1)}s` } : a));
    }

    try {
      const res = await underwrite({
        company:    form.company,
        ticker:     form.ticker,
        loan_amount: parseFloat(form.loan_amount) * 1_000_000,
        loan_tenor:  parseInt(form.tenor),
        loan_type:  form.facility,
        sponsor:    form.sponsor,
        // Extended fields
        sector:     form.sector,
        description: form.description,
        jurisdiction: form.jurisdiction,
        purpose:    form.purpose,
        total_facility: form.total_facility ? parseFloat(form.total_facility) * 1_000_000 : undefined,
        pricing_spread_bps: form.pricing_spread ? parseInt(form.pricing_spread) : undefined,
        oid_pct:    form.oid ? parseFloat(form.oid) : undefined,
        call_protection: form.call_protection,
        revenue_ltm: form.revenue_ltm ? parseFloat(form.revenue_ltm) * 1_000_000 : undefined,
        ebitda_ltm:  form.ebitda_ltm  ? parseFloat(form.ebitda_ltm)  * 1_000_000 : undefined,
        adj_ebitda_ltm: form.adj_ebitda_ltm ? parseFloat(form.adj_ebitda_ltm) * 1_000_000 : undefined,
        revenue_growth_pct: form.revenue_growth ? parseFloat(form.revenue_growth) : undefined,
        capex:       form.capex ? parseFloat(form.capex) * 1_000_000 : undefined,
        fcf:         form.fcf   ? parseFloat(form.fcf)   * 1_000_000 : undefined,
        total_debt_proforma: form.total_debt_proforma ? parseFloat(form.total_debt_proforma) * 1_000_000 : undefined,
        equity_contribution: form.equity_contribution  ? parseFloat(form.equity_contribution)  * 1_000_000 : undefined,
        enterprise_value:    form.enterprise_value ? parseFloat(form.enterprise_value) * 1_000_000 : undefined,
        leverage_covenant:   form.leverage_covenant ? parseFloat(form.leverage_covenant) : undefined,
        icr_covenant:        form.icr_covenant      ? parseFloat(form.icr_covenant) : undefined,
        min_liquidity:       form.min_liquidity ? parseFloat(form.min_liquidity) * 1_000_000 : undefined,
        customer_concentration_pct: form.customer_concentration ? parseFloat(form.customer_concentration) : undefined,
        recurring_revenue_pct:      form.recurring_revenue ? parseFloat(form.recurring_revenue) : undefined,
        management_tenure_years:    form.management_tenure ? parseFloat(form.management_tenure) : undefined,
        backlog:     form.backlog ? parseFloat(form.backlog) * 1_000_000 : undefined,
        key_risks:   form.key_risks || undefined,
        esg_flags:   form.esg_flags !== "None identified" ? form.esg_flags : undefined,
        notes:       form.notes || undefined,
      });
      setResult({
        risk_score:         res.risk_score ?? 55,
        rating:             res.internal_rating ?? "BB-",
        recommendation:     res.recommendation ?? "",
        approval:           res.approval_status ?? "CONDITIONAL",
        memo_sections:      res.memo_sections ?? {},
        company:            form.company,
        scorecard:          res.risk_assessment?.scorecard,
        key_risk_drivers:   res.risk_assessment?.key_risk_drivers,
        mitigating_factors: res.risk_assessment?.mitigating_factors,
        ebitda_analysis:    res.ebitda_analysis,
        deal_id:            res.deal_id,
      });
    } catch {
      const isRejectCase = form.company === DEMO_REJECT.company;
      const lev = form.total_debt_proforma && (form.adj_ebitda_ltm || form.ebitda_ltm)
        ? parseFloat(form.total_debt_proforma) / parseFloat(form.adj_ebitda_ltm || form.ebitda_ltm)
        : null;
      const margin = form.ebitda_ltm && form.revenue_ltm
        ? (parseFloat(form.ebitda_ltm) / parseFloat(form.revenue_ltm)) * 100
        : null;

      if (isRejectCase) {
        setResult({
          risk_score: 81, rating: "CCC+", approval: "REJECT", company: form.company,
          ebitda_analysis: {
            reported_ebitda: 58_000_000,
            add_back_analysis: [
              { name: "Restructuring charges (3-yr recurring)", amount: 8_500_000, category: "one_time_cost",
                verdict: "REJECT",       rationale: "Restructuring expense has appeared in FY22, FY23, and FY24 — recurring cost mislabeled as one-time.", adjusted_amount: 0 },
              { name: "Pro-forma store closure savings",         amount: 4_200_000, category: "pro_forma",
                verdict: "REJECT",       rationale: "Closures not yet executed; speculative future savings cannot be added back.",                       adjusted_amount: 0 },
              { name: "ERP transformation savings",              amount: 3_800_000, category: "synergy",
                verdict: "QUESTIONABLE", rationale: "ERP project ongoing; savings unrealized at LTM date.",                                              adjusted_amount: 1_900_000 },
              { name: "Sponsor management fees",                 amount: 1_200_000, category: "management_fee",
                verdict: "SUPPORTABLE",  rationale: "Standard PE management fee elimination, well-documented.",                                          adjusted_amount: 1_200_000 },
              { name: "Stock-based compensation",                amount: 2_100_000, category: "other",
                verdict: "QUESTIONABLE", rationale: "Recurring SBC — many credit funds reject SBC add-back. Treat as cash cost.",                       adjusted_amount: 0 },
            ],
            total_supportable_adjustments:  1_200_000,
            total_questionable_adjustments: 5_900_000,
            total_rejected_adjustments:     12_700_000,
            conservative_adjusted_ebitda:   59_200_000,
            base_adjusted_ebitda:           65_100_000,
            adjustment_quality_score:       "LOW",
            adjustment_as_pct_of_reported:  34.5,
            key_concerns: [
              "Restructuring charges appear in three consecutive years — they are recurring, not one-time",
              "Pro-forma store-closure savings represent ~7% of marketed EBITDA but no closures executed",
              "Total adjustments at 34.5% of reported EBITDA exceed the S&P 2024 average of 29% — aggressive QoE",
            ],
            ebitda_conclusion: "EBITDA quality is LOW. Conservative EBITDA of $59.2M — barely above reported — is the only defensible figure. Build the credit model on $59M, not the marketed $76.7M. The $17.6M gap represents the aggressive add-back risk.",
          },
          recommendation: "Application REJECTED. Three hard policy fails: (1) leverage 9.2x breaches 6.5x covenant at close; (2) negative free cash flow −$8M cannot service debt; (3) revenue declining −18% YoY with no credible turnaround plan. Structural e-commerce disruption is secular, not cyclical. Sponsor equity at 9.7% of EV provides inadequate loss absorption. Recommend declining and returning application.",
          scorecard: {
            financial_quality: { score: "1", weight: "20%", notes: "Revenue −18% YoY · FCF −$8M · EBITDA margin 7.8% — all below policy minimums" },
            ebitda_quality:    { score: "2", weight: "20%", notes: "Adj. EBITDA $61M — $3M add-backs unverified. Declining trend makes QoE adjustments unacceptable" },
            business_quality:  { score: "1", weight: "20%", notes: "Department retail in secular decline. 82% customer concentration. Mgmt tenure 2 years — unproven" },
            leverage_profile:  { score: "1", weight: "20%", notes: "9.2x leverage — covenant breach at close (6.5x max). $562M debt on $61M EBITDA. HARD FAIL" },
            stress_resilience: { score: "1", weight: "10%", notes: "Fails all stress scenarios. Negative FCF in base case; CCC territory under moderate stress" },
            legal_structural:  { score: "2", weight: "10%", notes: "Second lien position with ESG / labour issues. $1.2B lease liability ahead of lenders" },
          },
          key_risk_drivers: [
            "Leverage 9.2x — hard covenant breach at close (6.5x maximum)",
            "Negative free cash flow −$8M — cannot service debt obligations",
            "Revenue −18% YoY — secular e-commerce disruption, not cyclical",
            "82% customer concentration in top 3 anchor tenants",
            "Sponsor equity 9.7% of EV — insufficient loss absorption in downside",
            "Second lien structural subordination — recovery in default severely impaired",
          ],
          mitigating_factors: [
            "Cerberus track record in retail distressed situations",
            "340-store footprint provides optionality for sale-leaseback",
          ],
          memo_sections: {
            executive_summary: `Meridian Retail Group is a $740M revenue department store operator seeking a $180M Second Lien Term Loan to fund a leveraged recapitalization. The application presents three hard policy fails: leverage breach at close (9.2x vs 6.5x covenant), negative FCF, and double-digit revenue decline. This credit does not meet CreditMind investment criteria.`,
            financial_analysis: `Revenue $740M (LTM), declining −18% YoY — three consecutive years of negative comparable-store sales. EBITDA $58M (7.8% margin), deeply sub-market for retail credits. Adj. EBITDA $61M includes $3M of unverified management add-backs. Free cash flow −$8M LTM — insufficient to service $562M of pro forma debt. Pro forma leverage 9.2x breaches the proposed 6.5x covenant at the moment of closing.`,
            risk_factors: `(1) Secular e-commerce disruption — online captures 34% of Meridian's addressable market and is accelerating; this is a permanent structural shift, not a cyclical trough. (2) Leverage covenant breach at close — 9.2x vs 6.5x maximum; no plausible path to compliance without material EBITDA recovery. (3) Negative FCF — operating cash burn means every debt service payment requires additional liquidity draw. (4) Customer concentration 82% — loss of a single anchor tenant triggers a cascading impact on foot traffic and co-tenancy clauses. (5) $1.2B lease liability structurally senior to lenders.`,
            stress_testing: `Under the base case (flat revenue, no further margin compression), the credit generates insufficient FCF to service the second lien. Under the moderate stress scenario (−10% revenue decline), EBITDA falls to $38M and leverage exceeds 14.8x. The severe stress scenario (−25% revenue) results in EBITDA approaching zero and near-certain default. No stress scenario produces covenant compliance.`,
            recommendation: `REJECT. This application fails three of six risk scorecard dimensions on hard policy criteria. The Investment Committee finds no basis for approval, conditional or otherwise. CreditMind's credit policy prohibits deployment into credits where leverage breaches covenant at close, FCF is negative in the base case, and the borrower faces structural — not cyclical — top-line deterioration. Application returned to sponsor without conditions.`,
          },
        });
      } else {
        setResult({
          risk_score: 55, rating: "BB-", approval: "CONDITIONAL", company: form.company,
          recommendation: "Conditional approval recommended. Proceed subject to final legal review and sponsor equity confirmation.",
          ebitda_analysis: {
            reported_ebitda: form.ebitda_ltm ? parseFloat(form.ebitda_ltm) * 1_000_000 : 42_000_000,
            add_back_analysis: [
              { name: "Litigation settlement (one-time)", amount: 1_500_000, category: "one_time_cost",
                verdict: "SUPPORTABLE", rationale: "Settled prior-period customer dispute, well-documented and non-recurring.", adjusted_amount: 1_500_000 },
              { name: "Sponsor management fees",          amount:   900_000, category: "management_fee",
                verdict: "SUPPORTABLE", rationale: "Standard PE management fee elimination per term sheet.", adjusted_amount: 900_000 },
              { name: "ERP transition expense",           amount: 1_200_000, category: "one_time_cost",
                verdict: "QUESTIONABLE", rationale: "ERP rollout extends 18 months; some cost is recurring license fees.", adjusted_amount: 600_000 },
              { name: "Pro-forma facility consolidation savings", amount: 800_000, category: "pro_forma",
                verdict: "QUESTIONABLE", rationale: "Consolidation announced but not yet executed; haircut to 50%.", adjusted_amount: 400_000 },
            ],
            total_supportable_adjustments:  2_400_000,
            total_questionable_adjustments: 2_000_000,
            total_rejected_adjustments:     0,
            conservative_adjusted_ebitda:   (form.ebitda_ltm ? parseFloat(form.ebitda_ltm) * 1_000_000 : 42_000_000) + 2_400_000,
            base_adjusted_ebitda:           (form.ebitda_ltm ? parseFloat(form.ebitda_ltm) * 1_000_000 : 42_000_000) + 4_400_000,
            adjustment_quality_score:       "MEDIUM",
            adjustment_as_pct_of_reported:  10.5,
            key_concerns: [
              "Pro-forma savings should be tracked quarterly post-close to verify realization",
              "Two questionable add-backs flagged — credit-model EBITDA uses conservative figure only",
            ],
            ebitda_conclusion: "EBITDA quality is MEDIUM. Use conservative EBITDA for leverage and coverage covenants. Adjustments at 10.5% of reported are well below the S&P 29% benchmark — this is a clean QoE.",
          },
          scorecard: {
            financial_quality: { score: "3", weight: "20%", notes: `Revenue $${form.revenue_ltm}M · EBITDA $${form.ebitda_ltm}M · Margin ${margin ? margin.toFixed(1) + "%" : "—"}` },
            ebitda_quality:    { score: "3", weight: "20%", notes: form.adj_ebitda_ltm ? `Adj. EBITDA $${form.adj_ebitda_ltm}M — add-backs subject to QoE verification` : "EBITDA quality to be confirmed via QoE" },
            business_quality:  { score: "4", weight: "20%", notes: form.description ? form.description.slice(0, 70) + "…" : "Adequate business quality" },
            leverage_profile:  { score: "3", weight: "20%", notes: lev ? `${lev.toFixed(1)}x leverage — within ${form.leverage_covenant || "6.0"}x covenant` : "Leverage within policy" },
            stress_resilience: { score: "3", weight: "10%", notes: "Passes base and moderate stress; fails severe recession scenario" },
            legal_structural:  { score: "4", weight: "10%", notes: `${form.jurisdiction || "Delaware"} domicile, clean capital structure` },
          },
          key_risk_drivers:   form.key_risks ? form.key_risks.split("\n").filter(Boolean) : ["Leverage — covenant headroom limited", "Customer concentration"],
          mitigating_factors: form.notes ? [form.notes] : ["Sponsor backing confirmed", "Recurring revenue supports debt service"],
          memo_sections: {
            executive_summary: `${form.company} is a ${form.sector || "mid-market"} company seeking a $${form.loan_amount}M ${form.facility} to finance ${form.purpose || "general corporate purposes"} over a ${form.tenor}-year tenor. The credit presents a ${lev ? lev.toFixed(1) + "x" : "—"} leverage profile consistent with a BB- internal rating. Conditional approval is recommended subject to the conditions below.`,
            financial_analysis: `Revenue (LTM): $${form.revenue_ltm || "—"}M. EBITDA: $${form.ebitda_ltm || "—"}M${form.adj_ebitda_ltm ? ` (Adj: $${form.adj_ebitda_ltm}M)` : ""}. EBITDA Margin: ${margin ? margin.toFixed(1) + "%" : "—"}. Revenue growth: ${form.revenue_growth || "—"}% YoY. FCF: $${form.fcf || "—"}M. Pro forma leverage: ${lev ? lev.toFixed(1) + "x" : "—"}.`,
            risk_factors: form.key_risks || "Key risk factors to be assessed by full agent analysis.",
            covenant_package: `Total Leverage ≤ ${form.leverage_covenant || "5.5"}x (quarterly); ICR ≥ ${form.icr_covenant || "2.0"}x; Min Liquidity $${form.min_liquidity || "15"}M; CapEx limit $${form.capex_limit || "25"}M/yr.`,
            recommendation: `CONDITIONAL APPROVAL. Conditions: (1) Audited FY2025 financials; (2) Sponsor equity commitment letter; (3) Legal review of existing debt documentation and change of control provisions.`,
          },
        });
      }
    }
    setPhase("done");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const f = form;
  const variants = {
    enter:  (d: number) => ({ opacity: 0, x: d * 32 }),
    center: { opacity: 1, x: 0 },
    exit:   (d: number) => ({ opacity: 0, x: d * -32 }),
  };

  const canAdvance = (() => {
    if (step === 1) return !!form.company && !!form.sponsor;
    if (step === 2) return !!form.facility && !!form.total_facility && !!form.loan_amount && !!form.tenor;
    if (step === 3) return !!form.revenue_ltm && !!form.ebitda_ltm;
    return true;
  })();

  return (
    <div className="grid grid-cols-2 gap-6">

      {/* ── LEFT — Application Form ───────────────────────────────────────── */}
      <div className="space-y-5">
        <div className="glass rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <p className="text-primary font-semibold text-sm">Credit Application</p>
              {autoFilled && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-success/20 text-success border border-success/30">
                  <FileText size={9} /> AI Extracted
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => loadDemo(DEMO)}
                className={cn(
                  "flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all",
                  isDemo
                    ? "bg-success/10 border-success/30 text-success"
                    : "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20"
                )}>
                <Zap size={10} /> Approval Demo
              </button>
              <button onClick={() => loadDemo(DEMO_REJECT)}
                className={cn(
                  "flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all",
                  isDemoReject
                    ? "bg-danger/10 border-danger/30 text-danger"
                    : "bg-danger/[0.06] border-danger/20 text-danger/70 hover:bg-danger/10 hover:text-danger"
                )}>
                <XCircle size={10} /> Rejection Demo
              </button>
              {(isDemo || isDemoReject) && (
                <button onClick={clearDemo}
                  className="text-muted text-[10px] px-2 py-1.5 hover:text-primary transition-colors">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center px-5 py-3 border-b border-white/[0.04] gap-1">
            {STEPS.map((s, i) => {
              const done   = s.id < step;
              const active = s.id === step;
              const Icon   = s.icon;
              return (
                <div key={s.id} className="flex items-center flex-1 min-w-0">
                  <button
                    onClick={() => phase === "form" && goTo(s.id)}
                    disabled={phase !== "form"}
                    className={cn(
                      "flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition-all",
                      active ? "text-accent" : done ? "text-success cursor-pointer" : "text-muted/40"
                    )}
                  >
                    <Icon size={11} className={active ? "text-accent" : done ? "text-success" : "text-muted/30"} />
                    <span className="hidden sm:inline">{s.label}</span>
                    {done && <span className="text-success text-[8px]">✓</span>}
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={cn("flex-1 h-px mx-1", done ? "bg-success/40" : "bg-white/[0.05]")} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step body */}
          <div className="px-5 py-4 min-h-[340px] overflow-y-auto">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {step === 1 && <Step1 f={f} set={set} />}
                {step === 2 && <Step2 f={f} set={set} />}
                {step === 3 && <Step3 f={f} set={set} />}
                {step === 4 && <Step4 f={f} set={set} />}
                {step === 5 && <Step5 f={f} set={set} />}
                {step === 6 && <Step6Review f={f} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation footer */}
          {phase === "form" && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
              <button
                onClick={() => goTo(step - 1)} disabled={step === 1}
                className="flex items-center gap-1.5 text-muted text-xs px-3 py-1.5 rounded-md border border-white/[0.06] hover:text-primary hover:border-white/[0.12] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft size={12} /> Back
              </button>
              <span className="text-muted text-[10px] font-mono">{step} / {STEPS.length}</span>
              {step < 6 ? (
                <button
                  onClick={() => goTo(step + 1)} disabled={!canAdvance}
                  className="flex items-center gap-1.5 bg-accent/10 border border-accent/30 text-accent text-xs px-3 py-1.5 rounded-md hover:bg-accent/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-semibold">
                  Next <ChevronRight size={12} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 bg-accent text-white text-xs px-5 py-1.5 rounded-md font-semibold hover:brightness-110 transition-all">
                  <Zap size={12} /> Run Underwriting Pipeline
                </button>
              )}
            </div>
          )}

          {phase === "done" && (
            <div className="px-5 py-3 border-t border-white/[0.06]">
              <button
                onClick={() => { setPhase("form"); setResult(null); setAgents([]); setAutoFilled(false); setShowDeck(false); setStep(1); setDir(1); }}
                className="w-full border border-white/[0.08] text-muted rounded-md px-4 py-2 text-sm hover:text-primary hover:border-white/[0.15] transition-colors">
                New Application
              </button>
            </div>
          )}
        </div>

        {/* ── Document Upload ────────────────────────────────────────────── */}
        <div className="glass rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-primary font-semibold text-sm">Document Upload</p>
            <p className="text-muted text-[10px]">AI extracts and auto-fills application</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {UPLOAD_ZONES.map(({ key, label, sub }) => {
              const isUploading = uploading[key];
              const uploaded    = uploadedDocs[key];
              return (
                <div key={key}>
                  <input type="file" accept=".pdf"
                    ref={el => { fileRefs.current[key] = el; }}
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(key, f); e.target.value = ""; }}
                  />
                  <div
                    onClick={() => !isUploading && fileRefs.current[key]?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-4 flex flex-col items-center gap-2 transition-all cursor-pointer group",
                      uploaded   ? "border-success/50 bg-success/5"
                      : isUploading ? "border-accent/50 bg-accent/5"
                      : "border-white/[0.08] hover:border-accent/40"
                    )}>
                    {isUploading ? (
                      <><span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /><p className="text-accent text-[10px] font-semibold">Analyzing…</p></>
                    ) : uploaded ? (
                      <><CheckCircle size={16} className="text-success" /><p className="text-success text-[10px] font-semibold">{label}</p><p className="text-muted text-[9px] truncate w-full text-center">{uploaded}</p></>
                    ) : (
                      <><Upload size={16} className="text-muted group-hover:text-accent transition-colors" /><p className="text-primary text-[10px] font-medium">{label}</p><p className="text-muted text-[9px] text-center">{sub}</p></>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── RIGHT — Pipeline / Results ────────────────────────────────────── */}
      <div className="space-y-5">
        {phase === "form" && (
          <div className="glass rounded-lg p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[200px]">
            <Zap size={28} className="text-accent opacity-35" />
            <p className="text-muted text-sm leading-relaxed">
              Complete the 6-step application and click{" "}
              <span className="text-accent font-semibold">Run Underwriting Pipeline</span>{" "}
              to activate the agent cascade.
            </p>
            <p className="text-muted text-xs">Upload a CIM or financials PDF to auto-fill the form.</p>
          </div>
        )}

        {(phase === "running" || phase === "done") && (
          <div className="glass rounded-lg p-5">
            <p className="text-primary font-semibold mb-4 text-sm">Agent Pipeline</p>
            <p className="text-muted text-[10px] uppercase tracking-widest mb-2">Wave 1 — Parallel Analysis</p>
            <AgentProgress agents={agents.slice(0, 4)} />
            <div className="my-3 border-t border-white/[0.06]" />
            <p className="text-muted text-[10px] uppercase tracking-widest mb-2">Wave 2 — Credit Modeling</p>
            <AgentProgress agents={agents.slice(4)} />
          </div>
        )}

        {phase === "done" && result && (
          <>
            {/* Agent Decision Trail */}
            <AgentDecisionSummary
              scorecard={result.scorecard}
              approval={result.approval}
              rating={result.rating}
              recommendation={result.recommendation}
            />

            {/* Score + Decision */}
            <div className="glass rounded-lg p-5 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-primary font-semibold text-sm">Underwriting Result</p>
                <button onClick={handlePrint}
                  className="flex items-center gap-1.5 border border-white/[0.08] text-muted rounded-md px-3 py-1.5 text-xs hover:text-primary hover:border-white/[0.15] transition-colors">
                  <Printer size={11} /> Export PDF
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

              {/* Decision banner */}
              <div className={cn("rounded-lg border-2 p-4",
                result.approval === "APPROVE" ? "border-success bg-success/5" :
                result.approval === "REJECT"  ? "border-danger bg-danger/5"   :
                                                "border-warning bg-warning/5"
              )}>
                <div className="flex items-center gap-3 mb-2">
                  {result.approval === "APPROVE" ? <CheckCircle size={20} className="text-success flex-shrink-0" /> :
                   result.approval === "REJECT"  ? <XCircle     size={20} className="text-danger flex-shrink-0"  /> :
                                                   <AlertCircle size={20} className="text-warning flex-shrink-0" />}
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

              {/* Decision Logic — threshold-by-threshold breakdown */}
              <DecisionLogic form={f} result={result} />

              {/* Scorecard */}
              {result.scorecard && (
                <div>
                  <p className="text-muted text-[10px] uppercase tracking-wider mb-2">Risk Scorecard</p>
                  <div className="space-y-1.5">
                    {Object.entries(result.scorecard).map(([dim, val]) => (
                      <div key={dim} className="flex items-center gap-2">
                        <p className="text-muted text-[10px] w-36 shrink-0 capitalize">{dim.replace(/_/g, " ")}</p>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(n => (
                            <div key={n} className={cn("w-4 h-1.5 rounded-sm",
                              n <= parseInt(val.score)
                                ? parseInt(val.score) >= 4 ? "bg-success" : parseInt(val.score) >= 3 ? "bg-warning" : "bg-danger"
                                : "bg-white/[0.06]"
                            )} />
                          ))}
                        </div>
                        <p className="text-muted text-[10px] flex-1 truncate">{val.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key risks / mitigants */}
              {result.key_risk_drivers && result.key_risk_drivers.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted text-[10px] uppercase tracking-wider mb-1.5">Key Risk Drivers</p>
                    <ul className="space-y-1">
                      {result.key_risk_drivers.map((d, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <XCircle size={9} className="text-danger mt-0.5 shrink-0" />
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
                            <CheckCircle size={9} className="text-success mt-0.5 shrink-0" />
                            <p className="text-muted text-[10px] leading-relaxed">{f}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* EBITDA Add-back Forensics */}
            {result.ebitda_analysis && <AddBackForensicsPanel analysis={result.ebitda_analysis} />}

            {/* IC Memo Accordion */}
            {Object.keys(result.memo_sections).length > 0 && (
              <div className="glass rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06]">
                  <p className="text-primary text-sm font-semibold">IC Credit Memo — {result.company}</p>
                  <p className="text-muted text-[10px] font-mono mt-0.5">Investment Committee Memorandum · Confidential</p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {Object.entries(result.memo_sections).map(([key, content]) => {
                    const label  = MEMO_SECTION_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                    const isOpen = expandedSections.has(key);
                    return (
                      <div key={key}>
                        <button onClick={() => toggleSection(key)}
                          className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors text-left">
                          <span className="text-primary text-xs font-semibold uppercase tracking-wider">{label}</span>
                          {isOpen ? <ChevronUp size={13} className="text-muted shrink-0" /> : <ChevronDown size={13} className="text-muted shrink-0" />}
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4">
                            <p className="text-muted text-xs leading-relaxed whitespace-pre-wrap">
                              {typedSections.has(key)
                                ? <TypewriterText text={content} speed={8} />
                                : content}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Deck Generator */}
            <div className="glass rounded-lg overflow-hidden">
              <button onClick={() => setShowDeck(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-2">
                  <Download size={13} className="text-accent" />
                  <p className="text-primary text-sm font-semibold">Generate Credit Committee Deck</p>
                </div>
                {showDeck ? <ChevronUp size={13} className="text-muted" /> : <ChevronDown size={13} className="text-muted" />}
              </button>
              {showDeck && (
                <div className="px-5 pb-5 border-t border-white/[0.06]">
                  <p className="text-muted text-xs mt-3 mb-4">Choose a template — opens in a new tab, print to PDF.</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {DECK_TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => setDeckTpl(t.id)}
                        className={cn("text-left p-3 rounded-lg border transition-all",
                          deckTpl === t.id ? "border-accent bg-accent/10" : "border-white/[0.08] bg-black/30 hover:border-white/[0.15]"
                        )}>
                        <p className={cn("text-xs font-semibold mb-0.5", deckTpl === t.id ? "text-accent" : "text-primary")}>{t.label}</p>
                        <p className="text-muted text-[10px] leading-relaxed">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                  <button onClick={handleGenerateDeck}
                    className="flex items-center gap-2 bg-accent text-white rounded-md px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition-all">
                    <Download size={13} /> Generate &amp; Open Deck
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
