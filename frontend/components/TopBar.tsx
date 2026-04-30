"use client";

import { usePathname } from "next/navigation";
import { useCredit } from "@/context/CreditContext";
import { cn } from "@/lib/utils";

const TITLES: Record<string, string> = {
  "/dashboard":           "Dashboard",
  "/origination":         "Origination & Screening",
  "/underwriting":        "New Underwriting",
  "/portfolio":           "Portfolio",
  "/monitoring":          "Monitoring",
  "/lp-reporting":        "LP Reporting",
  "/alerts":              "Alert Center",
  "/sector-intelligence": "Sector Intelligence Hub",
  "/deal":                "Deal Detail",
};

function minutesAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1) return "just now";
  if (diff === 1) return "1 min ago";
  return `${diff} min ago`;
}

export default function TopBar() {
  const path = usePathname();
  if (path === "/" || path === "/home") return null;
  const title = Object.entries(TITLES).find(([k]) => path.startsWith(k))?.[1] ?? "CreditMind";
  const { state } = useCredit();
  const { isRefreshing, lastRefreshed, portfolio } = state;

  return (
    <header className="h-16 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0" style={{ background: "rgba(6, 6, 6, 0.95)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
      <h1 className="text-primary font-semibold text-base">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Live status pulse */}
        <div className="flex items-center gap-2">
          <span className={cn(
            "w-2 h-2 rounded-full",
            isRefreshing
              ? "bg-accent animate-pulse"
              : lastRefreshed
                ? "bg-success"
                : "bg-muted"
          )} />
          <span className="text-xs font-mono text-muted">
            {isRefreshing
              ? "Monitoring agents running…"
              : `Last monitored ${minutesAgo(lastRefreshed)} · ${portfolio.length} loans · 11 sectors`
            }
          </span>
        </div>
      </div>
    </header>
  );
}
