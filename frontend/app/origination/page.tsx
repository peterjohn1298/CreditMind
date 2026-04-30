"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, Sparkles, ArrowRight, CheckCircle, XCircle, AlertCircle,
  Loader2, Filter, ChevronRight,
} from "lucide-react";
import Select from "@/components/ui/Select";
import PolicyComplianceBanner from "@/components/ui/PolicyComplianceBanner";
import { originationScan, screenDeal, checkDealPolicy } from "@/lib/api";
import type {
  FundCriteria, OriginationCandidate, OriginationScanResponse,
  ScreeningResult, PolicyCheckResult,
} from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type Phase = "browse" | "scanning" | "scanned" | "screening" | "screened";

const SECTORS = [
  "Healthcare", "Technology", "Industrials", "Consumer & Retail", "Energy",
  "Aerospace & Defense", "Financial Services", "Logistics", "Specialty Chemicals",
  "Food & Agriculture",
];

const SCREEN_DECISION_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  GO:                   { label: "Proceed to DD",  color: "#00D4A4", icon: CheckCircle },
  NO_GO:                { label: "Reject",         color: "#FF3B5C", icon: XCircle },
  PROCEED_WITH_CAVEATS: { label: "Caveats Apply",  color: "#FFB300", icon: AlertCircle },
};

