"use client";

import { useState } from "react";
import { RefreshCw, Zap, Brain } from "lucide-react";
import AlertCard from "@/components/ui/AlertCard";
import TypewriterText from "@/components/ui/TypewriterText";
import { useCredit } from "@/context/CreditContext";
import { resolveAlert } from "@/lib/api";
import { cn, getRiskColor } from "@/lib/utils";
import type { Deal } from "@/lib/types";

type Tab = "company" | "sector" | "warning";

interface EarlyWarning {
  deal_id: string; company: string; sector: string;
  current_rating: string; current_status: string;
  risk_score: number; sector_stress_score: number;
  probability: "HIGH" | "MEDIUM" | "ELEVATED";
  predicted_action: string; timeline: string; drivers: string[];
}

function deriveEarlyWarnings(portfolio: Deal[]): EarlyWarning[] {
  const warnings: EarlyWarning[] = [];
  for (const d of portfolio) {
    let probability: EarlyWarning["probability"] | null = null;
    let predicted_action = "", timeline = "";
    const drivers: string[] = [];

    if (d.status === "stressed") {
      probability = "HIGH";
      predicted_action = `Rating downgrade 1–2 notches likely for ${d.company}. Covenant breach risk is elevated — immediate sponsor engagement and IC escalation recommended. Monitor ${d.sector} sector for contagion.`;
      timeline = "Q2 2026";
      drivers.push(`Risk score: ${d.risk_score}/100`);
      drivers.push("Status: Stressed");
      if (d.alert_count > 0) drivers.push(`${d.alert_count} active alerts`);
      if (d.sector_stress_score > 50) drivers.push(`Sector stress: ${d.sector_stress_score}/100`);
    } else if (d.status === "watchlist" && d.risk_score > 55) {
      probability = "MEDIUM";
      predicted_action = `Covenant test failure risk in next quarter for ${d.company}. Risk score trajectory elevated at ${d.risk_score}/100. Sponsor engagement advised — request updated financial projections and management commentary.`;
      timeline = "Q3 2026";
      drivers.push(`Risk score: ${d.risk_score}/100 — elevated`);
      drivers.push("Status: Watchlist");
      if (d.sector_stress_score > 50) drivers.push(`${d.sector} under pressure`);
      if (d.alert_count > 0) drivers.push(`${d.alert_count} unresolved alerts`);
    } else if (d.sector_stress_score > 65 && d.status === "watchlist") {
      probability = "ELEVATED";
      predicted_action = `Sector-driven deterioration risk for ${d.company}. ${d.sector} stress at ${d.sector_stress_score}/100 may drive spread widening of 50-75bps. Enhanced monitoring and quarterly review acceleration recommended.`;
      timeline = "Q3–Q4 2026";
      drivers.push(`Sector stress: ${d.sector_stress_score}/100`);
      drivers.push(`${d.sector} macro pressure`);
      if (d.risk_score > 45) drivers.push(`Risk score: ${d.risk_score}/100`);
    } else if (d.risk_score > 65 && d.status === "current") {
      probability = "ELEVATED";
      predicted_action = `Emerging risk signals detected for ${d.company}. Risk score ${d.risk_score}/100 approaching watchlist threshold. Recommend increasing monitoring frequency to bi-weekly and requesting covenant compliance certificate.`;
      timeline = "Q4 2026";
      drivers.push(`Risk score: ${d.risk_score}/100`);
      if (d.alert_count > 2) drivers.push(`${d.alert_count} unresolved alerts`);
      if (d.sector_stress_score > 50) drivers.push(`Sector stress: ${d.sector_stress_score}/100`);
    }

    if (probability) {
      warnings.push({ deal_id: d.deal_id, company: d.company, sector: d.sector,
        current_rating: d.internal_rating, current_status: d.status,
        risk_score: d.risk_score, sector_stress_score: d.sector_stress_score,
        probability, predicted_action, timeline, drivers });
    }
  }
  return warnings.sort((a, b) => ({ HIGH: 0, MEDIUM: 1, ELEVATED: 2 }[a.probability] - { HIGH: 0, MEDIUM: 1, ELEVATED: 2 }[b.probability]));
}

