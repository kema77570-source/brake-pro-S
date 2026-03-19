// BRAKE Pro — Weekly Report Analysis
// Calculates: win rate, avg RR, FOMO trends, skip accuracy

import type { TradeEntry, SkipLogEntry } from "./types";

export interface WeeklyStats {
  week: string; // "2026-03-10 ~ 2026-03-16"
  startDate: Date;
  endDate: Date;
  
  // Trade stats
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number; // 0-100
  avgRiskRewardRatio: number;
  totalPnL: number;
  totalPnLPercent: number;
  
  // FOMO stats
  avgFomoScore: number;
  avgMarketFomoScore: number;
  avgUserFomoScore: number;
  highFomoTrades: number; // trades with FOMO >= 70
  
  // Skip stats
  totalSkips: number;
  goodSkips: number;
  missedOpportunities: number;
  skipAccuracy: number; // 0-100
  
  // Streak info
  maxWinStreak: number;
  maxLossStreak: number;
}

export interface MonthlyTrend {
  month: string; // "2026-03"
  weeks: WeeklyStats[];
  avgWinRate: number;
  avgRR: number;
  totalPnL: number;
  trend: "improving" | "declining" | "stable";
}

// ─── Week Detection ──────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday = 1
  return new Date(d.setDate(diff));
}

function getWeekEnd(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return end;
}

function formatWeekLabel(weekStart: Date, weekEnd: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" });
  return `${fmt(weekStart)} ~ ${fmt(weekEnd)}`;
}

function isSameWeek(date1: Date, date2: Date): boolean {
  const start1 = getWeekStart(date1);
  const start2 = getWeekStart(date2);
  return start1.getTime() === start2.getTime();
}

// ─── Trade Analysis ──────────────────────────────────────────────────────────

export function calculateWeeklyStats(
  trades: TradeEntry[],
  skips: SkipLogEntry[],
  weekStart: Date
): WeeklyStats {
  const weekEnd = getWeekEnd(weekStart);
  
  // Filter trades for this week (by createdAt)
  const weekTrades = trades.filter((t) => {
    const tradeDate = new Date(t.createdAt);
    return tradeDate >= weekStart && tradeDate <= weekEnd;
  });

  // Filter skips for this week
  const weekSkips = skips.filter((s) => {
    const skipDate = new Date(s.createdAt);
    return skipDate >= weekStart && skipDate <= weekEnd;
  });

  // Trade results
  const wins = weekTrades.filter((t) => t.result === "win").length;
  const losses = weekTrades.filter((t) => t.result === "loss").length;
  const breakevens = weekTrades.filter((t) => t.result === "breakeven").length;
  const totalTrades = weekTrades.length;
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

  // Risk/Reward average
  const validRRTrades = weekTrades.filter((t) => t.riskRewardRatio > 0);
  const avgRiskRewardRatio = validRRTrades.length > 0
    ? Math.round((validRRTrades.reduce((sum, t) => sum + t.riskRewardRatio, 0) / validRRTrades.length) * 100) / 100
    : 0;

  // PnL
  const totalPnL = weekTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalPnLPercent = weekTrades.length > 0
    ? Math.round((weekTrades.reduce((sum, t) => sum + (t.pnlPercent ?? 0), 0) / weekTrades.length) * 100) / 100
    : 0;

  // FOMO stats
  const avgFomoScore = weekTrades.length > 0
    ? Math.round(weekTrades.reduce((sum, t) => sum + t.fomoScore, 0) / weekTrades.length)
    : 0;
  const avgMarketFomoScore = weekTrades.length > 0
    ? Math.round(weekTrades.reduce((sum, t) => sum + t.marketFomoScore, 0) / weekTrades.length)
    : 0;
  const avgUserFomoScore = weekTrades.length > 0
    ? Math.round(weekTrades.reduce((sum, t) => sum + t.userFomoScore, 0) / weekTrades.length)
    : 0;
  const highFomoTrades = weekTrades.filter((t) => t.fomoScore >= 70).length;

  // Skip stats
  const goodSkips = weekSkips.filter((s) => s.verdict === "good_skip").length;
  const missedOpportunities = weekSkips.filter((s) => s.verdict === "missed_opportunity").length;
  const skipAccuracy = weekSkips.length > 0
    ? Math.round((goodSkips / weekSkips.length) * 100)
    : 0;

  // Streaks
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  const sortedTrades = [...weekTrades].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const trade of sortedTrades) {
    if (trade.result === "win") {
      currentWinStreak++;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      currentLossStreak = 0;
    } else if (trade.result === "loss") {
      currentLossStreak++;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      currentWinStreak = 0;
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  }

  return {
    week: formatWeekLabel(weekStart, weekEnd),
    startDate: weekStart,
    endDate: weekEnd,
    totalTrades,
    wins,
    losses,
    breakevens,
    winRate,
    avgRiskRewardRatio,
    totalPnL,
    totalPnLPercent,
    avgFomoScore,
    avgMarketFomoScore,
    avgUserFomoScore,
    highFomoTrades,
    totalSkips: weekSkips.length,
    goodSkips,
    missedOpportunities,
    skipAccuracy,
    maxWinStreak,
    maxLossStreak,
  };
}

