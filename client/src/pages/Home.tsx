// BRAKE Pro — Home Page
// Design: Dark Financial × Neo-Brutalist
// Hero with suspension warning, streak indicator, quick actions

import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Activity,
  TrendingUp,
  BookMarked,
  Bell,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { getTrades, getAlarms } from "@/lib/storage";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663445896857/Ztqdced34edPwvAiZaDdS7/brake-hero-bg_6b51910b.png";

export default function Home() {
  const [, navigate] = useLocation();
  const { suspended, suspendedUntil, lossStreak, hrWarning, latestHR, settings } = useApp();

  const trades = useMemo(() => getTrades(), []);
  const alarms = useMemo(() => getAlarms().filter((a) => a.status === "active"), []);

  const activeTrades = trades.filter((t) => t.status === "active").length;
  const recentWins = trades.filter((t) => t.result === "win").length;
  const recentLosses = trades.filter((t) => t.result === "loss").length;
  const winRate = recentWins + recentLosses > 0
    ? Math.round((recentWins / (recentWins + recentLosses)) * 100)
    : null;

  const remainingMinutes = suspendedUntil
    ? Math.max(0, Math.round((suspendedUntil.getTime() - Date.now()) / 60000))
    : 0;

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
    }),
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[40vh] flex items-center">
        <img
          src={HERO_BG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/30 to-background" />

        <div className="relative z-10 w-full px-6 py-12 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-medium tracking-widest uppercase text-primary/80">
                Trade Psychology Guard
              </span>
            </div>
            <h1 className="font-display text-4xl font-bold text-white lg:text-5xl leading-tight">
              衝動を止める。<br />
              <span className="text-primary">判断を守る。</span>
            </h1>
            <p className="mt-4 text-base text-white/70 max-w-lg leading-relaxed">
              BRAKE Proは売買推奨ではなく、自己判断支援・衝動抑制・ルール遵守・振り返り強化のためのトレード心理管理ツールです。
            </p>
          </motion.div>
        </div>
      </section>

      {/* Suspension Warning */}
      {suspended && suspendedUntil && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-4 lg:mx-6 -mt-4 relative z-20"
        >
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 glow-red">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-display font-bold text-destructive">
                  トレード停止中 — {lossStreak.suspendReason}
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  残り約 <span className="font-mono font-bold">{remainingMinutes}</span> 分
                  （{suspendedUntil.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} まで）
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* HR Warning */}
      {hrWarning && latestHR && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-4 lg:mx-6 mt-3 relative z-20"
        >
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 glow-amber">
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-warning shrink-0 mt-0.5 pulse-warning" />
              <div className="flex-1">
                <p className="font-display font-bold text-warning">
                  心拍数警告 — {latestHR.bpm} BPM
                </p>
                <p className="text-sm text-warning/80 mt-1">
                  ストレスレベルが高い状態でのトレードは衝動的な判断につながります。
                  深呼吸をしてから判断してください。
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="px-4 lg:px-6 mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "連敗ストリーク",
            value: lossStreak.currentStreak,
            suffix: "連敗",
            color: lossStreak.currentStreak >= settings.streakSuspend1Count ? "text-destructive" : "text-foreground",
            icon: AlertTriangle,
          },
          {
            label: "アクティブトレード",
            value: activeTrades,
            suffix: "件",
            color: "text-primary",
            icon: TrendingUp,
          },
          {
            label: "勝率",
            value: winRate ?? "—",
            suffix: winRate !== null ? "%" : "",
            color: winRate !== null && winRate >= 50 ? "text-success" : "text-muted-foreground",
            icon: Zap,
          },
          {
            label: "アクティブアラーム",
            value: alarms.length,
            suffix: "件",
            color: alarms.length > 0 ? "text-warning" : "text-muted-foreground",
            icon: Bell,
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={i + 1}
            className="glass-card rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <div className={cn("font-display font-bold text-2xl num", stat.color)}>
              {stat.value}
              <span className="text-sm font-normal ml-1">{stat.suffix}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="px-4 lg:px-6 mt-6">
        <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
          クイックアクション
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
            <button
              onClick={() => navigate("/check")}
              disabled={suspended}
              className={cn(
                "w-full rounded-xl border p-5 text-left transition-all duration-200 group",
                suspended
                  ? "border-border/30 bg-card/30 opacity-50 cursor-not-allowed"
                  : "border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 glow-blue"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-foreground">買う前チェック</p>
                    <p className="text-xs text-muted-foreground mt-0.5">FOMO診断 + リスクリワード計算</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full rounded-xl border border-border/30 bg-card/50 p-5 text-left transition-all duration-200 group hover:bg-card hover:border-border/60"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-foreground">市場の過熱度</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Fear&Greed + VIX + 銘柄ヒート</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </button>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
            <button
              onClick={() => navigate("/trades")}
              className="w-full rounded-xl border border-border/30 bg-card/50 p-5 text-left transition-all duration-200 group hover:bg-card hover:border-border/60"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-foreground">トレード記録</p>
                    <p className="text-xs text-muted-foreground mt-0.5">結果記録・振り返り・PnL管理</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </button>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={8}>
            <button
              onClick={() => navigate("/skip-log")}
              className="w-full rounded-xl border border-border/30 bg-card/50 p-5 text-left transition-all duration-200 group hover:bg-card hover:border-border/60"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    <BookMarked className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-foreground">見送りログ</p>
                    <p className="text-xs text-muted-foreground mt-0.5">見送り理由・その後の結果記録</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Loss Streak Detail */}
      {lossStreak.currentStreak > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={9}
          className="px-4 lg:px-6 mt-6"
        >
          <div className={cn(
            "rounded-xl border p-5",
            lossStreak.currentStreak >= settings.streakSuspend2Count
              ? "border-destructive/30 bg-destructive/5"
              : lossStreak.currentStreak >= settings.streakSuspend1Count
              ? "border-warning/30 bg-warning/5"
              : "border-amber-500/20 bg-amber-500/5"
          )}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className={cn(
                "w-4 h-4",
                lossStreak.currentStreak >= settings.streakSuspend1Count ? "text-warning" : "text-amber-400"
              )} />
              <h3 className="font-display font-semibold text-sm text-foreground">
                損失ストリーク警告
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className={cn(
                  "font-display font-bold text-3xl num",
                  lossStreak.currentStreak >= settings.streakSuspend2Count ? "text-destructive" :
                  lossStreak.currentStreak >= settings.streakSuspend1Count ? "text-warning" : "text-amber-400"
                )}>
                  {lossStreak.currentStreak}
                </p>
                <p className="text-xs text-muted-foreground">連続損失</p>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{settings.streakSuspend1Count}連敗で{settings.streakSuspend1Minutes}分停止</span>
                  <span>{settings.streakSuspend2Count}連敗で{Math.round(settings.streakSuspend2Minutes / 60)}時間停止</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      lossStreak.currentStreak >= settings.streakSuspend2Count ? "bg-destructive" :
                      lossStreak.currentStreak >= settings.streakSuspend1Count ? "bg-warning" : "bg-amber-400"
                    )}
                    style={{ width: `${Math.min(100, (lossStreak.currentStreak / settings.streakSuspend2Count) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="h-8" />
    </div>
  );
}
