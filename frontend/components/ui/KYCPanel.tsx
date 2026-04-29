"use client";

import { useState } from "react";
import {
  ShieldAlert, Sparkles, CheckCircle, AlertCircle, XCircle, Loader2,
  Users, Newspaper, Network, ExternalLink,
} from "lucide-react";
import { runKYCScreen } from "@/lib/api";
import type { KYCAMLScreen, KYCEntityVerdict } from "@/lib/types";
import { cn } from "@/lib/utils";

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
  CLEAR:                    { label: "Clear",          color: "#00D4A4", bg: "bg-success/10", border: "border-success/30", icon: CheckCircle },
  EDD_REQUIRED:             { label: "EDD Required",   color: "#FFB300", bg: "bg-warning/10", border: "border-warning/30", icon: AlertCircle },
  CONDITIONAL:              { label: "Conditional",    color: "#FFB300", bg: "bg-warning/10", border: "border-warning/30", icon: AlertCircle },
  ESCALATE:                 { label: "Escalate",       color: "#FF8C00", bg: "bg-warning/10", border: "border-warning/30", icon: AlertCircle },
  ESCALATE_TO_AML_OFFICER:  { label: "Escalate AML",   color: "#FF8C00", bg: "bg-warning/10", border: "border-warning/30", icon: AlertCircle },
  REJECT:                   { label: "Reject",         color: "#FF3B5C", bg: "bg-danger/10",  border: "border-danger/30",  icon: XCircle },
  MATCH:                    { label: "Match",          color: "#FF3B5C", bg: "bg-danger/10",  border: "border-danger/30",  icon: XCircle },
  FALSE_POSITIVE:           { label: "False Positive", color: "#7B8FF7", bg: "bg-white/[0.02]", border: "border-white/[0.1]", icon: CheckCircle },
  NEEDS_VERIFICATION:       { label: "Verify",         color: "#FFB300", bg: "bg-warning/10", border: "border-warning/30", icon: AlertCircle },
};

const PEP_TONE: Record<string, string> = {
  NOT_PEP:        "text-muted",
  PEP:            "text-warning",
  PEP_FAMILY:     "text-warning",
  PEP_ASSOCIATE:  "text-warning",
};

interface Props {
  dealId:    string;
  existing?: Partial<KYCAMLScreen>;
}

