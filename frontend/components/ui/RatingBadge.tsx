import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  "AAA": "bg-success/20 text-success border border-success/30",
  "AA+": "bg-success/20 text-success border border-success/30",
  "AA":  "bg-success/20 text-success border border-success/30",
  "AA-": "bg-success/20 text-success border border-success/30",
  "A+":  "bg-success/20 text-success border border-success/30",
  "A":   "bg-success/20 text-success border border-success/30",
  "A-":  "bg-success/20 text-success border border-success/30",
  "BBB+":"bg-accent/20 text-accent border border-accent/30",
  "BBB": "bg-accent/20 text-accent border border-accent/30",
  "BBB-":"bg-accent/20 text-accent border border-accent/30",
  "BB+": "bg-warning/20 text-warning border border-warning/30",
  "BB":  "bg-warning/20 text-warning border border-warning/30",
  "BB-": "bg-warning/20 text-warning border border-warning/30",
  "B+":  "bg-warning/20 text-warning border border-warning/30",
  "B":   "bg-warning/20 text-warning border border-warning/30",
  "B-":  "bg-warning/20 text-warning border border-warning/30",
  "CCC": "bg-danger/20 text-danger border border-danger/30",
  "CC":  "bg-danger/20 text-danger border border-danger/30",
  "C":   "bg-danger/20 text-danger border border-danger/30",
  "D":   "bg-danger/20 text-danger border border-danger/30",
};

export default function RatingBadge({ rating }: { rating: string }) {
  const cls = COLORS[rating] ?? "bg-navy-700 text-muted border border-navy-600";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold", cls)}>
      {rating}
    </span>
  );
}