export default function OriginationPage() {
  const [phase, setPhase] = useState<Phase>("browse");

  // Scan state
  const [criteria, setCriteria] = useState<FundCriteria>({
    target_sectors: ["Healthcare", "Technology", "Industrials"],
    ebitda_min: 10_000_000,
    ebitda_max: 150_000_000,
    loan_size_min: 25_000_000,
    loan_size_max: 500_000_000,
    max_leverage: 6.5,
  });
  const [scan, setScan] = useState<OriginationScanResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Screen state
  const [selected, setSelected] = useState<OriginationCandidate | null>(null);
  const [screenInput, setScreenInput] = useState({
    company: "", sector: "Healthcare", sponsor: "",
    ticker: "",
    estimated_ebitda: 50, // in $M
    loan_amount:      120, // in $M
    leverage_ask:     5.5,
    rationale: "",
  });
  const [screenResult, setScreenResult] = useState<ScreeningResult | null>(null);
  const [policyResult, setPolicyResult] = useState<PolicyCheckResult | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);

  async function runScan() {
    setPhase("scanning");
    setScanError(null);
    try {
      const res = await originationScan(criteria);
      setScan(res);
      setPhase("scanned");
    } catch (e) {
      setScanError(String(e));
      setPhase("browse");
    }
  }

  function pickCandidate(c: OriginationCandidate) {
    setSelected(c);
    setScreenInput({
      company: c.company,
      sector:  c.sector ?? screenInput.sector,
      sponsor: "",
      ticker:  c.ticker ?? "",
      estimated_ebitda: 50,
      loan_amount:      120,
      leverage_ask:     5.5,
      rationale:        c.rationale,
    });
    setScreenResult(null);
    setPolicyResult(null);
  }

  async function runScreen() {
    setPhase("screening");
    setScreenError(null);
    try {
      const teaser = {
        company: screenInput.company,
        sector:  screenInput.sector,
        sponsor: screenInput.sponsor || undefined,
        ticker:  screenInput.ticker || undefined,
        estimated_ebitda: screenInput.estimated_ebitda * 1_000_000,
        loan_amount:      screenInput.loan_amount * 1_000_000,
        leverage_ask:     screenInput.leverage_ask,
        rationale:        screenInput.rationale,
      };
      const [s, p] = await Promise.all([
        screenDeal(teaser),
        checkDealPolicy(teaser),
      ]);
      setScreenResult(s);
      setPolicyResult(p);
      setPhase("screened");
    } catch (e) {
      setScreenError(String(e));
      setPhase("scanned");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <PolicyComplianceBanner />

      {/* Header */}
      <div>
        <h2 className="text-primary text-xl font-bold">Origination & Screening</h2>
        <p className="text-muted text-xs mt-1">
          Stage 1 — Scout the market for deals that fit our mandate. Stage 2 — Run a 2-minute go/no-go screen with policy compliance check before committing to full DD.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* LEFT — Scan + Candidates */}
        <div className="col-span-7 space-y-5">
          <div className="glass rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Search size={16} className="text-accent" />
                <p className="text-primary text-sm font-semibold">Stage 1 — Origination Scout</p>
              </div>
              <button
                onClick={runScan}
                disabled={phase === "scanning" || phase === "screening"}
                className="flex items-center gap-1.5 bg-accent/10 border border-accent/30 text-accent rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
              >
                {phase === "scanning"
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Sparkles size={12} />}
                {phase === "scanning" ? "Scanning…" : scan ? "Re-scan" : "Run Scan"}
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Criteria */}
              <div className="grid grid-cols-3 gap-3">
                <CriteriaInput
                  label="EBITDA min ($M)"
                  value={criteria.ebitda_min ?? 0}
                  onChange={(v) => setCriteria({ ...criteria, ebitda_min: v * 1_000_000 })}
                  divisor={1_000_000}
                />
                <CriteriaInput
                  label="EBITDA max ($M)"
                  value={criteria.ebitda_max ?? 0}
                  onChange={(v) => setCriteria({ ...criteria, ebitda_max: v * 1_000_000 })}
                  divisor={1_000_000}
                />
                <CriteriaInput
                  label="Max leverage (x)"
                  value={criteria.max_leverage ?? 0}
                  onChange={(v) => setCriteria({ ...criteria, max_leverage: v })}
                  step={0.1}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CriteriaInput
                  label="Loan size min ($M)"
                  value={criteria.loan_size_min ?? 0}
                  onChange={(v) => setCriteria({ ...criteria, loan_size_min: v * 1_000_000 })}
                  divisor={1_000_000}
                />
                <CriteriaInput
                  label="Loan size max ($M)"
                  value={criteria.loan_size_max ?? 0}
                  onChange={(v) => setCriteria({ ...criteria, loan_size_max: v * 1_000_000 })}
                  divisor={1_000_000}
                />
              </div>
              <div>
                <p className="text-muted text-[10px] uppercase tracking-wider mb-1.5">Target sectors</p>
                <div className="flex flex-wrap gap-2">
                  {SECTORS.map((s) => {
                    const active = criteria.target_sectors?.includes(s) ?? false;
                    return (
                      <button
                        key={s}
                        onClick={() => setCriteria({
                          ...criteria,
                          target_sectors: active
                            ? criteria.target_sectors?.filter((x) => x !== s)
                            : [...(criteria.target_sectors ?? []), s],
                        })}
                        className={cn(
                          "text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border",
                          active
                            ? "border-accent/40 text-accent bg-accent/10"
                            : "border-white/[0.08] text-muted hover:text-primary"
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {scanError && (
            <div className="text-danger text-xs px-1">Scan failed: {scanError}</div>
          )}

          {/* Candidates */}
          {scan && (
            <div className="glass rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06]">
                <p className="text-primary text-sm font-semibold">Candidates</p>
                {scan.scan_summary && (
                  <p className="text-muted text-[11px] mt-0.5">{scan.scan_summary}</p>
                )}
              </div>
              <div className="divide-y divide-white/[0.04]">
                {(scan.candidates ?? []).length === 0 ? (
                  <p className="px-5 py-6 text-muted text-xs italic text-center">
                    No candidates returned. Try widening criteria.
                  </p>
                ) : (
                  scan.candidates?.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => pickCandidate(c)}
                      className={cn(
                        "w-full px-5 py-3 text-left hover:bg-white/[0.02] transition-colors",
                        selected?.company === c.company && "bg-accent/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-primary text-xs font-semibold">{c.company}</p>
                            {c.ticker && <span className="text-muted text-[10px] font-mono">({c.ticker})</span>}
                            {c.sector && (
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-full border border-white/[0.1] text-muted">
                                {c.sector}
                              </span>
                            )}
                            {c.urgency && (
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-full border border-warning/30 text-warning">
                                {c.urgency}
                              </span>
                            )}
                          </div>
                          <p className="text-muted text-[11px] leading-relaxed">{c.rationale}</p>
                          <p className="text-success text-[10px] mt-1 font-mono">Signal: {c.signal}</p>
                        </div>
                        <ChevronRight size={14} className="text-muted shrink-0 mt-1" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Screening */}
        <div className="col-span-5 space-y-5">
          <div className="glass rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Filter size={16} className="text-accent" />
                <p className="text-primary text-sm font-semibold">Stage 2 — Deal Screen</p>
              </div>
              <button
                onClick={runScreen}
                disabled={phase === "screening" || !screenInput.company}
                className="flex items-center gap-1.5 bg-accent/10 border border-accent/30 text-accent rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
              >
                {phase === "screening"
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Sparkles size={12} />}
                {phase === "screening" ? "Screening…" : "Screen Deal"}
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <Field label="Company" required>
                <input
                  value={screenInput.company}
                  onChange={(e) => setScreenInput({ ...screenInput, company: e.target.value })}
                  placeholder="e.g. Acme Healthcare"
                  className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-primary text-sm focus:outline-none focus:border-accent"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Ticker">
                  <input
                    value={screenInput.ticker}
                    onChange={(e) => setScreenInput({ ...screenInput, ticker: e.target.value })}
                    placeholder="optional"
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-primary text-sm font-mono focus:outline-none focus:border-accent"
                  />
                </Field>
                <Field label="Sector">
                  <Select
                    value={screenInput.sector}
                    onChange={(v) => setScreenInput({ ...screenInput, sector: v })}
                    options={SECTORS}
                    className="w-full"
                  />
                </Field>
              </div>

              <Field label="Sponsor">
                <input
                  value={screenInput.sponsor}
                  onChange={(e) => setScreenInput({ ...screenInput, sponsor: e.target.value })}
                  placeholder="e.g. Blackstone (leave blank for non-sponsored)"
                  className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-primary text-sm focus:outline-none focus:border-accent"
                />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="EBITDA ($M)">
                  <input
                    type="number"
                    value={screenInput.estimated_ebitda}
                    onChange={(e) => setScreenInput({ ...screenInput, estimated_ebitda: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-primary text-sm font-mono focus:outline-none focus:border-accent"
                  />
                </Field>
                <Field label="Loan ($M)">
                  <input
                    type="number"
                    value={screenInput.loan_amount}
                    onChange={(e) => setScreenInput({ ...screenInput, loan_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-primary text-sm font-mono focus:outline-none focus:border-accent"
                  />
                </Field>
                <Field label="Leverage (x)">
                  <input
                    type="number"
                    step="0.1"
                    value={screenInput.leverage_ask}
                    onChange={(e) => setScreenInput({ ...screenInput, leverage_ask: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-primary text-sm font-mono focus:outline-none focus:border-accent"
                  />
                </Field>
              </div>
            </div>
          </div>

          {screenError && (
            <div className="text-danger text-xs px-1">Screen failed: {screenError}</div>
          )}

          {/* Policy compliance result */}
          {policyResult && <PolicyResultCard result={policyResult} />}

          {/* Screening result */}
          {screenResult && <ScreeningResultCard result={screenResult} />}

          {/* Hand-off */}
          {(screenResult?.recommendation === "GO" || screenResult?.recommendation === "PROCEED_WITH_CAVEATS") && (
            <Link
              href="/underwriting"
              className="block bg-accent text-white rounded-md px-4 py-3 text-sm font-semibold text-center hover:brightness-110 transition-all"
            >
              Continue to Full Underwriting <ArrowRight size={14} className="inline ml-1" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted text-[10px] uppercase tracking-wider mb-1">
        {label}{required && <span className="text-danger ml-0.5">*</span>}
      </p>
      {children}
    </div>
  );
}

function CriteriaInput({
  label, value, onChange, step, divisor,
}: {
  label:    string;
  value:    number;
  onChange: (n: number) => void;
  step?:    number;
  divisor?: number;
}) {
  const display = divisor ? value / divisor : value;
  return (
    <Field label={label}>
      <input
        type="number"
        step={step ?? "1"}
        value={display}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-primary text-sm font-mono focus:outline-none focus:border-accent"
      />
    </Field>
  );
}

function PolicyResultCard({ result }: { result: PolicyCheckResult }) {
  const tone = result.hard_blocks.length > 0 ? "danger" : result.escalations.length > 0 ? "warning" : "success";
  return (
    <div className={cn(
      "glass rounded-lg overflow-hidden",
      tone === "danger" && "border border-danger/30",
      tone === "warning" && "border border-warning/30",
      tone === "success" && "border border-success/30",
    )}>
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
        {tone === "success" && <CheckCircle size={14} className="text-success" />}
        {tone === "warning" && <AlertCircle size={14} className="text-warning" />}
        {tone === "danger" && <XCircle size={14} className="text-danger" />}
        <p className="text-primary text-xs font-semibold">
          Policy Check — {result.compliant ? "Compliant" : result.can_proceed ? "Escalation Required" : "Hard Block"}
        </p>
      </div>
      <div className="px-5 py-3 space-y-2">
        <p className="text-muted text-[11px]">Approval level: <span className="text-primary font-mono">{result.approval_level}</span></p>
        {result.hard_blocks.length > 0 && (
          <ViolationList items={result.hard_blocks} tone="danger" label="Hard Blocks" />
        )}
        {result.escalations.length > 0 && (
          <ViolationList items={result.escalations} tone="warning" label="Escalations" />
        )}
        {result.warnings.length > 0 && (
          <ViolationList items={result.warnings} tone="muted" label="Soft Warnings" />
        )}
      </div>
    </div>
  );
}

function ViolationList({ items, tone, label }: {
  items: PolicyCheckResult["hard_blocks"];
  tone: "danger" | "warning" | "muted";
  label: string;
}) {
  const color = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-muted";
  return (
    <div>
      <p className={cn("text-[10px] uppercase tracking-wider font-mono font-semibold mb-1", color)}>{label}</p>
      <ul className="space-y-1">
        {items.map((v, i) => (
          <li key={i} className="text-primary text-[11px] leading-relaxed">
            <span className="text-muted font-mono uppercase text-[9px] mr-1">[{v.section}]</span>
            {v.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScreeningResultCard({ result }: { result: ScreeningResult }) {
  const cfg = SCREEN_DECISION_CONFIG[result.recommendation as string] ?? SCREEN_DECISION_CONFIG.PROCEED_WITH_CAVEATS;
  const Icon = cfg.icon;
  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <p className="text-primary text-sm font-semibold">Screening Decision</p>
        <span
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border"
          style={{ color: cfg.color, borderColor: cfg.color + "55", backgroundColor: cfg.color + "11" }}
        >
          <Icon size={10} className="inline mr-1" />
          {cfg.label}
        </span>
      </div>
      <div className="px-5 py-3 space-y-2">
        {result.confidence != null && (
          <p className="text-muted text-[11px]">Confidence: <span className="text-primary font-mono">{(result.confidence * 100).toFixed(0)}%</span></p>
        )}
        <CheckRow label="Sector fit"          value={result.sector_fit} />
        <CheckRow label="Size fit"            value={result.size_fit} />
        <CheckRow label="Leverage fit"        value={result.leverage_fit} />
        <CheckRow label="Concentration risk" value={result.concentration_risk} />
        <CheckRow label="Sponsor quality"    value={result.sponsor_quality} />
        {result.flags && result.flags.length > 0 && (
          <div className="pt-2 border-t border-white/[0.04]">
            <p className="text-warning text-[10px] uppercase tracking-wider font-mono font-semibold mb-1">Flags</p>
            <ul className="space-y-0.5">
              {result.flags.map((f, i) => (
                <li key={i} className="text-primary text-[11px] leading-relaxed flex gap-2">
                  <span className="text-warning shrink-0">›</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.rationale && (
          <div className="pt-2 border-t border-white/[0.04]">
            <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-1">Rationale</p>
            <p className="text-primary text-[11px] leading-relaxed">{result.rationale}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckRow({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted text-[10px] uppercase tracking-wider font-mono w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-primary text-[11px] flex-1">{value}</span>
    </div>
  );
}
