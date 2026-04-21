"use client";
import { useEffect, useState } from "react";

interface Props { score: number; size?: "sm" | "lg"; }

const GRAD_ID = "rg-gradient";
const GLOW_ID = "rg-glow";

export default function RiskGauge({ score, size = "sm" }: Props) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    const raf = requestAnimationFrame(function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimatedScore(Math.round(eased * score));
      if (p < 1) requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const r   = size === "lg" ? 54 : 32;
  const sw  = size === "lg" ? 9  : 6;
  const cx  = r + sw + 2;
  const cy  = r + sw + 2;
  const w   = cx * 2;
  const h   = cy + sw;

  const circumference = Math.PI * r;
  const pct  = Math.min(1, Math.max(0, animatedScore / 100));
  const fill = pct * circumference;

  const angle = Math.PI * (1 - pct);
  const dotX  = cx + r * Math.cos(angle);
  const dotY  = cy - r * Math.sin(angle);

  const ticks = [0.25, 0.5, 0.75].map((p) => {
    const a = Math.PI * (1 - p);
    const inner = r - sw / 2 - 2;
    const outer = r + sw / 2 + 2;
    return {
      x1: cx + inner * Math.cos(a), y1: cy - inner * Math.sin(a),
      x2: cx + outer * Math.cos(a), y2: cy - outer * Math.sin(a),
    };
  });

  const glowColor = score > 65 ? "#FF3B5C" : score > 40 ? "#FFB300" : "#00D4A4";
  const textColor = score > 65 ? "#FF3B5C" : score > 40 ? "#FFB300" : "#00D4A4";

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={GRAD_ID} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="#00D4A4" />
            <stop offset="50%"  stopColor="#FFB300" />
            <stop offset="100%" stopColor="#FF3B5C" />
          </linearGradient>
          <filter id={GLOW_ID} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none" stroke={`url(#${GRAD_ID})`} strokeWidth={sw}
          strokeLinecap="round" opacity={0.15}
        />

        {/* Filled arc with glow */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none" stroke={`url(#${GRAD_ID})`} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circumference}`}
          filter={`url(#${GLOW_ID})`}
          style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        />

        {/* Tick marks */}
        {size === "lg" && ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="rgba(107,127,163,0.4)" strokeWidth={1} />
        ))}

        {/* Glow dot at arc tip */}
        {pct > 0.02 && pct < 0.98 && (
          <>
            <circle cx={dotX} cy={dotY} r={size === "lg" ? 7 : 4.5}
              fill={glowColor} opacity={0.18} />
            <circle cx={dotX} cy={dotY} r={size === "lg" ? 4 : 2.5}
              fill="#111318" stroke={glowColor} strokeWidth={1.5} />
          </>
        )}

        {/* Score text */}
        <text
          x={cx} y={cy - (size === "lg" ? 6 : 3)}
          textAnchor="middle"
          fontSize={size === "lg" ? 20 : 11}
          fontFamily="JetBrains Mono" fontWeight="700"
          fill={textColor}
          style={{ filter: `drop-shadow(0 0 4px ${glowColor}44)` }}
        >
          {animatedScore}
        </text>
      </svg>

      {size === "lg" && (
        <div className="flex justify-between w-full px-1 -mt-1">
          <span className="text-[9px] font-mono text-success">LOW</span>
          <span className="text-[9px] font-mono text-warning">MED</span>
          <span className="text-[9px] font-mono text-danger">HIGH</span>
        </div>
      )}
    </div>
  );
}
