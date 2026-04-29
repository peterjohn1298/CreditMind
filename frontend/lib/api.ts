import type {
  Deal, Alert, HeatMapData, SectorContagion,
  SectorForecastData, SectorImpactBrief, UnderwriteRequest,
  UnderwriteResponse, MonitorResponse, QuarterlyResponse,
  VintageCohortsResponse, CorrelationResponse, SponsorBehaviorResponse,
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

// ─── Portfolio Analytics (Wave 3) ────────────────────────────────────────────

export const getVintageCohorts = (): Promise<VintageCohortsResponse> =>
  req("/api/portfolio/vintage-cohorts");

export const getPortfolioCorrelation = (focus_deal_id?: string): Promise<CorrelationResponse> => {
  const qs = focus_deal_id ? `?focus_deal_id=${encodeURIComponent(focus_deal_id)}` : "";
  return req(`/api/portfolio/correlation${qs}`);
};

export const getSponsorBehavior = (): Promise<SponsorBehaviorResponse> =>
  req("/api/portfolio/sponsor-behavior");
