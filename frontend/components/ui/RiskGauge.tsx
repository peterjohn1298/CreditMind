import { getRiskColor } from "@/lib/utils";

interface Props { score: number; size?: "sm" | "lg"; }

export default function RiskGauge({ score, size = "sm" }: Props) {
  const r = size === "lg" ? 52 : 32;
  const cx = r + 8;
  const cy = r + 8;
  const total = size === "lg" ? 116 : 116;
  const w = (cx) * 2;
  const h = cx + 8;

  const circumference = Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const fill = pct * circumference;
  const color = getRiskColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* Track */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none" stroke="#162B52" strokeWidth={size === "lg" ? 10 : 7} strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none" stroke={color} strokeWidth={size === "lg" ? 10 : 7} strokeLinecap="round"
          strokeDasharray={`${fill} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
        {/* Score */}
        <text x={cx} y={cy - (size === "lg" ? 4 : 2)} textAnchor="middle"
          fill={color} fontSize={size === "lg" ? 18 : 12} fontFamily="JetBrains Mono" fontWeight="bold">
          {score}
        </text>
      </svg>
    </div>
  );
}
