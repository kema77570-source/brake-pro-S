// BRAKE Pro — Day of Week Performance Analysis
// Analyze performance by day of week: Monday through Sunday

import type { TradeEntry } from "./types";

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface DayOfWeekStats {
  day: DayOfWeek;
  dayLabel: string;
  dayNumber: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  
  // Trade stats
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number; // 0-100
  
  // Risk/Reward
  avgRiskRewardRatio: number;
  totalPnL: number;
  totalPnLPercent: number;
  avgPnLPercent: number;
  
  // FOMO stats
  avgFomoScore: number;
  avgMarketFomoScore: number;
  avgUserFomoScore: number;
  
  // Streaks
  maxWinStreak: number;
  maxLossStreak: number;
  
  // Volatility
  volatility: number; // standard deviation of win rates
  
  // Activity
  avgTradesPerDay: number;
}

export interface DayOfWeekComparison {
  days: DayOfWeekStats[];
  bestDay: DayOfWeekStats | null;
  worstDay: DayOfWeekStats | null;
  weekdayAvg: DayOfWeekStats | null;
  weekendAvg: DayOfWeekStats | null;
  pattern: "weekday_strong" | "weekend_strong" | "balanced" | "no_data";
}

// ─── Day Classification ────────────────────────────────────────────────────

function getDayLabel(dayNumber: number): string {
  const labels = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
  return labels[dayNumber] || "不明";
}

function getDayOfWeek(date: Date): DayOfWeek {
  const dayNumber = date.getDay();
  const days: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[dayNumber];
}

function getDayNumber(date: Date): number {
  return date.getDay();
}

// ─── Day of Week Stats Calculation ──────────────────────────────────────────

export function calculateDayOfWeekStats(trades: TradeEntry[], dayNumber: number): DayOfWeekStats | null {
  const dayTrades = trades.filter((t) => {
    if (!t.entryTime) return false;
    const date = new Date(t.entryTime);
    return date.getDay() === dayNumber;
  });

  if (dayTrades.length === 0) return null;

  const wins = dayTrades.filter((t) => t.result === "win").length;
  const losses = dayTrades.filter((t) => t.result === "loss").length;
  const breakevens = dayTrades.filter((t) => t.result === "breakeven").length;
  const winRate = Math.round((wins / dayTrades.length) * 100);

  // RR stats
  const validRRTrades = dayTrades.filter((t) => t.riskRewardRatio > 0);
  const avgRiskRewardRatio = validRRTrades.length > 0
    ? Math.round((validRRTrades.reduce((sum, t) => sum + t.riskRewardRatio, 0) / validRRTrades.length) * 100) / 100
    : 0;

  // PnL stats
  const totalPnL = dayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalPnLPercent = dayTrades.reduce((sum, t) => sum + (t.pnlPercent ?? 0), 0);
  const avgPnLPercent = Math.round((totalPnLPercent / dayTrades.length) * 100) / 100;

  // FOMO stats
  const avgFomoScore = Math.round(
    dayTrades.reduce((sum, t) => sum + t.fomoScore, 0) / dayTrades.length
  );
  const avgMarketFomoScore = Math.round(
    dayTrades.reduce((sum, t) => sum + t.marketFomoScore, 0) / dayTrades.length
  );
  const avgUserFomoScore = Math.round(
    dayTrades.reduce((sum, t) => sum + t.userFomoScore, 0) / dayTrades.length
  );

  // Streaks
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  const sortedTrades = [...dayTrades].sort(
    (a, b) => new Date(a.entryTime || 0).getTime() - new Date(b.entryTime || 0).getTime()
  );

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

  // Volatility calculation
  const tradesByWeek = new Map<number, TradeEntry[]>();
  dayTrades.forEach((trade) => {
    if (!trade.entryTime) return;
    const date = new Date(trade.entryTime);
    const weekNum = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
    if (!tradesByWeek.has(weekNum)) {
      tradesByWeek.set(weekNum, []);
    }
    tradesByWeek.get(weekNum)!.push(trade);
  });

  let volatility = 0;
  if (tradesByWeek.size > 1) {
    const weeklyWinRates = Array.from(tradesByWeek.values()).map((weekTrades) => {
      const weekWins = weekTrades.filter((t) => t.result === "win").length;
      return (weekWins / weekTrades.length) * 100;
    });

    const mean = weeklyWinRates.reduce((a, b) => a + b, 0) / weeklyWinRates.length;
    const variance = weeklyWinRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / weeklyWinRates.length;
    volatility = Math.round(Math.sqrt(variance) * 100) / 100;
  }

  // Average trades per day
  const uniqueDates = new Set<string>();
  dayTrades.forEach((t) => {
    if (t.entryTime) {
      const date = new Date(t.entryTime);
      uniqueDates.add(date.toISOString().split("T")[0]);
    }
  });
  const avgTradesPerDay = Math.round((dayTrades.length / uniqueDates.size) * 100) / 100;

  const days: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  return {
    day: days[dayNumber],
    dayLabel: getDayLabel(dayNumber),
    dayNumber,
    totalTrades: dayTrades.length,
    wins,
    losses,
    breakevens,
    winRate,
    avgRiskRewardRatio,
    totalPnL,
    totalPnLPercent,
    avgPnLPercent,
    avgFomoScore,
    avgMarketFomoScore,
    avgUserFomoScore,
    maxWinStreak,
    maxLossStreak,
    volatility,
    avgTradesPerDay,
  };
}

