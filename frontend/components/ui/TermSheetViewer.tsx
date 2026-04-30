"use client";

import { useState } from "react";
import { FileText, Sparkles, ChevronDown, ChevronUp, Shield, Handshake, MessageSquare, Loader2 } from "lucide-react";
import { generateDocs } from "@/lib/api";
import type { DocumentationResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

type Section = "term" | "red" | "concession" | "pushback";

interface Props {
  dealId:      string;
  /** Pre-existing data on the deal — if present, skip generate step. */
  existing?:   Partial<DocumentationResponse>;
}

export default function TermSheetViewer({ dealId, existing }: Props) {
  const initial: DocumentationResponse | null = existing && existing.term_sheet
    ? {
        deal_id:           dealId,
        term_sheet:        existing.term_sheet ?? {},
        red_lines:         existing.red_lines ?? [],
        concession_map:    existing.concession_map ?? [],
        borrower_pushback: existing.borrower_pushback ?? [],
      }
    : null;

  const [data, setData] = useState<DocumentationResponse | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Section>("term");

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await generateDocs(dealId);
      setData(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={16} className="text-accent" />
          <div>
            <p className="text-primary text-sm font-semibold">Term Sheet & Negotiation Guide</p>
            <p className="text-muted text-[11px]">
              AI-generated commercial terms, red lines, concession map, and predicted sponsor pushback.
            </p>
          </div>
        </div>
        {!data && (
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-1.5 bg-accent/10 border border-accent/30 text-accent rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? "Generating…" : "Generate"}
          </button>
        )}
      </div>

      {error && (
        <div className="px-5 py-3 text-danger text-xs">
          Could not generate term sheet: {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="px-5 py-8 text-center">
          <p className="text-muted text-xs max-w-md mx-auto">
            Click Generate to run the Documentation Agent — produces a structured term sheet,
            non-negotiable red lines, concession map, and predicted borrower pushback in ~30 seconds.
          </p>
        </div>
      )}

      {data && (
        <div className="divide-y divide-white/[0.04]">
          <SectionRow
            id="term"      open={open} setOpen={setOpen}
            icon={FileText}     iconColor="#7B8FF7"
            title="Term Sheet"
            count={Object.keys(data.term_sheet ?? {}).length}
          >
            <TermSheetRender data={data.term_sheet} />
          </SectionRow>

          <SectionRow
            id="red"       open={open} setOpen={setOpen}
            icon={Shield}       iconColor="#FF3B5C"
            title="Red Lines (non-negotiable)"
            count={data.red_lines?.length ?? 0}
          >
            <ListRender items={data.red_lines} primaryKey="term" secondaryKey="reason" tone="danger" />
          </SectionRow>

          <SectionRow
            id="concession" open={open} setOpen={setOpen}
            icon={Handshake}    iconColor="#FFB300"
            title="Concession Map"
            count={data.concession_map?.length ?? 0}
          >
            <ListRender items={data.concession_map} primaryKey="term" secondaryKey="flexibility" tertiaryKey="max_concession" tone="warning" />
          </SectionRow>

          <SectionRow
            id="pushback"  open={open} setOpen={setOpen}
            icon={MessageSquare} iconColor="#00D4A4"
            title="Predicted Borrower Pushback"
            count={data.borrower_pushback?.length ?? 0}
          >
            <PushbackRender items={data.borrower_pushback} />
          </SectionRow>
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function SectionRow({
  id, open, setOpen, icon: Icon, iconColor, title, count, children,
}: {
  id:        Section;
  open:      Section;
  setOpen:   (s: Section) => void;
  icon:      React.ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  title:     string;
  count:     number;
  children:  React.ReactNode;
}) {
  const isOpen = open === id;
  return (
    <div>
      <button
        onClick={() => setOpen(isOpen ? ("" as Section) : id)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Icon size={14} color={iconColor} />
          <p className="text-primary text-xs font-semibold">{title}</p>
          <span className="text-muted text-[10px] font-mono">{count}</span>
        </div>
        {isOpen ? <ChevronUp size={12} className="text-muted" /> : <ChevronDown size={12} className="text-muted" />}
      </button>
      {isOpen && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

function TermSheetRender({ data }: { data: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-muted text-xs italic">No term sheet content.</p>;
  }
  return (
    <div className="space-y-3">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
          <p className="text-muted text-[10px] uppercase tracking-wider font-mono mb-1">
            {k.replace(/_/g, " ")}
          </p>
          <div className="text-primary text-xs leading-relaxed">
            {renderValue(v)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListRender({
  items, primaryKey, secondaryKey, tertiaryKey, tone,
}: {
  items:        Array<Record<string, unknown> | string> | undefined;
  primaryKey:   string;
  secondaryKey: string;
  tertiaryKey?: string;
  tone:         "danger" | "warning";
}) {
  if (!items || items.length === 0) {
    return <p className="text-muted text-xs italic">None.</p>;
  }
  const accent = tone === "danger" ? "text-danger" : "text-warning";
  return (
    <ul className="space-y-2">
      {items.map((item, i) => {
        if (typeof item === "string") {
          return <li key={i} className="text-primary text-xs leading-relaxed">{item}</li>;
        }
        return (
          <li key={i} className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
            <p className={cn("text-xs font-semibold mb-1", accent)}>
              {String(item[primaryKey] ?? "")}
            </p>
            <p className="text-muted text-[11px] leading-relaxed">{String(item[secondaryKey] ?? "")}</p>
            {tertiaryKey && Boolean(item[tertiaryKey]) && (
              <p className="text-muted text-[10px] mt-1 font-mono">
                Max concession: {String(item[tertiaryKey])}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PushbackRender({ items }: { items: Array<Record<string, unknown> | string> | undefined }) {
  if (!items || items.length === 0) {
    return <p className="text-muted text-xs italic">No pushback predicted.</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        if (typeof item === "string") {
          return <p key={i} className="text-primary text-xs leading-relaxed">{item}</p>;
        }
        return (
          <div key={i} className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
            <p className="text-success text-xs font-semibold mb-2">{String(item.topic ?? "")}</p>
            <div className="space-y-1.5">
              <div>
                <p className="text-muted text-[10px] uppercase tracking-wider font-mono mb-0.5">Sponsor argument</p>
                <p className="text-primary text-[11px] leading-relaxed">{String(item.sponsor_argument ?? "")}</p>
              </div>
              <div>
                <p className="text-muted text-[10px] uppercase tracking-wider font-mono mb-0.5">Fund response</p>
                <p className="text-primary text-[11px] leading-relaxed">{String(item.fund_response ?? "")}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderValue(v: unknown): React.ReactNode {
  if (v == null) return <span className="text-muted">—</span>;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    return (
      <ul className="space-y-1 list-disc list-inside">
        {v.map((x, i) => <li key={i}>{renderValue(x)}</li>)}
      </ul>
    );
  }
  if (typeof v === "object") {
    return (
      <div className="space-y-1">
        {Object.entries(v as Record<string, unknown>).map(([k, val]) => (
          <div key={k} className="flex gap-2">
            <span className="text-muted text-[10px] font-mono uppercase tracking-wider shrink-0">
              {k.replace(/_/g, " ")}:
            </span>
            <span className="text-primary text-[11px]">{renderValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }
  return String(v);
}
