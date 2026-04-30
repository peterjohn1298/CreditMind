"use client";

import { useState } from "react";
import { Leaf, Sparkles, CheckCircle, AlertCircle, XCircle, Loader2, Globe2, Users, Building2 } from "lucide-react";
import { runESGScreen } from "@/lib/api";
import type { ESGScreen } from "@/lib/types";
import { cn } from "@/lib/utils";

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
  PROCEED:                 { label: "Proceed",            color: "#00D4A4", bg: "bg-success/10", border: "border-success/30", icon: CheckCircle },
  PROCEED_WITH_CONDITIONS: { label: "Proceed w/Conditions", color: "#FFB300", bg: "bg-warning/10", border: "border-warning/30", icon: AlertCircle },
  EDD_REQUIRED:            { label: "EDD Required",       color: "#FF8C00", bg: "bg-warning/10", border: "border-warning/30", icon: AlertCircle },
  REJECT:                  { label: "Reject",             color: "#FF3B5C", bg: "bg-danger/10",  border: "border-danger/30",  icon: XCircle },
};

interface Props {
  dealId:    string;
  existing?: Partial<ESGScreen>;
}

export default function ESGPanel({ dealId, existing }: Props) {
  const initial: ESGScreen | null = existing && existing.overall_verdict
    ? {
        environmental:        existing.environmental ?? { score: 50, carbon_intensity: "MEDIUM", transition_risk: "MEDIUM", physical_risk: "LOW", key_findings: [] },
        social:               existing.social        ?? { score: 50, labor_practices: "ADEQUATE", customer_safety: "NA", supply_chain: "NA", key_findings: [] },
        governance:           existing.governance    ?? { score: 50, board_independence: "ADEQUATE", audit_quality: "CLEAN", related_party_risk: "NONE", key_findings: [] },
        hard_exclusion_check: existing.hard_exclusion_check ?? {
          tobacco: false, controversial_weapons: false, thermal_coal: false,
          predatory_lending: false, adult_entertainment: false, gambling_over_25pct: false,
          any_hard_exclusion: false,
        },
        overall_score:            existing.overall_score ?? 50,
        overall_verdict:          existing.overall_verdict,
        ic_memo_required_section: existing.ic_memo_required_section ?? "",
        lp_disclosure_items:      existing.lp_disclosure_items ?? [],
        esg_summary:              existing.esg_summary ?? "",
      }
    : null;

  const [data, setData] = useState<ESGScreen | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await runESGScreen(dealId);
      setData(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const cfg = data ? (VERDICT_CONFIG[data.overall_verdict] ?? VERDICT_CONFIG.PROCEED_WITH_CONDITIONS) : null;

  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Leaf size={16} className="text-accent" />
          <div>
            <p className="text-primary text-sm font-semibold">ESG Screen</p>
            <p className="text-muted text-[11px]">
              Environmental + Social + Governance scoring. UN PRI signatory · mandatory for &gt;$75M loans.
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
              {loading ? "Screening…" : "Run ESG Screen"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-5 py-3 text-danger text-xs">Could not run ESG screen: {error}</div>
      )}

      {!data && !loading && !error && (
        <div className="px-5 py-8 text-center">
          <p className="text-muted text-xs max-w-md mx-auto">
            Click Run ESG Screen to score Environmental / Social / Governance against the fund's
            ESG policy. Hard-exclusion check covers tobacco, controversial weapons, thermal coal,
            predatory lending, adult entertainment, and gambling-heavy revenue.
          </p>
        </div>
      )}

      {data && (
        <div className="px-5 py-4 space-y-5">
          {/* Summary */}
          {data.esg_summary && (
            <div className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-1">
                ESG Officer Summary · Overall Score {data.overall_score}/100
              </p>
              <p className="text-primary text-xs leading-relaxed">{data.esg_summary}</p>
            </div>
          )}

          {/* Hard exclusion warning */}
          {data.hard_exclusion_check.any_hard_exclusion && (
            <div className="rounded-md bg-danger/10 border border-danger/30 px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <XCircle size={12} className="text-danger" />
                <p className="text-danger text-xs font-semibold uppercase tracking-wider">Hard Exclusion Triggered</p>
              </div>
              <p className="text-primary text-xs leading-relaxed">
                {data.hard_exclusion_check.exclusion_rationale ||
                  "This deal violates a hard ESG exclusion. Cannot proceed without unanimous IC waiver."}
              </p>
            </div>
          )}

          {/* E / S / G score cards */}
          <div className="grid grid-cols-3 gap-3">
            <ScoreCard
              icon={Globe2}
              label="Environmental"
              score={data.environmental.score}
              rows={[
                ["Carbon",      data.environmental.carbon_intensity],
                ["Transition",  data.environmental.transition_risk],
                ["Physical",    data.environmental.physical_risk],
              ]}
              findings={data.environmental.key_findings}
            />
            <ScoreCard
              icon={Users}
              label="Social"
              score={data.social.score}
              rows={[
                ["Labor",          data.social.labor_practices],
                ["Customer/Patient", data.social.customer_safety],
                ["Supply Chain",   data.social.supply_chain],
              ]}
              findings={data.social.key_findings}
            />
            <ScoreCard
              icon={Building2}
              label="Governance"
              score={data.governance.score}
              rows={[
                ["Board Indep.",   data.governance.board_independence],
                ["Audit",          data.governance.audit_quality.replace(/_/g, " ")],
                ["Related Party",  data.governance.related_party_risk.replace(/_/g, " ")],
              ]}
              findings={data.governance.key_findings}
            />
          </div>

          {/* IC memo required section */}
          {data.ic_memo_required_section && (
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                ESG Section for IC Memo
              </p>
              <p className="text-primary text-xs leading-relaxed whitespace-pre-wrap">
                {data.ic_memo_required_section}
              </p>
            </div>
          )}

          {/* LP disclosure */}
          {data.lp_disclosure_items.length > 0 && (
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                LP Disclosure Items (Annual ESG Report)
              </p>
              <ul className="space-y-0.5">
                {data.lp_disclosure_items.map((it, i) => (
                  <li key={i} className="text-primary text-xs leading-relaxed flex gap-2">
                    <span className="text-accent shrink-0">›</span>
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

function ScoreCard({
  icon: Icon, label, score, rows, findings,
}: {
  icon:     React.ComponentType<{ size?: number; className?: string }>;
  label:    string;
  score:    number;
  rows:     Array<[string, string]>;
  findings: string[];
}) {
  // Score: lower is better. <30 success, 30-60 warning, >60 danger.
  const scoreTone =
    score <= 30 ? "text-success" :
    score <= 60 ? "text-warning" :
    "text-danger";
  return (
    <div className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={12} className="text-accent" />
          <p className="text-primary text-xs font-semibold">{label}</p>
        </div>
        <p className={cn("text-base font-mono font-semibold", scoreTone)}>{score}</p>
      </div>
      <div className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between text-[10px]">
            <span className="text-muted uppercase tracking-wider">{k}</span>
            <span className="text-primary font-mono">{v}</span>
          </div>
        ))}
      </div>
      {findings.length > 0 && (
        <ul className="space-y-0.5 mt-1">
          {findings.slice(0, 3).map((f, i) => (
            <li key={i} className="text-muted text-[10px] leading-snug flex gap-1.5">
              <span className="text-accent shrink-0">›</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
