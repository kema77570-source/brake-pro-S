// BRAKE Pro — CheckFlow Page
// Design: Dark Financial × Neo-Brutalist
// Full trade psychology check: FOMO, Risk/Reward, AI Audit, Pledges

import { useState, useCallback, useEffect, useRef } from "react";
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
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LongPressSign } from "@/components/LongPressSign";
import OrderFormModal from "@/components/OrderFormModal";
import TickerSearchDropdown from "@/components/TickerSearchDropdown";
import { useApp } from "@/contexts/AppContext";
import { calculateFomoScore, calculateRiskReward, generateAIAudit } from "@/lib/analysis";
import { saveTrade, saveAlarm } from "@/lib/storage";
import { fetchCryptoFearGreed } from "@/lib/marketApi";
import type { TradeEntry, FomoFactor, AIAuditResult } from "@/lib/types";
import { TRIGGER_REASONS, HOLD_PERIOD_OPTIONS, DEFAULT_HOLDING_LIMITS } from "@/lib/types";
import { labelToCategory } from "@/lib/holdingPeriod";
import {
  MODE_QUESTIONS, getMode, calcFomoQuizScores, SCORE_OPTIONS, AXIS_LABELS, AXIS_COLORS,
  type FomoQuizScores,
} from "@/lib/fomoQuiz";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

type Phase = "questions" | "deep_questions" | "fomo_questions" | "daytrader_warning" | "rr_calc" | "fomo_result" | "ai_audit" | "pledge" | "order_confirm" | "order_broker" | "order_form" | "cooling" | "done";

const DAYTRADER_WARNING_KEY = "brake_daytrader_warning_dismissed";

