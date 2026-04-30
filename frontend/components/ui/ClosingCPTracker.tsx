"use client";

import { useState } from "react";
import { ClipboardCheck, Sparkles, CheckCircle, XCircle, AlertCircle, Clock, Loader2, Banknote } from "lucide-react";
import { generateClosingChecklist, updateCPStatus } from "@/lib/api";
import type { ClosingResponse, CPStatus, CPItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<CPStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  satisfied: { label: "Satisfied", color: "#00D4A4", icon: CheckCircle },
  waived:    { label: "Waived",    color: "#7B8FF7", icon: AlertCircle },
  pending:   { label: "Pending",   color: "#FFB300", icon: Clock },
  blocked:   { label: "Blocked",   color: "#FF3B5C", icon: XCircle },
};

const READINESS_TONE = (score: number): string => {
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-danger";
};

interface Props {
  dealId: string;
  /** Existing closing output on the deal. */
  existing?: Partial<ClosingResponse>;
}

export default function ClosingCPTracker({ dealId, existing }: Props) {
  const initial: ClosingResponse | null = existing && existing.cp_checklist
    ? {
        company:                   existing.company ?? "",
        closing_readiness_score:   existing.closing_readiness_score ?? 0,
        closing_readiness_status:  existing.closing_readiness_status ?? "BLOCKED",
        target_closing_date:       existing.target_closing_date ?? "",
        estimated_days_to_close:   existing.estimated_days_to_close ?? 14,
        cp_checklist:              existing.cp_checklist ?? [],
        total_cps:                 existing.total_cps ?? (existing.cp_checklist?.length ?? 0),
        cps_satisfied:             existing.cps_satisfied ?? 0,
        cps_pending:               existing.cps_pending ?? (existing.cp_checklist?.length ?? 0),
        funds_flow:                existing.funds_flow ?? {} as ClosingResponse["funds_flow"],
        outstanding_items:         existing.outstanding_items ?? [],
        closing_checklist_summary: existing.closing_checklist_summary ?? "",
      }
    : null;

  const [data, setData] = useState<ClosingResponse | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "satisfied" | "blocked">("all");

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await generateClosingChecklist(dealId);
      setData(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(idx: number, next: CPStatus) {
    if (!data) return;
    // Optimistic update
    const newChecklist = [...data.cp_checklist];
    newChecklist[idx] = { ...newChecklist[idx], status: next };
    const satisfied = newChecklist.filter((c) => c.status === "satisfied" || c.status === "waived").length;
    const pending   = newChecklist.length - satisfied;
    const readiness = Math.round((satisfied / newChecklist.length) * 100);
    setData({
      ...data,
      cp_checklist:            newChecklist,
      cps_satisfied:           satisfied,
      cps_pending:             pending,
      closing_readiness_score: readiness,
    });
    try {
      await updateCPStatus(dealId, idx, next, "");
    } catch (e) {
      setError(`Failed to update CP status: ${String(e)}`);
    }
  }

  const visibleCps = (data?.cp_checklist ?? []).filter((cp) => {
    if (filter === "all") return true;
    if (filter === "pending") return cp.status === "pending";
    if (filter === "satisfied") return cp.status === "satisfied" || cp.status === "waived";
    if (filter === "blocked") return cp.status === "blocked";
    return true;
  });

  // Group CPs by category for display
  const groupedCps: Record<string, Array<{ cp: CPItem; idx: number }>> = {};
  data?.cp_checklist.forEach((cp, idx) => {
    if (filter !== "all") {
      if (filter === "pending" && cp.status !== "pending") return;
      if (filter === "satisfied" && cp.status !== "satisfied" && cp.status !== "waived") return;
      if (filter === "blocked" && cp.status !== "blocked") return;
    }
    const k = cp.category;
    if (!groupedCps[k]) groupedCps[k] = [];
    groupedCps[k].push({ cp, idx });
  });

  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck size={16} className="text-accent" />
          <div>
            <p className="text-primary text-sm font-semibold">Closing — Conditions Precedent</p>
            <p className="text-muted text-[11px]">
              CP checklist, funds flow, and closing readiness score. Toggle each CP as conditions are satisfied.
            </p>
          </div>
        </div>
        {!data && (
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 bg-accent/10 border border-accent/30 text-accent rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? "Generating…" : "Generate Checklist"}
          </button>
        )}
      </div>

      {error && (
        <div className="px-5 py-3 text-danger text-xs">{error}</div>
      )}

      {!data && !loading && !error && (
        <div className="px-5 py-8 text-center">
          <p className="text-muted text-xs max-w-md mx-auto">
            Click Generate to run the Closing Agent — produces the standard CP checklist
            (legal, diligence, structural, compliance, funds flow), funds flow summary, and a closing-readiness score.
          </p>
        </div>
      )}

      {data && (
        <div className="px-5 py-4 space-y-5">
          {/* Readiness gauge */}
          <div className="grid grid-cols-4 gap-3">
            <KPI
              label="Readiness"
              value={`${data.closing_readiness_score}%`}
              tone={READINESS_TONE(data.closing_readiness_score)}
              size="lg"
              annotation={data.closing_readiness_status?.replace(/_/g, " ").toLowerCase()}
            />
            <KPI label="Total CPs"    value={String(data.total_cps)} />
            <KPI label="Satisfied"    value={String(data.cps_satisfied)} tone="text-success" />
            <KPI label="Outstanding"  value={String(data.cps_pending)}   tone="text-warning" />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            {(["all", "pending", "satisfied", "blocked"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border",
                  filter === f
                    ? "border-accent/40 text-accent bg-accent/10"
                    : "border-white/[0.08] text-muted hover:text-primary hover:border-white/[0.15]"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* CP groups */}
          {Object.keys(groupedCps).length === 0 ? (
            <p className="text-muted text-xs italic text-center py-6">
              No CPs match the current filter.
            </p>
          ) : (
            Object.entries(groupedCps).map(([category, items]) => (
              <div key={category}>
                <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                  {category.replace(/_/g, " ")} ({items.length})
                </p>
                <ul className="space-y-1.5">
                  {items.map(({ cp, idx }) => {
                    const cfg = STATUS_CONFIG[cp.status];
                    const Icon = cfg.icon;
                    return (
                      <li
                        key={idx}
                        className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5 flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-primary text-xs leading-snug">{cp.cp}</p>
                          <p className="text-muted text-[10px] mt-0.5">
                            {cp.timing.replace(/_/g, " ")} · owner: {cp.owner}
                          </p>
                        </div>
                        <select
                          value={cp.status}
                          onChange={(e) => changeStatus(idx, e.target.value as CPStatus)}
                          className={cn(
                            "text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border bg-transparent appearance-none cursor-pointer",
                            "border-white/[0.1] focus:outline-none focus:border-accent"
                          )}
                          style={{ color: cfg.color }}
                        >
                          {(Object.keys(STATUS_CONFIG) as CPStatus[]).map((s) => (
                            <option key={s} value={s} className="bg-navy-900">
                              {STATUS_CONFIG[s].label}
                            </option>
                          ))}
                        </select>
                        <Icon size={14} style={{ color: cfg.color }} className="shrink-0" />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}

          {/* Funds flow */}
          {data.funds_flow && Object.keys(data.funds_flow).length > 0 && (
            <div className="border-t border-white/[0.06] pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Banknote size={12} className="text-accent" />
                <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold">Funds Flow</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {Object.entries(data.funds_flow).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted capitalize">{k.replace(/_/g, " ")}</span>
                    <span className="text-primary font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outstanding items */}
          {data.outstanding_items && data.outstanding_items.length > 0 && (
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                Outstanding Items
              </p>
              <ul className="space-y-1">
                {data.outstanding_items.map((it, i) => (
                  <li key={i} className="text-primary text-xs leading-relaxed flex gap-2">
                    <span className="text-warning shrink-0">›</span>
                    <span>{it}</span>
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

function KPI({
  label, value, tone, size, annotation,
}: {
  label:       string;
  value:       string;
  tone?:       string;
  size?:       "lg";
  annotation?: string;
}) {
  return (
    <div className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
      <p className="text-muted text-[10px] uppercase tracking-wider font-mono mb-1">{label}</p>
      <p className={cn("font-mono", size === "lg" ? "text-base font-semibold" : "text-sm", tone ?? "text-primary")}>
        {value}
      </p>
      {annotation && <p className="text-muted text-[10px] mt-0.5 capitalize">{annotation}</p>}
    </div>
  );
}
