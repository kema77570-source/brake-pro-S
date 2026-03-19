// BRAKE Pro — LocalStorage Persistence Layer
import type {
  TradeEntry,
  SkipLogEntry,
  PriceAlarm,
  LossStreak,
  HeartRateReading,
  AppSettings,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { nanoid } from "nanoid";

// ─── Keys ───────────────────────────────────────────────────────────────────
const KEYS = {
  TRADES: "brake_trades",
  SKIP_LOG: "brake_skip_log",
  ALARMS: "brake_alarms",
  LOSS_STREAK: "brake_loss_streak",
  HEART_RATE: "brake_heart_rate",
  SETTINGS: "brake_settings",
} as const;

// ─── Generic helpers ─────────────────────────────────────────────────────────
function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Trades ─────────────────────────────────────────────────────────────────
export function getTrades(): TradeEntry[] {
  return getItem<TradeEntry[]>(KEYS.TRADES, []);
}
export function saveTrade(trade: TradeEntry): void {
  const trades = getTrades();
  const idx = trades.findIndex((t) => t.id === trade.id);
  if (idx >= 0) {
    trades[idx] = { ...trade, updatedAt: new Date().toISOString() };
  } else {
    trades.unshift(trade);
  }
  setItem(KEYS.TRADES, trades);
}
export function deleteTrade(id: string): void {
  setItem(KEYS.TRADES, getTrades().filter((t) => t.id !== id));
}
export function getTradeById(id: string): TradeEntry | undefined {
  return getTrades().find((t) => t.id === id);
}

// ─── Skip Log ───────────────────────────────────────────────────────────────
export function getSkipLog(): SkipLogEntry[] {
  return getItem<SkipLogEntry[]>(KEYS.SKIP_LOG, []);
}
export function addSkipEntry(entry: Omit<SkipLogEntry, "id" | "createdAt">): SkipLogEntry {
  const newEntry: SkipLogEntry = {
    ...entry,
    id: nanoid(),
    createdAt: new Date().toISOString(),
  };
  const log = getSkipLog();
  log.unshift(newEntry);
  setItem(KEYS.SKIP_LOG, log);
  return newEntry;
}
export function updateSkipEntry(id: string, updates: Partial<SkipLogEntry>): void {
  const log = getSkipLog();
  const idx = log.findIndex((e) => e.id === id);
  if (idx >= 0) {
    log[idx] = { ...log[idx], ...updates };
    setItem(KEYS.SKIP_LOG, log);
  }
}
export function deleteSkipEntry(id: string): void {
  setItem(KEYS.SKIP_LOG, getSkipLog().filter((e) => e.id !== id));
}

// ─── Price Alarms ───────────────────────────────────────────────────────────
export function getAlarms(): PriceAlarm[] {
  return getItem<PriceAlarm[]>(KEYS.ALARMS, []);
}
export function saveAlarm(alarm: PriceAlarm): void {
  const alarms = getAlarms();
  const idx = alarms.findIndex((a) => a.id === alarm.id);
  if (idx >= 0) {
    alarms[idx] = alarm;
  } else {
    alarms.unshift(alarm);
  }
  setItem(KEYS.ALARMS, alarms);
}
export function deleteAlarm(id: string): void {
  setItem(KEYS.ALARMS, getAlarms().filter((a) => a.id !== id));
}
export function triggerAlarm(id: string): void {
  const alarms = getAlarms();
  const idx = alarms.findIndex((a) => a.id === id);
  if (idx >= 0) {
    alarms[idx] = {
      ...alarms[idx],
      status: "triggered",
      triggeredAt: new Date().toISOString(),
      notified: true,
    };
    setItem(KEYS.ALARMS, alarms);
  }
}

// ─── Loss Streak ────────────────────────────────────────────────────────────
export function getLossStreak(): LossStreak {
  return getItem<LossStreak>(KEYS.LOSS_STREAK, {
    currentStreak: 0,
    history: [],
  });
}
export function saveLossStreak(streak: LossStreak): void {
  setItem(KEYS.LOSS_STREAK, streak);
}
export function recordTradeResult(result: "win" | "loss", settings: AppSettings): LossStreak {
  const streak = getLossStreak();
  const now = new Date().toISOString();

  if (result === "loss") {
    streak.currentStreak += 1;
    streak.lastLossAt = now;

    streak.history.unshift({
      id: nanoid(),
      timestamp: now,
      streakCount: streak.currentStreak,
      action: "loss",
    });

    // Check suspension thresholds
    if (streak.currentStreak >= settings.streakSuspend2Count) {
      const suspendUntil = new Date(
        Date.now() + settings.streakSuspend2Minutes * 60 * 1000
      ).toISOString();
      streak.suspendedUntil = suspendUntil;
      streak.suspendReason = `${settings.streakSuspend2Count}連敗により${Math.round(settings.streakSuspend2Minutes / 60)}時間停止`;
      streak.history.unshift({
        id: nanoid(),
        timestamp: now,
        streakCount: streak.currentStreak,
        action: "suspended",
        suspendMinutes: settings.streakSuspend2Minutes,
      });
    } else if (streak.currentStreak >= settings.streakSuspend1Count) {
      const suspendUntil = new Date(
        Date.now() + settings.streakSuspend1Minutes * 60 * 1000
      ).toISOString();
      streak.suspendedUntil = suspendUntil;
      streak.suspendReason = `${settings.streakSuspend1Count}連敗により${settings.streakSuspend1Minutes}分停止`;
      streak.history.unshift({
        id: nanoid(),
        timestamp: now,
        streakCount: streak.currentStreak,
        action: "suspended",
        suspendMinutes: settings.streakSuspend1Minutes,
      });
    }
  } else {
    // Win resets streak
    streak.history.unshift({
      id: nanoid(),
      timestamp: now,
      streakCount: streak.currentStreak,
      action: "win",
    });
    streak.currentStreak = 0;
    streak.suspendedUntil = undefined;
    streak.suspendReason = undefined;
  }

  saveLossStreak(streak);
  return streak;
}
export function isSuspended(): boolean {
  const streak = getLossStreak();
  if (!streak.suspendedUntil) return false;
  return new Date(streak.suspendedUntil) > new Date();
}
export function getSuspendedUntil(): Date | null {
  const streak = getLossStreak();
  if (!streak.suspendedUntil) return null;
  const d = new Date(streak.suspendedUntil);
  return d > new Date() ? d : null;
}

// ─── Heart Rate ─────────────────────────────────────────────────────────────
export function getHeartRateHistory(): HeartRateReading[] {
  return getItem<HeartRateReading[]>(KEYS.HEART_RATE, []);
}
export function addHeartRateReading(reading: Omit<HeartRateReading, "id" | "timestamp">): HeartRateReading {
  const newReading: HeartRateReading = {
    ...reading,
    id: nanoid(),
    timestamp: new Date().toISOString(),
  };
  const history = getHeartRateHistory();
  history.unshift(newReading);
  // Keep last 100 readings
  setItem(KEYS.HEART_RATE, history.slice(0, 100));
  return newReading;
}
export function getLatestHeartRate(): HeartRateReading | null {
  const history = getHeartRateHistory();
  return history[0] ?? null;
}

// ─── Settings ───────────────────────────────────────────────────────────────
export function getSettings(): AppSettings {
  const stored = getItem<Partial<AppSettings>>(KEYS.SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}
export function saveSettings(settings: AppSettings): void {
  setItem(KEYS.SETTINGS, settings);
}
export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...updates };
  saveSettings(updated);
  return updated;
}
