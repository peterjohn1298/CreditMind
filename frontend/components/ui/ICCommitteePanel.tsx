"use client";

import { useState } from "react";
import { Gavel, Sparkles, ChevronDown, ChevronUp, AlertCircle, CheckCircle, XCircle, Loader2, MessageSquare, HelpCircle } from "lucide-react";
import { runICCommittee } from "@/lib/api";
import type { ICCommitteeResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const DECISION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
  APPROVE:             { label: "Approved",            color: "#00D4A4", bg: "bg-success/10", border: "border-success/30", icon: CheckCircle },
  CONDITIONAL_APPROVE: { label: "Conditional Approve", color: "#FFB300", bg: "bg-warning/10", border: "border-warning/30", icon: AlertCircle },
  REJECT:              { label: "Rejected",            color: "#FF3B5C", bg: "bg-danger/10",  border: "border-danger/30",  icon: XCircle },
};

interface Props {
  dealId:      string;
  /** Existing IC output on the deal. */
  existing?:   Partial<ICCommitteeResponse>;
}

export default function ICCommitteePanel({ dealId, existing }: Props) {
  const initial: ICCommitteeResponse | null =
    existing && existing.ic_decision
      ? {
          deal_id:        dealId,
          ic_decision:    existing.ic_decision,
          conditions:     existing.conditions ?? [],
          final_terms:    existing.final_terms ?? {},
          ic_full_output: existing.ic_full_output ?? {},
        }
      : null;

  const [data, setData] = useState<ICCommitteeResponse | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChallenges, setShowChallenges] = useState(true);
  const [showQuestions, setShowQuestions] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await runICCommittee(dealId);
      setData(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const cfg = data ? (DECISION_CONFIG[data.ic_decision] ?? DECISION_CONFIG.CONDITIONAL_APPROVE) : null;

  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gavel size={16} className="text-accent" />
          <div>
            <p className="text-primary text-sm font-semibold">IC Committee Deliberation</p>
            <p className="text-muted text-[11px]">
              Simulated investment-committee challenges, stress-tests, conditions, and open questions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {cfg && (
            <span
              className={cn(
                "text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border",
                cfg.bg, cfg.border
              )}
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
              {loading ? "Running…" : "Run IC"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-5 py-3 text-danger text-xs">
          Could not run IC committee: {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="px-5 py-8 text-center">
          <p className="text-muted text-xs max-w-md mx-auto">
            Click Run IC to convene the simulated committee — challenges every key assumption, stress-tests the base case,
            and produces approval conditions in ~45 seconds.
          </p>
        </div>
      )}

      {data && (
        <div className="px-5 py-4 space-y-5">
          {/* Conditions */}
          {data.conditions.length > 0 && (
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                Approval Conditions ({data.conditions.length})
              </p>
              <ul className="space-y-2">
                {data.conditions.map((cond, i) => {
                  const isObj = typeof cond === "object" && cond !== null;
                  const condText = isObj ? cond.condition ?? "" : cond;
                  const rationale = isObj ? cond.rationale : undefined;
                  return (
                    <li key={i} className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <span className="text-warning text-[10px] font-mono shrink-0 pt-0.5">{(i + 1).toString().padStart(2, "0")}</span>
                        <div className="flex-1">
                          <p className="text-primary text-xs leading-relaxed">{condText}</p>
                          {rationale && (
                            <p className="text-muted text-[10px] leading-relaxed mt-1 italic">{rationale}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Challenges */}
          {Array.isArray(data.ic_full_output?.challenges) && data.ic_full_output.challenges.length > 0 && (
            <div>
              <button
                onClick={() => setShowChallenges((v) => !v)}
                className="w-full flex items-center justify-between mb-2"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={12} className="text-accent" />
                  <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold">
                    Committee Challenges ({data.ic_full_output.challenges.length})
                  </p>
                </div>
                {showChallenges ? <ChevronUp size={11} className="text-muted" /> : <ChevronDown size={11} className="text-muted" />}
              </button>
              {showChallenges && (
                <div className="space-y-3">
                  {data.ic_full_output.challenges.map((c, i) => (
                    <div key={i} className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
                      <p className="text-success text-xs font-semibold mb-1">{c.topic}</p>
                      <p className="text-primary text-[11px] leading-relaxed mb-1.5">
                        <span className="text-muted">Q: </span>
                        {c.challenge}
                      </p>
                      {c.resolution && (
                        <p className="text-primary text-[11px] leading-relaxed">
                          <span className="text-muted">A: </span>
                          {c.resolution}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Open Questions */}
          {Array.isArray(data.ic_full_output?.open_questions) && data.ic_full_output.open_questions.length > 0 && (
            <div>
              <button
                onClick={() => setShowQuestions((v) => !v)}
                className="w-full flex items-center justify-between mb-2"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle size={12} className="text-warning" />
                  <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold">
                    Open Questions ({data.ic_full_output.open_questions.length})
                  </p>
                </div>
                {showQuestions ? <ChevronUp size={11} className="text-muted" /> : <ChevronDown size={11} className="text-muted" />}
              </button>
              {showQuestions && (
                <ul className="space-y-1.5">
                  {data.ic_full_output.open_questions.map((q, i) => (
                    <li key={i} className="text-primary text-xs leading-relaxed flex gap-2">
                      <span className="text-warning shrink-0">›</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Deliberation summary */}
          {typeof data.ic_full_output?.deliberation === "string" && data.ic_full_output.deliberation && (
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                Deliberation Summary
              </p>
              <p className="text-primary text-xs leading-relaxed">{data.ic_full_output.deliberation}</p>
            </div>
          )}

          {/* Final terms */}
          {data.final_terms && Object.keys(data.final_terms).length > 0 && (
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                Final Approved Terms
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {Object.entries(data.final_terms).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted capitalize">{k.replace(/_/g, " ")}</span>
                    <span className="text-primary font-mono">{String(v ?? "—")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
