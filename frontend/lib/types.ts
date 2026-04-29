// ─── Core Deal & Portfolio ───────────────────────────────────────────────────

export interface SectorTags {
  sector: string;
  industry: string;
  sub_industry: string;
  gics_sector_id: string;
  etf_ticker: string;
}

export interface Deal {
  deal_id: string;
  company: string;
  ticker?: string;
  sponsor: string;
  deal_type?: string;
  loan_amount: number;
  loan_tenor?: number;
  loan_type?: string;
  sector: string;
  industry?: string;
  gics_sector_id?: string;
  risk_score: number;
  internal_rating: string;
  sector_stress_score: number;
  status: "current" | "watchlist" | "stressed";
  disbursement_date?: string;
  maturity_date?: string;
  alert_count: number;
  last_reviewed?: string;
  ebitda?: number;
  leverage?: number;
  covenants?: any;
  financial_health?: string;
  news_signals?: Array<{ headline: string; sentiment: string }>;
  early_warning_flags?: Array<{ flag_type?: string; warning_type?: string; description: string; severity: string }>;
  human_alerts?: Alert[];
  job_signals?: any;
  consumer_signals?: any;
  sector_tags?: SectorTags;
  contagion_flags?: ContagionEvent[];
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export interface Alert {
  alert_id?: string;
  deal_id?: string;
  _deal_id?: string;
  company?: string;
  _company?: string;
  sector_id?: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  // API returns trigger + action_required; mock uses message
  message?: string;
  trigger?: string;
  action_required?: string;
  timestamp: string;
  resolved: boolean;
  alert_type?: "company" | "sector";
}

export interface AlertSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// ─── Sector Intelligence ─────────────────────────────────────────────────────

export interface HeatMapDataPoint {
  date: string;
  scores: Record<string, number>;
  is_forecast?: boolean;
}

export interface PortfolioOverlay {
  deal_id: string;
  company: string;
  sector_id: string;
}

export interface HeatMapData {
  sectors: string[];
  time_series: HeatMapDataPoint[];
  forecast: HeatMapDataPoint[];
  portfolio_overlays: PortfolioOverlay[];
  last_updated: string;
}

export interface ContagionEvent {
  deal_id: string;
  company: string;
  exposure_type: "direct" | "supply_chain" | "customer";
  severity_tier: "critical" | "high" | "medium" | "low";
  estimated_impact_min: number;
  estimated_impact_max: number;
  rationale: string;
  covenant_at_risk?: string;
}

export interface SectorContagion {
  sector_id: string;
  event_summary: string;
  affected_loans: ContagionEvent[];
}

export interface ForecastPoint {
  date: string;
  score: number;
}

export interface SectorForecast {
  sector_name: string;
  sector_id: string;
  forecast: ForecastPoint[];
}

export interface SectorForecastData {
  forecast_horizon_days: number;
  sectors: SectorForecast[];
}

export interface SectorImpactBrief {
  deal_id: string;
  company: string;
  sector_tags: SectorTags;
  sector_stress_score: number;
  active_sector_alerts: Alert[];
  contagion_flags: ContagionEvent[];
}

// ─── Agent Progress ───────────────────────────────────────────────────────────

export interface AgentStatus {
  name: string;
  status: "pending" | "running" | "complete" | "error";
  duration?: string;
}

// ─── API Request / Response ──────────────────────────────────────────────────

export interface UnderwriteRequest {
  // Core
  company: string;
  ticker: string;
  loan_amount: number;
  loan_tenor: number;
  loan_type: string;
  sponsor: string;

  // Borrower
  sector?: string;
  description?: string;
  jurisdiction?: string;

  // Transaction
  purpose?: string;
  total_facility?: number;
  pricing_spread_bps?: number;
  oid_pct?: number;
  call_protection?: string;
  expected_close?: string;

  // Financials (LTM)
  revenue_ltm?: number;
  ebitda_ltm?: number;
  adj_ebitda_ltm?: number;
  revenue_growth_pct?: number;
  capex?: number;
  fcf?: number;
  total_debt_proforma?: number;
  equity_contribution?: number;
  enterprise_value?: number;

  // Covenants
  leverage_covenant?: number;
  icr_covenant?: number;
  min_liquidity?: number;

  // Risk & qualitative
  customer_concentration_pct?: number;
  recurring_revenue_pct?: number;
  management_tenure_years?: number;
  backlog?: number;
  key_risks?: string;
  esg_flags?: string;
  notes?: string;
}

export interface UnderwriteResponse {
  deal_id: string;
  risk_score: number;
  internal_rating: string;
  recommendation: string;
  approval_status: "APPROVE" | "CONDITIONAL" | "REJECT";
  memo_sections?: Record<string, string>;
  risk_assessment?: {
    scorecard?: any;
    key_risk_drivers?: any;
    mitigating_factors?: any;
  };
}

export interface MonitorResponse {
  deal_id: string;
  risk_score: number;
  live_risk_score?: number;
  alerts: Alert[];
  sentiment: Record<string, number>;
  sentiment_trend?: Array<{ date: string; score: number; trend?: string }>;
  monitoring_summary: string;
  early_warning_flags?: Array<{ flag_type?: string; warning_type?: string; description: string; severity: string }>;
  news_signals?: Array<{ headline: string; sentiment: string }>;
  job_signals?: any;
  consumer_signals?: any;
}

export interface QuarterlyResponse {
  deal_id: string;
  rating: string;
  covenant_status: Record<string, { threshold: number; current: number; compliant: boolean }>;
  rating_change: string;
  review_summary: string;
}

// ─── Portfolio Analytics (Wave 3) ────────────────────────────────────────────

export interface VintageCohort {
  vintage:                       number;
  deal_count:                    number;
  total_exposure_usd:            number;
  avg_loan_size_usd:             number;
  avg_origination_risk_score:    number;
  avg_live_risk_score:           number;
  risk_drift:                    number;
  watchlist_count:               number;
  stressed_count:                number;
  problem_rate_pct:              number;
  top_sectors:                   Array<{ sector: string; count: number }>;
}

export interface VintageCohortsResponse {
  vintages:               VintageCohort[];
  unknown_vintage_count:  number;
  summary:                string;
}

export interface CorrelationPeer {
  peer_deal_id:     string;
  peer_company:     string;
  peer_sector?:     string;
  peer_sponsor?:    string;
  peer_status?:     string;
  peer_risk_score?: number;
  peer_loan_amount?: number;
  overlap_score:    number;
  reasons:          string[];
}

export interface CorrelationRow {
  focus_deal_id:                  string;
  focus_company:                  string;
  focus_sector?:                  string;
  focus_sponsor?:                 string;
  focus_status?:                  string;
  peers:                          CorrelationPeer[];
  total_correlated_exposure_usd:  number;
}

export interface CorrelationResponse {
  correlations:           CorrelationRow[];
  deal_count_with_peers:  number;
  summary:                string;
}

export interface SponsorRow {
  sponsor:                  string;
  deal_count:               number;
  total_exposure_usd:       number;
  current_count:            number;
  watchlist_count:          number;
  stressed_count:           number;
  problem_rate_pct:         number;
  lender_treatment_score:   number;
  avg_origination_risk:     number;
  avg_live_risk:            number;
  risk_drift:               number;
  deals: Array<{
    deal_id:     string;
    company:     string;
    status?:     string;
    loan_amount?: number;
    risk_score?: number;
  }>;
}

export interface SponsorBehaviorResponse {
  sponsors:                       SponsorRow[];
  non_sponsored_count:            number;
  non_sponsored_exposure_usd:     number;
  summary:                        string;
}
