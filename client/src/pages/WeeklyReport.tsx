// BRAKE Pro — Weekly Report Page
// Design: Dark Financial × Neo-Brutalist
// Visualize: win rate, avg RR, FOMO trends, skip accuracy

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Brain,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTrades, getSkipLog } from "@/lib/storage";
import { getLastNWeeks, getCurrentWeekStats, type WeeklyStats } from "@/lib/reportAnalysis";
import { cn } from "@/lib/utils";

export default function WeeklyReport() {
  const [weeks, setWeeks] = useState(4);
  const trades = useMemo(() => getTrades(), []);
  const skips = useMemo(() => getSkipLog(), []);

  const weeklyStats = useMemo(() => getLastNWeeks(trades, skips, weeks), [trades, skips, weeks]);
  const currentWeek = useMemo(() => getCurrentWeekStats(trades, skips), [trades, skips]);

  // Chart data
  const winRateData = weeklyStats.map((w) => ({
    week: w.week.split(" ~ ")[0],
    winRate: w.winRate,
    trades: w.totalTrades,
  }));

  const rrData = weeklyStats.map((w) => ({
    week: w.week.split(" ~ ")[0],
    avgRR: w.avgRiskRewardRatio,
  }));

  const fomoData = weeklyStats.map((w) => ({
    week: w.week.split(" ~ ")[0],
    market: w.avgMarketFomoScore,
    user: w.avgUserFomoScore,
    total: w.avgFomoScore,
  }));

  const skipAccuracyData = weeklyStats.map((w) => ({
    week: w.week.split(" ~ ")[0],
    accuracy: w.skipAccuracy,
    good: w.goodSkips,
    missed: w.missedOpportunities,
  }));

  // Current week pie chart
  const resultPie = [
    { name: "勝ち", value: currentWeek.wins, color: "oklch(0.65 0.18 160)" },
    { name: "負け", value: currentWeek.losses, color: "oklch(0.6 0.22 25)" },
    { name: "同値", value: currentWeek.breakevens, color: "oklch(0.75 0.18 80)" },
  ].filter((d) => d.value > 0);

  // Radar chart data (current week performance)
  const radarData = [
    { metric: "勝率", value: currentWeek.winRate, fullMark: 100 },
    { metric: "RR比", value: Math.min(currentWeek.avgRiskRewardRatio * 33, 100), fullMark: 100 },
    { metric: "見送り精度", value: currentWeek.skipAccuracy, fullMark: 100 },
    { metric: "FOMO抑制", value: Math.max(100 - currentWeek.avgFomoScore, 0), fullMark: 100 },
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
    }),
  };

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">週次レポート</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                取引成績の推移を可視化 — 勝率・RR・FOMO・見送り精度
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeeks(Math.max(1, weeks - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-muted-foreground w-16 text-center">
                {weeks}週間
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeeks(Math.min(52, weeks + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Current Week Summary */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            {
              label: "勝率",
              value: `${currentWeek.winRate}%`,
              icon: TrendingUp,
              color: "text-success",
              trend: currentWeek.winRate >= 50 ? "up" : "down",
            },
            {
              label: "平均RR",
              value: `1:${currentWeek.avgRiskRewardRatio}`,
              icon: Target,
              color: "text-primary",
              trend: currentWeek.avgRiskRewardRatio >= 1.5 ? "up" : "down",
            },
            {
              label: "見送り精度",
              value: `${currentWeek.skipAccuracy}%`,
              icon: CheckCircle,
              color: "text-accent",
              trend: currentWeek.skipAccuracy >= 50 ? "up" : "down",
            },
            {
              label: "平均FOMO",
              value: `${currentWeek.avgFomoScore}`,
              icon: Brain,
              color: "text-warning",
              trend: currentWeek.avgFomoScore <= 50 ? "up" : "down",
            },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="rounded-xl border border-border/30 bg-card/50 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className={cn("w-5 h-5", stat.color)} />
                  {stat.trend === "up" ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="font-display font-bold text-xl text-foreground">{stat.value}</p>
              </div>
            );
          })}
        </motion.div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Win Rate Trend */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="rounded-xl border border-border/30 bg-card/50 p-6"
          >
            <h3 className="font-display font-bold text-lg text-foreground mb-4">勝率の推移</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={winRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                <XAxis dataKey="week" stroke="oklch(0.55 0.015 65)" style={{ fontSize: "12px" }} />
                <YAxis stroke="oklch(0.55 0.015 65)" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.21 0.006 285.885)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "oklch(0.85 0.005 65)" }}
                />
                <Bar dataKey="winRate" fill="oklch(0.65 0.18 160)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-3">
              過去{weeks}週間の勝率推移。50%以上が目標
            </p>
          </motion.div>

          {/* RR Trend */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="rounded-xl border border-border/30 bg-card/50 p-6"
          >
            <h3 className="font-display font-bold text-lg text-foreground mb-4">
              平均リスクリワード比
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={rrData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                <XAxis dataKey="week" stroke="oklch(0.55 0.015 65)" style={{ fontSize: "12px" }} />
                <YAxis stroke="oklch(0.55 0.015 65)" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.21 0.006 285.885)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "oklch(0.85 0.005 65)" }}
                />
                <Line
                  type="monotone"
                  dataKey="avgRR"
                  stroke="oklch(0.62 0.22 240)"
                  dot={{ fill: "oklch(0.62 0.22 240)", r: 4 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-3">
              1.5以上が推奨。高いほどリスク管理が優秀
            </p>
          </motion.div>

          {/* FOMO Trend */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4}
            className="rounded-xl border border-border/30 bg-card/50 p-6"
          >
            <h3 className="font-display font-bold text-lg text-foreground mb-4">
              FOMO傾向（市場 vs 自分）
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={fomoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                <XAxis dataKey="week" stroke="oklch(0.55 0.015 65)" style={{ fontSize: "12px" }} />
                <YAxis stroke="oklch(0.55 0.015 65)" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.21 0.006 285.885)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "oklch(0.85 0.005 65)" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="market"
                  stroke="oklch(0.75 0.18 80)"
                  name="銘柄FOMO"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="user"
                  stroke="oklch(0.65 0.2 40)"
                  name="自分FOMO"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-3">
              低いほど冷静な判断。50以下が目標
            </p>
          </motion.div>

          {/* Skip Accuracy */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={5}
            className="rounded-xl border border-border/30 bg-card/50 p-6"
          >
            <h3 className="font-display font-bold text-lg text-foreground mb-4">見送り精度</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={skipAccuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                <XAxis dataKey="week" stroke="oklch(0.55 0.015 65)" style={{ fontSize: "12px" }} />
                <YAxis stroke="oklch(0.55 0.015 65)" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.21 0.006 285.885)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "oklch(0.85 0.005 65)" }}
                />
                <Bar dataKey="accuracy" fill="oklch(0.65 0.18 160)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-3">
              見送った銘柄のうち、実際に正解だった割合
            </p>
          </motion.div>

          {/* Current Week Pie */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={6}
            className="rounded-xl border border-border/30 bg-card/50 p-6"
          >
            <h3 className="font-display font-bold text-lg text-foreground mb-4">
              今週の結果分布
            </h3>
            {resultPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={resultPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {resultPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.21 0.006 285.885)",
                      border: "1px solid oklch(1 0 0 / 10%)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">今週のトレード記録がありません</p>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {resultPie.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Performance Radar */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={7}
            className="rounded-xl border border-border/30 bg-card/50 p-6"
          >
            <h3 className="font-display font-bold text-lg text-foreground mb-4">
              総合パフォーマンス
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="oklch(1 0 0 / 10%)" />
                <PolarAngleAxis dataKey="metric" stroke="oklch(0.55 0.015 65)" />
                <PolarRadiusAxis stroke="oklch(0.55 0.015 65)" />
                <Radar
                  name="スコア"
                  dataKey="value"
                  stroke="oklch(0.62 0.22 240)"
                  fill="oklch(0.62 0.22 240)"
                  fillOpacity={0.3}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.21 0.006 285.885)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                    borderRadius: "8px",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-3">
              各指標を100点満点で評価。バランスの取れた形が理想
            </p>
          </motion.div>
        </div>

        {/* Insights */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={8}
          className="rounded-xl border border-border/30 bg-card/50 p-6"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-4">
            <AlertCircle className="w-5 h-5 inline mr-2" />
            インサイト
          </h3>
          <div className="space-y-3">
            {currentWeek.winRate >= 60 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/30">
                <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-success">優秀な勝率</p>
                  <p className="text-xs text-success/80 mt-1">
                    今週の勝率は{currentWeek.winRate}%。このペースを維持しましょう。
                  </p>
                </div>
              </div>
            )}

            {currentWeek.avgRiskRewardRatio < 1.5 && currentWeek.totalTrades > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">RR比が低め</p>
                  <p className="text-xs text-warning/80 mt-1">
                    平均RR比が{currentWeek.avgRiskRewardRatio}。1.5以上を目指してください。
                  </p>
                </div>
              </div>
            )}

            {currentWeek.avgFomoScore >= 60 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">FOMO傾向が強い</p>
                  <p className="text-xs text-destructive/80 mt-1">
                    平均FOMO{currentWeek.avgFomoScore}。冷却時間を長めに設定してください。
                  </p>
                </div>
              </div>
            )}

            {currentWeek.skipAccuracy >= 70 && currentWeek.totalSkips > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/30">
                <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-success">見送り判断が正確</p>
                  <p className="text-xs text-success/80 mt-1">
                    見送り精度{currentWeek.skipAccuracy}%。判断基準が確立できています。
                  </p>
                </div>
              </div>
            )}

            {currentWeek.totalTrades === 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/10 border border-muted/30">
                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">データなし</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    今週のトレード記録がまだありません。
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
