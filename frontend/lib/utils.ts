import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function getRiskColor(score: number): string {
  if (score <= 30) return "#00D4A4";
  if (score <= 60) return "#FFB300";
  if (score <= 80) return "#FF8C00";
  return "#FF3B5C";
}

export function getSeverityColor(severity: string): string {
  switch (severity.toUpperCase()) {
    case "CRITICAL": return "#FF3B5C";
    case "HIGH":     return "#FF8C00";
    case "MEDIUM":   return "#FFB300";
    case "LOW":      return "#00D4A4";
    default:         return "#6B7FA3";
  }
}
