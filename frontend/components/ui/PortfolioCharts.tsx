"use client";

import { Treemap, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Deal } from "@/lib/types";

const SECTOR_COLORS: Record<string, string> = {
  "Aerospace & Defense": "#1B7FE5",
  "Healthcare":          "#FF3B5C",
  "Industrials":         "#6B7FA3",
  "Consumer & Retail":   "#FF8C00",
  "Technology Services": "#00D4A4",
  "Energy":              "#FFB300",
  "Food & Agriculture":  "#8B5CF6",
  "Logistics":           "#06B6D4",
  "Specialty Chemicals": "#EC4899",
  "Financial Services":  "#10B981",
};

const RATING_COLORS: Record<string, string> = {
  "BB+": "#00D4A4", "BB": "#00D4A4", "BB-": "#1B7FE5",
  "B+": "#FFB300",  "B": "#FF8C00",  "B-": "#FF3B5C",
};

function fmt(v: number) {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  return `$${(v / 1_000_000).toFixed(0)}M`;
}

// ── Treemap custom cell ────────────────────────────────────────────────────
function TreemapCell(props: {
  x?: number; y?: number; width?: number; height?: number;
  name?: string; value?: number; depth?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name = "", value = 0, depth } = props;
  if (depth !== 1) return null;
  const color = SECTOR_COLORS[name] ?? "#6B7FA3";
  const showName  = width > 52 && height > 26;
  const showValue = width > 52 && height > 42;

  return (
    <g>
      <rect
        x={x + 1} y={y + 1} width={width - 2} height={height - 2}
        rx={4}
        fill={color}
        fillOpacity={0.82}
        stroke="rgba(10,22,40,0.35)"
        strokeWidth={1}
      />
      {showName && (
        <text
          x={x + width / 2}
          y={y + height / 2 + (showValue ? -7 : 4)}
          textAnchor="middle"
          fill="white"
          fontSize={10}
          fontFamily="Inter"
          fontWeight={600}
        >
          {name.length > 16 ? name.slice(0, 14) + "…" : name}
        </text>
      )}
      {showValue && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 9}
          textAnchor="middle"
          fill="rgba(255,255,255,0.72)"
          fontSize={9}
          fontFamily="JetBrains Mono"
        >
          {fmt(value)}
        </text>
      )}
    </g>
  );
}

// ── Bar tooltip ────────────────────────────────────────────────────────────
function BarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-md px-3 py-2 shadow-xl text-xs">
      <p className="text-primary font-mono font-semibold">{payload[0].value} loans</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PortfolioCharts({ portfolio }: { portfolio: Deal[] }) {
  const sectorMap: Record<string, { value: number; count: number }> = {};
  portfolio.forEach((d) => {
    if (!sectorMap[d.sector]) sectorMap[d.sector] = { value: 0, count: 0 };
    sectorMap[d.sector].value += d.loan_amount;
    sectorMap[d.sector].count += 1;
  });
  const sectorData = Object.entries(sectorMap)
    .map(([name, { value, count }]) => ({ name, value, count }))
    .sort((a, b) => b.value - a.value);

  const ratingOrder = ["BB+", "BB", "BB-", "B+", "B", "B-"];
  const ratingMap: Record<string, number> = {};
  portfolio.forEach((d) => {
    ratingMap[d.internal_rating] = (ratingMap[d.internal_rating] ?? 0) + 1;
  });
  const ratingData = ratingOrder
    .filter((r) => ratingMap[r])
    .map((r) => ({ rating: r, count: ratingMap[r], fill: RATING_COLORS[r] ?? "#6B7FA3" }));

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Sector Exposure Treemap */}
      <div className="glass rounded-lg p-5">
        <p className="text-primary text-sm font-semibold mb-1">Sector Exposure</p>
        <p className="text-muted text-[10px] font-mono mb-3">By loan amount ($) — hover for details</p>
        <ResponsiveContainer width="100%" height={178}>
          <Treemap
            data={sectorData}
            dataKey="value"
            aspectRatio={16 / 7}
            isAnimationActive={false}
            content={<TreemapCell />}
          />
        </ResponsiveContainer>
        {/* Compact legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {sectorData.slice(0, 5).map((s) => (
            <span key={s.name} className="flex items-center gap-1 text-[9px] text-muted">
              <span className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: SECTOR_COLORS[s.name] ?? "#6B7FA3" }} />
              {s.name.split(" ")[0]}
            </span>
          ))}
          {sectorData.length > 5 && (
            <span className="text-[9px] text-muted">+{sectorData.length - 5} more</span>
          )}
        </div>
      </div>

      {/* Rating Distribution Bar */}
      <div className="glass rounded-lg p-5">
        <p className="text-primary text-sm font-semibold mb-1">Rating Distribution</p>
        <p className="text-muted text-[10px] font-mono mb-3">Number of loans by internal rating</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={ratingData} barSize={28} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="rating" tick={{ fill: "#6B7FA3", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6B7FA3", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(107,127,163,0.08)" }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {ratingData.map((entry) => (
                <Cell key={entry.rating} fill={entry.fill} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-3 mt-1 flex-wrap">
          {[["BB+/BB/BB-", "#00D4A4"], ["B+/B", "#FFB300"], ["B-", "#FF3B5C"]].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1 text-[10px] text-muted">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
