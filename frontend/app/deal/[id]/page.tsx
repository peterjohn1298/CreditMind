"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, TrendingDown, Users, Star } from "lucide-react";
import RatingBadge from "@/components/ui/RatingBadge";
import RiskGauge from "@/components/ui/RiskGauge";
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

      {/* Alternative data */}
      {(deal.job_signals || deal.consumer_signals) && (
        <div className="grid grid-cols-2 gap-5">
          {deal.job_signals && (
            <Section title="Job Market Signals">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-accent" />
                <span className="font-semibold text-sm" style={{
                  color: deal.job_signals.hiring_signal === "SURGE" || deal.job_signals.hiring_signal === "GROWTH" ? "#00D4A4"
                       : deal.job_signals.hiring_signal === "DISTRESS" ? "#FF3B5C" : "#FFB300"
                }}>
                  {deal.job_signals.hiring_signal}
                </span>
              </div>
              <p className="text-muted text-xs">{deal.job_signals.signal_rationale}</p>
              <Row label="Open Positions" value={String(deal.job_signals.open_positions ?? "—")} />
              {deal.job_signals.distress_keywords?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {deal.job_signals.distress_keywords.slice(0, 4).map((kw: string) => (
                    <span key={kw} className="text-[10px] px-2 py-0.5 bg-danger/10 text-danger border border-danger/20 rounded-full">{kw}</span>
                  ))}
                </div>
              )}
            </Section>
          )}

          {deal.consumer_signals && (
            <Section title="Consumer Signals (Yelp)">
              <div className="flex items-center gap-2 mb-2">
                <Star size={14} className="text-warning" />
                <span className="font-semibold text-sm" style={{
                  color: deal.consumer_signals.consumer_signal === "STRONG" ? "#00D4A4"
                       : deal.consumer_signals.consumer_signal === "DISTRESS" ? "#FF3B5C" : "#FFB300"
                }}>
                  {deal.consumer_signals.consumer_signal}
                </span>
              </div>
              <Row label="Rating"       value={deal.consumer_signals.rating ? `${deal.consumer_signals.rating} / 5` : "—"} />
              <Row label="Reviews"      value={String(deal.consumer_signals.review_count ?? "—")} />
              <Row label="Sentiment"    value={deal.consumer_signals.review_sentiment} mono={false} />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
