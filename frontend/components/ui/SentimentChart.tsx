"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: Array<{ date: string; score: number }>;
  sector: string;
}

export default function SentimentChart({ data, sector }: Props) {
  return (
    <div className="glass rounded-lg p-4">
      <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">{sector} — Sentiment Score</p>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#5B6BFF" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#5B6BFF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fill: "#6B7FA3", fontSize: 9, fontFamily: "JetBrains Mono" }}
            tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "#6B7FA3", fontSize: 9, fontFamily: "JetBrains Mono" }}
            axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#1A1D24", border: "1px solid #2C3340", borderRadius: 6 }}
            labelStyle={{ color: "#6B7FA3", fontSize: 10 }}
            itemStyle={{ color: "#5B6BFF", fontSize: 11, fontFamily: "JetBrains Mono" }}
          />
          <Area type="monotone" dataKey="score" stroke="#5B6BFF" strokeWidth={2}
            fill="url(#sentGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
