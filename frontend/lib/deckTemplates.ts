export interface DeckData {
  company: string;
  rating: string;
  risk_score: number;
  approval: string;
  recommendation: string;
  loan_amount: string;
  tenor: string;
  facility: string;
  sponsor: string;
  memo_sections: Record<string, string>;
  date: string;
}

const SECTION_LABELS: Record<string, string> = {
  executive_summary:   "Executive Summary",
  business_overview:   "Business Overview",
  financial_analysis:  "Financial Analysis",
  credit_analysis:     "Credit Analysis",
  industry_analysis:   "Industry & Market Position",
  risk_factors:        "Key Risk Factors",
  covenant_package:    "Proposed Covenant Package",
  stress_testing:      "Stress Testing & Scenarios",
  market_comparables:  "Market Comparables",
  esg_considerations:  "ESG Considerations",
  recommendation:      "Investment Committee Recommendation",
};

function approvalColor(approval: string): string {
  if (approval === "APPROVE") return "#00D4A4";
  if (approval === "CONDITIONAL") return "#FFB300";
  return "#FF3B5C";
}

function riskColor(score: number): string {
  if (score <= 30) return "#00D4A4";
  if (score <= 60) return "#FFB300";
  if (score <= 80) return "#FF8C00";
  return "#FF3B5C";
}

