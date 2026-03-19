// BRAKE Pro — Time of Day Performance Analysis
// Analyze performance by time of day: morning, afternoon, evening, night

import type { TradeEntry } from "./types";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface TimeOfDayStats {
  period: TimeOfDay;
  label: string;
  timeRange: string;
  
  // Trade stats
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number; // 0-100
  
  // Risk/Reward
  avgRiskRewardRatio: number;
  totalPnL: number;
  avgPnLPercent: number;
  
  // FOMO stats
  avgFomoScore: number;
  avgMarketFomoScore: number;
  avgUserFomoScore: number;
  
  // Consistency
  consistency: "excellent" | "good" | "fair" | "poor";
  volatility: number; // standard deviation of win rates
}

export interface TimeOfDayComparison {
  periods: TimeOfDayStats[];
  bestPeriod: TimeOfDayStats | null;
  worstPeriod: TimeOfDayStats | null;
  overallTrend: "morning_best" | "afternoon_best" | "evening_best" | "night_best" | "balanced" | "no_data";
}

// ─── Time Classification ────────────────────────────────────────────────────

function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  
  // Morning: 5:00 - 11:59
  if (hour >= 5 && hour < 12) return "morning";
  
  // Afternoon: 12:00 - 16:59
  if (hour >= 12 && hour < 17) return "afternoon";
  
  // Evening: 17:00 - 20:59
  if (hour >= 17 && hour < 21) return "evening";
  
  // Night: 21:00 - 4:59
  return "night";
}

function getTimeOfDayLabel(period: TimeOfDay): string {
  const labels: Record<TimeOfDay, string> = {
    morning: "朝（5:00-11:59）",
    afternoon: "昼（12:00-16:59）",
    evening: "夜（17:00-20:59）",
    night: "深夜（21:00-4:59）",
  };
  return labels[period];
}

function getTimeOfDayRange(period: TimeOfDay): string {
  const ranges: Record<TimeOfDay, string> = {
    morning: "5:00 - 11:59",
    afternoon: "12:00 - 16:59",
    evening: "17:00 - 20:59",
    night: "21:00 - 4:59",
  };
  return ranges[period];
}

// ─── Time of Day Stats Calculation ──────────────────────────────────────────

