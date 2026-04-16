"use client";

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Deal } from "@/lib/types";

// ── Colours ────────────────────────────────────────────────────────────────
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

// ── Custom tooltip ─────────────────────────────────────────────────────────
function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { count: number } }> }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="bg-navy-900 border border-navy-600 rounded-md px-3 py-2 shadow-xl text-xs">
      <p className="text-primary font-semibold">{name}</p>
      <p className="text-muted font-mono">{fmt(value)}</p>
      <p className="text-muted font-mono">{p.count} loan{p.count !== 1 ? "s" : ""}</p>
    </div>
  );
}

function BarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-900 border border-navy-600 rounded-md px-3 py-2 shadow-xl text-xs">
      <p className="text-primary font-mono font-semibold">{payload[0].value} loans</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PortfolioCharts({ portfolio }: { portfolio: Deal[] }) {
  // Sector breakdown by exposure
  const sectorMap: Record<string, { value: number; count: number }> = {};
  portfolio.forEach((d) => {
    if (!sectorMap[d.sector]) sectorMap[d.sector] = { value: 0, count: 0 };
    sectorMap[d.sector].value += d.loan_amount;
    sectorMap[d.sector].count += 1;
  });
  const sectorData = Object.entries(sectorMap)
    .map(([name, { value, count }]) => ({ name, value, count }))
    .sort((a, b) => b.value - a.value);

  // Rating distribution by count
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
      {/* Sector Exposure Donut */}
      <div className="bg-navy-800 border border-navy-700 rounded-lg p-5">
        <p className="text-primary text-sm font-semibold mb-1">Sector Exposure</p>
        <p className="text-muted text-[10px] font-mono mb-3">By loan amount ($)</p>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={sectorData} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                dataKey="value" paddingAngle={2}>
                {sectorData.map((entry) => (
                  <Cell key={entry.name} fill={SECTOR_COLORS[entry.name] ?? "#6B7FA3"} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            {sectorData.slice(0, 6).map((s) => (
              <div key={s.name} className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SECTOR_COLORS[s.name] ?? "#6B7FA3" }} />
                <span className="text-muted text-[10px] truncate">{s.name}</span>
                <span className="text-primary text-[10px] font-mono ml-auto flex-shrink-0">{fmt(s.value)}</span>
              </div>
            ))}
            {sectorData.length > 6 && (
              <p className="text-muted text-[10px]">+{sectorData.length - 6} more</p>
            )}
          </div>
        </div>
      </div>

      {/* Rating Distribution Bar */}
      <div className="bg-navy-800 border border-navy-700 rounded-lg p-5">
        <p className="text-primary text-sm font-semibold mb-1">Rating Distribution</p>
        <p className="text-muted text-[10px] font-mono mb-3">Number of loans by internal rating</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={ratingData} barSize={28} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="rating" tick={{ fill: "#6B7FA3", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6B7FA3", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(107,127,163,0.1)" }} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {ratingData.map((entry) => (
                <Cell key={entry.rating} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-3 mt-2 flex-wrap">
          {[["BB+/BB/BB-","#00D4A4"],["B+/B","#FFB300"],["B-","#FF3B5C"]].map(([label, color]) => (
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