export default function KYCPanel({ dealId, existing }: Props) {
  const initial: KYCAMLScreen | null = existing && existing.overall_verdict
    ? {
        borrower_screen:        existing.borrower_screen ?? { ofac_status: "CLEAR", ofac_evidence: "", verdict: "CLEAR" },
        sponsor_screen:         existing.sponsor_screen  ?? { ofac_status: "CLEAR", ofac_evidence: "", verdict: "CLEAR" },
        officer_screens:        existing.officer_screens ?? [],
        beneficial_ownership:   existing.beneficial_ownership ?? { ubo_list: [], transparency_score: "MEDIUM", ownership_concerns: [] },
        adverse_media_findings: existing.adverse_media_findings ?? [],
        overall_verdict:        existing.overall_verdict,
        fincen_compliance:      existing.fincen_compliance ?? "COMPLIANT",
        required_actions:       existing.required_actions ?? [],
        kyc_aml_summary:        existing.kyc_aml_summary ?? "",
      }
    : null;

  const [data, setData] = useState<KYCAMLScreen | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await runKYCScreen(dealId);
      setData(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const cfg = data ? (VERDICT_CONFIG[data.overall_verdict] ?? VERDICT_CONFIG.EDD_REQUIRED) : null;

  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert size={16} className="text-accent" />
          <div>
            <p className="text-primary text-sm font-semibold">KYC / AML / Sanctions Screen</p>
            <p className="text-muted text-[11px]">
              OFAC + PEP + adverse media + UBO trace. FinCEN AML Rule for RIAs effective Jan 2028 — every loan must pass this gate.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {cfg && (
            <span
              className={cn("text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border", cfg.bg, cfg.border)}
              style={{ color: cfg.color }}
            >
              <cfg.icon size={10} className="inline mr-1" />
              {cfg.label}
            </span>
          )}
          {!data && (
            <button
              onClick={run}
              disabled={loading}
              className="flex items-center gap-1.5 bg-accent/10 border border-accent/30 text-accent rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {loading ? "Screening…" : "Run KYC Screen"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-5 py-3 text-danger text-xs">Could not run KYC screen: {error}</div>
      )}

      {!data && !loading && !error && (
        <div className="px-5 py-8 text-center">
          <p className="text-muted text-xs max-w-md mx-auto">
            Click Run KYC Screen to check borrower, sponsor, all officers, and beneficial owners
            against OFAC sanctions, PEP databases, and adverse-media sources. FinCEN-grade compliance output.
          </p>
        </div>
      )}

      {data && (
        <div className="px-5 py-4 space-y-5">
          {/* Summary */}
          {data.kyc_aml_summary && (
            <div className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-1">
                Compliance Officer Summary
              </p>
              <p className="text-primary text-xs leading-relaxed">{data.kyc_aml_summary}</p>
              <p className="text-muted text-[10px] mt-2">
                FinCEN: <span className={cn("font-mono", data.fincen_compliance === "COMPLIANT" ? "text-success" : "text-warning")}>
                  {data.fincen_compliance}
                </span>
              </p>
            </div>
          )}

          {/* Entity-level screens */}
          <div className="grid grid-cols-2 gap-3">
            <EntityScreenCard label="Borrower" screen={data.borrower_screen} />
            <EntityScreenCard label="Sponsor"  screen={data.sponsor_screen} />
          </div>

          {/* Officers */}
          {data.officer_screens.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users size={12} className="text-accent" />
                <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold">
                  Officers & Directors ({data.officer_screens.length})
                </p>
              </div>
              <div className="overflow-hidden rounded-md border border-white/[0.06]">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.02] border-b border-white/[0.06]">
                    <tr>
                      {["Name", "Role", "OFAC", "PEP", "Adverse Media", "Verdict"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-muted text-[10px] font-semibold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.officer_screens.map((o, i) => {
                      const vCfg = VERDICT_CONFIG[o.verdict] ?? VERDICT_CONFIG.CLEAR;
                      const ofacCfg = VERDICT_CONFIG[o.ofac_status] ?? VERDICT_CONFIG.CLEAR;
                      return (
                        <tr key={i} className={cn("border-b border-white/[0.04] last:border-0", i % 2 === 1 && "bg-white/[0.015]")}>
                          <td className="px-3 py-2.5 text-primary text-xs font-medium">{o.name}</td>
                          <td className="px-3 py-2.5 text-muted text-[11px]">{o.role}</td>
                          <td className="px-3 py-2.5">
                            <span className="text-[10px] font-mono uppercase" style={{ color: ofacCfg.color }}>
                              {ofacCfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={cn("text-[10px] font-mono uppercase", PEP_TONE[o.pep_status] ?? "text-muted")}>
                              {o.pep_status.replace(/_/g, " ")}
                            </span>
                            {o.pep_rationale && o.pep_status !== "NOT_PEP" && (
                              <p className="text-muted text-[10px] mt-0.5">{o.pep_rationale}</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-muted text-[10px]">
                            {o.adverse_media.length === 0 ? "—" : o.adverse_media.join("; ")}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[10px] font-mono uppercase font-semibold" style={{ color: vCfg.color }}>
                              {vCfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Beneficial ownership */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Network size={12} className="text-accent" />
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold">
                Beneficial Ownership (≥25% UBOs)
              </p>
              <span className={cn(
                "text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border",
                data.beneficial_ownership.transparency_score === "HIGH"   && "border-success/30 text-success",
                data.beneficial_ownership.transparency_score === "MEDIUM" && "border-warning/30 text-warning",
                data.beneficial_ownership.transparency_score === "LOW"    && "border-danger/30 text-danger",
              )}>
                {data.beneficial_ownership.transparency_score} TRANSPARENCY
              </span>
            </div>
            {data.beneficial_ownership.ubo_list.length === 0 ? (
              <p className="text-muted text-xs italic">No UBOs identified yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.beneficial_ownership.ubo_list.map((u, i) => (
                  <li key={i} className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-primary text-xs font-semibold">{u.name}</p>
                      <span className="text-muted text-[10px] font-mono">
                        {u.ownership_pct != null ? `${u.ownership_pct}%` : "—"} · {u.jurisdiction}
                      </span>
                    </div>
                    <p className="text-muted text-[10px] leading-relaxed">{u.ownership_path}</p>
                  </li>
                ))}
              </ul>
            )}
            {data.beneficial_ownership.ownership_concerns.length > 0 && (
              <div className="mt-2 px-3 py-2 rounded-md bg-warning/5 border border-warning/20">
                <p className="text-warning text-[10px] uppercase tracking-wider font-mono font-semibold mb-1">Ownership Concerns</p>
                <ul className="space-y-0.5">
                  {data.beneficial_ownership.ownership_concerns.map((c, i) => (
                    <li key={i} className="text-primary text-[11px] leading-relaxed">{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Adverse media */}
          {data.adverse_media_findings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Newspaper size={12} className="text-accent" />
                <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold">
                  Adverse Media ({data.adverse_media_findings.length})
                </p>
              </div>
              <ul className="space-y-2">
                {data.adverse_media_findings.map((f, i) => {
                  const sevTone = f.severity === "HIGH" ? "text-danger" : f.severity === "MEDIUM" ? "text-warning" : "text-muted";
                  return (
                    <li key={i} className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
                      <div className="flex items-start justify-between mb-1 gap-3">
                        <div className="flex-1 min-w-0">
                          <span className={cn("text-[10px] font-mono uppercase tracking-wider", sevTone)}>
                            {f.category.replace(/_/g, " ")}
                          </span>
                          <p className="text-primary text-xs mt-0.5">{f.subject}</p>
                        </div>
                        <span className="text-muted text-[10px] font-mono shrink-0">{f.date}</span>
                      </div>
                      <p className="text-muted text-[11px] leading-relaxed">{f.summary}</p>
                      {f.source_link && (
                        <a href={f.source_link} target="_blank" rel="noopener noreferrer"
                          className="text-accent text-[10px] hover:brightness-125 mt-1 inline-flex items-center gap-1">
                          <ExternalLink size={10} /> source
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Required actions */}
          {data.required_actions.length > 0 && (
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                Required Actions Before Close
              </p>
              <ul className="space-y-1">
                {data.required_actions.map((a, i) => (
                  <li key={i} className="text-primary text-xs leading-relaxed flex gap-2">
                    <span className="text-warning shrink-0">›</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntityScreenCard({ label, screen }: { label: string; screen: import("@/lib/types").KYCEntityScreen }) {
  const cfg = VERDICT_CONFIG[screen.verdict] ?? VERDICT_CONFIG.CLEAR;
  return (
    <div className={cn("rounded-md border px-3 py-2.5", cfg.bg, cfg.border)}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold">{label}</p>
        <span className="text-[10px] font-mono uppercase font-semibold" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
      <p className="text-primary text-[11px] leading-relaxed">{screen.ofac_evidence || "—"}</p>
      {screen.sectoral_sanctions && screen.sectoral_sanctions !== "none" && (
        <p className="text-warning text-[10px] mt-1">Sectoral: {screen.sectoral_sanctions}</p>
      )}
    </div>
  );
}
