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
}

type Action =
  | { type: "SET_PORTFOLIO"; payload: Deal[] }
  | { type: "SET_ALERTS"; payload: Alert[] }
  | { type: "SET_SECTOR_DATA"; payload: HeatMapData }
  | { type: "SET_SELECTED_DEAL"; payload: Deal | null }
  | { type: "RESOLVE_ALERT"; payload: string };

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
};

const CreditContext = createContext<{
  state: CreditState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

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

  useEffect(() => {
    refreshAlerts();
    const id = setInterval(refreshAlerts, 60_000);
    return () => clearInterval(id);
  }, [refreshAlerts]);

  return (
    <CreditContext.Provider value={{ state, dispatch }}>
      {children}
    </CreditContext.Provider>
  );
}

export function useCredit() {
  const ctx = useContext(CreditContext);
  if (!ctx) throw new Error("useCredit must be used inside CreditProvider");
  return ctx;
}
