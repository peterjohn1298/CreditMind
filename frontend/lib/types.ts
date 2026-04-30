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

export interface AddBackItem {
  name:           string;
  amount:         number | null;
  category:       "management_fee" | "one_time_cost" | "pro_forma" | "synergy" | "other" | string;
  verdict:        "SUPPORTABLE" | "QUESTIONABLE" | "REJECT" | string;
  rationale:      string;
  adjusted_amount: number | null;
}

export interface EBITDAAnalysis {
  reported_ebitda?:                number | null;
  add_back_analysis?:              AddBackItem[];
  total_supportable_adjustments?:  number | null;
  total_questionable_adjustments?: number | null;
  total_rejected_adjustments?:     number | null;
  conservative_adjusted_ebitda?:   number | null;
  base_adjusted_ebitda?:           number | null;
  adjustment_quality_score?:       "HIGH" | "MEDIUM" | "LOW" | string;
  adjustment_as_pct_of_reported?:  number | null;
  key_concerns?:                   string[];
  ebitda_conclusion?:              string;
  error?:                          string;
}

export interface UnderwriteResponse {
  deal_id: string;
  risk_score: number;
  internal_rating: string;
  recommendation: string;
  approval_status: "APPROVE" | "CONDITIONAL" | "REJECT";
  memo_sections?: Record<string, string>;
  ebitda_analysis?: EBITDAAnalysis;
  risk_assessment?: {
    scorecard?: any;
    key_risk_drivers?: any;
    mitigating_factors?: any;
  };
  // Allow the full credit_state pass-through
  [key: string]: unknown;
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

// ─── Origination + Screening (Stages 1-2) ────────────────────────────────────

export interface FundCriteria {
  target_sectors?:    string[];
  exclude_sectors?:   string[];
  ebitda_min?:        number;
  ebitda_max?:        number;
  loan_size_min?:     number;
  loan_size_max?:     number;
  max_leverage?:      number;
  preferred_sponsors?: string[];
}

export interface OriginationCandidate {
  company:        string;
  ticker?:        string;
  sector?:        string;
  signal:         string;
  rationale:      string;
  urgency?:       string;
  fit_score?:     number;
  source?:        string;
}

export interface OriginationScanResponse {
  candidates?:    OriginationCandidate[];
  scan_summary?:  string;
  signals_seen?:  number;
  [key: string]: unknown;
}

export interface DealTeaserRequest {
  company:           string;
  sector:            string;
  sponsor?:          string;
  ticker?:           string;
  estimated_ebitda:  number;
  loan_amount:       number;
  leverage_ask:      number;
  loan_type?:        string;
  rationale?:        string;
}

export interface ScreeningResult {
  recommendation:   "GO" | "NO_GO" | "PROCEED_WITH_CAVEATS" | string;
  confidence?:      number;
  sector_fit?:      string;
  size_fit?:        string;
  leverage_fit?:    string;
  concentration_risk?: string;
  sponsor_quality?: string;
  flags?:           string[];
  rationale?:       string;
  [key: string]: unknown;
}

// ─── IC Committee (Stage 4) ──────────────────────────────────────────────────

export interface ICCommitteeResponse {
  deal_id:        string;
  ic_decision:    "APPROVE" | "CONDITIONAL_APPROVE" | "REJECT" | string;
  conditions:     Array<{ condition?: string; rationale?: string; severity?: string } | string>;
  final_terms:    Record<string, unknown>;
  ic_full_output: {
    challenges?:        Array<{ topic: string; challenge: string; resolution?: string }>;
    stress_results?:    Record<string, unknown>;
    open_questions?:    string[];
    deliberation?:      string;
    [key: string]: unknown;
  };
}

// ─── Documentation (Stage 5) ─────────────────────────────────────────────────

export interface DocumentationResponse {
  deal_id:           string;
  term_sheet:        Record<string, unknown>;
  red_lines:         Array<{ term?: string; reason?: string } | string>;
  concession_map:    Array<{ term?: string; flexibility?: string; max_concession?: string } | string>;
  borrower_pushback: Array<{ topic?: string; sponsor_argument?: string; fund_response?: string } | string>;
}

// ─── Closing (Stage 6) ───────────────────────────────────────────────────────

export type CPStatus = "satisfied" | "waived" | "pending" | "blocked";

export interface CPItem {
  cp:       string;
  category: string;
  timing:   "at_closing" | "pre_closing" | string;
  status:   CPStatus;
  owner:    string;
  notes:    string;
}

export interface FundsFlow {
  total_facility:           string;
  origination_fee:          string;
  net_proceeds_to_borrower: string;
  use_of_proceeds:          string;
  disbursement_mechanism:   string;
  settlement_date:          string;
  [key: string]: string;
}

export interface ClosingResponse {
  company:                    string;
  closing_readiness_score:    number;
  closing_readiness_status:   "BLOCKED" | "CONDITIONS_PENDING" | "APPROVED_DOCS_PENDING" | string;
  target_closing_date:        string;
  estimated_days_to_close:    number;
  cp_checklist:               CPItem[];
  total_cps:                  number;
  cps_satisfied:              number;
  cps_pending:                number;
  funds_flow:                 FundsFlow;
  outstanding_items:          string[];
  closing_checklist_summary:  string;
}

export interface CPUpdateResponse {
  deal_id:         string;
  cp_index:        number;
  status:          CPStatus;
  readiness_score: number;
}

// ─── Credit Policy ───────────────────────────────────────────────────────────

export interface PolicyViolation {
  rule:        string;
  description: string;
  severity:    "HARD_BLOCK" | "ESCALATION_REQUIRED" | "WARNING" | string;
  section:     string;
}

export interface PolicyCheckResult {
  compliant:      boolean;
  can_proceed:    boolean;
  hard_blocks:    PolicyViolation[];
  escalations:    PolicyViolation[];
  warnings:       PolicyViolation[];
  approval_level: string;
  watch_list:     boolean;
  watch_triggers: string[];
  policy_summary: string;
}

export interface PortfolioComplianceSummary {
  status:               "COMPLIANT" | "WARNING" | "BREACH" | "empty" | string;
  total_deals:          number;
  total_deployed_usd:   number;
  deployment_pct:       number;
  sector_concentration: Record<string, { usd: number; pct_nav: number }>;
  sponsor_concentration: Record<string, { usd: number; pct_nav: number }>;
  non_sponsored_pct:    number;
  distressed_pct:       number;
  watch_list_deals:     string[];
  watch_list_count:     number;
  policy_breaches:      string[];
  warnings?:            string[];
}
