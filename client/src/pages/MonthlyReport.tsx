// BRAKE Pro — Monthly Performance Report Page
// Design: Dark Financial × Neo-Brutalist
// Visualize: performance by month with comparisons

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
  ComposedChart,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Zap,
  Calendar,
  Award,
} from "lucide-react";
import { getTrades } from "@/lib/storage";
import {
  getAllMonthlyStats,
  getMonthlyInsights,
  getMonthlyChartData,
  getMonthlyGrowthRate,
} from "@/lib/monthlyAnalysis";
import { cn } from "@/lib/utils";

export default function MonthlyReport() {
  const trades = useMemo(() => getTrades(), []);
  const comparison = useMemo(() => getAllMonthlyStats(trades), [trades]);
  const chartData = useMemo(() => getMonthlyChartData(comparison.months), [comparison.months]);
  const growthData = useMemo(() => getMonthlyGrowthRate(comparison.months), [comparison.months]);
  const insights = useMemo(() => getMonthlyInsights(comparison), [comparison]);

  const [selectedMetric, setSelectedMetric] = useState<"winRate" | "avgRR" | "pnl">("winRate");

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
    }),
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingUp className="w-4 h-4 text-success" />;
    if (trend === "declining") return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <TrendingUp className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case "improving":
        return "改善中";
      case "declining":
        return "低下中";
      default:
        return "安定";
    }
  };

  const getProfitabilityColor = (profitability: string) => {
    switch (profitability) {
      case "profitable":
        return "bg-success/20 text-success border-success/30";
      case "breakeven":
        return "bg-warning/20 text-warning border-warning/30";
      default:
        return "bg-destructive/20 text-destructive border-destructive/30";
    }
  };

  const getProfitabilityLabel = (profitability: string) => {
    switch (profitability) {
      case "profitable":
        return "黒字";
      case "breakeven":
        return "損益分岐";
      default:
        return "赤字";
    }
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

  if (comparison.months.length === 0) {
    return (
      <div className="min-h-screen px-4 py-8 lg:px-8 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-muted/20 border border-muted/30 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">データなし</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            月次レポートを表示するには、まずトレード記録が必要です。
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
          <h1 className="font-display text-3xl font-bold text-foreground">月次レポート</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            月ごとのパフォーマンスを比較し、改善トレンドを追跡
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

        {/* Overall Trend */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-4">
            <Calendar className="w-5 h-5 inline mr-2" />
            全体トレンド
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">全体成績の推移</p>
              <div className="flex items-center gap-3">
                {getTrendIcon(comparison.overallTrend)}
                <p className="font-display font-bold text-2xl text-foreground">
                  {getTrendLabel(comparison.overallTrend)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-2">対象期間</p>
              <p className="font-mono text-lg text-foreground">
                {comparison.months.length}ヶ月
              </p>
            </div>
          </div>
        </motion.div>

        {/* Best vs Worst Month */}
        {comparison.bestMonth && comparison.worstMonth && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            {/* Best Month */}
            <div className="rounded-xl border border-success/30 bg-success/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-6 h-6 text-success" />
                <h3 className="font-display font-bold text-lg text-success">最高成績の月</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">月</p>
                  <p className="font-display font-bold text-2xl text-foreground">
                    {comparison.bestMonth.yearMonth}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">勝率</p>
                    <p className={cn("font-mono font-bold text-xl", getWinRateColor(comparison.bestMonth.winRate))}>
                      {comparison.bestMonth.winRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">RR比</p>
                    <p className={cn("font-mono font-bold text-xl", getRRColor(comparison.bestMonth.avgRiskRewardRatio))}>
                      1:{comparison.bestMonth.avgRiskRewardRatio}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">PnL</p>
                    <p className={cn(
                      "font-mono font-bold text-xl",
                      comparison.bestMonth.totalPnL > 0 ? "text-success" : "text-destructive"
                    )}>
                      {comparison.bestMonth.totalPnL > 0 ? "+" : ""}{comparison.bestMonth.totalPnL.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">取引数</p>
                    <p className="font-mono font-bold text-xl text-foreground">
                      {comparison.bestMonth.totalTrades}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Worst Month */}
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-destructive" />
                <h3 className="font-display font-bold text-lg text-destructive">課題のあった月</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">月</p>
                  <p className="font-display font-bold text-2xl text-foreground">
                    {comparison.worstMonth.yearMonth}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">勝率</p>
                    <p className={cn("font-mono font-bold text-xl", getWinRateColor(comparison.worstMonth.winRate))}>
                      {comparison.worstMonth.winRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">RR比</p>
                    <p className={cn("font-mono font-bold text-xl", getRRColor(comparison.worstMonth.avgRiskRewardRatio))}>
                      1:{comparison.worstMonth.avgRiskRewardRatio}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">PnL</p>
                    <p className={cn(
                      "font-mono font-bold text-xl",
                      comparison.worstMonth.totalPnL > 0 ? "text-success" : "text-destructive"
                    )}>
                      {comparison.worstMonth.totalPnL > 0 ? "+" : ""}{comparison.worstMonth.totalPnL.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">取引数</p>
                    <p className="font-mono font-bold text-xl text-foreground">
                      {comparison.worstMonth.totalTrades}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Metric Selector */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={4}
          className="flex gap-2 mb-8"
        >
          {[
            { key: "winRate", label: "勝率推移" },
            { key: "avgRR", label: "RR比推移" },
            { key: "pnl", label: "PnL推移" },
          ].map((metric) => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key as any)}
              className={cn(
                "px-4 py-2 rounded-lg border transition-all duration-200",
                selectedMetric === metric.key
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/30 bg-card/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {metric.label}
            </button>
          ))}
        </motion.div>

        {/* Monthly Trend Chart */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={5}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-6">
            {selectedMetric === "winRate" && "勝率推移"}
            {selectedMetric === "avgRR" && "RR比推移"}
            {selectedMetric === "pnl" && "PnL推移"}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
              <XAxis
                dataKey="month"
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
              {selectedMetric === "winRate" && (
                <Line
                  type="monotone"
                  dataKey="winRate"
                  stroke="oklch(0.62 0.22 240)"
                  name="勝率（%）"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.62 0.22 240)", r: 4 }}
                />
              )}
              {selectedMetric === "avgRR" && (
                <Line
                  type="monotone"
                  dataKey="avgRR"
                  stroke="oklch(0.65 0.18 160)"
                  name="RR比"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.65 0.18 160)", r: 4 }}
                />
              )}
              {selectedMetric === "pnl" && (
                <Line
                  type="monotone"
                  dataKey="pnl"
                  stroke="oklch(0.64 0.25 142)"
                  name="PnL"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.64 0.25 142)", r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Monthly Growth Rate */}
        {growthData.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={6}
            className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
          >
            <h3 className="font-display font-bold text-lg text-foreground mb-6">
              月次成長率
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={growthData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                <XAxis
                  dataKey="month"
                  stroke="oklch(0.55 0.015 65)"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="oklch(0.55 0.015 65)"
                  style={{ fontSize: "12px" }}
                  label={{ value: "成長率（%）", angle: -90, position: "insideLeft" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="oklch(0.55 0.015 65)"
                  style={{ fontSize: "12px" }}
                  label={{ value: "PnL変化", angle: 90, position: "insideRight" }}
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
                <Bar yAxisId="left" dataKey="growthRate" fill="oklch(0.62 0.22 240)" name="成長率（%）" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pnlChange"
                  stroke="oklch(0.65 0.18 160)"
                  name="PnL変化"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Monthly Details Table */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={7}
          className="rounded-xl border border-border/30 bg-card/50 p-6"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-6">
            月別詳細
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">月</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">取引数</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">勝率</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">RR比</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">PnL</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">平均FOMO</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">トレンド</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">収支</th>
                </tr>
              </thead>
              <tbody>
                {comparison.months.map((month, i) => (
                  <motion.tr
                    key={month.yearMonth}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/20 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-display font-bold text-foreground">{month.yearMonth}</p>
                    </td>
                    <td className="text-right py-3 px-4 text-foreground font-mono">
                      {month.totalTrades}
                    </td>
                    <td className={cn("text-right py-3 px-4 font-mono font-bold", getWinRateColor(month.winRate))}>
                      {month.winRate}%
                    </td>
                    <td className={cn("text-right py-3 px-4 font-mono font-bold", getRRColor(month.avgRiskRewardRatio))}>
                      1:{month.avgRiskRewardRatio}
                    </td>
                    <td className="text-right py-3 px-4 text-foreground font-mono">
                      <span className={cn(
                        month.totalPnL > 0 ? "text-success" : month.totalPnL === 0 ? "text-muted-foreground" : "text-destructive"
                      )}>
                        {month.totalPnL > 0 ? "+" : ""}{month.totalPnL.toFixed(0)}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        month.avgFomoScore >= 70 ? "bg-destructive/20 text-destructive" :
                        month.avgFomoScore >= 50 ? "bg-warning/20 text-warning" :
                        "bg-success/20 text-success"
                      )}>
                        {month.avgFomoScore}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {getTrendIcon(month.trend)}
                        <span className="text-xs text-muted-foreground">
                          {getTrendLabel(month.trend)}
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium border",
                        getProfitabilityColor(month.profitability)
                      )}>
                        {getProfitabilityLabel(month.profitability)}
                      </span>
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
