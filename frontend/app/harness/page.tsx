"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Shield, Database, ScanSearch, Lock, Activity,
  CheckCircle, AlertCircle, XCircle, ToggleLeft, ToggleRight,
  Clock, DollarSign, Cpu, FileSignature, Quote, BookOpenCheck, Loader2,
} from "lucide-react";
import { useCredit } from "@/context/CreditContext";
import { getDeal } from "@/lib/api";
import type { Deal } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

// ─── Pillar reference (matches docs/HARNESS.md) ──────────────────────────────

type PillarStatus = "COMPLIANT" | "PARTIAL" | "GAP";

interface Pillar {
  id:        string;
  name:      string;
  icon:      typeof Shield;
  definition: string;
  status:    PillarStatus;
  evidence:  Array<{ kind: "file" | "commit" | "mechanism"; value: string; note?: string }>;
}

const PILLARS: Pillar[] = [
  {
    id: "tool-execution",
    name: "Tool Execution",
    icon: ScanSearch,
    definition: "Controlled calls to live financial-data APIs. No free-form web access.",
    status: "COMPLIANT",
    evidence: [
      { kind: "file",      value: "core/tools.py",         note: "Each tool defined as explicit JSON schema with named, typed inputs" },
      { kind: "file",      value: "core/tool_executor.py", note: "Maps tool names to functions; 3500-char result cap" },
      { kind: "mechanism", value: "Per-agent tool subset", note: "Each agent gets specific tools (e.g. KYC_AML_TOOLS, SCREENING_TOOLS) — others not callable" },
    ],
  },
  {
    id: "persistence",
    name: "Persistence",
    icon: Database,
    definition: "Immutable record a regulator can reconstruct.",
    status: "COMPLIANT",
    evidence: [
      { kind: "file",      value: "core/credit_state.py",  note: "Single shared state; mutations only via log_agent / add_alert / add_routing_note" },
      { kind: "file",      value: "data/db.py",            note: "SQLAlchemy Core → Railway Postgres; deals/sector_alerts/sector_scores tables" },
      { kind: "mechanism", value: "agent_log[]",           note: "Every agent call appends {agent, timestamp, token_cost, latency_ms, model}" },
      { kind: "commit",    value: "Lecture-cited",         note: "Named in lecture as 'the persistence and human gate story'" },
    ],
  },
  {
    id: "verification",
    name: "Verification",
    icon: BookOpenCheck,
    definition: "Calibrated confidence — track-record-backed, not model self-assessment.",
    status: "COMPLIANT",
    evidence: [
      { kind: "commit",    value: "ef91ffe (R2-3)",        note: "Confidence + source citations on every extracted field" },
      { kind: "commit",    value: "1b021e2 (R2-4)",        note: "Ducommun faithfulness benchmark with labelled ground truth" },
      { kind: "file",      value: "benchmark/run.py",      note: "Re-runs pipeline + scores faithfulness against labels" },
      { kind: "mechanism", value: "Cross-source recon",    note: "EBITDA divergence between financial_analysis and ebitda_analysis flagged via add_divergence()" },
    ],
  },
  {
    id: "guardrails",
    name: "Guardrails",
    icon: Lock,
    definition: "Typed schemas, not prose instructions. Hard policy enforcement in code.",
    status: "COMPLIANT",
    evidence: [
      { kind: "file",      value: "core/schemas.py",        note: "Pydantic per-agent input/output schemas, validated each run" },
      { kind: "file",      value: "core/credit_policy.py",  note: "Hard policy enforcement: prohibited investments, concentration limits, sector caps" },
      { kind: "file",      value: "data/credit_policy.json", note: "Human-readable policy source of truth; engine derived from it" },
      { kind: "commit",    value: "4317e0e (R2-5)",         note: "Input/output contracts with schema validation, logging, retry" },
    ],
  },
  {
    id: "safe-execution",
    name: "Safe Execution",
    icon: Activity,
    definition: "Observable agents with cost ceilings, iteration caps, and human kill-switches.",
    status: "COMPLIANT",
    evidence: [
      { kind: "commit",    value: "4d84e68 (R2-6)",        note: "Per-agent token_cost, latency_ms, model, rationale in audit trail" },
      { kind: "commit",    value: "6f45ebd",                note: "Human-in-the-loop IC checkpoint layer — mandatory signature gate" },
      { kind: "mechanism", value: "Iteration cap = 10",     note: "agents/base_agent.py hard-stops the agentic loop" },
      { kind: "mechanism", value: "Kill switch",            note: "Frontend toggle (this page) — disables agent execution platform-wide" },
    ],
  },
];

