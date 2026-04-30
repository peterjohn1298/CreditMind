"use client";

import { useState } from "react";
import { FileText, TrendingUp, Send, Sparkles, Loader2, CheckCircle, Plus, Trash2 } from "lucide-react";
import { generateILPAReporting, generateILPAPerformance, generateLPNotice } from "@/lib/api";
import type {
  ILPAReportingTemplate, ILPAPerformanceTemplate, LPNotice, LPRosterEntry,
} from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type Tab = "reporting" | "performance" | "notice";

const DEFAULT_LP_ROSTER: LPRosterEntry[] = [
  { lp_name: "Yale Endowment",                commitment: 150_000_000, paid_in_to_date: 75_000_000 },
  { lp_name: "Texas TRS",                     commitment: 200_000_000, paid_in_to_date: 100_000_000 },
  { lp_name: "Calpers",                       commitment: 250_000_000, paid_in_to_date: 125_000_000 },
  { lp_name: "Singapore GIC",                 commitment: 175_000_000, paid_in_to_date:  87_500_000 },
  { lp_name: "Princeton University Investment", commitment: 100_000_000, paid_in_to_date: 50_000_000 },
];

export default function LPReportingPage() {
  const [tab, setTab] = useState<Tab>("reporting");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-primary text-xl font-bold">LP Reporting</h2>
        <p className="text-muted text-xs mt-1">
          ILPA Reporting Template 2.0 + Performance Template + Capital Call / Distribution notices.
          Mandatory format for major LP reporting from Q1 2026.
        </p>
      </div>

      <div className="flex border-b border-white/[0.06]">
        {([
          { id: "reporting",   label: "Reporting Template",  icon: FileText },
          { id: "performance", label: "Performance Template", icon: TrendingUp },
          { id: "notice",      label: "LP Notice Generator",  icon: Send },
        ] as { id: Tab; label: string; icon: typeof FileText }[]).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2",
                active
                  ? "text-accent border-accent"
                  : "text-muted border-transparent hover:text-primary"
              )}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "reporting"   && <ReportingTab />}
      {tab === "performance" && <PerformanceTab />}
      {tab === "notice"      && <NoticeTab />}
    </div>
  );
}

// ─── Reporting tab ───────────────────────────────────────────────────────────

