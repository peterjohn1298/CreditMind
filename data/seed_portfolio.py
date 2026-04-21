"""
CreditMind Demo Portfolio — 50 fictitious companies.
Designed to generate real early warning signals from current macro events:
  - Trump tariffs (145% China, 25% Canada/Mexico)
  - China rare earth export controls
  - GLP-1 drug disruption (Ozempic/Wegovy)
  - DOGE / federal spending cuts
  - Red Sea shipping disruption
  - AI disruption of services
  - PFAS regulatory liability
  - NATO defense spending surge
  - Oil price volatility
  - Agricultural commodity volatility
"""

from datetime import datetime

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _rating_event(event_type, from_rating, to_rating, date, score, delta, warning_level, rationale, action_required=None, proposed_rating=None):
    e = {
        "event_type":            event_type,
        "from_rating":           from_rating,
        "to_rating":             to_rating,
        "date":                  date,
        "risk_score_at_event":   score,
        "score_delta_from_baseline": delta,
        "warning_level":         warning_level,
        "rationale":             rationale,
        "agent":                 "Early Warning",
        "action_required":       action_required,
    }
    if proposed_rating:
        e["proposed_rating"] = proposed_rating
    return e


def _deal(
    deal_id, company, sector, sponsor, deal_type,
    loan_amount, loan_tenor, loan_type,
    disbursement_date, maturity_date,
    internal_rating, risk_score,
    loan_status="DISBURSED",
    ebitda=None, total_debt=None,
    early_warning_flags=None,
    human_alerts=None,
    covenant_status=None,
    financial_health="ADEQUATE",
    sentiment_score=None,
    news_signals=None,
    rating_history=None,
):
    return {
        "deal_id":            deal_id,
        "company":            company,
        "sector":             sector,
        "sponsor":            sponsor,
        "deal_type":          deal_type,
        "loan_amount":        loan_amount,
        "loan_tenor":         loan_tenor,
        "loan_type":          loan_type,
        "created_at":         disbursement_date,
        "status":             "MONITORING",
        "loan_status":        loan_status,
        "disbursement_date":  disbursement_date,
        "maturity_date":      maturity_date,
        "internal_rating":    internal_rating,
        "risk_score":         risk_score,
        "live_risk_score":    risk_score,
        "current_rating":     internal_rating,
        "documents":          {"financials": None, "cim": None, "qoe": None, "legal": None},
        "financial_analysis": {"overall_financial_health": financial_health},
        "ebitda_analysis":    {"conservative_adjusted_ebitda": ebitda},
        "credit_model":       {
            "leverage_multiple": round(total_debt / ebitda, 1) if ebitda and total_debt else None,
            "total_debt":        total_debt,
            "ebitda":            ebitda,
        },
        "stress_test":        None,
        "risk_assessment":    None,
        "covenant_package":   None,
        "covenant_status":    covenant_status or {"overall_compliance": "COMPLIANT"},
        "ic_memo":            None,
        "ic_memo_sections":   {},
        "ic_decision":        "APPROVED",
        "ic_conditions":      [],
        "ic_decision_date":   disbursement_date,
        "ic_decision_by":     "Investment Committee",
        "news_signals":       [],  # populated by monitoring agents at runtime
        "sentiment_score":    None,
        "sentiment_trend":    [],
        "early_warning_flags": [],  # populated by monitoring agents at runtime
        "portfolio_health":   None,
        "human_alerts":       [],  # populated by monitoring agents at runtime
        "divergence_flags":   [],
        "agent_log":          [],
        "routing_notes":      [],
        "rating_history":     rating_history if rating_history is not None else [
            _rating_event(
                "INITIAL", None, internal_rating,
                disbursement_date + "T00:00:00",
                risk_score, 0, "GREEN",
                f"Initial rating {internal_rating} assigned at underwriting. "
                f"Risk score {risk_score}/100 reflects credit quality at disbursement.",
                action_required=None,
            )
        ],
    }


def _alert(trigger, severity, action):
    return {
        "trigger":          trigger,
        "severity":         severity,
        "action_required":  action,
        "timestamp":        datetime.now().isoformat(),
        "resolved":         False,
    }


def _flag(flag_type, description, severity, source="Early Warning Agent"):
    return {
        "flag_type":   flag_type,
        "description": description,
        "severity":    severity,
        "source":      source,
        "timestamp":   datetime.now().isoformat(),
    }


# ---------------------------------------------------------------------------
# Portfolio — 50 Companies
# ---------------------------------------------------------------------------

