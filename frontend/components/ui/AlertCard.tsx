"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import type { Alert } from "@/lib/types";
import { cn, getSeverityColor, timeAgo } from "@/lib/utils";

interface Props {
  alert: Alert;
  onResolve: (id: string) => void;
}

const BORDER: Record<string, string> = {
  CRITICAL: "border-l-danger",
  HIGH:     "border-l-[#FF8C00]",
  MEDIUM:   "border-l-warning",
  LOW:      "border-l-success",
};

export default function AlertCard({ alert, onResolve }: Props) {
  const [open, setOpen] = useState(false);
  const color = getSeverityColor(alert.severity);
  const border = BORDER[alert.severity] ?? "border-l-muted";

  return (
    <div className={cn(
      "glass border-l-4 rounded-lg overflow-hidden transition-all duration-150",
      border
    )}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0"
            style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}>
            {alert.severity}
          </span>
          <span className="text-primary text-sm font-medium truncate">
            {alert._company ?? alert.company ?? alert.sector_id ?? "Portfolio"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted shrink-0 ml-2">
          <span className="text-[10px] font-mono">{timeAgo(alert.timestamp)}</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04]">
          {/* Issue */}
          <div className="pt-3">
            <p className="text-muted text-[10px] uppercase tracking-wider mb-1 font-semibold">Issue</p>
            <p className="text-primary text-sm leading-relaxed">
              {alert.trigger ?? alert.message ?? "No details available"}
            </p>
          </div>
          {/* Recommended action */}
          {alert.action_required && (
            <div className="rounded-md p-3" style={{ backgroundColor: `${color}08`, border: `1px solid ${color}20` }}>
              <p className="text-muted text-[10px] uppercase tracking-wider mb-1 font-semibold">Recommended Action</p>
              <p className="text-xs leading-relaxed" style={{ color }}>{alert.action_required}</p>
            </div>
          )}
          {!alert.resolved && (
            <button
              onClick={() => onResolve(alert.alert_id ?? alert._deal_id ?? "")}
              className="flex items-center gap-1.5 text-xs text-success hover:text-success/80 transition-colors font-medium pt-1"
            >
              <CheckCircle size={13} />
              Resolve Alert
            </button>
          )}
        </div>
      )}
    </div>
  );
}
