# CreditMind Demo Script
**Version:** 1.0
**Author:** Jasmin (Research/Data/Docs)
**Date:** 2024-03-19
**Audience:** Prospective clients — credit officers, portfolio managers, heads of credit risk
**Duration:** ~15 minutes
**Format:** [Action] → [Script]

---

## Pre-Demo Setup

Load the demo portfolio (`demo_portfolio.json`) with all 6 companies. Have the OPEC+ sector event (`demo_sector_event.json`) queued but not yet triggered. Open the portfolio dashboard as the starting screen.

---

## Step 1 — Open the Portfolio Dashboard

**[Action]** Navigate to the Portfolio Dashboard. The table shows all 6 active deals with their risk scores, ratings, alert counts, and status badges.

**[Script]**
"This is the CreditMind portfolio dashboard. Every deal in your book is visible at a glance — company, ticker, internal rating, loan amount, sector, and live risk score. Notice Occidental Petroleum is already flagged CRITICAL with 8 open alerts, and Boeing is on WATCH. This view updates in real time as new signals come in. Your team doesn't have to go looking for problems — CreditMind surfaces them."

---

## Step 2 — Explore the Risk Score Column

**[Action]** Hover over OXY's risk score of 81, showing the tooltip breakdown.

**[Script]**
"Each risk score is a composite signal — not just a static internal rating. It factors in the company's financial health, sector stress, and recent news sentiment. OXY scores 81 out of 100 on risk — that's deep into red territory. You can see it's been deteriorating over the past 30 days. Click through for the full breakdown."

---

## Step 3 — Open the OXY Company Detail View

**[Action]** Click on OXY to open the Company Detail view. Show loan metadata, rating history chart, and open alerts panel.

**[Script]**
"Here's the full company view for Occidental Petroleum. Deal ID DL-2024-006: $350M Term Loan B, BB- rated, sponsored by Berkshire Hathaway, maturing February 2029. You can see the rating trend — this was a BB+ two quarters ago. Eight open alerts. Let me show you what triggered the most recent one."

---

## Step 4 — Trigger the OPEC+ Sector Event

**[Action]** Activate the demo sector event. Watch the portfolio table update — OXY jumps to CRITICAL with a new alert, XOM risk score increases from 62 to 71, Boeing gets a new indirect exposure alert.

**[Script]**
"I'm going to simulate what happened this morning: OPEC+ announced a surprise 1.5 million barrel per day production cut. Watch what CreditMind does automatically. OXY's risk score just jumped from 81 to 87 — it's now escalated with a credit committee flag. XOM moved from 62 to 71 — into amber territory. And Boeing — which is not an energy company — just received an indirect exposure alert because its aerospace supply chain has petrochemical input risk. Three relevant alerts, zero manual analysis."

---

## Step 5 — Review the Sector Event Detail Panel

**[Action]** Open the OPEC+ event detail panel. Show the structured breakdown: direct exposure, indirect exposure, no exposure companies with rationales.

**[Script]**
"This is the sector event view. CreditMind has already mapped your entire portfolio against this shock. Direct exposure — OXY at CRITICAL, XOM at HIGH. Indirect supply chain exposure — Boeing at MEDIUM, with a specific rationale about aerospace composite costs and airline order deferrals. And then three companies with no exposure — JPM, Amazon, Pfizer — each with a written rationale explaining why. This isn't a generic market alert. It's your portfolio, analyzed."

---

## Step 6 — Walk Through Recommended Actions

**[Action]** Scroll to the Recommended Actions section of the event panel. Show the three prioritized action items.

**[Script]**
"CreditMind doesn't just tell you what happened — it tells you what to do next. Priority one: escalate OXY to the credit committee, request a borrowing base certificate. Priority two: schedule a covenant review for XOM within ten business days. Priority three: add energy input cost monitoring to Boeing's quarterly checklist. These actions are pre-populated. Your team can assign them, track them, and close them — right here."

---

## Step 7 — Explore the Sector Stress Dashboard

**[Action]** Navigate to the Sector Stress view. Show the sector stress score heatmap with ETF performance overlaid. Highlight Energy at 78/100.

**[Script]**
"The Sector Stress dashboard gives you a market-level view. Each of the 11 GICS sectors has a live stress score, mapped to the corresponding SPDR ETF. Energy is at 78 — elevated, trending up since the OPEC+ announcement. XLE, the energy ETF, is up 4.2% today while SPY is down 0.8%. That divergence matters — it tells us the market is pricing in the shock. CreditMind correlates your portfolio's sector exposure to these real-time signals."

---

## Step 8 — Show the JPMorgan Detail View (No Exposure Example)

**[Action]** Click on JPM to open its company detail. Highlight the 0 alert count, risk score of 28, and the "no exposure" rationale from the sector event.

**[Script]**
"Now let's look at JPMorgan — the other end of the spectrum. Risk score 28, zero alerts, A-minus rated, $500M revolving credit. When the OPEC+ event fired, CreditMind evaluated JPMorgan and determined: no meaningful exposure. It didn't flood your team with a false alarm. That's the other half of this — reducing noise, not just generating alerts. Your analysts should spend time on OXY, not on JPM right now."

---

## Step 9 — Demonstrate the Alert Log and Audit Trail

**[Action]** Open the Alert Log view. Show the chronological feed of alerts with severity tags, timestamps, deal IDs, and review status.

**[Script]**
"Every alert is logged with a full audit trail — who reviewed it, when, and what action was taken. This matters for regulatory exams and internal credit reviews. If an examiner asks 'when did you know about the OXY stress event and what did you do?' — you have a complete, timestamped record. CreditMind is built for the accountability that credit risk management requires."

---

## Step 10 — Close with the Value Proposition

**[Action]** Return to the Portfolio Dashboard. Show the full 6-company view with updated statuses post-event.

**[Script]**
"Here's what just happened in the last five minutes: a major macro event hit the market, CreditMind automatically assessed your entire portfolio, surfaced three relevant alerts with specific rationales, deprioritized three companies that don't need attention, and generated a prioritized action list for your team. In a traditional workflow, this analysis would take a credit analyst half a day — pulling Bloomberg data, reading news, mapping sector exposure, drafting a memo. CreditMind does it in seconds. That's the pitch: your team's judgment, amplified. Any questions before we talk about your specific portfolio?"

---

## Demo Notes

- If asked about covenant tracking: "That's on our Q3 2024 roadmap — we're building document ingestion for covenant schedules now."
- If asked about pricing: "We're in pilot phase — let's talk about your portfolio size and we can structure a proposal."
- If asked about data security: "All data is encrypted in transit and at rest, hosted on AWS. We can provide a security data sheet."
- If asked about Bloomberg integration: "We can ingest Bloomberg data exports via our REST API — full documentation available."