export default function Alerts() {
  const { state, dispatch, triggerRefresh } = useCredit();
  const [tab, setTab] = useState<Tab>("company");
  const [revealedWarnings, setRevealedWarnings] = useState<Set<string>>(new Set());

  const companyAlerts = state.activeAlerts.filter(a => !a.resolved && a.alert_type !== "sector");
  const sectorAlerts  = state.activeAlerts.filter(a => !a.resolved && a.alert_type === "sector");
  const earlyWarnings = deriveEarlyWarnings(state.portfolio);

  const sorted = [...companyAlerts].sort((a, b) => {
    const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  async function handleResolve(id: string) {
    try { await resolveAlert(id); } catch {}
    dispatch({ type: "RESOLVE_ALERT", payload: id });
  }

  function revealWarning(id: string) {
    setRevealedWarnings(prev => new Set(prev).add(id));
  }

  const highCount = earlyWarnings.filter(w => w.probability === "HIGH").length;
  const criticalCount = sorted.filter(a => a.severity === "CRITICAL").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 glass rounded-lg p-1">
            {([
              ["company", "Company Alerts", companyAlerts.length],
              ["sector",  "Sector Alerts",  sectorAlerts.length],
              ["warning", "AI Predictions", earlyWarnings.length],
            ] as [Tab, string, number][]).map(([t, label, count]) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                  tab === t ? "bg-accent text-white" : "text-muted hover:text-primary"
                )}>
                {label}
                <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full",
                  tab === t ? "bg-white/20 text-white" : "bg-white/[0.08] text-muted"
                )}>{count}</span>
              </button>
            ))}
          </div>
          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-danger/10 border border-danger/30 animate-glow-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-ping" />
              <span className="text-danger text-xs font-mono font-bold">{criticalCount} CRITICAL</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {state.lastRefreshed && (
            <span className="text-muted text-xs font-mono">Last scan: {new Date(state.lastRefreshed).toLocaleTimeString()}</span>
          )}
          <button onClick={triggerRefresh} disabled={state.isRefreshing}
            className={cn("flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium border transition-all",
              state.isRefreshing ? "border-white/[0.08] text-muted cursor-not-allowed" : "border-accent text-accent hover:bg-accent hover:text-white"
            )}>
            <RefreshCw size={13} className={state.isRefreshing ? "animate-spin" : ""} />
            {state.isRefreshing ? "Agents running…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Company Alerts */}
      {tab === "company" && (
        <div className="space-y-3 max-w-2xl">
          {sorted.length === 0 && (
            <div className="glass rounded-lg p-8 text-center border border-success/20">
              <p className="text-success font-semibold">No active company alerts</p>
              <p className="text-muted text-sm mt-1">All {state.portfolio.length} deals within normal parameters</p>
            </div>
          )}
          {sorted.map((a, i) => (
            <div key={a.alert_id} className="animate-fade-up" style={{ animationDelay: `${i * 0.07}s`,
              filter: a.severity === "CRITICAL" ? "drop-shadow(0 0 12px rgba(255,59,92,0.25))" : undefined }}>
              <AlertCard alert={a} onResolve={handleResolve} />
            </div>
          ))}
        </div>
      )}

      {/* Sector Alerts */}
      {tab === "sector" && (
        <div className="space-y-3 max-w-2xl">
          {sectorAlerts.length === 0 && (
            <div className="glass rounded-lg p-8 text-center border border-success/20">
              <p className="text-success font-semibold">No active sector alerts</p>
              <p className="text-muted text-sm mt-1">All 11 sectors within baseline parameters</p>
            </div>
          )}
          {sectorAlerts.map((a, i) => (
            <div key={a.alert_id} className="animate-fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
              <AlertCard alert={a} onResolve={handleResolve} />
            </div>
          ))}
        </div>
      )}

      {/* AI Predictions */}
      {tab === "warning" && (
        <div className="space-y-3 max-w-2xl">
          <div className="glass rounded-lg p-4 border border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={14} className="text-accent" />
              <p className="text-primary text-xs font-semibold">AI Predictive Analysis</p>
            </div>
            <p className="text-muted text-xs leading-relaxed">
              Predictive signals derived from risk score trajectories, sector stress correlation, covenant proximity, and alert pattern analysis across {state.portfolio.length} portfolio loans.
              {highCount > 0 && <span className="text-danger font-semibold"> {highCount} HIGH probability deterioration{highCount > 1 ? "s" : ""} detected.</span>}
            </p>
          </div>

          {earlyWarnings.length === 0 && (
            <div className="glass rounded-lg p-8 text-center border border-success/20">
              <p className="text-success font-semibold">No early warning signals</p>
              <p className="text-muted text-sm mt-1">Portfolio trajectory stable across all {state.portfolio.length} loans</p>
            </div>
          )}

          {earlyWarnings.map((w, i) => (
            <div key={w.deal_id} className="glass rounded-lg p-4 animate-fade-up" style={{
              animationDelay: `${i * 0.08}s`,
              boxShadow: w.probability === "HIGH" ? "0 0 20px rgba(255,59,92,0.15)" :
                         w.probability === "MEDIUM" ? "0 0 16px rgba(255,179,0,0.1)" : undefined,
            }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-primary font-semibold text-sm">{w.company}</p>
                  <p className="text-muted text-xs">{w.sector} · {w.current_rating}</p>
                </div>
                <span className={cn("text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0",
                  w.probability === "HIGH"     ? "bg-danger/20 text-danger border border-danger/30" :
                  w.probability === "MEDIUM"   ? "bg-warning/20 text-warning border border-warning/30" :
                                                 "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                )}>
                  {w.probability === "HIGH" && <span className="inline-block w-1 h-1 rounded-full bg-danger mr-1 animate-ping" />}
                  {w.probability} PROBABILITY
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  ["Risk Score", w.risk_score, getRiskColor(w.risk_score)],
                  ["Sector Stress", w.sector_stress_score, getRiskColor(w.sector_stress_score)],
                  ["Timeline", w.timeline, "#F0EEE8"],
                ].map(([label, val, color]) => (
                  <div key={label as string}>
                    <p className="text-muted text-[10px] uppercase tracking-wider">{label as string}</p>
                    <p className="font-mono font-bold text-sm" style={{ color: color as string }}>{val as string | number}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => revealWarning(w.deal_id)}
                className="w-full bg-black/30 border border-white/[0.07] rounded-md p-3 mb-3 text-left hover:border-accent/20 transition-colors">
                <p className="text-muted text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Zap size={8} className="text-accent" /> AI Predicted Action Required
                </p>
                <p className="text-primary text-xs leading-relaxed">
                  {revealedWarnings.has(w.deal_id)
                    ? <TypewriterText text={w.predicted_action} speed={9} />
                    : <span className="text-muted italic text-[11px]">Click to reveal AI analysis →</span>
                  }
                </p>
              </button>

              <div className="flex flex-wrap gap-1.5">
                {w.drivers.map((driver, j) => (
                  <span key={j} className="text-[10px] px-2 py-0.5 bg-white/[0.04] text-muted rounded-full border border-white/[0.08]">
                    {driver}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
