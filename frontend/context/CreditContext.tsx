"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import type { Deal, Alert, HeatMapData } from "@/lib/types";
import { MOCK_DEALS, MOCK_ALERTS, MOCK_HEAT_MAP } from "@/lib/mock";

interface CreditState {
  portfolio: Deal[];
  activeAlerts: Alert[];
  sectorData: HeatMapData | null;
  selectedDeal: Deal | null;
  alertSummary: { critical: number; high: number; medium: number; low: number };
  isRefreshing: boolean;
  lastRefreshed: string | null;
}

type Action =
  | { type: "SET_PORTFOLIO"; payload: Deal[] }
  | { type: "SET_ALERTS"; payload: Alert[] }
  | { type: "SET_SECTOR_DATA"; payload: HeatMapData }
  | { type: "SET_SELECTED_DEAL"; payload: Deal | null }
  | { type: "RESOLVE_ALERT"; payload: string }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_LAST_REFRESHED"; payload: string };

function reducer(state: CreditState, action: Action): CreditState {
  switch (action.type) {
    case "SET_PORTFOLIO":
      return { ...state, portfolio: action.payload };
    case "SET_ALERTS": {
      const alerts = action.payload;
      return {
        ...state,
        activeAlerts: alerts,
        alertSummary: {
          critical: alerts.filter((a) => a.severity === "CRITICAL" && !a.resolved).length,
          high:     alerts.filter((a) => a.severity === "HIGH"     && !a.resolved).length,
          medium:   alerts.filter((a) => a.severity === "MEDIUM"   && !a.resolved).length,
          low:      alerts.filter((a) => a.severity === "LOW"      && !a.resolved).length,
        },
      };
    }
    case "SET_SECTOR_DATA":
      return { ...state, sectorData: action.payload };
    case "SET_SELECTED_DEAL":
      return { ...state, selectedDeal: action.payload };
    case "RESOLVE_ALERT":
      return {
        ...state,
        activeAlerts: state.activeAlerts.map((a) =>
          a.alert_id === action.payload ? { ...a, resolved: true } : a
        ),
      };
    case "SET_REFRESHING":
      return { ...state, isRefreshing: action.payload };
    case "SET_LAST_REFRESHED":
      return { ...state, lastRefreshed: action.payload };
    default:
      return state;
  }
}

const initial: CreditState = {
  portfolio:     MOCK_DEALS,
  activeAlerts:  MOCK_ALERTS,
  sectorData:    MOCK_HEAT_MAP,
  selectedDeal:  null,
  alertSummary:  { critical: 1, high: 2, medium: 1, low: 0 },
  isRefreshing:  false,
  lastRefreshed: null,
};

const CreditContext = createContext<{
  state: CreditState;
  dispatch: React.Dispatch<Action>;
  triggerRefresh: () => Promise<void>;
} | null>(null);

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  // Fetch portfolio from API on startup
  const refreshPortfolio = useCallback(async () => {
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${BASE}/api/portfolio`);
      if (!res.ok) throw new Error("portfolio fetch failed");
      const data = await res.json();
      if (data.deals && data.deals.length > 0) {
        // Normalize API deal shape to match frontend Deal type
        const deals = data.deals.map((d: any) => ({
          deal_id:             d.deal_id,
          company:             d.company,
          sector:              d.sector,
          sponsor:             d.sponsor,
          loan_amount:         d.loan_amount,
          loan_tenor:          d.loan_tenor,
          loan_type:           d.loan_type,
          status:              (d.loan_status ?? d.status ?? "current").toLowerCase(),
          internal_rating:     d.internal_rating ?? d.current_rating ?? "B+",
          risk_score:          d.live_risk_score ?? d.risk_score ?? 50,
          sector_stress_score: d.sector_stress_score ?? 30,
          alert_count:         (d.human_alerts ?? []).length,
          disbursement_date:   d.disbursement_date,
          maturity_date:       d.maturity_date,
          ebitda:              d.ebitda_analysis?.conservative_adjusted_ebitda ?? d.credit_model?.ebitda,
          leverage:            d.credit_model?.leverage_multiple,
          covenants:           d.covenant_status ?? {},
          financial_health:    d.financial_analysis?.overall_financial_health,
          news_signals:        d.news_signals ?? [],
          early_warning_flags: d.early_warning_flags ?? [],
          human_alerts:        d.human_alerts ?? [],
          job_signals:         d.job_signals ?? null,
          consumer_signals:    d.consumer_signals ?? null,
        }));
        dispatch({ type: "SET_PORTFOLIO", payload: deals });
      }
    } catch {
      // API not available — keep using mock data
    }
  }, []);

  // Poll alerts every 60 seconds
  const refreshAlerts = useCallback(async () => {
    try {
      const { getAlerts } = await import("@/lib/api");
      const data = await getAlerts();
      dispatch({ type: "SET_ALERTS", payload: data.alerts });
    } catch {
      // API not ready yet — keep using mock data
    }
  }, []);

  // Trigger sector monitoring agents + poll until complete
  const triggerRefresh = useCallback(async () => {
    dispatch({ type: "SET_REFRESHING", payload: true });
    try {
      const { triggerRefreshAlerts, getRefreshStatus, getAlerts } = await import("@/lib/api");
      await triggerRefreshAlerts();

      // Poll every 5 seconds until refresh is done
      const poll = setInterval(async () => {
        try {
          const status = await getRefreshStatus();
          if (!status.running) {
            clearInterval(poll);
            const [alertData, { getSectorHeatMap }] = await Promise.all([
              getAlerts(),
              import("@/lib/api"),
            ]);
            dispatch({ type: "SET_ALERTS", payload: alertData.alerts });
            dispatch({ type: "SET_LAST_REFRESHED", payload: new Date().toISOString() });
            dispatch({ type: "SET_REFRESHING", payload: false });
            try {
              const heatMap = await getSectorHeatMap();
              dispatch({ type: "SET_SECTOR_DATA", payload: heatMap });
            } catch { /* heatmap non-critical */ }
          }
        } catch {
          clearInterval(poll);
          dispatch({ type: "SET_REFRESHING", payload: false });
        }
      }, 5000);

      // Safety timeout — stop polling after 3 minutes
      setTimeout(() => {
        clearInterval(poll);
        dispatch({ type: "SET_REFRESHING", payload: false });
      }, 180_000);
    } catch {
      dispatch({ type: "SET_REFRESHING", payload: false });
    }
  }, []);

  useEffect(() => {
    refreshPortfolio();
    refreshAlerts();
    // Auto-trigger sector monitoring on page load
    triggerRefresh();
    const id = setInterval(refreshAlerts, 60_000);
    return () => clearInterval(id);
  }, [refreshPortfolio, refreshAlerts, triggerRefresh]);

  return (
    <CreditContext.Provider value={{ state, dispatch, triggerRefresh }}>
      {children}
    </CreditContext.Provider>
  );
}

export function useCredit() {
  const ctx = useContext(CreditContext);
  if (!ctx) throw new Error("useCredit must be used inside CreditProvider");
  return ctx;
}
