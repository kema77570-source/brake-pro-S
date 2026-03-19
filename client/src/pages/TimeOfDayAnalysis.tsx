// BRAKE Pro — Time of Day Performance Analysis Page
// Design: Dark Financial × Neo-Brutalist
// Visualize: performance by time of day (morning, afternoon, evening, night)

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
  Cell,
  ComposedChart,
} from "recharts";
import {
  Sun,
  Cloud,
  Moon,
  AlertCircle,
  CheckCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTrades } from "@/lib/storage";
import {
  getAllTimeOfDayStats,
  getTimeOfDayInsights,
  getTimeOfDayHeatmapData,
  type TimeOfDay,
} from "@/lib/timeOfDayAnalysis";
import { cn } from "@/lib/utils";

export default function TimeOfDayAnalysis() {
  const trades = useMemo(() => getTrades(), []);
  const comparison = useMemo(() => getAllTimeOfDayStats(trades), [trades]);
  const heatmapData = useMemo(() => getTimeOfDayHeatmapData(trades), [trades]);
  const insights = useMemo(() => getTimeOfDayInsights(comparison), [comparison]);

  const [selectedPeriod, setSelectedPeriod] = useState<TimeOfDay | null>(null);

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
    }),
  };

  const getTimeIcon = (period: TimeOfDay) => {
    switch (period) {
      case "morning":
        return <Sun className="w-5 h-5" />;
      case "afternoon":
        return <Cloud className="w-5 h-5" />;
      case "evening":
        return <Cloud className="w-5 h-5" />;
      case "night":
        return <Moon className="w-5 h-5" />;
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

  const getConsistencyColor = (consistency: string) => {
    switch (consistency) {
      case "excellent":
        return "bg-success/20 text-success border-success/30";
      case "good":
        return "bg-primary/20 text-primary border-primary/30";
      case "fair":
        return "bg-warning/20 text-warning border-warning/30";
      default:
        return "bg-destructive/20 text-destructive border-destructive/30";
    }
  };

  const getConsistencyLabel = (consistency: string) => {
    switch (consistency) {
      case "excellent":
        return "優秀";
      case "good":
        return "良好";
      case "fair":
        return "中程度";
      default:
        return "低い";
    }
  };

  if (comparison.periods.length === 0) {
    return (
      <div className="min-h-screen px-4 py-8 lg:px-8 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-muted/20 border border-muted/30 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">データなし</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            時間帯別パフォーマンスを表示するには、まずトレード記録が必要です。
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
          <h1 className="font-display text-3xl font-bold text-foreground">時間帯別パフォーマンス</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            朝・昼・夜など時間帯ごとの勝率・RR比を分析し、得意な時間帯を特定
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

        {/* Time Period Cards */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {comparison.periods.map((period, idx) => (
            <button
              key={period.period}
              onClick={() => setSelectedPeriod(selectedPeriod === period.period ? null : period.period)}
              className={cn(
                "rounded-xl border p-6 transition-all duration-200 text-left",
                selectedPeriod === period.period
                  ? "border-primary/50 bg-primary/10"
                  : "border-border/30 bg-card/50 hover:bg-card/70"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                    {getTimeIcon(period.period)}
                  </div>
                  <div>
                    <p className="font-display font-bold text-foreground">{period.label}</p>
                    <p className="text-xs text-muted-foreground">{period.totalTrades}取引</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">勝率</p>
                  <p className={cn("font-mono font-bold text-lg", getWinRateColor(period.winRate))}>
                    {period.winRate}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">RR比</p>
                  <p className={cn("font-mono font-bold text-lg", getRRColor(period.avgRiskRewardRatio))}>
                    1:{period.avgRiskRewardRatio}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">安定性</p>
                  <span className={cn(
                    "inline-block px-2 py-1 rounded-full text-xs font-medium border",
                    getConsistencyColor(period.consistency)
                  )}>
                    {getConsistencyLabel(period.consistency)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </motion.div>

        {/* Hourly Heatmap */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={3}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-4">
            <Clock className="w-5 h-5 inline mr-2" />
            時間別勝率とRR比
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            24時間ごとの勝率（棒グラフ）とRR比（折れ線グラフ）の推移
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={heatmapData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
              <XAxis
                dataKey="hourLabel"
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

        {/* Period Comparison */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={4}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-6">
            時間帯別詳細比較
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">時間帯</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">取引数</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">勝率</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">RR比</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">PnL</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">平均FOMO</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">安定性</th>
                </tr>
              </thead>
              <tbody>
                {comparison.periods.map((period, i) => (
                  <motion.tr
                    key={period.period}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/20 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                          {getTimeIcon(period.period)}
                        </div>
                        <div>
                          <p className="font-display font-bold text-foreground">{period.label}</p>
                          <p className="text-xs text-muted-foreground">{period.timeRange}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-foreground font-mono">
                      {period.totalTrades}
                    </td>
                    <td className={cn("text-right py-3 px-4 font-mono font-bold", getWinRateColor(period.winRate))}>
                      {period.winRate}%
                    </td>
                    <td className={cn("text-right py-3 px-4 font-mono font-bold", getRRColor(period.avgRiskRewardRatio))}>
                      1:{period.avgRiskRewardRatio}
                    </td>
                    <td className="text-right py-3 px-4 text-foreground font-mono">
                      <span className={cn(
                        period.totalPnL > 0 ? "text-success" : period.totalPnL === 0 ? "text-muted-foreground" : "text-destructive"
                      )}>
                        {period.totalPnL > 0 ? "+" : ""}{period.totalPnL.toFixed(0)}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        period.avgFomoScore >= 70 ? "bg-destructive/20 text-destructive" :
                        period.avgFomoScore >= 50 ? "bg-warning/20 text-warning" :
                        "bg-success/20 text-success"
                      )}>
                        {period.avgFomoScore}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium border",
                        getConsistencyColor(period.consistency)
                      )}>
                        {getConsistencyLabel(period.consistency)}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Best vs Worst Period */}
        {comparison.bestPeriod && comparison.worstPeriod && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={5}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Best Period */}
            <div className="rounded-xl border border-success/30 bg-success/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-success" />
                <h3 className="font-display font-bold text-lg text-success">最適な時間帯</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">時間帯</p>
                  <p className="font-display font-bold text-2xl text-foreground">
                    {comparison.bestPeriod.label}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">勝率</p>
                    <p className={cn("font-mono font-bold text-xl", getWinRateColor(comparison.bestPeriod.winRate))}>
                      {comparison.bestPeriod.winRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">RR比</p>
                    <p className={cn("font-mono font-bold text-xl", getRRColor(comparison.bestPeriod.avgRiskRewardRatio))}>
                      1:{comparison.bestPeriod.avgRiskRewardRatio}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-success/80">
                  この時間帯で積極的に取引を実行することで、全体成績の向上が期待できます。
                </p>
              </div>
            </div>

            {/* Worst Period */}
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingDown className="w-6 h-6 text-destructive" />
                <h3 className="font-display font-bold text-lg text-destructive">注意が必要な時間帯</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">時間帯</p>
                  <p className="font-display font-bold text-2xl text-foreground">
                    {comparison.worstPeriod.label}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">勝率</p>
                    <p className={cn("font-mono font-bold text-xl", getWinRateColor(comparison.worstPeriod.winRate))}>
                      {comparison.worstPeriod.winRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">RR比</p>
                    <p className={cn("font-mono font-bold text-xl", getRRColor(comparison.worstPeriod.avgRiskRewardRatio))}>
                      1:{comparison.worstPeriod.avgRiskRewardRatio}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-destructive/80">
                  この時間帯での取引を避けるか、より慎重な判断基準を設定することを推奨します。
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
