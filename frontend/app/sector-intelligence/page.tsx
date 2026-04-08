"use client";

import { useState } from "react";
import SectorHeatMap from "@/components/ui/SectorHeatMap";
import ContagionCard from "@/components/ui/ContagionCard";
import SectorForecastChart from "@/components/ui/SectorForecastChart";
import { useCredit } from "@/context/CreditContext";
import { formatDate, getRiskColor } from "@/lib/utils";
import type { ContagionEvent } from "@/lib/types";
import { getSectorContagion } from "@/lib/api";

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
    { deal_id: "DEAL-003", company: "Boeing Company", exposure_type: "supply_chain",
      severity_tier: "medium", estimated_impact_min: 800_000, estimated_impact_max: 2_400_000,
      rationale: "Boeing's manufacturing operations consume significant petrochemical inputs. Sustained energy price elevation raises operating costs by an estimated 3-5%.",
      covenant_at_risk: undefined },
  ],
};

// Build forecast data from mock heat map
function buildForecast(sectorData: ReturnType<typeof useCredit>["state"]["sectorData"]) {
  if (!sectorData) return {};
  const result: Record<string, Array<{ date: string; score: number }>> = {};
  const points = [...sectorData.time_series.slice(-20), ...sectorData.forecast];
  sectorData.sectors.forEach((s) => {
    result[s] = points.map((p) => ({ date: p.date, score: Math.round(p.scores[s] ?? 0) }));
  });
  return result;
}

export default function SectorIntelligence() {
  const { state } = useCredit();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [contagion, setContagion] = useState<ContagionEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const { sectorData, portfolio } = state;
  const lastUpdated = sectorData?.last_updated ? formatDate(sectorData.last_updated) : "—";

  async function handleSectorClick(sector: string) {
    setSelectedSector(sector);
    setLoading(true);
    try {
      const res = await getSectorContagion(sector);
      setContagion(res.affected_loans);
    } catch {
      setContagion(MOCK_CONTAGION[sector] ?? []);
    } finally {
      setLoading(false);
    }
  }

  // Active sector alerts (stress > 65)
  const stressedSectors = sectorData
    ? sectorData.sectors.map((s) => {
        const latest = sectorData.time_series[sectorData.time_series.length - 1];
        return { sector: s, score: Math.round(latest?.scores[s] ?? 0) };
      }).filter((s) => s.score > 55).sort((a, b) => b.score - a.score).slice(0, 5)
    : [];

  const forecasts = buildForecast(sectorData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-primary font-bold text-lg">Sector Intelligence Hub</h2>
          <p className="text-muted text-xs font-mono mt-0.5">Last updated: {lastUpdated} · 11 sectors monitored · {portfolio.length} loans tracked</p>
        </div>
        <button
          onClick={() => { setSelectedSector(null); setContagion([]); }}
          className="bg-accent text-white rounded-md px-4 py-2 text-sm font-semibold hover:brightness-110 transition-all duration-150">
          Run Analysis
        </button>
      </div>

      {/* Full Heat Map */}
      {sectorData && (
        <SectorHeatMap data={sectorData} onSectorClick={handleSectorClick} />
      )}

      {/* Three columns */}
      <div className="grid grid-cols-3 gap-5">
        {/* Active Sector Alerts */}
        <div className="space-y-3">
          <p className="text-primary text-sm font-semibold">Active Sector Alerts</p>
          {stressedSectors.length === 0 && (
            <p className="text-muted text-xs">All sectors within baseline</p>
          )}
          {stressedSectors.map(({ sector, score }) => {
            const color = getRiskColor(score);
            const loans = portfolio.filter((d) => d.sector === sector).length;
            return (
              <button key={sector} onClick={() => handleSectorClick(sector)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg p-4 text-left hover:border-navy-600 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-primary text-sm font-semibold">{sector}</p>
                  <span className="font-mono text-lg font-bold" style={{ color }}>{score}</span>
                </div>
                <div className="w-full bg-navy-700 rounded-full h-1.5 mb-2">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
                </div>
                <p className="text-muted text-[10px]">{loans} portfolio loan{loans !== 1 ? "s" : ""} in this sector</p>
              </button>
            );
          })}
        </div>

        {/* Contagion Analysis */}
        <div className="space-y-3">
          <p className="text-primary text-sm font-semibold">
            {selectedSector ? `Contagion — ${selectedSector}` : "Contagion Analysis"}
          </p>
          {!selectedSector && (
            <div className="bg-navy-800 border border-navy-700 rounded-lg p-5 text-center">
              <p className="text-muted text-xs">Click a sector on the heat map or an alert card to run contagion analysis</p>
            </div>
          )}
          {loading && (
            <div className="bg-navy-800 border border-navy-700 rounded-lg p-5 text-center">
              <p className="text-accent text-xs">Analyzing portfolio exposure…</p>
            </div>
          )}
          {!loading && contagion.map((loan) => (
            <ContagionCard key={loan.deal_id} loan={loan} />
          ))}
          {!loading && selectedSector && contagion.length === 0 && (
            <div className="bg-navy-800 border border-navy-700 rounded-lg p-5 text-center">
              <p className="text-success text-xs">No portfolio exposure to {selectedSector} sector event</p>
            </div>
          )}
        </div>

        {/* Forecast Chart */}
        <div>
          <p className="text-primary text-sm font-semibold mb-3">30-Day Forecast</p>
          <SectorForecastChart forecasts={forecasts} />
        </div>
      </div>

      {/* Portfolio Sector Exposure Table */}
      <div className="bg-navy-800 border border-navy-700 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-navy-700">
          <p className="text-primary text-sm font-semibold">Portfolio Sector Exposure</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-700">
              {["Company","Sector","Industry","Loan Amount","Sector Stress","Status"].map((h) => (
                <th key={h} className="text-left px-5 py-2 text-muted text-xs font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {portfolio.map((deal, i) => {
              const color = getRiskColor(deal.sector_stress_score);
              return (
                <tr key={deal.deal_id} className={`border-b border-navy-700/50 hover:bg-navy-700/20 transition-colors ${i % 2 === 1 ? "bg-navy-900/20" : ""}`}>
                  <td className="px-5 py-3">
                    <p className="text-primary font-medium">{deal.company}</p>
                    <p className="text-muted text-xs font-mono">{deal.ticker}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full border" style={{ borderColor: color + "50", color }}>
                      {deal.sector}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted text-xs">{deal.industry}</td>
                  <td className="px-5 py-3 font-mono text-primary text-xs">
                    ${(deal.loan_amount / 1_000_000).toFixed(0)}M
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-navy-700 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${deal.sector_stress_score}%`, backgroundColor: color }} />
                      </div>
                      <span className="font-mono text-xs" style={{ color }}>{deal.sector_stress_score}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-mono font-bold capitalize ${
                      deal.status === "stressed" ? "text-danger" :
                      deal.status === "watchlist" ? "text-warning" : "text-success"
                    }`}>{deal.status}</span>
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