export function calculateTimeOfDayStats(trades: TradeEntry[], period: TimeOfDay): TimeOfDayStats | null {
  const periodTrades = trades.filter((t) => {
    if (!t.entryTime) return false;
    const tradeTime = new Date(t.entryTime);
    return getTimeOfDay(tradeTime) === period;
  });

  if (periodTrades.length === 0) {
    return null;
  }

  const wins = periodTrades.filter((t) => t.result === "win").length;
  const losses = periodTrades.filter((t) => t.result === "loss").length;
  const breakevens = periodTrades.filter((t) => t.result === "breakeven").length;
  const winRate = Math.round((wins / periodTrades.length) * 100);

  // RR stats
  const validRRTrades = periodTrades.filter((t) => t.riskRewardRatio > 0);
  const avgRiskRewardRatio = validRRTrades.length > 0
    ? Math.round((validRRTrades.reduce((sum, t) => sum + t.riskRewardRatio, 0) / validRRTrades.length) * 100) / 100
    : 0;

  // PnL stats
  const totalPnL = periodTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalPnLPercent = periodTrades.reduce((sum, t) => sum + (t.pnlPercent ?? 0), 0);
  const avgPnLPercent = Math.round((totalPnLPercent / periodTrades.length) * 100) / 100;

  // FOMO stats
  const avgFomoScore = Math.round(
    periodTrades.reduce((sum, t) => sum + t.fomoScore, 0) / periodTrades.length
  );
  const avgMarketFomoScore = Math.round(
    periodTrades.reduce((sum, t) => sum + t.marketFomoScore, 0) / periodTrades.length
  );
  const avgUserFomoScore = Math.round(
    periodTrades.reduce((sum, t) => sum + t.userFomoScore, 0) / periodTrades.length
  );

  // Consistency calculation
  // Split trades into weeks and calculate win rate for each week
  const tradesByWeek = new Map<number, TradeEntry[]>();
  periodTrades.forEach((trade) => {
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

  // Consistency rating
  let consistency: "excellent" | "good" | "fair" | "poor" = "poor";
  if (volatility < 10) consistency = "excellent";
  else if (volatility < 20) consistency = "good";
  else if (volatility < 35) consistency = "fair";

  return {
    period,
    label: getTimeOfDayLabel(period),
    timeRange: getTimeOfDayRange(period),
    totalTrades: periodTrades.length,
    wins,
    losses,
    breakevens,
    winRate,
    avgRiskRewardRatio,
    totalPnL,
    avgPnLPercent,
    avgFomoScore,
    avgMarketFomoScore,
    avgUserFomoScore,
    consistency,
    volatility,
  };
}

// ─── All Time of Day Analysis ───────────────────────────────────────────────

export function getAllTimeOfDayStats(trades: TradeEntry[]): TimeOfDayComparison {
  const periods: TimeOfDay[] = ["morning", "afternoon", "evening", "night"];
  const stats: TimeOfDayStats[] = [];

  periods.forEach((period) => {
    const stat = calculateTimeOfDayStats(trades, period);
    if (stat) stats.push(stat);
  });

  if (stats.length === 0) {
    return {
      periods: [],
      bestPeriod: null,
      worstPeriod: null,
      overallTrend: "no_data",
    };
  }

  // Find best and worst periods
  const bestPeriod = stats.reduce((best, current) => {
    const bestScore = best.winRate * 0.6 + best.avgRiskRewardRatio * 20 * 0.4;
    const currentScore = current.winRate * 0.6 + current.avgRiskRewardRatio * 20 * 0.4;
    return currentScore > bestScore ? current : best;
  });

  const worstPeriod = stats.reduce((worst, current) => {
    const worstScore = worst.winRate * 0.6 + worst.avgRiskRewardRatio * 20 * 0.4;
    const currentScore = current.winRate * 0.6 + current.avgRiskRewardRatio * 20 * 0.4;
    return currentScore < worstScore ? current : worst;
  });

  // Determine overall trend
  const sortedByScore = [...stats].sort((a, b) => {
    const scoreA = a.winRate * 0.6 + a.avgRiskRewardRatio * 20 * 0.4;
    const scoreB = b.winRate * 0.6 + b.avgRiskRewardRatio * 20 * 0.4;
    return scoreB - scoreA;
  });

  let overallTrend: "morning_best" | "afternoon_best" | "evening_best" | "night_best" | "balanced" | "no_data" = "balanced";
  if (sortedByScore.length > 0) {
    const topPeriod = sortedByScore[0].period;
    if (topPeriod === "morning") overallTrend = "morning_best";
    else if (topPeriod === "afternoon") overallTrend = "afternoon_best";
    else if (topPeriod === "evening") overallTrend = "evening_best";
    else if (topPeriod === "night") overallTrend = "night_best";
  }

  return {
    periods: stats,
    bestPeriod,
    worstPeriod,
    overallTrend,
  };
}

// ─── Time of Day Insights ──────────────────────────────────────────────────

export function getTimeOfDayInsights(comparison: TimeOfDayComparison): string[] {
  const insights: string[] = [];

  if (comparison.periods.length === 0) {
    return ["取引データがありません"];
  }

  // Best period insight
  if (comparison.bestPeriod) {
    if (comparison.bestPeriod.winRate >= 60) {
      insights.push(`${comparison.bestPeriod.label}は得意な時間帯です（勝率${comparison.bestPeriod.winRate}%）`);
    }
  }

  // Worst period insight
  if (comparison.worstPeriod) {
    if (comparison.worstPeriod.winRate <= 30 && comparison.worstPeriod.totalTrades >= 3) {
      insights.push(`${comparison.worstPeriod.label}は苦手な時間帯です（勝率${comparison.worstPeriod.winRate}%）。この時間帯の取引を避けるか、戦略を見直してください`);
    }
  }

  // Consistency insight
  const consistentPeriods = comparison.periods.filter((p) => p.consistency === "excellent");
  if (consistentPeriods.length > 0) {
    const periodLabels = consistentPeriods.map((p) => p.label).join("・");
    insights.push(`${periodLabels}は安定した成績を維持しています`);
  }

  // High FOMO period
  const highFomoPeriod = comparison.periods.find((p) => p.avgFomoScore >= 70);
  if (highFomoPeriod) {
    insights.push(`${highFomoPeriod.label}は衝動買いしやすい時間帯です（平均FOMO${highFomoPeriod.avgFomoScore}）。この時間帯は特に慎重な判断が必要です`);
  }

  // RR management insight
  const goodRRPeriods = comparison.periods.filter((p) => p.avgRiskRewardRatio >= 2.0);
  if (goodRRPeriods.length > 0) {
    const periodLabels = goodRRPeriods.map((p) => p.label).join("・");
    insights.push(`${periodLabels}はリスク管理が優秀です（平均RR 2.0以上）`);
  }

  // Time distribution insight
  const busyPeriods = comparison.periods.filter((p) => p.totalTrades >= 10);
  if (busyPeriods.length > 0) {
    const periodLabels = busyPeriods.map((p) => p.label).join("・");
    insights.push(`${periodLabels}で多くの取引を実行しています。この時間帯の成績改善が全体成績に大きく影響します`);
  }

  return insights.length > 0 ? insights : ["特に目立つパターンはありません"];
}

// ─── Time of Day Heatmap Data ──────────────────────────────────────────────

export function getTimeOfDayHeatmapData(trades: TradeEntry[]): Array<{
  hour: number;
  hourLabel: string;
  trades: number;
  winRate: number;
  avgRR: number;
}> {
  const hourlyStats = new Map<number, { wins: number; total: number; rrSum: number; rrCount: number }>();

  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    hourlyStats.set(i, { wins: 0, total: 0, rrSum: 0, rrCount: 0 });
  }

  // Aggregate trades by hour
  trades.forEach((trade) => {
    if (!trade.entryTime) return;
    const hour = new Date(trade.entryTime).getHours();
    const stat = hourlyStats.get(hour)!;
    stat.total++;
    if (trade.result === "win") stat.wins++;
    if (trade.riskRewardRatio > 0) {
      stat.rrSum += trade.riskRewardRatio;
      stat.rrCount++;
    }
  });

  // Convert to chart data
  const result: Array<{
    hour: number;
    hourLabel: string;
    trades: number;
    winRate: number;
    avgRR: number;
  }> = [];

  for (let i = 0; i < 24; i++) {
    const stat = hourlyStats.get(i)!;
    result.push({
      hour: i,
      hourLabel: `${String(i).padStart(2, "0")}:00`,
      trades: stat.total,
      winRate: stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : 0,
      avgRR: stat.rrCount > 0 ? Math.round((stat.rrSum / stat.rrCount) * 100) / 100 : 0,
    });
  }

  return result;
}
