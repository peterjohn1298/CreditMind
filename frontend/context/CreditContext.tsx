"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import type { Deal, Alert, HeatMapData } from "@/lib/types";

interface CreditState {
  portfolio: Deal[];
  activeAlerts: Alert[];
  sectorData: HeatMapData | null;
  selectedDeal: Deal | null;
  alertSummary: { critical: number; high: number; medium: number; low: number };
  isRefreshing: boolean;
  lastRefreshed: string | null;
  isLoading: boolean;
}

type Action =
  | { type: "SET_PORTFOLIO"; payload: Deal[] }
  | { type: "SET_ALERTS"; payload: Alert[] }
  | { type: "SET_SECTOR_DATA"; payload: HeatMapData }
  | { type: "SET_SELECTED_DEAL"; payload: Deal | null }
  | { type: "RESOLVE_ALERT"; payload: string }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_LAST_REFRESHED"; payload: string }
  | { type: "SET_LOADING"; payload: boolean };

function reducer(state: CreditState, action: Action): CreditState {
  switch (action.type) {
    case "SET_PORTFOLIO":
      return { ...state, portfolio: action.payload, isLoading: false };
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
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// Empty initial state — all data comes from the live API, never from mock files
const initial: CreditState = {
  portfolio:     [],
  activeAlerts:  [],
  sectorData:    null,
  selectedDeal:  null,
  alertSummary:  { critical: 0, high: 0, medium: 0, low: 0 },
  isRefreshing:  false,
  lastRefreshed: null,
  isLoading:     true,
};

const CreditContext = createContext<{
  state: CreditState;
  dispatch: React.Dispatch<Action>;
  triggerRefresh: () => Promise<void>;
} | null>(null);

// How stale the last monitoring run can be before we auto-trigger a new one on load
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  // Fetch live portfolio from API
  const refreshPortfolio = useCallback(async () => {
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${BASE}/api/portfolio`);
      if (!res.ok) throw new Error("portfolio fetch failed");
      const data = await res.json();
      const deals: Deal[] = (data.deals ?? []).map((d: any) => ({
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
    } catch {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  // Fetch live alerts from API
  const refreshAlerts = useCallback(async () => {
    try {
      const { getAlerts } = await import("@/lib/api");
      const data = await getAlerts();
      dispatch({ type: "SET_ALERTS", payload: data.alerts });
    } catch {
      // API not reachable — leave alerts empty, don't show mock data
    }
  }, []);

  // Fetch live sector heatmap
  const refreshSectorData = useCallback(async () => {
    try {
      const { getSectorHeatMap } = await import("@/lib/api");
      const heatMap = await getSectorHeatMap();
      dispatch({ type: "SET_SECTOR_DATA", payload: heatMap });
    } catch {
      // Non-critical — heatmap stays null until monitoring has run
    }
  }, []);

  // Full monitoring refresh — triggers sector agents and polls until complete
  const triggerRefresh = useCallback(async () => {
    dispatch({ type: "SET_REFRESHING", payload: true });
    try {
      const { triggerRefreshAlerts, getRefreshStatus } = await import("@/lib/api");
      await triggerRefreshAlerts();

      const poll = setInterval(async () => {
        try {
          const status = await getRefreshStatus();
          if (!status.running) {
            clearInterval(poll);
            await Promise.all([refreshAlerts(), refreshSectorData(), refreshPortfolio()]);
            dispatch({ type: "SET_LAST_REFRESHED", payload: new Date().toISOString() });
            dispatch({ type: "SET_REFRESHING", payload: false });
          }
        } catch {
          clearInterval(poll);
          dispatch({ type: "SET_REFRESHING", payload: false });
        }
      }, 5000);

      // Safety cap — stop polling after 3 minutes
      setTimeout(() => {
        clearInterval(poll);
        dispatch({ type: "SET_REFRESHING", payload: false });
      }, 180_000);
    } catch {
      dispatch({ type: "SET_REFRESHING", payload: false });
    }
  }, [refreshAlerts, refreshSectorData, refreshPortfolio]);

  useEffect(() => {
    // Always load portfolio and alerts immediately from API
    refreshPortfolio();
    refreshAlerts();
    refreshSectorData();

    // Only trigger full monitoring run if last run is stale or has never happened
    (async () => {
      try {
        const { getRefreshStatus } = await import("@/lib/api");
        const status = await getRefreshStatus();
        const lastRun = status.last_run ? new Date(status.last_run).getTime() : 0;
        const isStale = Date.now() - lastRun > STALE_THRESHOLD_MS;
        if (isStale && !status.running) {
          triggerRefresh();
        } else if (status.last_run) {
          dispatch({ type: "SET_LAST_REFRESHED", payload: status.last_run });
        }
      } catch {
        // Can't reach API — don't trigger monitoring
      }
    })();

    // Poll alerts every 60 seconds to stay fresh
    const id = setInterval(refreshAlerts, 60_000);
    return () => clearInterval(id);
  }, [refreshPortfolio, refreshAlerts, refreshSectorData, triggerRefresh]);

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
