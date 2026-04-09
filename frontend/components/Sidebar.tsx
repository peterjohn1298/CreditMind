"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileSearch, Briefcase,
  Activity, Bell, Globe,
} from "lucide-react";
import { useCredit } from "@/context/CreditContext";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard",           href: "/dashboard",            icon: LayoutDashboard },
  { label: "Underwriting",        href: "/underwriting",         icon: FileSearch },
  { label: "Portfolio",           href: "/portfolio",            icon: Briefcase },
  { label: "Monitoring",          href: "/monitoring",           icon: Activity },
  { label: "Alerts",              href: "/alerts",               icon: Bell, badge: true },
  { label: "Sector Intelligence", href: "/sector-intelligence",  icon: Globe },
];

export default function Sidebar() {
  const path = usePathname();
  const { state } = useCredit();
  const totalAlerts = state.alertSummary.critical + state.alertSummary.high;

  return (
    <aside className="w-60 min-h-screen bg-navy-900 border-r border-navy-700 flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-navy-700">
        <div>
          <p className="text-primary font-bold text-sm tracking-wide">CreditMind</p>
          <p className="text-muted text-[10px] tracking-widest uppercase">Credit Intelligence</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon, badge }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 relative group",
                active
                  ? "bg-navy-800 text-primary border-l-4 border-accent pl-2"
                  : "text-muted hover:bg-navy-800 hover:text-primary border-l-4 border-transparent pl-2"
              )}
            >
              <Icon size={16} className={active ? "text-accent" : "text-muted group-hover:text-primary"} />
              <span className="flex-1">{label}</span>
              {badge && totalAlerts > 0 && (
                <span className="relative inline-flex">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-danger opacity-60 animate-ping" />
                  <span className="relative bg-danger text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {totalAlerts}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-navy-700">
        <p className="text-muted text-[10px] text-center">MSF Group Project · April 2026</p>
      </div>
    </aside>
  );
}