// ─── All Day of Week Analysis ──────────────────────────────────────────────

export function getAllDayOfWeekStats(trades: TradeEntry[]): DayOfWeekComparison {
  const days: DayOfWeekStats[] = [];

  for (let dayNumber = 0; dayNumber < 7; dayNumber++) {
    const stat = calculateDayOfWeekStats(trades, dayNumber);
    if (stat) {
      days.push(stat);
    }
  }

  if (days.length === 0) {
    return {
      days: [],
      bestDay: null,
      worstDay: null,
      weekdayAvg: null,
      weekendAvg: null,
      pattern: "no_data",
    };
  }

  // Find best and worst days
  const bestDay = days.reduce((best, current) => {
    const bestScore = best.winRate * 0.6 + best.avgRiskRewardRatio * 20 * 0.4;
    const currentScore = current.winRate * 0.6 + current.avgRiskRewardRatio * 20 * 0.4;
    return currentScore > bestScore ? current : best;
  });

  const worstDay = days.reduce((worst, current) => {
    const worstScore = worst.winRate * 0.6 + worst.avgRiskRewardRatio * 20 * 0.4;
    const currentScore = current.winRate * 0.6 + current.avgRiskRewardRatio * 20 * 0.4;
    return currentScore < worstScore ? current : worst;
  });

  // Calculate weekday and weekend averages
  const weekdayDays = days.filter((d) => d.dayNumber >= 1 && d.dayNumber <= 5);
  const weekendDays = days.filter((d) => d.dayNumber === 0 || d.dayNumber === 6);

  let weekdayAvg: DayOfWeekStats | null = null;
  let weekendAvg: DayOfWeekStats | null = null;

  if (weekdayDays.length > 0) {
    const totalTrades = weekdayDays.reduce((sum, d) => sum + d.totalTrades, 0);
    const totalWins = weekdayDays.reduce((sum, d) => sum + d.wins, 0);
    const avgRR = Math.round((weekdayDays.reduce((sum, d) => sum + d.avgRiskRewardRatio, 0) / weekdayDays.length) * 100) / 100;
    const totalPnL = weekdayDays.reduce((sum, d) => sum + d.totalPnL, 0);
    const avgFomo = Math.round(weekdayDays.reduce((sum, d) => sum + d.avgFomoScore, 0) / weekdayDays.length);

    weekdayAvg = {
      day: "monday",
      dayLabel: "平日平均",
      dayNumber: -1,
      totalTrades,
      wins: totalWins,
      losses: 0,
      breakevens: 0,
      winRate: Math.round((totalWins / totalTrades) * 100),
      avgRiskRewardRatio: avgRR,
      totalPnL,
      totalPnLPercent: 0,
      avgPnLPercent: 0,
      avgFomoScore: avgFomo,
      avgMarketFomoScore: 0,
      avgUserFomoScore: 0,
      maxWinStreak: 0,
      maxLossStreak: 0,
      volatility: 0,
      avgTradesPerDay: 0,
    };
  }

  if (weekendDays.length > 0) {
    const totalTrades = weekendDays.reduce((sum, d) => sum + d.totalTrades, 0);
    const totalWins = weekendDays.reduce((sum, d) => sum + d.wins, 0);
    const avgRR = Math.round((weekendDays.reduce((sum, d) => sum + d.avgRiskRewardRatio, 0) / weekendDays.length) * 100) / 100;
    const totalPnL = weekendDays.reduce((sum, d) => sum + d.totalPnL, 0);
    const avgFomo = Math.round(weekendDays.reduce((sum, d) => sum + d.avgFomoScore, 0) / weekendDays.length);

    weekendAvg = {
      day: "sunday",
      dayLabel: "週末平均",
      dayNumber: -2,
      totalTrades,
      wins: totalWins,
      losses: 0,
      breakevens: 0,
      winRate: Math.round((totalWins / totalTrades) * 100),
      avgRiskRewardRatio: avgRR,
      totalPnL,
      totalPnLPercent: 0,
      avgPnLPercent: 0,
      avgFomoScore: avgFomo,
      avgMarketFomoScore: 0,
      avgUserFomoScore: 0,
      maxWinStreak: 0,
      maxLossStreak: 0,
      volatility: 0,
      avgTradesPerDay: 0,
    };
  }

  // Determine pattern
  let pattern: "weekday_strong" | "weekend_strong" | "balanced" | "no_data" = "balanced";
  if (weekdayAvg && weekendAvg) {
    const weekdayScore = weekdayAvg.winRate * 0.6 + weekdayAvg.avgRiskRewardRatio * 20 * 0.4;
    const weekendScore = weekendAvg.winRate * 0.6 + weekendAvg.avgRiskRewardRatio * 20 * 0.4;

    if (weekdayScore > weekendScore + 10) {
      pattern = "weekday_strong";
    } else if (weekendScore > weekdayScore + 10) {
      pattern = "weekend_strong";
    }
  }

  return {
    days,
    bestDay,
    worstDay,
    weekdayAvg,
    weekendAvg,
    pattern,
  };
}

