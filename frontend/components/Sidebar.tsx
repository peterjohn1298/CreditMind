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
  if (path === "/") return null;
  const totalAlerts = state.alertSummary.critical + state.alertSummary.high;

  return (
    <aside className="w-60 min-h-screen border-r border-white/[0.06] flex flex-col shrink-0" style={{ background: "rgba(10, 22, 40, 0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/[0.06]">
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
                  ? "text-primary border-l-4 border-accent pl-2"
                  : "text-muted hover:text-primary border-l-4 border-transparent pl-2"
              )}
            >
              <Icon size={16} className={active ? "text-accent" : "text-muted group-hover:text-primary"} />
              <span className="flex-1">{label}</span>
              {badge && totalAlerts > 0 && (
                <span className="relative inline-flex items-center justify-center w-6 h-5">
                  <span className="absolute w-5 h-5 rounded-full animate-ping" style={{ backgroundColor: "#FF3B5C", opacity: 0.5 }} />
                  <span className="relative z-10 text-white text-[10px] font-mono font-bold px-1 rounded-full text-center" style={{ backgroundColor: "#FF3B5C" }}>
                    {totalAlerts > 9 ? "9+" : totalAlerts}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.06]">
        <p className="text-muted text-[10px] text-center">MSF Group Project · April 2026</p>
      </div>
    </aside>
  );
}
