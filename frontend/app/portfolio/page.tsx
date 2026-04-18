"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import Select from "@/components/ui/Select";
import RatingBadge from "@/components/ui/RatingBadge";
import RiskGauge from "@/components/ui/RiskGauge";
import { useCredit } from "@/context/CreditContext";
import { formatCurrency, formatDate, getRiskColor, cn } from "@/lib/utils";
import type { Deal } from "@/lib/types";

const SECTORS  = ["All","Aerospace & Defense","Healthcare","Industrials","Consumer & Retail","Technology Services","Energy","Food & Agriculture","Logistics","Specialty Chemicals","Financial Services"];
const STATUSES = ["All","current","watchlist","stressed"];

export default function Portfolio() {
  const { state } = useCredit();
  const [sector,  setSector]  = useState("All");
  const [status,  setStatus]  = useState("All");
  const [selected, setSelected] = useState<Deal | null>(null);
  const [tab, setTab] = useState<"summary"|"covenants"|"sector">("summary");

  const deals = state.portfolio.filter((d) =>
    (sector === "All" || d.sector === sector) &&
    (status === "All" || d.status === status)
  );

  return (
    <div className="flex gap-6 h-full">
      {/* Main table */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <Select value={sector} onChange={setSector} options={SECTORS} className="w-52" />
          <Select value={status} onChange={setStatus} options={STATUSES} className="w-36" capitalize />
          <div className="flex-1" />
          <p className="text-muted text-sm self-center font-mono">{deals.length} deals</p>
        </div>

        {/* Table */}
        <div className="glass rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Company","Sector","Rating","Risk","Loan Amount","Alerts","Reviewed"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-muted text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map((deal, i) => (
                <tr key={deal.deal_id}
                  onClick={() => { setSelected(deal); setTab("summary"); }}
                  className={cn(
                    "border-b border-white/[0.04] cursor-pointer transition-colors",
                    selected?.deal_id === deal.deal_id ? "bg-white/[0.06]" : i % 2 === 1 ? "bg-white/[0.02] hover:bg-white/[0.04]" : "hover:bg-white/[0.03]"
                  )}>
                  <td className="px-4 py-3">
                    <Link href={`/deal/${deal.deal_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary font-medium hover:text-accent transition-colors">
                      {deal.company}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full border"
                      style={{ borderColor: getRiskColor(deal.sector_stress_score) + "50", color: getRiskColor(deal.sector_stress_score) }}>
                      {deal.sector}
                    </span>
                  </td>
                  <td className="px-4 py-3"><RatingBadge rating={deal.internal_rating} /></td>
                  <td className="px-4 py-3"><RiskGauge score={deal.risk_score} /></td>
                  <td className="px-4 py-3 font-mono text-primary">{formatCurrency(deal.loan_amount)}</td>
                  <td className="px-4 py-3">
                    {deal.alert_count > 0 ? (
                      <span className="bg-danger/20 text-danger font-mono text-xs px-2 py-0.5 rounded-full border border-danger/30">
                        {deal.alert_count}
                      </span>
                    ) : <span className="text-muted font-mono text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs font-mono">{formatDate(deal.last_reviewed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side panel */}
      {selected && (
        <div className="w-80 shrink-0 glass rounded-lg flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div>
              <p className="text-primary font-semibold text-sm">{selected.company}</p>
              <p className="text-muted text-xs">{selected.deal_type}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-muted hover:text-primary transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06]">
            {(["summary","covenants","sector"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("flex-1 py-2 text-xs font-semibold capitalize transition-colors",
                  tab === t ? "text-accent border-b-2 border-accent" : "text-muted hover:text-primary"
                )}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {tab === "summary" && (
              <>
                {[
                  ["Sponsor",     selected.sponsor],
                  ["Deal Type",   selected.deal_type],
                  ["Loan Amount", formatCurrency(selected.loan_amount)],
                  ["Tenor",       `${selected.loan_tenor} years`],
                  ["Loan Type",   selected.loan_type],
                  ["Status",      selected.status],
                  ["Disbursed",   formatDate(selected.disbursement_date)],
                  ["Maturity",    formatDate(selected.maturity_date)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <p className="text-muted text-xs">{k}</p>
                    <p className="text-primary text-xs font-mono capitalize">{v}</p>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="text-center">
                    <RiskGauge score={selected.risk_score} size="lg" />
                    <p className="text-muted text-[10px] uppercase tracking-wider mt-1">Risk Score</p>
                  </div>
                  <RatingBadge rating={selected.internal_rating} />
                </div>
              </>
            )}

            {tab === "covenants" && (
              <div className="space-y-2">
                {[
                  { name: "Net Debt / EBITDA", threshold: "4.0x", current: "3.9x", ok: true },
                  { name: "Interest Coverage", threshold: "2.5x", current: "2.8x", ok: true },
                  { name: "Min Liquidity",     threshold: "$25M",  current: "$31M", ok: true },
                ].map((c) => (
                  <div key={c.name} className="bg-navy-900 rounded-md p-3">
                    <p className="text-primary text-xs font-medium">{c.name}</p>
                    <div className="flex justify-between mt-1">
                      <span className="text-muted text-[10px]">Threshold: <span className="font-mono">{c.threshold}</span></span>
                      <span className={cn("text-[10px] font-mono font-bold", c.ok ? "text-success" : "text-danger")}>
                        {c.current} {c.ok ? "✓" : "⚠"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "sector" && (
              <div className="space-y-3">
                <div className="bg-navy-900 rounded-md p-3">
                  <p className="text-muted text-[10px] uppercase tracking-wider">Sector</p>
                  <p className="text-primary text-sm font-mono mt-1">{selected.sector}</p>
                </div>
                <div className="bg-navy-900 rounded-md p-3">
                  <p className="text-muted text-[10px] uppercase tracking-wider">Sector Stress Score</p>
                  <p className="font-mono text-lg font-bold mt-1"
                    style={{ color: selected.sector_stress_score > 60 ? "#FF3B5C" : selected.sector_stress_score > 40 ? "#FFB300" : "#00D4A4" }}>
                    {selected.sector_stress_score} / 100
                  </p>
                </div>
                <div className="bg-navy-900 rounded-md p-3">
                  <p className="text-muted text-[10px] uppercase tracking-wider">Industry</p>
                  <p className="text-primary text-sm mt-1">{selected.industry}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
