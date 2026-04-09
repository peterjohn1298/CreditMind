# Design Research & Preferences
**Author:** Jasmin (Research/Data/Docs)
**For:** Abraham (Frontend Lead)
**Date:** 2024-03-19
**Project:** CreditMind — Post-Disbursement Credit Monitoring Platform

---

## Purpose

This document captures my design preferences for the CreditMind UI, based on reviewing the options presented. These are intended to guide Abraham's implementation decisions for color, navigation, components, and typography.

---

## 1. Color Palette — Choice: B (Charcoal + Indigo)

**Selection:** Color Palette B — Charcoal (`#1F2937`) primary, Indigo (`#4F46E5`) accent, light gray (`#F9FAFB`) background.

**Rationale:** I prefer Palette B because it communicates institutional seriousness without being sterile. The charcoal base feels appropriate for a financial risk platform — it conveys trust and weight. The indigo accent is distinctive enough to draw attention to alerts and CTAs without the anxiety that red-dominant or orange palettes can trigger in a credit monitoring context. Light gray backgrounds keep the data readable for long sessions. This palette also has strong accessibility contrast ratios for text-heavy dashboards.

---

## 2. Navigation Style — Choice: A (Sidebar Expanded)

**Selection:** Navigation Style A — persistent left sidebar, expanded by default, showing icons + labels.

**Rationale:** I prefer the expanded sidebar because credit analysts are power users who navigate between Portfolio, Alerts, Sector Analysis, and Company Detail views frequently. A collapsed icon-only sidebar adds unnecessary cognitive load — users should not have to hover to know where they are. The persistent sidebar also reinforces the platform's structure, which is important for onboarding new users. Collapsible as a secondary option is fine, but expanded should be the default state.

---

## 3. Button Style — Choice: B (Rounded-md Solid)

**Selection:** Button Style B — `rounded-md` (4–6px radius), solid fill for primary actions, outlined for secondary.

**Rationale:** I prefer rounded-md because it sits between the harshness of sharp corners (which feel too aggressive for a financial product) and the playfulness of fully rounded pill buttons (which feel too consumer-app). Solid fill on primary buttons (e.g., "Run Analysis", "Export Report") ensures clear visual hierarchy. Outlined secondary buttons for lower-stakes actions keeps the UI clean. This style is consistent with Bloomberg Terminal modernization directions and fits the charcoal/indigo palette well.

---

## 4. Animation Level — Choice: B (Subtle Only)

**Selection:** Animation Level B — subtle transitions only (150–200ms ease-in-out), no decorative motion.

**Rationale:** I prefer subtle-only animations because this is a professional tool used in high-stakes credit decisions. Excessive animation would feel distracting and inappropriate for users who are reviewing loan covenants or escalating alerts. Subtle page transitions and micro-interactions (e.g., button state changes, chart load fades) improve perceived performance without pulling attention away from data. No loading spinners, bouncing elements, or entrance choreography — functional motion only.

---

## 5. Chart Style — Choice: E (Mixed Line + Bar)

**Selection:** Chart Style E — combination charts with line overlays on bar charts, clean axes, minimal gridlines.

**Rationale:** I prefer mixed charts because the CreditMind use case inherently involves comparing time-series trends (line) against categorical breakdowns (bar). For example, showing sector ETF performance (line) against portfolio exposure by sector (bar) in a single view reduces cognitive switching. Minimal gridlines keep charts professional and readable without visual noise. Tooltips should be rich but non-intrusive. Avoid pie/donut charts for primary data — they obscure relative magnitudes that matter in credit analysis.

---

## 6. Typography — Choice: Inter (Body) + JetBrains Mono (Numbers)

**Selection:** Inter for all body text, headings, and labels; JetBrains Mono for all numeric values, loan amounts, risk scores, and financial figures.

**Rationale:** I prefer Inter because it is highly legible at small sizes and works well in data-dense layouts — it is the de facto standard for modern financial dashboards. I prefer JetBrains Mono for numeric data because monospaced fonts make tabular numbers align correctly, which is critical when scanning loan amounts like $750,000,000 vs $350,000,000 in a portfolio table. Mixing these two typefaces creates a natural visual language: prose and navigation in Inter, all financial data in JetBrains Mono. Font weights: 400 regular for body, 600 semibold for headings, 500 medium for table headers.

---

## Summary Table

| Design Dimension | Choice | Selection |
|---|---|---|
| Color Palette | B | Charcoal + Indigo |
| Navigation Style | A | Sidebar Expanded (default) |
| Button Style | B | Rounded-md Solid |
| Animation Level | B | Subtle Only (150–200ms) |
| Chart Style | E | Mixed Line + Bar |
| Body Typography | — | Inter |
| Number Typography | — | JetBrains Mono |

---

## Notes for Abraham

- All risk score indicators should use a consistent traffic-light color system: green ≤ 40, amber 41–70, red ≥ 71 — aligned with the charcoal/indigo base palette, not clashing with it.
- Alert badges should use the indigo accent for informational alerts and a separate warm red (`#DC2626`) only for CRITICAL severity — use sparingly.
- Table row hover states should be subtle (`bg-gray-50`) — avoid strong highlight colors that distract from data.
- Mobile responsiveness is secondary for V1 — optimize for 1440px wide desktop (analyst workstations).
