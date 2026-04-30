import type {
  Deal, Alert, HeatMapData, SectorContagion,
  SectorForecastData, SectorImpactBrief, UnderwriteRequest,
  UnderwriteResponse, MonitorResponse, QuarterlyResponse,
  FundCriteria, OriginationScanResponse, DealTeaserRequest, ScreeningResult,
  ICCommitteeResponse, DocumentationResponse,
  ClosingResponse, CPStatus, CPUpdateResponse,
  PolicyCheckResult, PortfolioComplianceSummary,
  VintageCohortsResponse, CorrelationResponse, SponsorBehaviorResponse,
  KYCAMLScreen, ESGScreen,
  ValuationMark, PortfolioMarksResponse, InconsistencyScanResponse,
  ILPAReportingTemplate, ILPAPerformanceTemplate, LPNotice, LPRosterEntry,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// ─── Underwriting ─────────────────────────────────────────────────────────────

export const underwrite = (body: UnderwriteRequest): Promise<UnderwriteResponse> =>
  req("/api/underwrite", { method: "POST", body: JSON.stringify(body) });

export const getCreditMemo = (deal_id: string) =>
  req<{ deal_id: string; memo_sections: Record<string, string>; recommendation: string; approval_status: string }>(
    "/api/credit-memo", { method: "POST", body: JSON.stringify({ deal_id }) }
  );

// ─── Monitoring ───────────────────────────────────────────────────────────────

export const runDailyMonitor = (deal_id: string, ticker: string): Promise<MonitorResponse> =>
  req("/api/daily-monitor", { method: "POST", body: JSON.stringify({ deal_id, ticker }) });

export const runQuarterlyReview = (deal_id: string, ticker: string): Promise<QuarterlyResponse> =>
  req("/api/quarterly-review", { method: "POST", body: JSON.stringify({ deal_id, ticker }) });

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const getAlerts = (): Promise<{ alerts: Alert[]; summary: { critical: number; high: number; medium: number; low: number } }> =>
  req("/api/alerts");

export const getSectorAlerts = (): Promise<{ sector_alerts: Alert[] }> =>
  req("/api/alerts/sector");

export const triggerRefreshAlerts = (): Promise<{ status: string; message: string; sectors?: number }> =>
  req("/api/refresh-alerts", { method: "POST" });

export const getRefreshStatus = (): Promise<{ running: boolean; last_run: string | null; last_error: string | null; alert_count: number }> =>
  req("/api/refresh-status");

export const resolveAlert = (alert_id: string, resolved_by = "user", notes = "") =>
  req<{ success: boolean; alert_id: string; resolved_at: string }>(
    "/api/alerts/resolve", { method: "POST", body: JSON.stringify({ alert_id, resolved_by, notes }) }
  );

// ─── Portfolio ────────────────────────────────────────────────────────────────

export const getPortfolioSectorMap = (): Promise<{ deals: Deal[] }> =>
  req("/api/portfolio/sector-map");

export const getDeal = (deal_id: string): Promise<Deal> =>
  req(`/api/deals/${encodeURIComponent(deal_id)}`);

// ─── Sector Intelligence ──────────────────────────────────────────────────────

export const getSectorHeatMap = (): Promise<HeatMapData> =>
  req("/api/sector/heat-map");

export const getSectorContagion = (sector_id: string): Promise<SectorContagion> =>
  req(`/api/sector/contagion/${encodeURIComponent(sector_id)}`);

export const getSectorForecast = (): Promise<SectorForecastData> =>
  req("/api/sector/forecast");

export const getSectorImpactBrief = (deal_id: string): Promise<SectorImpactBrief> =>
  req(`/api/sector/impact-brief/${encodeURIComponent(deal_id)}`);

// ─── Origination + Screening (Stages 1-2) ────────────────────────────────────

export const originationScan = (criteria: FundCriteria = {}): Promise<OriginationScanResponse> =>
  req("/api/origination-scan", { method: "POST", body: JSON.stringify(criteria) });

export const screenDeal = (teaser: DealTeaserRequest): Promise<ScreeningResult> =>
  req("/api/screen-deal", { method: "POST", body: JSON.stringify(teaser) });

// ─── IC Committee (Stage 4) ──────────────────────────────────────────────────

export const runICCommittee = (deal_id: string): Promise<ICCommitteeResponse> =>
  req("/api/ic-committee", { method: "POST", body: JSON.stringify({ deal_id }) });

// ─── Documentation (Stage 5) ─────────────────────────────────────────────────

export const generateDocs = (deal_id: string): Promise<DocumentationResponse> =>
  req("/api/generate-docs", { method: "POST", body: JSON.stringify({ deal_id }) });

// ─── Closing (Stage 6) ───────────────────────────────────────────────────────

export const generateClosingChecklist = (deal_id: string): Promise<ClosingResponse> =>
  req("/api/closing-checklist", { method: "POST", body: JSON.stringify({ deal_id }) });

export const updateCPStatus = (
  deal_id: string,
  cp_index: number,
  status: CPStatus,
  notes = ""
): Promise<CPUpdateResponse> => {
  const params = new URLSearchParams({
    cp_index: String(cp_index),
    status,
    notes,
  });
  return req(`/api/closing-checklist/${encodeURIComponent(deal_id)}/cp?${params.toString()}`, {
    method: "PATCH",
  });
};

// ─── Credit Policy ───────────────────────────────────────────────────────────

export const getPortfolioCompliance = (): Promise<PortfolioComplianceSummary> =>
  req("/api/policy/portfolio-compliance");

export const checkDealPolicy = (teaser: DealTeaserRequest): Promise<PolicyCheckResult> =>
  req("/api/policy/check-deal", { method: "POST", body: JSON.stringify(teaser) });

export const getWatchList = (): Promise<{ watch_list: Array<{ company: string; reason: string; severity: string }> }> =>
  req("/api/policy/watch-list");

// ─── Portfolio Analytics (Wave 3) ────────────────────────────────────────────

export const getVintageCohorts = (): Promise<VintageCohortsResponse> =>
  req("/api/portfolio/vintage-cohorts");

export const getPortfolioCorrelation = (focus_deal_id?: string): Promise<CorrelationResponse> => {
  const qs = focus_deal_id ? `?focus_deal_id=${encodeURIComponent(focus_deal_id)}` : "";
  return req(`/api/portfolio/correlation${qs}`);
};

export const getSponsorBehavior = (): Promise<SponsorBehaviorResponse> =>
  req("/api/portfolio/sponsor-behavior");

// ─── KYC / AML / Sanctions (Wave 4A) ─────────────────────────────────────────

export const runKYCScreen = (deal_id: string): Promise<KYCAMLScreen> =>
  req("/api/kyc-screen", { method: "POST", body: JSON.stringify({ deal_id }) });

// ─── ESG Screening (Wave 4B) ─────────────────────────────────────────────────

export const runESGScreen = (deal_id: string): Promise<ESGScreen> =>
  req("/api/esg-screen", { method: "POST", body: JSON.stringify({ deal_id }) });

// ─── Valuation + Mark Inconsistency (Wave 4C) ────────────────────────────────

export const runValuationMark = (deal_id: string): Promise<ValuationMark> =>
  req("/api/valuation/mark", { method: "POST", body: JSON.stringify({ deal_id }) });

export const getPortfolioMarks = (): Promise<PortfolioMarksResponse> =>
  req("/api/valuation/portfolio-marks");

export const runInconsistencyScan = (): Promise<InconsistencyScanResponse> =>
  req("/api/valuation/inconsistency-scan", { method: "POST" });

// ─── LP Reporting / ILPA 2.0 (Wave 4D) ───────────────────────────────────────

export const generateILPAReporting = (fund_meta?: Record<string, unknown>): Promise<ILPAReportingTemplate> =>
  req("/api/lp-reporting/template", { method: "POST", body: JSON.stringify({ fund_meta: fund_meta ?? null }) });

export const generateILPAPerformance = (fund_meta?: Record<string, unknown>): Promise<ILPAPerformanceTemplate> =>
  req("/api/lp-reporting/performance", { method: "POST", body: JSON.stringify({ fund_meta: fund_meta ?? null }) });

export const generateLPNotice = (
  notice_type: "capital_call" | "distribution",
  amount: number,
  purpose: string,
  lp_roster: LPRosterEntry[],
  fund_meta?: Record<string, unknown>,
): Promise<LPNotice> =>
  req("/api/lp-reporting/notice", {
    method: "POST",
    body: JSON.stringify({ notice_type, amount, purpose, lp_roster, fund_meta: fund_meta ?? null }),
  });
