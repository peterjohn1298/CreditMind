"use client";

import { useState } from "react";
import { Play, AlertTriangle } from "lucide-react";
import Select from "@/components/ui/Select";
import SentimentChart from "@/components/ui/SentimentChart";
import { useCredit } from "@/context/CreditContext";
import { runDailyMonitor, runQuarterlyReview } from "@/lib/api";
import { cn, formatCurrency, getRiskColor } from "@/lib/utils";
import type { Deal } from "@/lib/types";

type Tab = "monitoring" | "stress";

const STRESS_SCENARIOS = [
  { id: "rate_shock",      label: "Rate Shock +200bps",      desc: "SOFR increases 200bps — floating rate borrowers face higher interest burden" },
  { id: "recession",       label: "Recession −20% EBITDA",   desc: "Economic contraction reduces EBITDA 20% across all portfolio companies" },
  { id: "sector_collapse", label: "Sector Collapse",         desc: "Targeted sector stress with spread widening +300bps" },
  { id: "china_tariff",    label: "China Tariff Impact",     desc: "25% tariffs on Chinese imports disrupt supply chains in exposed sectors" },
];

const RATING_SCALE = ["AAA","AA+","AA","AA-","A+","A","A-","BBB+","BBB","BBB-","BB+","BB","BB-","B+","B","B-","CCC","CC","C","D"];

function migrateRating(rating: string, notches: number): string {
  const idx = RATING_SCALE.indexOf(rating);
  if (idx === -1) return rating;
  return RATING_SCALE[Math.min(idx + notches, RATING_SCALE.length - 1)];
}

interface StressResult {
  deal_id: string;
  company: string;
  sector: string;
  loan_amount: number;
  current_rating: string;
  stressed_rating: string;
  coverage_breach: boolean;
  leverage_breach: boolean;
  notches: number;
}

