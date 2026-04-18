"use client";

import { useState } from "react";
import type { HeatMapData } from "@/lib/types";

function stressColor(score: number): string {
  if (score <= 30) return "#00D4A4";
  if (score <= 50) return "#FFB300";
  if (score <= 70) return "#FF8C00";
  return "#FF3B5C";
}

interface Props {
  data: HeatMapData;
  onSectorClick?: (sector: string) => void;
  mini?: boolean;
}

export default function SectorHeatMap({ data, onSectorClick, mini = false }: Props) {
  const [tooltip, setTooltip] = useState<{ sector: string; date: string; score: number; forecast: boolean; x: number; y: number } | null>(null);

  const allPoints = [...data.time_series, ...data.forecast];
  const todayStr  = new Date().toISOString().split("T")[0];

  const visible = mini ? allPoints.slice(-14) : allPoints;
  const cellW   = mini ? 14 : 16;
  const cellH   = mini ? 18 : 22;
  const labelW  = mini ? 110 : 150;
  const gap     = 2;

  const totalW = labelW + visible.length * (cellW + gap);
  const totalH = data.sectors.length * (cellH + gap);

  return (
    <div className="glass rounded-lg p-4 overflow-x-auto">
      {!mini && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-muted text-xs font-semibold uppercase tracking-widest">Sector Stress Heat Map</p>
          <div className="flex items-center gap-3 text-[10px] text-muted font-mono">
            {[["Low",  "#00D4A4"],["Medium","#FFB300"],["High","#FF8C00"],["Critical","#FF3B5C"]].map(([l,c])=>(
              <span key={l} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: c }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative" style={{ position: "relative" }}>
        <svg width={totalW} height={totalH + 20}>
          {data.sectors.map((sector, si) => {
            const y = si * (cellH + gap);
            return (
              <g key={sector}>
                {/* Sector label */}
                <text x={labelW - 8} y={y + cellH / 2 + 4}
                  textAnchor="end" fill="#6B7FA3"
                  fontSize={mini ? 8 : 10} fontFamily="Inter">
                  {mini ? sector.slice(0, 10) : sector}
                </text>

                {/* Cells */}
                {visible.map((pt, di) => {
                  const x     = labelW + di * (cellW + gap);
                  const score = pt.scores[sector] ?? 0;
                  const isForecast = !!pt.is_forecast;
                  const isToday = pt.date === todayStr;
                  return (
                    <rect key={di} x={x} y={y} width={cellW} height={cellH}
                      rx={2} fill={stressColor(score)}
                      opacity={isForecast ? 0.55 : 0.9}
                      stroke={isForecast ? "#6B7FA3" : "none"}
                      strokeWidth={isForecast ? 0.5 : 0}
                      strokeDasharray={isForecast ? "2 2" : "none"}
                      style={{ cursor: onSectorClick ? "pointer" : "default" }}
                      onMouseEnter={(e) => {
                        const rect = (e.target as SVGRectElement).getBoundingClientRect();
                        setTooltip({ sector, date: pt.date, score: Math.round(score), forecast: isForecast, x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => onSectorClick?.(sector)}
                    />
                  );
                })}

                {/* Portfolio overlay dots */}
                {data.portfolio_overlays
                  .filter((o) => o.sector_id === sector)
                  .slice(0, 3)
                  .map((o, oi) => (
                    <circle key={o.deal_id}
                      cx={labelW + 6 + oi * 12}
                      cy={y + cellH / 2}
                      r={3}
                      fill="white"
                      opacity={0.8}
                      aria-label={o.company}
                    />
                  ))}
              </g>
            );
          })}

          {/* Today marker */}
          {(() => {
            const idx = visible.findIndex((p) => p.date === todayStr);
            if (idx < 0) return null;
            const tx = labelW + idx * (cellW + gap);
            return (
              <line x1={tx} y1={0} x2={tx} y2={totalH}
                stroke="#6B7FA3" strokeWidth={1} strokeDasharray="3 3" />
            );
          })()}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 glass rounded-md px-3 py-2 pointer-events-none shadow-xl"
            style={{ top: tooltip.y - 60, left: tooltip.x + 10 }}>
            <p className="text-primary text-xs font-semibold">{tooltip.sector}</p>
            <p className="text-muted text-[10px] font-mono">{tooltip.date}{tooltip.forecast ? " (Forecast)" : ""}</p>
            <p className="font-mono text-sm font-bold mt-1" style={{ color: stressColor(tooltip.score) }}>
              {tooltip.score}
            </p>
          </div>
        )}
      </div>

      {!mini && (
        <p className="text-muted text-[10px] mt-2 font-mono">
          White dots = portfolio loans · Dashed cells = forecast · Click sector to analyze contagion
        </p>
      )}
    </div>
  );
}