// ─── Multi-Week Analysis ─────────────────────────────────────────────────────

export function getWeeksInRange(startDate: Date, endDate: Date): Date[] {
  const weeks: Date[] = [];
  let current = getWeekStart(startDate);
  const end = getWeekEnd(endDate);

  while (current <= end) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

export function calculateMonthlyTrend(
  trades: TradeEntry[],
  skips: SkipLogEntry[],
  monthStr: string // "2026-03"
): MonthlyTrend {
  const [year, month] = monthStr.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const weeks = getWeeksInRange(startDate, endDate);
  const weeklyStats = weeks.map((w) => calculateWeeklyStats(trades, skips, w));

  const avgWinRate = weeklyStats.length > 0
    ? Math.round(weeklyStats.reduce((sum, w) => sum + w.winRate, 0) / weeklyStats.length)
    : 0;

  const avgRR = weeklyStats.length > 0
    ? Math.round((weeklyStats.reduce((sum, w) => sum + w.avgRiskRewardRatio, 0) / weeklyStats.length) * 100) / 100
    : 0;

  const totalPnL = weeklyStats.reduce((sum, w) => sum + w.totalPnL, 0);

  // Trend detection
  let trend: "improving" | "declining" | "stable" = "stable";
  if (weeklyStats.length >= 2) {
    const recent = weeklyStats.slice(-2);
    const avgRecent = recent.reduce((sum, w) => sum + w.winRate, 0) / recent.length;
    const avgPrev = weeklyStats.slice(0, -2).length > 0
      ? weeklyStats.slice(0, -2).reduce((sum, w) => sum + w.winRate, 0) / weeklyStats.slice(0, -2).length
      : avgRecent;

    if (avgRecent > avgPrev + 5) trend = "improving";
    else if (avgRecent < avgPrev - 5) trend = "declining";
  }

  return {
    month: monthStr,
    weeks: weeklyStats,
    avgWinRate,
    avgRR,
    totalPnL,
    trend,
  };
}

// ─── Current Week ────────────────────────────────────────────────────────────

export function getCurrentWeekStats(trades: TradeEntry[], skips: SkipLogEntry[]): WeeklyStats {
  const today = new Date();
  const weekStart = getWeekStart(today);
  return calculateWeeklyStats(trades, skips, weekStart);
}

// ─── Last N Weeks ────────────────────────────────────────────────────────────

export function getLastNWeeks(
  trades: TradeEntry[],
  skips: SkipLogEntry[],
  n: number
): WeeklyStats[] {
  const weeks: WeeklyStats[] = [];
  const today = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const adjustedStart = getWeekStart(weekStart);
    weeks.push(calculateWeeklyStats(trades, skips, adjustedStart));
  }

  return weeks;
}
