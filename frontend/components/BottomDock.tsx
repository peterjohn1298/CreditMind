"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, LayoutDashboard, FileSearch,
  Briefcase, Activity, Bell, Globe, Search, Shield,
} from "lucide-react";
import { useCredit } from "@/context/CreditContext";

const NAV = [
  { label: "Hub",                href: "/home",              icon: LayoutGrid,       hub: true },
  { label: "Dashboard",         href: "/dashboard",         icon: LayoutDashboard },
  { label: "Origination",       href: "/origination",       icon: Search },
  { label: "Underwriting",      href: "/underwriting",      icon: FileSearch },
  { label: "Portfolio",         href: "/portfolio",         icon: Briefcase },
  { label: "Monitoring",        href: "/monitoring",        icon: Activity },
  { label: "Harness",           href: "/harness",           icon: Shield },
  { label: "Alerts",            href: "/alerts",            icon: Bell,             badge: true },
  { label: "Sector Intelligence", href: "/sector-intelligence", icon: Globe },
];

export default function BottomDock() {
  const path = usePathname();
  if (path === "/" || path === "/home") return null;

  return <DockInner path={path} />;
}

function DockInner({ path }: { path: string }) {
  const { state } = useCredit();
  const totalAlerts = state.alertSummary.critical + state.alertSummary.high;

  return (
    <motion.nav
      initial={{ y: 72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      style={{
        position: "fixed",
        bottom: 18,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 2,
        background: "rgba(17, 19, 24, 0.92)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 999,
        padding: "6px 10px",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 8px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset",
      }}
    >
      {NAV.map(({ label, href, icon: Icon, hub, badge }) => {
        const active = !hub && path.startsWith(href);
        const showBadge = badge && totalAlerts > 0;

        return (
          <div key={href} style={{ position: "relative" }} className="group">
            <Link href={href} style={{ display: "block" }}>
              <motion.div
                whileHover={{ y: -4, scale: 1.18, transition: { duration: 0.15, ease: "easeOut" } }}
                whileTap={{ scale: 0.88, transition: { duration: 0.1 } }}
                style={{
                  width: hub ? 36 : 40,
                  height: hub ? 36 : 40,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: active
                    ? "rgba(91,107,255,0.14)"
                    : hub
                    ? "rgba(255,255,255,0.06)"
                    : "transparent",
                  border: active
                    ? "1px solid rgba(91,107,255,0.38)"
                    : hub
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid transparent",
                  marginRight: hub ? 6 : 0,
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <Icon
                  size={hub ? 14 : 15}
                  color={
                    active
                      ? "#5B6BFF"
                      : hub
                      ? "rgba(255,255,255,0.55)"
                      : "rgba(255,255,255,0.32)"
                  }
                />

                {/* Alert badge dot */}
                {showBadge && (
                  <span style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 6,
                    height: 6,
                    background: "#FF3B5C",
                    borderRadius: "50%",
                    border: "1.5px solid rgba(17,19,24,0.92)",
                  }} />
                )}
              </motion.div>
            </Link>

            {/* Active indicator dot */}
            {active && (
              <motion.span
                layoutId="dock-dot"
                style={{
                  position: "absolute",
                  bottom: -5,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 4,
                  height: 4,
                  background: "#5B6BFF",
                  borderRadius: "50%",
                  display: "block",
                  boxShadow: "0 0 6px #5B6BFF",
                }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}

            {/* Tooltip */}
            <span style={{
              position: "absolute",
              bottom: "calc(100% + 10px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(17,19,24,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.75)",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
              padding: "4px 10px",
              borderRadius: 6,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              opacity: 0,
              transition: "opacity 0.15s ease",
            }}
              className="group-hover:opacity-100"
            >
              {label}
              {/* Tooltip arrow */}
              <span style={{
                position: "absolute",
                bottom: -4,
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: "4px solid rgba(255,255,255,0.1)",
                display: "block",
              }} />
            </span>
          </div>
        );
      })}
    </motion.nav>
  );
}
