// BRAKE Pro — Ticker Performance Analysis
// Analyze performance by ticker: win rate, avg RR, FOMO, PnL

import type { TradeEntry } from "./types";

export interface TickerStats {
  ticker: string;
  name: string;
  
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
  recentWinRate: number; // last 5 trades
  profitability: "profitable" | "breakeven" | "unprofitable";
}

export interface TickerRanking {
  category: "best_winrate" | "best_rr" | "best_pnl" | "worst_winrate" | "worst_rr" | "worst_pnl";
  label: string;
  tickers: TickerStats[];
}

// ─── Ticker Stats Calculation ────────────────────────────────────────────────

export function calculateTickerStats(trades: TradeEntry[], ticker: string): TickerStats | null {
  const tickerTrades = trades.filter((t) => t.ticker.toUpperCase() === ticker.toUpperCase());
  
  if (tickerTrades.length === 0) return null;

  const wins = tickerTrades.filter((t) => t.result === "win").length;
  const losses = tickerTrades.filter((t) => t.result === "loss").length;
  const breakevens = tickerTrades.filter((t) => t.result === "breakeven").length;
  const winRate = Math.round((wins / tickerTrades.length) * 100);

  // RR stats
  const validRRTrades = tickerTrades.filter((t) => t.riskRewardRatio > 0);
  const avgRiskRewardRatio = validRRTrades.length > 0
    ? Math.round((validRRTrades.reduce((sum, t) => sum + t.riskRewardRatio, 0) / validRRTrades.length) * 100) / 100
    : 0;

  // PnL stats
  const totalPnL = tickerTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalPnLPercent = tickerTrades.reduce((sum, t) => sum + (t.pnlPercent ?? 0), 0);
  const avgPnLPercent = Math.round((totalPnLPercent / tickerTrades.length) * 100) / 100;

  // FOMO stats
  const avgFomoScore = Math.round(
    tickerTrades.reduce((sum, t) => sum + t.fomoScore, 0) / tickerTrades.length
  );
  const avgMarketFomoScore = Math.round(
    tickerTrades.reduce((sum, t) => sum + t.marketFomoScore, 0) / tickerTrades.length
  );
  const avgUserFomoScore = Math.round(
    tickerTrades.reduce((sum, t) => sum + t.userFomoScore, 0) / tickerTrades.length
  );

  // Streaks
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  const sortedTrades = [...tickerTrades].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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

  // Recent win rate (last 5 trades)
  const recentTrades = sortedTrades.slice(-5);
  const recentWins = recentTrades.filter((t) => t.result === "win").length;
  const recentWinRate = recentTrades.length > 0 ? Math.round((recentWins / recentTrades.length) * 100) : 0;

  // Profitability
  let profitability: "profitable" | "breakeven" | "unprofitable" = "unprofitable";
  if (totalPnL > 0) profitability = "profitable";
  else if (totalPnL === 0) profitability = "breakeven";

  return {
    ticker: ticker.toUpperCase(),
    name: tickerTrades[0]?.name || ticker,
    totalTrades: tickerTrades.length,
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
    recentWinRate,
    profitability,
  };
}

// ─── All Tickers Analysis ───────────────────────────────────────────────────

export function getAllTickerStats(trades: TradeEntry[]): TickerStats[] {
  const tickers = new Set(trades.map((t) => t.ticker.toUpperCase()));
  const stats: TickerStats[] = [];

  Array.from(tickers).forEach((ticker) => {
    const stat = calculateTickerStats(trades, ticker);
    if (stat) stats.push(stat);
  })

  // Sort by total trades (descending)
  return stats.sort((a, b) => b.totalTrades - a.totalTrades);
}

// ─── Rankings ───────────────────────────────────────────────────────────────

export function getTickerRankings(trades: TradeEntry[]): TickerRanking[] {
  const allStats = getAllTickerStats(trades);
  
  if (allStats.length === 0) return [];

  // Sort by different criteria
  const byWinRate = [...allStats].sort((a, b) => b.winRate - a.winRate);
  const byRR = [...allStats].sort((a, b) => b.avgRiskRewardRatio - a.avgRiskRewardRatio);
  const byPnL = [...allStats].sort((a, b) => b.totalPnL - a.totalPnL);

  return [
    { category: "best_winrate", label: "勝率が高い", tickers: byWinRate.slice(0, 5) },
    { category: "worst_winrate", label: "勝率が低い", tickers: byWinRate.slice(-5).reverse() },
    { category: "best_rr", label: "RR比が高い", tickers: byRR.slice(0, 5) },
    { category: "worst_rr", label: "RR比が低い", tickers: byRR.slice(-5).reverse() },
    { category: "best_pnl", label: "利益が大きい", tickers: byPnL.slice(0, 5) },
    { category: "worst_pnl", label: "損失が大きい", tickers: byPnL.slice(-5).reverse() },
  ];
}

// ─── Ticker Comparison ──────────────────────────────────────────────────────

export function compareTickersForChart(trades: TradeEntry[]): Array<{
  ticker: string;
  winRate: number;
  avgRR: number;
  totalTrades: number;
  pnl: number;
  profitability: string;
}> {
  const allStats = getAllTickerStats(trades);
  
  return allStats.map((stat) => ({
    ticker: stat.ticker,
    winRate: stat.winRate,
    avgRR: stat.avgRiskRewardRatio,
    totalTrades: stat.totalTrades,
    pnl: stat.totalPnL,
    profitability: stat.profitability,
  }));
}

// ─── Ticker Insights ────────────────────────────────────────────────────────

export function getTickerInsights(stats: TickerStats[]): string[] {
  const insights: string[] = [];

  if (stats.length === 0) return ["取引データがありません"];

  // Best performer
  const best = stats[0];
  if (best.winRate >= 60) {
    insights.push(`${best.ticker}は得意な銘柄です（勝率${best.winRate}%）`);
  }

  // Worst performer
  const worst = stats[stats.length - 1];
  if (worst.winRate <= 30 && worst.totalTrades >= 3) {
    insights.push(`${worst.ticker}は苦手な銘柄です（勝率${worst.winRate}%）。取引を避けるか、戦略を見直してください`);
  }

  // High FOMO ticker
  const highFomo = stats.find((s) => s.avgFomoScore >= 70);
  if (highFomo) {
    insights.push(`${highFomo.ticker}は衝動買いしやすい銘柄です（平均FOMO${highFomo.avgFomoScore}）`);
  }

  // Best RR
  const bestRR = [...stats].sort((a, b) => b.avgRiskRewardRatio - a.avgRiskRewardRatio)[0];
  if (bestRR.avgRiskRewardRatio >= 2.0) {
    insights.push(`${bestRR.ticker}はリスク管理が優秀です（平均RR${bestRR.avgRiskRewardRatio}）`);
  }

  // Recent improvement
  const improved = stats.find((s) => s.recentWinRate > s.winRate + 20);
  if (improved) {
    insights.push(`${improved.ticker}は最近調子が良いです（最近の勝率${improved.recentWinRate}%）`);
  }

  return insights.length > 0 ? insights : ["特に目立つパターンはありません"];
}
