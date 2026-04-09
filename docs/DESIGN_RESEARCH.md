# Design Research & Preferences
**Author:** Jasmin (Research/Data/Docs)
**For:** Abraham (Frontend Lead)
**Date:** 2024-03-19
**Project:** CreditMind — Autonomous Credit Intelligence Platform

---

## Purpose

This document captures my design preferences for the CreditMind UI after reviewing the reference sites listed. These decisions should guide Abraham's implementation for color, navigation, components, animation, charts, and typography.

---

## 1. Overall Aesthetic

**References reviewed:** bloomberg.com/professional, palantir.com/platforms/foundry, factset.com, linear.app, vercel.com, raycast.com, stripe.com, brex.com, mercury.com

**Selection:** Linear / Vercel aesthetic — clean, dark-first, data-dense, minimal chrome.

I prefer the Linear/Vercel aesthetic because it strikes the right balance between professional seriousness and modern usability. Bloomberg's terminal aesthetic is too dense and dated for a new platform trying to differentiate. Palantir Foundry is powerful but visually heavy and enterprise-intimidating. Linear and Vercel have nailed the "serious product for serious people" design language — fast, clean, high information density without clutter. Mercury and Brex show this works for fintech too. CreditMind should feel like what a credit analyst would build if they had great designers — not like a legacy bank tool.

---

## 2. Color Palette — Choice: B (Charcoal + Indigo)

**References reviewed:** Linear (dark blue), Vercel (near-black + white), Raycast (charcoal + purple), QuantConnect (dark + green), Figma dark (slate + cyan), Stripe (light + blue)

**Selection:** Color Palette B — Charcoal (`#111318`) primary, Indigo (`#5B6BFF`) accent.

I prefer Palette B because the charcoal base communicates institutional seriousness and works well for long monitoring sessions — it is easier on the eyes than near-black while still feeling premium. The indigo accent is distinctive and modern without the anxiety that red/orange alert palettes can cause in a credit context. Palette A (Navy + Electric Blue) is too similar to Bloomberg and feels derivative. Palette C (Emerald) reads as a trading/quant tool. Palette E (light) is too Stripe-like and doesn't suit a risk monitoring dashboard used in high-stakes environments.

---

## 3. Navigation Style — Choice: A (Sidebar Expanded)

**References reviewed:** linear.app (sidebar icon+text), slack.com (collapsed icons), notion.so (section groupings), airtable.com (top nav), stripe.com/dashboard (accent strip)

**Selection:** Navigation Style A — persistent left sidebar, expanded by default, icons + text always visible.

I prefer the expanded sidebar because credit analysts are power users who navigate frequently between Portfolio, Alerts, Sector Intelligence, and Company Detail views. A collapsed icon-only sidebar adds unnecessary cognitive load — users should not have to hover to know where they are. The persistent sidebar also helps new users understand the platform's structure during onboarding. Stripe's accent strip (E) is visually elegant but wastes horizontal space for a data product. Top nav (D) is too shallow for a multi-section application.

---

## 4. Button Style — Choice: B (Rounded-md, Solid Fill)

**References reviewed:** bloomberg.com (sharp corners), stripe.com/vercel.com (rounded-md), framer.com (pill gradient), github.com (ghost/outline), linear.app (solid + ghost mix)

**Selection:** Button Style B — `rounded-md` (4–6px radius), solid fill for primary, outlined for secondary.

I prefer rounded-md because it sits between the harshness of sharp corners (too aggressive for a financial product) and the playfulness of pill buttons (too consumer-app). Solid fill on primary actions (e.g., "Run Analysis", "Export Report", "Escalate") ensures clear visual hierarchy. Outlined secondary buttons for lower-stakes actions keep the UI clean. This is consistent with how Stripe and Vercel handle button hierarchy — proven in professional SaaS contexts.

---

## 5. Animation Level — Choice: B (Subtle Only)

**References reviewed:** bloomberg.com/terminal (zero animation), vercel.com (subtle skeleton + hover), stripe.com homepage (number counters + card slide), framer.com (polished transitions), arc.net (full motion)

**Selection:** Animation Level B — subtle only: skeleton loading states and hover lift effects (150–200ms ease-in-out).

I prefer subtle-only animations because CreditMind is a professional tool used in high-stakes credit decisions. Excessive animation (C, D, E) would feel distracting and inappropriate when a user is reviewing covenant headroom or escalating a CRITICAL alert. Bloomberg's zero animation (A) is too sterile for a modern product. Vercel's approach — skeleton loaders, gentle hover states, no decorative motion — is exactly right. Functional motion only.

---

## 6. Chart Style — Choice: E (Mixed Line + Bar)

**References reviewed:** tradingview.com (dense gridlines), robinhood.com (clean minimal line), stripe.com (gradient area fill), bloomberg.com (columns + data labels), grafana.com (mixed line + bar)

**Selection:** Chart Style E — combination charts, line for trends, bar for comparisons, minimal gridlines.

I prefer mixed charts because CreditMind's use case inherently involves comparing time-series trends (line) against categorical breakdowns (bar). For example: sector ETF performance (line) overlaid on portfolio exposure by sector (bar) in a single view. Grafana's approach is the closest reference — it is built for monitoring dashboards where multiple signal types coexist. TradingView (A) is too chart-heavy for a credit product. Robinhood (B) is too simplified. Stripe gradient fills (C) look great on marketing pages but obscure data in dashboards. No pie or donut charts for primary data — they obscure relative magnitudes.

---

## 7. Typography

**References reviewed:** Linear/Vercel/Notion (Inter), modern fintech startups (Space Grotesk), modern startups (Plus Jakarta Sans), vercel.com (Geist), various SaaS (DM Sans)

**Selection:** Inter for all body text, headings, and labels. JetBrains Mono for all numeric values, loan amounts, risk scores, and financial figures.

I prefer Inter because it is the most legible sans-serif at small sizes in data-dense layouts — it is the standard for modern financial dashboards for good reason. Geist is interesting but too new and Vercel-specific. Space Grotesk has character but can feel too stylized for a monitoring tool. JetBrains Mono for numbers is non-negotiable — monospaced fonts make tabular financial figures align correctly, which matters when scanning $50,000,000 vs $100,000,000 across a portfolio table. Font weights: 400 regular for body, 600 semibold for headings, 500 medium for table column headers.

---

## Summary Table

| Design Dimension | Choice | Selection |
|---|---|---|
| Overall Aesthetic | Linear / Vercel | Clean, dark-first, data-dense |
| Color Palette | B | Charcoal (`#111318`) + Indigo (`#5B6BFF`) |
| Navigation Style | A | Sidebar Expanded (always visible) |
| Button Style | B | Rounded-md Solid |
| Animation Level | B | Subtle Only (150–200ms) |
| Chart Style | E | Mixed Line + Bar |
| Body Typography | — | Inter |
| Number Typography | — | JetBrains Mono |

---

## Implementation Notes for Abraham

- Risk score traffic-light system: green ≤ 40, amber 41–70, red ≥ 71.
- Alert severity colors: CRITICAL = `#DC2626` (warm red), HIGH = `#F59E0B` (amber), MEDIUM = `#5B6BFF` (indigo), LOW = `#6B7280` (gray).
- Table row hover: subtle `bg-gray-800/50` — no strong highlight colors that pull attention from data.
- Sector heat map: use a diverging scale from neutral gray → warm red for stress scores.
- Mobile is secondary for V1 — optimize for 1440px desktop (analyst workstations).
- Skeleton loaders on all async data fetches — no blank states, no spinners.
