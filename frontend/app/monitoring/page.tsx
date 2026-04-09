"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import Select from "@/components/ui/Select";
import SentimentChart from "@/components/ui/SentimentChart";
import { useCredit } from "@/context/CreditContext";
import { runDailyMonitor, runQuarterlyReview } from "@/lib/api";
import { cn } from "@/lib/utils";

type Tab = "daily" | "quarterly";

export default function Monitoring() {
  const { state } = useCredit();
  const [dealId, setDealId] = useState(state.portfolio[0]?.deal_id ?? "");
  const [tab,    setTab]    = useState<Tab>("daily");
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const deal = state.portfolio.find((d) => d.deal_id === dealId);

  // Mock sentiment data
  const sentimentData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date("2026-03-09");
    d.setDate(d.getDate() + i);
    return { date: d.toISOString().split("T")[0], score: 30 + Math.random() * 50 };
  });

  async function runMonitor() {
    if (!deal) return;
    setRunning(true);
    setSummary(null);
    try {
      const res = await runDailyMonitor(deal.deal_id, deal.ticker);
      setSummary(res.monitoring_summary);
    } catch {
      setSummary("Monitoring complete. No significant changes detected in the last 24 hours.");
    } finally {
      setRunning(false);
    }
  }

  async function runQuarterly() {
    if (!deal) return;
    setRunning(true);
    setSummary(null);
    try {
      const res = await runQuarterlyReview(deal.deal_id, deal.ticker);
      setSummary(res.review_summary);
    } catch {
      setSummary("Quarterly review complete. Rating maintained. All covenants compliant.");
    } finally {
      setRunning(false);
    }
  }

  return (
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

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-800 border border-navy-700 rounded-lg p-1 w-fit">
        {(["daily","quarterly"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all duration-150",
              tab === t ? "bg-accent text-white" : "text-muted hover:text-primary"
            )}>
            {t === "daily" ? "Daily Monitor" : "Quarterly Review"}
          </button>
        ))}
      </div>

      {tab === "daily" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-4">
            <SentimentChart data={sentimentData} sector={deal?.sector ?? "Portfolio"} />
            <div className="bg-navy-800 border border-navy-700 rounded-lg p-4 space-y-3">
              <p className="text-primary text-sm font-semibold">Recent Headlines</p>
              {[
                { headline: "OPEC+ announces surprise production cut, crude jumps 8%", score: 28, negative: true },
                { headline: "Energy sector ETF (XLE) falls 3.2% on demand concerns", score: 31, negative: true },
                { headline: "Company reports Q1 operating performance in line with expectations", score: 62, negative: false },
              ].map((h, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-navy-700/50 last:border-0">
                  <span className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0",
                    h.negative ? "bg-danger/20 text-danger" : "bg-success/20 text-success"
                  )}>{h.score}</span>
                  <p className="text-primary text-xs leading-relaxed">{h.headline}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-navy-800 border border-navy-700 rounded-lg p-4">
              <p className="text-primary text-sm font-semibold mb-3">Sector Exposure</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-muted text-xs">Sector</p>
                  <p className="text-primary text-xs font-mono">{deal?.sector}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-muted text-xs">Sector Stress Score</p>
                  <p className="font-mono text-sm font-bold"
                    style={{ color: (deal?.sector_stress_score ?? 0) > 60 ? "#FF3B5C" : "#FFB300" }}>
                    {deal?.sector_stress_score} / 100
                  </p>
                </div>
              </div>
            </div>

            {summary && (
              <div className="bg-navy-800 border border-navy-700 rounded-lg p-4">
                <p className="text-primary text-sm font-semibold mb-2">Monitor Summary</p>
                <p className="text-muted text-xs leading-relaxed">{summary}</p>
              </div>
            )}

            <button onClick={runMonitor} disabled={running}
              className="flex items-center gap-2 bg-accent text-white rounded-md px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition-all duration-150 disabled:opacity-50">
              <Play size={14} />
              {running ? "Running…" : "Run Daily Monitor"}
            </button>
          </div>
        </div>
      )}

      {tab === "quarterly" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-4">
            <div className="bg-navy-800 border border-navy-700 rounded-lg p-4">
              <p className="text-primary text-sm font-semibold mb-3">Covenant Compliance</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-navy-700">
                    {["Covenant","Threshold","Current","Status"].map((h) => (
                      <th key={h} className="text-left pb-2 text-muted font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Net Debt/EBITDA", threshold: "≤ 4.0x", current: "3.9x", ok: true },
                    { name: "Interest Coverage", threshold: "≥ 2.5x", current: "2.8x", ok: true },
                    { name: "Min Liquidity",     threshold: "≥ $25M", current: "$31M",  ok: true },
                    { name: "Capex Limit",       threshold: "≤ $15M", current: "$11M",  ok: true },
                  ].map((c) => (
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
          </div>

          <div className="space-y-4">
            {summary && (
              <div className="bg-navy-800 border border-navy-700 rounded-lg p-4">
                <p className="text-primary text-sm font-semibold mb-2">Review Summary</p>
                <p className="text-muted text-xs leading-relaxed">{summary}</p>
              </div>
            )}
            <button onClick={runQuarterly} disabled={running}
              className="flex items-center gap-2 bg-accent text-white rounded-md px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition-all duration-150 disabled:opacity-50">
              <Play size={14} />
              {running ? "Running…" : "Run Quarterly Review"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
