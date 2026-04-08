"use client";

import { useState } from "react";
import AlertCard from "@/components/ui/AlertCard";
import { useCredit } from "@/context/CreditContext";
import { resolveAlert } from "@/lib/api";
import { cn } from "@/lib/utils";

type Tab = "company" | "sector";

export default function Alerts() {
  const { state, dispatch } = useCredit();
  const [tab, setTab] = useState<Tab>("company");

  const companyAlerts = state.activeAlerts.filter((a) => !a.resolved && a.alert_type !== "sector");
  const sectorAlerts  = state.activeAlerts.filter((a) => !a.resolved && a.alert_type === "sector");

  async function handleResolve(id: string) {
    try { await resolveAlert(id); } catch {}
    dispatch({ type: "RESOLVE_ALERT", payload: id });
  }

  const sorted = [...companyAlerts].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-navy-800 border border-navy-700 rounded-lg p-1 w-fit">
        {(["company","sector"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all duration-150 flex items-center gap-2",
              tab === t ? "bg-accent text-white" : "text-muted hover:text-primary"
            )}>
            {t === "company" ? "Company Alerts" : "Sector Alerts"}
            <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full",
              tab === t ? "bg-white/20 text-white" : "bg-navy-700 text-muted"
            )}>
              {t === "company" ? companyAlerts.length : sectorAlerts.length}
            </span>
          </button>
        ))}
      </div>

      {tab === "company" && (
        <div className="space-y-3 max-w-2xl">
          {sorted.length === 0 && (
            <div className="bg-navy-800 border border-navy-700 rounded-lg p-8 text-center">
              <p className="text-success font-medium">No active company alerts</p>
              <p className="text-muted text-sm mt-1">All deals are within normal parameters</p>
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
    </div>
  );
}
