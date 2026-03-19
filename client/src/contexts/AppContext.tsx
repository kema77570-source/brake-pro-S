// BRAKE Pro — Global App Context
// Manages: settings, loss streak, heart rate, suspension state, notifications

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { AppSettings, LossStreak, HeartRateReading } from "@/lib/types";
import {
  getSettings,
  saveSettings,
  getLossStreak,
  getLatestHeartRate,
  isSuspended,
  getSuspendedUntil,
} from "@/lib/storage";
import { classifyHeartRate } from "@/lib/analysis";
import { useNotifications } from "@/hooks/useNotifications";

interface AppContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;

  lossStreak: LossStreak;
  refreshLossStreak: () => void;

  latestHR: HeartRateReading | null;
  refreshHR: () => void;

  suspended: boolean;
  suspendedUntil: Date | null;
  checkSuspension: () => void;

  hrWarning: boolean;
  hrLevel: "low" | "medium" | "high" | "critical";
}

const AppContext = createContext<AppContextType>({
  settings: {} as AppSettings,
  updateSettings: () => {},
  lossStreak: { currentStreak: 0, history: [] },
  refreshLossStreak: () => {},
  latestHR: null,
  refreshHR: () => {},
  suspended: false,
  suspendedUntil: null,
  checkSuspension: () => {},
  hrWarning: false,
  hrLevel: "low",
});

export const useApp = () => useContext(AppContext);

function AppProviderInner({ children, settings }: { children: ReactNode; settings: AppSettings }) {
  // Use notifications hook here so it has access to settings
  useNotifications(settings);
  return <>{children}</>;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [lossStreak, setLossStreak] = useState<LossStreak>(() => getLossStreak());
  const [latestHR, setLatestHR] = useState<HeartRateReading | null>(() => getLatestHeartRate());
  const [suspended, setSuspended] = useState(() => isSuspended());
  const [suspendedUntil, setSuspendedUntil] = useState<Date | null>(() => getSuspendedUntil());

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  }, []);

  const refreshLossStreak = useCallback(() => {
    setLossStreak(getLossStreak());
  }, []);

  const refreshHR = useCallback(() => {
    setLatestHR(getLatestHeartRate());
  }, []);

  const checkSuspension = useCallback(() => {
    setSuspended(isSuspended());
    setSuspendedUntil(getSuspendedUntil());
  }, []);

  // Poll suspension state every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkSuspension, 30_000);
    return () => clearInterval(interval);
  }, [checkSuspension]);

  // HR warning state
  const hrInfo = latestHR
    ? classifyHeartRate(latestHR.bpm, settings.hrWarningBpm, settings.hrCriticalBpm)
    : null;
  const hrWarning = settings.stressWarningEnabled && (hrInfo?.level === "high" || hrInfo?.level === "critical");
  const hrLevel = hrInfo?.level ?? "low";

  const value = {
    settings,
    updateSettings,
    lossStreak,
    refreshLossStreak,
    latestHR,
    refreshHR,
    suspended,
    suspendedUntil,
    checkSuspension,
    hrWarning,
    hrLevel,
  };

  return (
    <AppContext.Provider value={value}>
      <AppProviderInner settings={settings}>
        {children}
      </AppProviderInner>
    </AppContext.Provider>
  );
}