DEMO_PORTFOLIO = [

    # ========================================================================
    # AEROSPACE & DEFENSE (6) — Defense budget surge, rare earth controls
    # ========================================================================

    _deal(
        "PORT0001", "Falcon Ridge Defense Systems", "Aerospace & Defense",
        "KKR", "sponsor_backed",
        245_000_000, "6 years", "First Lien Term Loan",
        "2023-03-15", "2029-03-15",
        "BB", 38, loan_status="DISBURSED",
        ebitda=52_000_000, total_debt=196_000_000,
        financial_health="STRONG",
        sentiment_score=72,
        news_signals=[
            {"headline": "DoD awards $1.2B IVAS next-gen contract to prime integrators", "sentiment": "positive"},
            {"headline": "NATO members accelerating defense procurement timelines", "sentiment": "positive"},
        ],
    ),

    _deal(
        "PORT0002", "Summit Aerostructures Inc", "Aerospace & Defense",
        "Carlyle Group", "sponsor_backed",
        180_000_000, "5 years", "Unitranche",
        "2022-07-01", "2027-07-01",
        "BB-", 49, loan_status="DISBURSED",
        ebitda=38_000_000, total_debt=171_000_000,
        financial_health="ADEQUATE",
        sentiment_score=55,
        news_signals=[
            {"headline": "Boeing 737 MAX production ramp slower than forecast — supply chain pressure", "sentiment": "negative"},
            {"headline": "Titanium prices up 18% YTD on Russia export restrictions", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("SUPPLY_CHAIN", "Titanium input costs +18% YTD — gross margin compression likely", "MEDIUM"),
        ],
    ),

    _deal(
        "PORT0003", "Meridian C4ISR Technologies", "Aerospace & Defense",
        "Warburg Pincus", "sponsor_backed",
        310_000_000, "7 years", "First Lien Term Loan",
        "2024-01-10", "2031-01-10",
        "BB+", 31, loan_status="DISBURSED",
        ebitda=68_000_000, total_debt=248_000_000,
        financial_health="STRONG",
        sentiment_score=78,
        news_signals=[
            {"headline": "US Army awards $800M C2 modernization contract", "sentiment": "positive"},
            {"headline": "NATO 5% GDP defense spending target accelerating procurement", "sentiment": "positive"},
        ],
    ),

    _deal(
        "PORT0004", "Ironclad Munitions LLC", "Aerospace & Defense",
        "Advent International", "sponsor_backed",
        95_000_000, "5 years", "Unitranche",
        "2023-09-20", "2028-09-20",
        "BB-", 47, loan_status="DISBURSED",
        ebitda=22_000_000, total_debt=85_500_000,
        financial_health="ADEQUATE",
        sentiment_score=68,
        news_signals=[
            {"headline": "Pentagon requests 40% increase in artillery ammunition procurement", "sentiment": "positive"},
            {"headline": "Army stockpile replenishment program expanded — $2.3B budget line", "sentiment": "positive"},
        ],
    ),

    _deal(
        "PORT0005", "Skybridge MRO Services", "Aerospace & Defense",
        "TPG Capital", "sponsor_backed",
        140_000_000, "5 years", "First Lien Term Loan",
        "2022-11-05", "2027-11-05",
        "BB-", 51, loan_status="DISBURSED",
        ebitda=29_000_000, total_debt=126_000_000,
        financial_health="ADEQUATE",
        sentiment_score=52,
    ),

    _deal(
        "PORT0006", "Drexler Drone Systems", "Aerospace & Defense",
        "Francisco Partners", "sponsor_backed",
        125_000_000, "5 years", "Unitranche",
        "2024-06-01", "2029-06-01",
        "BB", 40, loan_status="DISBURSED",
        ebitda=27_000_000, total_debt=112_000_000,
        financial_health="ADEQUATE",
        sentiment_score=70,
        news_signals=[
            {"headline": "DoD FY2026 budget allocates $3.1B for autonomous systems — up 62%", "sentiment": "positive"},
        ],
    ),

    # ========================================================================
    # HEALTHCARE & MEDTECH (7) — GLP-1 disruption, DOGE, IRA drug pricing
    # ========================================================================

    _deal(
        "PORT0007", "ClearPath Diagnostics", "Healthcare",
        "Bain Capital", "sponsor_backed",
        115_000_000, "5 years", "Unitranche",
        "2023-04-12", "2028-04-12",
        "B+", 55, loan_status="DISBURSED",
        ebitda=24_000_000, total_debt=103_500_000,
        financial_health="ADEQUATE",
        sentiment_score=48,
        news_signals=[
            {"headline": "CMS proposes 2.8% cut to clinical lab fee schedule for 2026", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("REGULATORY", "Medicare reimbursement cut proposal — 2.8% fee schedule reduction", "MEDIUM"),
        ],
    ),

    _deal(
        "PORT0008", "MedCore Specialty Pharmacy", "Healthcare",
        "Apollo Global Management", "sponsor_backed",
        220_000_000, "6 years", "First Lien Term Loan",
        "2022-08-18", "2028-08-18",
        "BB-", 50, loan_status="DISBURSED",
        ebitda=46_000_000, total_debt=198_000_000,
        financial_health="ADEQUATE",
        sentiment_score=44,
        news_signals=[
            {"headline": "IRA drug price negotiation round 2 — 15 additional drugs added to list", "sentiment": "negative"},
            {"headline": "Specialty pharmacy reimbursement under pressure from PBM reforms", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("REGULATORY", "IRA Round 2 drug pricing reform — margin compression on GLP-1 distribution", "HIGH"),
        ],
        human_alerts=[
            _alert(
                "IRA drug price negotiation expanding — specialty pharmacy reimbursement at risk",
                "HIGH",
                "Request updated revenue forecast from management. Assess covenant headroom impact.",
            ),
        ],
    ),

    _deal(
        "PORT0009", "Apex Home Health Network", "Healthcare",
        "Leonard Green", "sponsor_backed",
        88_000_000, "5 years", "Unitranche",
        "2023-01-25", "2028-01-25",
        "B", 63, loan_status="WATCHLIST",
        ebitda=17_500_000, total_debt=84_000_000,
        financial_health="STRESSED",
        sentiment_score=32,
        news_signals=[
            {"headline": "DOGE proposes $880B Medicaid cut over 10 years — home health among targets", "sentiment": "negative"},
            {"headline": "CMS finalizes home health rate cut of 5.1% for 2026", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("REGULATORY", "DOGE-driven Medicaid restructuring — home health volumes at risk", "HIGH"),
            _flag("FINANCIAL", "EBITDA margin declining: 23% → 18% over last 2 quarters", "HIGH"),
        ],
        covenant_status={
            "overall_compliance": "AT_RISK",
            "covenants": [{"name": "Maximum Leverage", "threshold": "5.5x", "current": "5.1x", "headroom_pct": 7.3}],
        },
        rating_history=[
            _rating_event("INITIAL", None, "BB-", "2023-01-25T00:00:00", 53, 0, "GREEN",
                "Initial rating BB- assigned at underwriting. Risk score 53/100. Home health sector benefiting from "
                "post-COVID demand and aging demographics. Medicaid reimbursement stable at disbursement.",
                action_required=None),
            _rating_event("NEGATIVE_WATCH", "BB-", "BB-", "2024-02-12T06:00:00", 57, 4, "AMBER",
                "Risk score +4 pts. CMS proposed home health rate cut of 2.8% flagged by Early Warning agent. "
                "DOGE budget discussions early stage. EBITDA margin softening from 23% to 21%. Negative watch initiated.",
                action_required="Monthly covenant reporting requested. Management call scheduled for Q1 update."),
            _rating_event("DOWNGRADE", "BB-", "B+", "2024-09-03T06:00:00", 60, 7, "AMBER",
                "Risk score +7 pts to 60/100. CMS confirmed home health rate cut of 3.4% for 2025. DOGE Medicaid "
                "proposals gaining legislative support. EBITDA margin contracted to 19%. Downgrade by one notch.",
                action_required="Formal rating action: BB- → B+. Covenant headroom monitoring accelerated to monthly."),
            _rating_event("DOWNGRADE", "B+", "B", "2025-08-18T06:00:00", 63, 10, "RED",
                "Risk score +10 pts to 63/100 (RED). CMS finalised 5.1% rate cut for 2026. DOGE Medicaid cut "
                "proposals totalling $880B over 10 years confirmed. EBITDA margin at 18%, leverage at 5.1x vs 5.5x "
                "covenant — 7% headroom. Downgrade to B.",
                action_required="Formal rating action: B+ → B. CRITICAL: Covenant breach within 1-2 quarters if margin deterioration continues."),
        ],
        human_alerts=[
            _alert(
                "DOGE Medicaid cuts + CMS rate reduction — dual revenue headwind for Apex Home Health",
                "CRITICAL",
                "Arrange management call. Review Q1 actuals vs. underwriting model. Covenant breach possible within 2 quarters.",
            ),
        ],
    ),

    _deal(
        "PORT0010", "NovaCare Behavioral Health", "Healthcare",
        "Blackstone", "sponsor_backed",
        97_000_000, "5 years", "Unitranche",
        "2023-06-30", "2028-06-30",
        "B", 64, loan_status="WATCHLIST",
        ebitda=18_200_000, total_debt=90_700_000,
        financial_health="STRESSED",
        sentiment_score=30,
        news_signals=[
            {"headline": "Medicaid managed care carve-outs expanding — behavioral health reimbursement declining", "sentiment": "negative"},
            {"headline": "DOGE targets Medicaid behavioral health waivers in 12 states", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("REGULATORY", "Medicaid behavioral health waivers under DOGE review in key states", "HIGH"),
            _flag("FINANCIAL", "Coverage ratio declining: FCCR 1.08x vs. 1.25x covenant", "CRITICAL"),
        ],
        covenant_status={
            "overall_compliance": "BREACH_DETECTED",
            "covenants": [{"name": "Minimum FCCR", "threshold": "1.25x", "current": "1.08x", "headroom_pct": -13.6}],
        },
        human_alerts=[
            _alert(
                "FCCR covenant breach detected: 1.08x vs. 1.25x minimum",
                "CRITICAL",
                "Escalate to credit committee. Engage management on equity cure rights. Waiver negotiation required.",
            ),
        ],
    ),

    _deal(
        "PORT0011", "BioVista CRO Partners", "Healthcare",
        "Warburg Pincus", "sponsor_backed",
        135_000_000, "5 years", "First Lien Term Loan",
        "2024-02-14", "2029-02-14",
        "BB", 42, loan_status="DISBURSED",
        ebitda=29_000_000, total_debt=121_500_000,
        financial_health="ADEQUATE",
        sentiment_score=55,
    ),

    _deal(
        "PORT0012", "Midwest Bariatric Centers", "Healthcare",
        "Advent International", "sponsor_backed",
        72_000_000, "5 years", "Unitranche",
        "2022-03-10", "2027-03-10",
        "B-", 70, loan_status="WATCHLIST",
        ebitda=11_800_000, total_debt=68_400_000,
        financial_health="DISTRESSED",
        sentiment_score=22,
        news_signals=[
            {"headline": "GLP-1 drug prescriptions up 340% — bariatric surgery volumes falling sharply", "sentiment": "negative"},
            {"headline": "Novo Nordisk expands Wegovy coverage — 28% of insured Americans now covered", "sentiment": "negative"},
            {"headline": "Bariatric surgery volumes down 31% YoY at major health systems", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("MARKET_DISRUPTION", "GLP-1 drugs directly cannibalizing bariatric surgery volumes — structural decline", "CRITICAL"),
            _flag("FINANCIAL", "Revenue -28% YoY — EBITDA margin collapsed from 24% to 14%", "CRITICAL"),
        ],
        covenant_status={
            "overall_compliance": "BREACH_DETECTED",
            "covenants": [{"name": "Maximum Leverage", "threshold": "5.5x", "current": "7.2x", "headroom_pct": -30.9}],
        },
        human_alerts=[
            _alert(
                "GLP-1 structural disruption — bariatric surgery volumes -31% YoY. Leverage covenant breached at 7.2x vs 5.5x limit.",
                "CRITICAL",
                "Credit committee escalation required. Assess restructuring options. GLP-1 disruption is permanent — not cyclical.",
            ),
        ],
        rating_history=[
            _rating_event("INITIAL", None, "BB+", "2022-03-10T00:00:00", 46, 0, "GREEN",
                "Initial rating BB+ assigned at underwriting. Risk score 46/100. Bariatric surgery sector stable at disbursement.",
                action_required=None),
            _rating_event("NEGATIVE_WATCH", "BB+", "BB+", "2023-06-15T06:00:00", 53, 7, "AMBER",
                "Risk score +7 pts. Early warning flags raised on GLP-1 drug approvals — Ozempic/Wegovy gaining market share. "
                "Bariatric surgery volume growth slowing. Placed on negative watch pending Q3 volume data.",
                action_required="Increase monitoring to monthly. Request volume tracking from management."),
            _rating_event("DOWNGRADE", "BB+", "BB", "2023-11-20T06:00:00", 58, 12, "AMBER",
                "Risk score +12 pts to 58/100. GLP-1 prescriptions surging 180% YoY. Bariatric volumes down 14% — EBITDA "
                "margin contracted from 24% to 20%. Quantitative model implies BB-; downgrade by one notch to BB.",
                action_required="Formal rating action: BB+ → BB. Notify credit committee. Tighten covenant headroom monitoring."),
            _rating_event("DOWNGRADE", "BB", "BB-", "2024-07-08T06:00:00", 63, 17, "RED",
                "Risk score +17 pts to 63/100 (RED). Revenue -18% YoY. EBITDA margin at 17% vs 24% at underwriting. "
                "GLP-1 disruption accelerating — structural not cyclical. Wegovy now covered by 19% of US insurers.",
                action_required="Formal rating action: BB → BB-. Watchlist designation. Quarterly covenant reporting required."),
            _rating_event("DOWNGRADE", "BB-", "B+", "2025-03-14T06:00:00", 68, 22, "RED",
                "Risk score +22 pts to 68/100. Covenant breach imminent — leverage at 6.8x vs 5.5x limit. "
                "Revenue -28% YoY driven by GLP-1 adoption hitting 340% growth. Management initiating strategic review.",
                action_required="Formal rating action: BB- → B+. Immediate credit committee escalation. Assess cure period options."),
            _rating_event("DOWNGRADE", "B+", "B-", "2025-10-22T06:00:00", 70, 24, "BLACK",
                "Risk score +24 pts to 70/100 (BLACK). Leverage covenant formally breached at 7.2x vs 5.5x maximum. "
                "EBITDA margin collapsed to 14%. GLP-1 disruption deemed permanent. Strategic alternatives process ongoing.",
                action_required="CRITICAL: Rating B+ → B-. Covenant waiver negotiation required. Consider accelerated maturity provisions."),
        ],
    ),

    _deal(
        "PORT0013", "LifeScan Diabetes Devices", "Healthcare",
        "KKR", "sponsor_backed",
        165_000_000, "6 years", "First Lien Term Loan",
        "2021-09-15", "2027-09-15",
        "B+", 61, loan_status="WATCHLIST",
        ebitda=31_000_000, total_debt=156_750_000,
        financial_health="STRESSED",
        sentiment_score=28,
        news_signals=[
            {"headline": "CGM device market shrinking — GLP-1 users require less glucose monitoring", "sentiment": "negative"},
            {"headline": "Abbott and Dexcom warn on volume decline in diabetes monitoring segment", "sentiment": "negative"},
            {"headline": "Type 2 diabetes remission rates rising with GLP-1 adoption — device TAM contracting", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("MARKET_DISRUPTION", "GLP-1 adoption reducing diabetes device TAM — revenue -17% LTM", "HIGH"),
            _flag("FINANCIAL", "Near 2021 maturity wall — refinancing at higher rates will stress coverage", "HIGH"),
        ],
        human_alerts=[
            _alert(
                "GLP-1 structural headwind on diabetes device volumes. Approaching 2027 maturity — refi risk in rising rate environment.",
                "HIGH",
                "Initiate refinancing discussion with management. Assess strategic alternatives given TAM contraction.",
            ),
        ],
    ),

    # ========================================================================
    # INDUSTRIALS & MANUFACTURING (8) — Tariffs, rare earths, reshoring
    # ========================================================================

    _deal(
        "PORT0014", "Precision Neodymium Components", "Industrials",
        "Carlyle Group", "sponsor_backed",
        85_000_000, "5 years", "Unitranche",
        "2023-05-20", "2028-05-20",
        "B+", 58, loan_status="WATCHLIST",
        ebitda=17_500_000, total_debt=80_750_000,
        financial_health="STRESSED",
        sentiment_score=25,
        news_signals=[
            {"headline": "China bans export of neodymium, dysprosium, and 5 other rare earths — effective immediately", "sentiment": "negative"},
            {"headline": "US rare earth stockpiles cover only 3 months of industrial demand", "sentiment": "negative"},
            {"headline": "Rare earth spot prices up 85% in 2 weeks following Chinese export ban", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("SUPPLY_CHAIN", "China rare earth export ban — primary input cost up 85% in 2 weeks", "CRITICAL"),
            _flag("OPERATIONAL", "Production may need to be curtailed without alternative supply within 60 days", "CRITICAL"),
        ],
        human_alerts=[
            _alert(
                "China rare earth export ban directly impacts primary input material. Production curtailment risk within 60 days.",
                "CRITICAL",
                "Immediate management call. Assess inventory levels. Identify alternative Australian/US rare earth suppliers.",
            ),
        ],
    ),

    _deal(
        "PORT0015", "Keystone Steel Processing", "Industrials",
        "Thoma Bravo", "sponsor_backed",
        110_000_000, "5 years", "First Lien Term Loan",
        "2023-11-01", "2028-11-01",
        "BB", 37, loan_status="DISBURSED",
        ebitda=25_000_000, total_debt=99_000_000,
        financial_health="STRONG",
        sentiment_score=74,
        news_signals=[
            {"headline": "25% steel and aluminum tariffs drive domestic processor volumes to record highs", "sentiment": "positive"},
            {"headline": "Import steel prices surge — domestic mills gaining market share", "sentiment": "positive"},
        ],
    ),

    _deal(
        "PORT0016", "Atlas Packaging Solutions", "Industrials",
        "Apollo Global Management", "sponsor_backed",
        145_000_000, "5 years", "First Lien Term Loan",
        "2022-06-15", "2027-06-15",
        "BB-", 48, loan_status="DISBURSED",
        ebitda=31_000_000, total_debt=130_500_000,
        financial_health="ADEQUATE",
        sentiment_score=50,
        news_signals=[
            {"headline": "E-commerce packaging volumes recovering — Amazon third party seller activity up", "sentiment": "positive"},
        ],
    ),

    _deal(
        "PORT0017", "Vanguard Hydraulic Systems", "Industrials",
        "Bain Capital", "sponsor_backed",
        118_000_000, "5 years", "Unitranche",
        "2023-08-10", "2028-08-10",
        "BB-", 50, loan_status="DISBURSED",
        ebitda=25_500_000, total_debt=106_200_000,
        financial_health="ADEQUATE",
        sentiment_score=46,
        news_signals=[
            {"headline": "USMCA review uncertainty weighing on cross-border manufacturers", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("REGULATORY", "USMCA renegotiation risk — Mexico assembly operations face potential tariff exposure", "MEDIUM"),
        ],
    ),

    _deal(
        "PORT0018", "Continental Tooling Group", "Industrials",
        "Francisco Partners", "sponsor_backed",
        82_000_000, "5 years", "Unitranche",
        "2022-09-22", "2027-09-22",
        "B+", 56, loan_status="DISBURSED",
        ebitda=16_500_000, total_debt=73_800_000,
        financial_health="ADEQUATE",
        sentiment_score=44,
        news_signals=[
            {"headline": "Chinese cutting tool imports down 40% due to tariffs — domestic share recovering", "sentiment": "positive"},
        ],
    ),

    _deal(
        "PORT0019", "American Forge & Casting", "Industrials",
        "Warburg Pincus", "sponsor_backed",
        95_000_000, "5 years", "Unitranche",
        "2024-03-05", "2029-03-05",
        "BB-", 46, loan_status="DISBURSED",
        ebitda=21_000_000, total_debt=85_500_000,
        financial_health="ADEQUATE",
        sentiment_score=62,
        news_signals=[
            {"headline": "Reshoring of defense and auto supply chains accelerating — domestic forging demand up 22%", "sentiment": "positive"},
        ],
    ),

    _deal(
        "PORT0020", "Stronghold Equipment Rentals", "Industrials",
        "TPG Capital", "sponsor_backed",
        180_000_000, "6 years", "First Lien Term Loan",
        "2023-07-18", "2029-07-18",
        "BB", 41, loan_status="DISBURSED",
        ebitda=40_000_000, total_debt=162_000_000,
        financial_health="ADEQUATE",
        sentiment_score=55,
    ),

    _deal(
        "PORT0021", "NovaPoly Materials", "Industrials",
        "KKR", "sponsor_backed",
        128_000_000, "5 years", "First Lien Term Loan",
        "2021-11-30", "2026-11-30",
        "B-", 71, loan_status="WATCHLIST",
        ebitda=19_500_000, total_debt=121_600_000,
        financial_health="DISTRESSED",
        sentiment_score=18,
        news_signals=[
            {"headline": "EPA finalizes PFAS drinking water standards — industrial manufacturers face cleanup liability", "sentiment": "negative"},
            {"headline": "Class action lawsuits against PFAS manufacturers expand to supply chain companies", "sentiment": "negative"},
            {"headline": "3M PFAS settlement reaches $12.5B — sets precedent for industrial users", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("LEGAL", "PFAS regulatory liability — class action exposure and EPA remediation costs unquantified", "CRITICAL"),
            _flag("FINANCIAL", "2026 maturity approaching — refinancing difficult given liability overhang", "CRITICAL"),
        ],
        covenant_status={
            "overall_compliance": "AT_RISK",
            "covenants": [{"name": "Maximum Leverage", "threshold": "5.5x", "current": "5.2x", "headroom_pct": 5.5}],
        },
        human_alerts=[
            _alert(
                "PFAS class action filed against NovaPoly. EPA remediation order pending. 2026 maturity in 8 months.",
                "CRITICAL",
                "Engage legal counsel immediately. Assess contingent liability. Maturity extension or paydown required — begin process now.",
            ),
        ],
    ),

    # ========================================================================
    # CONSUMER & RETAIL (7) — China tariffs, GLP-1, consumer spending
    # ========================================================================

    _deal(
        "PORT0022", "Coastal Living Brands", "Consumer & Retail",
        "Blackstone", "sponsor_backed",
        132_000_000, "5 years", "First Lien Term Loan",
        "2022-05-01", "2027-05-01",
        "B", 66, loan_status="WATCHLIST",
        ebitda=22_000_000, total_debt=125_400_000,
        financial_health="DISTRESSED",
        sentiment_score=20,
        news_signals=[
            {"headline": "145% tariff on Chinese home goods imports effective immediately — retailers in crisis", "sentiment": "negative"},
            {"headline": "Home goods retailer inventories built at pre-tariff costs — margin hit on reorder", "sentiment": "negative"},
            {"headline": "Consumer confidence falls to 3-year low on tariff inflation fears", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("MACRO", "145% China tariff on home goods — 73% of SKUs sourced from China. COGS up 40%+", "CRITICAL"),
            _flag("FINANCIAL", "Gross margin collapsing — EBITDA run-rate down ~35% since tariff announcement", "CRITICAL"),
        ],
        human_alerts=[
            _alert(
                "145% China tariff hits 73% of product sourcing. EBITDA run-rate impact: -35%. Covenant breach likely in Q3.",
                "CRITICAL",
                "Emergency management call. Pricing power assessment. Vendor renegotiation feasibility. Consider accelerated monitoring.",
            ),
        ],
    ),

    _deal(
        "PORT0023", "NorthStar Furniture Group", "Consumer & Retail",
        "Advent International", "sponsor_backed",
        82_000_000, "5 years", "Unitranche",
        "2022-02-14", "2027-02-14",
        "B", 65, loan_status="DISBURSED",
        ebitda=15_800_000, total_debt=75_100_000,
        financial_health="STRESSED",
        sentiment_score=28,
        news_signals=[
            {"headline": "Furniture imports from China face 145% tariff — domestic producers scrambling", "sentiment": "negative"},
            {"headline": "Ashley Furniture, Wayfair warn on margin compression from tariff costs", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("MACRO", "China tariffs — 65% of furniture components sourced from China. Sourcing shift underway but 12-18 month lag", "HIGH"),
        ],
        human_alerts=[
            _alert(
                "China tariffs creating significant COGS pressure. Management sourcing Vietnam/Malaysia alternatives but 12-18 month transition.",
                "HIGH",
                "Request bridge plan from management. Assess liquidity through transition period.",
            ),
        ],
    ),

    _deal(
        "PORT0024", "Summit Outdoor Gear", "Consumer & Retail",
        "Leonard Green", "sponsor_backed",
        97_000_000, "5 years", "Unitranche",
        "2023-10-10", "2028-10-10",
        "B+", 57, loan_status="DISBURSED",
        ebitda=21_000_000, total_debt=91_650_000,
        financial_health="ADEQUATE",
        sentiment_score=40,
        news_signals=[
            {"headline": "Outdoor apparel and gear tariffs adding $40-70 per unit cost for Asian-manufactured products", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("MACRO", "Tariff cost pressure — 55% of product sourced from Vietnam/Bangladesh facing 35-46% tariffs", "MEDIUM"),
        ],
    ),

    _deal(
        "PORT0025", "Premier Pet Products", "Consumer & Retail",
        "Carlyle Group", "sponsor_backed",
        148_000_000, "5 years", "First Lien Term Loan",
        "2024-04-22", "2029-04-22",
        "BB", 40, loan_status="DISBURSED",
        ebitda=33_000_000, total_debt=133_200_000,
        financial_health="ADEQUATE",
        sentiment_score=58,
        news_signals=[
            {"headline": "Pet industry remains resilient — humanization trend drives premiumization", "sentiment": "positive"},
        ],
    ),

    _deal(
        "PORT0026", "Luxe Beauty Holdings", "Consumer & Retail",
        "Bain Capital", "sponsor_backed",
        112_000_000, "5 years", "First Lien Term Loan",
        "2023-12-05", "2028-12-05",
        "BB-", 48, loan_status="DISBURSED",
        ebitda=24_500_000, total_debt=100_800_000,
        financial_health="ADEQUATE",
        sentiment_score=52,
    ),

    _deal(
        "PORT0027", "Dollar Depot Stores", "Consumer & Retail",
        "TPG Capital", "sponsor_backed",
        195_000_000, "6 years", "First Lien Term Loan",
        "2023-02-28", "2029-02-28",
        "BB", 39, loan_status="DISBURSED",
        ebitda=44_000_000, total_debt=175_500_000,
        financial_health="STRONG",
        sentiment_score=70,
        news_signals=[
            {"headline": "Dollar store traffic up 14% as consumers trade down amid tariff-driven inflation", "sentiment": "positive"},
            {"headline": "Value retailers outperforming as consumer belt-tightening accelerates", "sentiment": "positive"},
        ],
    ),

    # ========================================================================
    # TECHNOLOGY-ENABLED SERVICES (5) — AI disruption, cybersecurity, DOGE
    # ========================================================================

    _deal(
        "PORT0028", "Nexus BPO Solutions", "Technology Services",
        "Apollo Global Management", "sponsor_backed",
        105_000_000, "5 years", "Unitranche",
        "2021-06-15", "2026-06-15",
        "B-", 73, loan_status="WATCHLIST",
        ebitda=17_000_000, total_debt=99_750_000,
        financial_health="DISTRESSED",
        sentiment_score=15,
        news_signals=[
            {"headline": "AI agents handling 60% of BPO tasks at major outsourcers — headcount down 35%", "sentiment": "negative"},
            {"headline": "Accenture, Infosys warn: traditional BPO model disrupted by AI — volumes declining", "sentiment": "negative"},
            {"headline": "Enterprise AI deployments replacing $180B global BPO market over 3 years", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("MARKET_DISRUPTION", "AI agents displacing BPO workflows — revenue -22% YoY, structural not cyclical", "CRITICAL"),
            _flag("FINANCIAL", "2026 maturity in 3 months — distressed refi likely", "CRITICAL"),
        ],
        covenant_status={
            "overall_compliance": "BREACH_DETECTED",
            "covenants": [{"name": "Maximum Leverage", "threshold": "5.5x", "current": "7.8x", "headroom_pct": -41.8}],
        },
        human_alerts=[
            _alert(
                "AI structural disruption destroying BPO revenue. Leverage 7.8x vs 5.5x. Maturity in June 2026.",
                "CRITICAL",
                "Immediate restructuring engagement. Business model is structurally impaired — assess recovery value.",
            ),
        ],
    ),

    _deal(
        "PORT0029", "LegalEdge Process Outsourcing", "Technology Services",
        "Francisco Partners", "sponsor_backed",
        78_000_000, "5 years", "Unitranche",
        "2022-10-05", "2027-10-05",
        "B", 62, loan_status="DISBURSED",
        ebitda=15_500_000, total_debt=74_100_000,
        financial_health="STRESSED",
        sentiment_score=30,
        news_signals=[
            {"headline": "AI legal tools cutting document review costs by 80% — LPO market shrinking", "sentiment": "negative"},
            {"headline": "Harvey AI, Ironclad displace paralegal and LPO work at AmLaw 100 firms", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("MARKET_DISRUPTION", "AI legal tools displacing core LPO workflows — revenue pipeline deteriorating", "HIGH"),
        ],
        human_alerts=[
            _alert(
                "AI disruption accelerating in legal process outsourcing. Management yet to articulate credible pivot strategy.",
                "HIGH",
                "Schedule management call. Request 3-year revenue outlook with and without AI displacement assumption.",
            ),
        ],
    ),

    _deal(
        "PORT0030", "CloudPath Managed Services", "Technology Services",
        "Thoma Bravo", "sponsor_backed",
        122_000_000, "5 years", "First Lien Term Loan",
        "2023-08-30", "2028-08-30",
        "BB", 38, loan_status="DISBURSED",
        ebitda=27_000_000, total_debt=109_800_000,
        financial_health="ADEQUATE",
        sentiment_score=64,
        news_signals=[
            {"headline": "Cybersecurity spending up 23% YoY — SMB managed security demand accelerating", "sentiment": "positive"},
        ],
    ),

    _deal(
        "PORT0031", "SecureNet Federal Cyber", "Technology Services",
        "Warburg Pincus", "sponsor_backed",
        145_000_000, "5 years", "First Lien Term Loan",
        "2022-04-18", "2027-04-18",
        "BB-", 52, loan_status="DISBURSED",
        ebitda=30_000_000, total_debt=130_500_000,
        financial_health="ADEQUATE",
        sentiment_score=42,
        news_signals=[
            {"headline": "DOGE targets civilian agency IT contracts — $4.2B in cybersecurity spend under review", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("REGULATORY", "DOGE civilian IT spending review — 35% of revenue tied to federal civilian contracts", "HIGH"),
        ],
        human_alerts=[
            _alert(
                "DOGE federal IT cuts under review. SecureNet has 35% revenue concentration in civilian agency contracts.",
                "HIGH",
                "Request contract renewal schedule and renewal risk assessment from management.",
            ),
        ],
    ),

    _deal(
        "PORT0032", "Vertex ERP Systems", "Technology Services",
        "Vista Equity Partners", "sponsor_backed",
        210_000_000, "6 years", "First Lien Term Loan",
        "2024-05-10", "2030-05-10",
        "BB+", 33, loan_status="DISBURSED",
        ebitda=48_000_000, total_debt=189_000_000,
        financial_health="STRONG",
        sentiment_score=68,
    ),

    # ========================================================================
    # ENERGY (4) — Oil prices, LNG demand, IRA pullback, transition risk
    # ========================================================================

    _deal(
        "PORT0033", "Permian Basin Midstream", "Energy",
        "KKR", "sponsor_backed",
        228_000_000, "7 years", "First Lien Term Loan",
        "2022-12-01", "2029-12-01",
        "BB", 43, loan_status="DISBURSED",
        ebitda=51_000_000, total_debt=205_200_000,
        financial_health="ADEQUATE",
        sentiment_score=58,
        news_signals=[
            {"headline": "WTI crude falls to $68 — OPEC+ production increase decision pressuring prices", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("COMMODITY", "Oil price decline to $68/bbl — throughput volumes may soften if E&P capex pulled back", "MEDIUM"),
        ],
    ),

    _deal(
        "PORT0034", "Crestline Oilfield Services", "Energy",
        "Carlyle Group", "sponsor_backed",
        98_000_000, "5 years", "Unitranche",
        "2022-08-25", "2027-08-25",
        "B+", 60, loan_status="WATCHLIST",
        ebitda=18_500_000, total_debt=93_100_000,
        financial_health="STRESSED",
        sentiment_score=29,
        news_signals=[
            {"headline": "US rig count falls to 18-month low — oilfield services demand declining", "sentiment": "negative"},
            {"headline": "Oil price below $70 — E&P companies cutting 2026 drilling budgets", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("COMMODITY", "Rig count -15% in 60 days — revenue closely correlated with drilling activity", "HIGH"),
            _flag("FINANCIAL", "EBITDA tracking below underwriting model by 18%", "HIGH"),
        ],
        human_alerts=[
            _alert(
                "Oil price weakness driving rig count declines. OFS revenue tracking 18% below underwriting case.",
                "HIGH",
                "Request Q1 actuals and revised full-year forecast. Assess covenant headroom under $65/bbl scenario.",
            ),
        ],
    ),

    _deal(
        "PORT0035", "Solarfield Development LLC", "Energy",
        "Blackstone", "sponsor_backed",
        142_000_000, "7 years", "First Lien Term Loan",
        "2023-03-20", "2030-03-20",
        "BB-", 53, loan_status="DISBURSED",
        ebitda=28_500_000, total_debt=127_800_000,
        financial_health="ADEQUATE",
        sentiment_score=40,
        news_signals=[
            {"headline": "IRA solar tax credit transferability under Treasury review — project IRRs at risk", "sentiment": "negative"},
            {"headline": "Solar panel tariffs raised to 150% — Chinese panel costs double", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("REGULATORY", "IRA credit review + panel tariffs compressing project economics. Pipeline IRRs declining.", "MEDIUM"),
        ],
    ),

    _deal(
        "PORT0036", "Atlantic LNG Infrastructure", "Energy",
        "TPG Capital", "sponsor_backed",
        285_000_000, "8 years", "First Lien Term Loan",
        "2023-06-01", "2031-06-01",
        "BB+", 32, loan_status="DISBURSED",
        ebitda=65_000_000, total_debt=256_500_000,
        financial_health="STRONG",
        sentiment_score=72,
        news_signals=[
            {"headline": "European LNG import capacity reaches record — US export terminals running at 96% utilization", "sentiment": "positive"},
            {"headline": "Germany extends LNG import contracts through 2035 amid Russia supply uncertainty", "sentiment": "positive"},
        ],
    ),

    # ========================================================================
    # FOOD & AGRICULTURE (5) — China retaliation, Ukraine war, GLP-1
    # ========================================================================

    _deal(
        "PORT0037", "Harvest Table Foods", "Food & Agriculture",
        "Bain Capital", "sponsor_backed",
        125_000_000, "5 years", "First Lien Term Loan",
        "2022-11-15", "2027-11-15",
        "BB-", 50, loan_status="DISBURSED",
        ebitda=27_000_000, total_debt=112_500_000,
        financial_health="ADEQUATE",
        sentiment_score=46,
        news_signals=[
            {"headline": "China retaliates on US agricultural tariffs — soy and corn exports to China halted", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("MACRO", "China retaliation on ag exports — raw material input costs volatile", "MEDIUM"),
        ],
    ),

    _deal(
        "PORT0038", "Golden West Distillery", "Food & Agriculture",
        "Leonard Green", "sponsor_backed",
        88_000_000, "5 years", "Unitranche",
        "2023-09-12", "2028-09-12",
        "BB-", 49, loan_status="DISBURSED",
        ebitda=19_500_000, total_debt=79_200_000,
        financial_health="ADEQUATE",
        sentiment_score=48,
        news_signals=[
            {"headline": "25% Canada tariff impacting Canadian grain imports — rye and barley prices up 22%", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("MACRO", "Canada tariff raising grain input costs 22% — gross margin under pressure", "MEDIUM"),
        ],
    ),

    _deal(
        "PORT0039", "Crescent Bakeries Group", "Food & Agriculture",
        "Advent International", "sponsor_backed",
        96_000_000, "5 years", "Unitranche",
        "2022-07-28", "2027-07-28",
        "B+", 55, loan_status="DISBURSED",
        ebitda=20_500_000, total_debt=91_200_000,
        financial_health="ADEQUATE",
        sentiment_score=44,
        news_signals=[
            {"headline": "Wheat prices spike 15% on Black Sea export disruption — Ukraine harvest outlook weak", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("COMMODITY", "Wheat price +15% — primary input for commercial bakeries. Pricing lag of 60-90 days.", "MEDIUM"),
        ],
    ),

    _deal(
        "PORT0040", "American Grain Processing", "Food & Agriculture",
        "Warburg Pincus", "sponsor_backed",
        155_000_000, "5 years", "First Lien Term Loan",
        "2023-04-05", "2028-04-05",
        "BB", 42, loan_status="DISBURSED",
        ebitda=34_000_000, total_debt=139_500_000,
        financial_health="ADEQUATE",
        sentiment_score=52,
    ),

    _deal(
        "PORT0041", "Pacific Fresh Seafood", "Food & Agriculture",
        "Francisco Partners", "sponsor_backed",
        67_000_000, "5 years", "Unitranche",
        "2022-01-20", "2027-01-20",
        "B+", 56, loan_status="DISBURSED",
        ebitda=14_000_000, total_debt=63_650_000,
        financial_health="ADEQUATE",
        sentiment_score=42,
        news_signals=[
            {"headline": "GLP-1 users consuming fewer calories overall — foodservice and seafood volumes softening", "sentiment": "negative"},
        ],
    ),

    # ========================================================================
    # TRANSPORTATION & LOGISTICS (5) — Red Sea, tariff volumes, fuel
    # ========================================================================

    _deal(
        "PORT0042", "Pinnacle Freight Solutions", "Logistics",
        "Apollo Global Management", "sponsor_backed",
        135_000_000, "5 years", "First Lien Term Loan",
        "2022-03-30", "2027-03-30",
        "BB-", 51, loan_status="DISBURSED",
        ebitda=28_500_000, total_debt=121_500_000,
        financial_health="ADEQUATE",
        sentiment_score=44,
        news_signals=[
            {"headline": "Red Sea rerouting adding $1,200-1,800 per container — Asia-Europe rates elevated", "sentiment": "negative"},
            {"headline": "Tariff-driven import slowdown reducing trans-Pacific freight volumes 12%", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("MACRO", "Red Sea disruption elevating operating costs. Tariff-driven volume softness on trans-Pacific lanes.", "MEDIUM"),
        ],
    ),

    _deal(
        "PORT0043", "Harbor Port Logistics", "Logistics",
        "KKR", "sponsor_backed",
        162_000_000, "6 years", "First Lien Term Loan",
        "2022-10-15", "2028-10-15",
        "BB-", 52, loan_status="DISBURSED",
        ebitda=33_000_000, total_debt=145_800_000,
        financial_health="ADEQUATE",
        sentiment_score=38,
        news_signals=[
            {"headline": "Port container volumes down 23% YoY on tariff-driven import collapse", "sentiment": "negative"},
            {"headline": "US importers front-loaded inventory pre-tariff — now drawing down stockpiles", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("MACRO", "Container volumes -23% YoY — tariff shock causing import collapse at major ports", "HIGH"),
        ],
        human_alerts=[
            _alert(
                "Port container volumes down 23% YoY. Tariff front-loading effect reversing — volumes likely to remain depressed 12-18 months.",
                "HIGH",
                "Request Q1 volume data vs. underwriting case. Assess fixed cost coverage at reduced throughput.",
            ),
        ],
    ),

    _deal(
        "PORT0044", "MidAmerica Cold Chain", "Logistics",
        "Carlyle Group", "sponsor_backed",
        112_000_000, "5 years", "Unitranche",
        "2023-07-12", "2028-07-12",
        "BB", 43, loan_status="DISBURSED",
        ebitda=25_000_000, total_debt=100_800_000,
        financial_health="ADEQUATE",
        sentiment_score=56,
    ),

    _deal(
        "PORT0045", "RapidRoute Last Mile", "Logistics",
        "Blackstone", "sponsor_backed",
        87_000_000, "5 years", "Unitranche",
        "2023-11-20", "2028-11-20",
        "B+", 57, loan_status="DISBURSED",
        ebitda=17_800_000, total_debt=82_650_000,
        financial_health="ADEQUATE",
        sentiment_score=46,
        news_signals=[
            {"headline": "Amazon expanding in-house last mile delivery — third party carrier volumes under pressure", "sentiment": "negative"},
        ],
    ),

    _deal(
        "PORT0046", "Continental Rail Services", "Logistics",
        "TPG Capital", "sponsor_backed",
        145_000_000, "6 years", "First Lien Term Loan",
        "2022-09-05", "2028-09-05",
        "BB", 44, loan_status="DISBURSED",
        ebitda=32_000_000, total_debt=130_500_000,
        financial_health="ADEQUATE",
        sentiment_score=53,
    ),

    # ========================================================================
    # SPECIALTY CHEMICALS (4) — PFAS, tariffs, feedstock
    # ========================================================================

    _deal(
        "PORT0047", "Apex Specialty Chemicals", "Specialty Chemicals",
        "Bain Capital", "sponsor_backed",
        178_000_000, "6 years", "First Lien Term Loan",
        "2021-08-10", "2027-08-10",
        "B+", 59, loan_status="DISBURSED",
        ebitda=34_000_000, total_debt=169_100_000,
        financial_health="STRESSED",
        sentiment_score=32,
        news_signals=[
            {"headline": "EPA PFAS enforcement actions expanding to chemical manufacturers and formulators", "sentiment": "negative"},
            {"headline": "PFAS liability estimates for US chemical industry revised to $400B+", "sentiment": "negative"},
        ],
        early_warning_flags=[
            _flag("LEGAL", "PFAS manufacturing exposure — EPA enforcement expanding. Contingent liability unquantified.", "HIGH"),
        ],
        human_alerts=[
            _alert(
                "EPA PFAS enforcement expanding to chemical manufacturers. Apex produces PFAS-containing compounds. Legal exposure material.",
                "HIGH",
                "Engage legal counsel. Request management disclosure of PFAS product revenue and exposure estimate.",
            ),
        ],
    ),

    _deal(
        "PORT0048", "Clearwater Water Treatment", "Specialty Chemicals",
        "Warburg Pincus", "sponsor_backed",
        98_000_000, "5 years", "Unitranche",
        "2024-01-15", "2029-01-15",
        "BB", 36, loan_status="DISBURSED",
        ebitda=22_000_000, total_debt=88_200_000,
        financial_health="STRONG",
        sentiment_score=70,
        news_signals=[
            {"headline": "EPA PFAS water treatment mandate creates $18B market for water purification chemicals", "sentiment": "positive"},
            {"headline": "Municipal water authorities accelerating PFAS remediation spend — demand surge", "sentiment": "positive"},
        ],
    ),

    _deal(
        "PORT0049", "Titan Adhesives Group", "Specialty Chemicals",
        "Francisco Partners", "sponsor_backed",
        82_000_000, "5 years", "Unitranche",
        "2023-05-08", "2028-05-08",
        "B+", 54, loan_status="DISBURSED",
        ebitda=17_500_000, total_debt=74_200_000,
        financial_health="ADEQUATE",
        sentiment_score=46,
        news_signals=[
            {"headline": "Chinese chemical feedstock tariffs raising production costs for adhesive manufacturers", "sentiment": "negative"},
        ],
    ),

    # ========================================================================
    # FINANCIAL SERVICES (1) — Rate environment, claims inflation
    # ========================================================================

    _deal(
        "PORT0050", "Cornerstone Specialty Insurance", "Financial Services",
        "Advent International", "sponsor_backed",
        115_000_000, "5 years", "Unitranche",
        "2023-10-25", "2028-10-25",
        "BB", 41, loan_status="DISBURSED",
        ebitda=26_000_000, total_debt=103_500_000,
        financial_health="ADEQUATE",
        sentiment_score=58,
        news_signals=[
            {"headline": "Specialty insurance pricing hardening — E&S market rates up 12-18%", "sentiment": "positive"},
            {"headline": "Catastrophe claims elevated — Hurricane season losses above 10-year average", "sentiment": "negative"},
        ],
    ),
]