// ─── Day of Week Insights ──────────────────────────────────────────────────

export function getDayOfWeekInsights(comparison: DayOfWeekComparison): string[] {
  const insights: string[] = [];

  if (comparison.days.length === 0) {
    return ["取引データがありません"];
  }

  // Best day insight
  if (comparison.bestDay && comparison.bestDay.winRate >= 60) {
    insights.push(`${comparison.bestDay.dayLabel}は得意な曜日です（勝率${comparison.bestDay.winRate}%）`);
  }

  // Worst day insight
  if (comparison.worstDay && comparison.worstDay.winRate <= 30 && comparison.worstDay.totalTrades >= 3) {
    insights.push(`${comparison.worstDay.dayLabel}は苦手な曜日です（勝率${comparison.worstDay.winRate}%）。この曜日の取引を避けるか、戦略を見直してください`);
  }

  // Pattern insight
  if (comparison.pattern === "weekday_strong" && comparison.weekdayAvg) {
    insights.push(`平日（月～金）での成績が良好です（平均勝率${comparison.weekdayAvg.winRate}%）。週末の取引を減らすことで成績改善が期待できます`);
  } else if (comparison.pattern === "weekend_strong" && comparison.weekendAvg) {
    insights.push(`週末（土日）での成績が良好です（平均勝率${comparison.weekendAvg.winRate}%）。週末に集中して取引することを検討してください`);
  }

  // Activity insight
  const busyDays = comparison.days.filter((d) => d.totalTrades >= 5);
  if (busyDays.length > 0) {
    const dayLabels = busyDays.map((d) => d.dayLabel).join("・");
    insights.push(`${dayLabels}で多くの取引を実行しています。この曜日の成績改善が全体成績に大きく影響します`);
  }

  // High FOMO day
  const highFomoDay = comparison.days.find((d) => d.avgFomoScore >= 70);
  if (highFomoDay) {
    insights.push(`${highFomoDay.dayLabel}は衝動買いしやすい曜日です（平均FOMO${highFomoDay.avgFomoScore}）。この曜日は特に慎重な判断が必要です`);
  }

  // RR management insight
  const goodRRDays = comparison.days.filter((d) => d.avgRiskRewardRatio >= 2.0);
  if (goodRRDays.length > 0) {
    const dayLabels = goodRRDays.map((d) => d.dayLabel).join("・");
    insights.push(`${dayLabels}はリスク管理が優秀です（平均RR 2.0以上）`);
  }

  return insights.length > 0 ? insights : ["特に目立つパターンはありません"];
}

// ─── Day of Week Chart Data ────────────────────────────────────────────────

export function getDayOfWeekChartData(days: DayOfWeekStats[]): Array<{
  day: string;
  winRate: number;
  avgRR: number;
  trades: number;
}> {
  return days.map((d) => ({
    day: d.dayLabel,
    winRate: d.winRate,
    avgRR: d.avgRiskRewardRatio,
    trades: d.totalTrades,
  }));
}
