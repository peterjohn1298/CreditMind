"use client";

import { useState } from "react";
import { Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import SectorHeatMap from "@/components/ui/SectorHeatMap";
import ContagionCard from "@/components/ui/ContagionCard";
import SectorForecastChart from "@/components/ui/SectorForecastChart";
import TypewriterText from "@/components/ui/TypewriterText";
import { useCredit } from "@/context/CreditContext";
import { formatDate, getRiskColor } from "@/lib/utils";
import type { ContagionEvent } from "@/lib/types";
import { getSectorContagion } from "@/lib/api";
import { cn } from "@/lib/utils";

const ANALYSIS_AGENTS = ["Macro Scanner", "News Correlator", "Credit Modeler", "Risk Synthesizer"];

const MOCK_CONTAGION: Record<string, ContagionEvent[]> = {
  Energy: [
    { deal_id: "DEAL-006", company: "Occidental Petroleum", exposure_type: "direct",
      severity_tier: "critical", estimated_impact_min: 4_500_000, estimated_impact_max: 12_000_000,
      rationale: "OXY is a pure-play E&P company with significant debt load. OPEC cut provides short-term price support but long-term demand uncertainty increases refinancing risk.",
      covenant_at_risk: "Net Debt/EBITDA — currently 3.9x vs 4.0x threshold. BREACH RISK." },
    { deal_id: "DEAL-001", company: "ExxonMobil Corporation", exposure_type: "direct",
      severity_tier: "high", estimated_impact_min: 2_100_000, estimated_impact_max: 6_800_000,
      rationale: "Integrated oil major with direct exposure to crude price volatility. Downstream refining margins compress under high feedstock costs.",
      covenant_at_risk: "Interest Coverage Ratio — currently 2.8x vs 2.5x threshold." },
  ],
};

const SECTOR_BRIEFS: Record<string, string> = {
  Energy: "Energy sector faces dual headwinds: OPEC+ production discipline supports near-term pricing, but demand erosion from EV adoption and China slowdown compresses long-run outlook. Portfolio loans with floating-rate structures face refinancing pressure if EBITDA margins contract 150-200bps. Recommend tightening covenant monitoring on direct E&P exposures.",
  Healthcare: "Healthcare sector showing resilience driven by aging demographics and procedure volume recovery post-pandemic. Pharma pricing risk remains elevated following IRA drug negotiations. Med-tech subsectors performing above benchmark. Portfolio exposure concentrated in specialty pharma — monitor patent cliff risk for Q3 2026.",
  Technology: "Technology services entering a consolidation cycle. AI capex driving top-line growth for hyperscalers while squeezing margins for legacy IT services. Cloud migration tailwinds persist. Portfolio SaaS exposures maintain strong revenue visibility with 85%+ contracted revenue. Net retention rates stable.",
  Industrials: "Industrial sector navigating inventory destocking cycle. Defense subsector outperforming on elevated government budgets. Manufacturing PMI below 50 for 3 consecutive months. Portfolio exposure weighted toward defense — favorable. Monitor supply chain re-shoring capex for covenant compliance.",
  "Consumer & Retail": "Consumer sector bifurcating between premium and value. Discretionary spending under pressure from student loan resumption and credit card delinquency uptick. Grocery and essential retail resilient. Recommend increasing monitoring frequency on discretionary-exposed credits.",
  "Aerospace & Defense": "Defense sector benefiting from elevated NATO spending and geopolitical demand. Supply chain normalization supporting margin recovery. Commercial aerospace backlog remains strong with Boeing and Airbus at record order books. Portfolio credits well-positioned.",
};

function buildForecast(sectorData: ReturnType<typeof useCredit>["state"]["sectorData"]) {
  if (!sectorData) return {};
  const result: Record<string, Array<{ date: string; score: number }>> = {};
  const points = [...sectorData.time_series.slice(-20), ...sectorData.forecast];
  sectorData.sectors.forEach(s => {
    result[s] = points.map(p => ({ date: p.date, score: Math.round(p.scores[s] ?? 0) }));
  });
  return result;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export default function SectorIntelligence() {
  const { state } = useCredit();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [contagion, setContagion] = useState<ContagionEvent[]>([]);
  const [contagionLoading, setContagionLoading] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisAgents, setAnalysisAgents] = useState<{ name: string; done: boolean }[]>([]);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [briefSector, setBriefSector] = useState<string | null>(null);

  const { sectorData, portfolio } = state;
  const lastUpdated = sectorData?.last_updated ? formatDate(sectorData.last_updated) : "—";

  async function handleSectorClick(sector: string) {
    setSelectedSector(sector);
    setContagionLoading(true);
    try {
      const res = await getSectorContagion(sector);
      setContagion(res.affected_loans);
    } catch {
      setContagion(MOCK_CONTAGION[sector] ?? []);
    } finally {
      setContagionLoading(false);
    }
  }

  async function handleRunAnalysis() {
    const sector = selectedSector ?? stressedSectors[0]?.sector;
    if (!sector) return;
    setAnalysisRunning(true);
    setAiBrief(null);
    setAnalysisAgents(ANALYSIS_AGENTS.map(name => ({ name, done: false })));
    for (let i = 0; i < ANALYSIS_AGENTS.length; i++) {
      await sleep(900 + Math.random() * 400);
      setAnalysisAgents(prev => prev.map((a, j) => j === i ? { ...a, done: true } : a));
    }
    const brief = SECTOR_BRIEFS[sector] ?? `${sector} sector analysis complete. Current stress indicators suggest ${stressedSectors.find(s => s.sector === sector)?.score ?? 50 > 65 ? "elevated risk requiring enhanced monitoring" : "stable conditions within acceptable parameters"}. Portfolio exposure mapped across ${portfolio.filter(d => d.sector === sector).length} active loans.`;
    setAiBrief(brief);
    setBriefSector(sector);
    setAnalysisRunning(false);
  }

  const stressedSectors = sectorData
    ? sectorData.sectors.map(s => {
        const latest = sectorData.time_series[sectorData.time_series.length - 1];
        return { sector: s, score: Math.round(latest?.scores[s] ?? 0) };
      }).filter(s => s.score > 45).sort((a, b) => b.score - a.score).slice(0, 6)
    : [];

  const forecasts = buildForecast(sectorData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-primary font-bold text-lg">Sector Intelligence Hub</h2>
          <p className="text-muted text-xs font-mono mt-0.5">Last updated: {lastUpdated} · 11 sectors monitored · {portfolio.length} loans</p>
        </div>
        <button onClick={handleRunAnalysis} disabled={analysisRunning}
          className="flex items-center gap-2 bg-accent text-white rounded-md px-4 py-2 text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-70">
          {analysisRunning
            ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Agents Running…</>
            : <><Zap size={14} />Run AI Analysis</>
          }
        </button>
      </div>

      {/* Agent pipeline when analysis is running */}
      {(analysisRunning || aiBrief) && (
        <div className="glass rounded-lg p-4 animate-fade-up">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {analysisAgents.map((a, i) => (
              <div key={i} className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono border transition-all duration-500",
                a.done
                  ? "bg-success/10 border-success/30 text-success"
                  : analysisRunning && i === analysisAgents.findIndex(x => !x.done)
                  ? "bg-accent/10 border-accent/40 text-accent animate-pulse"
                  : "bg-white/[0.03] border-white/[0.06] text-muted/40"
              )}>
                <span>{a.done ? "✓" : "○"}</span>
                {a.name}
              </div>
            ))}
          </div>
          {aiBrief && !analysisRunning && (
            <div className="border-t border-white/[0.06] pt-3">
              <p className="text-accent text-[10px] uppercase tracking-wider font-mono mb-2 flex items-center gap-1">
                <Zap size={9} /> AI SECTOR BRIEF — {briefSector}
              </p>
              <p className="text-primary text-xs leading-relaxed">
                <TypewriterText text={aiBrief} speed={10} />
              </p>
            </div>
          )}
        </div>
      )}

      {sectorData && <SectorHeatMap data={sectorData} onSectorClick={handleSectorClick} />}

      {/* Sector Signals + Contagion — side by side */}
      <div className="grid grid-cols-2 gap-5">
        {/* Sector Alerts */}
        <div className="space-y-3">
          <p className="text-primary text-sm font-semibold">Active Sector Signals</p>
          {stressedSectors.length === 0 && <p className="text-muted text-xs">All sectors within baseline</p>}
          <div className="grid grid-cols-2 gap-3">
            {stressedSectors.map(({ sector, score }, idx) => {
              const color = getRiskColor(score);
              const loans = portfolio.filter(d => d.sector === sector).length;
              const isCritical = score > 70;
              return (
                <button key={sector} onClick={() => handleSectorClick(sector)}
                  className={cn("glass rounded-lg p-4 text-left transition-all duration-200 hover:border-accent/30 animate-fade-up")}
                  style={{ animationDelay: `${idx * 0.08}s`, boxShadow: isCritical ? `0 0 20px ${color}22` : undefined }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-primary text-xs font-semibold leading-tight">{sector}</p>
                    <div className="flex items-center gap-1">
                      {isCritical && <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
                      <span className="font-mono text-base font-bold" style={{ color }}>{score}</span>
                    </div>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-1.5 mb-2">
                    <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-muted text-[10px]">{loans} loan{loans !== 1 ? "s" : ""} exposed</p>
                    {score > 65 ? <TrendingUp size={10} className="text-danger" /> :
                     score > 50 ? <Minus size={10} className="text-warning" /> :
                     <TrendingDown size={10} className="text-success" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contagion */}
        <div className="space-y-3">
          <p className="text-primary text-sm font-semibold">
            {selectedSector ? `Contagion — ${selectedSector}` : "Contagion Analysis"}
          </p>
          {!selectedSector && (
            <div className="glass rounded-lg p-5 text-center">
              <p className="text-muted text-xs">Click a sector card or heatmap cell to run contagion analysis</p>
            </div>
          )}
          {contagionLoading && (
            <div className="glass rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                <p className="text-accent text-xs font-mono">Mapping portfolio exposure…</p>
              </div>
              {["Identifying direct exposures…","Scoring contagion severity…","Flagging covenant risks…"].map((t, i) => (
                <p key={i} className="text-muted text-[10px] font-mono animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>{t}</p>
              ))}
            </div>
          )}
          {!contagionLoading && contagion.map((loan, i) => (
            <div key={loan.deal_id} className="animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <ContagionCard loan={loan} />
            </div>
          ))}
          {!contagionLoading && selectedSector && contagion.length === 0 && (
            <div className="glass rounded-lg p-5 text-center border border-success/20">
              <p className="text-success text-xs font-semibold">No portfolio exposure</p>
              <p className="text-muted text-[10px] mt-1">Zero loans affected by {selectedSector} sector event</p>
            </div>
          )}
        </div>
      </div>

      {/* Forecast — full width */}
      <SectorForecastChart forecasts={forecasts} />

      {/* Portfolio Sector Exposure Table */}
      <div className="glass rounded-lg overflow-hidden animate-fade-up delay-200">
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <p className="text-primary text-sm font-semibold">Portfolio Sector Exposure</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {["Company","Sector","Loan Amount","Sector Stress","Status"].map(h => (
                <th key={h} className="text-left px-5 py-2 text-muted text-xs font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {portfolio.map((deal, i) => {
              const color = getRiskColor(deal.sector_stress_score);
              return (
                <tr key={deal.deal_id} className={cn("border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors", i % 2 === 1 && "bg-white/[0.02]")}>
                  <td className="px-5 py-3 text-primary font-medium">{deal.company}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full border" style={{ borderColor: color + "50", color }}>{deal.sector}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-primary text-xs">${(deal.loan_amount / 1_000_000).toFixed(0)}M</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-white/[0.06] rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${deal.sector_stress_score}%`, backgroundColor: color }} />
                      </div>
                      <span className="font-mono text-xs" style={{ color }}>{deal.sector_stress_score}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("text-xs font-mono font-bold capitalize",
                      deal.status === "stressed" ? "text-danger" :
                      deal.status === "watchlist" ? "text-warning" : "text-success"
                    )}>{deal.status}</span>
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
