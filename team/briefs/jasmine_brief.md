# CreditMind — Jasmine's Work Brief

**Project:** CreditMind — AI-Powered Private Credit Underwriting Platform  
**Your Role:** Design Lead — UI & Aesthetics  
**Your GitHub Username:** jasminkaur9  
**Your Branch:** `design/jasmine`  
**Leader:** Peter (peterjohn1298) — approves all PRs  

---

## What Is CreditMind?

CreditMind is an AI-powered platform that automates private credit underwriting. Behind the scenes it runs 30 AI agents that analyze loan applications — but what users actually see and interact with is your work.

You are the Design Lead. Your job is to make CreditMind look and feel like a professional, institutional-grade financial platform. Think clean, data-dense, and trustworthy — the kind of interface that a credit analyst at a private equity or credit fund would take seriously.

---

## Your Zone

You own the entire `frontend/` directory. This is a **Next.js 14** web application styled with **Tailwind CSS**.

```
frontend/
├── app/                        ← Page routes (Next.js App Router)
│   ├── page.tsx                ← Homepage / main dashboard
│   ├── monitoring/
│   │   └── page.tsx            ← Portfolio monitoring page
│   └── layout.tsx              ← Root layout (nav, global styles)
├── components/
│   └── ui/
│       ├── AlertCard.tsx       ← Alert/notification cards
│       └── ...                 ← Other reusable components
├── lib/
│   └── utils.ts                ← Utility functions (classnames, formatting)
├── public/                     ← Static assets (logos, icons, images)
├── tailwind.config.ts          ← Color palette, fonts, spacing, breakpoints
├── package.json                ← Dependencies
└── vercel.json                 ← Vercel deployment config
```

**Your changes deploy automatically to Vercel** when Peter merges your PR.

---

## Tech Stack — What You Need to Know

| Technology | What It Is | Where You Use It |
|---|---|---|
| **Next.js 14** | React framework with App Router | Page routing, server components |
| **TypeScript** | Type-safe JavaScript | All `.tsx` and `.ts` files |
| **Tailwind CSS** | Utility-first CSS framework | All styling — no separate CSS files |
| **Vercel** | Hosting platform | Your changes go live here |

**You do not need to know Python, FastAPI, or how the AI agents work.** You interact with the backend through API calls that are already wired up — focus entirely on the visual and experience layer.

---

## Design Direction

CreditMind serves credit analysts and investment professionals. The design should communicate:

- **Authority** — this is institutional software, not a consumer app
- **Clarity** — financial data must be readable at a glance
- **Trust** — consistent, polished UI builds confidence in the platform

### Visual Reference Points
Think of the tone of: Bloomberg Terminal (data density), Linear (clean modern SaaS), and Stripe Dashboard (professional, trustworthy).

### Color System to Establish
Build a consistent semantic color palette in `tailwind.config.ts`:

| Use | Color Direction |
|---|---|
| Brand primary | Deep navy or slate blue |
| CRITICAL alerts | Bold red (`red-600`) |
| HIGH alerts | Amber (`amber-500`) |
| MEDIUM alerts | Blue (`blue-500`) |
| Positive / low risk | Green (`green-500`) |
| Background | Off-white or very light gray |
| Surface / cards | White with subtle border |
| Text primary | Near-black (`gray-900`) |
| Text secondary | Medium gray (`gray-500`) |

### Typography
- **Numbers and financial data** — use a monospace or tabular font so columns align cleanly (e.g., `font-mono` in Tailwind)
- **Headings** — clean sans-serif, medium weight
- **Body text** — readable, not too small (14–16px base)

---

## Your Focus Areas

### 1. Main Dashboard (`frontend/app/page.tsx`)
The dashboard is the first thing users see. It should communicate the portfolio's health at a glance — in under 5 seconds. Consider:
- **Summary cards at the top** — total deals, active alerts count, average risk score, portfolio value
- **Alert feed** — most recent CRITICAL and HIGH alerts, prominently displayed
- **Deal table** — list of portfolio companies with risk score, loan type, status, last updated
- **Quick actions** — buttons to submit a new deal or run a monitoring refresh

### 2. Alert Cards (`frontend/components/ui/AlertCard.tsx`)
Alerts are the most critical signal in the system — a CRITICAL alert means a borrower may default. Style them so severity is unmissable:
- CRITICAL → red background or red left border, bold text, icon
- HIGH → amber styling
- MEDIUM → blue styling
- Each card should show: severity badge, company name, alert message, date, recommended action

### 3. Risk Score Visualization
Risk scores run from 0–100. Consider visual representations:
- Color-coded badges (green 0–40, amber 41–65, red 66–100)
- A simple progress bar or arc gauge per deal
- Consistent badge treatment across all tables and cards

### 4. Monitoring Page (`frontend/app/monitoring/page.tsx`)
The monitoring page shows the ongoing health of the portfolio. Design it to show:
- Per-company news and sentiment updates
- Covenant compliance status
- Early warning flags
- Last refresh timestamp

### 5. Empty States
Design helpful empty states for:
- No deals in portfolio yet
- No alerts (positive — "Portfolio is healthy")
- Analysis in progress (loading state while AI agents run)

### 6. Loading States
AI analysis takes 30–60 seconds. Users need feedback. Consider:
- Skeleton loaders for cards and tables
- A progress indicator showing which agents have completed
- Subtle animations to signal the system is working

### 7. Responsive Layout
Primary use is desktop (1280px+), but should be functional on tablet (768px+).

---

## Important Rules

- **Only edit files inside `frontend/`** — never touch Python files or `streamlit_app.py`
- **Do not install new npm packages** without asking Peter first — new dependencies affect the Vercel build
- **Do not add new API routes** — if you need data that isn't available yet, ask Peter to add the backend endpoint
- **Keep components reusable** — build small, composable components in `components/ui/` rather than duplicating code across pages

---

## Git Workflow

```bash
# Step 1 — Always start fresh from master
git checkout design/jasmine
git pull origin master

# Step 2 — Do your work (only inside frontend/)

# Step 3 — Commit
git add frontend/components/ui/AlertCard.tsx  # specific files only
git commit -m "[Jasmine] Redesign AlertCard with severity color system"

# Step 4 — Push
git push origin design/jasmine

# Step 5 — Open a Pull Request on GitHub
# Go to github.com/peterjohn1298/CreditMind
# Click "Compare & pull request" → base: master
# Title: "[Jasmine] Brief description"
# Submit — Chief of Staff reviews automatically in ~1 minute
```

---

## How to Use Claude Code

When starting a Claude Code session, paste this at the beginning:

> "I am working on CreditMind, an AI-powered private credit underwriting platform. I am Jasmine and I am the Design Lead. I own the entire `frontend/` directory — a Next.js 14 app using the App Router and Tailwind CSS. The backend is a FastAPI app deployed on Railway. I do not touch any Python files — only files inside the `frontend/` directory. The platform serves credit analysts and investment professionals, so the design should feel institutional, clean, and data-dense. I want to [describe your task — e.g., redesign the alert cards, build the dashboard layout, improve the color system]."

---

## One Rule

Never push directly to `master`. All your work goes through `design/jasmine` → Pull Request → Chief of Staff review → Peter's approval.

**Questions?** Reach out to Peter directly.
