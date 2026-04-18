"use client";

import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  LayoutDashboard, FileSearch, Briefcase,
  Activity, Bell, Globe, ChevronRight,
} from "lucide-react";
import { useCredit } from "@/context/CreditContext";

const MODULES = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Portfolio overview, key metrics, and recent deal activity",
    color: "#C9A84C",
    border: "rgba(201,168,76,0.22)",
    glow: "rgba(201,168,76,0.07)",
  },
  {
    label: "Underwriting",
    href: "/underwriting",
    icon: FileSearch,
    description: "AI-powered deal origination and credit memo generation",
    color: "#00D4A4",
    border: "rgba(0,212,164,0.22)",
    glow: "rgba(0,212,164,0.07)",
  },
  {
    label: "Portfolio",
    href: "/portfolio",
    icon: Briefcase,
    description: "Full 50-loan portfolio with deal-level credit intelligence",
    color: "#7B8FF7",
    border: "rgba(123,143,247,0.22)",
    glow: "rgba(123,143,247,0.07)",
  },
  {
    label: "Monitoring",
    href: "/monitoring",
    icon: Activity,
    description: "Real-time surveillance, early warning flags, and stress testing",
    color: "#FF8C00",
    border: "rgba(255,140,0,0.22)",
    glow: "rgba(255,140,0,0.07)",
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: Bell,
    description: "Active credit warnings, critical flags, and notifications",
    color: "#FF3B5C",
    border: "rgba(255,59,92,0.22)",
    glow: "rgba(255,59,92,0.07)",
    badge: true,
  },
  {
    label: "Sector Intelligence",
    href: "/sector-intelligence",
    icon: Globe,
    description: "Sector heatmap, contagion analysis, and macro forecasts",
    color: "#00B4D8",
    border: "rgba(0,180,216,0.22)",
    glow: "rgba(0,180,216,0.07)",
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const tile: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, ease: EASE },
  },
};

export default function Home() {
  const router = useRouter();
  const { state } = useCredit();
  const totalAlerts = state.alertSummary.critical + state.alertSummary.high + state.alertSummary.medium;
  const stressed = state.portfolio.filter(d => d.status === "stressed" || d.status === "watchlist").length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050505",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      position: "relative",
    }}>
      {/* Brand header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: "center", marginBottom: 52 }}
      >
        <p style={{
          color: "rgba(201,168,76,0.5)",
          fontSize: 11,
          fontFamily: "JetBrains Mono, monospace",
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}>
          AI-Native Credit Intelligence Platform
        </p>
        <h1 style={{
          color: "#fff",
          fontFamily: "Inter, sans-serif",
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          margin: 0,
        }}>
          CreditMind
        </h1>

        {/* Live portfolio pulse */}
        {state.portfolio.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
              marginTop: 16,
              padding: "6px 18px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 999,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00D4A4", display: "inline-block" }} />
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                {state.portfolio.length} loans
              </span>
            </span>
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 11 }}>·</span>
            <span style={{ color: totalAlerts > 0 ? "rgba(255,59,92,0.8)" : "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
              {totalAlerts} alerts
            </span>
            {stressed > 0 && (
              <>
                <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 11 }}>·</span>
                <span style={{ color: "rgba(255,140,0,0.8)", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                  {stressed} at risk
                </span>
              </>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Tile grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          width: "100%",
          maxWidth: 920,
        }}
      >
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const showBadge = mod.badge && totalAlerts > 0;

          return (
            <motion.button
              key={mod.href}
              variants={tile}
              whileHover={{
                y: -6,
                scale: 1.025,
                boxShadow: `0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px ${mod.border}`,
                transition: { duration: 0.2, ease: "easeOut" },
              }}
              whileTap={{ scale: 0.975, transition: { duration: 0.1 } }}
              onClick={() => router.push(mod.href)}
              style={{
                background: `radial-gradient(ellipse at 25% 25%, ${mod.glow}, transparent 65%), rgba(255,255,255,0.025)`,
                border: `1px solid ${mod.border}`,
                borderRadius: 18,
                padding: "28px 26px 24px",
                cursor: "pointer",
                textAlign: "left",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              }}
            >
              {/* Subtle top-edge shimmer */}
              <div style={{
                position: "absolute",
                top: 0, left: "10%", right: "10%",
                height: 1,
                background: `linear-gradient(90deg, transparent, ${mod.color}40, transparent)`,
              }} />

              {/* Icon row */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
              }}>
                <div style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  background: `${mod.color}16`,
                  border: `1px solid ${mod.color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Icon size={21} color={mod.color} />
                </div>
                {showBadge && (
                  <span style={{
                    background: "#FF3B5C",
                    color: "#fff",
                    fontSize: 10,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 999,
                  }}>
                    {totalAlerts > 9 ? "9+" : totalAlerts}
                  </span>
                )}
              </div>

              {/* Text */}
              <p style={{
                color: "#F0EEE8",
                fontSize: 15,
                fontWeight: 600,
                margin: 0,
                marginBottom: 7,
                fontFamily: "Inter, sans-serif",
                letterSpacing: "-0.01em",
              }}>
                {mod.label}
              </p>
              <p style={{
                color: "rgba(255,255,255,0.38)",
                fontSize: 12,
                lineHeight: 1.65,
                margin: 0,
                fontFamily: "Inter, sans-serif",
              }}>
                {mod.description}
              </p>

              {/* Arrow */}
              <div style={{
                position: "absolute",
                bottom: 22,
                right: 22,
                color: mod.color,
                opacity: 0.5,
              }}>
                <ChevronRight size={15} />
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75, duration: 0.6 }}
        style={{
          color: "rgba(255,255,255,0.1)",
          fontSize: 11,
          fontFamily: "JetBrains Mono, monospace",
          marginTop: 44,
          letterSpacing: "0.08em",
        }}
      >
        select a module to begin
      </motion.p>
    </div>
  );
}
