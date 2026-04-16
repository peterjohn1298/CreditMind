"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded bg-navy-700/60", className)} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-lg p-6 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr className="border-b border-navy-700/50">
      <td className="px-5 py-3"><Skeleton className="h-4 w-40" /></td>
      <td className="px-5 py-3"><Skeleton className="h-4 w-12" /></td>
      <td className="px-5 py-3"><Skeleton className="h-4 w-16" /></td>
      <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
      <td className="px-5 py-3"><Skeleton className="h-4 w-20" /></td>
    </tr>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </>
  );
}
