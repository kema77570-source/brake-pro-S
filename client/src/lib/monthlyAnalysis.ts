// BRAKE Pro — Monthly Performance Analysis
// Analyze performance by month: win rate, RR, PnL, FOMO trends

import type { TradeEntry } from "./types";

export interface MonthlyStats {
  year: number;
  month: number;
  monthLabel: string;
  yearMonth: string; // "2026-03"
  
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
  
  // Trend
  profitability: "profitable" | "breakeven" | "unprofitable";
  trend: "improving" | "declining" | "stable";
}

export interface MonthlyComparison {
  months: MonthlyStats[];
  bestMonth: MonthlyStats | null;
  worstMonth: MonthlyStats | null;
  overallTrend: "improving" | "declining" | "stable";
}

// ─── Month Classification ───────────────────────────────────────────────────

function getMonthLabel(month: number): string {
  const labels = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月"
  ];
  return labels[month - 1] || "不明";
}

// ─── Monthly Stats Calculation ──────────────────────────────────────────────

export function calculateMonthlyStats(trades: TradeEntry[], year: number, month: number): MonthlyStats | null {
  const monthTrades = trades.filter((t) => {
    if (!t.entryTime) return false;
    const date = new Date(t.entryTime);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  if (monthTrades.length === 0) return null;

  const wins = monthTrades.filter((t) => t.result === "win").length;
  const losses = monthTrades.filter((t) => t.result === "loss").length;
  const breakevens = monthTrades.filter((t) => t.result === "breakeven").length;
  const winRate = Math.round((wins / monthTrades.length) * 100);

  // RR stats
  const validRRTrades = monthTrades.filter((t) => t.riskRewardRatio > 0);
  const avgRiskRewardRatio = validRRTrades.length > 0
    ? Math.round((validRRTrades.reduce((sum, t) => sum + t.riskRewardRatio, 0) / validRRTrades.length) * 100) / 100
    : 0;

  // PnL stats
  const totalPnL = monthTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalPnLPercent = monthTrades.reduce((sum, t) => sum + (t.pnlPercent ?? 0), 0);
  const avgPnLPercent = Math.round((totalPnLPercent / monthTrades.length) * 100) / 100;

  // FOMO stats
  const avgFomoScore = Math.round(
    monthTrades.reduce((sum, t) => sum + t.fomoScore, 0) / monthTrades.length
  );
  const avgMarketFomoScore = Math.round(
    monthTrades.reduce((sum, t) => sum + t.marketFomoScore, 0) / monthTrades.length
  );
  const avgUserFomoScore = Math.round(
    monthTrades.reduce((sum, t) => sum + t.userFomoScore, 0) / monthTrades.length
  );

  // Streaks
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  const sortedTrades = [...monthTrades].sort(
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

  // Profitability
  let profitability: "profitable" | "breakeven" | "unprofitable" = "unprofitable";
  if (totalPnL > 0) profitability = "profitable";
  else if (totalPnL === 0) profitability = "breakeven";

  return {
    year,
    month,
    monthLabel: getMonthLabel(month),
    yearMonth: `${year}-${String(month).padStart(2, "0")}`,
    totalTrades: monthTrades.length,
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
    profitability,
    trend: "stable", // Will be calculated later
  };
}

// ─── All Monthly Analysis ───────────────────────────────────────────────────

export function getAllMonthlyStats(trades: TradeEntry[]): MonthlyComparison {
  if (trades.length === 0) {
    return {
      months: [],
      bestMonth: null,
      worstMonth: null,
      overallTrend: "stable",
    };
  }

  // Get date range from trades
  const dates = trades
    .filter((t) => t.entryTime)
    .map((t) => new Date(t.entryTime!));
  
  if (dates.length === 0) {
    return {
      months: [],
      bestMonth: null,
      worstMonth: null,
      overallTrend: "stable",
    };
  }

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  // Calculate stats for each month
  const months: MonthlyStats[] = [];
  let currentDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

  while (currentDate <= maxDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const stat = calculateMonthlyStats(trades, year, month);
    
    if (stat) {
      months.push(stat);
    }

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Calculate trends
  if (months.length > 1) {
    for (let i = 0; i < months.length; i++) {
      if (i === 0) {
        months[i].trend = "stable";
      } else {
        const prevWinRate = months[i - 1].winRate;
        const currWinRate = months[i].winRate;
        
        if (currWinRate > prevWinRate + 10) {
          months[i].trend = "improving";
        } else if (currWinRate < prevWinRate - 10) {
          months[i].trend = "declining";
        } else {
          months[i].trend = "stable";
        }
      }
    }
  }

  // Find best and worst months
  const bestMonth = months.reduce((best, current) => {
    const bestScore = best.winRate * 0.6 + best.avgRiskRewardRatio * 20 * 0.4;
    const currentScore = current.winRate * 0.6 + current.avgRiskRewardRatio * 20 * 0.4;
    return currentScore > bestScore ? current : best;
  }, months[0] || null);

  const worstMonth = months.reduce((worst, current) => {
    const worstScore = worst.winRate * 0.6 + worst.avgRiskRewardRatio * 20 * 0.4;
    const currentScore = current.winRate * 0.6 + current.avgRiskRewardRatio * 20 * 0.4;
    return currentScore < worstScore ? current : worst;
  }, months[0] || null);

  // Calculate overall trend
  let overallTrend: "improving" | "declining" | "stable" = "stable";
  if (months.length >= 3) {
    const recentMonths = months.slice(-3);
    const avgRecentWinRate = recentMonths.reduce((sum, m) => sum + m.winRate, 0) / recentMonths.length;
    const earlierMonths = months.slice(0, 3);
    const avgEarlierWinRate = earlierMonths.reduce((sum, m) => sum + m.winRate, 0) / earlierMonths.length;
    
    if (avgRecentWinRate > avgEarlierWinRate + 10) {
      overallTrend = "improving";
    } else if (avgRecentWinRate < avgEarlierWinRate - 10) {
      overallTrend = "declining";
    }
  }

  return {
    months,
    bestMonth: bestMonth || null,
    worstMonth: worstMonth || null,
    overallTrend,
  };
}

// ─── Monthly Insights ───────────────────────────────────────────────────────

export function getMonthlyInsights(comparison: MonthlyComparison): string[] {
  const insights: string[] = [];

  if (comparison.months.length === 0) {
    return ["取引データがありません"];
  }

  // Best month insight
  if (comparison.bestMonth && comparison.bestMonth.winRate >= 60) {
    insights.push(`${comparison.bestMonth.yearMonth}は最高成績の月です（勝率${comparison.bestMonth.winRate}%）`);
  }

  // Worst month insight
  if (comparison.worstMonth && comparison.worstMonth.winRate <= 30 && comparison.worstMonth.totalTrades >= 5) {
    insights.push(`${comparison.worstMonth.yearMonth}は成績が振るわなかった月です（勝率${comparison.worstMonth.winRate}%）。この時期の取引パターンを分析してください`);
  }

  // Overall trend
  if (comparison.overallTrend === "improving") {
    insights.push("全体的に成績が改善しています。現在の取引ルールと心理管理が効果的です");
  } else if (comparison.overallTrend === "declining") {
    insights.push("全体的に成績が低下しています。取引ルールと心理管理を見直す必要があります");
  }

  // Consistency insight
  const consistentMonths = comparison.months.filter((m) => m.winRate >= 50 && m.totalTrades >= 5);
  if (consistentMonths.length > 0) {
    const percentage = Math.round((consistentMonths.length / comparison.months.length) * 100);
    insights.push(`${percentage}%の月で50%以上の勝率を達成しています`);
  }

  // High FOMO month
  const highFomoMonth = comparison.months.find((m) => m.avgFomoScore >= 70);
  if (highFomoMonth) {
    insights.push(`${highFomoMonth.yearMonth}は衝動買いが多かった月です（平均FOMO${highFomoMonth.avgFomoScore}）`);
  }

  // Best RR month
  const bestRRMonth = comparison.months.reduce((best, current) =>
    current.avgRiskRewardRatio > best.avgRiskRewardRatio ? current : best
  );
  if (bestRRMonth.avgRiskRewardRatio >= 2.0) {
    insights.push(`${bestRRMonth.yearMonth}はリスク管理が優秀です（平均RR${bestRRMonth.avgRiskRewardRatio}）`);
  }

  return insights.length > 0 ? insights : ["特に目立つパターンはありません"];
}

// ─── Monthly Chart Data ────────────────────────────────────────────────────

export function getMonthlyChartData(months: MonthlyStats[]): Array<{
  month: string;
  winRate: number;
  avgRR: number;
  pnl: number;
  trades: number;
}> {
  return months.map((m) => ({
    month: m.yearMonth,
    winRate: m.winRate,
    avgRR: m.avgRiskRewardRatio,
    pnl: m.totalPnL,
    trades: m.totalTrades,
  }));
}

// ─── Monthly Growth Rate ────────────────────────────────────────────────────

export function getMonthlyGrowthRate(months: MonthlyStats[]): Array<{
  month: string;
  growthRate: number;
  pnlChange: number;
}> {
  if (months.length < 2) return [];

  const result: Array<{
    month: string;
    growthRate: number;
    pnlChange: number;
  }> = [];

  for (let i = 1; i < months.length; i++) {
    const prevMonth = months[i - 1];
    const currMonth = months[i];

    const growthRate = prevMonth.winRate > 0
      ? Math.round(((currMonth.winRate - prevMonth.winRate) / prevMonth.winRate) * 100)
      : 0;

    const pnlChange = currMonth.totalPnL - prevMonth.totalPnL;

    result.push({
      month: currMonth.yearMonth,
      growthRate,
      pnlChange,
    });
  }

  return result;
}
