// Mock data sourced from Peter's seed_portfolio.py (data/seed_portfolio.py on master)
// 50-company demo portfolio designed around current macro events
// Swap CreditContext to use lib/api.ts once John's FastAPI is live

import type { Deal, Alert, HeatMapData } from "./types";

// Sector → GICS ID + industry mapping
const SECTOR_META: Record<string, { gics_sector_id: string; industry: string }> = {
  "Aerospace & Defense":   { gics_sector_id: "20", industry: "Aerospace & Defense" },
  "Healthcare":            { gics_sector_id: "35", industry: "Health Care Equipment & Services" },
  "Industrials":           { gics_sector_id: "20", industry: "Capital Goods" },
  "Consumer & Retail":     { gics_sector_id: "25", industry: "Consumer Discretionary" },
  "Technology Services":   { gics_sector_id: "45", industry: "IT Services" },
  "Energy":                { gics_sector_id: "10", industry: "Oil Gas & Consumable Fuels" },
  "Food & Agriculture":    { gics_sector_id: "30", industry: "Food Products" },
  "Logistics":             { gics_sector_id: "20", industry: "Transportation" },
  "Specialty Chemicals":   { gics_sector_id: "15", industry: "Chemicals" },
  "Financial Services":    { gics_sector_id: "40", industry: "Diversified Financial Services" },
};

function tenorYears(t: string): number {
  const m = t.match(/(\d+)/);
  return m ? parseInt(m[1]) : 5;
}

function dealStatus(loanStatus: string, riskScore: number): "current" | "watchlist" | "stressed" {
  if (loanStatus === "WATCHLIST" && riskScore >= 65) return "stressed";
  if (loanStatus === "WATCHLIST") return "watchlist";
  return "current";
}

function sectorStress(sector: string, riskScore: number): number {
  const base: Record<string, number> = {
    "Aerospace & Defense": 35, "Healthcare": 62, "Industrials": 48,
    "Consumer & Retail": 71, "Technology Services": 58, "Energy": 55,
    "Food & Agriculture": 52, "Logistics": 60, "Specialty Chemicals": 63,
    "Financial Services": 38,
  };
  return Math.min(99, Math.round((base[sector] ?? 45) + (riskScore - 50) * 0.3));
}

