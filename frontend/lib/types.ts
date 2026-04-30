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
  deals: Array<{ deal_id: string; company: string; status?: string; loan_amount?: number; risk_score?: number }>;
}
export interface SponsorBehaviorResponse {
  sponsors:                       SponsorRow[];
  non_sponsored_count:            number;
  non_sponsored_exposure_usd:     number;
  summary:                        string;
}

// ─── KYC / AML / Sanctions (Wave 4A) ─────────────────────────────────────────

export type KYCEntityVerdict = "CLEAR" | "CONDITIONAL" | "ESCALATE" | "REJECT" | string;
export type KYCOFACStatus    = "CLEAR" | "MATCH" | "FALSE_POSITIVE" | "NEEDS_VERIFICATION" | string;
export type KYCPEPStatus     = "NOT_PEP" | "PEP" | "PEP_FAMILY" | "PEP_ASSOCIATE" | string;
export interface KYCEntityScreen {
  ofac_status:        KYCOFACStatus;
  ofac_evidence:      string;
  sectoral_sanctions?: string;
  verdict:            KYCEntityVerdict;
}
export interface KYCOfficerScreen {
  name:           string;
  role:           string;
  ofac_status:    KYCOFACStatus;
  pep_status:     KYCPEPStatus;
  pep_rationale?: string;
  adverse_media:  string[];
  verdict:        KYCEntityVerdict;
}
export interface KYCUBO {
  name:           string;
  ownership_pct:  number | null;
  ownership_path: string;
  jurisdiction:   string;
  ofac_status:    KYCOFACStatus;
  pep_status:     KYCPEPStatus;
  verdict:        KYCEntityVerdict;
}
export interface KYCBeneficialOwnership {
  ubo_list:           KYCUBO[];
  transparency_score: "HIGH" | "MEDIUM" | "LOW" | string;
  ownership_concerns: string[];
}
export interface KYCAdverseFinding {
  subject:     string;
  category:    string;
  summary:     string;
  date:        string;
  severity:    "HIGH" | "MEDIUM" | "LOW" | string;
  source_link: string;
}
export interface KYCAMLScreen {
  borrower_screen:        KYCEntityScreen;
  sponsor_screen:         KYCEntityScreen;
  officer_screens:        KYCOfficerScreen[];
  beneficial_ownership:   KYCBeneficialOwnership;
  adverse_media_findings: KYCAdverseFinding[];
  overall_verdict:        "CLEAR" | "EDD_REQUIRED" | "ESCALATE_TO_AML_OFFICER" | "REJECT" | string;
  fincen_compliance:      "COMPLIANT" | "GAPS_IDENTIFIED" | string;
  required_actions:       string[];
  kyc_aml_summary:        string;
}

// ─── ESG Screening (Wave 4B) ─────────────────────────────────────────────────

export interface ESGEnvironmental {
  score:             number;
  carbon_intensity:  "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" | string;
  transition_risk:   "LOW" | "MEDIUM" | "HIGH" | "EXTREME" | string;
  physical_risk:     "LOW" | "MEDIUM" | "HIGH" | string;
  key_findings:      string[];
}
export interface ESGSocial {
  score:             number;
  labor_practices:   "STRONG" | "ADEQUATE" | "CONCERNING" | "POOR" | string;
  customer_safety:   "STRONG" | "ADEQUATE" | "CONCERNING" | "POOR" | "NA" | string;
  supply_chain:      "STRONG" | "ADEQUATE" | "CONCERNING" | "POOR" | "NA" | string;
  key_findings:      string[];
}
export interface ESGGovernance {
  score:                number;
  board_independence:   "STRONG" | "ADEQUATE" | "WEAK" | "NA_PRIVATE" | string;
  audit_quality:        "CLEAN" | "RESTATEMENTS_PRIOR" | "MATERIAL_WEAKNESSES" | string;
  related_party_risk:   "NONE" | "DISCLOSED" | "UNDISCLOSED_SUSPECTED" | string;
  key_findings:         string[];
}
export interface ESGHardExclusionCheck {
  tobacco:                boolean;
  controversial_weapons:  boolean;
  thermal_coal:           boolean;
  predatory_lending:      boolean;
  adult_entertainment:    boolean;
  gambling_over_25pct:    boolean;
  any_hard_exclusion:     boolean;
  exclusion_rationale?:   string;
}
export interface ESGScreen {
  environmental:                ESGEnvironmental;
  social:                       ESGSocial;
  governance:                   ESGGovernance;
  hard_exclusion_check:         ESGHardExclusionCheck;
  overall_score:                number;
  overall_verdict:              "PROCEED" | "PROCEED_WITH_CONDITIONS" | "EDD_REQUIRED" | "REJECT" | string;
  ic_memo_required_section:     string;
  lp_disclosure_items:          string[];
  esg_summary:                  string;
}

// ─── Valuation + Mark Inconsistency (Wave 4C) ────────────────────────────────

export interface ValuationMark {
  par_amount:                    number;
  current_sofr_bps:              number | null;
  comparable_market_spread_bps:  number | null;
  comparable_market_yield_bps:   number | null;
  origination_yield_bps:         number | null;
  yield_differential_bps:        number | null;
  credit_drift_adjustment_bps:   number | null;
  illiquidity_discount_bps:      number | null;
  all_in_mark_yield_bps:         number | null;
  fair_value_pct_of_par:         number | null;
  fair_value_usd:                number | null;
  mark_change_from_par:          number | null;
  confidence:                    "HIGH" | "MEDIUM" | "LOW" | string;
  valuation_bridge:              string;
  auditor_note:                  string;
  lp_disclosure_summary:         string;
  asc_820_level:                 string;
}
export interface PortfolioMarkRow {
  deal_id:          string;
  company:          string;
  sector:           string;
  rating:           string;
  loan_amount:      number;
  fair_value_usd:   number | null;
  fair_value_pct:   number | null;
  mark_yield_bps:   number | null;
  confidence:       string;
  valuation_bridge: string;
}
export interface PortfolioMarksResponse {
  marks: PortfolioMarkRow[];
  count: number;
}
export interface InconsistencyFinding {
  category:         string;
  severity:         "HIGH" | "MEDIUM" | "LOW" | string;
  deals_involved:   string[];
  description:      string;
  quantitative_gap: string;
  recommendation:   string;
}
export interface InconsistencyScanResponse {
  findings:                     InconsistencyFinding[];
  by_severity?:                 { HIGH?: number | null; MEDIUM?: number | null; LOW?: number | null };
  portfolio_consistency_score:  number | null;
  review_summary?:              string;
  ic_action_required?:          string;
  loans_reviewed:               number;
  summary?:                     string;
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
