// BRAKE Pro — Ticker Performance Analysis Page
// Design: Dark Financial × Neo-Brutalist
// Visualize: ticker-by-ticker performance, best/worst performers

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  CheckCircle,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTrades } from "@/lib/storage";
import {
  getAllTickerStats,
  getTickerRankings,
  compareTickersForChart,
  getTickerInsights,
  type TickerStats,
} from "@/lib/tickerAnalysis";
import { cn } from "@/lib/utils";

export default function TickerAnalysis() {
  const trades = useMemo(() => getTrades(), []);
  const allStats = useMemo(() => getAllTickerStats(trades), [trades]);
  const rankings = useMemo(() => getTickerRankings(trades), [trades]);
  const chartData = useMemo(() => compareTickersForChart(trades), [trades]);
  const insights = useMemo(() => getTickerInsights(allStats), [allStats]);

  const [expandedRanking, setExpandedRanking] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"trades" | "winrate" | "rr" | "pnl">("trades");

  // Sort all stats
  const sortedStats = useMemo(() => {
    const sorted = [...allStats];
    switch (sortBy) {
      case "winrate":
        return sorted.sort((a, b) => b.winRate - a.winRate);
      case "rr":
        return sorted.sort((a, b) => b.avgRiskRewardRatio - a.avgRiskRewardRatio);
      case "pnl":
        return sorted.sort((a, b) => b.totalPnL - a.totalPnL);
      default:
        return sorted;
    }
  }, [allStats, sortBy]);

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
    }),
  };

  const getWinRateColor = (rate: number) => {
    if (rate >= 60) return "text-success";
    if (rate >= 50) return "text-warning";
    return "text-destructive";
  };

  const getRRColor = (rr: number) => {
    if (rr >= 2.0) return "text-success";
    if (rr >= 1.5) return "text-primary";
    if (rr >= 1.0) return "text-warning";
    return "text-destructive";
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return "text-success";
    if (pnl === 0) return "text-muted-foreground";
    return "text-destructive";
  };

  if (allStats.length === 0) {
    return (
      <div className="min-h-screen px-4 py-8 lg:px-8 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-muted/20 border border-muted/30 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">データなし</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            銘柄別パフォーマンスを表示するには、まずトレード記録が必要です。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold text-foreground">銘柄別パフォーマンス</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            得意・不得意な銘柄を特定し、取引戦略を最適化
          </p>
        </motion.div>

        {/* Insights */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-4">
            <Zap className="w-5 h-5 inline mr-2" />
            インサイト
          </h3>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{insight}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Win Rate vs RR Scatter */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-4">
            勝率 vs リスクリワード比
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            右上が理想的（高勝率 × 高RR）。左下は避けるべき（低勝率 × 低RR）
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
              <XAxis
                type="number"
                dataKey="winRate"
                name="勝率"
                stroke="oklch(0.55 0.015 65)"
                style={{ fontSize: "12px" }}
                domain={[0, 100]}
              />
              <YAxis
                type="number"
                dataKey="avgRR"
                name="RR比"
                stroke="oklch(0.55 0.015 65)"
                style={{ fontSize: "12px" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.21 0.006 285.885)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "oklch(0.85 0.005 65)" }}
                cursor={{ strokeDasharray: "3 3" }}
              />
              <Scatter
                name="銘柄"
                data={allStats.map((s) => ({
                  winRate: s.winRate,
                  avgRR: s.avgRiskRewardRatio,
                  ticker: s.ticker,
                  totalTrades: s.totalTrades,
                }))}
                fill="oklch(0.62 0.22 240)"
              >
                {allStats.map((stat, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={
                      stat.winRate >= 60 && stat.avgRiskRewardRatio >= 1.5
                        ? "oklch(0.65 0.18 160)"
                        : stat.winRate <= 30 && stat.avgRiskRewardRatio <= 1.0
                        ? "oklch(0.6 0.22 25)"
                        : "oklch(0.62 0.22 240)"
                    }
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </motion.div>

        {/* All Tickers Table */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={3}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-lg text-foreground">
              全銘柄パフォーマンス（{allStats.length}銘柄）
            </h3>
            <div className="flex gap-2">
              {(["trades", "winrate", "rr", "pnl"] as const).map((sort) => (
                <Button
                  key={sort}
                  variant={sortBy === sort ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy(sort)}
                  className="text-xs"
                >
                  {sort === "trades" && "取引数"}
                  {sort === "winrate" && "勝率"}
                  {sort === "rr" && "RR"}
                  {sort === "pnl" && "PnL"}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">銘柄</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">取引数</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">勝率</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">RR比</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">PnL</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">平均FOMO</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">最近の勝率</th>
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((stat, i) => (
                  <motion.tr
                    key={stat.ticker}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/20 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="font-mono font-bold text-foreground">{stat.ticker}</span>
                        <span className="text-xs text-muted-foreground">{stat.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-foreground font-mono">
                      {stat.totalTrades}
                    </td>
                    <td className={cn("text-right py-3 px-4 font-mono font-bold", getWinRateColor(stat.winRate))}>
                      {stat.winRate}%
                    </td>
                    <td className={cn("text-right py-3 px-4 font-mono font-bold", getRRColor(stat.avgRiskRewardRatio))}>
                      1:{stat.avgRiskRewardRatio}
                    </td>
                    <td className={cn("text-right py-3 px-4 font-mono font-bold", getPnLColor(stat.totalPnL))}>
                      {stat.totalPnL > 0 ? "+" : ""}{stat.totalPnL.toFixed(0)}
                    </td>
                    <td className="text-right py-3 px-4 text-foreground font-mono">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        stat.avgFomoScore >= 70 ? "bg-destructive/20 text-destructive" :
                        stat.avgFomoScore >= 50 ? "bg-warning/20 text-warning" :
                        "bg-success/20 text-success"
                      )}>
                        {stat.avgFomoScore}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {stat.recentWinRate > stat.winRate ? (
                          <TrendingUp className="w-4 h-4 text-success" />
                        ) : stat.recentWinRate < stat.winRate ? (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        ) : null}
                        <span className={cn("font-mono font-bold", getWinRateColor(stat.recentWinRate))}>
                          {stat.recentWinRate}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rankings.map((ranking, idx) => (
            <motion.div
              key={ranking.category}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={4 + idx}
              className="rounded-xl border border-border/30 bg-card/50 p-6"
            >
              <button
                onClick={() =>
                  setExpandedRanking(
                    expandedRanking === ranking.category ? null : ranking.category
                  )
                }
                className="w-full flex items-center justify-between mb-4"
              >
                <h3 className="font-display font-bold text-lg text-foreground">
                  {ranking.label}
                </h3>
                {expandedRanking === ranking.category ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {expandedRanking === ranking.category && (
                <div className="space-y-3">
                  {ranking.tickers.map((ticker, i) => (
                    <div
                      key={ticker.ticker}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border/20"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-sm font-medium text-muted-foreground w-6 text-center">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-mono font-bold text-foreground">{ticker.ticker}</p>
                          <p className="text-xs text-muted-foreground">
                            {ticker.totalTrades}取引
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {ranking.category.includes("winrate") && (
                          <p className={cn("font-mono font-bold", getWinRateColor(ticker.winRate))}>
                            {ticker.winRate}%
                          </p>
                        )}
                        {ranking.category.includes("rr") && (
                          <p className={cn("font-mono font-bold", getRRColor(ticker.avgRiskRewardRatio))}>
                            1:{ticker.avgRiskRewardRatio}
                          </p>
                        )}
                        {ranking.category.includes("pnl") && (
                          <p className={cn("font-mono font-bold", getPnLColor(ticker.totalPnL))}>
                            {ticker.totalPnL > 0 ? "+" : ""}{ticker.totalPnL.toFixed(0)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
