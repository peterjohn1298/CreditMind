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

// ─── LP Reporting (Wave 4D — ILPA 2.0) ───────────────────────────────────────

export interface ILPAReportingTemplate {
  report_period:                string;
  report_date:                  string;
  fund_name:                    string;
  fund_size:                    number | null;
  commitments:                  number | null;
  called_to_date:               number | null;
  uncalled:                     number | null;
  capital_account:              Array<{ lp_class: string; commitment: number | null; called: number | null; distributed: number | null; nav: number | null }>;
  schedule_of_investments:      Array<Record<string, unknown>>;
  schedule_of_realised:         Array<Record<string, unknown>>;
  fees_and_expenses:            Record<string, number | null>;
  cash_flows_quarter:           Record<string, number | null>;
  nav_bridge:                   Record<string, number | null>;
  concentration_disclosures:    Record<string, unknown[]>;
  narrative:                    string;
  ilpa_compliance:              string;
  auditor_review_status?:       string;
}

export interface ILPAPerformanceTemplate {
  as_of_date:        string;
  vintage_year:      number | null;
  fund_age_years:    number | null;
  since_inception:   Record<string, number | null>;
  ytd:               Record<string, number | null>;
  quarterly_history: Array<Record<string, unknown>>;
  benchmark_comparison: Record<string, number | null>;
  loss_history:      Record<string, number | null>;
  attribution:       Record<string, number | null>;
  narrative:         string;
  ilpa_compliance:   string;
}

export interface LPNotice {
  notice_type:                "capital_call" | "distribution" | string;
  event_date:                 string;
  due_date:                   string;
  total_amount:               number | null;
  purpose:                    string;
  lp_notices: Array<{
    lp_id:              string | null;
    lp_name:            string;
    commitment:         number | null;
    ownership_pct:      number | null;
    amount:             number | null;
    updated_paid_in:    number | null;
    updated_unfunded:   number | null;
    notice_paragraph:   string;
  }>;
  wire_instructions_reminder: string;
  fund_note:                  string;
}

export interface LPRosterEntry {
  lp_id?:           string;
  lp_name:          string;
  commitment:       number;
  paid_in_to_date?: number;
}
