// BRAKE Pro — Day of Week Performance Analysis Page
// Design: Dark Financial × Neo-Brutalist
// Visualize: performance by day of week with weekday/weekend comparison

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
  getAllDayOfWeekStats,
  getDayOfWeekInsights,
  getDayOfWeekChartData,
} from "@/lib/dayOfWeekAnalysis";
import { cn } from "@/lib/utils";

export default function DayOfWeekAnalysis() {
  const trades = useMemo(() => getTrades(), []);
  const comparison = useMemo(() => getAllDayOfWeekStats(trades), [trades]);
  const chartData = useMemo(() => getDayOfWeekChartData(comparison.days), [comparison.days]);
  const insights = useMemo(() => getDayOfWeekInsights(comparison), [comparison]);

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

  const getPatternLabel = (pattern: string) => {
    switch (pattern) {
      case "weekday_strong":
        return "平日が強い";
      case "weekend_strong":
        return "週末が強い";
      case "balanced":
        return "バランス型";
      default:
        return "データなし";
    }
  };

  const getPatternColor = (pattern: string) => {
    switch (pattern) {
      case "weekday_strong":
        return "text-primary";
      case "weekend_strong":
        return "text-success";
      default:
        return "text-muted-foreground";
    }
  };

  if (comparison.days.length === 0) {
    return (
      <div className="min-h-screen px-4 py-8 lg:px-8 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-muted/20 border border-muted/30 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">データなし</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            曜日別パフォーマンスを表示するには、まずトレード記録が必要です。
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
          <h1 className="font-display text-3xl font-bold text-foreground">曜日別パフォーマンス</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            月曜～日曜ごとの勝率・RR比を分析し、曜日による取引傾向を特定
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

        {/* Pattern Overview */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-4">
            <Calendar className="w-5 h-5 inline mr-2" />
            取引パターン
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Pattern */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">全体パターン</p>
              <p className={cn("font-display font-bold text-2xl", getPatternColor(comparison.pattern))}>
                {getPatternLabel(comparison.pattern)}
              </p>
            </div>

            {/* Weekday Average */}
            {comparison.weekdayAvg && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">平日平均</p>
                <div className="space-y-1">
                  <p className={cn("font-mono font-bold text-lg", getWinRateColor(comparison.weekdayAvg.winRate))}>
                    勝率: {comparison.weekdayAvg.winRate}%
                  </p>
                  <p className={cn("font-mono font-bold text-lg", getRRColor(comparison.weekdayAvg.avgRiskRewardRatio))}>
                    RR: 1:{comparison.weekdayAvg.avgRiskRewardRatio}
                  </p>
                </div>
              </div>
            )}

            {/* Weekend Average */}
            {comparison.weekendAvg && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">週末平均</p>
                <div className="space-y-1">
                  <p className={cn("font-mono font-bold text-lg", getWinRateColor(comparison.weekendAvg.winRate))}>
                    勝率: {comparison.weekendAvg.winRate}%
                  </p>
                  <p className={cn("font-mono font-bold text-lg", getRRColor(comparison.weekendAvg.avgRiskRewardRatio))}>
                    RR: 1:{comparison.weekendAvg.avgRiskRewardRatio}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Best vs Worst Day */}
        {comparison.bestDay && comparison.worstDay && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            {/* Best Day */}
            <div className="rounded-xl border border-success/30 bg-success/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-6 h-6 text-success" />
                <h3 className="font-display font-bold text-lg text-success">最適な曜日</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">曜日</p>
                  <p className="font-display font-bold text-2xl text-foreground">
                    {comparison.bestDay.dayLabel}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">勝率</p>
                    <p className={cn("font-mono font-bold text-xl", getWinRateColor(comparison.bestDay.winRate))}>
                      {comparison.bestDay.winRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">RR比</p>
                    <p className={cn("font-mono font-bold text-xl", getRRColor(comparison.bestDay.avgRiskRewardRatio))}>
                      1:{comparison.bestDay.avgRiskRewardRatio}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">取引数</p>
                    <p className="font-mono font-bold text-xl text-foreground">
                      {comparison.bestDay.totalTrades}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">PnL</p>
                    <p className={cn(
                      "font-mono font-bold text-xl",
                      comparison.bestDay.totalPnL > 0 ? "text-success" : "text-destructive"
                    )}>
                      {comparison.bestDay.totalPnL > 0 ? "+" : ""}{comparison.bestDay.totalPnL.toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Worst Day */}
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-destructive" />
                <h3 className="font-display font-bold text-lg text-destructive">注意が必要な曜日</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">曜日</p>
                  <p className="font-display font-bold text-2xl text-foreground">
                    {comparison.worstDay.dayLabel}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">勝率</p>
                    <p className={cn("font-mono font-bold text-xl", getWinRateColor(comparison.worstDay.winRate))}>
                      {comparison.worstDay.winRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">RR比</p>
                    <p className={cn("font-mono font-bold text-xl", getRRColor(comparison.worstDay.avgRiskRewardRatio))}>
                      1:{comparison.worstDay.avgRiskRewardRatio}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">取引数</p>
                    <p className="font-mono font-bold text-xl text-foreground">
                      {comparison.worstDay.totalTrades}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">PnL</p>
                    <p className={cn(
                      "font-mono font-bold text-xl",
                      comparison.worstDay.totalPnL > 0 ? "text-success" : "text-destructive"
                    )}>
                      {comparison.worstDay.totalPnL > 0 ? "+" : ""}{comparison.worstDay.totalPnL.toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Day of Week Comparison Chart */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={4}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-6">
            曜日別勝率とRR比
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
              <XAxis
                dataKey="day"
                stroke="oklch(0.55 0.015 65)"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                yAxisId="left"
                stroke="oklch(0.55 0.015 65)"
                style={{ fontSize: "12px" }}
                label={{ value: "勝率（%）", angle: -90, position: "insideLeft" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="oklch(0.55 0.015 65)"
                style={{ fontSize: "12px" }}
                label={{ value: "RR比", angle: 90, position: "insideRight" }}
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
              <Bar yAxisId="left" dataKey="winRate" fill="oklch(0.62 0.22 240)" name="勝率" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgRR"
                stroke="oklch(0.65 0.18 160)"
                name="RR比"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Day of Week Details Table */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={5}
          className="rounded-xl border border-border/30 bg-card/50 p-6"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-6">
            曜日別詳細
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">曜日</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">取引数</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">勝率</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">RR比</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">PnL</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">平均FOMO</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">最大連勝</th>
                </tr>
              </thead>
              <tbody>
                {comparison.days.map((day, i) => (
                  <motion.tr
                    key={day.dayNumber}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/20 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-display font-bold text-foreground">{day.dayLabel}</p>
                    </td>
                    <td className="text-right py-3 px-4 text-foreground font-mono">
                      {day.totalTrades}
                    </td>
                    <td className={cn("text-right py-3 px-4 font-mono font-bold", getWinRateColor(day.winRate))}>
                      {day.winRate}%
                    </td>
                    <td className={cn("text-right py-3 px-4 font-mono font-bold", getRRColor(day.avgRiskRewardRatio))}>
                      1:{day.avgRiskRewardRatio}
                    </td>
                    <td className="text-right py-3 px-4 text-foreground font-mono">
                      <span className={cn(
                        day.totalPnL > 0 ? "text-success" : day.totalPnL === 0 ? "text-muted-foreground" : "text-destructive"
                      )}>
                        {day.totalPnL > 0 ? "+" : ""}{day.totalPnL.toFixed(0)}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        day.avgFomoScore >= 70 ? "bg-destructive/20 text-destructive" :
                        day.avgFomoScore >= 50 ? "bg-warning/20 text-warning" :
                        "bg-success/20 text-success"
                      )}>
                        {day.avgFomoScore}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 text-foreground font-mono">
                      {day.maxWinStreak}
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
