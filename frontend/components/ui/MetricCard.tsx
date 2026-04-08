import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  delta?: number;
  deltaType?: "up" | "down";
  icon?: LucideIcon;
  isCurrency?: boolean;
}

export default function MetricCard({ label, value, delta, deltaType, icon: Icon, isCurrency }: Props) {
  const display = isCurrency && typeof value === "number" ? formatCurrency(value) : value;

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-lg p-6 flex flex-col gap-3 hover:border-navy-600 transition-colors duration-150">
      <div className="flex items-center justify-between">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest">{label}</p>
        {Icon && <Icon size={16} className="text-muted" />}
      </div>
      <p className="text-primary font-mono text-2xl font-bold">{display}</p>
      {delta !== undefined && (
        <div className={cn("flex items-center gap-1 text-xs font-mono",
          deltaType === "up" ? "text-success" : "text-danger"
        )}>
          {deltaType === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{Math.abs(delta)}%</span>
        </div>
      )}
    </div>
  );
}
