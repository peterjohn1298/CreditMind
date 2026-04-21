"use client";

import { useState, useEffect, useRef } from "react";
import { Play, AlertTriangle, Zap, ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import Select from "@/components/ui/Select";
import SentimentChart from "@/components/ui/SentimentChart";
import TypewriterText from "@/components/ui/TypewriterText";
import { useCredit } from "@/context/CreditContext";
import { runDailyMonitor, runQuarterlyReview } from "@/lib/api";
import { cn, formatCurrency, getRiskColor } from "@/lib/utils";
import type { Deal, AgentStatus } from "@/lib/types";

type Tab = "portfolio" | "deal" | "stress";
type SortKey = "risk_score" | "sector_stress_score" | "loan_amount" | "status" | "alert_count";
type FilterStatus = "all" | "stressed" | "watchlist" | "current";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONITOR_AGENTS = ["News Intelligence", "Sentiment Scorer", "Early Warning"];
const QUARTERLY_AGENTS = ["Portfolio Monitor", "Covenant Compliance", "Rating Reviewer"];

const STRESS_SCENARIOS = [
  { id: "rate_shock",      label: "Rate Shock +200bps",    desc: "SOFR increases 200bps — floating rate borrowers face higher interest burden" },
  { id: "recession",       label: "Recession −20% EBITDA", desc: "Economic contraction reduces EBITDA 20% across all portfolio companies" },
  { id: "sector_collapse", label: "Sector Collapse",       desc: "Targeted sector stress with spread widening +300bps" },
  { id: "china_tariff",    label: "China Tariff Impact",   desc: "145% tariffs on Chinese imports disrupt supply chains in exposed sectors" },
];

const RATING_SCALE = ["AAA","AA+","AA","AA-","A+","A","A-","BBB+","BBB","BBB-","BB+","BB","BB-","B+","B","B-","CCC","CC","C","D"];
const STATUS_ORDER: Record<string, number> = { stressed: 0, watchlist: 1, current: 2 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function migrateRating(rating: string, notches: number) {
  const idx = RATING_SCALE.indexOf(rating);
  return idx === -1 ? rating : RATING_SCALE[Math.min(idx + notches, RATING_SCALE.length - 1)];
}

function dealMaxSeverity(deal: Deal, activeAlerts: any[]): string | null {
  const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const alerts = activeAlerts.filter(a => (a._deal_id === deal.deal_id || a.deal_id === deal.deal_id) && !a.resolved);
  for (const sev of order) if (alerts.some(a => a.severity === sev)) return sev;
  return null;
}

function calcStressResults(portfolio: Deal[], scenario: string) {
  return portfolio.map((deal) => {
    let notches = 0, coverage_breach = false, leverage_breach = false;
    switch (scenario) {
      case "rate_shock":
        if (deal.risk_score > 65) { notches = 2; coverage_breach = true; }
        else if (deal.risk_score > 45) notches = 1;
        break;
      case "recession":
        if (deal.risk_score > 60) { notches = 3; leverage_breach = true; coverage_breach = true; }
        else if (deal.risk_score > 40) { notches = 2; leverage_breach = true; }
        else notches = 1;
        break;
      case "sector_collapse":
        if (deal.sector_stress_score > 65) { notches = 3; leverage_breach = true; coverage_breach = true; }
        else if (deal.sector_stress_score > 45) { notches = 2; coverage_breach = true; }
        else if (deal.sector_stress_score > 25) notches = 1;
        break;
      case "china_tariff":
        if (["Consumer & Retail","Industrials","Specialty Chemicals","Logistics"].includes(deal.sector)) {
          if (deal.risk_score > 50) { notches = 2; leverage_breach = true; }
          else notches = 1;
        }
        break;
    }
    return { deal_id: deal.deal_id, company: deal.company, sector: deal.sector,
      loan_amount: deal.loan_amount, current_rating: deal.internal_rating,
      stressed_rating: migrateRating(deal.internal_rating, notches),
      coverage_breach, leverage_breach, notches };
  }).filter(r => r.notches > 0).sort((a, b) => b.notches - a.notches);
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useAgentAnimation(running: boolean, agentNames: string[]) {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  useEffect(() => {
    if (!running) return;
    setAgents(agentNames.map(name => ({ name, status: "pending" as const })));
    agentNames.forEach((_, i) => {
      setTimeout(() => setAgents(prev => prev.map((a, j) =>
        j < i ? { ...a, status: "complete" as const } :
        j === i ? { ...a, status: "running" as const } : a
      )), i * 900);
    });
  }, [running]);
  return agents;
}

interface ScanEntry { sector: string; deals: number; status: "queued" | "scanning" | "complete" }

function useSectorScanFeed(isRefreshing: boolean, portfolio: Deal[]) {
  const [log, setLog] = useState<ScanEntry[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!isRefreshing) return;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const sectors = [...new Set(portfolio.map(d => d.sector))].sort();
    setLog(sectors.map(s => ({ sector: s, deals: portfolio.filter(d => d.sector === s).length, status: "queued" })));
    sectors.forEach((sector, i) => {
      timersRef.current.push(setTimeout(() =>
        setLog(prev => prev.map(e => e.sector === sector ? { ...e, status: "scanning" } : e))
      , i * 2800));
      timersRef.current.push(setTimeout(() =>
        setLog(prev => prev.map(e => e.sector === sector ? { ...e, status: "complete" } : e))
      , i * 2800 + 2400));
    });
    return () => timersRef.current.forEach(clearTimeout);
  }, [isRefreshing]);

  return log;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Monitoring() {
  const { state, triggerRefresh } = useCredit();
  const [tab, setTab] = useState<Tab>("portfolio");
  const [dealId, setDealId] = useState(state.portfolio[0]?.deal_id ?? "");

  // Portfolio view
  const [sortBy, setSortBy] = useState<SortKey>("risk_score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const scanLog = useSectorScanFeed(state.isRefreshing, state.portfolio);

  // Deal deep dive
  const [dailyRunning, setDailyRunning] = useState(false);
  const [dailySummary, setDailySummary] = useState<string | null>(null);
  const [warningFlags, setWarningFlags] = useState<any[]>([]);
  const [liveNewsSignals, setLiveNewsSignals] = useState<any[]>([]);
  const [sentimentTrend, setSentimentTrend] = useState<Array<{ date: string; score: number }>>([]);
  const [liveRiskScore, setLiveRiskScore] = useState<number | null>(null);
  const [jobSignals, setJobSignals] = useState<any | null>(null);
  const [consumerSignals, setConsumerSignals] = useState<any | null>(null);
  const [qRunning, setQRunning] = useState(false);
  const [qSummary, setQSummary] = useState<string | null>(null);

  // Stress test
  const [scenario, setScenario] = useState("rate_shock");
  const [stressRunning, setStressRunning] = useState(false);
  const [stressResults, setStressResults] = useState<ReturnType<typeof calcStressResults> | null>(null);

  const deal = state.portfolio.find(d => d.deal_id === dealId);
  const monitorAgents = useAgentAnimation(dailyRunning, MONITOR_AGENTS);
  const quarterlyAgents = useAgentAnimation(qRunning, QUARTERLY_AGENTS);

  // ── Portfolio stats ──────────────────────────────────────────────────────────
  const stressed  = state.portfolio.filter(d => d.status === "stressed");
  const watchlist = state.portfolio.filter(d => d.status === "watchlist");
  const totalExposureAtRisk = [...stressed, ...watchlist].reduce((s, d) => s + d.loan_amount, 0);
  const criticalCount = state.activeAlerts.filter(a => a.severity === "CRITICAL" && !a.resolved).length;

  // ── Sorted/filtered table ────────────────────────────────────────────────────
  const filtered = state.portfolio.filter(d => filterStatus === "all" || d.status === filterStatus);
  const sorted = [...filtered].sort((a, b) => {
    let va: number, vb: number;
    if (sortBy === "status") { va = STATUS_ORDER[a.status] ?? 3; vb = STATUS_ORDER[b.status] ?? 3; }
    else { va = (a as any)[sortBy] ?? 0; vb = (b as any)[sortBy] ?? 0; }
    return sortDir === "desc" ? vb - va : va - vb;
  });

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(key); setSortDir("desc"); }
  }

  function openDeal(id: string) { setDealId(id); setTab("deal"); }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handleDaily() {
    if (!deal) return;
    setDailyRunning(true); setDailySummary(null);
    try {
      const res = await runDailyMonitor(deal.deal_id, deal.ticker ?? "");
      setDailySummary(res.monitoring_summary ?? null);
      setWarningFlags(res.early_warning_flags ?? []);
      setLiveNewsSignals(res.news_signals ?? []);
      setSentimentTrend(res.sentiment_trend ?? []);
      setLiveRiskScore(res.live_risk_score ?? null);
      setJobSignals(res.job_signals ?? null);
      setConsumerSignals(res.consumer_signals ?? null);
    } catch { setDailySummary(null); }
    finally { setDailyRunning(false); }
  }

  async function handleQuarterly() {
    if (!deal) return;
    setQRunning(true); setQSummary(null);
    try {
      const res = await runQuarterlyReview(deal.deal_id, deal.ticker ?? "");
      setQSummary(res.review_summary);
    } catch { setQSummary(null); }
    finally { setQRunning(false); }
  }

  async function handleStressTest() {
    setStressRunning(true); setStressResults(null);
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 800));
    setStressResults(calcStressResults(state.portfolio, scenario));
    setStressRunning(false);
  }

  const covenantRows: Array<{ name: string; threshold: string; current: string; headroom_pct: number }> =
    deal?.covenants?.covenants ?? [];
  const covenantCompliance: string = deal?.covenants?.overall_compliance ?? "UNKNOWN";

  const stressImpact = stressResults ? {
    impacted: stressResults.length,
    exposure: stressResults.reduce((s, r) => s + r.loan_amount, 0),
    breaches: stressResults.filter(r => r.coverage_breach || r.leverage_breach).length,
  } : null;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Tab bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 glass rounded-lg p-1">
          {([
            ["portfolio", "Portfolio View"],
            ["deal",      "Deal Deep Dive"],
            ["stress",    "Stress Testing"],
          ] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                tab === t ? "bg-accent text-white" : "text-muted hover:text-primary"
              )}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {state.lastRefreshed && (
            <span className="text-muted text-xs font-mono">
              Last scan: {new Date(state.lastRefreshed).toLocaleTimeString()}
            </span>
          )}
          <button onClick={triggerRefresh} disabled={state.isRefreshing}
            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all",
              state.isRefreshing
                ? "border-white/[0.08] text-muted cursor-not-allowed"
                : "border-accent text-accent hover:bg-accent hover:text-white"
            )}>
            <RefreshCw size={12} className={state.isRefreshing ? "animate-spin" : ""} />
            {state.isRefreshing ? "Scanning…" : "Run Portfolio Scan"}
          </button>
        </div>
      </div>

      {/* ── PORTFOLIO VIEW ─────────────────────────────────────────────────────── */}
      {tab === "portfolio" && (
        <div className="space-y-5">

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Stressed Loans",     value: stressed.length,           sub: formatCurrency(stressed.reduce((s,d)=>s+d.loan_amount,0)),  color: "#FF3B5C" },
              { label: "Watchlist Loans",    value: watchlist.length,          sub: formatCurrency(watchlist.reduce((s,d)=>s+d.loan_amount,0)), color: "#FFB300" },
              { label: "Critical Alerts",    value: criticalCount,             sub: `${state.activeAlerts.filter(a=>!a.resolved).length} total active`, color: criticalCount > 0 ? "#FF3B5C" : "#00D4A4" },
              { label: "Exposure at Risk",   value: formatCurrency(totalExposureAtRisk), sub: `${stressed.length + watchlist.length} of ${state.portfolio.length} loans`, color: "#FF8C00" },
            ].map((s, i) => (
              <div key={s.label} className="glass rounded-lg p-4 animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <p className="text-muted text-[10px] uppercase tracking-wider mb-1">{s.label}</p>
                <p className="font-mono font-bold text-2xl" style={{ color: s.color }}>{s.value}</p>
                <p className="text-muted text-[10px] mt-0.5 font-mono">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Sector scan feed */}
          {scanLog.length > 0 && (
            <div className="glass rounded-lg p-4 animate-fade-up">
              <p className="text-primary text-xs font-semibold mb-3 flex items-center gap-2">
                <span className={cn("w-1.5 h-1.5 rounded-full", state.isRefreshing ? "bg-accent animate-ping" : "bg-success")} />
                {state.isRefreshing ? "Scanning portfolio sectors…" : "Last scan complete"}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {scanLog.map((entry) => (
                  <div key={entry.sector} className={cn(
                    "rounded-md px-3 py-2 border text-[10px] font-mono transition-all duration-500",
                    entry.status === "complete" ? "border-success/30 bg-success/5 text-success" :
                    entry.status === "scanning" ? "border-accent/40 bg-accent/10 text-accent animate-pulse" :
                    "border-white/[0.06] bg-white/[0.02] text-muted/40"
                  )}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span>{entry.status === "complete" ? "✓" : entry.status === "scanning" ? "◉" : "○"}</span>
                      <span className="text-[9px] opacity-70">{entry.deals}d</span>
                    </div>
                    <p className="truncate">{entry.sector}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex items-center gap-2">
            {(["all","stressed","watchlist","current"] as FilterStatus[]).map(f => {
              const count = f === "all" ? state.portfolio.length : state.portfolio.filter(d => d.status === f).length;
              return (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className={cn("px-3 py-1 rounded-full text-xs font-mono font-semibold border transition-all",
                    filterStatus === f
                      ? f === "stressed" ? "border-danger/50 bg-danger/10 text-danger"
                        : f === "watchlist" ? "border-warning/50 bg-warning/10 text-warning"
                        : f === "current" ? "border-success/50 bg-success/10 text-success"
                        : "border-accent/50 bg-accent/10 text-accent"
                      : "border-white/[0.08] text-muted hover:text-primary"
                  )}>
                  {f.charAt(0).toUpperCase() + f.slice(1)} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
            <span className="ml-auto text-muted text-[10px] font-mono">{sorted.length} loans shown</span>
          </div>

          {/* Portfolio table */}
          <div className="glass rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {[
                    { key: null,                label: "Company" },
                    { key: null,                label: "Sector" },
                    { key: "status" as SortKey, label: "Status" },
                    { key: "risk_score" as SortKey,         label: "Risk" },
                    { key: "sector_stress_score" as SortKey, label: "Sector Stress" },
                    { key: "alert_count" as SortKey,        label: "Alerts" },
                    { key: null,                label: "Covenant" },
                    { key: "loan_amount" as SortKey,        label: "Loan Size" },
                    { key: null,                label: "" },
                  ].map(({ key, label }) => (
                    <th key={label}
                      onClick={() => key && toggleSort(key)}
                      className={cn("text-left px-4 py-2.5 text-muted font-semibold uppercase tracking-wider text-[10px]",
                        key && "cursor-pointer hover:text-primary select-none"
                      )}>
                      <span className="flex items-center gap-1">
                        {label}
                        {key && sortBy === key && (
                          sortDir === "desc" ? <ChevronDown size={10} /> : <ChevronUp size={10} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((d, i) => {
                  const maxSev = dealMaxSeverity(d, state.activeAlerts);
                  const isCritical = maxSev === "CRITICAL";
                  const compliance = d.covenants?.overall_compliance;
                  const riskColor = getRiskColor(d.risk_score);
                  return (
                    <tr key={d.deal_id}
                      className={cn(
                        "border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors cursor-pointer animate-fade-up",
                        i % 2 === 1 && "bg-white/[0.015]"
                      )}
                      style={{
                        animationDelay: `${i * 0.025}s`,
                        boxShadow: isCritical ? "inset 3px 0 0 #FF3B5C33" : undefined,
                      }}
                      onClick={() => openDeal(d.deal_id)}
                    >
                      <td className="px-4 py-2.5">
                        <p className="text-primary font-medium truncate max-w-[160px]">{d.company}</p>
                        <p className="text-muted text-[10px] font-mono">{d.internal_rating}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border"
                          style={{ borderColor: getRiskColor(d.sector_stress_score) + "50", color: getRiskColor(d.sector_stress_score) }}>
                          {d.sector}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[10px] font-mono font-bold capitalize",
                          d.status === "stressed" ? "text-danger" :
                          d.status === "watchlist" ? "text-warning" : "text-success"
                        )}>{d.status}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm w-6 text-right" style={{ color: riskColor }}>{d.risk_score}</span>
                          <div className="w-16 bg-white/[0.06] rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${d.risk_score}%`, backgroundColor: riskColor }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs w-6 text-right" style={{ color: getRiskColor(d.sector_stress_score) }}>{d.sector_stress_score}</span>
                          <div className="w-12 bg-white/[0.06] rounded-full h-1">
                            <div className="h-1 rounded-full" style={{ width: `${d.sector_stress_score}%`, backgroundColor: getRiskColor(d.sector_stress_score) }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {maxSev ? (
                          <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                            maxSev === "CRITICAL" ? "bg-danger/20 text-danger" :
                            maxSev === "HIGH"     ? "bg-warning/20 text-warning" :
                            "bg-white/[0.06] text-muted"
                          )}>{maxSev}</span>
                        ) : (
                          <span className="text-muted text-[10px] font-mono">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {compliance ? (
                          <span className={cn("text-[10px] font-mono font-bold",
                            compliance === "BREACH_DETECTED" ? "text-danger" :
                            compliance === "AT_RISK"         ? "text-warning" :
                            "text-success"
                          )}>
                            {compliance === "BREACH_DETECTED" ? "BREACH" :
                             compliance === "AT_RISK"         ? "AT RISK" : "OK"}
                          </span>
                        ) : (
                          <span className="text-muted text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-primary text-xs">{formatCurrency(d.loan_amount)}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-accent text-[10px] font-mono opacity-0 group-hover:opacity-100">→</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DEAL DEEP DIVE ────────────────────────────────────────────────────── */}
      {tab === "deal" && (
        <div className="space-y-5">

          {/* Deal selector */}
          <div className="glass rounded-lg px-5 py-4 flex items-center gap-4 flex-wrap">
            <label className="text-muted text-xs uppercase tracking-wider shrink-0">Deal</label>
            <Select
              value={deal ? deal.company : "Select a deal"}
              onChange={(v) => { const f = state.portfolio.find(d => d.company === v); if (f) setDealId(f.deal_id); }}
              options={state.portfolio.map(d => d.company)}
              className="w-72"
            />
            {deal && (
              <div className="flex items-center gap-5 ml-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted text-[10px] uppercase tracking-wider">Status</span>
                  <span className={cn("text-xs font-mono font-bold capitalize",
                    deal.status === "stressed" ? "text-danger" : deal.status === "watchlist" ? "text-warning" : "text-success"
                  )}>{deal.status}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted text-[10px] uppercase tracking-wider">Risk</span>
                  <span className="font-mono font-bold text-sm" style={{ color: getRiskColor(deal.risk_score) }}>{deal.risk_score}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted text-[10px] uppercase tracking-wider">Sector Stress</span>
                  <span className="font-mono font-bold text-sm" style={{ color: getRiskColor(deal.sector_stress_score) }}>{deal.sector_stress_score}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted text-[10px] uppercase tracking-wider">Rating</span>
                  <span className="text-primary font-mono font-bold text-sm">{deal.internal_rating}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted text-[10px] uppercase tracking-wider">Loan</span>
                  <span className="text-primary font-mono text-xs">{formatCurrency(deal.loan_amount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Existing early warning flags from seed + agents */}
          {(deal?.early_warning_flags ?? []).length > 0 && (
            <div className="glass rounded-lg p-4 border border-warning/20 animate-fade-up">
              <p className="text-warning text-xs font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle size={12} /> Active Early Warning Flags
              </p>
              <div className="space-y-2">
                {(deal!.early_warning_flags!).map((f: any, i: number) => (
                  <div key={i} className={cn("flex items-start gap-3 rounded px-3 py-2 border-l-2 text-xs",
                    f.severity === "CRITICAL" ? "border-danger bg-danger/5 text-danger" :
                    f.severity === "HIGH"     ? "border-warning bg-warning/5 text-warning" :
                    "border-white/20 bg-white/[0.02] text-muted"
                  )}>
                    <span className="font-mono font-bold text-[10px] shrink-0 mt-0.5 uppercase">
                      {f.warning_type ?? f.flag_type ?? "FLAG"}
                    </span>
                    <span className="leading-relaxed">{f.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Monitor */}
          <div className="glass rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <div>
                <p className="text-primary font-semibold text-sm flex items-center gap-2">
                  Daily Monitor
                  {dailyRunning && <span className="text-[10px] font-mono text-accent animate-pulse">● SCANNING</span>}
                  {dailySummary && !dailyRunning && <span className="text-[10px] font-mono text-success">✓ COMPLETE</span>}
                </p>
                <p className="text-muted text-[10px] uppercase tracking-wider mt-0.5">
                  News intelligence · Sentiment scoring · Early warning · Alt-data
                </p>
              </div>
              <button onClick={handleDaily} disabled={dailyRunning}
                className="flex items-center gap-2 bg-accent text-white rounded-md px-3 py-1.5 text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-50">
                {dailyRunning ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={12} />}
                {dailyRunning ? "Agents Running…" : "Run Daily Monitor"}
              </button>
            </div>

            {(dailyRunning || (monitorAgents.length > 0 && dailySummary)) && (
              <div className="px-5 pt-4 pb-2 border-b border-white/[0.04] grid grid-cols-3 gap-2">
                {monitorAgents.map((a, i) => (
                  <div key={i} className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all duration-300",
                    a.status === "complete" ? "bg-success/5 border border-success/20" :
                    a.status === "running"  ? "bg-accent/10 border border-accent/30 animate-pulse" :
                    "bg-white/[0.02] border border-white/[0.04]"
                  )}>
                    <span className={cn("leading-none", a.status === "complete" ? "text-success" : a.status === "running" ? "text-accent" : "text-muted/40")}>
                      {a.status === "complete" ? "✓" : a.status === "running" ? "◉" : "○"}
                    </span>
                    <span className={cn("font-mono", a.status === "complete" ? "text-success" : a.status === "running" ? "text-accent" : "text-muted/50")}>{a.name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="p-5 grid grid-cols-2 gap-5">
              <div className="space-y-4">
                {sentimentTrend.length > 0 ? (
                  <SentimentChart data={sentimentTrend} sector={deal?.sector ?? "Portfolio"} />
                ) : (
                  <div className="glass rounded-lg p-4 flex items-center justify-center h-[192px] border border-white/[0.04]">
                    <p className="text-muted text-xs text-center leading-relaxed">
                      Run Daily Monitor to generate live sentiment data for {deal?.company ?? "this deal"}.
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-primary text-xs font-semibold mb-2">News Signals</p>
                  {(() => {
                    const signals = liveNewsSignals.length > 0 ? liveNewsSignals : (deal?.news_signals ?? []);
                    if (signals.length === 0) return (
                      <p className="text-muted text-xs py-2">No news signals — run Daily Monitor to fetch live headlines.</p>
                    );
                    return signals.slice(0, 5).map((h: any, i: number) => {
                      const neg = h.sentiment === "negative" || h.score < 40;
                      return (
                        <div key={i} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0 animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                          <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 uppercase",
                            neg ? "bg-danger/20 text-danger" : "bg-success/20 text-success"
                          )}>{h.sentiment ?? (neg ? "neg" : "pos")}</span>
                          <p className="text-primary text-xs leading-relaxed">{h.headline ?? h.title ?? String(h)}</p>
                        </div>
                      );
                    });
                  })()}
                </div>
                {warningFlags.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-primary text-xs font-semibold mb-2">Live Warning Flags</p>
                    {warningFlags.map((f: any, i: number) => (
                      <div key={i} className={cn("rounded px-3 py-2 text-xs border-l-2",
                        f.severity === "CRITICAL" ? "border-danger bg-danger/5 text-danger" :
                        f.severity === "HIGH"     ? "border-warning bg-warning/5 text-warning" :
                        "border-white/20 bg-white/[0.02] text-muted"
                      )}>
                        <span className="font-semibold">{f.warning_type ?? f.flag_type} — </span>{f.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="bg-black/40 border border-white/[0.06] rounded-lg p-4 space-y-2">
                  <p className="text-primary text-xs font-semibold mb-1">Deal Metrics</p>
                  {[
                    ["Sector",               deal?.sector],
                    ["Sector Stress",        `${deal?.sector_stress_score ?? "—"} / 100`],
                    ["Underwrite Risk Score",`${deal?.risk_score ?? "—"} / 100`],
                    ["Live Risk Score",       liveRiskScore != null ? `${liveRiskScore} / 100` : "Run monitor →"],
                    ["Rating",               deal?.internal_rating],
                    ["Sponsor",              deal?.sponsor],
                    ["Loan Type",            deal?.loan_type],
                    ["Loan Amount",          deal ? formatCurrency(deal.loan_amount) : "—"],
                    ["Maturity",             deal?.maturity_date ?? "—"],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between">
                      <p className="text-muted text-xs">{k as string}</p>
                      <p className={cn("text-xs font-mono", k === "Live Risk Score" && liveRiskScore == null ? "text-muted" : "text-primary")}>{v as string}</p>
                    </div>
                  ))}
                </div>
                {dailySummary && (
                  <div className="bg-black/40 border border-accent/20 rounded-lg p-4 animate-fade-up">
                    <p className="text-accent text-[10px] font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Zap size={10} /> AI Monitor Summary
                    </p>
                    <p className="text-primary text-xs leading-relaxed">
                      <TypewriterText text={dailySummary} speed={8} />
                    </p>
                  </div>
                )}
                {(jobSignals || consumerSignals) && (
                  <div className="bg-black/40 border border-white/[0.06] rounded-lg p-4 space-y-3 animate-fade-up">
                    <p className="text-primary text-xs font-semibold">Alternative Data</p>
                    {jobSignals && !jobSignals.error && (
                      <div>
                        <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Job Postings</p>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-primary text-xs">{jobSignals.open_positions} open positions</span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded font-mono",
                            jobSignals.hiring_signal === "DISTRESS"     ? "bg-danger/20 text-danger" :
                            jobSignals.hiring_signal === "CONTRACTING"  ? "bg-warning/20 text-warning" :
                            "bg-success/20 text-success"
                          )}>{jobSignals.hiring_signal}</span>
                        </div>
                        <p className="text-muted text-[10px]">{jobSignals.signal_rationale}</p>
                      </div>
                    )}
                    {consumerSignals && !consumerSignals.error && (
                      <div className="border-t border-white/[0.06] pt-3">
                        <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Consumer Sentiment</p>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-primary text-xs">{consumerSignals.rating}★ · {consumerSignals.review_count?.toLocaleString()} reviews</span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded font-mono",
                            consumerSignals.consumer_signal === "DISTRESS"  ? "bg-danger/20 text-danger" :
                            consumerSignals.consumer_signal === "WEAKENING" ? "bg-warning/20 text-warning" :
                            "bg-success/20 text-success"
                          )}>{consumerSignals.consumer_signal}</span>
                        </div>
                        <p className="text-muted text-[10px]">{consumerSignals.signal_rationale}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quarterly Review */}
          <div className="glass rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <div>
                <p className="text-primary font-semibold text-sm flex items-center gap-2">
                  Quarterly Review
                  {qRunning && <span className="text-[10px] font-mono text-accent animate-pulse">● REVIEWING</span>}
                  {qSummary && !qRunning && <span className="text-[10px] font-mono text-success">✓ COMPLETE</span>}
                </p>
                <p className="text-muted text-[10px] uppercase tracking-wider mt-0.5">Covenant compliance · Rating review · Portfolio health</p>
              </div>
              <button onClick={handleQuarterly} disabled={qRunning}
                className="flex items-center gap-2 bg-accent text-white rounded-md px-3 py-1.5 text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-50">
                {qRunning ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={12} />}
                {qRunning ? "Agents Running…" : "Run Quarterly Review"}
              </button>
            </div>

            {(qRunning || (quarterlyAgents.length > 0 && qSummary)) && (
              <div className="px-5 pt-4 pb-2 border-b border-white/[0.04] grid grid-cols-3 gap-2">
                {quarterlyAgents.map((a, i) => (
                  <div key={i} className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all duration-300",
                    a.status === "complete" ? "bg-success/5 border border-success/20" :
                    a.status === "running"  ? "bg-accent/10 border border-accent/30 animate-pulse" :
                    "bg-white/[0.02] border border-white/[0.04]"
                  )}>
                    <span className={cn(a.status === "complete" ? "text-success" : a.status === "running" ? "text-accent" : "text-muted/40")}>
                      {a.status === "complete" ? "✓" : a.status === "running" ? "◉" : "○"}
                    </span>
                    <span className={cn("font-mono text-[10px]", a.status === "complete" ? "text-success" : a.status === "running" ? "text-accent" : "text-muted/50")}>{a.name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="p-5 grid grid-cols-2 gap-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-primary text-xs font-semibold">Covenant Compliance — {deal?.company ?? "Select deal"}</p>
                  {covenantCompliance !== "UNKNOWN" && (
                    <span className={cn("text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                      covenantCompliance === "COMPLIANT"       ? "bg-success/20 text-success" :
                      covenantCompliance === "AT_RISK"         ? "bg-warning/20 text-warning" :
                      covenantCompliance === "BREACH_DETECTED" ? "bg-danger/20 text-danger" :
                      "bg-white/[0.06] text-muted"
                    )}>{covenantCompliance.replace("_", " ")}</span>
                  )}
                </div>
                {covenantRows.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {["Covenant","Threshold","Current","Headroom","Status"].map(h => (
                          <th key={h} className="text-left pb-2 text-muted font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {covenantRows.map((c) => {
                        const breach = c.headroom_pct < 0;
                        const atRisk = !breach && c.headroom_pct < 15;
                        return (
                          <tr key={c.name} className="border-b border-white/[0.04] last:border-0">
                            <td className="py-2 text-primary">{c.name}</td>
                            <td className="py-2 font-mono text-muted">{c.threshold}</td>
                            <td className="py-2 font-mono text-primary">{c.current}</td>
                            <td className="py-2 font-mono" style={{ color: breach ? "#FF3B5C" : atRisk ? "#FFB300" : "#00D4A4" }}>
                              {c.headroom_pct > 0 ? "+" : ""}{c.headroom_pct.toFixed(1)}%
                            </td>
                            <td className="py-2">
                              <span className={cn("font-bold text-[10px]", breach ? "text-danger" : atRisk ? "text-warning" : "text-success")}>
                                {breach ? "BREACH" : atRisk ? "AT RISK" : "PASS"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-4 text-center">
                    {covenantCompliance === "COMPLIANT" ? (
                      <p className="text-success text-xs font-semibold">All covenants compliant</p>
                    ) : (
                      <p className="text-muted text-xs leading-relaxed">
                        Run Quarterly Review to pull live covenant data for {deal?.company ?? "this deal"}.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div>
                {qSummary ? (
                  <div className="bg-black/40 border border-accent/20 rounded-lg p-4 animate-fade-up">
                    <p className="text-accent text-[10px] font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Zap size={10} /> AI Review Summary
                    </p>
                    <p className="text-primary text-xs leading-relaxed">
                      <TypewriterText text={qSummary} speed={8} />
                    </p>
                  </div>
                ) : (
                  <div className="bg-black/40 border border-white/[0.06] rounded-lg p-4 flex items-center justify-center min-h-[80px]">
                    <p className="text-muted text-xs text-center leading-relaxed">
                      Run Quarterly Review to generate a live AI rating assessment for {deal?.company ?? "the selected deal"}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STRESS TESTING ────────────────────────────────────────────────────── */}
      {tab === "stress" && (
        <div className="space-y-5">
          <div className="glass rounded-lg p-5">
            <p className="text-primary font-semibold mb-1">Portfolio Stress Testing</p>
            <p className="text-muted text-xs mb-4">
              Apply macro scenarios across all {state.portfolio.length} loans to identify covenant breaches and rating migrations.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {STRESS_SCENARIOS.map(s => (
                <button key={s.id} onClick={() => setScenario(s.id)}
                  className={cn("text-left p-3 rounded-lg border transition-all",
                    scenario === s.id ? "border-accent bg-accent/10" : "border-white/[0.08] bg-black/30 hover:border-white/20"
                  )}>
                  <p className={cn("text-xs font-semibold", scenario === s.id ? "text-accent" : "text-primary")}>{s.label}</p>
                  <p className="text-muted text-[10px] mt-0.5 leading-relaxed">{s.desc}</p>
                </button>
              ))}
            </div>
            <button onClick={handleStressTest} disabled={stressRunning}
              className="flex items-center gap-2 bg-accent text-white rounded-md px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50">
              {stressRunning
                ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Running Stress Test…</>
                : <><AlertTriangle size={14} />Run Stress Test</>}
            </button>
          </div>

          {stressResults && stressImpact && (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Loans Impacted",    value: `${stressImpact.impacted} / ${state.portfolio.length}`, color: stressImpact.impacted > 20 ? "#FF3B5C" : "#FFB300" },
                  { label: "Exposure at Risk",  value: formatCurrency(stressImpact.exposure),                  color: "#FF8C00" },
                  { label: "Covenant Breaches", value: `${stressImpact.breaches} loans`,                       color: stressImpact.breaches > 5 ? "#FF3B5C" : "#FFB300" },
                ].map((stat, i) => (
                  <div key={stat.label} className="glass rounded-lg p-4 animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                    <p className="text-muted text-[10px] uppercase tracking-wider">{stat.label}</p>
                    <p className="font-mono text-xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="glass rounded-lg overflow-hidden animate-fade-up delay-300">
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <p className="text-primary text-sm font-semibold">
                    Impacted Loans — {STRESS_SCENARIOS.find(s => s.id === scenario)?.label}
                  </p>
                  <p className="text-muted text-xs font-mono">{stressResults.length} of {state.portfolio.length} affected</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Company","Sector","Rating","Stressed","Coverage","Leverage","Severity"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-muted font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stressResults.map((r, i) => (
                      <tr key={r.deal_id}
                        className={cn("border-b border-white/[0.04] last:border-0 animate-fade-up cursor-pointer hover:bg-white/[0.03]", i % 2 === 1 && "bg-white/[0.02]")}
                        style={{ animationDelay: `${i * 0.04}s` }}
                        onClick={() => openDeal(r.deal_id)}>
                        <td className="px-4 py-2.5 text-primary font-medium">{r.company}</td>
                        <td className="px-4 py-2.5 text-muted">{r.sector}</td>
                        <td className="px-4 py-2.5 font-mono text-muted">{r.current_rating}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono font-bold" style={{ color: getRiskColor(50 + r.notches * 15) }}>{r.stressed_rating}</span>
                          <span className="text-danger ml-1 text-[10px]">▼{r.notches}</span>
                        </td>
                        <td className="px-4 py-2.5"><span className={cn("font-bold text-[10px]", r.coverage_breach ? "text-danger" : "text-success")}>{r.coverage_breach ? "BREACH" : "PASS"}</span></td>
                        <td className="px-4 py-2.5"><span className={cn("font-bold text-[10px]", r.leverage_breach ? "text-danger" : "text-success")}>{r.leverage_breach ? "BREACH" : "PASS"}</span></td>
                        <td className="px-4 py-2.5">
                          <span className={cn("text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                            r.notches >= 3 ? "bg-danger/20 text-danger" : r.notches === 2 ? "bg-warning/20 text-warning" : "bg-yellow-500/20 text-yellow-400"
                          )}>{r.notches >= 3 ? "SEVERE" : r.notches === 2 ? "MODERATE" : "MILD"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
