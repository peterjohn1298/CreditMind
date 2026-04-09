"""
CreditMind FastAPI Backend
Owner: John Hanish

Bridge between Peter's Python agents (core/) and Abraham's Next.js frontend.
Run: uvicorn api.main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from core.orchestrator import (
    run_full_underwriting,
    DailyMonitoringOrchestrator,
    QuarterlyReviewOrchestrator,
)
from core.credit_state import create_credit_state
from core.alert_system import get_pending_alerts, resolve_alert, get_alert_summary
from agents.ic_memo_writer import ICMemoWriterAgent

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="CreditMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory portfolio store (replaces Streamlit session_state for API context)
_portfolio: dict[str, dict] = {}


def _get_deal(deal_id: str) -> dict:
    deal = _portfolio.get(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail=f"Deal '{deal_id}' not found.")
    return deal


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------

class UnderwriteRequest(BaseModel):
    company: str
    ticker: str
    loan_amount: float
    loan_tenor: int
    loan_type: str
    sponsor: str


class MonitorRequest(BaseModel):
    deal_id: str
    ticker: str


class QuarterlyReviewRequest(BaseModel):
    deal_id: str
    ticker: str


class CreditMemoRequest(BaseModel):
    deal_id: str


class ResolveAlertRequest(BaseModel):
    alert_id: str
    resolved_by: str
    notes: Optional[str] = ""


# ---------------------------------------------------------------------------
# Response Models
# ---------------------------------------------------------------------------

class MonitorResponse(BaseModel):
    deal_id: str
    risk_score: Optional[float]
    alerts: list
    sentiment: Optional[dict]
    monitoring_summary: Optional[str]


class QuarterlyReviewResponse(BaseModel):
    deal_id: str
    rating: Optional[str]
    covenant_status: Optional[dict]
    rating_change: Optional[str]
    review_summary: Optional[str]


class CreditMemoResponse(BaseModel):
    deal_id: str
    memo_sections: Optional[dict]
    recommendation: Optional[str]
    approval_status: Optional[str]


class AlertSummary(BaseModel):
    critical: int
    high: int
    medium: int
    low: int


class AlertsResponse(BaseModel):
    alerts: list
    summary: AlertSummary


class ResolveAlertResponse(BaseModel):
    success: bool
    alert_id: str
    resolved_at: str


# ---------------------------------------------------------------------------
# Original 6 Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/underwrite")
def underwrite(req: UnderwriteRequest):
    """Run full credit underwriting pipeline. Returns full credit_state dict."""
    try:
        credit_state = run_full_underwriting(
            company=req.company,
            ticker=req.ticker,
            loan_amount=req.loan_amount,
            loan_tenor=req.loan_tenor,
            loan_type=req.loan_type,
        )
        deal_id = credit_state.get("deal_id", f"{req.ticker}_{int(datetime.now().timestamp())}")
        credit_state["deal_id"] = deal_id
        _portfolio[deal_id] = credit_state
        return credit_state
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


@app.post("/api/daily-monitor", response_model=MonitorResponse)
def daily_monitor(req: MonitorRequest):
    """Run daily monitoring agents for an existing deal."""
    try:
        credit_state = _get_deal(req.deal_id)
        orchestrator = DailyMonitoringOrchestrator()
        credit_state = orchestrator.run(credit_state)
        _portfolio[req.deal_id] = credit_state

        summary = get_alert_summary(credit_state)
        return MonitorResponse(
            deal_id=req.deal_id,
            risk_score=credit_state.get("risk_score"),
            alerts=get_pending_alerts(credit_state),
            sentiment=credit_state.get("sentiment_analysis"),
            monitoring_summary=credit_state.get("early_warning_summary"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


@app.post("/api/quarterly-review", response_model=QuarterlyReviewResponse)
def quarterly_review(req: QuarterlyReviewRequest):
    """Run quarterly review agents for an existing deal."""
    try:
        credit_state = _get_deal(req.deal_id)
        orchestrator = QuarterlyReviewOrchestrator()
        credit_state = orchestrator.run(credit_state)
        _portfolio[req.deal_id] = credit_state

        return QuarterlyReviewResponse(
            deal_id=req.deal_id,
            rating=credit_state.get("credit_rating"),
            covenant_status=credit_state.get("covenant_status"),
            rating_change=credit_state.get("rating_change"),
            review_summary=credit_state.get("quarterly_review_summary"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


@app.post("/api/credit-memo", response_model=CreditMemoResponse)
def credit_memo(req: CreditMemoRequest):
    """Generate IC credit memo for an existing deal."""
    try:
        credit_state = _get_deal(req.deal_id)
        agent = ICMemoWriterAgent()
        credit_state = agent.run(credit_state)
        _portfolio[req.deal_id] = credit_state

        return CreditMemoResponse(
            deal_id=req.deal_id,
            memo_sections=credit_state.get("ic_memo"),
            recommendation=credit_state.get("recommendation"),
            approval_status=credit_state.get("approval_status"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


@app.get("/api/alerts", response_model=AlertsResponse)
def get_alerts():
    """Return all pending alerts across the entire portfolio."""
    try:
        all_alerts = []
        summary = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for deal in _portfolio.values():
            pending = get_pending_alerts(deal)
            for alert in pending:
                alert["_deal_id"] = deal.get("deal_id", "")
                alert["_company"] = deal.get("company", "Unknown")
                all_alerts.append(alert)
                sev = alert.get("severity", "LOW").lower()
                if sev in summary:
                    summary[sev] += 1

        return AlertsResponse(alerts=all_alerts, summary=AlertSummary(**summary))
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


@app.post("/api/alerts/resolve", response_model=ResolveAlertResponse)
def resolve_alert_endpoint(req: ResolveAlertRequest):
    """Resolve an alert by alert_id across the portfolio."""
    try:
        for deal in _portfolio.values():
            alerts = deal.get("human_alerts", [])
            for i, alert in enumerate(alerts):
                if alert.get("alert_id") == req.alert_id or str(i) == req.alert_id:
                    resolve_alert(deal, i, req.resolved_by)
                    _portfolio[deal["deal_id"]] = deal
                    return ResolveAlertResponse(
                        success=True,
                        alert_id=req.alert_id,
                        resolved_at=datetime.now().isoformat(),
                    )
        raise HTTPException(status_code=404, detail=f"Alert '{req.alert_id}' not found.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


# ---------------------------------------------------------------------------
# 6 Sector Intelligence Endpoints
# NOTE: Stubbed — depends on Peter's run_sector_intelligence() (not yet implemented).
# Returns valid JSON with status="not_implemented" so Abraham's frontend can build against the shape.
# ---------------------------------------------------------------------------

@app.get("/api/sector/heat-map")
def sector_heat_map():
    return {
        "status": "not_implemented",
        "sectors": [],
        "time_series": [],
        "forecast": [],
        "portfolio_overlays": [],
    }


@app.get("/api/sector/contagion/{sector_id}")
def sector_contagion(sector_id: str):
    return {
        "status": "not_implemented",
        "sector_id": sector_id,
        "event_summary": "",
        "affected_loans": [],
    }


@app.get("/api/sector/forecast")
def sector_forecast():
    return {
        "status": "not_implemented",
        "forecast_horizon_days": 30,
        "sectors": [],
    }


@app.get("/api/sector/impact-brief/{deal_id}")
def sector_impact_brief(deal_id: str):
    _get_deal(deal_id)  # validate deal exists
    return {
        "status": "not_implemented",
        "deal_id": deal_id,
        "company": _portfolio[deal_id].get("company", ""),
        "sector_tags": [],
        "sector_stress_score": None,
        "active_sector_alerts": [],
        "contagion_flags": [],
    }


@app.get("/api/portfolio/sector-map")
def portfolio_sector_map():
    return {
        "status": "not_implemented",
        "deals": [],
    }


@app.get("/api/alerts/sector")
def sector_alerts():
    return {
        "status": "not_implemented",
        "sector_alerts": [],
    }
