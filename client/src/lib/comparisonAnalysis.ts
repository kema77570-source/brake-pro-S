// BRAKE Pro — Comparison Analysis
// Compare performance across multiple dimensions: periods, tickers, time of day

import type { TradeEntry } from "./types";
import { calculateDayOfWeekStats } from "./dayOfWeekAnalysis";
import { calculateDayOfWeekStats as getDayStats } from "./dayOfWeekAnalysis";

export type ComparisonDimension = "period" | "ticker" | "timeOfDay";
export type TimePeriod = "week" | "month" | "quarter" | "year";

export interface ComparisonItem {
  id: string;
  label: string;
  dimension: ComparisonDimension;
  
  // Performance metrics
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
  
  // Streaks
  maxWinStreak: number;
  maxLossStreak: number;
  
  // Volatility
  volatility: number;
  
  // Trend
  trend: "improving" | "declining" | "stable";
  trendPercent: number; // Change percentage
}

export interface ComparisonResult {
  items: ComparisonItem[];
  dimension: ComparisonDimension;
  bestPerformer: ComparisonItem | null;
  worstPerformer: ComparisonItem | null;
  averageMetrics: {
    avgWinRate: number;
    avgRR: number;
    avgPnL: number;
    avgFomo: number;
  };
}

// ─── Period Comparison ────────────────────────────────────────────────────

function getPeriodLabel(period: TimePeriod, index: number): string {
  const now = new Date();
  
  if (period === "week") {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - (7 * index));
    return `W${Math.ceil(weekStart.getDate() / 7)}`;
  } else if (period === "month") {
    const monthDate = new Date(now);
    monthDate.setMonth(now.getMonth() - index);
    return monthDate.toLocaleDateString("ja-JP", { month: "short", year: "2-digit" });
  } else if (period === "quarter") {
    const quarterDate = new Date(now);
    quarterDate.setMonth(now.getMonth() - (index * 3));
    const q = Math.floor(quarterDate.getMonth() / 3) + 1;
    return `Q${q}'${quarterDate.getFullYear().toString().slice(-2)}`;
  } else {
    const yearDate = new Date(now);
    yearDate.setFullYear(now.getFullYear() - index);
    return yearDate.getFullYear().toString();
  }
}

function getTradesForPeriod(trades: TradeEntry[], period: TimePeriod, index: number): TradeEntry[] {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === "week") {
    endDate = new Date(now);
    endDate.setDate(now.getDate() - now.getDay() - (7 * index));
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 7);
  } else if (period === "month") {
    endDate = new Date(now.getFullYear(), now.getMonth() - index + 1, 0);
    startDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
  } else if (period === "quarter") {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3 - (index * 3);
    endDate = new Date(now.getFullYear(), quarterMonth + 3, 0);
    startDate = new Date(now.getFullYear(), quarterMonth, 1);
  } else {
    endDate = new Date(now.getFullYear() - index, 11, 31);
    startDate = new Date(now.getFullYear() - index, 0, 1);
  }

  return trades.filter((t) => {
    if (!t.entryTime) return false;
    const date = new Date(t.entryTime);
    return date >= startDate && date <= endDate;
  });
}

