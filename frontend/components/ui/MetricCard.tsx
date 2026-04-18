"use client";

import { useEffect, useRef, useState } from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "accent" | "success" | "warning" | "danger";

const VARIANTS: Record<Variant, { color: string; glow: string }> = {
  accent:  { color: "#1B7FE5", glow: "" },
  success: { color: "#00D4A4", glow: "" },
  warning: { color: "#FFB300", glow: "" },
  danger:  { color: "#FF3B5C", glow: "0 0 18px rgba(255,59,92,0.18)" },
};

function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return count;
}

interface Props {
  label: string;
  value?: string | number;
  rawValue?: number;
  formatter?: (n: number) => string;
  delta?: number;
  deltaType?: "up" | "down";
  icon?: LucideIcon;
  variant?: Variant;
}

export default function MetricCard({
  label, value, rawValue, formatter,
  delta, deltaType, icon: Icon, variant = "accent",
}: Props) {
  const animated = useCountUp(rawValue ?? 0);
  const { color, glow } = VARIANTS[variant];

  let display: string | number;
  if (rawValue !== undefined) {
    display = formatter ? formatter(animated) : animated;
  } else {
    display = value ?? 0;
  }

  return (
    <div
      className="glass glass-hover shimmer rounded-lg p-6 flex flex-col gap-3 transition-all duration-200 cursor-default"
      style={{ borderLeft: `3px solid ${color}`, boxShadow: glow || undefined }}
    >
      <div className="flex items-center justify-between">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest">{label}</p>
        {Icon && <Icon size={16} style={{ color }} />}
      </div>
      <p className="text-primary font-mono text-2xl font-bold">{display}</p>
      {delta !== undefined && (
        <div className={cn("flex items-center gap-1 text-xs font-mono",
          deltaType === "up" ? "text-success" : "text-danger"
        )}>
          {deltaType === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{Math.abs(delta)}%</span>
        </div>
      )}
    </div>
  );
}
