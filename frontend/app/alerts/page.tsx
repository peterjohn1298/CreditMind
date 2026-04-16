"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import AlertCard from "@/components/ui/AlertCard";
import { useCredit } from "@/context/CreditContext";
import { resolveAlert } from "@/lib/api";
import { cn, getRiskColor } from "@/lib/utils";
import type { Deal } from "@/lib/types";

type Tab = "company" | "sector" | "warning";

interface EarlyWarning {
  deal_id: string;
  company: string;
  sector: string;
  current_rating: string;
  current_status: string;
  risk_score: number;
  sector_stress_score: number;
  probability: "HIGH" | "MEDIUM" | "ELEVATED";
  predicted_action: string;
  timeline: string;
  drivers: string[];
}

function deriveEarlyWarnings(portfolio: Deal[]): EarlyWarning[] {
  const warnings: EarlyWarning[] = [];

  for (const d of portfolio) {
    let probability: EarlyWarning["probability"] | null = null;
    let predicted_action = "";
    let timeline = "";
    const drivers: string[] = [];

    if (d.status === "stressed") {
      probability = "HIGH";
      predicted_action = "Rating downgrade 1–2 notches likely. Covenant breach risk — immediate review recommended.";
      timeline = "Q2 2026";
      drivers.push(`Risk score: ${d.risk_score}/100`);
      drivers.push("Status: Stressed");
      if (d.alert_count > 0) drivers.push(`${d.alert_count} active alerts`);
      if (d.sector_stress_score > 50) drivers.push(`Sector stress: ${d.sector_stress_score}/100`);
    } else if (d.status === "watchlist" && d.risk_score > 55) {
      probability = "MEDIUM";
      predicted_action = "Potential covenant test failure next quarter. Sponsor engagement advised.";
      timeline = "Q3 2026";
      drivers.push(`Risk score: ${d.risk_score}/100 — elevated`);
      drivers.push("Status: Watchlist");
      if (d.sector_stress_score > 50) drivers.push(`Sector pressure: ${d.sector}`);
      if (d.alert_count > 0) drivers.push(`${d.alert_count} unresolved alerts`);
    } else if (d.sector_stress_score > 65 && d.status === "watchlist") {
      probability = "ELEVATED";
      predicted_action = "Sector-driven deterioration risk. Spread widening likely — monitor closely.";
      timeline = "Q3–Q4 2026";
      drivers.push(`Sector stress: ${d.sector_stress_score}/100`);
      drivers.push(`${d.sector} under macro pressure`);
      if (d.risk_score > 45) drivers.push(`Risk score: ${d.risk_score}/100`);
    } else if (d.risk_score > 65 && d.status === "current") {
      probability = "ELEVATED";
      predicted_action = "Emerging risk signals detected. Enhanced monitoring frequency recommended.";
      timeline = "Q4 2026";
      drivers.push(`Risk score: ${d.risk_score}/100 — high`);
      if (d.alert_count > 2) drivers.push(`${d.alert_count} unresolved alerts`);
      if (d.sector_stress_score > 50) drivers.push(`Sector stress: ${d.sector_stress_score}/100`);
    }

    if (probability) {
      warnings.push({
        deal_id:              d.deal_id,
        company:              d.company,
        sector:               d.sector,
        current_rating:       d.internal_rating,
        current_status:       d.status,
        risk_score:           d.risk_score,
        sector_stress_score:  d.sector_stress_score,
        probability,
        predicted_action,
        timeline,
        drivers,
      });
    }
  }

  return warnings.sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, ELEVATED: 2 };
    return order[a.probability] - order[b.probability];
  });
}