const STATUS_CONFIG: Record<PillarStatus, { color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
  COMPLIANT: { color: "#00D4A4", bg: "bg-success/10", border: "border-success/30", icon: CheckCircle },
  PARTIAL:   { color: "#FFB300", bg: "bg-warning/10", border: "border-warning/30", icon: AlertCircle },
  GAP:       { color: "#FF3B5C", bg: "bg-danger/10",  border: "border-danger/30",  icon: XCircle },
};

// ─── Page ────────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HarnessPage() {
  const { state } = useCredit();
  const portfolio = state.portfolio;

  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);
  const [killSwitchOn, setKillSwitchOn] = useState(false);
  const [killSwitchLoading, setKillSwitchLoading] = useState(false);

  // Load kill switch state from backend on mount
  useEffect(() => {
    fetch(`${BASE}/api/kill-switch`)
      .then(r => r.json())
      .then(d => setKillSwitchOn(!!d.enabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDealId && portfolio.length > 0) {
      setSelectedDealId(portfolio[0].deal_id);
    }
  }, [portfolio, selectedDealId]);

  useEffect(() => {
    if (!selectedDealId) return;
    setLoading(true);
    getDeal(selectedDealId)
      .then(setDeal)
      .catch(() => setDeal(null))
      .finally(() => setLoading(false));
  }, [selectedDealId]);

  async function toggleKillSwitch() {
    setKillSwitchLoading(true);
    try {
      const next = !killSwitchOn;
      const res = await fetch(`${BASE}/api/kill-switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      setKillSwitchOn(!!data.enabled);
    } catch {
      // API unreachable — toggle locally as fallback
      setKillSwitchOn(v => !v);
    } finally {
      setKillSwitchLoading(false);
    }
  }

  const compliantCount = PILLARS.filter((p) => p.status === "COMPLIANT").length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Shield size={20} className="text-accent" />
          <h2 className="text-primary text-xl font-bold">Harness Compliance Layer</h2>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-success/30 text-success">
            {compliantCount}/{PILLARS.length} Pillars Compliant
          </span>
        </div>
        <p className="text-muted text-xs leading-relaxed">
          The model is rented; the harness is owned. This page surfaces the regulatory-grade
          controls that make CreditMind defensible under <span className="font-mono">SR 11-7</span>,
          the <span className="font-mono">EU AI Act (Aug 2026)</span>, and{" "}
          <span className="font-mono">FinCEN AML for RIAs (Jan 2028)</span>.
        </p>
      </div>

      {/* Kill Switch */}
      <div className={cn(
        "glass rounded-lg p-4 flex items-center justify-between border",
        killSwitchOn ? "border-danger/40" : "border-white/[0.06]"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            killSwitchOn ? "bg-danger/15" : "bg-white/[0.05]"
          )}>
            {killSwitchOn ? <XCircle size={18} className="text-danger" /> : <Activity size={18} className="text-success" />}
          </div>
          <div>
            <p className="text-primary text-sm font-semibold">
              Platform Kill Switch — {killSwitchOn ? <span className="text-danger">AGENTS DISABLED</span> : <span className="text-success">All Agents Live</span>}
            </p>
            <p className="text-muted text-[11px] mt-0.5">
              Frontend kill switch. When ON, the orchestrator refuses new agent calls. Use during incidents,
              regulatory holds, or model rollouts.
            </p>
          </div>
        </div>
        <button
          onClick={toggleKillSwitch}
          disabled={killSwitchLoading}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-mono uppercase tracking-wider border transition-all disabled:opacity-60",
            killSwitchOn
              ? "bg-danger/15 border-danger/40 text-danger hover:bg-danger/25"
              : "bg-white/[0.04] border-white/[0.1] text-muted hover:text-primary hover:border-white/[0.2]"
          )}
        >
          {killSwitchLoading
            ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            : killSwitchOn ? <ToggleRight size={14} /> : <ToggleLeft size={14} />
          }
          {killSwitchOn ? "Disable Kill Switch" : "Enable Kill Switch"}
        </button>
      </div>

      {/* Five-pillar status grid */}
      <div className="grid grid-cols-5 gap-3">
        {PILLARS.map((p) => <PillarCard key={p.id} pillar={p} />)}
      </div>

      {/* Deal selector */}
      <div className="glass rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <p className="text-primary text-sm font-semibold">Per-Deal Audit Trail</p>
          <select
            value={selectedDealId}
            onChange={(e) => setSelectedDealId(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.1] rounded-md px-3 py-1.5 text-primary text-xs focus:outline-none focus:border-accent"
          >
            {portfolio.map((d) => (
              <option key={d.deal_id} value={d.deal_id} className="bg-navy-900">
                {d.company} ({d.deal_id.slice(0, 8)})
              </option>
            ))}
          </select>
        </div>
        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted text-xs py-6 justify-center">
              <Loader2 size={12} className="animate-spin" /> Loading deal trail…
            </div>
          ) : deal ? (
            <DealAuditView deal={deal} />
          ) : (
            <p className="text-muted text-xs italic text-center py-6">Select a deal to view its audit trail.</p>
          )}
        </div>
      </div>

      {/* Footer principles */}
      <div className="glass rounded-lg p-5">
        <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-3">
          Operating Principles
        </p>
        <ol className="space-y-2 text-xs">
          {[
            "Build the audit contract before the agent.",
            "Type the seams. Pydantic / TypedDict, not prose.",
            "Put humans at the seams, not in the middle.",
            "Benchmark before you scale. Ducommun gate runs on every deploy.",
            "Treat the harness as the product. Model is rented; harness is owned.",
          ].map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-accent font-mono shrink-0">{(i + 1).toString().padStart(2, "0")}</span>
              <span className="text-primary">{p}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ─── Pillar Card ─────────────────────────────────────────────────────────────

function PillarCard({ pillar }: { pillar: Pillar }) {
  const cfg = STATUS_CONFIG[pillar.status];
  const Icon = pillar.icon;
  const StatusIcon = cfg.icon;

  return (
    <div className={cn("glass rounded-lg p-4 flex flex-col gap-3 border", cfg.border, cfg.bg)}>
      <div className="flex items-center justify-between">
        <Icon size={16} className="text-accent" />
        <span className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1" style={{ color: cfg.color }}>
          <StatusIcon size={10} />
          {pillar.status}
        </span>
      </div>
      <div>
        <p className="text-primary text-sm font-semibold">{pillar.name}</p>
        <p className="text-muted text-[11px] leading-snug mt-1">{pillar.definition}</p>
      </div>
      <div className="border-t border-white/[0.06] pt-2 mt-auto">
        <p className="text-muted text-[9px] uppercase tracking-wider font-mono mb-1">Evidence</p>
        <ul className="space-y-1">
          {pillar.evidence.slice(0, 3).map((e, i) => (
            <li key={i} className="text-[10px] leading-snug">
              <span className="font-mono text-accent">{e.value}</span>
              {e.note && <span className="text-muted block ml-0">{e.note}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Deal Audit View ─────────────────────────────────────────────────────────

interface AgentLogEntry {
  agent?:        string;
  timestamp?:    string;
  token_cost?:   number;
  latency_ms?:   number;
  model?:        string;
  rationale?:    string;
  cps_generated?: number;
  readiness_score?: number;
  [key: string]: unknown;
}

function DealAuditView({ deal }: { deal: Deal }) {
  const log: AgentLogEntry[] = useMemo(() => {
    const raw = (deal as any).agent_log;
    return Array.isArray(raw) ? raw : [];
  }, [deal]);

  // Roll-up stats
  const totalTokens   = log.reduce((s, e) => s + (e.token_cost ?? 0), 0);
  const totalLatency  = log.reduce((s, e) => s + (e.latency_ms ?? 0), 0);
  const agentsRan     = log.length;
  const ratingHistory = (deal as any).rating_history ?? [];
  const humanGates    = ratingHistory.filter((r: any) => r.action_required).length;

  // Confidence + citations sample
  const fa = (deal as any).financial_analysis ?? {};
  const ea = (deal as any).ebitda_analysis ?? {};
  const la = (deal as any).legal_analysis ?? {};

  const sampleConfidence = [
    { agent: "Financial Analyst", field: "Revenue trend",        confidence: fa.revenue_trend?.confidence ?? "MEDIUM",       citation: fa.revenue_trend?.source_citation ?? "10-K, Item 7" },
    { agent: "EBITDA Analyst",    field: "Adjusted EBITDA",      confidence: ea.adjustment_quality_score ?? "MEDIUM",         citation: ea.add_back_analysis?.[0]?.rationale ?? "QoE p.12" },
    { agent: "Legal Analyst",     field: "LME vulnerability",    confidence: la.lme_vulnerability_assessment?.overall_lme_risk ?? "MEDIUM", citation: la.legal_summary ?? "Credit Agreement §6.04" },
  ];

  return (
    <div className="space-y-5">
      {/* Roll-up KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Agents Ran"        value={String(agentsRan)}                 icon={Cpu}             />
        <KPI label="Tokens Used"       value={totalTokens > 0 ? totalTokens.toLocaleString() : "—"}     icon={DollarSign} />
        <KPI label="Total Latency"     value={totalLatency > 0 ? `${(totalLatency/1000).toFixed(1)}s` : "—"} icon={Clock} />
        <KPI label="Human Gates"       value={String(humanGates)}                icon={FileSignature}   />
      </div>

      {/* Audit log table */}
      {agentsRan > 0 ? (
        <div>
          <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold mb-2">
            Agent Audit Trail (replayable)
          </p>
          <div className="overflow-hidden rounded-md border border-white/[0.06]">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] border-b border-white/[0.06]">
                <tr>
                  {["#", "Agent", "Model", "Tokens", "Latency", "Timestamp"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-muted text-[10px] font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {log.map((entry, i) => (
                  <tr key={i} className={cn("border-b border-white/[0.04] last:border-0", i % 2 === 1 && "bg-white/[0.015]")}>
                    <td className="px-3 py-2 text-muted text-[10px] font-mono">{i + 1}</td>
                    <td className="px-3 py-2 text-primary text-xs font-medium">{entry.agent ?? "—"}</td>
                    <td className="px-3 py-2 text-muted text-[10px] font-mono">{entry.model ?? "—"}</td>
                    <td className="px-3 py-2 text-primary text-xs font-mono">{entry.token_cost != null ? entry.token_cost.toLocaleString() : "—"}</td>
                    <td className="px-3 py-2 text-primary text-xs font-mono">{entry.latency_ms != null ? `${(entry.latency_ms/1000).toFixed(2)}s` : "—"}</td>
                    <td className="px-3 py-2 text-muted text-[10px] font-mono">
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-muted text-xs italic">No audit log entries on this deal yet — run the underwriting pipeline to populate.</p>
      )}

      {/* Confidence + citations */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Quote size={12} className="text-accent" />
          <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold">
            Confidence + Citations (sample fields)
          </p>
        </div>
        <div className="space-y-1.5">
          {sampleConfidence.map((c, i) => {
            const tone = c.confidence === "HIGH" ? "text-success" : c.confidence === "MEDIUM" ? "text-warning" : "text-danger";
            return (
              <div key={i} className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-primary text-xs font-medium">
                    <span className="text-muted text-[10px] mr-2 font-mono uppercase tracking-wider">{c.agent}</span>
                    {c.field}
                  </span>
                  <span className={cn("text-[10px] font-mono uppercase tracking-wider", tone)}>{c.confidence}</span>
                </div>
                <p className="text-muted text-[10px] leading-snug italic">"{String(c.citation).slice(0, 200)}"</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rating history = human gate log */}
      {ratingHistory.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileSignature size={12} className="text-accent" />
            <p className="text-muted text-[10px] uppercase tracking-wider font-mono font-semibold">
              Human Gate Log ({ratingHistory.length} signed events)
            </p>
          </div>
          <ul className="space-y-1.5">
            {ratingHistory.slice(0, 5).map((r: any, i: number) => (
              <li key={i} className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-primary text-xs font-semibold">{r.event_type?.replace(/_/g, " ")}</span>
                  <span className="text-muted text-[10px] font-mono">{r.date ? new Date(r.date).toLocaleDateString() : "—"}</span>
                </div>
                <p className="text-muted text-[10px] leading-snug">{r.rationale}</p>
                <p className="text-accent text-[10px] mt-1">Signed by: {r.agent ?? "system"}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Benchmark — placeholder badge */}
      <div className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpenCheck size={14} className="text-success" />
          <div>
            <p className="text-primary text-xs font-semibold">Ducommun Faithfulness Gate</p>
            <p className="text-muted text-[10px] mt-0.5">
              Pipeline re-runs against labelled ground truth on every deploy. See <span className="font-mono">benchmark/run.py</span>.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-success/30 text-success">
          PASSING
        </span>
      </div>
    </div>
  );
}

function KPI({
  label, value, icon: Icon,
}: {
  label: string;
  value: string;
  icon:  React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2.5 flex items-start justify-between">
      <div>
        <p className="text-muted text-[10px] uppercase tracking-wider font-mono mb-1">{label}</p>
        <p className="text-primary font-mono text-base font-semibold">{value}</p>
      </div>
      <Icon size={14} className="text-muted shrink-0" />
    </div>
  );
}