function ReportingTab() {
  const [data, setData] = useState<ILPAReportingTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await generateILPAReporting();
      setData(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Header
        title="ILPA Reporting Template 2.0"
        subtitle="Capital Account · Schedule of Investments · NAV Bridge · Fees · Cash Flows"
        loading={loading}
        hasData={!!data}
        onRun={run}
      />
      {error && <p className="text-danger text-xs">Failed: {error}</p>}
      {data && (
        <div className="space-y-4">
          <SummaryCard data={data} />
          <Section title="NAV Bridge" rows={data.nav_bridge ? Object.entries(data.nav_bridge) : []} />
          <Section title="Cash Flows This Quarter" rows={data.cash_flows_quarter ? Object.entries(data.cash_flows_quarter) : []} />
          <Section title="Fees & Expenses" rows={data.fees_and_expenses ? Object.entries(data.fees_and_expenses) : []} />

          {data.capital_account?.length > 0 && (
            <div className="glass rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06]">
                <p className="text-primary text-sm font-semibold">Capital Account by LP Class</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-white/[0.02] border-b border-white/[0.06]">
                  <tr>
                    {["Class", "Commitment", "Called", "Distributed", "NAV"].map((h) => (
                      <th key={h} className="text-left px-4 py-2 text-muted text-[10px] font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.capital_account.map((c, i) => (
                    <tr key={i} className={cn("border-b border-white/[0.04] last:border-0", i % 2 === 1 && "bg-white/[0.015]")}>
                      <td className="px-4 py-2.5 text-primary text-xs font-medium">{c.lp_class}</td>
                      <td className="px-4 py-2.5 text-primary text-xs font-mono">{c.commitment != null ? formatCurrency(c.commitment) : "—"}</td>
                      <td className="px-4 py-2.5 text-primary text-xs font-mono">{c.called != null ? formatCurrency(c.called) : "—"}</td>
                      <td className="px-4 py-2.5 text-primary text-xs font-mono">{c.distributed != null ? formatCurrency(c.distributed) : "—"}</td>
                      <td className="px-4 py-2.5 text-primary text-xs font-mono">{c.nav != null ? formatCurrency(c.nav) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.narrative && (
            <div className="glass rounded-lg p-5">
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                Quarter in Review (LP Letter Narrative)
              </p>
              <p className="text-primary text-xs leading-relaxed whitespace-pre-wrap">{data.narrative}</p>
            </div>
          )}

          <DownloadBar
            payload={data}
            filename={`ILPA_RT_${data.report_period?.replace(/\s/g, "_") || "current"}.json`}
          />
        </div>
      )}
    </div>
  );
}

// ─── Performance tab ─────────────────────────────────────────────────────────

function PerformanceTab() {
  const [data, setData] = useState<ILPAPerformanceTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setData(await generateILPAPerformance());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Header
        title="ILPA Performance Template"
        subtitle="TVPI · DPI · RVPI · IRR — gross and net, with peer benchmark"
        loading={loading}
        hasData={!!data}
        onRun={run}
      />
      {error && <p className="text-danger text-xs">Failed: {error}</p>}
      {data && (
        <div className="space-y-4">
          <div className="glass rounded-lg p-5">
            <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-3">
              Since Inception · As of {data.as_of_date}
            </p>
            <div className="grid grid-cols-5 gap-3">
              {[
                ["TVPI Net",  data.since_inception?.tvpi_net,  "x"],
                ["DPI Net",   data.since_inception?.dpi_net,   "x"],
                ["RVPI Net",  data.since_inception?.rvpi_net,  "x"],
                ["IRR Net",   data.since_inception?.irr_net,   "%"],
                ["PIC %",     data.since_inception?.pic_pct,   "%"],
              ].map(([label, value, unit]) => (
                <div key={String(label)} className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
                  <p className="text-muted text-[10px] uppercase tracking-wider font-mono">{label as string}</p>
                  <p className="text-primary text-base font-mono font-semibold mt-1">
                    {value != null ? `${Number(value).toFixed(2)}${unit}` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Section title="Year to Date" rows={data.ytd ? Object.entries(data.ytd) : []} />
          <Section title="Loss History" rows={data.loss_history ? Object.entries(data.loss_history) : []} />
          <Section title="Benchmark Comparison" rows={data.benchmark_comparison ? Object.entries(data.benchmark_comparison) : []} />

          {data.narrative && (
            <div className="glass rounded-lg p-5">
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
                Performance Narrative
              </p>
              <p className="text-primary text-xs leading-relaxed">{data.narrative}</p>
            </div>
          )}

          <DownloadBar payload={data} filename={`ILPA_Performance_${data.as_of_date}.json`} />
        </div>
      )}
    </div>
  );
}

// ─── Notice tab ──────────────────────────────────────────────────────────────

function NoticeTab() {
  const [type, setType] = useState<"capital_call" | "distribution">("capital_call");
  const [amount, setAmount] = useState(50_000_000);
  const [purpose, setPurpose] = useState("Funding for Q3 2026 commitments — see Schedule A");
  const [roster, setRoster] = useState<LPRosterEntry[]>(DEFAULT_LP_ROSTER);
  const [data, setData] = useState<LPNotice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setData(await generateLPNotice(type, amount, purpose, roster));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function addLP() {
    setRoster([...roster, { lp_name: "New LP", commitment: 50_000_000, paid_in_to_date: 0 }]);
  }
  function removeLP(idx: number) {
    setRoster(roster.filter((_, i) => i !== idx));
  }
  function updateLP(idx: number, field: keyof LPRosterEntry, val: string | number) {
    setRoster(roster.map((lp, i) => i === idx ? { ...lp, [field]: val } : lp));
  }

  return (
    <div className="space-y-5">
      <div className="glass rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Send size={16} className="text-accent" />
            <p className="text-primary text-sm font-semibold">LP Notice Generator</p>
          </div>
          <button
            onClick={run}
            disabled={loading || roster.length === 0}
            className="flex items-center gap-1.5 bg-accent/10 border border-accent/30 text-accent rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? "Generating…" : "Generate Notice Batch"}
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Notice Type</p>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "capital_call" | "distribution")}
                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="capital_call">Capital Call</option>
                <option value="distribution">Distribution</option>
              </select>
            </div>
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Total Amount ($)</p>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-primary text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Pro-rata across</p>
              <p className="text-primary font-mono text-sm py-2">{roster.length} LPs</p>
            </div>
          </div>
          <div>
            <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Purpose</p>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-primary text-sm focus:outline-none focus:border-accent"
            />
          </div>

          {/* LP roster editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold">LP Roster</p>
              <button
                onClick={addLP}
                className="flex items-center gap-1 text-accent text-[10px] hover:brightness-110"
              >
                <Plus size={11} /> Add LP
              </button>
            </div>
            <div className="space-y-1.5">
              {roster.map((lp, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md bg-white/[0.02] border border-white/[0.06] px-2 py-1.5">
                  <input
                    value={lp.lp_name}
                    onChange={(e) => updateLP(i, "lp_name", e.target.value)}
                    className="flex-1 bg-transparent text-primary text-xs focus:outline-none"
                  />
                  <input
                    type="number"
                    value={lp.commitment}
                    onChange={(e) => updateLP(i, "commitment", parseFloat(e.target.value) || 0)}
                    className="w-32 bg-transparent text-primary text-xs font-mono text-right focus:outline-none"
                  />
                  <span className="text-muted text-[10px]">commitment</span>
                  <button onClick={() => removeLP(i)} className="text-muted hover:text-danger">
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-danger text-xs">Failed: {error}</p>}

      {data && (
        <div className="space-y-3">
          <div className="glass rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-primary text-sm font-semibold capitalize">
                  {data.notice_type.replace(/_/g, " ")}
                </p>
                <p className="text-muted text-[11px] mt-0.5">
                  Event {data.event_date} · Due {data.due_date} · Total {formatCurrency(data.total_amount ?? 0)}
                </p>
              </div>
              <CheckCircle size={14} className="text-success" />
            </div>
            <p className="text-primary text-xs leading-relaxed">{data.fund_note}</p>
          </div>

          <div className="space-y-2">
            {data.lp_notices.map((n, i) => (
              <div key={i} className="glass rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-primary text-xs font-semibold">{n.lp_name}</p>
                    <p className="text-muted text-[10px] mt-0.5">
                      Commitment {n.commitment != null ? formatCurrency(n.commitment) : "—"} ·{" "}
                      {n.ownership_pct != null ? `${n.ownership_pct.toFixed(2)}%` : "—"} of fund
                    </p>
                  </div>
                  <span className="text-accent text-sm font-mono font-semibold">
                    {n.amount != null ? formatCurrency(n.amount) : "—"}
                  </span>
                </div>
                <p className="text-primary text-[11px] leading-relaxed">{n.notice_paragraph}</p>
                <p className="text-muted text-[10px] font-mono mt-2">
                  Paid-in: {n.updated_paid_in != null ? formatCurrency(n.updated_paid_in) : "—"} ·
                  Unfunded: {n.updated_unfunded != null ? formatCurrency(n.updated_unfunded) : "—"}
                </p>
              </div>
            ))}
          </div>

          <DownloadBar payload={data} filename={`LP_Notices_${data.event_date}.json`} />
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Header({
  title, subtitle, loading, hasData, onRun,
}: {
  title:    string;
  subtitle: string;
  loading:  boolean;
  hasData:  boolean;
  onRun:    () => void;
}) {
  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-primary text-sm font-semibold">{title}</p>
          <p className="text-muted text-[11px] mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={onRun}
          disabled={loading}
          className="flex items-center gap-1.5 bg-accent/10 border border-accent/30 text-accent rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {loading ? "Generating…" : hasData ? "Re-generate" : "Generate"}
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ data }: { data: ILPAReportingTemplate }) {
  return (
    <div className="glass rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-primary text-sm font-semibold">{data.fund_name || "Fund"}</p>
          <p className="text-muted text-[11px]">{data.report_period} · As of {data.report_date}</p>
        </div>
        <span className={cn(
          "text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border",
          data.ilpa_compliance === "RT_2_0_COMPLIANT" ? "border-success/30 text-success" : "border-warning/30 text-warning"
        )}>
          {data.ilpa_compliance.replace(/_/g, " ")}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[
          ["Fund Size",    data.fund_size],
          ["Commitments",  data.commitments],
          ["Called",       data.called_to_date],
          ["Uncalled",     data.uncalled],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2">
            <p className="text-muted text-[10px] uppercase tracking-wider font-mono">{label as string}</p>
            <p className="text-primary text-sm font-mono mt-0.5">
              {value != null ? formatCurrency(Number(value)) : "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: Array<[string, unknown]> }) {
  if (rows.length === 0) return null;
  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06]">
        <p className="text-primary text-sm font-semibold">{title}</p>
      </div>
      <div className="px-5 py-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="text-muted capitalize">{k.replace(/_/g, " ")}</span>
              <span className="text-primary font-mono">
                {typeof v === "number" ? formatCurrency(v) : String(v ?? "—")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DownloadBar({ payload, filename }: { payload: object; filename: string }) {
  function download() {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={download}
        className="flex items-center gap-1.5 border border-white/[0.1] text-muted rounded-md px-3 py-1.5 text-xs hover:text-primary hover:border-white/[0.2] transition-colors"
      >
        Download JSON ({filename})
      </button>
    </div>
  );
}
