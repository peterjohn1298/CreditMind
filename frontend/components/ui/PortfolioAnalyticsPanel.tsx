"use client";

import { useEffect, useState } from "react";
import { BarChart3, GitCompareArrows, Users, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { getVintageCohorts, getPortfolioCorrelation, getSponsorBehavior } from "@/lib/api";
import type { VintageCohortsResponse, CorrelationResponse, SponsorBehaviorResponse } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type Tab = "vintage" | "correlation" | "sponsor";

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "vintage",     label: "Vintage Cohorts",          icon: BarChart3 },
  { id: "correlation", label: "Cross-Portfolio Correlation", icon: GitCompareArrows },
  { id: "sponsor",     label: "Sponsor Behavior",         icon: Users },
];

export default function PortfolioAnalyticsPanel() {
  const [tab, setTab] = useState<Tab>("vintage");

  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-1">
        <BarChart3 size={16} className="text-accent mr-2" />
        <p className="text-primary text-sm font-semibold mr-4">Portfolio Analytics</p>
        <div className="flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono px-2.5 py-1.5 rounded-full border transition-colors",
                  active
                    ? "border-accent/40 text-accent bg-accent/10"
                    : "border-white/[0.08] text-muted hover:text-primary hover:border-white/[0.15]"
                )}
              >
                <Icon size={11} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5">
        {tab === "vintage"     && <VintagePanel />}
        {tab === "correlation" && <CorrelationPanel />}
        {tab === "sponsor"     && <SponsorPanel />}
      </div>
    </div>
  );
}

// ─── Vintage Cohorts ─────────────────────────────────────────────────────────