export const MOCK_DEALS: Deal[] = [
  // ── Aerospace & Defense ──────────────────────────────────────────────────────
  { deal_id: "PORT0001", company: "Falcon Ridge Defense Systems", ticker: "PRIV", sponsor: "KKR",
    deal_type: "sponsor_backed", loan_amount: 245_000_000, loan_tenor: 6, loan_type: "First Lien Term Loan",
    sector: "Aerospace & Defense", industry: "Aerospace & Defense", gics_sector_id: "20",
    risk_score: 38, internal_rating: "BB", sector_stress_score: sectorStress("Aerospace & Defense", 38),
    status: "current", disbursement_date: "2023-03-15", maturity_date: "2029-03-15",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0002", company: "Summit Aerostructures Inc", ticker: "PRIV", sponsor: "Carlyle Group",
    deal_type: "sponsor_backed", loan_amount: 180_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Aerospace & Defense", industry: "Aerospace & Defense", gics_sector_id: "20",
    risk_score: 49, internal_rating: "BB-", sector_stress_score: sectorStress("Aerospace & Defense", 49),
    status: "current", disbursement_date: "2022-07-01", maturity_date: "2027-07-01",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0003", company: "Meridian C4ISR Technologies", ticker: "PRIV", sponsor: "Warburg Pincus",
    deal_type: "sponsor_backed", loan_amount: 310_000_000, loan_tenor: 7, loan_type: "First Lien Term Loan",
    sector: "Aerospace & Defense", industry: "Aerospace & Defense", gics_sector_id: "20",
    risk_score: 31, internal_rating: "BB+", sector_stress_score: sectorStress("Aerospace & Defense", 31),
    status: "current", disbursement_date: "2024-01-10", maturity_date: "2031-01-10",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0004", company: "Ironclad Munitions LLC", ticker: "PRIV", sponsor: "Advent International",
    deal_type: "sponsor_backed", loan_amount: 95_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Aerospace & Defense", industry: "Aerospace & Defense", gics_sector_id: "20",
    risk_score: 47, internal_rating: "BB-", sector_stress_score: sectorStress("Aerospace & Defense", 47),
    status: "current", disbursement_date: "2023-09-20", maturity_date: "2028-09-20",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0005", company: "Skybridge MRO Services", ticker: "PRIV", sponsor: "TPG Capital",
    deal_type: "sponsor_backed", loan_amount: 140_000_000, loan_tenor: 5, loan_type: "First Lien Term Loan",
    sector: "Aerospace & Defense", industry: "Aerospace & Defense", gics_sector_id: "20",
    risk_score: 51, internal_rating: "BB-", sector_stress_score: sectorStress("Aerospace & Defense", 51),
    status: "current", disbursement_date: "2022-11-05", maturity_date: "2027-11-05",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0006", company: "Drexler Drone Systems", ticker: "PRIV", sponsor: "Francisco Partners",
    deal_type: "sponsor_backed", loan_amount: 125_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Aerospace & Defense", industry: "Aerospace & Defense", gics_sector_id: "20",
    risk_score: 40, internal_rating: "BB", sector_stress_score: sectorStress("Aerospace & Defense", 40),
    status: "current", disbursement_date: "2024-06-01", maturity_date: "2029-06-01",
    alert_count: 0, last_reviewed: "2026-04-01" },

  // ── Healthcare ───────────────────────────────────────────────────────────────
  { deal_id: "PORT0007", company: "ClearPath Diagnostics", ticker: "PRIV", sponsor: "Bain Capital",
    deal_type: "sponsor_backed", loan_amount: 115_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Healthcare", industry: "Health Care Equipment & Services", gics_sector_id: "35",
    risk_score: 55, internal_rating: "B+", sector_stress_score: sectorStress("Healthcare", 55),
    status: "current", disbursement_date: "2023-04-12", maturity_date: "2028-04-12",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0008", company: "MedCore Specialty Pharmacy", ticker: "PRIV", sponsor: "Apollo Global Management",
    deal_type: "sponsor_backed", loan_amount: 220_000_000, loan_tenor: 6, loan_type: "First Lien Term Loan",
    sector: "Healthcare", industry: "Health Care Equipment & Services", gics_sector_id: "35",
    risk_score: 50, internal_rating: "BB-", sector_stress_score: sectorStress("Healthcare", 50),
    status: "current", disbursement_date: "2022-08-18", maturity_date: "2028-08-18",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0009", company: "Apex Home Health Network", ticker: "PRIV", sponsor: "Leonard Green",
    deal_type: "sponsor_backed", loan_amount: 88_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Healthcare", industry: "Health Care Equipment & Services", gics_sector_id: "35",
    risk_score: 63, internal_rating: "B", sector_stress_score: sectorStress("Healthcare", 63),
    status: "watchlist", disbursement_date: "2023-01-25", maturity_date: "2028-01-25",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0010", company: "NovaCare Behavioral Health", ticker: "PRIV", sponsor: "Blackstone",
    deal_type: "sponsor_backed", loan_amount: 97_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Healthcare", industry: "Health Care Equipment & Services", gics_sector_id: "35",
    risk_score: 64, internal_rating: "B", sector_stress_score: sectorStress("Healthcare", 64),
    status: "watchlist", disbursement_date: "2023-06-30", maturity_date: "2028-06-30",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0011", company: "BioVista CRO Partners", ticker: "PRIV", sponsor: "Warburg Pincus",
    deal_type: "sponsor_backed", loan_amount: 135_000_000, loan_tenor: 5, loan_type: "First Lien Term Loan",
    sector: "Healthcare", industry: "Health Care Equipment & Services", gics_sector_id: "35",
    risk_score: 42, internal_rating: "BB", sector_stress_score: sectorStress("Healthcare", 42),
    status: "current", disbursement_date: "2024-02-14", maturity_date: "2029-02-14",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0012", company: "Midwest Bariatric Centers", ticker: "PRIV", sponsor: "Advent International",
    deal_type: "sponsor_backed", loan_amount: 72_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Healthcare", industry: "Health Care Equipment & Services", gics_sector_id: "35",
    risk_score: 70, internal_rating: "B-", sector_stress_score: sectorStress("Healthcare", 70),
    status: "stressed", disbursement_date: "2022-03-10", maturity_date: "2027-03-10",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0013", company: "LifeScan Diabetes Devices", ticker: "PRIV", sponsor: "KKR",
    deal_type: "sponsor_backed", loan_amount: 165_000_000, loan_tenor: 6, loan_type: "First Lien Term Loan",
    sector: "Healthcare", industry: "Health Care Equipment & Services", gics_sector_id: "35",
    risk_score: 61, internal_rating: "B+", sector_stress_score: sectorStress("Healthcare", 61),
    status: "watchlist", disbursement_date: "2021-09-15", maturity_date: "2027-09-15",
    alert_count: 1, last_reviewed: "2026-04-01" },

  // ── Industrials ──────────────────────────────────────────────────────────────
  { deal_id: "PORT0014", company: "Precision Neodymium Components", ticker: "PRIV", sponsor: "Carlyle Group",
    deal_type: "sponsor_backed", loan_amount: 85_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Industrials", industry: "Capital Goods", gics_sector_id: "20",
    risk_score: 58, internal_rating: "B+", sector_stress_score: sectorStress("Industrials", 58),
    status: "watchlist", disbursement_date: "2023-05-20", maturity_date: "2028-05-20",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0015", company: "Keystone Steel Processing", ticker: "PRIV", sponsor: "Thoma Bravo",
    deal_type: "sponsor_backed", loan_amount: 110_000_000, loan_tenor: 5, loan_type: "First Lien Term Loan",
    sector: "Industrials", industry: "Capital Goods", gics_sector_id: "20",
    risk_score: 37, internal_rating: "BB", sector_stress_score: sectorStress("Industrials", 37),
    status: "current", disbursement_date: "2023-11-01", maturity_date: "2028-11-01",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0016", company: "Atlas Packaging Solutions", ticker: "PRIV", sponsor: "Apollo Global Management",
    deal_type: "sponsor_backed", loan_amount: 145_000_000, loan_tenor: 5, loan_type: "First Lien Term Loan",
    sector: "Industrials", industry: "Capital Goods", gics_sector_id: "20",
    risk_score: 48, internal_rating: "BB-", sector_stress_score: sectorStress("Industrials", 48),
    status: "current", disbursement_date: "2022-06-15", maturity_date: "2027-06-15",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0017", company: "Vanguard Hydraulic Systems", ticker: "PRIV", sponsor: "Bain Capital",
    deal_type: "sponsor_backed", loan_amount: 118_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Industrials", industry: "Capital Goods", gics_sector_id: "20",
    risk_score: 50, internal_rating: "BB-", sector_stress_score: sectorStress("Industrials", 50),
    status: "current", disbursement_date: "2023-08-10", maturity_date: "2028-08-10",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0018", company: "Continental Tooling Group", ticker: "PRIV", sponsor: "Francisco Partners",
    deal_type: "sponsor_backed", loan_amount: 82_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Industrials", industry: "Capital Goods", gics_sector_id: "20",
    risk_score: 56, internal_rating: "B+", sector_stress_score: sectorStress("Industrials", 56),
    status: "current", disbursement_date: "2022-09-22", maturity_date: "2027-09-22",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0019", company: "American Forge & Casting", ticker: "PRIV", sponsor: "Warburg Pincus",
    deal_type: "sponsor_backed", loan_amount: 95_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Industrials", industry: "Capital Goods", gics_sector_id: "20",
    risk_score: 46, internal_rating: "BB-", sector_stress_score: sectorStress("Industrials", 46),
    status: "current", disbursement_date: "2024-03-05", maturity_date: "2029-03-05",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0020", company: "Stronghold Equipment Rentals", ticker: "PRIV", sponsor: "TPG Capital",
    deal_type: "sponsor_backed", loan_amount: 180_000_000, loan_tenor: 6, loan_type: "First Lien Term Loan",
    sector: "Industrials", industry: "Capital Goods", gics_sector_id: "20",
    risk_score: 41, internal_rating: "BB", sector_stress_score: sectorStress("Industrials", 41),
    status: "current", disbursement_date: "2023-07-18", maturity_date: "2029-07-18",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0021", company: "NovaPoly Materials", ticker: "PRIV", sponsor: "KKR",
    deal_type: "sponsor_backed", loan_amount: 128_000_000, loan_tenor: 5, loan_type: "First Lien Term Loan",
    sector: "Industrials", industry: "Capital Goods", gics_sector_id: "20",
    risk_score: 71, internal_rating: "B-", sector_stress_score: sectorStress("Industrials", 71),
    status: "stressed", disbursement_date: "2021-11-30", maturity_date: "2026-11-30",
    alert_count: 1, last_reviewed: "2026-04-01" },

  // ── Consumer & Retail ────────────────────────────────────────────────────────
  { deal_id: "PORT0022", company: "Coastal Living Brands", ticker: "PRIV", sponsor: "Blackstone",
    deal_type: "sponsor_backed", loan_amount: 132_000_000, loan_tenor: 5, loan_type: "First Lien Term Loan",
    sector: "Consumer & Retail", industry: "Consumer Discretionary", gics_sector_id: "25",
    risk_score: 66, internal_rating: "B", sector_stress_score: sectorStress("Consumer & Retail", 66),
    status: "stressed", disbursement_date: "2022-05-01", maturity_date: "2027-05-01",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0023", company: "NorthStar Furniture Group", ticker: "PRIV", sponsor: "Advent International",
    deal_type: "sponsor_backed", loan_amount: 82_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Consumer & Retail", industry: "Consumer Discretionary", gics_sector_id: "25",
    risk_score: 65, internal_rating: "B", sector_stress_score: sectorStress("Consumer & Retail", 65),
    status: "watchlist", disbursement_date: "2022-02-14", maturity_date: "2027-02-14",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0024", company: "Summit Outdoor Gear", ticker: "PRIV", sponsor: "Leonard Green",
    deal_type: "sponsor_backed", loan_amount: 97_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Consumer & Retail", industry: "Consumer Discretionary", gics_sector_id: "25",
    risk_score: 57, internal_rating: "B+", sector_stress_score: sectorStress("Consumer & Retail", 57),
    status: "current", disbursement_date: "2023-10-10", maturity_date: "2028-10-10",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0025", company: "Premier Pet Products", ticker: "PRIV", sponsor: "Carlyle Group",
    deal_type: "sponsor_backed", loan_amount: 148_000_000, loan_tenor: 5, loan_type: "First Lien Term Loan",
    sector: "Consumer & Retail", industry: "Consumer Discretionary", gics_sector_id: "25",
    risk_score: 40, internal_rating: "BB", sector_stress_score: sectorStress("Consumer & Retail", 40),
    status: "current", disbursement_date: "2024-04-22", maturity_date: "2029-04-22",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0026", company: "Luxe Beauty Holdings", ticker: "PRIV", sponsor: "Bain Capital",
    deal_type: "sponsor_backed", loan_amount: 112_000_000, loan_tenor: 5, loan_type: "First Lien Term Loan",
    sector: "Consumer & Retail", industry: "Consumer Discretionary", gics_sector_id: "25",
    risk_score: 48, internal_rating: "BB-", sector_stress_score: sectorStress("Consumer & Retail", 48),
    status: "current", disbursement_date: "2023-12-05", maturity_date: "2028-12-05",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0027", company: "Dollar Depot Stores", ticker: "PRIV", sponsor: "TPG Capital",
    deal_type: "sponsor_backed", loan_amount: 195_000_000, loan_tenor: 6, loan_type: "First Lien Term Loan",
    sector: "Consumer & Retail", industry: "Consumer Discretionary", gics_sector_id: "25",
    risk_score: 39, internal_rating: "BB", sector_stress_score: sectorStress("Consumer & Retail", 39),
    status: "current", disbursement_date: "2023-02-28", maturity_date: "2029-02-28",
    alert_count: 0, last_reviewed: "2026-04-01" },

  // ── Technology Services ──────────────────────────────────────────────────────
  { deal_id: "PORT0028", company: "Nexus BPO Solutions", ticker: "PRIV", sponsor: "Apollo Global Management",
    deal_type: "sponsor_backed", loan_amount: 105_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Technology Services", industry: "IT Services", gics_sector_id: "45",
    risk_score: 73, internal_rating: "B-", sector_stress_score: sectorStress("Technology Services", 73),
    status: "stressed", disbursement_date: "2021-06-15", maturity_date: "2026-06-15",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0029", company: "LegalEdge Process Outsourcing", ticker: "PRIV", sponsor: "Francisco Partners",
    deal_type: "sponsor_backed", loan_amount: 78_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Technology Services", industry: "IT Services", gics_sector_id: "45",
    risk_score: 62, internal_rating: "B", sector_stress_score: sectorStress("Technology Services", 62),
    status: "watchlist", disbursement_date: "2022-10-05", maturity_date: "2027-10-05",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0030", company: "CloudPath Managed Services", ticker: "PRIV", sponsor: "Thoma Bravo",
    deal_type: "sponsor_backed", loan_amount: 122_000_000, loan_tenor: 5, loan_type: "First Lien Term Loan",
    sector: "Technology Services", industry: "IT Services", gics_sector_id: "45",
    risk_score: 38, internal_rating: "BB", sector_stress_score: sectorStress("Technology Services", 38),
    status: "current", disbursement_date: "2023-08-30", maturity_date: "2028-08-30",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0031", company: "SecureNet Federal Cyber", ticker: "PRIV", sponsor: "Warburg Pincus",
    deal_type: "sponsor_backed", loan_amount: 145_000_000, loan_tenor: 5, loan_type: "First Lien Term Loan",
    sector: "Technology Services", industry: "IT Services", gics_sector_id: "45",
    risk_score: 52, internal_rating: "BB-", sector_stress_score: sectorStress("Technology Services", 52),
    status: "current", disbursement_date: "2022-04-18", maturity_date: "2027-04-18",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0032", company: "Vertex ERP Systems", ticker: "PRIV", sponsor: "Vista Equity Partners",
    deal_type: "sponsor_backed", loan_amount: 210_000_000, loan_tenor: 6, loan_type: "First Lien Term Loan",
    sector: "Technology Services", industry: "IT Services", gics_sector_id: "45",
    risk_score: 33, internal_rating: "BB+", sector_stress_score: sectorStress("Technology Services", 33),
    status: "current", disbursement_date: "2024-05-10", maturity_date: "2030-05-10",
    alert_count: 0, last_reviewed: "2026-04-01" },

  // ── Energy ───────────────────────────────────────────────────────────────────
  { deal_id: "PORT0033", company: "Permian Basin Midstream", ticker: "PRIV", sponsor: "KKR",
    deal_type: "sponsor_backed", loan_amount: 228_000_000, loan_tenor: 7, loan_type: "First Lien Term Loan",
    sector: "Energy", industry: "Oil Gas & Consumable Fuels", gics_sector_id: "10",
    risk_score: 43, internal_rating: "BB", sector_stress_score: sectorStress("Energy", 43),
    status: "current", disbursement_date: "2022-12-01", maturity_date: "2029-12-01",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0034", company: "Crestline Oilfield Services", ticker: "PRIV", sponsor: "Carlyle Group",
    deal_type: "sponsor_backed", loan_amount: 98_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Energy", industry: "Oil Gas & Consumable Fuels", gics_sector_id: "10",
    risk_score: 60, internal_rating: "B+", sector_stress_score: sectorStress("Energy", 60),
    status: "watchlist", disbursement_date: "2022-08-25", maturity_date: "2027-08-25",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0035", company: "Solarfield Development LLC", ticker: "PRIV", sponsor: "Blackstone",
    deal_type: "sponsor_backed", loan_amount: 142_000_000, loan_tenor: 7, loan_type: "First Lien Term Loan",
    sector: "Energy", industry: "Oil Gas & Consumable Fuels", gics_sector_id: "10",
    risk_score: 53, internal_rating: "BB-", sector_stress_score: sectorStress("Energy", 53),
    status: "current", disbursement_date: "2023-03-20", maturity_date: "2030-03-20",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0036", company: "Atlantic LNG Infrastructure", ticker: "PRIV", sponsor: "TPG Capital",
    deal_type: "sponsor_backed", loan_amount: 285_000_000, loan_tenor: 8, loan_type: "First Lien Term Loan",
    sector: "Energy", industry: "Oil Gas & Consumable Fuels", gics_sector_id: "10",
    risk_score: 32, internal_rating: "BB+", sector_stress_score: sectorStress("Energy", 32),
    status: "current", disbursement_date: "2023-06-01", maturity_date: "2031-06-01",
    alert_count: 0, last_reviewed: "2026-04-01" },

  // ── Food & Agriculture ───────────────────────────────────────────────────────
  { deal_id: "PORT0037", company: "Harvest Table Foods", ticker: "PRIV", sponsor: "Bain Capital",
    deal_type: "sponsor_backed", loan_amount: 125_000_000, loan_tenor: 5, loan_type: "First Lien Term Loan",
    sector: "Food & Agriculture", industry: "Food Products", gics_sector_id: "30",
    risk_score: 50, internal_rating: "BB-", sector_stress_score: sectorStress("Food & Agriculture", 50),
    status: "current", disbursement_date: "2022-11-15", maturity_date: "2027-11-15",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0038", company: "Golden West Distillery", ticker: "PRIV", sponsor: "Leonard Green",
    deal_type: "sponsor_backed", loan_amount: 88_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Food & Agriculture", industry: "Food Products", gics_sector_id: "30",
    risk_score: 49, internal_rating: "BB-", sector_stress_score: sectorStress("Food & Agriculture", 49),
    status: "current", disbursement_date: "2023-09-12", maturity_date: "2028-09-12",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0039", company: "Crescent Bakeries Group", ticker: "PRIV", sponsor: "Advent International",
    deal_type: "sponsor_backed", loan_amount: 96_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Food & Agriculture", industry: "Food Products", gics_sector_id: "30",
    risk_score: 55, internal_rating: "B+", sector_stress_score: sectorStress("Food & Agriculture", 55),
    status: "current", disbursement_date: "2022-07-28", maturity_date: "2027-07-28",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0040", company: "American Grain Processing", ticker: "PRIV", sponsor: "Warburg Pincus",
    deal_type: "sponsor_backed", loan_amount: 155_000_000, loan_tenor: 5, loan_type: "First Lien Term Loan",
    sector: "Food & Agriculture", industry: "Food Products", gics_sector_id: "30",
    risk_score: 42, internal_rating: "BB", sector_stress_score: sectorStress("Food & Agriculture", 42),
    status: "current", disbursement_date: "2023-04-05", maturity_date: "2028-04-05",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0041", company: "Pacific Fresh Seafood", ticker: "PRIV", sponsor: "Francisco Partners",
    deal_type: "sponsor_backed", loan_amount: 67_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Food & Agriculture", industry: "Food Products", gics_sector_id: "30",
    risk_score: 56, internal_rating: "B+", sector_stress_score: sectorStress("Food & Agriculture", 56),
    status: "current", disbursement_date: "2022-01-20", maturity_date: "2027-01-20",
    alert_count: 0, last_reviewed: "2026-04-01" },

  // ── Logistics ────────────────────────────────────────────────────────────────
  { deal_id: "PORT0042", company: "Pinnacle Freight Solutions", ticker: "PRIV", sponsor: "Apollo Global Management",
    deal_type: "sponsor_backed", loan_amount: 135_000_000, loan_tenor: 5, loan_type: "First Lien Term Loan",
    sector: "Logistics", industry: "Transportation", gics_sector_id: "20",
    risk_score: 51, internal_rating: "BB-", sector_stress_score: sectorStress("Logistics", 51),
    status: "current", disbursement_date: "2022-03-30", maturity_date: "2027-03-30",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0043", company: "Harbor Port Logistics", ticker: "PRIV", sponsor: "KKR",
    deal_type: "sponsor_backed", loan_amount: 162_000_000, loan_tenor: 6, loan_type: "First Lien Term Loan",
    sector: "Logistics", industry: "Transportation", gics_sector_id: "20",
    risk_score: 52, internal_rating: "BB-", sector_stress_score: sectorStress("Logistics", 52),
    status: "current", disbursement_date: "2022-10-15", maturity_date: "2028-10-15",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0044", company: "MidAmerica Cold Chain", ticker: "PRIV", sponsor: "Carlyle Group",
    deal_type: "sponsor_backed", loan_amount: 112_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Logistics", industry: "Transportation", gics_sector_id: "20",
    risk_score: 43, internal_rating: "BB", sector_stress_score: sectorStress("Logistics", 43),
    status: "current", disbursement_date: "2023-07-12", maturity_date: "2028-07-12",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0045", company: "RapidRoute Last Mile", ticker: "PRIV", sponsor: "Blackstone",
    deal_type: "sponsor_backed", loan_amount: 87_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Logistics", industry: "Transportation", gics_sector_id: "20",
    risk_score: 57, internal_rating: "B+", sector_stress_score: sectorStress("Logistics", 57),
    status: "current", disbursement_date: "2023-11-20", maturity_date: "2028-11-20",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0046", company: "Continental Rail Services", ticker: "PRIV", sponsor: "TPG Capital",
    deal_type: "sponsor_backed", loan_amount: 145_000_000, loan_tenor: 6, loan_type: "First Lien Term Loan",
    sector: "Logistics", industry: "Transportation", gics_sector_id: "20",
    risk_score: 44, internal_rating: "BB", sector_stress_score: sectorStress("Logistics", 44),
    status: "current", disbursement_date: "2022-09-05", maturity_date: "2028-09-05",
    alert_count: 0, last_reviewed: "2026-04-01" },

  // ── Specialty Chemicals ──────────────────────────────────────────────────────
  { deal_id: "PORT0047", company: "Apex Specialty Chemicals", ticker: "PRIV", sponsor: "Bain Capital",
    deal_type: "sponsor_backed", loan_amount: 178_000_000, loan_tenor: 6, loan_type: "First Lien Term Loan",
    sector: "Specialty Chemicals", industry: "Chemicals", gics_sector_id: "15",
    risk_score: 59, internal_rating: "B+", sector_stress_score: sectorStress("Specialty Chemicals", 59),
    status: "current", disbursement_date: "2021-08-10", maturity_date: "2027-08-10",
    alert_count: 1, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0048", company: "Clearwater Water Treatment", ticker: "PRIV", sponsor: "Warburg Pincus",
    deal_type: "sponsor_backed", loan_amount: 98_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Specialty Chemicals", industry: "Chemicals", gics_sector_id: "15",
    risk_score: 36, internal_rating: "BB", sector_stress_score: sectorStress("Specialty Chemicals", 36),
    status: "current", disbursement_date: "2024-01-15", maturity_date: "2029-01-15",
    alert_count: 0, last_reviewed: "2026-04-01" },
  { deal_id: "PORT0049", company: "Titan Adhesives Group", ticker: "PRIV", sponsor: "Francisco Partners",
    deal_type: "sponsor_backed", loan_amount: 82_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Specialty Chemicals", industry: "Chemicals", gics_sector_id: "15",
    risk_score: 54, internal_rating: "B+", sector_stress_score: sectorStress("Specialty Chemicals", 54),
    status: "current", disbursement_date: "2023-05-08", maturity_date: "2028-05-08",
    alert_count: 0, last_reviewed: "2026-04-01" },

  // ── Financial Services ───────────────────────────────────────────────────────
  { deal_id: "PORT0050", company: "Cornerstone Specialty Insurance", ticker: "PRIV", sponsor: "Advent International",
    deal_type: "sponsor_backed", loan_amount: 115_000_000, loan_tenor: 5, loan_type: "Unitranche",
    sector: "Financial Services", industry: "Diversified Financial Services", gics_sector_id: "40",
    risk_score: 41, internal_rating: "BB", sector_stress_score: sectorStress("Financial Services", 41),
    status: "current", disbursement_date: "2023-10-25", maturity_date: "2028-10-25",
    alert_count: 0, last_reviewed: "2026-04-01" },
];

function minsAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

export const MOCK_ALERTS: Alert[] = [
  // CRITICAL alerts
  { alert_id: "ALT-001", deal_id: "PORT0012", company: "Midwest Bariatric Centers",
    severity: "CRITICAL", message: "GLP-1 structural disruption — bariatric surgery volumes -31% YoY. Leverage covenant breach imminent.",
    timestamp: minsAgo(12), resolved: false, alert_type: "company" },
  { alert_id: "ALT-002", deal_id: "PORT0010", company: "NovaCare Behavioral Health",
    severity: "CRITICAL", message: "FCCR covenant breach detected: 1.08x vs. 1.25x minimum. Immediate remediation required.",
    timestamp: minsAgo(27), resolved: false, alert_type: "company" },
  { alert_id: "ALT-003", deal_id: "PORT0022", company: "Coastal Living Brands",
    severity: "CRITICAL", message: "145% China tariff hits 73% of product sourcing. EBITDA run-rate impact: -35%. Covenant breach risk.",
    timestamp: minsAgo(43), resolved: false, alert_type: "company" },
  { alert_id: "ALT-004", deal_id: "PORT0028", company: "Nexus BPO Solutions",
    severity: "CRITICAL", message: "AI structural disruption destroying BPO revenue. Leverage 7.8x vs 5.5x covenant. Maturity in 3 months.",
    timestamp: minsAgo(68), resolved: false, alert_type: "company" },
  { alert_id: "ALT-005", deal_id: "PORT0021", company: "NovaPoly Materials",
    severity: "CRITICAL", message: "PFAS class action filed. EPA remediation order pending. 2026 maturity approaching — refinancing at risk.",
    timestamp: minsAgo(95), resolved: false, alert_type: "company" },
  { alert_id: "ALT-006", deal_id: "PORT0014", company: "Precision Neodymium Components",
    severity: "CRITICAL", message: "China rare earth export ban — primary input cost up 85% in 2 weeks. Production curtailment within 60 days.",
    timestamp: minsAgo(134), resolved: false, alert_type: "company" },
  { alert_id: "ALT-007", deal_id: "PORT0009", company: "Apex Home Health Network",
    severity: "CRITICAL", message: "DOGE Medicaid cuts + CMS rate reduction — dual revenue headwind. EBITDA margin 23% → 18% over 2 quarters.",
    timestamp: minsAgo(187), resolved: false, alert_type: "company" },
  // HIGH alerts
  { alert_id: "ALT-008", deal_id: "PORT0013", company: "LifeScan Diabetes Devices",
    severity: "HIGH", message: "GLP-1 adoption reducing diabetes device TAM — revenue -17% LTM. Near 2027 maturity wall.",
    timestamp: minsAgo(245), resolved: false, alert_type: "company" },
  { alert_id: "ALT-009", deal_id: "PORT0034", company: "Crestline Oilfield Services",
    severity: "HIGH", message: "Oil price weakness driving rig count declines. EBITDA tracking 18% below underwriting model.",
    timestamp: minsAgo(312), resolved: false, alert_type: "company" },
  { alert_id: "ALT-010", deal_id: "PORT0043", company: "Harbor Port Logistics",
    severity: "HIGH", message: "Port container volumes down 23% YoY. Tariff front-loading effect reversing — volume decline expected.",
    timestamp: minsAgo(398), resolved: false, alert_type: "company" },
  { alert_id: "ALT-011", deal_id: "PORT0008", company: "MedCore Specialty Pharmacy",
    severity: "HIGH", message: "IRA drug price negotiation expanding — specialty pharmacy reimbursement at risk. Margin compression on GLP-1.",
    timestamp: minsAgo(510), resolved: false, alert_type: "company" },
  { alert_id: "ALT-012", deal_id: "PORT0047", company: "Apex Specialty Chemicals",
    severity: "HIGH", message: "EPA PFAS enforcement expanding to chemical manufacturers. Contingent liability risk increasing.",
    timestamp: minsAgo(623), resolved: false, alert_type: "company" },
  { alert_id: "ALT-013", deal_id: "PORT0029", company: "LegalEdge Process Outsourcing",
    severity: "HIGH", message: "AI disruption accelerating in legal process outsourcing. Revenue pipeline deteriorating.",
    timestamp: minsAgo(741), resolved: false, alert_type: "company" },
  { alert_id: "ALT-014", deal_id: "PORT0031", company: "SecureNet Federal Cyber",
    severity: "HIGH", message: "DOGE federal IT cuts under review. SecureNet has 35% revenue concentration in civilian contracts.",
    timestamp: minsAgo(865), resolved: false, alert_type: "company" },
  // Sector alerts
  { alert_id: "ALT-015", sector_id: "Consumer & Retail",
    severity: "CRITICAL", message: "Consumer & Retail sector under tariff shock — China-sourced goods facing 145% import tariffs. 3 portfolio loans at risk.",
    timestamp: minsAgo(58), resolved: false, alert_type: "sector" },
  { alert_id: "ALT-016", sector_id: "Healthcare",
    severity: "HIGH", message: "Healthcare sector stress: GLP-1 disruption + DOGE Medicaid cuts creating dual headwind across 7 portfolio loans.",
    timestamp: minsAgo(74), resolved: false, alert_type: "sector" },
  { alert_id: "ALT-017", sector_id: "Technology Services",
    severity: "HIGH", message: "AI disruption accelerating in BPO/LPO subsectors. Two portfolio loans showing structural revenue decline.",
    timestamp: minsAgo(91), resolved: false, alert_type: "sector" },
];

