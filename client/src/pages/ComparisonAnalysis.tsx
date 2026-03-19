// BRAKE Pro — Comparison Analysis Page
// Design: Dark Financial × Neo-Brutalist
// Compare performance across periods, tickers, and time of day

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Zap,
  Award,
  Filter,
} from "lucide-react";
import { getTrades } from "@/lib/storage";
import {
  comparePeriods,
  compareTickers,
  compareTimeOfDay,
  getComparisonInsights,
  type TimePeriod,
  type ComparisonDimension,
} from "@/lib/comparisonAnalysis";
import { cn } from "@/lib/utils";

export default function ComparisonAnalysis() {
  const trades = useMemo(() => getTrades(), []);
  const [dimension, setDimension] = useState<ComparisonDimension>("period");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");

  const comparison = useMemo(() => {
    if (dimension === "period") {
      return comparePeriods(trades, timePeriod, 4);
    } else if (dimension === "ticker") {
      return compareTickers(trades, 5);
    } else {
      return compareTimeOfDay(trades);
    }
  }, [trades, dimension, timePeriod]);

  const insights = useMemo(() => getComparisonInsights(comparison), [comparison]);

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

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingUp className="w-4 h-4 text-success" />;
    if (trend === "declining") return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <TrendingUp className="w-4 h-4 text-muted-foreground" />;
  };

  const chartData = comparison.items.map((item) => ({
    name: item.label,
    winRate: item.winRate,
    avgRR: item.avgRiskRewardRatio,
    pnl: item.totalPnL,
    fomo: item.avgFomoScore,
  }));

  const scatterData = comparison.items.map((item) => ({
    name: item.label,
    x: item.avgRiskRewardRatio,
    y: item.winRate,
    pnl: item.totalPnL,
  }));

  if (comparison.items.length === 0) {
    return (
      <div className="min-h-screen px-4 py-8 lg:px-8 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-muted/20 border border-muted/30 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">データなし</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            比較分析を表示するには、まずトレード記録が必要です。
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
          <h1 className="font-display text-3xl font-bold text-foreground">比較分析</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            複数の期間・銘柄・時間帯を比較し、改善トレンドや弱点を視覚的に把握
          </p>
        </motion.div>

        {/* Dimension Selector */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="flex flex-wrap gap-3 mb-8"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border/30 bg-card/50">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">分析対象:</span>
          </div>

          {[
            { key: "period", label: "期間別" },
            { key: "ticker", label: "銘柄別" },
            { key: "timeOfDay", label: "時間帯別" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setDimension(item.key as ComparisonDimension)}
              className={cn(
                "px-4 py-2 rounded-lg border transition-all duration-200",
                dimension === item.key
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/30 bg-card/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}

          {dimension === "period" && (
            <>
              <div className="w-px bg-border/30" />
              {[
                { key: "week", label: "週別" },
                { key: "month", label: "月別" },
                { key: "quarter", label: "四半期別" },
                { key: "year", label: "年別" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTimePeriod(item.key as TimePeriod)}
                  className={cn(
                    "px-3 py-2 text-sm rounded-lg border transition-all duration-200",
                    timePeriod === item.key
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/30 bg-card/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </>
          )}
        </motion.div>

        {/* Insights */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
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

        {/* Best vs Worst */}
        {comparison.bestPerformer && comparison.worstPerformer && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            {/* Best */}
            <div className="rounded-xl border border-success/30 bg-success/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-6 h-6 text-success" />
                <h3 className="font-display font-bold text-lg text-success">最高パフォーマンス</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">項目</p>
                  <p className="font-display font-bold text-2xl text-foreground">
                    {comparison.bestPerformer.label}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">勝率</p>
                    <p className={cn("font-mono font-bold text-xl", getWinRateColor(comparison.bestPerformer.winRate))}>
                      {comparison.bestPerformer.winRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">RR比</p>
                    <p className={cn("font-mono font-bold text-xl", getRRColor(comparison.bestPerformer.avgRiskRewardRatio))}>
                      1:{comparison.bestPerformer.avgRiskRewardRatio}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">取引数</p>
                    <p className="font-mono font-bold text-xl text-foreground">
                      {comparison.bestPerformer.totalTrades}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">PnL</p>
                    <p className={cn(
                      "font-mono font-bold text-xl",
                      comparison.bestPerformer.totalPnL > 0 ? "text-success" : "text-destructive"
                    )}>
                      {comparison.bestPerformer.totalPnL > 0 ? "+" : ""}{comparison.bestPerformer.totalPnL.toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Worst */}
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-destructive" />
                <h3 className="font-display font-bold text-lg text-destructive">改善が必要</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">項目</p>
                  <p className="font-display font-bold text-2xl text-foreground">
                    {comparison.worstPerformer.label}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">勝率</p>
                    <p className={cn("font-mono font-bold text-xl", getWinRateColor(comparison.worstPerformer.winRate))}>
                      {comparison.worstPerformer.winRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">RR比</p>
                    <p className={cn("font-mono font-bold text-xl", getRRColor(comparison.worstPerformer.avgRiskRewardRatio))}>
                      1:{comparison.worstPerformer.avgRiskRewardRatio}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">取引数</p>
                    <p className="font-mono font-bold text-xl text-foreground">
                      {comparison.worstPerformer.totalTrades}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">PnL</p>
                    <p className={cn(
                      "font-mono font-bold text-xl",
                      comparison.worstPerformer.totalPnL > 0 ? "text-success" : "text-destructive"
                    )}>
                      {comparison.worstPerformer.totalPnL > 0 ? "+" : ""}{comparison.worstPerformer.totalPnL.toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Comparison Charts */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={4}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-6">
            勝率とRR比の比較
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
              <XAxis
                dataKey="name"
                stroke="oklch(0.55 0.015 65)"
                style={{ fontSize: "12px" }}
              />
              <YAxis
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
              />
              <Legend />
              <Bar dataKey="winRate" fill="oklch(0.62 0.22 240)" name="勝率（%）" />
              <Bar dataKey="avgRR" fill="oklch(0.65 0.18 160)" name="RR比" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Scatter Plot: Win Rate vs RR */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={5}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-6">
            RR比 vs 勝率（右上が理想的）
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
              <XAxis
                type="number"
                dataKey="x"
                name="RR比"
                stroke="oklch(0.55 0.015 65)"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="勝率（%）"
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
              <Scatter name="パフォーマンス" data={scatterData} fill="oklch(0.62 0.22 240)">
                {scatterData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pnl > 0 ? "oklch(0.64 0.25 142)" : "oklch(0.62 0.22 240)"}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </motion.div>

        {/* PnL Trend */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={6}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-6">
            PnL比較
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
              <XAxis
                dataKey="name"
                stroke="oklch(0.55 0.015 65)"
                style={{ fontSize: "12px" }}
              />
              <YAxis
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
              />
              <Bar dataKey="pnl" fill="oklch(0.64 0.25 142)" name="PnL">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pnl > 0 ? "oklch(0.64 0.25 142)" : "oklch(0.62 0.22 240)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Detailed Comparison Table */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={7}
          className="rounded-xl border border-border/30 bg-card/50 p-6"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-6">
            詳細比較
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">項目</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">取引数</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">勝率</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">RR比</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">PnL</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">平均FOMO</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">トレンド</th>
                </tr>
              </thead>
              <tbody>
                {comparison.items.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/20 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-display font-bold text-foreground">{item.label}</p>
                    </td>
                    <td className="text-right py-3 px-4 text-foreground font-mono">
                      {item.totalTrades}
                    </td>
                    <td className={cn("text-right py-3 px-4 font-mono font-bold", getWinRateColor(item.winRate))}>
                      {item.winRate}%
                    </td>
                    <td className={cn("text-right py-3 px-4 font-mono font-bold", getRRColor(item.avgRiskRewardRatio))}>
                      1:{item.avgRiskRewardRatio}
                    </td>
                    <td className="text-right py-3 px-4 text-foreground font-mono">
                      <span className={cn(
                        item.totalPnL > 0 ? "text-success" : item.totalPnL === 0 ? "text-muted-foreground" : "text-destructive"
                      )}>
                        {item.totalPnL > 0 ? "+" : ""}{item.totalPnL.toFixed(0)}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        item.avgFomoScore >= 70 ? "bg-destructive/20 text-destructive" :
                        item.avgFomoScore >= 50 ? "bg-warning/20 text-warning" :
                        "bg-success/20 text-success"
                      )}>
                        {item.avgFomoScore}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {getTrendIcon(item.trend)}
                        <span className="text-xs text-muted-foreground">
                          {item.trendPercent > 0 ? `+${item.trendPercent.toFixed(1)}%` : `${item.trendPercent.toFixed(1)}%`}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