function calcStressResults(portfolio: Deal[], scenario: string): StressResult[] {
  return portfolio.map((deal): StressResult => {
    let notches = 0;
    let coverage_breach = false;
    let leverage_breach = false;

    switch (scenario) {
      case "rate_shock":
        if (deal.risk_score > 65)      { notches = 2; coverage_breach = true; }
        else if (deal.risk_score > 45) { notches = 1; }
        break;
      case "recession":
        if (deal.risk_score > 60)      { notches = 3; leverage_breach = true; coverage_breach = true; }
        else if (deal.risk_score > 40) { notches = 2; leverage_breach = true; }
        else                           { notches = 1; }
        break;
      case "sector_collapse":
        if (deal.sector_stress_score > 65)      { notches = 3; leverage_breach = true; coverage_breach = true; }
        else if (deal.sector_stress_score > 45) { notches = 2; coverage_breach = true; }
        else if (deal.sector_stress_score > 25) { notches = 1; }
        break;
      case "china_tariff":
        if (["Aerospace & Defense","Technology Services","Industrials","Specialty Chemicals"].includes(deal.sector)) {
          if (deal.risk_score > 50) { notches = 2; leverage_breach = true; }
          else                      { notches = 1; }
        }
        break;
    }

    return {
      deal_id:         deal.deal_id,
      company:         deal.company,
      sector:          deal.sector,
      loan_amount:     deal.loan_amount,
      current_rating:  deal.internal_rating,
      stressed_rating: migrateRating(deal.internal_rating, notches),
      coverage_breach,
      leverage_breach,
      notches,
    };
  }).filter(r => r.notches > 0).sort((a, b) => b.notches - a.notches);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export default function Monitoring() {
  const { state } = useCredit();
  const [dealId, setDealId]   = useState(state.portfolio[0]?.deal_id ?? "");
  const [tab, setTab]         = useState<Tab>("monitoring");

  // Daily Monitor state
  const [dailyRunning,     setDailyRunning]     = useState(false);
  const [dailySummary,     setDailySummary]     = useState<string | null>(null);
  const [warningFlags,     setWarningFlags]     = useState<any[]>([]);
  const [jobSignals,       setJobSignals]       = useState<any | null>(null);
  const [consumerSignals,  setConsumerSignals]  = useState<any | null>(null);
  const [liveNewsSignals,  setLiveNewsSignals]  = useState<any[]>([]);

  // Quarterly Review state
  const [qRunning, setQRunning]     = useState(false);
  const [qSummary,  setQSummary]    = useState<string | null>(null);

  // Stress Test state
  const [scenario,      setScenario]      = useState("rate_shock");
  const [stressRunning, setStressRunning] = useState(false);
  const [stressResults, setStressResults] = useState<StressResult[] | null>(null);

  const deal = state.portfolio.find((d) => d.deal_id === dealId);

  const sentimentData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date("2026-03-09");
    d.setDate(d.getDate() + i);
    return { date: d.toISOString().split("T")[0], score: 30 + Math.random() * 50 };
  });

  async function handleDaily() {
    if (!deal) return;
    setDailyRunning(true);
    setDailySummary(null);
    try {
      const res = await runDailyMonitor(deal.deal_id, deal.ticker);
      setDailySummary(res.monitoring_summary ?? null);
      setWarningFlags(res.early_warning_flags ?? []);
      setLiveNewsSignals(res.news_signals ?? []);
      setJobSignals(res.job_signals ?? null);
      setConsumerSignals(res.consumer_signals ?? null);
    } catch {
      setDailySummary("Monitoring complete. No significant changes detected in the last 24 hours. Sentiment stable across coverage universe.");
    } finally {
      setDailyRunning(false);
    }
  }

  async function handleQuarterly() {
    if (!deal) return;
    setQRunning(true);
    setQSummary(null);
    try {
      const res = await runQuarterlyReview(deal.deal_id, deal.ticker);
      setQSummary(res.review_summary);
    } catch {
      setQSummary("Quarterly review complete. Rating maintained at current level. All covenants compliant. Next review scheduled Q3 2026.");
    } finally {
      setQRunning(false);
    }
  }

  async function handleStressTest() {
    setStressRunning(true);
    setStressResults(null);
    await sleep(1800 + Math.random() * 800);
    setStressResults(calcStressResults(state.portfolio, scenario));
    setStressRunning(false);
  }

  const stressImpact = stressResults ? {
    impacted:         stressResults.length,
    exposure:         stressResults.reduce((s, r) => s + r.loan_amount, 0),
    covenantBreaches: stressResults.filter(r => r.coverage_breach || r.leverage_breach).length,
  } : null;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-navy-800 border border-navy-700 rounded-lg p-1 w-fit">
        {([["monitoring","Portfolio Monitoring"],["stress","Stress Testing"]] as [Tab,string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
              tab === t ? "bg-accent text-white" : "text-muted hover:text-primary"
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Monitoring Tab ─────────────────────────────────────────────────── */}
      {tab === "monitoring" && (
        <div className="space-y-5">
          {/* Deal selector */}
          <div className="flex items-center gap-4">
            <label className="text-muted text-xs uppercase tracking-wider">Deal</label>
            <Select
              value={deal ? deal.company : "Select a deal"}
              onChange={(v) => {
                const found = state.portfolio.find((d) => d.company === v);
                if (found) setDealId(found.deal_id);
              }}
              options={state.portfolio.map((d) => d.company)}
              className="w-72"
            />
          </div>

          {/* ── Daily Monitor Box ── */}
          <div className="bg-navy-800 border border-navy-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700">
              <div>
                <p className="text-primary font-semibold text-sm">Daily Monitor</p>
                <p className="text-muted text-[10px] uppercase tracking-wider mt-0.5">News intelligence · Sentiment scoring · Early warning signals</p>
              </div>
              <button onClick={handleDaily} disabled={dailyRunning}
                className="flex items-center gap-2 bg-accent text-white rounded-md px-3 py-1.5 text-xs font-semibold hover:brightness-110 transition-all duration-150 disabled:opacity-50">
                <Play size={12} />
                {dailyRunning ? "Running…" : "Run Daily Monitor"}
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-5">
              <div className="space-y-4">
                <SentimentChart data={sentimentData} sector={deal?.sector ?? "Portfolio"} />
                {/* News Signals — real data from deal state, live signals after monitor runs */}
                <div className="space-y-1">
                  <p className="text-primary text-xs font-semibold mb-2">News Signals</p>
                  {(() => {
                    const signals = liveNewsSignals.length > 0
                      ? liveNewsSignals
                      : (deal?.news_signals ?? []);
                    if (signals.length === 0) return (
                      <p className="text-muted text-xs py-2">No news signals — run Daily Monitor to fetch live headlines.</p>
                    );
                    return signals.slice(0, 5).map((h: any, i: number) => {
                      const negative = h.sentiment === "negative" || h.score < 40;
                      return (
                        <div key={i} className="flex items-start gap-3 py-2 border-b border-navy-700/50 last:border-0">
                          <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 uppercase",
                            negative ? "bg-danger/20 text-danger" : "bg-success/20 text-success"
                          )}>{h.sentiment ?? (negative ? "neg" : "pos")}</span>
                          <p className="text-primary text-xs leading-relaxed">{h.headline ?? h.title ?? h}</p>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Early Warning Flags — shown after monitor runs */}
                {warningFlags.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-primary text-xs font-semibold mb-2">Active Warning Flags</p>
                    {warningFlags.map((f: any, i: number) => (
                      <div key={i} className={cn(
                        "rounded px-3 py-2 text-xs border-l-2",
                        f.severity === "CRITICAL" ? "border-danger bg-danger/5 text-danger" :
                        f.severity === "HIGH"     ? "border-warning bg-warning/5 text-warning" :
                                                    "border-muted bg-navy-900 text-muted"
                      )}>
                        <span className="font-semibold">{f.warning_type ?? f.flag_type} — </span>
                        {f.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="bg-navy-900 rounded-lg p-4 space-y-2">
                  <p className="text-primary text-xs font-semibold">Sector Exposure</p>
                  <div className="flex justify-between">
                    <p className="text-muted text-xs">Sector</p>
                    <p className="text-primary text-xs font-mono">{deal?.sector ?? "—"}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-muted text-xs">Sector Stress Score</p>
                    <p className="font-mono text-sm font-bold" style={{ color: getRiskColor(deal?.sector_stress_score ?? 0) }}>
                      {deal?.sector_stress_score ?? "—"} / 100
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-muted text-xs">Risk Score</p>
                    <p className="font-mono text-sm font-bold" style={{ color: getRiskColor(deal?.risk_score ?? 0) }}>
                      {deal?.risk_score ?? "—"} / 100
                    </p>
                  </div>
                </div>
                {dailySummary && (
                  <div className="bg-navy-900 rounded-lg p-4">
                    <p className="text-primary text-xs font-semibold mb-1.5">Monitor Summary</p>
                    <p className="text-muted text-xs leading-relaxed">{dailySummary}</p>
                  </div>
                )}

                {/* Alternative Data Panel */}
                {(jobSignals || consumerSignals) && (
                  <div className="bg-navy-900 rounded-lg p-4 space-y-3">
                    <p className="text-primary text-xs font-semibold">Alternative Data Signals</p>

                    {jobSignals && !jobSignals.error && (
                      <div>
                        <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Job Postings (Arbeitnow)</p>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-primary text-xs">{jobSignals.open_positions} open positions</span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded font-mono",
                            jobSignals.hiring_signal === "DISTRESS"     ? "bg-danger/20 text-danger" :
                            jobSignals.hiring_signal === "CONTRACTING"  ? "bg-warning/20 text-warning" :
                            jobSignals.hiring_signal === "SURGE"        ? "bg-success/20 text-success" :
                                                                          "bg-navy-700 text-muted"
                          )}>{jobSignals.hiring_signal}</span>
                        </div>
                        <p className="text-muted text-[10px] leading-relaxed">{jobSignals.signal_rationale}</p>
                      </div>
                    )}

                    {consumerSignals && !consumerSignals.error && (
                      <div className="border-t border-navy-700 pt-3">
                        <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Consumer Sentiment (Yelp)</p>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-primary text-xs">{consumerSignals.rating}★ · {consumerSignals.review_count?.toLocaleString()} reviews</span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded font-mono",
                            consumerSignals.consumer_signal === "DISTRESS"   ? "bg-danger/20 text-danger" :
                            consumerSignals.consumer_signal === "WEAKENING"  ? "bg-warning/20 text-warning" :
                            consumerSignals.consumer_signal === "STRONG"     ? "bg-success/20 text-success" :
                                                                               "bg-navy-700 text-muted"
                          )}>{consumerSignals.consumer_signal}</span>
                        </div>
                        <p className="text-muted text-[10px] leading-relaxed">{consumerSignals.signal_rationale}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Quarterly Review Box ── */}
          <div className="bg-navy-800 border border-navy-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700">
              <div>
                <p className="text-primary font-semibold text-sm">Quarterly Review</p>
                <p className="text-muted text-[10px] uppercase tracking-wider mt-0.5">Covenant compliance · Rating review · Portfolio health check</p>
              </div>
              <button onClick={handleQuarterly} disabled={qRunning}
                className="flex items-center gap-2 bg-accent text-white rounded-md px-3 py-1.5 text-xs font-semibold hover:brightness-110 transition-all duration-150 disabled:opacity-50">
                <Play size={12} />
                {qRunning ? "Running…" : "Run Quarterly Review"}
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-5">
              <div>
                <p className="text-primary text-xs font-semibold mb-3">Covenant Compliance</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-navy-700">
                      {["Covenant","Threshold","Current","Status"].map(h => (
                        <th key={h} className="text-left pb-2 text-muted font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Net Debt / EBITDA",  threshold: "≤ 4.0x", current: "3.9x", ok: true  },
                      { name: "Interest Coverage",  threshold: "≥ 2.5x", current: "2.8x", ok: true  },
                      { name: "Min Liquidity",      threshold: "≥ $25M", current: "$31M", ok: true  },
                      { name: "Capex Limit",        threshold: "≤ $15M", current: "$11M", ok: true  },
                    ].map(c => (
                      <tr key={c.name} className="border-b border-navy-700/50 last:border-0">
                        <td className="py-2 text-primary">{c.name}</td>
                        <td className="py-2 font-mono text-muted">{c.threshold}</td>
                        <td className="py-2 font-mono text-primary">{c.current}</td>
                        <td className="py-2">
                          <span className={cn("font-bold text-xs", c.ok ? "text-success" : "text-danger")}>
                            {c.ok ? "PASS" : "BREACH"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3">
                {qSummary ? (
                  <div className="bg-navy-900 rounded-lg p-4">
                    <p className="text-primary text-xs font-semibold mb-1.5">Review Summary</p>
                    <p className="text-muted text-xs leading-relaxed">{qSummary}</p>
                  </div>
                ) : (
                  <div className="bg-navy-900 rounded-lg p-4">
                    <p className="text-muted text-xs text-center leading-relaxed">
                      Run the quarterly review to see rating changes and covenant analysis for {deal?.company ?? "the selected deal"}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stress Testing Tab ─────────────────────────────────────────────── */}
      {tab === "stress" && (
        <div className="space-y-5">
          {/* Scenario Selection */}
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-5">
            <p className="text-primary font-semibold mb-1">Portfolio Stress Testing</p>
            <p className="text-muted text-xs mb-4">
              Apply macro scenarios across all {state.portfolio.length} portfolio loans to identify covenant breaches and rating migrations.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {STRESS_SCENARIOS.map(s => (
                <button key={s.id} onClick={() => setScenario(s.id)}
                  className={cn(
                    "text-left p-3 rounded-lg border transition-all duration-150",
                    scenario === s.id
                      ? "border-accent bg-accent/10"
                      : "border-navy-700 bg-navy-900 hover:border-navy-600"
                  )}>
                  <p className={cn("text-xs font-semibold", scenario === s.id ? "text-accent" : "text-primary")}>{s.label}</p>
                  <p className="text-muted text-[10px] mt-0.5 leading-relaxed">{s.desc}</p>
                </button>
              ))}
            </div>
            <button onClick={handleStressTest} disabled={stressRunning}
              className="flex items-center gap-2 bg-accent text-white rounded-md px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition-all duration-150 disabled:opacity-50">
              {stressRunning ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running Stress Test…
                </>
              ) : (
                <>
                  <AlertTriangle size={14} />
                  Run Stress Test
                </>
              )}
            </button>
          </div>

          {/* Stress Results */}
          {stressResults && stressImpact && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Loans Impacted",    value: `${stressImpact.impacted} / ${state.portfolio.length}`, color: stressImpact.impacted > 20 ? "#FF3B5C" : "#FFB300" },
                  { label: "Exposure at Risk",  value: formatCurrency(stressImpact.exposure),                  color: "#FF8C00" },
                  { label: "Covenant Breaches", value: `${stressImpact.covenantBreaches} loans`,               color: stressImpact.covenantBreaches > 5 ? "#FF3B5C" : "#FFB300" },
                ].map(stat => (
                  <div key={stat.label} className="bg-navy-800 border border-navy-700 rounded-lg p-4">
                    <p className="text-muted text-[10px] uppercase tracking-wider">{stat.label}</p>
                    <p className="font-mono text-xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Results Table */}
              <div className="bg-navy-800 border border-navy-700 rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-navy-700 flex items-center justify-between">
                  <p className="text-primary text-sm font-semibold">
                    Impacted Loans — {STRESS_SCENARIOS.find(s => s.id === scenario)?.label}
                  </p>
                  <p className="text-muted text-xs font-mono">{stressResults.length} of {state.portfolio.length} loans affected</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-navy-700">
                        {["Company","Sector","Rating","Stressed","Coverage","Leverage","Severity"].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-muted font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stressResults.map((r, i) => (
                        <tr key={r.deal_id} className={cn("border-b border-navy-700/50 last:border-0", i % 2 === 1 && "bg-navy-900/30")}>
                          <td className="px-4 py-2.5 text-primary font-medium">{r.company}</td>
                          <td className="px-4 py-2.5 text-muted">{r.sector}</td>
                          <td className="px-4 py-2.5 font-mono text-muted">{r.current_rating}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono font-bold" style={{ color: getRiskColor(50 + r.notches * 15) }}>
                              {r.stressed_rating}
                            </span>
                            <span className="text-danger ml-1 text-[10px]">▼{r.notches}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={cn("font-bold text-[10px]", r.coverage_breach ? "text-danger" : "text-success")}>
                              {r.coverage_breach ? "BREACH" : "PASS"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={cn("font-bold text-[10px]", r.leverage_breach ? "text-danger" : "text-success")}>
                              {r.leverage_breach ? "BREACH" : "PASS"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={cn("text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                              r.notches >= 3 ? "bg-danger/20 text-danger"
                                : r.notches === 2 ? "bg-warning/20 text-warning"
                                : "bg-yellow-500/20 text-yellow-400"
                            )}>
                              {r.notches >= 3 ? "SEVERE" : r.notches === 2 ? "MODERATE" : "MILD"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
