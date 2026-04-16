"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import type { Alert } from "@/lib/types";
import { cn, getSeverityColor, formatDate } from "@/lib/utils";

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
      "bg-navy-800 border border-navy-700 border-l-4 rounded-lg overflow-hidden",
      border
    )}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-navy-700/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
            style={{ backgroundColor: `${color}20`, color }}>
            {alert.severity}
          </span>
          <span className="text-primary text-sm font-medium truncate max-w-[220px]">
            {alert._company ?? alert.company ?? alert.sector_id ?? "Portfolio"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted">
          <span className="text-[10px] font-mono">{formatDate(alert.timestamp)}</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* Issue */}
          <div>
            <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Issue</p>
            <p className="text-primary text-sm leading-relaxed">
              {alert.trigger ?? alert.message ?? "No details available"}
            </p>
          </div>
          {/* Action required */}
          {alert.action_required && (
            <div className="bg-navy-900 rounded-md p-3">
              <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Action Required</p>
              <p className="text-warning text-xs leading-relaxed">{alert.action_required}</p>
            </div>
          )}
          {!alert.resolved && (
            <button
              onClick={() => onResolve(alert.alert_id ?? alert._deal_id ?? "")}
              className="flex items-center gap-1.5 text-xs text-success hover:text-success/80 transition-colors font-medium"
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
