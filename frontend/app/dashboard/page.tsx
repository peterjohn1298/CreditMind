"use client";

import Link from "next/link";
import { DollarSign, Briefcase, FileSearch, AlertTriangle } from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import AlertCard from "@/components/ui/AlertCard";
import RatingBadge from "@/components/ui/RatingBadge";
import RiskGauge from "@/components/ui/RiskGauge";
import SectorHeatMap from "@/components/ui/SectorHeatMap";
import PortfolioCharts from "@/components/ui/PortfolioCharts";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";
import { useCredit } from "@/context/CreditContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import { resolveAlert } from "@/lib/api";

export default function Dashboard() {
  const { state, dispatch } = useCredit();
  const { portfolio, activeAlerts, sectorData } = state;

  const loading = portfolio.length === 0;

  const totalExposure  = portfolio.reduce((s, d) => s + d.loan_amount, 0);
  const activeLoans    = portfolio.filter((d) => d.status !== "stressed").length;
  const watchlist      = portfolio.filter((d) => d.status === "watchlist" || d.status === "stressed").length;
  const criticalAlerts = activeAlerts.filter((a) => a.severity === "CRITICAL" && !a.resolved).length;

  const topAlerts = activeAlerts.filter((a) => !a.resolved).slice(0, 5);

  async function handleResolve(id: string) {
    try { await resolveAlert(id); } catch {}
    dispatch({ type: "RESOLVE_ALERT", payload: id });
  }

  return (
    <div className="space-y-5">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="animate-fade-up delay-100"><MetricCard label="Total Exposure"  rawValue={totalExposure}  formatter={formatCurrency} icon={DollarSign}    variant="accent" /></div>
            <div className="animate-fade-up delay-200"><MetricCard label="Active Loans"    rawValue={activeLoans}                                     icon={Briefcase}     variant="success" /></div>
            <div className="animate-fade-up delay-250"><MetricCard label="On Watchlist"    rawValue={watchlist}                                       icon={AlertTriangle} variant="warning" /></div>
            <div className="animate-fade-up delay-300"><MetricCard label="Critical Alerts" rawValue={criticalAlerts}                                  icon={AlertTriangle} variant="danger" /></div>
          </>
        )}
      </div>

      {/* Portfolio Analytics Charts */}
      {!loading && <div className="animate-fade-up delay-200"><PortfolioCharts portfolio={portfolio} /></div>}

      {/* Heat Map */}
      {sectorData && (
        <div className="animate-fade-up delay-300">
          <Link href="/sector-intelligence" className="block hover:opacity-90 transition-opacity">
            <SectorHeatMap data={sectorData} mini />
            <p className="text-muted text-[10px] text-right mt-1 font-mono">Click to open Sector Intelligence Hub</p>
          </Link>
        </div>
      )}

      {/* Bottom Row: Table + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Deals */}
        <div className="lg:col-span-2 glass rounded-lg overflow-hidden animate-fade-up delay-400">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-primary text-sm font-semibold">Portfolio Deals</p>
            <Link href="/portfolio" className="text-accent text-xs hover:underline font-medium">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Company","Rating","Risk","Sector","Reviewed"].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-muted text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonTable rows={8} />
                ) : portfolio.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <p className="text-muted text-sm">No deals in portfolio</p>
                      <p className="text-muted text-xs mt-1">Add deals through the Underwriting module</p>
                    </td>
                  </tr>
                ) : (
                  portfolio.slice(0, 10).map((deal, i) => (
                    <tr key={deal.deal_id} className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${i % 2 === 1 ? "bg-white/[0.015]" : ""}`}>
                      <td className="px-5 py-2.5">
                        <Link href={`/deal/${deal.deal_id}`} className="hover:text-accent transition-colors">
                          <p className="text-primary font-medium text-xs">{deal.company}</p>
                          <p className="text-muted text-[10px] font-mono">{deal.sponsor}</p>
                        </Link>
                      </td>
                      <td className="px-5 py-2.5"><RatingBadge rating={deal.internal_rating} /></td>
                      <td className="px-5 py-2.5"><RiskGauge score={deal.risk_score} size="sm" /></td>
                      <td className="px-5 py-2.5">
                        <span className="text-xs text-muted font-mono">{deal.sector}</span>
                      </td>
                      <td className="px-5 py-2.5 text-muted text-xs font-mono whitespace-nowrap">{formatDate(deal.last_reviewed ?? "")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts Sidebar */}
        <div className="space-y-3 animate-fade-up delay-500">
          <div className="flex items-center justify-between">
            <p className="text-primary text-sm font-semibold">Active Alerts</p>
            <Link href="/alerts" className="text-accent text-xs hover:underline font-medium">View all</Link>
          </div>
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-navy-800 border border-navy-700 rounded-lg p-4 space-y-2 animate-pulse">
                  <div className="h-3 bg-navy-700 rounded w-3/4" />
                  <div className="h-3 bg-navy-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}
          {!loading && topAlerts.length === 0 && (
            <div className="glass rounded-lg p-8 text-center border border-success/20">
              <p className="text-success text-sm font-medium">No active alerts</p>
              <p className="text-muted text-xs mt-1">All deals within normal parameters</p>
            </div>
          )}
          {!loading && topAlerts.map((a) => (
            <AlertCard key={a.alert_id} alert={a} onResolve={handleResolve} />
          ))}
        </div>
      </div>
    </div>
  );
}
