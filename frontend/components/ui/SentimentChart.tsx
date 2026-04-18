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
              <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fill: "#888888", fontSize: 9, fontFamily: "JetBrains Mono" }}
            tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "#888888", fontSize: 9, fontFamily: "JetBrains Mono" }}
            axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#111111", border: "1px solid #2A2A2A", borderRadius: 6 }}
            labelStyle={{ color: "#888888", fontSize: 10 }}
            itemStyle={{ color: "#C9A84C", fontSize: 11, fontFamily: "JetBrains Mono" }}
          />
          <Area type="monotone" dataKey="score" stroke="#C9A84C" strokeWidth={2}
            fill="url(#sentGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
