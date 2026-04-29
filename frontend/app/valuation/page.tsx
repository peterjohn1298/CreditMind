"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calculator, TrendingDown, Activity, Sparkles, Loader2, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { useCredit } from "@/context/CreditContext";
import { getPortfolioMarks, runInconsistencyScan, runValuationMark } from "@/lib/api";
import type { PortfolioMarkRow, InconsistencyScanResponse, InconsistencyFinding } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type Tab = "marks" | "inconsistency";

const SEVERITY_TONE: Record<string, string> = {
  HIGH:   "text-danger",
  MEDIUM: "text-warning",
  LOW:    "text-muted",
};

const CATEGORY_LABELS: Record<string, string> = {
  DIVERGENT_YIELDS:      "Divergent yields",
  STALE_COMPARABLES:     "Stale comparables",
  RATING_MARK_MISMATCH:  "Rating-mark mismatch",
  CREDIT_DRIFT_IGNORED:  "Credit drift ignored",
  SECTOR_INCONSISTENCY:  "Sector inconsistency",
};

export default function ValuationPage() {
  const { state } = useCredit();
  const [tab, setTab] = useState<Tab>("marks");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-primary text-xl font-bold">Valuation & Marks</h2>
        <p className="text-muted text-xs mt-1">
          ASC 820 Level 3 quarterly fair-value marks plus portfolio-wide consistency review.
          Required for LP-grade reporting.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        {([
          { id: "marks",         label: "Quarterly Marks",        icon: Calculator },
          { id: "inconsistency", label: "Mark Inconsistency",     icon: TrendingDown },
        ] as { id: Tab; label: string; icon: typeof Calculator }[]).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2",
                active
                  ? "text-accent border-accent"
                  : "text-muted border-transparent hover:text-primary"
              )}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "marks" && <MarksTab portfolio={state.portfolio} />}
      {tab === "inconsistency" && <InconsistencyTab />}
    </div>
  );
}

// ─── Marks tab ───────────────────────────────────────────────────────────────