export default function Alerts() {
  const { state, dispatch, triggerRefresh } = useCredit();
  const [tab, setTab] = useState<Tab>("company");

  const companyAlerts = state.activeAlerts.filter((a) => !a.resolved && a.alert_type !== "sector");
  const sectorAlerts  = state.activeAlerts.filter((a) => !a.resolved && a.alert_type === "sector");
  const earlyWarnings = deriveEarlyWarnings(state.portfolio);

  const sorted = [...companyAlerts].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  async function handleResolve(id: string) {
    try { await resolveAlert(id); } catch {}
    dispatch({ type: "RESOLVE_ALERT", payload: id });
  }

  const highCount = earlyWarnings.filter(w => w.probability === "HIGH").length;

  return (
    <div className="space-y-5">
      {/* Header row — tabs + refresh button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-navy-800 border border-navy-700 rounded-lg p-1 w-fit">
          {([
            ["company", "Company Alerts", companyAlerts.length],
            ["sector",  "Sector Alerts",  sectorAlerts.length],
            ["warning", "Early Warning",  earlyWarnings.length],
          ] as [Tab, string, number][]).map(([t, label, count]) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 flex items-center gap-2",
                tab === t ? "bg-accent text-white" : "text-muted hover:text-primary"
              )}>
              {label}
              <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full",
                tab === t ? "bg-white/20 text-white" : "bg-navy-700 text-muted"
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <div className="flex items-center gap-3">
          {state.lastRefreshed && (
            <span className="text-muted text-xs">
              Last refreshed: {new Date(state.lastRefreshed).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={triggerRefresh}
            disabled={state.isRefreshing}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium border transition-all duration-150",
              state.isRefreshing
                ? "border-navy-600 text-muted cursor-not-allowed"
                : "border-accent text-accent hover:bg-accent hover:text-white"
            )}
          >
            <RefreshCw size={13} className={state.isRefreshing ? "animate-spin" : ""} />
            {state.isRefreshing ? "Running agents…" : "Refresh Alerts"}
          </button>
        </div>
      </div>

      {tab === "company" && (
        <div className="space-y-3 max-w-2xl">
          {sorted.length === 0 && (
            <div className="bg-navy-800 border border-navy-700 rounded-lg p-8 text-center">
              <p className="text-success font-medium">No active company alerts</p>
              <p className="text-muted text-sm mt-1">All deals within normal parameters</p>
            </div>
          )}
          {sorted.map((a) => (
            <AlertCard key={a.alert_id} alert={a} onResolve={handleResolve} />
          ))}
        </div>
      )}

      {tab === "sector" && (
        <div className="space-y-3 max-w-2xl">
          {sectorAlerts.length === 0 && (
            <div className="bg-navy-800 border border-navy-700 rounded-lg p-8 text-center">
              <p className="text-success font-medium">No active sector alerts</p>
              <p className="text-muted text-sm mt-1">All 11 sectors within baseline parameters</p>
            </div>
          )}
          {sectorAlerts.map((a) => (
            <AlertCard key={a.alert_id} alert={a} onResolve={handleResolve} />
          ))}
        </div>
      )}

      {tab === "warning" && (
        <div className="space-y-3 max-w-2xl">
          {/* Header */}
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-4">
            <p className="text-primary text-xs font-semibold mb-1">AI Predictive Analysis</p>
            <p className="text-muted text-xs leading-relaxed">
              Predictive signals based on risk score trajectory, sector stress indicators, and alert patterns across all {state.portfolio.length} portfolio loans.
              {highCount > 0 && <span className="text-danger font-semibold"> {highCount} HIGH probability deteriorations identified.</span>}
            </p>
          </div>

          {earlyWarnings.length === 0 && (
            <div className="bg-navy-800 border border-navy-700 rounded-lg p-8 text-center">
              <p className="text-success font-medium">No early warning signals</p>
              <p className="text-muted text-sm mt-1">Portfolio trajectory stable across all {state.portfolio.length} loans</p>
            </div>
          )}

          {earlyWarnings.map((w) => (
            <div key={w.deal_id} className="bg-navy-800 border border-navy-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-primary font-semibold text-sm">{w.company}</p>
                  <p className="text-muted text-xs">{w.sector}</p>
                </div>
                <span className={cn(
                  "text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0",
                  w.probability === "HIGH"     ? "bg-danger/20 text-danger border border-danger/30"
                  : w.probability === "MEDIUM" ? "bg-warning/20 text-warning border border-warning/30"
                  :                              "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                )}>
                  {w.probability} PROBABILITY
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-muted text-[10px] uppercase tracking-wider">Current Rating</p>
                  <p className="text-primary font-mono font-bold text-sm">{w.current_rating}</p>
                </div>
                <div>
                  <p className="text-muted text-[10px] uppercase tracking-wider">Risk Score</p>
                  <p className="font-mono font-bold text-sm" style={{ color: getRiskColor(w.risk_score) }}>{w.risk_score}</p>
                </div>
                <div>
                  <p className="text-muted text-[10px] uppercase tracking-wider">Timeline</p>
                  <p className="text-primary font-mono font-bold text-sm">{w.timeline}</p>
                </div>
              </div>

              <div className="bg-navy-900 rounded-md p-3 mb-3">
                <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Predicted Action Required</p>
                <p className="text-primary text-xs leading-relaxed">{w.predicted_action}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {w.drivers.map((driver, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-navy-700 text-muted rounded-full border border-navy-600">
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
