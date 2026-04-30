"use client";

import { useEffect, useState } from "react";
import { Shield, AlertTriangle, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { getPortfolioCompliance } from "@/lib/api";
import type { PortfolioComplianceSummary } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Shield }> = {
  COMPLIANT: { label: "Policy Compliant",   color: "#00D4A4", bg: "bg-success/5",  border: "border-success/30",  icon: CheckCircle },
  WARNING:   { label: "Soft Limit Warnings", color: "#FFB300", bg: "bg-warning/5",  border: "border-warning/30",  icon: AlertCircle },
  BREACH:    { label: "Policy Breach",       color: "#FF3B5C", bg: "bg-danger/5",   border: "border-danger/30",   icon: AlertTriangle },
  empty:     { label: "No Portfolio Yet",    color: "#6B7FA3", bg: "bg-white/[0.02]", border: "border-white/[0.08]", icon: Shield },
};

export default function PolicyComplianceBanner() {
  const [data, setData] = useState<PortfolioComplianceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPortfolioCompliance()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, []);

  if (error || !data) return null;

  const cfg = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.empty;
  const Icon = cfg.icon;

  // Sort sectors and sponsors by % NAV descending
  const sectors = Object.entries(data.sector_concentration ?? {})
    .sort((a, b) => b[1].pct_nav - a[1].pct_nav);
  const sponsors = Object.entries(data.sponsor_concentration ?? {})
    .sort((a, b) => b[1].pct_nav - a[1].pct_nav)
    .slice(0, 5);

  return (
    <div className={cn("rounded-lg border", cfg.bg, cfg.border)}>
      {/* Header strip */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon size={18} style={{ color: cfg.color }} />
          <div>
            <div className="flex items-center gap-3">
              <p className="text-primary text-sm font-semibold">Fund Policy Status</p>
              <span
                className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border"
                style={{ color: cfg.color, borderColor: cfg.color + "55" }}
              >
                {cfg.label}
              </span>
            </div>
            <p className="text-muted text-[11px] mt-0.5">
              {data.total_deals} deals · {formatCurrency(data.total_deployed_usd ?? 0)} deployed ·{" "}
              {data.deployment_pct?.toFixed(1)}% of $8B mandate
              {data.watch_list_count > 0 && (
                <>
                  {" · "}
                  <span className="text-warning font-mono">{data.watch_list_count} watchlist</span>
                </>
              )}
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
      </button>

      {open && (
        <div className="border-t border-white/[0.06] px-4 py-4 space-y-4">
          {/* Breaches and warnings */}
          {(data.policy_breaches?.length ?? 0) > 0 && (
            <div>
              <p className="text-danger text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                Hard Breaches
              </p>
              <ul className="space-y-1">
                {data.policy_breaches?.map((b, i) => (
                  <li key={i} className="text-danger text-xs leading-relaxed">{b}</li>
                ))}
              </ul>
            </div>
          )}
          {(data.warnings?.length ?? 0) > 0 && (
            <div>
              <p className="text-warning text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                Soft Warnings
              </p>
              <ul className="space-y-1">
                {data.warnings?.map((w, i) => (
                  <li key={i} className="text-warning text-xs leading-relaxed">{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sector concentration */}
          {sectors.length > 0 && (
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                Sector Concentration (% of $1B fund mandate)
              </p>
              <div className="space-y-1.5">
                {sectors.map(([sector, info]) => {
                  const pct = info.pct_nav;
                  const tone = pct >= 25 ? "text-danger" : pct >= 20 ? "text-warning" : "text-muted";
                  return (
                    <div key={sector} className="flex items-center gap-3">
                      <span className="text-primary text-xs w-44 shrink-0 truncate">{sector}</span>
                      <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(pct * 4, 100)}%`,
                            background: pct >= 25 ? "#FF3B5C" : pct >= 20 ? "#FFB300" : "#7B8FF7",
                          }}
                        />
                      </div>
                      <span className={cn("text-xs font-mono w-16 text-right", tone)}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top sponsors */}
          {sponsors.length > 0 && (
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                Top Sponsor Concentration
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {sponsors.map(([sp, info]) => (
                  <div key={sp} className="flex justify-between">
                    <span className="text-primary text-xs truncate">{sp}</span>
                    <span className={cn("text-xs font-mono", info.pct_nav >= 15 ? "text-warning" : "text-muted")}>
                      {info.pct_nav.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other portfolio metrics */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-white/[0.04]">
            <span className="text-muted text-[11px]">
              Non-sponsored: <span className={cn("font-mono", data.non_sponsored_pct >= 20 ? "text-warning" : "text-primary")}>{data.non_sponsored_pct?.toFixed(1)}%</span>
            </span>
            <span className="text-muted text-[11px]">
              Distressed: <span className={cn("font-mono", data.distressed_pct >= 10 ? "text-warning" : "text-primary")}>{data.distressed_pct?.toFixed(1)}%</span>
            </span>
            {data.watch_list_count > 0 && (
              <span className="text-muted text-[11px]">
                Watch list: <span className="text-warning font-mono">{data.watch_list_count} deals</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
