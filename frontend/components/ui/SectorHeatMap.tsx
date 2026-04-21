"use client";

import { useState } from "react";
import type { HeatMapData } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function stressColor(score: number): string {
  if (score <= 30) return "#00D4A4";
  if (score <= 50) return "#FFB300";
  if (score <= 70) return "#FF8C00";
  return "#FF3B5C";
}

function stressLabel(score: number): string {
  if (score <= 30) return "Low";
  if (score <= 50) return "Medium";
  if (score <= 70) return "High";
  return "Critical";
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  data: HeatMapData;
  onSectorClick?: (sector: string) => void;
  mini?: boolean;
}

export default function SectorHeatMap({ data, onSectorClick, mini = false }: Props) {
  const [tooltip, setTooltip] = useState<{
    sector: string;
    date: string;
    score: number;
    forecast: boolean;
    loans: number;
    x: number;
    y: number;
  } | null>(null);

  const allPoints = [...data.time_series, ...data.forecast];
  const todayStr  = new Date().toISOString().split("T")[0];

  // Mini: last 14 days. Full: all 37 points (30d history + 7d forecast).
  const visible       = mini ? allPoints.slice(-14) : allPoints;
  const forecastStart = visible.findIndex((p) => p.is_forecast);

  // Layout constants
  const cellW  = mini ? 22 : 26;
  const cellH  = mini ? 26 : 32;
  const gap    = 3;
  const labelW = mini ? 130 : 175;  // left column: sector name + loan count
  const xAxisH = 36;               // bottom row: date labels
  const headerH = forecastStart >= 0 ? 16 : 0; // top row: "FORECAST →" label

  const gridW  = visible.length * (cellW + gap) - gap;
  const totalW = labelW + gridW;
  const totalH = headerH + data.sectors.length * (cellH + gap) - gap + xAxisH;

  // Label every N columns on X-axis
  const labelEvery = mini ? 7 : 5;

  // Loans per sector
  const loansPerSector: Record<string, number> = {};
  data.portfolio_overlays.forEach((o) => {
    loansPerSector[o.sector_id] = (loansPerSector[o.sector_id] ?? 0) + 1;
  });

  return (
    <div className="glass rounded-lg p-4 overflow-x-auto">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <p className="text-primary text-sm font-semibold">Sector Stress Heat Map</p>
          <p className="text-muted text-[10px] font-mono mt-0.5">
            {mini
              ? "Last 14 days · Each cell = stress score (0–100) for that sector on that date"
              : "30-day history + 7-day forecast · Each cell = stress score (0–100) · Click a row to run contagion analysis"}
          </p>
        </div>

        {/* Legend — always visible */}
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap justify-end">
          {([ ["≤30 Low", "#00D4A4"], ["≤50 Medium", "#FFB300"], ["≤70 High", "#FF8C00"], [">70 Critical", "#FF3B5C"] ] as [string, string][]).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5 text-[10px] text-muted font-mono whitespace-nowrap">
              <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── SVG Grid ── */}
      <div className="relative">
        <svg width={totalW} height={totalH} style={{ overflow: "visible" }}>

          {/* Forecast shaded background */}
          {forecastStart >= 0 && (() => {
            const fx = labelW + forecastStart * (cellW + gap);
            const fw = gridW - forecastStart * (cellW + gap);
            const fy = headerH;
            const fh = data.sectors.length * (cellH + gap) - gap;
            return (
              <g>
                <rect x={fx} y={fy} width={fw} height={fh}
                  fill="rgba(107,127,163,0.07)" rx={4} />
                {/* Forecast divider line */}
                <line x1={fx} y1={fy} x2={fx} y2={fy + fh}
                  stroke="rgba(107,127,163,0.35)" strokeWidth={1} strokeDasharray="4 3" />
                {/* "FORECAST" label above grid */}
                <text x={fx + fw / 2} y={headerH - 3}
                  textAnchor="middle"
                  fill="#6B7FA3" fontSize={8} fontFamily="JetBrains Mono" fontWeight={600}
                  letterSpacing={1}>
                  FORECAST →
                </text>
              </g>
            );
          })()}

          {/* Sector rows */}
          {data.sectors.map((sector, si) => {
            const rowY  = headerH + si * (cellH + gap);
            const loans = loansPerSector[sector] ?? 0;

            return (
              <g key={sector}>
                {/* Sector name */}
                <text
                  x={labelW - (loans > 0 ? 52 : 8)}
                  y={rowY + cellH / 2 + 4}
                  textAnchor="end"
                  fill="#A8B8D0"
                  fontSize={mini ? 9 : 10}
                  fontFamily="Inter"
                  fontWeight={500}
                >
                  {mini && sector.length > 15 ? sector.slice(0, 14) + "…" : sector}
                </text>

                {/* Loan count badge — right of sector name, before grid */}
                {loans > 0 && (
                  <g>
                    <rect
                      x={labelW - 48}
                      y={rowY + cellH / 2 - 8}
                      width={38} height={16}
                      rx={4}
                      fill="rgba(107,127,163,0.15)"
                    />
                    <text
                      x={labelW - 29}
                      y={rowY + cellH / 2 + 4}
                      textAnchor="middle"
                      fill="#6B7FA3"
                      fontSize={8}
                      fontFamily="JetBrains Mono"
                    >
                      {loans} loan{loans !== 1 ? "s" : ""}
                    </text>
                  </g>
                )}

                {/* Cells */}
                {visible.map((pt, di) => {
                  const cx         = labelW + di * (cellW + gap);
                  const score      = Math.round(pt.scores[sector] ?? 0);
                  const isForecast = !!pt.is_forecast;
                  const isToday    = pt.date === todayStr;
                  const color      = stressColor(score);

                  return (
                    <g key={di}>
                      {/* Cell background */}
                      <rect
                        x={cx} y={rowY} width={cellW} height={cellH}
                        rx={3}
                        fill={color}
                        fillOpacity={isForecast ? 0.42 : 0.85}
                        stroke={isToday ? "rgba(255,255,255,0.7)" : "none"}
                        strokeWidth={isToday ? 1.5 : 0}
                        style={{ cursor: onSectorClick ? "pointer" : "default" }}
                        onMouseEnter={(e) => {
                          const r = (e.target as SVGRectElement).getBoundingClientRect();
                          setTooltip({ sector, date: pt.date, score, forecast: isForecast, loans, x: r.left, y: r.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => onSectorClick?.(sector)}
                      />
                      {/* Score number — always visible */}
                      <text
                        x={cx + cellW / 2}
                        y={rowY + cellH / 2 + 4}
                        textAnchor="middle"
                        fill={isForecast ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.95)"}
                        fontSize={cellW >= 22 ? 8 : 7}
                        fontFamily="JetBrains Mono"
                        fontWeight={700}
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        {score}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* ── X-axis date labels ── */}
          {visible.map((pt, di) => {
            const isToday   = pt.date === todayStr;
            const showLabel = di % labelEvery === 0 || isToday || di === visible.length - 1;
            if (!showLabel) return null;
            const cx = labelW + di * (cellW + gap) + cellW / 2;
            const ty = headerH + data.sectors.length * (cellH + gap) - gap + 16;
            return (
              <text key={di}
                x={cx} y={ty}
                textAnchor="middle"
                fill={isToday ? "#C8D6E8" : "#6B7FA3"}
                fontSize={isToday ? 9 : 8}
                fontWeight={isToday ? 700 : 400}
                fontFamily="JetBrains Mono"
              >
                {isToday ? "TODAY" : fmtDate(pt.date)}
              </text>
            );
          })}

          {/* TODAY vertical marker */}
          {(() => {
            const idx = visible.findIndex((p) => p.date === todayStr);
            if (idx < 0) return null;
            const cx = labelW + idx * (cellW + gap);
            const gy = headerH;
            const gh = data.sectors.length * (cellH + gap) - gap;
            return (
              <line x1={cx} y1={gy} x2={cx} y2={gy + gh}
                stroke="rgba(200,214,232,0.25)" strokeWidth={1} strokeDasharray="3 3" />
            );
          })()}

        </svg>

        {/* Hover tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 glass rounded-lg px-3 py-2.5 pointer-events-none shadow-xl border border-white/10"
            style={{ top: tooltip.y - 90, left: tooltip.x + 14 }}
          >
            <p className="text-primary text-xs font-semibold">{tooltip.sector}</p>
            <p className="text-muted text-[10px] font-mono mt-0.5">
              {fmtDate(tooltip.date)}{tooltip.forecast ? " · Forecast" : ""}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: stressColor(tooltip.score) }} />
              <span className="font-mono text-sm font-bold" style={{ color: stressColor(tooltip.score) }}>
                {tooltip.score}
              </span>
              <span className="text-muted text-[10px]">/ 100 — {stressLabel(tooltip.score)} stress</span>
            </div>
            {tooltip.loans > 0 && (
              <p className="text-muted text-[10px] font-mono mt-1">
                {tooltip.loans} portfolio loan{tooltip.loans !== 1 ? "s" : ""} in this sector
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.05]">
        <p className="text-muted text-[10px] font-mono">
          Scores 0–100 from sector monitoring agents · White outline = today
          {!mini && " · Click any row to run contagion analysis"}
        </p>
        {data.portfolio_overlays.length > 0 && (
          <p className="text-muted text-[10px] font-mono">
            {data.portfolio_overlays.length} portfolio loans mapped across {
              Object.keys(loansPerSector).length
            } sectors
          </p>
        )}
      </div>
    </div>
  );
}
