// BRAKE Pro — CheckFlow Page
// Design: Dark Financial × Neo-Brutalist
// Full trade psychology check: FOMO, Risk/Reward, AI Audit, Pledges

import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Calculator,
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LongPressSign } from "@/components/LongPressSign";
import { useApp } from "@/contexts/AppContext";
import { calculateFomoScore, calculateRiskReward, generateAIAudit } from "@/lib/analysis";
import { saveTrade, saveAlarm } from "@/lib/storage";
import { fetchCryptoFearGreed } from "@/lib/marketApi";
import type { TradeEntry, FomoFactor, AIAuditResult } from "@/lib/types";
import { TRIGGER_REASONS, HOLD_PERIOD_OPTIONS } from "@/lib/types";
import { nanoid } from "nanoid";
import { toast } from "sonner";

type Phase = "questions" | "rr_calc" | "fomo_result" | "ai_audit" | "pledge" | "cooling" | "done";

interface Answers {
  ticker: string;
  name: string;
  direction: "long" | "short";
  triggerReason: string;
  entryReason: string;
  infoSource: string;
  whyNow: string;
  holdPeriodLabel: string;
  plannedHoldHours: number;
  stopLossReason: string;
  entryPrice: string;
  stopLossPrice: string;
  takeProfitPrice: string;
  positionSize: string;
}

const STEPS = [
  { key: "ticker", question: "どの銘柄を取引しようとしていますか？", sub: "ティッカーまたは銘柄名を入力" },
  { key: "direction", question: "ロング（買い）？ショート（売り）？", sub: "取引方向を選択" },
  { key: "trigger", question: "この銘柄を知ったきっかけは？", sub: "最も当てはまるものを選択" },
  { key: "reason", question: "なぜこの銘柄を取引するのですか？", sub: "具体的に書くほど、自分の判断を客観視できます" },
  { key: "source", question: "この情報をどこで見ましたか？", sub: "例: Twitter, YouTube, 四季報, 友人…" },
  { key: "whyNow", question: "なぜ「今」取引するのですか？", sub: "明日ではダメな理由を言語化してください" },
  { key: "holdPeriod", question: "いつまで保有するつもりですか？", sub: "保有予定期間を選択" },
  { key: "stopLoss", question: "損切りラインはどこですか？", sub: "決めていない場合は正直に「未定」と書いてください" },
];

const pageVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function CheckFlow() {
  const [, navigate] = useLocation();
  const { suspended, settings, lossStreak } = useApp();
  const [phase, setPhase] = useState<Phase>("questions");
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [coolingMinutes, setCoolingMinutes] = useState(0);
  const [coolingRemaining, setCoolingRemaining] = useState(0);
  const [fomoResult, setFomoResult] = useState<ReturnType<typeof calculateFomoScore> | null>(null);
  const [rrResult, setRrResult] = useState<ReturnType<typeof calculateRiskReward> | null>(null);
  const [aiAudit, setAiAudit] = useState<AIAuditResult | null>(null);
  const [checkedPledges, setCheckedPledges] = useState<boolean[]>([]);
  const [rrPledgeChecked, setRrPledgeChecked] = useState(false);
  const [fearGreedValue, setFearGreedValue] = useState(50);

  useEffect(() => {
    fetchCryptoFearGreed().then((d) => setFearGreedValue(d.value)).catch(() => {});
  }, []);

  // Cooling timer
  useEffect(() => {
    if (phase !== "cooling") return;
    const endTime = Date.now() + coolingMinutes * 60 * 1000;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setCoolingRemaining(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        setPhase("done");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, coolingMinutes]);

  const updateAnswer = useCallback((key: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const canProceed = () => {
    const key = step?.key;
    if (key === "ticker") return !!(answers.ticker && answers.ticker.length > 0);
    if (key === "direction") return !!answers.direction;
    if (key === "trigger") return !!answers.triggerReason;
    if (key === "reason") return !!(answers.entryReason && answers.entryReason.length > 5);
    if (key === "source") return !!(answers.infoSource && answers.infoSource.length > 0);
    if (key === "whyNow") return !!(answers.whyNow && answers.whyNow.length > 5);
    if (key === "holdPeriod") return !!answers.holdPeriodLabel;
    if (key === "stopLoss") return !!(answers.stopLossReason && answers.stopLossReason.length > 0);
    return true;
  };

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setPhase("rr_calc");
    }
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
    else navigate("/");
  };

  const handleRRNext = () => {
    const entry = parseFloat(answers.entryPrice || "0");
    const sl = parseFloat(answers.stopLossPrice || "0");
    const tp = parseFloat(answers.takeProfitPrice || "0");
    const rr = calculateRiskReward(entry, sl, tp, answers.direction ?? "long");
    setRrResult(rr);

    const fomo = calculateFomoScore({
      ticker: answers.ticker ?? "",
      triggerReason: answers.triggerReason ?? "",
      entryReason: answers.entryReason ?? "",
      infoSource: answers.infoSource ?? "",
      whyNow: answers.whyNow ?? "",
      holdPeriodLabel: answers.holdPeriodLabel ?? "",
      stopLossReason: answers.stopLossReason ?? "",
      marketFearGreedValue: fearGreedValue,
    });
    setFomoResult(fomo);

    const audit = generateAIAudit(
      null,
      fearGreedValue,
      entry,
      sl,
      tp,
      answers.direction ?? "long"
    );
    setAiAudit(audit);

    setCheckedPledges(new Array(settings.pledges.length).fill(false));
    setPhase("fomo_result");
  };

  const handleProceedToAudit = () => setPhase("ai_audit");
  const handleProceedToPledge = () => setPhase("pledge");

  const allPledgesChecked = checkedPledges.every(Boolean) && rrPledgeChecked;

  const handleConfirmTrade = () => {
    const entry = parseFloat(answers.entryPrice || "0");
    const sl = parseFloat(answers.stopLossPrice || "0");
    const tp = parseFloat(answers.takeProfitPrice || "0");
    const rr = rrResult ?? calculateRiskReward(entry, sl, tp, answers.direction ?? "long");
    const holdOption = HOLD_PERIOD_OPTIONS.find((o) => o.label === answers.holdPeriodLabel);

    const trade: TradeEntry = {
      id: nanoid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ticker: answers.ticker ?? "",
      name: answers.name ?? answers.ticker ?? "",
      direction: answers.direction ?? "long",
      status: "planning",
      entryPrice: entry,
      stopLossPrice: sl,
      takeProfitPrice: tp,
      riskRewardRatio: rr.ratio,
      riskAmount: rr.riskAmount,
      rewardAmount: rr.rewardAmount,
      plannedHoldHours: holdOption?.hours ?? 0,
      fomoScore: fomoResult?.totalScore ?? 0,
      marketFomoScore: fomoResult?.marketFomoScore ?? 0,
      userFomoScore: fomoResult?.userFomoScore ?? 0,
      fomoFactors: fomoResult?.factors ?? [],
      aiAuditResult: aiAudit ?? undefined,
      pledgeConfirmed: true,
      riskRewardPledgeConfirmed: rrPledgeChecked,
      triggerReason: answers.triggerReason ?? "",
      entryReason: answers.entryReason ?? "",
      infoSource: answers.infoSource ?? "",
      whyNow: answers.whyNow ?? "",
      holdPeriodLabel: answers.holdPeriodLabel ?? "",
      stopLossReason: answers.stopLossReason ?? "",
    };
    saveTrade(trade);

    // Auto-create price alarms
    if (settings.priceAlarmEnabled && entry > 0) {
      if (sl > 0) {
        saveAlarm({
          id: nanoid(),
          tradeId: trade.id,
          ticker: trade.ticker,
          targetPrice: sl,
          direction: trade.direction === "long" ? "below" : "above",
          type: "stop_loss",
          label: `${trade.ticker} 損切りアラーム`,
          status: "active",
          createdAt: new Date().toISOString(),
        });
      }
      if (tp > 0) {
        saveAlarm({
          id: nanoid(),
          tradeId: trade.id,
          ticker: trade.ticker,
          targetPrice: tp,
          direction: trade.direction === "long" ? "above" : "below",
          type: "take_profit",
          label: `${trade.ticker} 利確アラーム`,
          status: "active",
          createdAt: new Date().toISOString(),
        });
      }
    }

    toast.success("トレードプランを保存しました");
    setPhase("cooling");
  };

  const handleSkip = () => {
    const fomo = fomoResult;
    if (!fomo) return;
    navigate(`/skip-log?ticker=${encodeURIComponent(answers.ticker ?? "")}&fomo=${fomo.totalScore}`);
  };

  // ── Suspension Gate ──────────────────────────────────────────────────────
  if (suspended) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 border border-destructive/30 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">トレード停止中</h2>
          <p className="mt-3 text-muted-foreground">{lossStreak.suspendReason}</p>
          <Button variant="outline" onClick={() => navigate("/")} className="mt-8">
            ホームに戻る
          </Button>
        </div>
      </div>
    );
  }

  // ── Cooling Timer ────────────────────────────────────────────────────────
  if (phase === "cooling") {
    const mins = Math.floor(coolingRemaining / 60);
    const secs = coolingRemaining % 60;
    const pct = coolingMinutes > 0 ? (1 - coolingRemaining / (coolingMinutes * 60)) * 100 : 100;
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center"
        >
          <div className="relative w-40 h-40 mx-auto mb-8">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="oklch(1 0 0 / 10%)" strokeWidth="8" />
              <motion.circle
                cx="80" cy="80" r="70" fill="none"
                stroke="oklch(0.62 0.22 240)"
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={440}
                initial={{ strokeDashoffset: 440 }}
                animate={{ strokeDashoffset: 440 - (440 * pct) / 100 }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono font-bold text-3xl text-primary">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </span>
              <span className="text-xs text-muted-foreground mt-1">冷却中</span>
            </div>
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">冷却時間</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {answers.ticker} のエントリーを一時停止しています。<br />
            タイマーが終了したら再度判断してください。
          </p>
          <Button variant="outline" onClick={() => navigate("/")} className="mt-8">
            ホームに戻る
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-success/20 border border-success/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">チェック完了</h2>
          <p className="mt-3 text-muted-foreground">
            冷却時間が終了しました。今の気持ちで判断してください。
          </p>
          <div className="flex gap-3 mt-8 justify-center">
            <Button variant="outline" onClick={() => navigate("/trades")}>
              トレード記録を見る
            </Button>
            <Button onClick={() => navigate("/")}>
              ホームへ
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Pledge Screen ────────────────────────────────────────────────────────
  if (phase === "pledge") {
    return (
      <div className="min-h-screen px-4 py-8 lg:px-8">
        <div className="max-w-lg mx-auto">
          <button onClick={() => setPhase("ai_audit")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />戻る
          </button>
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">トレード誓約</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              すべての誓約にチェックを入れてから進んでください
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {settings.pledges.map((pledge, i) => (
              <div
                key={i}
                className={cn(
                  "w-full flex items-center justify-between gap-3 p-4 rounded-xl border transition-all duration-200",
                  checkedPledges[i]
                    ? "border-success/40 bg-success/10"
                    : "border-border/40 bg-card/50"
                )}
              >
                <span className={cn(
                  "text-sm font-medium flex-1",
                  checkedPledges[i] ? "text-foreground" : "text-muted-foreground"
                )}>
                  {pledge}
                </span>
                <LongPressSign
                  signed={checkedPledges[i]}
                  onSign={() => {
                    const next = [...checkedPledges];
                    next[i] = true;
                    setCheckedPledges(next);
                  }}
                />
              </div>
            ))}
          </div>

          {/* RR Pledge — mandatory */}
          <div className="mb-8 p-4 rounded-xl border border-primary/30 bg-primary/5">
            <p className="text-xs text-primary font-medium mb-3 uppercase tracking-wider">必須誓約</p>
            <div className={cn(
              "w-full flex items-center justify-between gap-3 p-3 rounded-lg border transition-all duration-200",
              rrPledgeChecked
                ? "border-primary/40 bg-primary/10"
                : "border-border/40 bg-card/50"
            )}>
              <span className={cn(
                "text-sm font-medium flex-1",
                rrPledgeChecked ? "text-foreground" : "text-muted-foreground"
              )}>
                リスクリワードについて明確な数字を計算した
                {rrResult && rrResult.isValid && (
                  <span className="ml-2 font-mono text-primary">（RR: {rrResult.ratio}）</span>
                )}
              </span>
              <LongPressSign
                signed={rrPledgeChecked}
                onSign={() => setRrPledgeChecked(true)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              見送りに記録
            </Button>
            <Button
              onClick={handleConfirmTrade}
              disabled={!allPledgesChecked}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              トレードプランを保存
            </Button>
          </div>

          {!allPledgesChecked && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              すべての誓約にチェックを入れてください
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── AI Audit Screen ──────────────────────────────────────────────────────
  if (phase === "ai_audit" && aiAudit) {
    const riskColors = {
      low: "text-success border-success/30 bg-success/10",
      medium: "text-warning border-warning/30 bg-warning/10",
      high: "text-orange-400 border-orange-400/30 bg-orange-400/10",
      critical: "text-destructive border-destructive/30 bg-destructive/10",
    };
    const riskLabels = { low: "低リスク", medium: "注意", high: "高リスク", critical: "危険" };

    return (
      <div className="min-h-screen px-4 py-8 lg:px-8">
        <div className="max-w-lg mx-auto">
          <button onClick={() => setPhase("fomo_result")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />戻る
          </button>
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">AIテクニカル監査</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              入力データに基づくテクニカル分析レポート
            </p>
          </div>

          <div className={cn("rounded-xl border p-4 mb-6 text-center", riskColors[aiAudit.overallRisk])}>
            <p className="text-xs font-medium uppercase tracking-wider mb-1">総合リスク評価</p>
            <p className="font-display text-2xl font-bold">{riskLabels[aiAudit.overallRisk]}</p>
            <p className="text-xs mt-1 opacity-80">スコア: {aiAudit.score}/100</p>
          </div>

          <div className="space-y-3 mb-6">
            {[
              { label: "RSI", value: aiAudit.rsiSignal },
              { label: "移動平均乖離", value: aiAudit.maSignal },
              { label: "出来高", value: aiAudit.volumeSignal },
              { label: "市場心理", value: aiAudit.trendSignal },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
                <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 mt-0.5">{item.label}</span>
                <span className="text-sm text-foreground">{item.value}</span>
              </div>
            ))}
          </div>

          {aiAudit.warningFlags.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 mb-6">
              <p className="text-xs font-medium text-warning mb-3 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />警告フラグ
              </p>
              <ul className="space-y-2">
                {aiAudit.warningFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-warning/90 flex items-start gap-2">
                    <span className="mt-1 w-1 h-1 rounded-full bg-warning shrink-0" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-border/30 bg-card/50 p-4 mb-8">
            <p className="text-xs font-medium text-muted-foreground mb-2">AIコメント</p>
            <p className="text-sm text-foreground leading-relaxed">{aiAudit.recommendation}</p>
          </div>

          <Button onClick={handleProceedToPledge} className="w-full bg-primary hover:bg-primary/90">
            誓約へ進む
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── FOMO Result Screen ───────────────────────────────────────────────────
  if (phase === "fomo_result" && fomoResult) {
    const levelColors = {
      low: { text: "text-success", bg: "bg-success/10", border: "border-success/30", label: "低リスク" },
      medium: { text: "text-warning", bg: "bg-warning/10", border: "border-warning/30", label: "注意" },
      high: { text: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30", label: "高リスク" },
      critical: { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", label: "危険" },
    };
    const lc = levelColors[fomoResult.level];
    const circumference = 2 * Math.PI * 54;

    return (
      <div className="min-h-screen px-4 py-8 lg:px-8">
        <div className="max-w-lg mx-auto">
          <button onClick={() => setPhase("rr_calc")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />戻る
          </button>

          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground">FOMO診断結果</h2>
            <p className="mt-2 text-sm text-muted-foreground">{answers.ticker} の衝動買いリスク分析</p>
          </div>

          {/* Total Score */}
          <div className="flex justify-center mb-8">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="oklch(1 0 0 / 10%)" strokeWidth="8" />
                <motion.circle
                  cx="60" cy="60" r="54" fill="none"
                  stroke={fomoResult.level === "critical" ? "oklch(0.6 0.22 25)" :
                    fomoResult.level === "high" ? "oklch(0.65 0.2 40)" :
                    fomoResult.level === "medium" ? "oklch(0.75 0.18 80)" : "oklch(0.65 0.18 160)"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - (circumference * fomoResult.totalScore) / 100 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className={cn("font-display font-bold text-3xl num", lc.text)}
                >
                  {fomoResult.totalScore}
                </motion.span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>
          </div>

          {/* Market vs User FOMO */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl border border-border/30 bg-card/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">銘柄のFOMO</p>
              <p className={cn("font-display font-bold text-2xl num",
                fomoResult.marketFomoScore >= 70 ? "text-destructive" :
                fomoResult.marketFomoScore >= 50 ? "text-warning" : "text-success"
              )}>
                {fomoResult.marketFomoScore}
              </p>
              <p className="text-xs text-muted-foreground mt-1">市場側</p>
            </div>
            <div className="rounded-xl border border-border/30 bg-card/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">自分のFOMO</p>
              <p className={cn("font-display font-bold text-2xl num",
                fomoResult.userFomoScore >= 70 ? "text-destructive" :
                fomoResult.userFomoScore >= 50 ? "text-warning" : "text-success"
              )}>
                {fomoResult.userFomoScore}
              </p>
              <p className="text-xs text-muted-foreground mt-1">ユーザー側</p>
            </div>
          </div>

          {/* Level badge */}
          <div className={cn("rounded-xl border p-4 mb-6 text-center", lc.bg, lc.border)}>
            <span className={cn("font-display font-bold text-lg", lc.text)}>{lc.label}</span>
            <p className={cn("text-sm mt-1", lc.text, "opacity-80")}>{fomoResult.summary}</p>
          </div>

          {/* Factors */}
          <div className="space-y-2 mb-8">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">診断要素</p>
            {fomoResult.factors.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/20">
                {f.risk ? (
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-success shrink-0" />
                )}
                <span className="text-sm text-foreground flex-1">{f.label}</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  f.type === "market" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                )}>
                  {f.type === "market" ? "市場" : "自分"}
                </span>
              </div>
            ))}
          </div>

          {/* Cooling time selection */}
          <div className="mb-6">
            <p className="text-sm font-medium text-foreground mb-3">冷却時間を選択</p>
            <div className="grid grid-cols-2 gap-2">
              {settings.coolingOptions.map((mins) => {
                const label = mins < 60 ? `${mins}分` : mins < 1440 ? `${Math.round(mins / 60)}時間` : "翌営業日";
                return (
                  <button
                    key={mins}
                    onClick={() => setCoolingMinutes(mins)}
                    className={cn(
                      "py-3 rounded-lg border text-sm font-medium transition-all",
                      coolingMinutes === mins
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/30 bg-card/50 text-muted-foreground hover:border-border/60"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSkip} className="flex-1">
              見送りに記録
            </Button>
            <Button
              onClick={handleProceedToAudit}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              AIテクニカル監査へ
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── RR Calculator Screen ─────────────────────────────────────────────────
  if (phase === "rr_calc") {
    const entry = parseFloat(answers.entryPrice || "0");
    const sl = parseFloat(answers.stopLossPrice || "0");
    const tp = parseFloat(answers.takeProfitPrice || "0");
    const liveRR = entry > 0 && sl > 0 && tp > 0
      ? calculateRiskReward(entry, sl, tp, answers.direction ?? "long")
      : null;

    return (
      <div className="min-h-screen px-4 py-8 lg:px-8">
        <div className="max-w-lg mx-auto">
          <button onClick={() => { setPhase("questions"); setCurrentStep(STEPS.length - 1); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />戻る
          </button>
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">リスクリワード計算</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              価格を入力してRR比を自動計算します
            </p>
          </div>

          {/* Direction */}
          <div className="mb-5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">取引方向</label>
            <div className="grid grid-cols-2 gap-2">
              {(["long", "short"] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => updateAnswer("direction", dir)}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-all",
                    answers.direction === dir
                      ? dir === "long"
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-border/30 bg-card/50 text-muted-foreground hover:border-border/60"
                  )}
                >
                  {dir === "long" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {dir === "long" ? "ロング（買い）" : "ショート（売り）"}
                </button>
              ))}
            </div>
          </div>

          {/* Price inputs */}
          {[
            { key: "entryPrice", label: "エントリー価格", placeholder: "例: 150.00" },
            { key: "stopLossPrice", label: "損切り価格", placeholder: "例: 145.00" },
            { key: "takeProfitPrice", label: "利確価格", placeholder: "例: 165.00" },
            { key: "positionSize", label: "ポジションサイズ（任意）", placeholder: "例: 100（株数・枚数）" },
          ].map((field) => (
            <div key={field.key} className="mb-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                {field.label}
              </label>
              <Input
                type="number"
                placeholder={field.placeholder}
                value={answers[field.key as keyof Answers] as string ?? ""}
                onChange={(e) => updateAnswer(field.key, e.target.value)}
                className="bg-card/50 border-border/40 font-mono text-lg h-12"
              />
            </div>
          ))}

          {/* Live RR Display */}
          {liveRR && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-xl border p-5 mb-6",
                !liveRR.isValid ? "border-destructive/30 bg-destructive/5" :
                liveRR.ratio >= settings.minRiskRewardRatio ? "border-success/30 bg-success/5" :
                liveRR.ratio >= 1.0 ? "border-warning/30 bg-warning/5" :
                "border-destructive/30 bg-destructive/5"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">リスクリワード比</span>
                <span className={cn(
                  "font-display font-bold text-3xl num",
                  !liveRR.isValid ? "text-destructive" :
                  liveRR.ratio >= settings.minRiskRewardRatio ? "text-success" :
                  liveRR.ratio >= 1.0 ? "text-warning" : "text-destructive"
                )}>
                  1 : {liveRR.isValid ? liveRR.ratio : "—"}
                </span>
              </div>
              {liveRR.isValid && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">リスク</p>
                    <p className="font-mono text-destructive font-medium">-{liveRR.riskPercent}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">リワード</p>
                    <p className="font-mono text-success font-medium">+{liveRR.rewardPercent}%</p>
                  </div>
                </div>
              )}
              {liveRR.warning && (
                <p className="text-xs text-warning mt-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  {liveRR.warning}
                </p>
              )}
            </motion.div>
          )}

          <Button
            onClick={handleRRNext}
            disabled={!answers.entryPrice || !answers.stopLossPrice || !answers.takeProfitPrice}
            className="w-full bg-primary hover:bg-primary/90 h-12"
          >
            FOMO診断へ進む
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Questions ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-muted/30">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <button onClick={prev} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              {currentStep === 0 ? "ホーム" : "戻る"}
            </button>
            <span className="text-sm text-muted-foreground font-mono">
              {currentStep + 1} / {STEPS.length}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            >
              <h2 className="font-display text-2xl font-bold text-foreground lg:text-3xl">
                {step.question}
              </h2>
              {step.sub && (
                <p className="mt-2 text-sm text-muted-foreground">{step.sub}</p>
              )}

              <div className="mt-8">
                {step.key === "ticker" && (
                  <Input
                    placeholder="例: NVDA、トヨタ、BTC"
                    value={answers.ticker ?? ""}
                    onChange={(e) => updateAnswer("ticker", e.target.value)}
                    className="bg-card/50 border-border/40 py-6 text-lg font-mono"
                    autoFocus
                  />
                )}

                {step.key === "direction" && (
                  <div className="grid grid-cols-2 gap-3">
                    {(["long", "short"] as const).map((dir) => (
                      <button
                        key={dir}
                        onClick={() => updateAnswer("direction", dir)}
                        className={cn(
                          "flex flex-col items-center gap-2 py-6 rounded-xl border text-sm font-medium transition-all",
                          answers.direction === dir
                            ? dir === "long"
                              ? "border-success/40 bg-success/10 text-success"
                              : "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-border/30 bg-card/50 text-muted-foreground hover:border-border/60"
                        )}
                      >
                        {dir === "long" ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                        {dir === "long" ? "ロング（買い）" : "ショート（売り）"}
                      </button>
                    ))}
                  </div>
                )}

                {step.key === "trigger" && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {TRIGGER_REASONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => updateAnswer("triggerReason", r)}
                        className={cn(
                          "rounded-lg border px-4 py-3 text-left text-sm transition-all",
                          answers.triggerReason === r
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border/30 bg-card/50 text-muted-foreground hover:border-border/60"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}

                {step.key === "reason" && (
                  <Textarea
                    placeholder="この銘柄を取引したい理由を具体的に書いてください…"
                    value={answers.entryReason ?? ""}
                    onChange={(e) => updateAnswer("entryReason", e.target.value)}
                    className="min-h-[120px] bg-card/50 border-border/40"
                    autoFocus
                  />
                )}

                {step.key === "source" && (
                  <Input
                    placeholder="例: Twitter、YouTube、四季報、友人から…"
                    value={answers.infoSource ?? ""}
                    onChange={(e) => updateAnswer("infoSource", e.target.value)}
                    className="bg-card/50 border-border/40 py-6 text-lg"
                    autoFocus
                  />
                )}

                {step.key === "whyNow" && (
                  <Textarea
                    placeholder="明日ではなく今取引したい理由は…"
                    value={answers.whyNow ?? ""}
                    onChange={(e) => updateAnswer("whyNow", e.target.value)}
                    className="min-h-[120px] bg-card/50 border-border/40"
                    autoFocus
                  />
                )}

                {step.key === "holdPeriod" && (
                  <div className="grid grid-cols-2 gap-2">
                    {HOLD_PERIOD_OPTIONS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          updateAnswer("holdPeriodLabel", p.label);
                          updateAnswer("plannedHoldHours", p.hours);
                        }}
                        className={cn(
                          "rounded-lg border px-4 py-3 text-sm font-medium transition-all",
                          answers.holdPeriodLabel === p.label
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border/30 bg-card/50 text-muted-foreground hover:border-border/60"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}

                {step.key === "stopLoss" && (
                  <Input
                    placeholder="例: -10%で損切り、1800円以下で売却、未定"
                    value={answers.stopLossReason ?? ""}
                    onChange={(e) => updateAnswer("stopLossReason", e.target.value)}
                    className="bg-card/50 border-border/40 py-6 text-lg"
                    autoFocus
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-12 flex justify-end"
          >
            <Button
              onClick={next}
              disabled={!canProceed()}
              className="bg-primary px-8 py-6 font-display text-base font-semibold hover:bg-primary/90 disabled:opacity-40"
            >
              {currentStep === STEPS.length - 1 ? "価格入力へ" : "次へ"}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
