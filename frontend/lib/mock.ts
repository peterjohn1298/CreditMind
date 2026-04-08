// Mock data used while John's API is being built
// Swap all imports from here to lib/api.ts once the backend is live

import type { Deal, Alert, HeatMapData } from "./types";

export const MOCK_DEALS: Deal[] = [
  { deal_id: "DEAL-001", company: "ExxonMobil Corporation", ticker: "XOM", sponsor: "Carlyle Group",
    deal_type: "Term Loan B", loan_amount: 50_000_000, loan_tenor: 5, loan_type: "Senior Secured",
    sector: "Energy", industry: "Oil Gas & Consumable Fuels", gics_sector_id: "10",
    risk_score: 62, internal_rating: "BB+", sector_stress_score: 78,
    status: "watchlist", disbursement_date: "2024-06-15", maturity_date: "2029-06-15",
    alert_count: 2, last_reviewed: "2026-04-01" },
  { deal_id: "DEAL-002", company: "JPMorgan Chase & Co", ticker: "JPM", sponsor: "KKR",
    deal_type: "Revolving Credit Facility", loan_amount: 75_000_000, loan_tenor: 3, loan_type: "Senior Unsecured",
    sector: "Financials", industry: "Banks", gics_sector_id: "40",
    risk_score: 28, internal_rating: "A", sector_stress_score: 41,
    status: "current", disbursement_date: "2024-09-01", maturity_date: "2027-09-01",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "DEAL-003", company: "Boeing Company", ticker: "BA", sponsor: "Apollo Global",
    deal_type: "Term Loan A", loan_amount: 40_000_000, loan_tenor: 4, loan_type: "Senior Secured",
    sector: "Industrials", industry: "Aerospace & Defense", gics_sector_id: "20",
    risk_score: 55, internal_rating: "BBB-", sector_stress_score: 38,
    status: "current", disbursement_date: "2025-01-10", maturity_date: "2029-01-10",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "DEAL-004", company: "Amazon.com Inc", ticker: "AMZN", sponsor: "Blackstone",
    deal_type: "Revolving Credit Facility", loan_amount: 100_000_000, loan_tenor: 5, loan_type: "Senior Unsecured",
    sector: "Consumer Discretionary", industry: "Broadline Retail", gics_sector_id: "25",
    risk_score: 18, internal_rating: "AA-", sector_stress_score: 29,
    status: "current", disbursement_date: "2024-03-20", maturity_date: "2029-03-20",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "DEAL-005", company: "Pfizer Inc", ticker: "PFE", sponsor: "Warburg Pincus",
    deal_type: "Term Loan B", loan_amount: 30_000_000, loan_tenor: 5, loan_type: "Senior Secured",
    sector: "Health Care", industry: "Pharmaceuticals", gics_sector_id: "35",
    risk_score: 44, internal_rating: "BBB", sector_stress_score: 33,
    status: "current", disbursement_date: "2024-11-05", maturity_date: "2029-11-05",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "DEAL-006", company: "Occidental Petroleum", ticker: "OXY", sponsor: "Ares Management",
    deal_type: "Term Loan B", loan_amount: 35_000_000, loan_tenor: 6, loan_type: "Senior Secured",
    sector: "Energy", industry: "Oil Gas & Consumable Fuels", gics_sector_id: "10",
    risk_score: 71, internal_rating: "BB", sector_stress_score: 81,
    status: "stressed", disbursement_date: "2023-08-01", maturity_date: "2029-08-01",
    alert_count: 3, last_reviewed: "2026-04-01" },
];

export const MOCK_ALERTS: Alert[] = [
  { alert_id: "ALT-001", deal_id: "DEAL-006", company: "Occidental Petroleum",
    severity: "CRITICAL", message: "Leverage covenant at breach risk — Net Debt/EBITDA at 3.9x vs 4.0x threshold. OPEC+ cut increases risk.",
    timestamp: "2026-04-08T10:23:00Z", resolved: false, alert_type: "company" },
  { alert_id: "ALT-002", deal_id: "DEAL-001", company: "ExxonMobil",
    severity: "HIGH", message: "Sector stress event detected — Energy sector sentiment at -0.74. Request updated hedging disclosure.",
    timestamp: "2026-04-08T09:15:00Z", resolved: false, alert_type: "company" },
  { alert_id: "ALT-003", deal_id: "DEAL-003", company: "Boeing",
    severity: "MEDIUM", message: "Indirect energy sector exposure identified. Supply chain petrochemical costs rising. Flag for quarterly review.",
    timestamp: "2026-04-08T08:40:00Z", resolved: false, alert_type: "company" },
  { alert_id: "ALT-004", deal_id: "DEAL-006", company: "Occidental Petroleum",
    severity: "HIGH", message: "Risk score deteriorated from 65 to 71 over past 30 days.",
    timestamp: "2026-04-07T14:00:00Z", resolved: false, alert_type: "company" },
  { alert_id: "ALT-005", sector_id: "Energy",
    severity: "HIGH", message: "Energy sector anomaly: sentiment score -0.74 vs baseline -0.12 (2.8σ deviation). OPEC+ production cut trigger.",
    timestamp: "2026-04-08T07:00:00Z", resolved: false, alert_type: "sector" },
];

const SECTORS = [
  "Energy", "Materials", "Industrials", "Consumer Discretionary",
  "Consumer Staples", "Health Care", "Financials",
  "Information Technology", "Communication Services", "Utilities", "Real Estate",
];

function generateHeatMapData(): HeatMapData {
  const today = new Date("2026-04-08");
  const time_series = [];
  const forecast = [];

  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const scores: Record<string, number> = {};
    SECTORS.forEach((s) => {
      let base = 35;
      if (s === "Energy") base = 30 + (59 - i) * 0.8;
      if (s === "Real Estate") base = 55;
      if (s === "Financials") base = 40 + Math.sin(i * 0.2) * 10;
      scores[s] = Math.min(100, Math.max(5, base + (Math.random() - 0.5) * 15));
    });
    time_series.push({ date: d.toISOString().split("T")[0], scores });
  }

  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const scores: Record<string, number> = {};
    SECTORS.forEach((s) => {
      let base = 40;
      if (s === "Energy") base = 75 + i * 0.3;
      if (s === "Financials") base = 38 - i * 0.2;
      scores[s] = Math.min(100, Math.max(5, base + (Math.random() - 0.5) * 10));
    });
    forecast.push({ date: d.toISOString().split("T")[0], scores, is_forecast: true });
  }

  return {
    sectors: SECTORS,
    time_series,
    forecast,
    portfolio_overlays: [
      { deal_id: "DEAL-001", company: "ExxonMobil", sector_id: "Energy" },
      { deal_id: "DEAL-006", company: "OXY", sector_id: "Energy" },
      { deal_id: "DEAL-002", company: "JPMorgan", sector_id: "Financials" },
      { deal_id: "DEAL-003", company: "Boeing", sector_id: "Industrials" },
      { deal_id: "DEAL-004", company: "Amazon", sector_id: "Consumer Discretionary" },
      { deal_id: "DEAL-005", company: "Pfizer", sector_id: "Health Care" },
    ],
    last_updated: new Date().toISOString(),
  };
}

export const MOCK_HEAT_MAP: HeatMapData = generateHeatMapData();
