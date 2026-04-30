"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import AlternativeDataPanel from "@/components/ui/AlternativeDataPanel";
import RatingBadge from "@/components/ui/RatingBadge";
import RiskGauge from "@/components/ui/RiskGauge";
import AddBackForensicsPanel from "@/components/ui/AddBackForensicsPanel";
import TermSheetViewer from "@/components/ui/TermSheetViewer";
import ICCommitteePanel from "@/components/ui/ICCommitteePanel";
import ClosingCPTracker from "@/components/ui/ClosingCPTracker";
import { useCredit } from "@/context/CreditContext";
import { formatCurrency, formatDate, getRiskColor, getSeverityColor, cn } from "@/lib/utils";
import type { Deal } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-lg p-5 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-white/[0.04] last:border-0">
      <span className="text-muted text-xs">{label}</span>
      <span className={cn("text-primary text-xs", mono && "font-mono")}>{value ?? "—"}</span>
    </div>
  );
}

// ─── Rating History Timeline ──────────────────────────────────────────────────

type RatingEvent = {
  event_type: "INITIAL" | "NEGATIVE_WATCH" | "DOWNGRADE" | "UPGRADE_ELIGIBLE";
  from_rating: string | null;
  to_rating: string;
  proposed_rating?: string;
  date: string;
  risk_score_at_event: number;
  score_delta_from_baseline: number;
  warning_level: string;
  rationale: string;
  agent: string;
  action_required: string | null;
};

const EVENT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  INITIAL:        { label: "INITIAL RATING",    color: "#7B8FF7", bg: "bg-[#7B8FF7]/5",  border: "border-[#7B8FF7]/25", dot: "#7B8FF7" },
  NEGATIVE_WATCH: { label: "NEGATIVE WATCH",    color: "#FFB300", bg: "bg-warning/5",    border: "border-warning/25",   dot: "#FFB300" },
  DOWNGRADE:      { label: "DOWNGRADE",          color: "#FF3B5C", bg: "bg-danger/5",     border: "border-danger/25",    dot: "#FF3B5C" },
  UPGRADE_ELIGIBLE:{ label: "UPGRADE ELIGIBLE", color: "#00D4A4", bg: "bg-success/5",    border: "border-success/25",   dot: "#00D4A4" },
};

