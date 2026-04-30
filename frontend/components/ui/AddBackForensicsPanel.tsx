"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, XCircle, TrendingDown } from "lucide-react";
import type { EBITDAAnalysis, AddBackItem } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof ShieldCheck }> = {
  SUPPORTABLE:  { label: "Supportable",  color: "#00D4A4", bg: "bg-success/10", border: "border-success/30", icon: ShieldCheck },
  QUESTIONABLE: { label: "Questionable", color: "#FFB300", bg: "bg-warning/10", border: "border-warning/30", icon: AlertTriangle },
  REJECT:       { label: "Reject",       color: "#FF3B5C", bg: "bg-danger/10",  border: "border-danger/30",  icon: XCircle },
};

const QUALITY_TONE: Record<string, string> = {
  HIGH:   "text-success",
  MEDIUM: "text-warning",
  LOW:    "text-danger",
};

interface Props {
  analysis: EBITDAAnalysis | undefined;
}

export default function AddBackForensicsPanel({ analysis }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (!analysis || analysis.error) {
    return null;
  }

  const items: AddBackItem[] = analysis.add_back_analysis ?? [];
  if (items.length === 0 && !analysis.reported_ebitda) return null;

  const reported     = analysis.reported_ebitda ?? 0;
  const conservative = analysis.conservative_adjusted_ebitda ?? null;
  const base         = analysis.base_adjusted_ebitda ?? null;
  const adjPct       = analysis.adjustment_as_pct_of_reported;

  const supportable  = analysis.total_supportable_adjustments ?? 0;
  const questionable = analysis.total_questionable_adjustments ?? 0;
  const rejected     = analysis.total_rejected_adjustments ?? 0;

  // S&P benchmark — adjustments at ~29% of marketed EBITDA were the 2015-24 average
  const benchmarkPct = 29;
  const adjustmentVsBenchmark = adjPct != null
    ? adjPct > benchmarkPct + 5
      ? "ABOVE"
      : adjPct < benchmarkPct - 5
        ? "BELOW"
        : "INLINE"
    : null;

  return (
    <div className="glass rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <TrendingDown size={16} className="text-accent" />
          <div>
            <p className="text-primary text-sm font-semibold">EBITDA Add-back Forensics</p>
            <p className="text-muted text-[11px]">
              Each adjustment scored Supportable / Questionable / Reject. Conservative number is the credit-model anchor.
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
      </button>

      {expanded && (
        <div className="px-5 py-4 space-y-5">
          {/* EBITDA waterfall summary */}
          <div className="grid grid-cols-4 gap-3">
            <KPI label="Reported EBITDA"        value={reported}        size="lg" />
            <KPI label="Supportable adds"       value={supportable}     tone="text-success" />
            <KPI label="Questionable / Reject"  value={questionable + rejected} tone="text-warning" />
            <KPI
              label="Conservative EBITDA"
              value={conservative ?? reported}
              tone="text-primary"
              size="lg"
              annotation={base != null && conservative != null
                ? `vs base $${(base / 1e6).toFixed(1)}M`
                : undefined}
            />
          </div>

          {/* Adjustment quality score + S&P benchmark */}
          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 px-3 py-2.5 rounded-md bg-white/[0.02] border border-white/[0.06]">
            {analysis.adjustment_quality_score && (
              <div className="flex items-center gap-2">
                <span className="text-muted text-[10px] uppercase tracking-wider font-mono">Quality Score</span>
                <span className={cn("text-xs font-mono font-semibold", QUALITY_TONE[analysis.adjustment_quality_score] ?? "text-muted")}>
                  {analysis.adjustment_quality_score}
                </span>
              </div>
            )}
            {adjPct != null && (
              <div className="flex items-center gap-2">
                <span className="text-muted text-[10px] uppercase tracking-wider font-mono">Adj as % of Reported</span>
                <span className="text-xs font-mono text-primary">{adjPct.toFixed(1)}%</span>
                {adjustmentVsBenchmark && (
                  <span
                    className={cn(
                      "text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border",
                      adjustmentVsBenchmark === "ABOVE"
                        ? "border-danger/30 text-danger bg-danger/5"
                        : adjustmentVsBenchmark === "BELOW"
                          ? "border-success/30 text-success bg-success/5"
                          : "border-muted/30 text-muted bg-white/[0.03]"
                    )}
                  >
                    {adjustmentVsBenchmark} S&P avg ({benchmarkPct}%)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Add-back table */}
          {items.length > 0 && (
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                Add-back Detail ({items.length} items)
              </p>
              <div className="overflow-hidden rounded-md border border-white/[0.06]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="text-left px-3 py-2 text-muted text-[10px] font-semibold uppercase tracking-wider">Add-back</th>
                      <th className="text-left px-3 py-2 text-muted text-[10px] font-semibold uppercase tracking-wider">Category</th>
                      <th className="text-right px-3 py-2 text-muted text-[10px] font-semibold uppercase tracking-wider">Amount</th>
                      <th className="text-center px-3 py-2 text-muted text-[10px] font-semibold uppercase tracking-wider">Verdict</th>
                      <th className="text-left px-3 py-2 text-muted text-[10px] font-semibold uppercase tracking-wider">Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      const cfg = VERDICT_CONFIG[item.verdict] ?? VERDICT_CONFIG.QUESTIONABLE;
                      const Icon = cfg.icon;
                      return (
                        <tr key={i} className={cn("border-b border-white/[0.04] last:border-0", i % 2 === 1 && "bg-white/[0.015]")}>
                          <td className="px-3 py-2.5 text-primary text-xs font-medium">{item.name}</td>
                          <td className="px-3 py-2.5">
                            <span className="text-muted text-[10px] font-mono uppercase">
                              {item.category.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-primary text-xs font-mono">
                            {item.amount != null ? formatCurrency(item.amount) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border uppercase",
                                cfg.bg, cfg.border
                              )}
                              style={{ color: cfg.color }}
                            >
                              <Icon size={10} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-muted text-[11px] leading-relaxed max-w-md">
                            {item.rationale}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Key concerns */}
          {analysis.key_concerns && analysis.key_concerns.length > 0 && (
            <div>
              <p className="text-warning text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                Analyst Concerns
              </p>
              <ul className="space-y-1.5">
                {analysis.key_concerns.map((c, i) => (
                  <li key={i} className="text-primary text-xs leading-relaxed flex gap-2">
                    <span className="text-warning shrink-0">›</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Conclusion */}
          {analysis.ebitda_conclusion && (
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                EBITDA Quality Verdict
              </p>
              <p className="text-primary text-xs leading-relaxed">{analysis.ebitda_conclusion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KPI({
  label, value, tone, size, annotation,
}: {
  label:       string;
  value:       number | null | undefined;
  tone?:       string;
  size?:       "lg";
  annotation?: string;
}) {
  return (
    <div className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
      <p className="text-muted text-[10px] uppercase tracking-wider font-mono mb-1">{label}</p>
      <p className={cn("font-mono", size === "lg" ? "text-base font-semibold" : "text-sm", tone ?? "text-primary")}>
        {value != null ? formatCurrency(value) : "—"}
      </p>
      {annotation && <p className="text-muted text-[10px] mt-0.5">{annotation}</p>}
    </div>
  );
}