// ── Template 1: Dark Executive ───────────────────────────────────────────────
function darkExecutive(d: DeckData): string {
  const sections = Object.entries(d.memo_sections)
    .map(([key, content]) => `
      <div class="section">
        <h2>${SECTION_LABELS[key] ?? key}</h2>
        <p>${content.replace(/\n/g, "<br>")}</p>
      </div>`)
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>IC Memo — ${d.company}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0A1628;color:#E2E8F0;font-family:'Segoe UI',Arial,sans-serif;padding:0}
  .cover{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:80px;border-bottom:3px solid #1B7FE5;background:linear-gradient(135deg,#0A1628 60%,#0F2040)}
  .cover-tag{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#1B7FE5;margin-bottom:16px}
  .cover-title{font-size:3rem;font-weight:800;color:#fff;line-height:1.1;margin-bottom:8px}
  .cover-sub{font-size:1.1rem;color:#64B5F6;margin-bottom:40px}
  .meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:40px}
  .meta-card{background:rgba(27,127,229,0.1);border:1px solid rgba(27,127,229,0.3);padding:16px;border-radius:8px}
  .meta-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#6B7FA3;margin-bottom:6px}
  .meta-value{font-size:1.1rem;font-weight:700;font-family:monospace}
  .section{padding:48px 80px;border-bottom:1px solid #1e3a5f}
  h2{font-size:1rem;text-transform:uppercase;letter-spacing:2px;color:#1B7FE5;border-left:3px solid #1B7FE5;padding-left:12px;margin-bottom:16px}
  p{color:#CBD5E1;font-size:0.9rem;line-height:1.8}
  .footer{padding:24px 80px;color:#6B7FA3;font-size:10px;display:flex;justify-content:space-between;border-top:1px solid #1e3a5f}
  .verdict{display:inline-block;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:1px;border:1px solid}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="cover">
  <p class="cover-tag">Investment Committee Memorandum · Confidential</p>
  <h1 class="cover-title">${d.company}</h1>
  <p class="cover-sub">${d.facility} · $${d.loan_amount}M · ${d.tenor}-Year Tenor</p>
  <span class="verdict" style="color:${approvalColor(d.approval)};border-color:${approvalColor(d.approval)};background:${approvalColor(d.approval)}22">${d.approval}</span>
  <div class="meta-grid">
    <div class="meta-card"><p class="meta-label">Internal Rating</p><p class="meta-value" style="color:#64B5F6">${d.rating}</p></div>
    <div class="meta-card"><p class="meta-label">Risk Score</p><p class="meta-value" style="color:${riskColor(d.risk_score)}">${d.risk_score} / 100</p></div>
    <div class="meta-card"><p class="meta-label">PE Sponsor</p><p class="meta-value" style="color:#E2E8F0">${d.sponsor || "—"}</p></div>
    <div class="meta-card"><p class="meta-label">Date</p><p class="meta-value" style="color:#E2E8F0">${d.date}</p></div>
  </div>
</div>
${sections}
<div class="footer">
  <span>CreditMind — AI Credit Intelligence Platform</span>
  <span>CONFIDENTIAL — For Internal Use Only</span>
  <span>${d.date}</span>
</div>
</body></html>`;
}

// ── Template 2: Classic White (Traditional IB) ───────────────────────────────
function classicWhite(d: DeckData): string {
  const sections = Object.entries(d.memo_sections)
    .map(([key, content]) => `
      <div class="section">
        <h2>${SECTION_LABELS[key] ?? key}</h2>
        <div class="divider"></div>
        <p>${content.replace(/\n/g, "<br>")}</p>
      </div>`)
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>IC Memo — ${d.company}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#fff;color:#1a1a2e;font-family:'Times New Roman',Georgia,serif;padding:0}
  .header{background:#0A1628;color:#fff;padding:32px 64px;display:flex;justify-content:space-between;align-items:center}
  .header-left p:first-child{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#6B7FA3;margin-bottom:4px}
  .header-left h1{font-size:1.8rem;font-weight:700}
  .header-right{text-align:right}
  .cover{padding:48px 64px;border-bottom:3px solid #0A1628}
  .cover-sub{font-size:1rem;color:#555;margin:8px 0 24px}
  .verdict{display:inline-block;padding:6px 16px;font-size:12px;font-weight:700;letter-spacing:1px;border:2px solid}
  .meta-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#e2e8f0;margin-top:24px;border:1px solid #e2e8f0}
  .meta-cell{background:#fff;padding:16px}
  .meta-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#6B7FA3;margin-bottom:4px}
  .meta-value{font-size:1rem;font-weight:700;color:#0A1628}
  .section{padding:36px 64px;border-bottom:1px solid #e2e8f0}
  h2{font-size:0.85rem;text-transform:uppercase;letter-spacing:2px;color:#0A1628;font-weight:700;margin-bottom:4px}
  .divider{width:48px;height:2px;background:#1B7FE5;margin:8px 0 16px}
  p{color:#444;font-size:0.9rem;line-height:1.8}
  .footer{padding:20px 64px;display:flex;justify-content:space-between;color:#999;font-size:10px;border-top:2px solid #0A1628}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="header">
  <div class="header-left"><p>Credit Committee Memorandum</p><h1>${d.company}</h1></div>
  <div class="header-right">
    <p style="font-size:10px;color:#6B7FA3;margin-bottom:4px">DECISION</p>
    <span class="verdict" style="color:${approvalColor(d.approval)};border-color:${approvalColor(d.approval)}">${d.approval}</span>
  </div>
</div>
<div class="cover">
  <p class="cover-sub">${d.facility} · $${d.loan_amount}M · ${d.tenor}-Year Tenor · Sponsor: ${d.sponsor || "—"}</p>
  <div class="meta-row">
    <div class="meta-cell"><p class="meta-label">Internal Rating</p><p class="meta-value">${d.rating}</p></div>
    <div class="meta-cell"><p class="meta-label">Risk Score</p><p class="meta-value" style="color:${riskColor(d.risk_score)}">${d.risk_score} / 100</p></div>
    <div class="meta-cell"><p class="meta-label">Loan Amount</p><p class="meta-value">$${d.loan_amount}M</p></div>
    <div class="meta-cell"><p class="meta-label">Date</p><p class="meta-value">${d.date}</p></div>
  </div>
</div>
${sections}
<div class="footer">
  <span>CreditMind AI Credit Intelligence</span>
  <span>CONFIDENTIAL — For Internal Use Only</span>
  <span>${d.date}</span>
</div>
</body></html>`;
}

// ── Template 3: Data Dense (Two-Column) ──────────────────────────────────────
function dataDense(d: DeckData): string {
  const entries = Object.entries(d.memo_sections);
  const left  = entries.filter((_, i) => i % 2 === 0);
  const right = entries.filter((_, i) => i % 2 === 1);

  const renderCol = (items: [string,string][]) => items.map(([key,content]) => `
    <div class="card">
      <div class="card-header">${SECTION_LABELS[key] ?? key}</div>
      <p>${content.replace(/\n/g,"<br>")}</p>
    </div>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>IC Memo — ${d.company}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#F8FAFC;color:#1e293b;font-family:'Segoe UI',Arial,sans-serif;padding:0}
  .topbar{background:#0A1628;color:#fff;padding:16px 32px;display:flex;align-items:center;justify-content:space-between;gap:16px}
  .topbar h1{font-size:1.2rem;font-weight:700}
  .topbar-meta{display:flex;gap:24px}
  .topbar-item{font-size:10px;text-align:center}
  .topbar-item .v{font-size:1rem;font-weight:700;font-family:monospace}
  .topbar-item .l{color:#6B7FA3;margin-top:2px}
  .verdict-bar{background:${approvalColor(d.approval)}22;border-bottom:3px solid ${approvalColor(d.approval)};padding:10px 32px;font-size:11px;font-weight:700;letter-spacing:1px;color:${approvalColor(d.approval)}}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px 32px}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:16px;break-inside:avoid}
  .card-header{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#1B7FE5;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:10px}
  p{font-size:0.8rem;line-height:1.7;color:#475569}
  .footer{padding:12px 32px;color:#94a3b8;font-size:10px;display:flex;justify-content:space-between;background:#fff;border-top:1px solid #e2e8f0}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.grid{grid-template-columns:1fr 1fr}}
</style></head><body>
<div class="topbar">
  <h1>IC Memo — ${d.company}</h1>
  <div class="topbar-meta">
    <div class="topbar-item"><div class="v">${d.rating}</div><div class="l">RATING</div></div>
    <div class="topbar-item"><div class="v" style="color:${riskColor(d.risk_score)}">${d.risk_score}</div><div class="l">RISK</div></div>
    <div class="topbar-item"><div class="v">$${d.loan_amount}M</div><div class="l">AMOUNT</div></div>
    <div class="topbar-item"><div class="v">${d.tenor}yr</div><div class="l">TENOR</div></div>
    <div class="topbar-item"><div class="v">${d.facility.split(" ").slice(0,2).join(" ")}</div><div class="l">FACILITY</div></div>
  </div>
</div>
<div class="verdict-bar">DECISION: ${d.approval} &nbsp;·&nbsp; ${d.date}</div>
<div class="grid">
  <div>${renderCol(left)}</div>
  <div>${renderCol(right)}</div>
</div>
<div class="footer">
  <span>CreditMind AI Credit Intelligence</span>
  <span>CONFIDENTIAL</span>
  <span>${d.date}</span>
</div>
</body></html>`;
}

// ── Template 4: One-Pager Executive Summary ──────────────────────────────────
function onePager(d: DeckData): string {
  const execSummary = d.memo_sections["executive_summary"] ?? d.recommendation;
  const riskFactors = d.memo_sections["risk_factors"] ?? "";
  const covenants   = d.memo_sections["covenant_package"] ?? "";
  const recommendation = d.memo_sections["recommendation"] ?? d.recommendation;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Executive Summary — ${d.company}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#fff;color:#1e293b;font-family:'Segoe UI',Arial,sans-serif;padding:48px;max-width:900px;margin:0 auto}
  .logo{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#6B7FA3;margin-bottom:32px}
  h1{font-size:2rem;font-weight:800;color:#0A1628;margin-bottom:4px}
  .sub{font-size:1rem;color:#64748b;margin-bottom:24px}
  .badge-row{display:flex;gap:12px;margin-bottom:32px;flex-wrap:wrap}
  .badge{padding:6px 14px;border-radius:4px;font-size:11px;font-weight:700;border:1px solid}
  .section{margin-bottom:24px}
  .section h2{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#1B7FE5;margin-bottom:8px}
  .section p{font-size:0.85rem;line-height:1.7;color:#475569}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
  hr{border:none;border-top:1px solid #e2e8f0;margin:20px 0}
  .footer{display:flex;justify-content:space-between;color:#94a3b8;font-size:9px;margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<p class="logo">CreditMind · Investment Committee Memorandum · Confidential</p>
<h1>${d.company}</h1>
<p class="sub">${d.facility} · $${d.loan_amount}M · ${d.tenor}-Year Tenor · Sponsor: ${d.sponsor || "—"}</p>
<div class="badge-row">
  <span class="badge" style="color:${approvalColor(d.approval)};border-color:${approvalColor(d.approval)};background:${approvalColor(d.approval)}18">${d.approval}</span>
  <span class="badge" style="color:#1B7FE5;border-color:#1B7FE533;background:#1B7FE518">Rating: ${d.rating}</span>
  <span class="badge" style="color:${riskColor(d.risk_score)};border-color:${riskColor(d.risk_score)}44;background:${riskColor(d.risk_score)}18">Risk: ${d.risk_score}/100</span>
</div>
<div class="section"><h2>Executive Summary</h2><p>${execSummary.replace(/\n/g,"<br>")}</p></div>
<div class="grid">
  <div class="section"><h2>Key Risk Factors</h2><p>${riskFactors.replace(/\n/g,"<br>")}</p></div>
  <div class="section"><h2>Proposed Covenant Package</h2><p>${covenants.replace(/\n/g,"<br>")}</p></div>
</div>
<div class="section"><h2>Recommendation</h2><p>${recommendation.replace(/\n/g,"<br>")}</p></div>
<div class="footer">
  <span>CreditMind AI Credit Intelligence</span>
  <span>CONFIDENTIAL — For Internal Use Only</span>
  <span>${d.date}</span>
</div>
</body></html>`;
}

export type DeckTemplate = "dark" | "white" | "dense" | "onepager";

export const DECK_TEMPLATES: { id: DeckTemplate; label: string; desc: string; preview: string }[] = [
  { id: "dark",     label: "Dark Executive",     desc: "Navy background, cinematic style — matches the app aesthetic",   preview: "bg-navy-900 border-accent" },
  { id: "white",    label: "Classic White",       desc: "Traditional investment bank format — white background, formal",  preview: "bg-white border-gray-300" },
  { id: "dense",    label: "Data Dense",          desc: "Two-column grid layout — maximum information per page",          preview: "bg-slate-100 border-slate-400" },
  { id: "onepager", label: "One-Pager Summary",   desc: "Single-page executive brief — quick read for busy committees",   preview: "bg-white border-blue-400" },
];

export function generateDeckHTML(template: DeckTemplate, data: DeckData): string {
  switch (template) {
    case "dark":     return darkExecutive(data);
    case "white":    return classicWhite(data);
    case "dense":    return dataDense(data);
    case "onepager": return onePager(data);
  }
}
