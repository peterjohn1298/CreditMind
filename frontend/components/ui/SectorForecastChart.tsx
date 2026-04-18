"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from "recharts";

const COLORS = [
  "#C9A84C","#00D4A4","#FFB300","#FF3B5C","#FF8C00",
  "#A78BFA","#34D399","#F87171","#E8C55C","#FBBF24","#6EE7B7",
];

interface Props {
  forecasts: Record<string, Array<{ date: string; score: number }>>;
}

export default function SectorForecastChart({ forecasts }: Props) {
  const sectors = Object.keys(forecasts);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const allDates = [...new Set(
    Object.values(forecasts).flatMap((arr) => arr.map((p) => p.date))
  )].sort();

  const data = allDates.map((date) => {
    const row: Record<string, unknown> = { date };
    sectors.forEach((s) => {
      const pt = forecasts[s]?.find((p) => p.date === date);
      if (pt) row[s] = pt.score;
    });
    return row;
  });

  const today = new Date().toISOString().split("T")[0];

  const toggle = (sector: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(sector) ? next.delete(sector) : next.add(sector);
      return next;
    });
  };

  return (
    <div className="glass rounded-lg p-4">
      <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">30-Day Sector Forecast</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fill: "#888888", fontSize: 8, fontFamily: "JetBrains Mono" }}
            tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} interval={6} />
          <YAxis domain={[0, 100]} tick={{ fill: "#888888", fontSize: 8, fontFamily: "JetBrains Mono" }}
            axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#111111", border: "1px solid #2A2A2A", borderRadius: 6, fontSize: 10 }}
            labelStyle={{ color: "#888888" }}
            itemStyle={{ fontFamily: "JetBrains Mono" }}
          />
          <ReferenceLine x={today} stroke="#888888" strokeDasharray="3 3" label={{ value: "Today", fill: "#888888", fontSize: 9 }} />
          {sectors.map((s, i) => (
            <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]}
              strokeWidth={hidden.has(s) ? 0 : 1.5} dot={false} strokeOpacity={hidden.has(s) ? 0 : 1} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {/* Custom legend */}
      <div className="flex flex-wrap gap-2 mt-3">
        {sectors.map((s, i) => (
          <button key={s} onClick={() => toggle(s)}
            className="flex items-center gap-1.5 text-[10px] transition-opacity"
            style={{ opacity: hidden.has(s) ? 0.3 : 1 }}>
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-muted">{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
