// BRAKE Pro — Goal Tracking Page
// Design: Dark Financial × Neo-Brutalist
// Track monthly goals and progress in real-time

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Zap,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  getCurrentMonthProgress,
  getGoalHistory,
  getGoalInsights,
  getGoal,
  deleteGoal,
} from "@/lib/goalStorage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import GoalSettingModal from "@/components/GoalSettingModal";

export default function GoalTracking() {
  const currentProgress = useMemo(() => getCurrentMonthProgress(), []);
  const history = useMemo(() => getGoalHistory(6), []);
  const insights = useMemo(() => getGoalInsights(currentProgress), []);
  const currentGoal = useMemo(() => getGoal(currentProgress.year, currentProgress.month), []);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
    }),
  };

  const getStatusColor = (status: string) => {
    if (status === "exceeded") return "text-success";
    if (status === "on_track") return "text-primary";
    if (status === "at_risk") return "text-warning";
    return "text-destructive";
  };

  const getStatusBgColor = (status: string) => {
    if (status === "exceeded") return "bg-success/10 border-success/30";
    if (status === "on_track") return "bg-primary/10 border-primary/30";
    if (status === "at_risk") return "bg-warning/10 border-warning/30";
    return "bg-destructive/10 border-destructive/30";
  };

  const getStatusLabel = (status: string) => {
    if (status === "exceeded") return "目標達成";
    if (status === "on_track") return "順調";
    if (status === "at_risk") return "要注意";
    return "危険";
  };

  const chartData = history.map((p) => ({
    month: `${p.month}月`,
    winRate: p.currentWinRate,
    targetWinRate: currentGoal?.targetWinRate || 0,
    rr: Math.round(p.currentRiskRewardRatio * 100) / 100,
    targetRR: currentGoal?.targetRiskRewardRatio || 0,
  }));

  const radarData = [
    {
      name: "勝率",
      value: Math.min(currentProgress.winRateProgress, 100),
      fullMark: 100,
    },
    {
      name: "RR比",
      value: Math.min(currentProgress.rrProgress, 100),
      fullMark: 100,
    },
    {
      name: "PnL",
      value: currentProgress.pnlProgress ? Math.min(currentProgress.pnlProgress, 100) : 0,
      fullMark: 100,
    },
  ];

  if (currentProgress.totalTrades === 0 && !currentGoal) {
    return (
      <div className="min-h-screen px-4 py-8 lg:px-8 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-muted/20 border border-muted/30 flex items-center justify-center mx-auto mb-6">
            <Target className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">目標を設定しましょう</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            月次の勝率目標とRR比目標を設定して、進捗をリアルタイムで追跡できます。
          </p>
          <Dialog open={showGoalModal} onOpenChange={setShowGoalModal}>
            <DialogTrigger asChild>
              <Button className="mt-6 w-full">
                <Plus className="w-4 h-4 mr-2" />
                目標を設定
              </Button>
            </DialogTrigger>
            <DialogContent>
              <GoalSettingModal
                onSuccess={() => setShowGoalModal(false)}
                isEdit={false}
              />
            </DialogContent>
          </Dialog>
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
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">目標追跡</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {currentProgress.year}年{currentProgress.month}月の進捗をリアルタイムで監視
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={showGoalModal} onOpenChange={setShowGoalModal}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => setEditMode(true)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  編集
                </Button>
              </DialogTrigger>
              <DialogContent>
                <GoalSettingModal
                  onSuccess={() => setShowGoalModal(false)}
                  isEdit={editMode}
                />
              </DialogContent>
            </Dialog>
            {currentGoal && (
              <Button
                variant="outline"
                onClick={() => {
                  deleteGoal(currentProgress.year, currentProgress.month);
                  window.location.reload();
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                削除
              </Button>
            )}
          </div>
        </motion.div>

        {/* Current Status Card */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className={cn(
            "rounded-xl border p-6 mb-8",
            getStatusBgColor(currentProgress.status)
          )}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {currentProgress.status === "exceeded" && (
                <CheckCircle className="w-8 h-8 text-success" />
              )}
              {currentProgress.status === "on_track" && (
                <TrendingUp className="w-8 h-8 text-primary" />
              )}
              {currentProgress.status === "at_risk" && (
                <AlertCircle className="w-8 h-8 text-warning" />
              )}
              {currentProgress.status === "failed" && (
                <AlertCircle className="w-8 h-8 text-destructive" />
              )}
              <h2 className={cn("font-display font-bold text-2xl", getStatusColor(currentProgress.status))}>
                {getStatusLabel(currentProgress.status)}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">月末まで</p>
              <p className="font-display font-bold text-2xl text-foreground">
                {currentProgress.daysRemaining}日
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">勝率</p>
              <p className="font-display font-bold text-3xl text-foreground">
                {currentProgress.currentWinRate}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                目標: {currentGoal?.targetWinRate}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">RR比</p>
              <p className="font-display font-bold text-3xl text-foreground">
                1:{currentProgress.currentRiskRewardRatio}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                目標: 1:{currentGoal?.targetRiskRewardRatio}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">取引数</p>
              <p className="font-display font-bold text-3xl text-foreground">
                {currentProgress.totalTrades}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                勝: {currentProgress.wins}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Progress Bars */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {/* Win Rate Progress */}
          <div className="rounded-xl border border-border/30 bg-card/50 p-6">
            <h3 className="font-display font-bold text-lg text-foreground mb-4">勝率進捗</h3>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">進捗</span>
                <span className="font-mono font-bold text-foreground">
                  {currentProgress.winRateProgress}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/20 border border-muted/30 overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${currentProgress.winRateProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentProgress.currentWinRate}% / {currentGoal?.targetWinRate}%
            </p>
          </div>

          {/* RR Ratio Progress */}
          <div className="rounded-xl border border-border/30 bg-card/50 p-6">
            <h3 className="font-display font-bold text-lg text-foreground mb-4">RR比進捗</h3>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">進捗</span>
                <span className="font-mono font-bold text-foreground">
                  {currentProgress.rrProgress}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/20 border border-muted/30 overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${currentProgress.rrProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentProgress.currentRiskRewardRatio} / {currentGoal?.targetRiskRewardRatio}
            </p>
          </div>

          {/* PnL Progress */}
          {currentGoal?.targetPnL && (
            <div className="rounded-xl border border-border/30 bg-card/50 p-6">
              <h3 className="font-display font-bold text-lg text-foreground mb-4">利益進捗</h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">進捗</span>
                  <span className="font-mono font-bold text-foreground">
                    {currentProgress.pnlProgress}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted/20 border border-muted/30 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${currentProgress.pnlProgress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {currentProgress.currentPnL} / {currentGoal.targetPnL}
              </p>
            </div>
          )}
        </motion.div>

        {/* Insights */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={3}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-4">
            <Zap className="w-5 h-5 inline mr-2" />
            インサイト
          </h3>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{insight}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Radar Chart */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={4}
          className="rounded-xl border border-border/30 bg-card/50 p-6 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-6">
            目標達成度（レーダーチャート）
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="oklch(1 0 0 / 10%)" />
              <PolarAngleAxis dataKey="name" stroke="oklch(0.55 0.015 65)" />
              <PolarRadiusAxis stroke="oklch(0.55 0.015 65)" />
              <Radar
                name="進捗"
                dataKey="value"
                stroke="oklch(0.62 0.22 240)"
                fill="oklch(0.62 0.22 240)"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* History Chart */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={5}
          className="rounded-xl border border-border/30 bg-card/50 p-6"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-6">
            過去6ヶ月の推移
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
              <Line
                type="monotone"
                dataKey="winRate"
                stroke="oklch(0.62 0.22 240)"
                name="実績勝率"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="targetWinRate"
                stroke="oklch(0.62 0.22 240)"
                strokeDasharray="5 5"
                name="目標勝率"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