interface Answers {
  ticker: string;
  name: string;
  direction: "long" | "short";
  mindset: string;           // "rule" | "mostly_rule" | "neutral" | "mostly_emotion" | "emotion"
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

// ── 最初の3問（壁を低く）
const STEPS_CORE = [
  { key: "ticker",    question: "銘柄は？",           sub: "ティッカーシンボルまたは銘柄名を入力" },
  { key: "direction", question: "ロング？ ショート？",  sub: "取引方向を選択" },
  { key: "mindset",   question: "今回はどちらに近い？", sub: "正直に答えるほど振り返りに活きます" },
];

// ── 深掘り5問
const STEPS_DEEP = [
  { key: "reason",     question: "エントリーの根拠は？",   sub: "具体的に書くほど、自分の判断を客観視できます" },
  { key: "source",     question: "情報源はどこですか？",    sub: "例: Twitter、YouTube、決算資料、友人…" },
  { key: "whyNow",     question: "なぜ今入るのですか？",    sub: "明日ではダメな理由を言語化してください" },
  { key: "holdPeriod", question: "いつまで保有する予定？",  sub: "デイトレ・スイングなどスタイルを選択" },
  { key: "stopLoss",   question: "損切りラインは？",        sub: "未定の場合は正直に「未定」と記入" },
];

const MINDSET_OPTIONS = [
  { key: "rule",           label: "完全にルール通り",   emoji: "🟢", desc: "計画通り・感情なし" },
  { key: "mostly_rule",    label: "ほぼルール通り",     emoji: "🔵", desc: "概ね計画に沿っている" },
  { key: "neutral",        label: "どちらとも言えない", emoji: "⚪", desc: "判断しにくい" },
  { key: "mostly_emotion", label: "やや感情寄り",       emoji: "🟡", desc: "少し衝動を感じる" },
  { key: "emotion",        label: "明らかに感情寄り",   emoji: "🔴", desc: "FOMO・焦りを感じている" },
];

const HOLD_PERIOD_CARDS = [
  { label: "当日（デイトレード）", hours: 0.5,  emoji: "⚡", style: "デイトレ",  desc: "当日中に決済" },
  { label: "数日（スイング）",     hours: 72,   emoji: "📅", style: "スイング",  desc: "数日〜1週間" },
  { label: "1週間〜1ヶ月",         hours: 336,  emoji: "📆", style: "短期",      desc: "1週間〜1ヶ月" },
  { label: "数ヶ月",               hours: 2160, emoji: "🗓️", style: "中期",      desc: "数ヶ月保有" },
  { label: "1年以上",              hours: 8760, emoji: "💎", style: "長期",      desc: "1年以上の長期" },
  { label: "未定",                 hours: 0,    emoji: "❓", style: "未定",      desc: "まだ決めていない" },
];

const pageVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

// ── Daytrader FX/CFD Warning Component ───────────────────────────────────
function DaytraderWarningScreen({ onChoice }: { onChoice: (proceed: boolean, neverShow: boolean) => void }) {
  const [neverShow, setNeverShow] = useState(false);
  const [answered, setAnswered] = useState<boolean | null>(null);

  const handleAnswer = (proceed: boolean) => {
    setAnswered(proceed);
  };

  const handleConfirm = () => {
    onChoice(answered ?? true, neverShow);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
        </div>

        <h2 className="text-center font-display text-xl font-bold text-foreground mb-2">
          デイトレーダーへのご確認
        </h2>
        <p className="text-center text-xs text-muted-foreground mb-6">
          あなたはデイトレードを選択されています
        </p>

        {/* Warning body */}
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5 mb-6 space-y-3">
          <p className="text-sm text-foreground/90 leading-relaxed">
            FXやCFDなどのレバレッジ商品は、<strong className="text-amber-300">現物株と異なりロスカットが存在します。</strong>
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            これは「損失が一定額を超えると強制決済される」仕組みであり、
            相場の一時的な揺れでポジションが消える可能性があります。
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            こうした構造は<strong className="text-amber-300">心理的安全性を著しく損ない</strong>、
            冷静な判断よりも恐怖・衝動によるトレードを誘発しやすくなります。
            あなたにはその道が向いていない可能性があります。
          </p>
          <div className="pt-1 border-t border-amber-500/20">
            <p className="text-sm font-semibold text-amber-300">
              それでも、FX・CFDのデイトレードを続けますか？
            </p>
          </div>
        </div>

        {/* Yes / No */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => handleAnswer(false)}
            className={cn(
              "py-3 rounded-xl border text-sm font-medium transition-all",
              answered === false
                ? "bg-success/20 border-success/50 text-success"
                : "bg-card/50 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            いいえ、見直します
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className={cn(
              "py-3 rounded-xl border text-sm font-medium transition-all",
              answered === true
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                : "bg-card/50 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            はい、続けます
          </button>
        </div>

        {/* Never show again */}
        <label className="flex items-center gap-3 cursor-pointer mb-6 px-1">
          <div
            onClick={() => setNeverShow(n => !n)}
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
              neverShow
                ? "bg-primary border-primary"
                : "border-border/60 bg-transparent"
            )}
          >
            {neverShow && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
          </div>
          <span className="text-xs text-muted-foreground">
            この警告を二度と表示しない
          </span>
        </label>

        <Button
          disabled={answered === null}
          onClick={handleConfirm}
          className="w-full"
        >
          チェックを続ける
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>

        {answered === false && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            ※ 「いいえ」を選んでもチェックは続行されます。現物株やスイングへの切り替えをご検討ください。
          </p>
        )}
      </motion.div>
    </div>
  );
}

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

  // FOMO詳細質問票
  const [fomoQuizStep, setFomoQuizStep] = useState(0);
  const [fomoQuizAnswers, setFomoQuizAnswers] = useState<number[]>([]);
  const [fomoQuizScores, setFomoQuizScores] = useState<FomoQuizScores | null>(null);

  // 銘柄コードから価格自動取得
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [fetchedPrice, setFetchedPrice] = useState<string | null>(null);
  const priceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // 価格自動取得（debounce 800ms）
  const fetchCurrentPrice = useCallback(async (code: string) => {
    if (!code || code.length < 2) return;
    setFetchingPrice(true);
    setFetchedPrice(null);
    try {
      const res = await axios.get(`${API_BASE}/api/quote/${encodeURIComponent(code)}`);
      const row = res.data?.rows?.[0];
      const price = row?.last_price ?? row?.cur_price ?? row?.price;
      if (price != null && price > 0) {
        const priceStr = String(price);
        setFetchedPrice(priceStr);
        setAnswers((prev) => ({ ...prev, entryPrice: priceStr }));
      }
    } catch {
      // OpenDが未起動の場合は無視
    } finally {
      setFetchingPrice(false);
    }
  }, []);

  const handleTickerChange = useCallback((value: string) => {
    updateAnswer("ticker", value);
    setFetchedPrice(null);
    if (priceTimerRef.current) clearTimeout(priceTimerRef.current);
    if (value.trim().length >= 2) {
      priceTimerRef.current = setTimeout(() => {
        fetchCurrentPrice(value.trim());
      }, 800);
    }
  }, [updateAnswer, fetchCurrentPrice]);

  const TOTAL_STEPS = STEPS_CORE.length + STEPS_DEEP.length;
  const currentSteps = phase === "deep_questions" ? STEPS_DEEP : STEPS_CORE;
  const step = currentSteps[currentStep];
  const progressOffset = phase === "deep_questions" ? STEPS_CORE.length : 0;
  const progress = ((progressOffset + currentStep + 1) / TOTAL_STEPS) * 100;

  const canProceed = () => {
    const key = step?.key;
    if (key === "ticker") return !!(answers.ticker && answers.ticker.length > 0);
    if (key === "direction") return !!answers.direction;
    if (key === "mindset") return !!answers.mindset;
    if (key === "reason") return !!(answers.entryReason && answers.entryReason.length > 5);
    if (key === "source") return !!(answers.infoSource && answers.infoSource.length > 0);
    if (key === "whyNow") return !!(answers.whyNow && answers.whyNow.length > 5);
    if (key === "holdPeriod") return !!answers.holdPeriodLabel;
    // 中期・長期は損切り質問をスキップするため常に通過可
    if (key === "stopLoss") {
      const isLongHold = ["数ヶ月", "1年以上"].includes(answers.holdPeriodLabel ?? "");
      if (isLongHold) return true;
      return !!(answers.stopLossReason && answers.stopLossReason.length > 0);
    }
    return true;
  };

  // 中期・長期投資では損切り質問（STEPS_DEEP最終）をスキップ
  const isLongTermHold = () =>
    ["数ヶ月", "1年以上"].includes(answers.holdPeriodLabel ?? "");

  const next = () => {
    if (phase === "questions") {
      if (currentStep < STEPS_CORE.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        // コア3問完了 → 深掘り質問へ
        setCurrentStep(0);
        setPhase("deep_questions");
      }
    } else if (phase === "deep_questions") {
      const stopLossStepIdx = STEPS_DEEP.length - 1; // stopLoss は最後
      const holdPeriodStepIdx = stopLossStepIdx - 1;  // holdPeriod はその1つ前

      // holdPeriodステップから次へ: 中期/長期なら損切りをスキップ
      if (currentStep === holdPeriodStepIdx && isLongTermHold()) {
        // 損切りスキップ → FOMO詳細質問へ直接
        const mode = getMode(answers.holdPeriodLabel ?? "", answers.plannedHoldHours ?? 0);
        const qs = MODE_QUESTIONS[mode] ?? MODE_QUESTIONS.undecided;
        setFomoQuizAnswers(new Array(qs.length).fill(0));
        setFomoQuizStep(0);
        setPhase("fomo_questions");
      } else if (currentStep < STEPS_DEEP.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        // 深掘り完了 → FOMO詳細質問へ
        const mode = getMode(answers.holdPeriodLabel ?? "", answers.plannedHoldHours ?? 0);
        const qs = MODE_QUESTIONS[mode] ?? MODE_QUESTIONS.undecided;
        setFomoQuizAnswers(new Array(qs.length).fill(0));
        setFomoQuizStep(0);
        setPhase("fomo_questions");
      }
    }
  };

  const prev = () => {
    if (phase === "deep_questions") {
      if (currentStep > 0) {
        // 損切りステップから戻る時に中期/長期ならholdPeriodへスキップ
        const stopLossStepIdx = STEPS_DEEP.length - 1;
        if (currentStep === stopLossStepIdx && isLongTermHold()) {
          setCurrentStep(stopLossStepIdx - 1);
        } else {
          setCurrentStep((s) => s - 1);
        }
      } else {
        setCurrentStep(STEPS_CORE.length - 1);
        setPhase("questions");
      }
    } else {
      if (currentStep > 0) setCurrentStep((s) => s - 1);
      else navigate("/");
    }
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

  // Proceed to order confirmation screen instead of saving immediately
  const handleConfirmTrade = () => {
    setPhase("order_confirm");
  };

  const handleOrderChoice = (orderType: "moomoo" | "other" | "demo") => {
    const entry = parseFloat(answers.entryPrice || "0");
    const sl = parseFloat(answers.stopLossPrice || "0");
    const tp = parseFloat(answers.takeProfitPrice || "0");
    const rr = rrResult ?? calculateRiskReward(entry, sl, tp, answers.direction ?? "long");
    const holdOption = HOLD_PERIOD_OPTIONS.find((o) => o.label === answers.holdPeriodLabel);

    const holdingCat = labelToCategory(answers.holdPeriodLabel ?? "");
    const holdingLimits = settings.holdingLimits ?? DEFAULT_HOLDING_LIMITS;
    const limitHours = holdingCat !== "undecided" && holdingCat !== "long"
      ? (holdingLimits[holdingCat] ?? 0)
      : 0;
    const holdingDeadline = limitHours > 0
      ? new Date(Date.now() + limitHours * 3600 * 1000).toISOString()
      : undefined;

    const trade: TradeEntry = {
      id: nanoid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ticker: answers.ticker ?? "",
      name: answers.name ?? answers.ticker ?? "",
      direction: answers.direction ?? "long",
      status: orderType === "demo" ? "planning" : "planning",
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
      mindset: answers.mindset ?? "",
      triggerReason: answers.triggerReason ?? "",
      entryReason: answers.entryReason ?? "",
      infoSource: answers.infoSource ?? "",
      whyNow: answers.whyNow ?? "",
      holdPeriodLabel: answers.holdPeriodLabel ?? "",
      stopLossReason: answers.stopLossReason ?? "",
      orderType,
      holdingCategory: holdingCat,
      holdingDeadline,
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

    const orderLabel = orderType === "moomoo" ? "moomoo証券" : orderType === "demo" ? "デモ取引" : "他の証券会社";
    toast.success(`${orderLabel}として記録しました`);
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

  // ── Order Confirmation Screen（4択）─────────────────────────────────────
  if (phase === "order_confirm") {
    const entry = parseFloat(answers.entryPrice || "0");
    const sl = parseFloat(answers.stopLossPrice || "0");
    const tp = parseFloat(answers.takeProfitPrice || "0");
    const rr = rrResult ?? calculateRiskReward(entry, sl, tp, answers.direction ?? "long");
    const mindsetLabel = MINDSET_OPTIONS.find(o => o.key === answers.mindset);
    const surveyItems = [
      { label: "銘柄", value: `${answers.ticker ?? "—"}${answers.name ? ` (${answers.name})` : ""}` },
      { label: "方向", value: answers.direction === "long" ? "📈 ロング（買い）" : "📉 ショート（売り）" },
      { label: "心理状態", value: mindsetLabel ? `${mindsetLabel.emoji} ${mindsetLabel.label}` : "—" },
      { label: "エントリー理由", value: answers.entryReason || "—" },
      { label: "情報ソース", value: answers.infoSource || "—" },
      { label: "今やる理由", value: answers.whyNow || "—" },
      { label: "保有期間", value: answers.holdPeriodLabel || "—" },
      { label: "損切り根拠", value: answers.stopLossReason || "—" },
      { label: "エントリー価格", value: entry > 0 ? `$${entry}` : "—" },
      { label: "損切り価格", value: sl > 0 ? `$${sl}` : "—" },
      { label: "利確価格", value: tp > 0 ? `$${tp}` : "—" },
      { label: "RR比", value: rr.ratio > 0 ? `${rr.ratio.toFixed(2)}x` : "—" },
      { label: "FOMAスコア", value: fomoResult ? `${fomoResult.totalScore} / 100` : "—" },
    ];

    return (
      <div className="min-h-screen px-4 py-8 lg:px-8">
        <div className="max-w-lg mx-auto">
          <button onClick={() => setPhase("pledge")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />戻る
          </button>

          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">チェック完了</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              アンケートの回答を確認のうえ、次のアクションを選んでください
            </p>
          </div>

          {/* Survey summary */}
          <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">アンケート回答履歴</p>
            {surveyItems.map(({ label, value }) => (
              <div key={label} className="flex gap-2">
                <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
                <span className="text-xs text-foreground flex-1">{value}</span>
              </div>
            ))}
          </div>

          {/* 4-choice action buttons */}
          <p className="text-sm font-semibold text-foreground mb-3 text-center">次のアクションを選択</p>
          <div className="space-y-3">
            {/* 取引を続ける */}
            <button
              onClick={() => setPhase("order_broker")}
              className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">取引を続ける</p>
                  <p className="text-xs text-muted-foreground">発注画面へ進みます</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 5分待つ */}
            <button
              onClick={() => { setCoolingMinutes(5); setPhase("cooling"); }}
              className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-amber-500/30 bg-amber-500/8 hover:bg-amber-500/15 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏱️</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">5分待つ</p>
                  <p className="text-xs text-muted-foreground">冷却タイマーをスタート</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 条件を見直す */}
            <button
              onClick={() => setPhase("rr_calc")}
              className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-border/40 bg-card/60 hover:bg-card hover:border-border/70 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔄</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">条件を見直す</p>
                  <p className="text-xs text-muted-foreground">価格・損切り・利確を再確認</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 今回は見送る */}
            <button
              onClick={handleSkip}
              className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚫</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">今回は見送る</p>
                  <p className="text-xs text-muted-foreground">見送りログに記録します</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Broker Selection（取引を続けるの次）────────────────────────────────────
  if (phase === "order_broker") {
    return (
      <div className="min-h-screen px-4 py-8 lg:px-8">
        <div className="max-w-lg mx-auto">
          <button onClick={() => setPhase("order_confirm")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />戻る
          </button>

          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">発注方法を選択</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              どこで発注しますか？
            </p>
          </div>

          <div className="space-y-3">
            {/* MooMoo証券 */}
            <button
              onClick={() => setPhase("order_form")}
              className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📱</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">MooMoo証券で発注</p>
                  <p className="text-xs text-muted-foreground">注文タイプを選んで発注できます</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 他の証券会社 */}
            <button
              onClick={() => handleOrderChoice("other")}
              className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-border/40 bg-card/60 hover:bg-card hover:border-border/70 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏦</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">他の証券会社で発注</p>
                  <p className="text-xs text-muted-foreground">外部で発注・BRAKEに記録のみ</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* デモ取引 */}
            <button
              onClick={() => handleOrderChoice("demo")}
              className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-amber-500/30 bg-amber-500/8 hover:bg-amber-500/15 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧪</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">デモ取引として記録</p>
                  <p className="text-xs text-muted-foreground">実際の資金を使わず練習</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Order Form (MooMoo 8-type order) ─────────────────────────────────────
  if (phase === "order_form") {
    const entryPrice = parseFloat(answers.entryPrice || "0");
    return (
      <>
        <div className="min-h-screen px-4 py-8 lg:px-8">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setPhase("order_broker")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="w-4 h-4" />戻る
            </button>
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">注文内容を設定</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                注文タイプを選択して moomoo に送信します
              </p>
            </div>
          </div>
        </div>
        <OrderFormModal
          open={true}
          onClose={() => setPhase("order_broker")}
          onSuccess={() => {
            handleOrderChoice("moomoo");
          }}
          ticker={answers.ticker ?? ""}
          name={answers.name}
          side={answers.direction === "short" ? "SELL" : "BUY"}
          defaultPrice={entryPrice > 0 ? entryPrice : undefined}
        />
      </>
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

  // ── FOMO詳細質問票（1問ずつ）─────────────────────────────────────────────
  if (phase === "fomo_questions") {
    const mode = getMode(answers.holdPeriodLabel ?? "", answers.plannedHoldHours ?? 0);
    const questions = MODE_QUESTIONS[mode] ?? MODE_QUESTIONS.undecided;
    const currentQ = questions[fomoQuizStep];
    const fomoProgress = (fomoQuizStep / questions.length) * 100;

    const handleFomoAnswer = (score: number) => {
      const newAnswers = [...fomoQuizAnswers];
      newAnswers[fomoQuizStep] = score;
      setFomoQuizAnswers(newAnswers);

      if (fomoQuizStep < questions.length - 1) {
        setFomoQuizStep((s) => s + 1);
      } else {
        // 全問完了 → スコア計算
        const scores = calcFomoQuizScores(newAnswers, questions);
        setFomoQuizScores(scores);
        // デイトレ選択かつ警告未dismissed → 警告表示
        const isDayTrade = mode === "day";
        const dismissed = localStorage.getItem(DAYTRADER_WARNING_KEY) === "true";
        if (isDayTrade && !dismissed) {
          setPhase("daytrader_warning");
        } else {
          setPhase("rr_calc");
        }
      }
    };

    const axisColorClass: Record<string, string> = {
      urgency: "bg-red-500/15 text-red-400 border-red-500/30",
      social:  "bg-purple-500/15 text-purple-400 border-purple-500/30",
      rule:    "bg-blue-500/15 text-blue-400 border-blue-500/30",
    };

    return (
      <div className="flex min-h-screen flex-col bg-background">
        {/* Progress bar */}
        <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-muted/30">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${fomoProgress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
              <button
                onClick={() => fomoQuizStep > 0 ? setFomoQuizStep((s) => s - 1) : setPhase("questions")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />戻る
              </button>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">FOMO詳細診断</span>
                <span className="text-sm text-muted-foreground font-mono">
                  {fomoQuizStep + 1} / {questions.length}
                </span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={fomoQuizStep}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Axis badge */}
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mb-4",
                  axisColorClass[currentQ.axis]
                )}>
                  {AXIS_LABELS[currentQ.axis]}
                </span>

                <h2 className="font-display text-2xl font-bold text-foreground lg:text-3xl leading-tight">
                  {currentQ.q}
                </h2>

                <div className="mt-10 space-y-3">
                  {SCORE_OPTIONS.map(({ score, label }) => (
                    <motion.button
                      key={score}
                      onClick={() => handleFomoAnswer(score)}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all",
                        fomoQuizAnswers[fomoQuizStep] === score
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border/30 bg-card/50 text-muted-foreground hover:border-border/60 hover:text-foreground"
                      )}
                    >
                      <span className="font-mono font-bold text-xl w-7 shrink-0 text-center text-primary/80">
                        {score}
                      </span>
                      <span className="text-sm">{label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // ── Daytrader FX/CFD Warning ─────────────────────────────────────────────
  if (phase === "daytrader_warning") {
    const handleDaytraderChoice = (proceed: boolean, neverShow: boolean) => {
      if (neverShow) {
        localStorage.setItem(DAYTRADER_WARNING_KEY, "true");
      }
      setPhase("rr_calc");
    };

    return (
      <DaytraderWarningScreen onChoice={handleDaytraderChoice} />
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

          {/* FOMO詳細診断スコア */}
          {fomoQuizScores && (
            <div className="mb-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">FOMO詳細診断（3軸分析）</p>
              <div className="space-y-2.5">
                {(["urgency", "social", "rule"] as const).map((axis) => (
                  <div key={axis}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{AXIS_LABELS[axis]}</span>
                      <span className="font-mono text-foreground">{fomoQuizScores[axis]}</span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${fomoQuizScores[axis]}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: AXIS_COLORS[axis] }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">FOMO詳細スコア合計</span>
                  <span className={cn(
                    "font-mono font-bold text-lg",
                    fomoQuizScores.total >= 70 ? "text-destructive" :
                    fomoQuizScores.total >= 50 ? "text-orange-400" :
                    fomoQuizScores.total >= 30 ? "text-warning" : "text-success"
                  )}>
                    {fomoQuizScores.total} / 100
                  </span>
                </div>
              </div>
            </div>
          )}

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
          <button onClick={() => { setPhase("questions"); setCurrentStep(STEPS_CORE.length - 1); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
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
            <div className="flex flex-col items-end">
              <span className="text-sm text-muted-foreground font-mono">
                {progressOffset + currentStep + 1} / {TOTAL_STEPS}
              </span>
              {phase === "deep_questions" && currentStep === 0 && (
                <span className="text-[10px] text-primary/70 mt-0.5">深掘り質問</span>
              )}
            </div>
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
              {phase === "deep_questions" && currentStep === 0 && (
                <div className="flex items-center gap-2 mb-4 text-xs text-primary/70">
                  <span className="h-px flex-1 bg-primary/20" />
                  <span>ここから深掘り質問です</span>
                  <span className="h-px flex-1 bg-primary/20" />
                </div>
              )}
              <h2 className="font-display text-2xl font-bold text-foreground lg:text-3xl">
                {step.question}
              </h2>
              {step.sub && (
                <p className="mt-2 text-sm text-muted-foreground">{step.sub}</p>
              )}

              <div className="mt-8">
                {step.key === "ticker" && (
                  <div className="space-y-3">
                    <TickerSearchDropdown
                      value={answers.ticker ?? ""}
                      onChange={(ticker, name) => {
                        handleTickerChange(ticker);
                        if (name) updateAnswer("name", name);
                      }}
                      placeholder="例: AAPL、7203.T、テンセント…"
                      className="w-full"
                    />
                    {fetchingPrice && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        現在価格を取得中…
                      </div>
                    )}
                    {!fetchingPrice && fetchedPrice && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">moomoo 現在価格</span>
                        <span className="font-mono font-bold text-primary text-lg">{fetchedPrice}</span>
                        <span className="text-xs text-muted-foreground">（エントリー価格に自動入力）</span>
                      </div>
                    )}
                    {!fetchingPrice && !fetchedPrice && answers.ticker && answers.ticker.length >= 2 && (
                      <p className="text-xs text-muted-foreground">
                        ※ moomoo OpenDが起動中の場合、価格を自動取得します
                      </p>
                    )}
                  </div>
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

                {/* ── mindset（ルール通り vs 感情寄り）── */}
                {step.key === "mindset" && (
                  <div className="space-y-2">
                    {MINDSET_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => updateAnswer("mindset", opt.key)}
                        className={cn(
                          "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all",
                          answers.mindset === opt.key
                            ? "border-primary/50 bg-primary/12 text-foreground"
                            : "border-border/30 bg-card/50 text-muted-foreground hover:border-border/60 hover:text-foreground"
                        )}
                      >
                        <span className="text-xl shrink-0">{opt.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold">{opt.label}</p>
                          <p className="text-xs opacity-70">{opt.desc}</p>
                        </div>
                        {answers.mindset === opt.key && (
                          <CheckCircle className="w-4 h-4 text-primary ml-auto shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── エントリー理由 ── */}
                {step.key === "reason" && (
                  <Textarea
                    placeholder="この銘柄を取引したい根拠を具体的に書いてください…"
                    value={answers.entryReason ?? ""}
                    onChange={(e) => updateAnswer("entryReason", e.target.value)}
                    className="min-h-[120px] bg-card/50 border-border/40"
                    autoFocus
                  />
                )}

                {/* ── 情報源 ── */}
                {step.key === "source" && (
                  <Input
                    placeholder="例: Twitter、YouTube、決算資料、友人から…"
                    value={answers.infoSource ?? ""}
                    onChange={(e) => updateAnswer("infoSource", e.target.value)}
                    className="bg-card/50 border-border/40 py-6 text-lg"
                    autoFocus
                  />
                )}

                {/* ── 今入る理由 ── */}
                {step.key === "whyNow" && (
                  <Textarea
                    placeholder="明日ではなく今取引したい理由は…"
                    value={answers.whyNow ?? ""}
                    onChange={(e) => updateAnswer("whyNow", e.target.value)}
                    className="min-h-[120px] bg-card/50 border-border/40"
                    autoFocus
                  />
                )}

                {/* ── 保有期間（デイトレ / スイングカード）── */}
                {step.key === "holdPeriod" && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {HOLD_PERIOD_CARDS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          updateAnswer("holdPeriodLabel", p.label);
                          updateAnswer("plannedHoldHours", p.hours);
                        }}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-xl border px-4 py-3.5 text-left transition-all",
                          answers.holdPeriodLabel === p.label
                            ? "border-primary/50 bg-primary/12 text-foreground"
                            : "border-border/30 bg-card/50 text-muted-foreground hover:border-border/60 hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-lg">{p.emoji}</span>
                          <span className={cn(
                            "text-xs font-bold px-1.5 py-0.5 rounded",
                            answers.holdPeriodLabel === p.label
                              ? "bg-primary/20 text-primary"
                              : "bg-muted/40 text-muted-foreground"
                          )}>{p.style}</span>
                        </div>
                        <p className="text-sm font-medium leading-tight">{p.label}</p>
                        <p className="text-[10px] opacity-60">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── 損切りライン ── */}
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
              {phase === "questions" && currentStep === STEPS_CORE.length - 1
                ? "詳しく回答する"
                : phase === "deep_questions" && currentStep === STEPS_DEEP.length - 1
                ? "価格入力へ"
                : "次へ"}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
