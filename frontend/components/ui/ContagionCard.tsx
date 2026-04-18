"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { ContagionEvent } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";

const EXPOSURE_STYLE: Record<string, string> = {
  direct:       "bg-danger/20 text-danger border border-danger/30",
  supply_chain: "bg-warning/20 text-warning border border-warning/30",
  customer:     "bg-accent/20 text-accent border border-accent/30",
};

const EXPOSURE_LABEL: Record<string, string> = {
  direct:       "Direct",
  supply_chain: "Supply Chain",
  customer:     "Customer",
};

const SEVERITY_STYLE: Record<string, string> = {
  critical: "text-danger",
  high:     "text-[#FF8C00]",
  medium:   "text-warning",
  low:      "text-success",
};

export default function ContagionCard({ loan }: { loan: ContagionEvent }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <AlertTriangle size={14} className={SEVERITY_STYLE[loan.severity_tier] ?? "text-muted"} />
          <p className="text-primary text-sm font-semibold">{loan.company}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-mono font-bold px-2 py-0.5 rounded-full",
            EXPOSURE_STYLE[loan.exposure_type] ?? "bg-navy-700 text-muted"
          )}>
            {EXPOSURE_LABEL[loan.exposure_type] ?? loan.exposure_type}
          </span>
          <button onClick={() => setOpen(!open)} className="text-muted hover:text-primary transition-colors">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <div className="px-4 pb-3 flex items-center gap-4">
        <div>
          <p className="text-muted text-[10px] uppercase tracking-wider">Est. Impact</p>
          <p className="text-primary font-mono text-sm font-bold">
            {formatCurrency(loan.estimated_impact_min)} – {formatCurrency(loan.estimated_impact_max)}
          </p>
        </div>
        <div className="h-8 w-px bg-navy-700" />
        <div>
          <p className="text-muted text-[10px] uppercase tracking-wider">Severity</p>
          <p className={cn("font-mono text-sm font-bold capitalize", SEVERITY_STYLE[loan.severity_tier])}>
            {loan.severity_tier}
          </p>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/[0.06] pt-3">
          <p className="text-muted text-xs leading-relaxed">{loan.rationale}</p>
          {loan.covenant_at_risk && (
            <div className="bg-danger/10 border border-danger/20 rounded px-3 py-2">
              <p className="text-danger text-xs font-medium">Covenant at Risk</p>
              <p className="text-danger/80 text-xs mt-0.5">{loan.covenant_at_risk}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