function MarksTab({ portfolio }: { portfolio: ReturnType<typeof useCredit>["state"]["portfolio"] }) {
  const [marks, setMarks] = useState<PortfolioMarkRow[]>([]);
  const [loadingDeal, setLoadingDeal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPortfolioMarks().then((d) => setMarks(d.marks ?? [])).catch((e) => setError(String(e)));
  }, []);

  const markedIds = new Set(marks.map((m) => m.deal_id));
  const unmarked = portfolio.filter((d) => !markedIds.has(d.deal_id));

  const totalNAV = marks.reduce((s, m) => s + (m.fair_value_usd ?? 0), 0);
  const totalPar = marks.reduce((s, m) => s + (m.loan_amount ?? 0), 0);
  const aggregatePct = totalPar > 0 ? (totalNAV / totalPar) * 100 : null;

  async function markOne(deal_id: string) {
    setLoadingDeal(deal_id);
    setError(null);
    try {
      await runValuationMark(deal_id);
      const refreshed = await getPortfolioMarks();
      setMarks(refreshed.marks ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingDeal(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Loans Marked" value={String(marks.length)} icon={Calculator} />
        <KPI label="Loans Unmarked" value={String(unmarked.length)} tone={unmarked.length > 0 ? "text-warning" : "text-success"} />
        <KPI label="Aggregate NAV" value={formatCurrency(totalNAV)} icon={Activity} />
        <KPI
          label="Mark vs Par"
          value={aggregatePct != null ? `${aggregatePct.toFixed(2)}%` : "—"}
          tone={aggregatePct != null && aggregatePct < 99 ? "text-warning" : aggregatePct != null && aggregatePct < 95 ? "text-danger" : "text-success"}
        />
      </div>

      {error && <p className="text-danger text-xs">Failed: {error}</p>}

      {/* Marks table */}
      {marks.length > 0 && (
        <div className="glass rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <p className="text-primary text-sm font-semibold">Active Quarterly Marks</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] border-b border-white/[0.06]">
              <tr>
                {["Company", "Sector", "Rating", "Par", "Fair Value", "% of Par", "Mark Yield", "Confidence"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-muted text-[10px] font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {marks.map((m, i) => (
                <tr key={m.deal_id} className={cn("border-b border-white/[0.04] last:border-0", i % 2 === 1 && "bg-white/[0.015]")}>
                  <td className="px-4 py-2.5">
                    <Link href={`/deal/${m.deal_id}`} className="text-primary text-xs font-medium hover:text-accent">
                      {m.company}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted text-[11px]">{m.sector}</td>
                  <td className="px-4 py-2.5 text-muted text-[11px] font-mono">{m.rating}</td>
                  <td className="px-4 py-2.5 text-primary text-xs font-mono">{formatCurrency(m.loan_amount)}</td>
                  <td className="px-4 py-2.5 text-primary text-xs font-mono">
                    {m.fair_value_usd != null ? formatCurrency(m.fair_value_usd) : "—"}
                  </td>
                  <td className={cn(
                    "px-4 py-2.5 text-xs font-mono",
                    m.fair_value_pct != null && m.fair_value_pct < 95 ? "text-danger" :
                    m.fair_value_pct != null && m.fair_value_pct < 99 ? "text-warning" :
                    "text-success"
                  )}>
                    {m.fair_value_pct != null ? `${m.fair_value_pct.toFixed(2)}%` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted text-[11px] font-mono">
                    {m.mark_yield_bps != null ? `${(m.mark_yield_bps / 100).toFixed(2)}%` : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "text-[10px] font-mono uppercase tracking-wider",
                      m.confidence === "HIGH"   && "text-success",
                      m.confidence === "MEDIUM" && "text-warning",
                      m.confidence === "LOW"    && "text-danger",
                    )}>
                      {m.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unmarked queue */}
      {unmarked.length > 0 && (
        <div className="glass rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <p className="text-primary text-sm font-semibold">Awaiting Mark ({unmarked.length})</p>
            <p className="text-muted text-[11px] mt-0.5">
              Click "Mark" to run ASC 820 yield-based fair-value calculation. Required for next quarter close.
            </p>
          </div>
          <ul className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto">
            {unmarked.slice(0, 30).map((d) => (
              <li key={d.deal_id} className="px-5 py-2.5 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-primary text-xs font-medium">{d.company}</p>
                  <p className="text-muted text-[10px] mt-0.5">
                    {d.sector} · {d.internal_rating} · {formatCurrency(d.loan_amount)}
                  </p>
                </div>
                <button
                  onClick={() => markOne(d.deal_id)}
                  disabled={loadingDeal === d.deal_id}
                  className="flex items-center gap-1.5 bg-accent/10 border border-accent/30 text-accent rounded-md px-3 py-1 text-[10px] font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
                >
                  {loadingDeal === d.deal_id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  {loadingDeal === d.deal_id ? "Marking…" : "Mark"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {marks.length === 0 && unmarked.length === 0 && (
        <p className="text-muted text-xs italic text-center py-8">No portfolio loans available.</p>
      )}
    </div>
  );
}

// ─── Inconsistency tab ───────────────────────────────────────────────────────

function InconsistencyTab() {
  const [data, setData] = useState<InconsistencyScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await runInconsistencyScan();
      setData(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="glass rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingDown size={16} className="text-accent" />
            <div>
              <p className="text-primary text-sm font-semibold">Mark Inconsistency Detector</p>
              <p className="text-muted text-[11px]">
                Cross-portfolio NLP scan. Identifies divergent yields, stale comparables, rating-mark mismatches,
                ignored credit drift, and within-sector dispersion. Run before each quarter close.
              </p>
            </div>
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-1.5 bg-accent/10 border border-accent/30 text-accent rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? "Scanning…" : data ? "Re-scan" : "Run Scan"}
          </button>
        </div>

        {error && <div className="px-5 py-3 text-danger text-xs">Failed: {error}</div>}

        {!data && !loading && !error && (
          <div className="px-5 py-8 text-center">
            <p className="text-muted text-xs max-w-md mx-auto">
              Click Run Scan to analyse portfolio-wide mark consistency. Requires at least
              a few loans to be marked first (use the Quarterly Marks tab).
            </p>
          </div>
        )}

        {data && (
          <div className="px-5 py-4 space-y-4">
            {/* Summary */}
            {data.summary ? (
              <p className="text-muted text-xs italic">{data.summary}</p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <KPI label="Loans Reviewed"    value={String(data.loans_reviewed)} icon={Calculator} />
                  <KPI
                    label="Consistency Score"
                    value={data.portfolio_consistency_score != null ? `${data.portfolio_consistency_score}/100` : "—"}
                    tone={
                      data.portfolio_consistency_score != null && data.portfolio_consistency_score >= 80 ? "text-success" :
                      data.portfolio_consistency_score != null && data.portfolio_consistency_score >= 60 ? "text-warning" :
                      "text-danger"
                    }
                    size="lg"
                  />
                  <KPI label="High Severity"   value={String(data.by_severity?.HIGH ?? data.findings.filter(f => f.severity === "HIGH").length)}   tone="text-danger" />
                  <KPI label="Medium Severity" value={String(data.by_severity?.MEDIUM ?? data.findings.filter(f => f.severity === "MEDIUM").length)} tone="text-warning" />
                </div>

                {data.review_summary && (
                  <div className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
                    <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-1">
                      Valuation Committee Summary
                    </p>
                    <p className="text-primary text-xs leading-relaxed">{data.review_summary}</p>
                  </div>
                )}
              </>
            )}

            {/* Findings */}
            {data.findings.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold">
                  Findings ({data.findings.length})
                </p>
                {data.findings.map((f, i) => <FindingCard key={i} finding={f} />)}
              </div>
            )}

            {data.ic_action_required && (
              <div className="border-t border-white/[0.06] pt-4">
                <p className="text-warning text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                  IC Action Required
                </p>
                <p className="text-primary text-xs leading-relaxed">{data.ic_action_required}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: InconsistencyFinding }) {
  const tone = SEVERITY_TONE[finding.severity] ?? "text-muted";
  const Icon = finding.severity === "HIGH" ? AlertTriangle : finding.severity === "MEDIUM" ? AlertCircle : CheckCircle;

  return (
    <div className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2">
          <Icon size={11} className={tone} />
          <span className={cn("text-[10px] font-mono uppercase tracking-wider font-semibold", tone)}>
            {finding.severity}
          </span>
          <span className="text-primary text-xs font-semibold">
            {CATEGORY_LABELS[finding.category] ?? finding.category}
          </span>
        </div>
        {finding.quantitative_gap && (
          <span className="text-[10px] font-mono text-muted shrink-0">
            {finding.quantitative_gap}
          </span>
        )}
      </div>
      <p className="text-primary text-[11px] leading-relaxed mb-1.5">{finding.description}</p>
      {finding.deals_involved.length > 0 && (
        <p className="text-muted text-[10px] mb-1.5">
          Deals: {finding.deals_involved.join(" · ")}
        </p>
      )}
      {finding.recommendation && (
        <p className="text-accent text-[10px] leading-relaxed">
          <span className="text-muted uppercase tracking-wider mr-1">Action:</span>
          {finding.recommendation}
        </p>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function KPI({
  label, value, tone, icon: Icon, size,
}: {
  label: string;
  value: string;
  tone?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  size?: "lg";
}) {
  return (
    <div className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5 flex items-start justify-between">
      <div>
        <p className="text-muted text-[10px] uppercase tracking-wider font-mono mb-1">{label}</p>
        <p className={cn("font-mono", size === "lg" ? "text-base font-semibold" : "text-sm", tone ?? "text-primary")}>
          {value}
        </p>
      </div>
      {Icon && <Icon size={14} className="text-muted shrink-0" />}
    </div>
  );
}