function VintagePanel() {
  const [data, setData] = useState<VintageCohortsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVintageCohorts().then(setData).catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="text-danger text-xs">Failed: {error}</p>;
  if (!data)  return <Loading />;
  if (data.vintages.length === 0) return <p className="text-muted text-xs italic">No vintage data.</p>;

  const maxExposure = Math.max(...data.vintages.map((v) => v.total_exposure_usd));

  return (
    <div className="space-y-4">
      <p className="text-muted text-xs">{data.summary}</p>
      <div className="space-y-2.5">
        {data.vintages.map((v) => {
          const driftTone = v.risk_drift > 5 ? "text-danger" : v.risk_drift > 0 ? "text-warning" : "text-success";
          return (
            <div key={v.vintage} className="rounded-md bg-white/[0.02] border border-white/[0.06] p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <p className="text-primary text-sm font-semibold font-mono">{v.vintage}</p>
                  <span className="text-muted text-[11px]">{v.deal_count} deals</span>
                  {v.problem_rate_pct > 0 && (
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-warning/30 text-warning">
                      {v.problem_rate_pct}% problem
                    </span>
                  )}
                </div>
                <span className="text-primary text-xs font-mono">{formatCurrency(v.total_exposure_usd)}</span>
              </div>
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-accent/60"
                  style={{ width: `${(v.total_exposure_usd / maxExposure) * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
                <span className="text-muted">
                  Origination risk:{" "}
                  <span className="text-primary font-mono">{v.avg_origination_risk_score}</span>
                </span>
                <span className="text-muted">
                  Live risk:{" "}
                  <span className="text-primary font-mono">{v.avg_live_risk_score}</span>
                </span>
                <span className={cn("font-mono", driftTone)}>
                  Drift: {v.risk_drift > 0 ? "+" : ""}{v.risk_drift}
                  {v.risk_drift > 0 ? <TrendingUp size={10} className="inline ml-1" /> : v.risk_drift < 0 ? <TrendingDown size={10} className="inline ml-1" /> : null}
                </span>
                <span className="text-muted">
                  Watchlist <span className="text-warning font-mono">{v.watchlist_count}</span>
                </span>
                <span className="text-muted">
                  Stressed <span className="text-danger font-mono">{v.stressed_count}</span>
                </span>
              </div>
              {v.top_sectors.length > 0 && (
                <p className="text-muted text-[10px] mt-1.5">
                  Top sectors:{" "}
                  {v.top_sectors.map((s) => `${s.sector} (${s.count})`).join(" · ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Cross-Portfolio Correlation ─────────────────────────────────────────────

function CorrelationPanel() {
  const [data, setData] = useState<CorrelationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getPortfolioCorrelation().then(setData).catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="text-danger text-xs">Failed: {error}</p>;
  if (!data)  return <Loading />;
  if (data.correlations.length === 0) return <p className="text-muted text-xs italic">No correlations.</p>;

  // Show top 8 by correlated exposure
  const top = data.correlations.slice(0, 8);

  return (
    <div className="space-y-4">
      <p className="text-muted text-xs">{data.summary}</p>
      <div className="space-y-2">
        {top.map((row) => {
          const isOpen = expanded === row.focus_deal_id;
          return (
            <div key={row.focus_deal_id} className="rounded-md bg-white/[0.02] border border-white/[0.06]">
              <button
                onClick={() => setExpanded(isOpen ? null : row.focus_deal_id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-primary text-xs font-semibold">{row.focus_company}</p>
                    {row.focus_sector && (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-white/[0.1] text-muted">
                        {row.focus_sector}
                      </span>
                    )}
                  </div>
                  <p className="text-muted text-[11px] mt-0.5">
                    {row.peers.length} correlated peers · {formatCurrency(row.total_correlated_exposure_usd)} correlated exposure
                  </p>
                </div>
                <span className="text-muted text-[10px] font-mono">{isOpen ? "▾" : "▸"}</span>
              </button>
              {isOpen && (
                <div className="border-t border-white/[0.06] px-3 py-2.5">
                  <ul className="space-y-1.5">
                    {row.peers.map((p) => (
                      <li key={p.peer_deal_id} className="flex items-start gap-2 text-[11px]">
                        <span className="text-accent font-mono w-12 shrink-0">{p.overlap_score.toFixed(2)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-primary">
                            {p.peer_company}
                            {p.peer_status && (
                              <span className={cn(
                                "ml-2 text-[9px] uppercase font-mono px-1 py-0.5 rounded-full border",
                                p.peer_status === "stressed"  && "border-danger/30 text-danger",
                                p.peer_status === "watchlist" && "border-warning/30 text-warning",
                                p.peer_status === "current"   && "border-success/30 text-success",
                              )}>
                                {p.peer_status}
                              </span>
                            )}
                          </p>
                          <p className="text-muted text-[10px]">{p.reasons.join(" · ")}</p>
                        </div>
                        <span className="text-muted font-mono shrink-0">
                          {p.peer_loan_amount ? formatCurrency(p.peer_loan_amount) : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sponsor Behavior ────────────────────────────────────────────────────────

function SponsorPanel() {
  const [data, setData] = useState<SponsorBehaviorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSponsorBehavior().then(setData).catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="text-danger text-xs">Failed: {error}</p>;
  if (!data)  return <Loading />;
  if (data.sponsors.length === 0) return <p className="text-muted text-xs italic">No sponsored deals.</p>;

  return (
    <div className="space-y-4">
      <p className="text-muted text-xs">{data.summary}</p>
      <div className="overflow-hidden rounded-md border border-white/[0.06]">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02] border-b border-white/[0.06]">
            <tr>
              {["Sponsor", "Deals", "Exposure", "Current", "Watch", "Stressed", "Problem %", "Treatment Score", "Risk Drift"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-muted text-[10px] font-semibold uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.sponsors.map((s, i) => {
              const tsTone =
                s.lender_treatment_score >= 90 ? "text-success" :
                s.lender_treatment_score >= 75 ? "text-primary" :
                s.lender_treatment_score >= 60 ? "text-warning" :
                "text-danger";
              const driftTone =
                s.risk_drift > 5 ? "text-danger" : s.risk_drift > 0 ? "text-warning" : "text-success";
              return (
                <tr key={s.sponsor} className={cn(
                  "border-b border-white/[0.04] last:border-0",
                  i % 2 === 1 && "bg-white/[0.015]"
                )}>
                  <td className="px-3 py-2.5 text-primary text-xs font-medium">{s.sponsor}</td>
                  <td className="px-3 py-2.5 text-primary text-xs font-mono">{s.deal_count}</td>
                  <td className="px-3 py-2.5 text-primary text-xs font-mono">{formatCurrency(s.total_exposure_usd)}</td>
                  <td className="px-3 py-2.5 text-success text-xs font-mono">{s.current_count}</td>
                  <td className="px-3 py-2.5 text-warning text-xs font-mono">{s.watchlist_count}</td>
                  <td className="px-3 py-2.5 text-danger text-xs font-mono">{s.stressed_count}</td>
                  <td className="px-3 py-2.5 text-xs font-mono text-muted">{s.problem_rate_pct.toFixed(1)}%</td>
                  <td className={cn("px-3 py-2.5 text-xs font-mono font-semibold", tsTone)}>{s.lender_treatment_score}</td>
                  <td className={cn("px-3 py-2.5 text-xs font-mono", driftTone)}>
                    {s.risk_drift > 0 ? "+" : ""}{s.risk_drift}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Loading() {
  return (
    <div className="flex items-center justify-center py-8 gap-2 text-muted text-xs">
      <Loader2 size={12} className="animate-spin" /> Loading…
    </div>
  );
}
