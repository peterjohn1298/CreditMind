interface Props { score: number; size?: "sm" | "lg"; }

// Unique gradient ID per page render is unnecessary — all gauges share same gradient definition
const GRAD_ID = "rg-gradient";

export default function RiskGauge({ score, size = "sm" }: Props) {
  const r   = size === "lg" ? 54 : 32;
  const sw  = size === "lg" ? 9  : 6;   // stroke width
  const cx  = r + sw + 2;
  const cy  = r + sw + 2;
  const w   = cx * 2;
  const h   = cy + sw;

  const circumference = Math.PI * r;
  const pct  = Math.min(1, Math.max(0, score / 100));
  const fill = pct * circumference;

  // Point on arc at given score percentage (angle=π at left, 0 at right)
  const angle = Math.PI * (1 - pct);
  const dotX  = cx + r * Math.cos(angle);
  const dotY  = cy - r * Math.sin(angle);

  // Tick mark positions at 25 / 50 / 75
  const ticks = [0.25, 0.5, 0.75].map((p) => {
    const a = Math.PI * (1 - p);
    const inner = r - sw / 2 - 2;
    const outer = r + sw / 2 + 2;
    return {
      x1: cx + inner * Math.cos(a),
      y1: cy - inner * Math.sin(a),
      x2: cx + outer * Math.cos(a),
      y2: cy - outer * Math.sin(a),
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={GRAD_ID} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="#00D4A4" />
            <stop offset="50%"  stopColor="#FFB300" />
            <stop offset="100%" stopColor="#FF3B5C" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none"
          stroke={`url(#${GRAD_ID})`}
          strokeWidth={sw}
          strokeLinecap="round"
          opacity={0.18}
        />

        {/* Filled arc */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none"
          stroke={`url(#${GRAD_ID})`}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)" }}
        />

        {/* Tick marks (large only) */}
        {size === "lg" && ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="rgba(107,127,163,0.5)" strokeWidth={1} />
        ))}

        {/* Score dot at arc tip */}
        {pct > 0 && pct < 1 && (
          <circle cx={dotX} cy={dotY} r={size === "lg" ? 4 : 2.5}
            fill="#0A1628" stroke={`url(#${GRAD_ID})`} strokeWidth={1.5} />
        )}

        {/* Score text */}
        <text
          x={cx} y={cy - (size === "lg" ? 6 : 3)}
          textAnchor="middle"
          fontSize={size === "lg" ? 20 : 11}
          fontFamily="JetBrains Mono"
          fontWeight="700"
          fill={score >= 66 ? "#FF3B5C" : score >= 33 ? "#FFB300" : "#00D4A4"}
        >
          {score}
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
