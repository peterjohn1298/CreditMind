"use client";

import { Users, MapPin, Star, Briefcase, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Sector classification ────────────────────────────────────────────────────

const CONSUMER_FACING_SECTORS = new Set([
  "Consumer & Retail",
  "Food & Beverage",
  "Food & Agriculture",
  "Healthcare",
  "Media & Entertainment",
]);

// For Healthcare specifically, some sub-sectors are B2B.
// We detect this by checking whether the Places call actually returned
// a meaningful result (review_count > 0). If not, we suppress the widget.

// ─── B2B alternative data map ─────────────────────────────────────────────────

const B2B_ALT_DATA: Record<string, { signals: string[]; rationale: string }> = {
  "Aerospace & Defense": {
    signals: [
      "Satellite imagery of manufacturing facilities (production cadence proxy)",
      "DoD / NATO contract award databases (SAM.gov, FPDS)",
      "Defense procurement notices & SBIR/STTR activity",
      "Rare earth & aerospace-grade titanium supply chain indices",
      "Export control filing trends (ITAR/EAR)",
    ],
    rationale: "Revenue for defense manufacturers is driven by government contract awards and production output — not consumer foot traffic. Procurement databases and satellite production monitoring are the relevant signals.",
  },
  "Technology": {
    signals: [
      "Web traffic analytics — monthly unique visitors (SimilarWeb)",
      "GitHub repository commit activity & contributor growth",
      "App store rankings, ratings & download velocity",
      "G2 / Capterra enterprise software review scores",
      "LinkedIn headcount growth & role-level hiring trends",
    ],
    rationale: "For B2B/SaaS technology companies, digital engagement and developer activity lead revenue recognition by 1–2 quarters and are strong predictors of net revenue retention.",
  },
  "Energy": {
    signals: [
      "Satellite imagery of drilling sites & well pad activity",
      "Baker Hughes rig count by basin",
      "EIA weekly crude production & inventory reports",
      "Pipeline throughput data (FERC filings)",
      "Carbon credit market pricing (for energy transition exposure)",
    ],
    rationale: "Energy credit quality tracks production volumes and commodity prices. Satellite rig counts and EIA data move ahead of earnings by weeks and provide independent verification of management guidance.",
  },
  "Industrials": {
    signals: [
      "Freight rate indices — Cass Freight, DAT Spot Rate",
      "ISM Manufacturing PMI & new orders sub-index",
      "Factory utilization rates (Federal Reserve G.17)",
      "Port throughput & container dwell times",
      "Procurement platform activity (Ariba, Coupa transaction volumes)",
    ],
    rationale: "Industrial revenue tracks manufacturing demand. Freight data and PMI new orders are leading indicators of backlog growth or contraction weeks before quarterly filings.",
  },
  "Financial Services": {
    signals: [
      "AUM / fund flow data (Morningstar, Lipper)",
      "Regulatory filing frequency (SEC EDGAR unusual filing patterns)",
      "Credit default swap spreads on parent / holding entity",
      "Trading volume & bid-ask spread trends",
      "FINRA BrokerCheck complaint activity",
    ],
    rationale: "For financial services companies, regulatory filings, fund flows, and market-implied credit signals provide earlier warning than audited statements.",
  },
  "Logistics": {
    signals: [
      "Freight rate indices — Drewry World Container Index, Baltic Dry",
      "Carrier on-time performance data (project44, FourKites)",
      "Fuel price tracking (OPIS diesel spot)",
      "Warehouse vacancy rates by market (CBRE, JLL)",
      "Port congestion indices (Marine Benchmark)",
    ],
    rationale: "Logistics margins are tightly coupled to fuel prices and freight rate cycles. Container and dry bulk indices lead revenue by 1 quarter and are freely available.",
  },
  "Real Estate": {
    signals: [
      "Vacancy rate data by submarket (CoStar, CBRE)",
      "Cap rate compression / expansion trends",
      "Lease renewal and absorption rates",
      "Foot traffic to tenanted properties (Placer.ai)",
      "Construction cost index (Turner Building Cost Index)",
    ],
    rationale: "Real estate credit quality is driven by occupancy, cap rates, and debt service — not company-level consumer foot traffic. Property-level analytics are the relevant alternative data layer.",
  },
  "Materials": {
    signals: [
      "Commodity price feeds — LME copper, aluminium, steel HRC",
      "Mining satellite activity (Orbital Insight)",
      "Trade flow data — import/export volumes (Panjiva)",
      "China manufacturing PMI (forward demand signal)",
      "Environmental permit filing activity",
    ],
    rationale: "Materials companies are commodity price takers. Real-time commodity indices and trade flow data directly drive revenue forecasts and covenant headroom.",
  },
  "Specialty Chemicals": {
    signals: [
      "Feedstock price tracking (ethylene, propylene, benzene)",
      "Chemical plant capacity utilisation (ICIS)",
      "REACH / EPA regulatory filing activity",
      "Shipping container rates for bulk chemicals",
      "PFAS / ESG litigation monitoring",
    ],
    rationale: "Specialty chemical margins compress when feedstock costs rise faster than pass-through pricing. ICIS capacity data and feedstock spot prices are the key leading signals.",
  },
  "Business Services": {
    signals: [
      "LinkedIn headcount growth & attrition signals",
      "Contract announcement monitoring (media/PR)",
      "Client concentration via 10-K/regulatory cross-reference",
      "Glassdoor employee satisfaction trends",
      "SBA & government contract award activity",
    ],
    rationale: "Business services revenue tracks client retention and new contract wins. Employee headcount trends and contract announcements lead reported revenue by one to two quarters.",
  },
  "Utilities": {
    signals: [
      "Grid demand data (EIA-930 hourly electric grid monitor)",
      "Regulatory rate case filings (FERC, state PUCs)",
      "Weather normalisation indices",
      "Renewable energy capacity additions (EIA)",
      "Bond market implied spreads (MSRB / Bloomberg)",
    ],
    rationale: "Utilities are regulated entities — rate case outcomes and grid demand are the primary drivers of revenue visibility rather than consumer-facing signals.",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SignalBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
      style={{ color, borderColor: color + "40", background: color + "12" }}>
      {label}
    </span>
  );
}

function FootTrafficBar({ index, label }: { index: number; label: string }) {
  const color = index >= 75 ? "#00D4A4" : index >= 50 ? "#7B8FF7" : index >= 25 ? "#FFB300" : "#64748b";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-muted text-[10px] uppercase tracking-wider">Foot Traffic Index</span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-bold" style={{ color }}>{index} / 100</span>
          <SignalBadge label={label} color={color} />
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${index}%`, background: color }} />
      </div>
      <p className="text-muted/60 text-[9px] mt-1">Derived from Google Places review volume — proxy for cumulative foot traffic</p>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={11}
          className={n <= Math.round(rating) ? "text-warning fill-warning" : "text-muted/30"} />
      ))}
      <span className="text-primary text-[11px] font-mono ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function BusinessStatusBadge({ status }: { status: string }) {
  const cfg =
    status === "OPERATIONAL"         ? { label: "OPERATIONAL",          color: "#00D4A4" } :
    status === "CLOSED_TEMPORARILY"  ? { label: "TEMPORARILY CLOSED",   color: "#FFB300" } :
    status === "CLOSED_PERMANENTLY"  ? { label: "PERMANENTLY CLOSED",   color: "#FF3B5C" } :
                                       { label: status,                  color: "#64748b" };
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}

function HiringSignalColor(signal: string): string {
  if (signal === "SURGE" || signal === "GROWTH") return "#00D4A4";
  if (signal === "STABLE")                        return "#7B8FF7";
  if (signal === "CONTRACTION")                   return "#FFB300";
  return "#FF3B5C"; // DISTRESS
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  sector:           string;
  company:          string;
  jobSignals?:      Record<string, any> | null;
  consumerSignals?: Record<string, any> | null;
}

export default function AlternativeDataPanel({ sector, company, jobSignals, consumerSignals }: Props) {
  const isConsumerFacing = CONSUMER_FACING_SECTORS.has(sector);

  // For Healthcare: only show Places data if we actually got meaningful results
  const hasPlacesData = isConsumerFacing
    && consumerSignals
    && !consumerSignals.error
    && (consumerSignals.review_count > 0 || consumerSignals.rating != null);

  const b2bData = !isConsumerFacing ? B2B_ALT_DATA[sector] : null;

  const hasAnyData = hasPlacesData || jobSignals;
  if (!hasAnyData && !b2bData) return null;

  return (
    <div className="glass rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <p className="text-primary text-sm font-semibold">Alternative Data Intelligence</p>
          <p className="text-muted text-[10px] mt-0.5">
            Non-financial signals for <span className="text-accent">{sector}</span> — leads financial statements by 1–2 quarters
          </p>
        </div>
        <span className={cn(
          "text-[10px] font-semibold px-2.5 py-1 rounded-full border",
          isConsumerFacing
            ? "text-accent border-accent/30 bg-accent/10"
            : "text-muted border-white/[0.08] bg-white/[0.03]"
        )}>
          {isConsumerFacing ? "Consumer-Facing" : "B2B / Institutional"}
        </span>
      </div>

      <div className="p-5 space-y-5">

        {/* ── Google Places — consumer sectors only ── */}
        {hasPlacesData && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={13} className="text-accent" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Google Places Signals</p>
              <span className="text-[9px] text-muted/50">via Google Places API · as of {consumerSignals.as_of}</span>
            </div>
            <div className="bg-black/30 border border-white/[0.06] rounded-lg p-4 space-y-4">

              {/* Business status + signal */}
              <div className="flex items-center justify-between">
                <BusinessStatusBadge status={consumerSignals.business_status} />
                <SignalBadge
                  label={consumerSignals.consumer_signal}
                  color={
                    consumerSignals.consumer_signal === "STRONG"    ? "#00D4A4" :
                    consumerSignals.consumer_signal === "DISTRESS"  ? "#FF3B5C" :
                    consumerSignals.consumer_signal === "WEAKENING" ? "#FFB300" : "#7B8FF7"
                  }
                />
              </div>

              {/* Foot traffic index */}
              <FootTrafficBar
                index={consumerSignals.foot_traffic_index ?? 0}
                label={consumerSignals.traffic_label ?? "—"}
              />

              {/* Rating + reviews */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted text-[10px] uppercase tracking-wider mb-1.5">Customer Rating</p>
                  {consumerSignals.rating != null
                    ? <StarRating rating={consumerSignals.rating} />
                    : <span className="text-muted text-xs font-mono">—</span>
                  }
                </div>
                <div>
                  <p className="text-muted text-[10px] uppercase tracking-wider mb-1.5">Review Volume</p>
                  <p className="text-primary text-sm font-mono font-bold">
                    {consumerSignals.review_count?.toLocaleString() ?? "—"}
                    <span className="text-muted text-[10px] font-normal ml-1">reviews</span>
                  </p>
                </div>
              </div>

              {/* Open now */}
              {consumerSignals.open_now != null && (
                <div className="flex items-center gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full", consumerSignals.open_now ? "bg-success" : "bg-muted/40")} />
                  <span className="text-[10px] text-muted">
                    Currently <span className={consumerSignals.open_now ? "text-success font-medium" : "text-muted"}>
                      {consumerSignals.open_now ? "open" : "closed"}
                    </span>
                  </span>
                </div>
              )}

              {/* Signal rationale */}
              {consumerSignals.signal_rationale && (
                <p className="text-muted text-[10px] leading-relaxed border-t border-white/[0.05] pt-3">
                  {consumerSignals.signal_rationale}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Job Signals — all sectors ── */}
        {jobSignals && !jobSignals.error && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users size={13} className="text-accent" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Job Market Signals</p>
              <span className="text-[9px] text-muted/50">hiring activity proxy for business health</span>
            </div>
            <div className="bg-black/30 border border-white/[0.06] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <SignalBadge
                  label={jobSignals.hiring_signal ?? "—"}
                  color={HiringSignalColor(jobSignals.hiring_signal)}
                />
                {jobSignals.open_positions != null && (
                  <p className="text-muted text-[10px]">
                    <span className="text-primary font-mono font-bold text-sm">{jobSignals.open_positions}</span>
                    {" "}open positions
                  </p>
                )}
              </div>
              {jobSignals.signal_rationale && (
                <p className="text-muted text-[10px] leading-relaxed">{jobSignals.signal_rationale}</p>
              )}
              {jobSignals.distress_keywords?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {jobSignals.distress_keywords.slice(0, 5).map((kw: string) => (
                    <span key={kw} className="text-[10px] px-2 py-0.5 bg-danger/10 text-danger border border-danger/20 rounded-full">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── B2B alternative data education card ── */}
        {b2bData && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info size={13} className="text-muted" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Relevant Alternative Data for {sector}
              </p>
            </div>
            <div className="bg-black/30 border border-white/[0.06] rounded-lg p-4 space-y-3">
              <p className="text-muted text-[10px] leading-relaxed">{b2bData.rationale}</p>
              <ul className="space-y-1.5">
                {b2bData.signals.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-accent text-[10px] mt-0.5 shrink-0">→</span>
                    <p className="text-muted text-[10px] leading-relaxed">{s}</p>
                  </li>
                ))}
              </ul>
              <p className="text-muted/50 text-[9px] pt-1 border-t border-white/[0.05]">
                These signals are available via enterprise data providers and represent the next integration layer for {sector} credit monitoring.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
