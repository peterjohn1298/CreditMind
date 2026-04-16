# CreditMind Demo Script
**Version:** 1.0
**Author:** Jasmin (Research/Data/Docs)
**Date:** 2024-03-19
**Duration:** ~5 minutes
**Audience:** Prospective clients — credit officers, portfolio managers, heads of credit risk
**Format:** [Action] → [Script]

---

## Pre-Demo Setup

Load `demo/demo_portfolio.json` (6 companies, $330M total). Have the OPEC+ sector event queued. Open `/dashboard` as the starting screen.

---

## Step 1

**[Action]** Open `/dashboard`

**[Script]**
"This is our credit portfolio dashboard — $330M across 6 active loans in 4 sectors."

---

## Step 2

**[Action]** Point to the sector heat map widget on the dashboard

**[Script]**
"Notice Energy has been showing elevated stress — the heat map turned orange over the past few days."

---

## Step 3

**[Action]** Click heat map → navigate to `/sector-intelligence`

**[Script]**
"This is our Sector Intelligence Hub — something no other credit platform offers. We monitor all 11 GICS sectors simultaneously, not just individual companies."

---

## Step 4

**[Action]** Show the full heat map with 60-day history and forecast

**[Script]**
"Energy spiked red after an OPEC+ production cut. Our model flagged this as a 2.8 standard deviation anomaly from the 30-day baseline."

---

## Step 5

**[Action]** Click the Energy sector alert card

**[Script]**
"The system immediately runs contagion analysis across our entire portfolio — asking which of our loans are exposed to this event."

---

## Step 6

**[Action]** Show the ContagionCard for Occidental Petroleum (OXY)

**[Script]**
"OXY is already our most stressed deal at risk score 71. The leverage covenant has less than 0.1x headroom — the system recommends a covenant review call within 5 business days."

---

## Step 7

**[Action]** Show the ContagionCard for Boeing (indirect exposure)

**[Script]**
"Here's what makes this powerful — Boeing is an Industrials company, not Energy. But our AI identified supply chain exposure to petrochemical inputs. Flagged for quarterly review."

---

## Step 8

**[Action]** Show the 30-day sector forecast chart

**[Script]**
"The forecaster models the next 30 days using ETF momentum, news velocity, and FRED macro. Energy shows continued stress. Financials is showing early signs of improvement."

---

## Step 9

**[Action]** Navigate to `/alerts`, resolve one alert

**[Script]**
"Two alerts were auto-generated — one CRITICAL for OXY, one HIGH for ExxonMobil. One click to acknowledge. Action and timestamp are logged to the audit trail."

---

## Step 10

**[Action]** Navigate to `/portfolio`, filter by Energy sector

**[Script]**
"Our entire $330M book filtered by sector in one click. All Energy exposure visible, sorted by risk score."

---

## Closing Line

"What used to take a credit analyst two hours of news reading and portfolio cross-referencing — CreditMind does in under 90 seconds, continuously, for every sector simultaneously."

---

## Q&A Cheat Sheet

| Question | Answer |
|---|---|
| Covenant tracking? | Q3 2024 roadmap — document ingestion for covenant schedules in progress. |
| Pricing? | Pilot phase — let's discuss portfolio size and structure a proposal. |
| Data security? | Encrypted in transit and at rest, hosted on AWS. Security data sheet available. |
| Bloomberg integration? | Ingest Bloomberg data exports via REST API — full documentation available. |
| How many sectors? | All 11 GICS sectors, monitored simultaneously, 24/7. |
| Open source? | Yes — available on GitHub at github.com/peterjohn1298/CreditMind. |
