"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/dashboard":           "Dashboard",
  "/underwriting":        "New Underwriting",
  "/portfolio":           "Portfolio",
  "/monitoring":          "Monitoring",
  "/alerts":              "Alert Center",
  "/sector-intelligence": "Sector Intelligence Hub",
};

export default function TopBar() {
  const path = usePathname();
  const title = Object.entries(TITLES).find(([k]) => path.startsWith(k))?.[1] ?? "CreditMind";
  const now = new Date().toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <header className="h-16 bg-navy-900 border-b border-navy-700 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-primary font-semibold text-base">{title}</h1>
      <p className="text-muted text-xs font-mono">Last updated: {now}</p>
    </header>
  );
}
