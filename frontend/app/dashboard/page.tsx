"use client";

import Link from "next/link";
import { DollarSign, Briefcase, FileSearch, AlertTriangle } from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import AlertCard from "@/components/ui/AlertCard";
import RatingBadge from "@/components/ui/RatingBadge";
import RiskGauge from "@/components/ui/RiskGauge";
import SectorHeatMap from "@/components/ui/SectorHeatMap";
import { useCredit } from "@/context/CreditContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import { resolveAlert } from "@/lib/api";

export default function Dashboard() {
  const { state, dispatch } = useCredit();
  const { portfolio, activeAlerts, sectorData } = state;

  const totalExposure  = portfolio.reduce((s, d) => s + d.loan_amount, 0);
  const activeLoans    = portfolio.filter((d) => d.status !== "stressed").length;
  const inDiligence    = 0;
  const criticalAlerts = activeAlerts.filter((a) => a.severity === "CRITICAL" && !a.resolved).length;

  const topAlerts = activeAlerts.filter((a) => !a.resolved).slice(0, 5);

  async function handleResolve(id: string) {
    try { await resolveAlert(id); } catch {}
    dispatch({ type: "RESOLVE_ALERT", payload: id });
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Exposure"   value={totalExposure}  isCurrency icon={DollarSign} />
        <MetricCard label="Active Loans"     value={activeLoans}               icon={Briefcase} />
        <MetricCard label="In Diligence"     value={inDiligence}               icon={FileSearch} />
        <MetricCard label="Critical Alerts"  value={criticalAlerts}            icon={AlertTriangle} />
      </div>

      {/* Heat Map */}
      {sectorData && (
        <Link href="/sector-intelligence" className="block hover:opacity-90 transition-opacity">
          <SectorHeatMap data={sectorData} mini />
          <p className="text-muted text-[10px] text-right mt-1 font-mono">Click to open Sector Intelligence Hub →</p>
        </Link>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent Deals */}
        <div className="col-span-2 bg-navy-800 border border-navy-700 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-navy-700">
            <p className="text-primary text-sm font-semibold">Portfolio Deals</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700">
                {["Company","Rating","Risk","Sector","Reviewed"].map((h) => (
                  <th key={h} className="text-left px-5 py-2 text-muted text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {portfolio.map((deal, i) => (
                <tr key={deal.deal_id} className={`border-b border-navy-700/50 hover:bg-navy-700/30 transition-colors ${i % 2 === 1 ? "bg-navy-900/30" : ""}`}>
                  <td className="px-5 py-3">
                    <p className="text-primary font-medium">{deal.company}</p>
                    <p className="text-muted text-xs font-mono">{deal.ticker}</p>
                  </td>
                  <td className="px-5 py-3"><RatingBadge rating={deal.internal_rating} /></td>
                  <td className="px-5 py-3"><RiskGauge score={deal.risk_score} size="sm" /></td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-muted font-mono">{deal.sector}</span>
                  </td>
                  <td className="px-5 py-3 text-muted text-xs font-mono">{formatDate(deal.last_reviewed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Alerts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-primary text-sm font-semibold">Active Alerts</p>
            <Link href="/alerts" className="text-accent text-xs hover:underline">View all →</Link>
          </div>
          {topAlerts.length === 0 && (
            <p className="text-muted text-sm text-center py-8">No active alerts</p>
          )}
          {topAlerts.map((a) => (
            <AlertCard key={a.alert_id} alert={a} onResolve={handleResolve} />
          ))}
        </div>
      </div>
    </div>
  );
}