function calculateItemStats(trades: TradeEntry[]): Omit<ComparisonItem, "id" | "label" | "dimension"> {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      breakevens: 0,
      winRate: 0,
      avgRiskRewardRatio: 0,
      totalPnL: 0,
      avgPnLPercent: 0,
      avgFomoScore: 0,
      avgMarketFomoScore: 0,
      avgUserFomoScore: 0,
      maxWinStreak: 0,
      maxLossStreak: 0,
      volatility: 0,
      trend: "stable",
      trendPercent: 0,
    };
  }

  const wins = trades.filter((t) => t.result === "win").length;
  const losses = trades.filter((t) => t.result === "loss").length;
  const breakevens = trades.filter((t) => t.result === "breakeven").length;
  const winRate = Math.round((wins / trades.length) * 100);

  const validRRTrades = trades.filter((t) => t.riskRewardRatio > 0);
  const avgRiskRewardRatio = validRRTrades.length > 0
    ? Math.round((validRRTrades.reduce((sum, t) => sum + t.riskRewardRatio, 0) / validRRTrades.length) * 100) / 100
    : 0;

  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalPnLPercent = trades.reduce((sum, t) => sum + (t.pnlPercent ?? 0), 0);
  const avgPnLPercent = Math.round((totalPnLPercent / trades.length) * 100) / 100;

  const avgFomoScore = Math.round(trades.reduce((sum, t) => sum + t.fomoScore, 0) / trades.length);
  const avgMarketFomoScore = Math.round(trades.reduce((sum, t) => sum + t.marketFomoScore, 0) / trades.length);
  const avgUserFomoScore = Math.round(trades.reduce((sum, t) => sum + t.userFomoScore, 0) / trades.length);

  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  const sortedTrades = [...trades].sort(
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

  // Volatility
  const tradesByWeek = new Map<number, TradeEntry[]>();
  trades.forEach((trade) => {
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

  return {
    totalTrades: trades.length,
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
    maxWinStreak,
    maxLossStreak,
    volatility,
    trend: "stable",
    trendPercent: 0,
  };
}

export function comparePeriods(trades: TradeEntry[], period: TimePeriod, count: number = 4): ComparisonResult {
  const items: ComparisonItem[] = [];

  for (let i = 0; i < count; i++) {
    const periodTrades = getTradesForPeriod(trades, period, i);
    const stats = calculateItemStats(periodTrades);
    
    items.push({
      id: `period-${i}`,
      label: getPeriodLabel(period, i),
      dimension: "period",
      ...stats,
    });
  }

  // Calculate trend for each item
  for (let i = 0; i < items.length - 1; i++) {
    const current = items[i];
    const previous = items[i + 1];
    
    const currentScore = current.winRate * 0.6 + current.avgRiskRewardRatio * 20 * 0.4;
    const previousScore = previous.winRate * 0.6 + previous.avgRiskRewardRatio * 20 * 0.4;
    const change = currentScore - previousScore;
    const changePercent = previousScore !== 0 ? (change / previousScore) * 100 : 0;
    
    if (changePercent > 5) {
      items[i].trend = "improving";
      items[i].trendPercent = changePercent;
    } else if (changePercent < -5) {
      items[i].trend = "declining";
      items[i].trendPercent = Math.abs(changePercent);
    }
  }

  return {
    items: items.reverse(),
    dimension: "period",
    bestPerformer: items.reduce((best, current) => {
      const bestScore = best.winRate * 0.6 + best.avgRiskRewardRatio * 20 * 0.4;
      const currentScore = current.winRate * 0.6 + current.avgRiskRewardRatio * 20 * 0.4;
      return currentScore > bestScore ? current : best;
    }) || null,
    worstPerformer: items.reduce((worst, current) => {
      const worstScore = worst.winRate * 0.6 + worst.avgRiskRewardRatio * 20 * 0.4;
      const currentScore = current.winRate * 0.6 + current.avgRiskRewardRatio * 20 * 0.4;
      return currentScore < worstScore ? current : worst;
    }) || null,
    averageMetrics: {
      avgWinRate: Math.round(items.reduce((sum, i) => sum + i.winRate, 0) / items.length),
      avgRR: Math.round((items.reduce((sum, i) => sum + i.avgRiskRewardRatio, 0) / items.length) * 100) / 100,
      avgPnL: Math.round(items.reduce((sum, i) => sum + i.totalPnL, 0) / items.length),
      avgFomo: Math.round(items.reduce((sum, i) => sum + i.avgFomoScore, 0) / items.length),
    },
  };
}

// ─── Ticker Comparison ────────────────────────────────────────────────────

export function compareTickers(trades: TradeEntry[], limit: number = 5): ComparisonResult {
  const tickerMap = new Map<string, TradeEntry[]>();

  trades.forEach((trade) => {
    if (!tickerMap.has(trade.ticker)) {
      tickerMap.set(trade.ticker, []);
    }
    tickerMap.get(trade.ticker)!.push(trade);
  });

  const items: ComparisonItem[] = Array.from(tickerMap.entries())
    .filter(([, tradeList]) => tradeList.length >= 2)
    .map(([ticker, tradeList]) => {
      const stats = calculateItemStats(tradeList);
      return {
        id: `ticker-${ticker}`,
        label: ticker,
        dimension: "ticker" as const,
        ...stats,
      };
    })
    .sort((a, b) => {
      const aScore = a.winRate * 0.6 + a.avgRiskRewardRatio * 20 * 0.4;
      const bScore = b.winRate * 0.6 + b.avgRiskRewardRatio * 20 * 0.4;
      return bScore - aScore;
    })
    .slice(0, limit);

  return {
    items,
    dimension: "ticker",
    bestPerformer: items[0] || null,
    worstPerformer: items[items.length - 1] || null,
    averageMetrics: {
      avgWinRate: items.length > 0 ? Math.round(items.reduce((sum, i) => sum + i.winRate, 0) / items.length) : 0,
      avgRR: items.length > 0 ? Math.round((items.reduce((sum, i) => sum + i.avgRiskRewardRatio, 0) / items.length) * 100) / 100 : 0,
      avgPnL: items.length > 0 ? Math.round(items.reduce((sum, i) => sum + i.totalPnL, 0) / items.length) : 0,
      avgFomo: items.length > 0 ? Math.round(items.reduce((sum, i) => sum + i.avgFomoScore, 0) / items.length) : 0,
    },
  };
}

// ─── Time of Day Comparison ────────────────────────────────────────────────

export function compareTimeOfDay(trades: TradeEntry[]): ComparisonResult {
  const timeSlots = [
    { id: "morning", label: "朝（6-12時）", startHour: 6, endHour: 12 },
    { id: "afternoon", label: "昼（12-18時）", startHour: 12, endHour: 18 },
    { id: "evening", label: "夜（18-24時）", startHour: 18, endHour: 24 },
    { id: "night", label: "深夜（0-6時）", startHour: 0, endHour: 6 },
  ];

  const items: ComparisonItem[] = timeSlots
    .map((slot) => {
      const slotTrades = trades.filter((t) => {
        if (!t.entryTime) return false;
        const date = new Date(t.entryTime);
        const hour = date.getHours();
        return hour >= slot.startHour && hour < slot.endHour;
      });

      const stats = calculateItemStats(slotTrades);
      return {
        id: `time-${slot.id}`,
        label: slot.label,
        dimension: "timeOfDay" as const,
        ...stats,
      };
    })
    .filter((item) => item.totalTrades > 0);

  return {
    items,
    dimension: "timeOfDay",
    bestPerformer: items.reduce((best, current) => {
      const bestScore = best.winRate * 0.6 + best.avgRiskRewardRatio * 20 * 0.4;
      const currentScore = current.winRate * 0.6 + current.avgRiskRewardRatio * 20 * 0.4;
      return currentScore > bestScore ? current : best;
    }) || null,
    worstPerformer: items.reduce((worst, current) => {
      const worstScore = worst.winRate * 0.6 + worst.avgRiskRewardRatio * 20 * 0.4;
      const currentScore = current.winRate * 0.6 + current.avgRiskRewardRatio * 20 * 0.4;
      return currentScore < worstScore ? current : worst;
    }) || null,
    averageMetrics: {
      avgWinRate: items.length > 0 ? Math.round(items.reduce((sum, i) => sum + i.winRate, 0) / items.length) : 0,
      avgRR: items.length > 0 ? Math.round((items.reduce((sum, i) => sum + i.avgRiskRewardRatio, 0) / items.length) * 100) / 100 : 0,
      avgPnL: items.length > 0 ? Math.round(items.reduce((sum, i) => sum + i.totalPnL, 0) / items.length) : 0,
      avgFomo: items.length > 0 ? Math.round(items.reduce((sum, i) => sum + i.avgFomoScore, 0) / items.length) : 0,
    },
  };
}

// ─── Insights ──────────────────────────────────────────────────────────────

export function getComparisonInsights(result: ComparisonResult): string[] {
  const insights: string[] = [];

  if (result.items.length === 0) {
    return ["比較データがありません"];
  }

  // Best performer insight
  if (result.bestPerformer && result.bestPerformer.winRate >= 60) {
    insights.push(`${result.bestPerformer.label}は最高のパフォーマンスです（勝率${result.bestPerformer.winRate}%）`);
  }

  // Worst performer insight
  if (result.worstPerformer && result.worstPerformer.winRate <= 30 && result.worstPerformer.totalTrades >= 3) {
    insights.push(`${result.worstPerformer.label}は改善が必要です（勝率${result.worstPerformer.winRate}%）`);
  }

  // Trend insight
  const improvingItems = result.items.filter((i) => i.trend === "improving");
  if (improvingItems.length > 0) {
    insights.push(`${improvingItems.length}つの項目で改善トレンドが見られます`);
  }

  const decliningItems = result.items.filter((i) => i.trend === "declining");
  if (decliningItems.length > 0) {
    insights.push(`${decliningItems.length}つの項目で低下トレンドが見られます。注意が必要です`);
  }

  // Consistency insight
  const avgVolatility = Math.round(result.items.reduce((sum, i) => sum + i.volatility, 0) / result.items.length);
  if (avgVolatility < 10) {
    insights.push(`全体的に安定した成績を保っています（平均ボラティリティ${avgVolatility}）`);
  } else if (avgVolatility > 20) {
    insights.push(`成績にばらつきが見られます。一貫性を高めることが重要です（平均ボラティリティ${avgVolatility}）`);
  }

  return insights.length > 0 ? insights : ["特に目立つパターンはありません"];
}