function RatingHistory({ history }: { history: RatingEvent[] }) {
  if (!history || history.length === 0) return null;
  const sorted = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="glass rounded-lg p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">Rating History — Agent Decision Trail</p>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/[0.08]" />
        <div className="space-y-4">
          {sorted.map((event, i) => {
            const cfg = EVENT_CONFIG[event.event_type] ?? EVENT_CONFIG.INITIAL;
            const dateStr = new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const isChange = event.event_type === "DOWNGRADE" || event.event_type === "UPGRADE_ELIGIBLE";
            return (
              <div key={i} className="flex gap-4 relative">
                {/* Dot */}
                <div className="mt-1 w-3.5 h-3.5 rounded-full border-2 shrink-0 z-10"
                  style={{ borderColor: cfg.dot, background: i === 0 ? cfg.dot : "transparent" }} />
                {/* Card */}
                <div className={cn("flex-1 rounded-lg border p-3", cfg.bg, cfg.border)}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                      {event.from_rating ? (
                        <span className="font-mono text-[10px] text-primary">
                          {event.from_rating}
                          {isChange && (
                            <span style={{ color: cfg.color }}> → {event.event_type === "UPGRADE_ELIGIBLE" ? event.proposed_rating : event.to_rating}</span>
                          )}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-primary">{event.to_rating}</span>
                      )}
                      {event.event_type === "UPGRADE_ELIGIBLE" && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-success/10 text-success border border-success/20 rounded">PROPOSED — PENDING IC</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-muted text-[10px]">{dateStr}</p>
                      <p className="font-mono text-[10px]" style={{ color: event.score_delta_from_baseline > 0 ? "#FF3B5C" : event.score_delta_from_baseline < 0 ? "#00D4A4" : "#64748b" }}>
                        Score: {event.risk_score_at_event}/100
                        {event.score_delta_from_baseline !== 0 && (
                          <span> ({event.score_delta_from_baseline > 0 ? "+" : ""}{event.score_delta_from_baseline})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="text-muted text-[10px] leading-relaxed">{event.rationale}</p>
                  {event.action_required && (
                    <p className="text-[10px] mt-1.5 font-medium" style={{ color: cfg.color }}>
                      → {event.action_required}
                    </p>
                  )}
                  <p className="text-muted/50 text-[9px] mt-1">Agent: {event.agent}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Rating upgrade / downgrade ladder ────────────────────────────────────────

const RATING_LADDER = ["AAA","AA+","AA","AA-","A+","A","A-","BBB+","BBB","BBB-","BB+","BB","BB-","B+","B","B-","CCC+","CCC","CCC-","CC","C","D"];

function ratingIndex(r: string) { return RATING_LADDER.indexOf(r); }

function RatingTriggers({ deal }: { deal: Deal }) {
  const rating = deal.internal_rating ?? "BB-";
  const idx = ratingIndex(rating);
  if (idx < 0) return null;

  const upgradeRating  = idx > 0  ? RATING_LADDER[idx - 1] : null;
  const downgradeRating = idx < RATING_LADDER.length - 1 ? RATING_LADDER[idx + 1] : null;

  const liveScore   = (deal as any).live_risk_score ?? deal.risk_score;
  const origScore   = deal.risk_score;
  const scoreDelta  = liveScore - origScore;
  const leverage    = deal.leverage;

  // Derive qualitative triggers from deal data
  const upgradeTriggers: string[] = [];
  const downgradeTriggers: string[] = [];

  if (leverage != null) {
    if (leverage > 5.0) downgradeTriggers.push(`Leverage ${leverage.toFixed(1)}x — reduce below 5.0x to reduce downgrade pressure`);
    else if (leverage < 4.0) upgradeTriggers.push(`Leverage ${leverage.toFixed(1)}x — sustain below 4.0x for upgrade consideration`);
    else upgradeTriggers.push(`Reduce leverage from ${leverage.toFixed(1)}x to below 4.0x`);
  }

  if (deal.financial_health === "Stable" || deal.financial_health === "Strong") {
    upgradeTriggers.push("Financial health confirmed stable — two consecutive covenant-compliant quarters support upgrade path");
  }

  const covenants = deal.covenants ?? {};
  const breaches = Object.values(covenants).filter((v: any) => typeof v === "object" && v.compliant === false).length;
  if (breaches > 0) {
    downgradeTriggers.push(`${breaches} covenant breach${breaches > 1 ? "es" : ""} detected — immediate cure required to prevent downgrade`);
  } else {
    upgradeTriggers.push("Covenant headroom maintained — no breaches across monitoring period");
  }

  if (scoreDelta >= 10) downgradeTriggers.push(`Live risk score +${scoreDelta} pts above baseline — sustained deterioration triggers rating review`);
  if (scoreDelta <= -5) upgradeTriggers.push(`Risk score improved ${Math.abs(scoreDelta)} pts from baseline — positive momentum`);

  const warnings = (deal as any).early_warning_flags ?? [];
  const criticalWarnings = warnings.filter((w: any) => w.severity === "CRITICAL" || w.severity === "HIGH").length;
  if (criticalWarnings > 0) downgradeTriggers.push(`${criticalWarnings} high/critical early warning flag${criticalWarnings > 1 ? "s" : ""} — requires resolution before upgrade eligible`);

  if (upgradeTriggers.length === 0) upgradeTriggers.push("Sustained covenant compliance for 2 quarters", "Risk score reduction to below 45/100");
  if (downgradeTriggers.length === 0) downgradeTriggers.push("Covenant breach on leverage or ICR", "Risk score above 70/100 for 2 consecutive cycles");

  return (
    <div className="glass rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Rating Migration Triggers</p>
        <span className="text-[10px] font-mono px-2 py-0.5 bg-accent/10 border border-accent/30 text-accent rounded">
          Current: {rating}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {upgradeRating && (
          <div className="rounded-lg border border-success/20 bg-success/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={13} className="text-success" />
              <p className="text-success text-xs font-semibold uppercase tracking-wider">Upgrade to {upgradeRating}</p>
            </div>
            <ul className="space-y-2">
              {upgradeTriggers.slice(0, 3).map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-success text-[10px] mt-0.5 shrink-0">↑</span>
                  <p className="text-muted text-[10px] leading-relaxed">{t}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {downgradeRating && (
          <div className="rounded-lg border border-danger/20 bg-danger/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={13} className="text-danger" />
              <p className="text-danger text-xs font-semibold uppercase tracking-wider">Downgrade to {downgradeRating}</p>
            </div>
            <ul className="space-y-2">
              {downgradeTriggers.slice(0, 3).map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-danger text-[10px] mt-0.5 shrink-0">↓</span>
                  <p className="text-muted text-[10px] leading-relaxed">{t}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state } = useCredit();
  const [deal, setDeal] = useState<Deal | null>(null);

  useEffect(() => {
    const found = state.portfolio.find((d) => d.deal_id === id);
    if (found) {
      setDeal(found);
      return;
    }
    // Fallback: fetch directly from API
    const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${BASE}/api/deals/${encodeURIComponent(id)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setDeal(data))
      .catch(() => {});
  }, [id, state.portfolio]);

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted font-mono text-sm">Loading deal…</p>
      </div>
    );
  }

  const riskColor = getRiskColor(deal.risk_score);
  const sectorColor = getRiskColor(deal.sector_stress_score);
  const alerts = deal.human_alerts ?? [];
  const warnings = deal.early_warning_flags ?? [];
  const news = deal.news_signals ?? [];

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="text-muted hover:text-primary transition-colors flex items-center gap-1 text-xs">
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-primary text-xl font-bold">{deal.company}</h2>
          <p className="text-muted text-sm mt-0.5">{deal.sector} · {deal.sponsor}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <RiskGauge score={deal.risk_score} size="lg" />
            <p className="text-muted text-[10px] uppercase tracking-wider mt-1">Risk Score</p>
          </div>
          <RatingBadge rating={deal.internal_rating} />
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-semibold border capitalize",
            deal.status === "current"   && "bg-success/10 text-success border-success/30",
            deal.status === "watchlist" && "bg-warning/10 text-warning border-warning/30",
            deal.status === "stressed"  && "bg-danger/10 text-danger border-danger/30",
          )}>
            {deal.status}
          </span>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass rounded-lg p-4">
          <p className="text-muted text-[10px] uppercase tracking-wider">Loan Amount</p>
          <p className="font-mono text-2xl font-bold mt-1 text-primary">{formatCurrency(deal.loan_amount)}</p>
        </div>
        <div className="glass rounded-lg p-4">
          <p className="text-muted text-[10px] uppercase tracking-wider">Loan Tenor</p>
          <p className="font-mono text-2xl font-bold mt-1 text-primary">{deal.loan_tenor ? `${deal.loan_tenor}y` : "—"}</p>
        </div>
        <div className="glass rounded-lg p-4">
          <p className="text-muted text-[10px] uppercase tracking-wider">Risk Score</p>
          <p className="font-mono text-2xl font-bold mt-1" style={{ color: riskColor }}>{deal.risk_score}</p>
        </div>
        <div className="glass rounded-lg p-4">
          <p className="text-muted text-[10px] uppercase tracking-wider">Sector Stress</p>
          <p className="font-mono text-2xl font-bold mt-1" style={{ color: sectorColor }}>{deal.sector_stress_score}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Loan details */}
        <Section title="Loan Details">
          <Row label="Deal ID"          value={deal.deal_id} />
          <Row label="Loan Type"        value={deal.loan_type} />
          <Row label="Disbursement"     value={deal.disbursement_date ? formatDate(deal.disbursement_date) : "—"} />
          <Row label="Maturity"         value={deal.maturity_date ? formatDate(deal.maturity_date) : "—"} />
          <Row label="EBITDA"           value={deal.ebitda ? formatCurrency(deal.ebitda) : "—"} />
          <Row label="Leverage"         value={deal.leverage ? `${deal.leverage.toFixed(1)}x` : "—"} />
          <Row label="Financial Health" value={deal.financial_health} mono={false} />
        </Section>

        {/* Covenants */}
        <Section title="Covenant Status">
          {deal.covenants && Object.keys(deal.covenants).length > 0 ? (
            Object.entries(deal.covenants).map(([name, val]: [string, any]) => (
              <div key={name} className="bg-navy-900 rounded-md p-3">
                <p className="text-primary text-xs font-medium capitalize">{name.replace(/_/g, " ")}</p>
                <div className="flex justify-between mt-1 text-[10px] font-mono">
                  {typeof val === "object" ? (
                    <>
                      <span className="text-muted">Threshold: {val.threshold ?? "—"}</span>
                      <span className={cn("font-bold", val.compliant ? "text-success" : "text-danger")}>
                        {val.current ?? "—"} {val.compliant ? "✓" : "⚠"}
                      </span>
                    </>
                  ) : (
                    <span className="text-primary">{String(val)}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted text-xs font-mono">No covenant data yet</p>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Active alerts */}
        <Section title={`Active Alerts (${alerts.filter(a => !a.resolved).length})`}>
          {alerts.filter(a => !a.resolved).length === 0 ? (
            <p className="text-muted text-xs font-mono">No active alerts</p>
          ) : (
            alerts.filter(a => !a.resolved).map((alert, i) => (
              <div key={alert.alert_id ?? i} className="rounded-md p-3 border"
                style={{ borderColor: getSeverityColor(alert.severity) + "40", background: getSeverityColor(alert.severity) + "10" }}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={12} style={{ color: getSeverityColor(alert.severity) }} />
                  <span className="text-[10px] font-semibold uppercase" style={{ color: getSeverityColor(alert.severity) }}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-primary text-xs">{alert.trigger ?? alert.message}</p>
                {alert.action_required && (
                  <p className="text-muted text-[10px] mt-1 italic">{alert.action_required}</p>
                )}
              </div>
            ))
          )}
        </Section>

        {/* Early warning flags */}
        <Section title={`Early Warning Flags (${warnings.length})`}>
          {warnings.length === 0 ? (
            <p className="text-muted text-xs font-mono">No warning flags</p>
          ) : (
            warnings.map((flag, i) => (
              <div key={i} className="rounded-md p-3 border"
                style={{ borderColor: getSeverityColor(flag.severity) + "40", background: getSeverityColor(flag.severity) + "10" }}>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown size={12} style={{ color: getSeverityColor(flag.severity) }} />
                  <span className="text-[10px] font-semibold uppercase" style={{ color: getSeverityColor(flag.severity) }}>
                    {flag.flag_type ?? flag.warning_type ?? flag.severity}
                  </span>
                </div>
                <p className="text-primary text-xs">{flag.description}</p>
              </div>
            ))
          )}
        </Section>
      </div>

      {/* News signals */}
      {news.length > 0 && (
        <Section title="Recent News Signals">
          <div className="space-y-2">
            {news.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
                <span className={cn(
                  "mt-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0",
                  item.sentiment === "negative" && "bg-danger/20 text-danger",
                  item.sentiment === "positive" && "bg-success/20 text-success",
                  item.sentiment === "neutral"  && "bg-muted/20 text-muted",
                )}>
                  {item.sentiment}
                </span>
                <p className="text-primary text-xs leading-relaxed">{item.headline}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Rating history — agent decision trail */}
      {(deal as any).rating_history?.length > 0 && (
        <RatingHistory history={(deal as any).rating_history} />
      )}

      {/* Rating upgrade / downgrade triggers */}
      <RatingTriggers deal={deal} />

      {/* Alternative Data Intelligence — sector-aware */}
      <AlternativeDataPanel
        sector={deal.sector ?? ""}
        company={deal.company}
        jobSignals={deal.job_signals}
        consumerSignals={deal.consumer_signals}
      />

      {/* EBITDA add-back forensics */}
      {(deal as any).ebitda_analysis && (
        <AddBackForensicsPanel analysis={(deal as any).ebitda_analysis} />
      )}

      {/* IC Committee deliberation */}
      <ICCommitteePanel
        dealId={deal.deal_id}
        existing={{
          ic_decision:    (deal as any).ic_decision,
          conditions:     (deal as any).approval_conditions,
          final_terms:    (deal as any).final_terms,
          ic_full_output: (deal as any).ic_committee_output,
        }}
      />

      {/* Term Sheet & Negotiation Guide */}
      <TermSheetViewer
        dealId={deal.deal_id}
        existing={{
          term_sheet:        (deal as any).term_sheet,
          red_lines:         (deal as any).red_lines,
          concession_map:    (deal as any).concession_map,
          borrower_pushback: (deal as any).borrower_pushback,
        }}
      />

      {/* Closing CP Tracker */}
      <ClosingCPTracker
        dealId={deal.deal_id}
        existing={(deal as any).closing_output ?? {
          cp_checklist:            (deal as any).cp_checklist,
          closing_readiness_score: (deal as any).closing_readiness,
          funds_flow:              (deal as any).funds_flow,
        }}
      />
    </div>
  );
}