const SECTORS = [
  "Aerospace & Defense", "Healthcare", "Industrials", "Consumer & Retail",
  "Technology Services", "Energy", "Food & Agriculture",
  "Logistics", "Specialty Chemicals", "Financial Services",
];

// Sector stress baselines reflect current macro environment
const SECTOR_STRESS_BASE: Record<string, number> = {
  "Aerospace & Defense": 32,
  "Healthcare": 68,
  "Industrials": 48,
  "Consumer & Retail": 76,
  "Technology Services": 61,
  "Energy": 54,
  "Food & Agriculture": 50,
  "Logistics": 58,
  "Specialty Chemicals": 62,
  "Financial Services": 38,
};

function generateHeatMapData(): HeatMapData {
  const today = new Date();
  const time_series = [];
  const forecast = [];

  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const scores: Record<string, number> = {};
    SECTORS.forEach((s) => {
      const base = SECTOR_STRESS_BASE[s] ?? 40;
      // Consumer & Retail spiked recently due to tariffs
      const tariffSpike = s === "Consumer & Retail" && i < 15 ? (15 - i) * 1.2 : 0;
      // Healthcare trending up due to GLP-1 + DOGE
      const healthTrend = s === "Healthcare" ? (59 - i) * 0.15 : 0;
      scores[s] = Math.min(99, Math.max(5, base + tariffSpike + healthTrend + (Math.random() - 0.5) * 12));
    });
    time_series.push({ date: d.toISOString().split("T")[0], scores });
  }

  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const scores: Record<string, number> = {};
    SECTORS.forEach((s) => {
      const base = SECTOR_STRESS_BASE[s] ?? 40;
      const tariffForecast = s === "Consumer & Retail" ? i * 0.4 : 0;
      const healthForecast = s === "Healthcare" ? i * 0.2 : 0;
      const energyEase = s === "Energy" ? -i * 0.15 : 0;
      scores[s] = Math.min(99, Math.max(5, base + tariffForecast + healthForecast + energyEase + (Math.random() - 0.5) * 8));
    });
    forecast.push({ date: d.toISOString().split("T")[0], scores, is_forecast: true });
  }

  // Portfolio overlays — stressed/watchlist companies on the heat map
  const portfolio_overlays = MOCK_DEALS
    .filter((d) => d.status !== "current" || d.alert_count > 0)
    .map((d) => ({ deal_id: d.deal_id, company: d.company, sector_id: d.sector }));

  return {
    sectors: SECTORS,
    time_series,
    forecast,
    portfolio_overlays,
    last_updated: new Date().toISOString(),
  };
}

export const MOCK_HEAT_MAP: HeatMapData = generateHeatMapData();
