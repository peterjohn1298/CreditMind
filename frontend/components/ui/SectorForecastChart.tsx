"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ReferenceArea, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ── Constants ──────────────────────────────────────────────────────────────────

const SECTOR_COLORS = [
  "#00D4A4", "#C9A84C", "#FF3B5C", "#A78BFA",
  "#FF8C00", "#34D399", "#F87171", "#FFB300",
  "#6EE7B7", "#FBBF24", "#E879F9",
];

const STRESS_ZONES = [
  { y1: 0,  y2: 30,  fill: "#00D4A4", label: "LOW",      labelColor: "#00D4A4" },
  { y1: 30, y2: 50,  fill: "#FFB300", label: "MEDIUM",   labelColor: "#FFB300" },
  { y1: 50, y2: 70,  fill: "#FF8C00", label: "HIGH",     labelColor: "#FF8C00" },
  { y1: 70, y2: 100, fill: "#FF3B5C", label: "CRITICAL", labelColor: "#FF3B5C" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function stressColor(score: number) {
  if (score <= 30) return "#00D4A4";
  if (score <= 50) return "#FFB300";
  if (score <= 70) return "#FF8C00";
  return "#FF3B5C";
}

function stressWord(score: number) {
  if (score <= 30) return "Low";
  if (score <= 50) return "Medium";
  if (score <= 70) return "High";
  return "Critical";
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; stroke: string }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const sorted = [...payload].filter(p => p.value != null).sort((a, b) => b.value - a.value);
  return (
    <div className="glass rounded-lg px-4 py-3 shadow-xl border border-white/10 min-w-[200px]">
      <p className="text-muted text-[10px] font-mono mb-2.5 pb-2 border-b border-white/[0.06]">
        {fmtDate(label)}
      </p>
      {sorted.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.stroke }} />
            <span className="text-primary text-[10px]">{p.dataKey}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold" style={{ color: stressColor(p.value) }}>
              {p.value}
            </span>
            <span className="text-muted text-[9px]">({stressWord(p.value)})</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── End-of-line dot + label ────────────────────────────────────────────────────

function EndDot(sector: string, color: string, totalPoints: number) {
  return function Dot(props: { cx?: number; cy?: number; index?: number; value?: number }) {
    const { cx = 0, cy = 0, index = 0, value } = props;
    if (index !== totalPoints - 1 || value == null) return <g />;
    const label = sector.length > 12 ? sector.slice(0, 11) + "…" : sector;
    return (
      <g>
        <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
        <text x={cx + 8} y={cy + 4} fontSize={9} fill={color} fontFamily="Inter" fontWeight={600}>
          {label}
        </text>
        <text x={cx + 8} y={cy + 14} fontSize={8} fill={stressColor(value)} fontFamily="JetBrains Mono" fontWeight={700}>
          {value}
        </text>
      </g>
    );
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  forecasts: Record<string, Array<{ date: string; score: number }>>;
}

export default function SectorForecastChart({ forecasts }: Props) {
  const sectors = Object.keys(forecasts);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const today = new Date().toISOString().split("T")[0];

  // Sort by latest score, highest stress first
  const sortedSectors = useMemo(() =>
    [...sectors].sort((a, b) => {
      const aLast = forecasts[a]?.slice(-1)[0]?.score ?? 0;
      const bLast = forecasts[b]?.slice(-1)[0]?.score ?? 0;
      return bLast - aLast;
    }),
    [sectors, forecasts]
  );

  const allDates = [...new Set(
    Object.values(forecasts).flatMap((arr) => arr.map((p) => p.date))
  )].sort();

  const data = allDates.map((date) => {
    const row: Record<string, number | string> = { date };
    sectors.forEach((s) => {
      const pt = forecasts[s]?.find((p) => p.date === date);
      if (pt) row[s] = pt.score;
    });
    return row;
  });

  const forecastStartDate = allDates.find((d) => d > today);
  const lastDate = allDates[allDates.length - 1];

  const toggle = (s: string) => setHidden((prev) => {
    const next = new Set(prev);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });

  const showAll = () => setHidden(new Set());
  const hideAll = () => setHidden(new Set(sectors));

  return (
    <div className="glass rounded-lg p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-primary text-sm font-semibold">30-Day Sector Stress Forecast</p>
          <p className="text-muted text-[10px] font-mono mt-0.5">
            Stress score 0–100 per sector · Historical trend + 7-day forward projection ·
            Zones: <span style={{ color: "#00D4A4" }}>Low ≤30</span> ·{" "}
            <span style={{ color: "#FFB300" }}>Medium ≤50</span> ·{" "}
            <span style={{ color: "#FF8C00" }}>High ≤70</span> ·{" "}
            <span style={{ color: "#FF3B5C" }}>Critical &gt;70</span>
          </p>
        </div>
        <div className="flex gap-3 text-[10px] font-mono">
          <button onClick={showAll} className="text-accent hover:underline">Show all</button>
          <button onClick={hideAll} className="text-muted hover:text-primary">Hide all</button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={390}>
        <LineChart data={data} margin={{ top: 16, right: 110, left: 4, bottom: 4 }}>

          {/* Stress zone bands */}
          {STRESS_ZONES.map((z) => (
            <ReferenceArea key={z.label} y1={z.y1} y2={z.y2}
              fill={z.fill} fillOpacity={0.055} />
          ))}

          {/* Horizontal grid — subtle */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(107,127,163,0.08)"
            vertical={false}
          />

          {/* Axes */}
          <XAxis
            dataKey="date"
            tick={{ fill: "#6B7FA3", fontSize: 9, fontFamily: "JetBrains Mono" }}
            tickFormatter={fmtDate}
            axisLine={false} tickLine={false}
            interval={4}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 30, 50, 70, 100]}
            tick={{ fill: "#6B7FA3", fontSize: 9, fontFamily: "JetBrains Mono" }}
            axisLine={false} tickLine={false}
            width={30}
          />

          {/* Threshold lines with zone labels */}
          <ReferenceLine y={30} stroke="#00D4A4" strokeOpacity={0.25} strokeDasharray="5 4"
            label={{ value: "LOW  30", position: "insideBottomLeft", fill: "#00D4A4", fontSize: 8, fontFamily: "JetBrains Mono", opacity: 0.55 }} />
          <ReferenceLine y={50} stroke="#FFB300" strokeOpacity={0.25} strokeDasharray="5 4"
            label={{ value: "MEDIUM  50", position: "insideBottomLeft", fill: "#FFB300", fontSize: 8, fontFamily: "JetBrains Mono", opacity: 0.55 }} />
          <ReferenceLine y={70} stroke="#FF8C00" strokeOpacity={0.25} strokeDasharray="5 4"
            label={{ value: "HIGH  70", position: "insideBottomLeft", fill: "#FF8C00", fontSize: 8, fontFamily: "JetBrains Mono", opacity: 0.55 }} />

          {/* TODAY line */}
          <ReferenceLine x={today}
            stroke="rgba(200,214,232,0.35)" strokeWidth={1.5} strokeDasharray="4 3"
            label={{ value: "TODAY", position: "insideTopRight", fill: "#A8B8D0", fontSize: 8, fontFamily: "JetBrains Mono" }} />

          {/* Forecast shaded zone */}
          {forecastStartDate && (
            <ReferenceArea x1={forecastStartDate} x2={lastDate}
              fill="rgba(107,127,163,0.07)"
              label={{ value: "FORECAST →", position: "insideTopLeft", fill: "#6B7FA3", fontSize: 8, fontFamily: "JetBrains Mono" }}
            />
          )}

          <Tooltip content={<CustomTooltip />} />

          {/* Lines */}
          {sortedSectors.map((s, i) => {
            const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
            const isHidden = hidden.has(s);
            return (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={color}
                strokeWidth={isHidden ? 0 : 2}
                strokeOpacity={isHidden ? 0 : 0.88}
                dot={isHidden ? false : EndDot(s, color, data.length)}
                activeDot={isHidden ? false : { r: 4, fill: color, stroke: "rgba(0,0,0,0.3)", strokeWidth: 1 }}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      {/* Sector toggle pills — sorted by stress, score shown */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/[0.05]">
        {sortedSectors.map((s, i) => {
          const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
          const isHidden = hidden.has(s);
          const latestScore = forecasts[s]?.slice(-1)[0]?.score ?? 0;
          return (
            <button
              key={s}
              onClick={() => toggle(s)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] transition-all duration-150"
              style={{
                borderColor: isHidden ? "rgba(107,127,163,0.2)" : color + "55",
                backgroundColor: isHidden ? "transparent" : color + "14",
                opacity: isHidden ? 0.35 : 1,
              }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span style={{ color: isHidden ? "#6B7FA3" : "#C8D6E8" }}>{s}</span>
              <span
                className="font-mono font-bold text-[9px] ml-0.5 px-1 rounded"
                style={{
                  color: stressColor(latestScore),
                  backgroundColor: stressColor(latestScore) + "18",
                }}
              >
                {latestScore}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
