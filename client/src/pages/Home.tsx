// BRAKE Pro — Home Page
// Design: Dark Financial × Neo-Brutalist
// Golden Order UX: 現在地 → 状態 → KPI → ルール → 主アクション → サブ → 緊急停止

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
  CheckCircle2,
  BarChart3,
  Settings,
  Heart,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { getTrades, getAlarms } from "@/lib/storage";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [, navigate] = useLocation();
  const { suspended, suspendedUntil, lossStreak, hrWarning, latestHR, settings } = useApp();

  const trades = useMemo(() => getTrades(), []);
  const alarms = useMemo(() => getAlarms().filter((a) => a.status === "active"), []);

  const activeTrades = trades.filter((t) => t.status === "active").length;
  const recentWins = trades.filter((t) => t.result === "win").length;
  const recentLosses = trades.filter((t) => t.result === "loss").length;
  const winRate =
    recentWins + recentLosses > 0
      ? Math.round((recentWins / (recentWins + recentLosses)) * 100)
      : null;

  const remainingMinutes = suspendedUntil
    ? Math.max(0, Math.round((suspendedUntil.getTime() - Date.now()) / 60000))
    : 0;


  // ── Status level ──────────────────────────────────────────────────────────
  const statusLevel =
    suspended
      ? "danger"
      : hrWarning
      ? "warning"
      : lossStreak.currentStreak >= settings.streakSuspend1Count
      ? "caution"
      : "ok";

  const today = new Date().toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* ① テロップ — scrolling ticker */}
      <div className="w-full overflow-hidden bg-primary/10 border-b border-primary/20 py-2 select-none">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="mx-12 text-xs font-medium text-primary/80 tracking-wide">
              あなたを負かしているのは、相場ではなく感情かもしれない
              <span className="mx-6 text-primary/30">◆</span>
              急騰を見て飛び乗る。損切りを先延ばしにする。ルール外なのに「今回だけ」と思ってしまう。
              <span className="mx-6 text-primary/30">◆</span>
              BRAKE Pro は、その瞬間にブレーキをかけます。
            </span>
          ))}
        </div>
      </div>

      {/* ② 現在地 — compact header */}
      <header className="px-4 lg:px-6 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
            Trade Psychology Guard
          </p>
          <h1 className="font-display font-bold text-foreground text-lg leading-tight">
            BRAKE Pro
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{today}</p>
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-1 ml-auto mt-0.5 text-[11px] text-primary/60 hover:text-primary transition-colors"
          >
            <Settings className="w-3 h-3" />
            設定
          </button>
        </div>
      </header>

      {/* ② 今の状態 — full-width status card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-4 lg:px-6 mt-1"
      >
        {statusLevel === "danger" ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 glow-red">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-display font-bold text-destructive text-base">
                  トレード停止中
                </p>
                <p className="text-sm text-destructive/80 mt-0.5">
                  {lossStreak.suspendReason} — 残り約{" "}
                  <span className="font-mono font-bold">{remainingMinutes}</span> 分（
                  {suspendedUntil?.toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  まで）
                </p>
              </div>
            </div>
          </div>
        ) : statusLevel === "warning" ? (
          <div className="rounded-2xl border border-warning/40 bg-warning/10 p-5 glow-amber">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-warning pulse-warning" />
              </div>
              <div>
                <p className="font-display font-bold text-warning text-base">
                  心拍数警告 — {latestHR?.bpm} BPM
                </p>
                <p className="text-sm text-warning/80 mt-0.5">
                  ストレスレベルが高い状態です。深呼吸してから判断してください。
                </p>
              </div>
            </div>
          </div>
        ) : statusLevel === "caution" ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-display font-bold text-amber-300 text-base">
                  {lossStreak.currentStreak}連敗中 — 要注意
                </p>
                <p className="text-sm text-amber-400/80 mt-0.5">
                  感情的なリカバリートレードを避けてください。
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-display font-bold text-emerald-300 text-base">
                  状態良好 — トレード可能
                </p>
                <p className="text-sm text-emerald-400/70 mt-0.5">
                  コンディションは問題ありません。ルールに従って判断してください。
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ③ 最重要指標 — 2×2 KPI grid */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="px-4 lg:px-6 mt-4 grid grid-cols-2 gap-3"
      >
        {/* Loss streak */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">連敗ストリーク</span>
          </div>
          <div
            className={cn(
              "font-display font-bold text-2xl num",
              lossStreak.currentStreak >= settings.streakSuspend2Count
                ? "text-destructive"
                : lossStreak.currentStreak >= settings.streakSuspend1Count
                ? "text-warning"
                : "text-foreground",
            )}
          >
            {lossStreak.currentStreak}
            <span className="text-sm font-normal ml-1 text-muted-foreground">
              / {settings.streakSuspend2Count}
            </span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                lossStreak.currentStreak >= settings.streakSuspend2Count
                  ? "bg-destructive"
                  : lossStreak.currentStreak >= settings.streakSuspend1Count
                  ? "bg-warning"
                  : "bg-primary",
              )}
              style={{
                width: `${Math.min(100, (lossStreak.currentStreak / settings.streakSuspend2Count) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Win rate */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">勝率</span>
          </div>
          <div
            className={cn(
              "font-display font-bold text-2xl num",
              winRate === null
                ? "text-muted-foreground"
                : winRate >= 60
                ? "text-emerald-400"
                : winRate >= 50
                ? "text-primary"
                : "text-destructive",
            )}
          >
            {winRate !== null ? winRate : "—"}
            {winRate !== null && <span className="text-sm font-normal ml-0.5">%</span>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {recentWins}勝 {recentLosses}敗
          </p>
        </div>

        {/* Active trades */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">保有中</span>
          </div>
          <div
            className={cn(
              "font-display font-bold text-2xl num",
              activeTrades > 0 ? "text-primary" : "text-muted-foreground",
            )}
          >
            {activeTrades}
            <span className="text-sm font-normal ml-1 text-muted-foreground">件</span>
          </div>
          <button
            onClick={() => navigate("/trades")}
            className="text-[11px] text-primary/60 hover:text-primary transition-colors mt-1"
          >
            詳細を見る →
          </button>
        </div>

        {/* Alarms */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Bell className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">アラーム</span>
          </div>
          <div
            className={cn(
              "font-display font-bold text-2xl num",
              alarms.length > 0 ? "text-warning" : "text-muted-foreground",
            )}
          >
            {alarms.length}
            <span className="text-sm font-normal ml-1 text-muted-foreground">件</span>
          </div>
          <button
            onClick={() => navigate("/alarms")}
            className="text-[11px] text-primary/60 hover:text-primary transition-colors mt-1"
          >
            管理する →
          </button>
        </div>

        {/* Heart rate — full width */}
        <div className={cn(
          "col-span-2 glass-card rounded-xl p-4 flex items-center gap-4",
          latestHR?.stressLevel === "critical" ? "border border-destructive/30 bg-destructive/5" :
          latestHR?.stressLevel === "high"     ? "border border-warning/30 bg-warning/5" :
          "border border-border/20"
        )}>
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            latestHR?.stressLevel === "critical" ? "bg-destructive/20" :
            latestHR?.stressLevel === "high"     ? "bg-warning/20" :
            latestHR?.stressLevel === "medium"   ? "bg-amber-500/20" :
            "bg-primary/20"
          )}>
            <Heart className={cn(
              "w-5 h-5",
              latestHR?.stressLevel === "critical" ? "text-destructive animate-pulse" :
              latestHR?.stressLevel === "high"     ? "text-warning animate-pulse" :
              latestHR?.stressLevel === "medium"   ? "text-amber-400" :
              latestHR ? "text-emerald-400" : "text-muted-foreground"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className={cn(
                "font-display font-bold text-2xl num",
                latestHR?.stressLevel === "critical" ? "text-destructive" :
                latestHR?.stressLevel === "high"     ? "text-warning" :
                latestHR?.stressLevel === "medium"   ? "text-amber-400" :
                latestHR ? "text-emerald-400" : "text-muted-foreground"
              )}>
                {latestHR ? latestHR.bpm : "—"}
              </span>
              {latestHR && <span className="text-sm text-muted-foreground font-medium">BPM</span>}
              {latestHR && (
                <span className={cn(
                  "ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full",
                  latestHR.stressLevel === "critical" ? "bg-destructive/20 text-destructive" :
                  latestHR.stressLevel === "high"     ? "bg-warning/20 text-warning" :
                  latestHR.stressLevel === "medium"   ? "bg-amber-500/20 text-amber-400" :
                  "bg-emerald-500/20 text-emerald-400"
                )}>
                  {latestHR.stressLevel === "critical" ? "危険" :
                   latestHR.stressLevel === "high"     ? "高" :
                   latestHR.stressLevel === "medium"   ? "中" : "正常"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {latestHR
                ? `心拍数 — ${new Date(latestHR.timestamp).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 計測`
                : "心拍数 — データなし"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ④ 判断基準 — trading rules reminder */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.16 }}
        className="px-4 lg:px-6 mt-4"
      >
        <div className="glass-card rounded-xl p-4">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-3">
            今日のトレードルール
          </p>
          <ul className="space-y-2.5">
            {[
              "エントリー前に根拠を3つ挙げる",
              "損切りラインを決めてから入る",
              "FOMO を感じたら一度立ち止まる",
            ].map((rule, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center shrink-0 font-bold">
                  {i + 1}
                </span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* ⑤ 主アクション — CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.24 }}
        className="px-4 lg:px-6 mt-5"
      >
        <button
          onClick={() => !suspended && navigate("/check")}
          disabled={suspended}
          className={cn(
            "w-full rounded-2xl border p-6 text-left transition-all duration-150",
            suspended
              ? "border-border/30 bg-card/30 opacity-50 cursor-not-allowed"
              : "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 active:scale-[0.99] glow-blue",
          )}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-primary/80" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-foreground text-base">
                {suspended ? "停止中 — トレード不可" : "トレード前に確認する"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {suspended ? `解除まで約 ${remainingMinutes} 分` : "FOMO診断 + リスクリワード計算"}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </div>
        </button>
      </motion.div>

      {/* ⑥ サブアクション — compact secondary links */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.32 }}
        className="px-4 lg:px-6 mt-3 grid grid-cols-3 gap-2"
      >
        {[
          { label: "市場", icon: Activity, href: "/dashboard" },
          { label: "記録", icon: TrendingUp, href: "/trades" },
          { label: "見送り", icon: BookMarked, href: "/skip-log" },
        ].map((item) => (
          <button
            key={item.href}
            onClick={() => navigate(item.href)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border/30 bg-card/40 hover:bg-card hover:border-border/60 transition-all duration-200"
          >
            <item.icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">{item.label}</span>
          </button>
        ))}
      </motion.div>

      {/* ⑦ 緊急停止 / 設定リンク */}
      <div className="flex-1" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="px-4 lg:px-6 mt-6 mb-6"
      >
        <button
          onClick={() => navigate("/settings")}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border/20 text-xs text-muted-foreground/50 hover:text-muted-foreground hover:border-border/40 transition-all duration-200"
        >
          <Settings className="w-3.5 h-3.5" />
          設定・ルール調整
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </div>
  );
}
