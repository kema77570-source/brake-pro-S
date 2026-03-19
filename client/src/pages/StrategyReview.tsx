// BRAKE Pro — Strategy Change Review Flow
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle, Shield, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getTrade, saveTrade } from "@/lib/storage";
import { labelToCategory, CATEGORY_LABELS, isEscalation } from "@/lib/holdingPeriod";
import {
  getTransitionFlow, scoreAnswers, scoreToVerdict, VERDICT_LABELS,
} from "@/lib/strategyChangeQuestions";
import type { HoldingCategory, StrategyChangeRecord } from "@/lib/types";
import { DEFAULT_HOLDING_LIMITS } from "@/lib/types";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";

// Which holding categories to show as options
const CATEGORY_OPTIONS: { key: HoldingCategory; label: string; emoji: string; desc: string }[] = [
  { key: "day",      label: "デイトレード",    emoji: "⚡", desc: "当日中" },
  { key: "short",    label: "短期保有",        emoji: "📅", desc: "3営業日" },
  { key: "swing",    label: "スイングトレード", emoji: "📆", desc: "14日" },
  { key: "medium",   label: "中期投資",        emoji: "🗓️", desc: "〜180日" },
  { key: "long",     label: "長期投資",        emoji: "💎", desc: "180日超" },
];

type FlowPhase = "select_category" | "stage1" | "stage1_result" | "stage2" | "final_verdict";

export default function StrategyReview() {
  const [, params] = useRoute("/strategy-review/:tradeId");
  const [, navigate] = useLocation();
  const { settings } = useApp();
  const tradeId = params?.tradeId ?? "";

  const trade = getTrade(tradeId);

  const [phase, setPhase] = useState<FlowPhase>("select_category");
  const [toCategory, setToCategory] = useState<HoldingCategory | null>(null);
  const [stage1Answers, setStage1Answers] = useState<Record<string, string>>({});
  const [stage2Answers, setStage2Answers] = useState<Record<string, string>>({});
  const [stage1Score, setStage1Score] = useState(0);
  const [stage1Step, setStage1Step] = useState(0);
  const [stage2Step, setStage2Step] = useState(0);
  const [finalRecord, setFinalRecord] = useState<StrategyChangeRecord | null>(null);

  if (!trade) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">取引が見つかりません</p>
          <Button onClick={() => navigate("/trades")} className="mt-4">取引一覧へ</Button>
        </div>
      </div>
    );
  }

  const fromCategory: HoldingCategory = trade.holdingCategory ?? labelToCategory(trade.holdPeriodLabel);
  const flow = toCategory ? getTransitionFlow(fromCategory, toCategory) : null;

  const s1Questions = flow?.stage1 ?? [];
  const s2Questions = flow?.stage2 ?? [];
  const currentS1Q = s1Questions[stage1Step];
  const currentS2Q = s2Questions[stage2Step];

  const handleSelectCategory = (cat: HoldingCategory) => {
    setToCategory(cat);
    setPhase("stage1");
    setStage1Step(0);
    setStage1Answers({});
    setStage2Answers({});
  };

  const handleS1Next = () => {
    if (stage1Step < s1Questions.length - 1) {
      setStage1Step(s => s + 1);
    } else {
      const score = scoreAnswers(stage1Answers, s1Questions);
      setStage1Score(score);
      setPhase("stage1_result");
    }
  };

  const handleS2Next = () => {
    if (stage2Step < s2Questions.length - 1) {
      setStage2Step(s => s + 1);
    } else {
      const combinedAnswers = { ...stage1Answers, ...stage2Answers };
      const combinedScore = scoreAnswers(combinedAnswers, [...s1Questions, ...s2Questions]);
      const { verdict, dangerLevel, recommendedAction } = scoreToVerdict(combinedScore);

      const record: StrategyChangeRecord = {
        id: nanoid(),
        timestamp: new Date().toISOString(),
        fromCategory,
        toCategory: toCategory!,
        stage: 2,
        answers: combinedAnswers,
        verdict,
        dangerLevel,
        score: combinedScore,
        recommendedAction,
      };
      setFinalRecord(record);
      setPhase("final_verdict");
    }
  };

  const handleApproveChange = () => {
    if (!toCategory || !finalRecord) return;
    const cat = toCategory;
    const limits = settings.holdingLimits ?? DEFAULT_HOLDING_LIMITS;
    const limitHours = limits[cat];
    const baseTime = trade.entryTime ? new Date(trade.entryTime) : new Date(trade.createdAt);
    const newDeadline = limitHours < 99999
      ? new Date(baseTime.getTime() + limitHours * 3600 * 1000).toISOString()
      : undefined;

    saveTrade({
      ...trade,
      holdingCategory: cat,
      holdPeriodLabel: CATEGORY_LABELS[cat],
      holdingDeadline: newDeadline,
      strategyChanges: [...(trade.strategyChanges ?? []), finalRecord],
    });
    toast.success(`保有区分を「${CATEGORY_LABELS[cat]}」に更新しました`);
    navigate(`/trades/${trade.id}`);
  };

  const handleStage1Approve = () => {
    const { verdict, dangerLevel, recommendedAction } = scoreToVerdict(stage1Score);
    const record: StrategyChangeRecord = {
      id: nanoid(),
      timestamp: new Date().toISOString(),
      fromCategory,
      toCategory: toCategory!,
      stage: 1,
      answers: stage1Answers,
      verdict,
      dangerLevel,
      score: stage1Score,
      recommendedAction,
    };
    setFinalRecord(record);
    setPhase("final_verdict");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Progress */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted/30 z-50">
        <motion.div
          className="h-full bg-amber-400"
          animate={{ width: phase === "select_category" ? "10%" : phase === "stage1" ? "30%" : phase === "stage1_result" ? "50%" : phase === "stage2" ? "75%" : "100%" }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          <button onClick={() => navigate(`/trades/${trade.id}`)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" /> 戻る
          </button>

          <AnimatePresence mode="wait">

            {/* ── Select new category ── */}
            {phase === "select_category" && (
              <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-300">保有期限の確認</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        このポジションは当初「<strong className="text-foreground">{CATEGORY_LABELS[fromCategory]}</strong>」として記録されています。<br />
                        現在、設定した保有期限を超えようとしています。
                      </p>
                      <p className="text-xs text-amber-300/80 mt-2 font-medium">
                        この変更は、戦略の更新ですか？それとも、損切りや決済の先延ばしですか？
                      </p>
                    </div>
                  </div>
                </div>

                <h2 className="font-display text-2xl font-bold text-foreground mb-2">保有区分を変更する</h2>
                <p className="text-sm text-muted-foreground mb-6">変更先の保有区分を選択してください</p>

                <div className="space-y-2">
                  {CATEGORY_OPTIONS.filter(c => c.key !== fromCategory).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => handleSelectCategory(opt.key)}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all",
                        isEscalation(fromCategory, opt.key)
                          ? "border-amber-500/30 bg-amber-500/8 hover:bg-amber-500/15"
                          : "border-border/30 bg-card/50 hover:border-border/60",
                        "hover:text-foreground text-muted-foreground"
                      )}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                        <p className="text-xs opacity-60">{opt.desc}</p>
                      </div>
                      {isEscalation(fromCategory, opt.key) && (
                        <span className="text-[10px] text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5">審査あり</span>
                      )}
                      <ArrowRight className="w-4 h-4 opacity-40" />
                    </button>
                  ))}
                </div>

                <Button variant="ghost" onClick={() => navigate(`/trades/${trade.id}`)} className="w-full mt-4 text-muted-foreground">
                  あとで見る
                </Button>
              </motion.div>
            )}

            {/* ── Stage 1 questions ── */}
            {phase === "stage1" && currentS1Q && (
              <motion.div key={`s1-${stage1Step}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <div className="flex items-center justify-between mb-8">
                  <span className="text-xs text-muted-foreground bg-card border border-border/30 px-2 py-1 rounded">
                    一次判定 {stage1Step + 1} / {s1Questions.length}
                  </span>
                  <span className="text-xs text-amber-400">
                    {CATEGORY_LABELS[fromCategory]} → {toCategory ? CATEGORY_LABELS[toCategory] : ""}
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold text-foreground mb-2">{currentS1Q.text}</h2>
                <Textarea
                  placeholder={currentS1Q.placeholder || "正直に答えてください…"}
                  value={stage1Answers[currentS1Q.id] ?? ""}
                  onChange={e => setStage1Answers(a => ({ ...a, [currentS1Q.id]: e.target.value }))}
                  className="min-h-[120px] bg-card/50 border-border/40 mt-6"
                  autoFocus
                />
                <div className="flex justify-end mt-6">
                  <Button
                    onClick={handleS1Next}
                    disabled={!(stage1Answers[currentS1Q.id] ?? "").trim()}
                    className="bg-primary"
                  >
                    {stage1Step < s1Questions.length - 1 ? "次へ" : "一次判定へ"}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Stage 1 result ── */}
            {phase === "stage1_result" && (
              <motion.div key="s1result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
                {(() => {
                  const { verdict, dangerLevel, recommendedAction } = scoreToVerdict(stage1Score);
                  const isRisky = dangerLevel === "high" || stage1Score >= 40;
                  return (
                    <>
                      <div className={cn(
                        "rounded-2xl border p-6 mb-6 text-center",
                        isRisky ? "bg-destructive/8 border-destructive/20" : "bg-emerald-500/8 border-emerald-500/20"
                      )}>
                        <div className="text-4xl mb-3">{isRisky ? "⚠️" : "✅"}</div>
                        <p className="font-display font-bold text-lg text-foreground">{VERDICT_LABELS[verdict]}</p>
                        <p className="text-xs text-muted-foreground mt-1">危険度: <span className={cn(
                          "font-semibold",
                          dangerLevel === "high" ? "text-destructive" : dangerLevel === "medium" ? "text-amber-400" : "text-emerald-400"
                        )}>{dangerLevel === "high" ? "高" : dangerLevel === "medium" ? "中" : "低"}</span></p>
                        <div className="mt-3 pt-3 border-t border-border/20">
                          <p className="text-xs text-muted-foreground">推奨アクション</p>
                          <p className="text-sm font-medium text-foreground mt-0.5">{recommendedAction}</p>
                        </div>
                      </div>

                      {isRisky ? (
                        <div className="space-y-3">
                          <p className="text-sm text-center text-muted-foreground mb-2">
                            危険信号が検出されました。詳細な確認（{s2Questions.length}問）が必要です。
                          </p>
                          <Button onClick={() => { setStage2Step(0); setPhase("stage2"); }} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                            詳細確認へ進む（{s2Questions.length}問）
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                          <Button variant="outline" onClick={() => navigate(`/trades/${trade.id}`)} className="w-full">
                            あとで見る
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Button onClick={handleStage1Approve} className="w-full bg-primary">
                            <CheckCircle className="mr-2 w-4 h-4" />
                            戦略更新として承認
                          </Button>
                          <Button variant="outline" onClick={() => { setStage2Step(0); setPhase("stage2"); }} className="w-full">
                            念のため詳細確認する
                          </Button>
                          <Button variant="ghost" onClick={() => navigate(`/trades/${trade.id}`)} className="w-full text-muted-foreground">
                            あとで見る
                          </Button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </motion.div>
            )}

            {/* ── Stage 2 questions ── */}
            {phase === "stage2" && currentS2Q && (
              <motion.div key={`s2-${stage2Step}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <div className="flex items-center justify-between mb-8">
                  <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                    詳細確認 {stage2Step + 1} / {s2Questions.length}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[fromCategory]} → {toCategory ? CATEGORY_LABELS[toCategory] : ""}
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold text-foreground mb-2">{currentS2Q.text}</h2>
                <Textarea
                  placeholder={currentS2Q.placeholder || "正直に答えてください…"}
                  value={stage2Answers[currentS2Q.id] ?? ""}
                  onChange={e => setStage2Answers(a => ({ ...a, [currentS2Q.id]: e.target.value }))}
                  className="min-h-[120px] bg-card/50 border-border/40 mt-6"
                  autoFocus
                />
                <div className="flex justify-end mt-6">
                  <Button
                    onClick={handleS2Next}
                    disabled={!(stage2Answers[currentS2Q.id] ?? "").trim()}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {stage2Step < s2Questions.length - 1 ? "次へ" : "最終判定へ"}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Final verdict ── */}
            {phase === "final_verdict" && finalRecord && (
              <motion.div key="final" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                <div className={cn(
                  "rounded-2xl border p-6 mb-6",
                  finalRecord.dangerLevel === "high" ? "bg-destructive/8 border-destructive/20" :
                  finalRecord.dangerLevel === "medium" ? "bg-amber-500/8 border-amber-500/20" :
                  "bg-emerald-500/8 border-emerald-500/20"
                )}>
                  <div className="text-center mb-4">
                    <div className="text-5xl mb-3">
                      {finalRecord.verdict === "strategy_update" ? "✅" :
                       finalRecord.verdict === "delay" ? "⏳" : "🚨"}
                    </div>
                    <p className="font-display font-bold text-xl text-foreground">
                      {VERDICT_LABELS[finalRecord.verdict]}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      危険度: <span className={cn(
                        "font-semibold",
                        finalRecord.dangerLevel === "high" ? "text-destructive" :
                        finalRecord.dangerLevel === "medium" ? "text-amber-400" : "text-emerald-400"
                      )}>{finalRecord.dangerLevel === "high" ? "高" : finalRecord.dangerLevel === "medium" ? "中" : "低"}</span>
                    </p>
                  </div>
                  <div className="pt-3 border-t border-border/20">
                    <p className="text-xs text-muted-foreground mb-1">推奨アクション</p>
                    <p className="text-sm font-medium text-foreground">{finalRecord.recommendedAction}</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                  {(finalRecord.verdict === "strategy_update" || finalRecord.dangerLevel !== "high") && (
                    <Button onClick={handleApproveChange} className="w-full bg-primary">
                      <CheckCircle className="mr-2 w-4 h-4" />
                      {toCategory ? CATEGORY_LABELS[toCategory] : ""}へ変更を承認
                    </Button>
                  )}
                  {finalRecord.dangerLevel === "high" && (
                    <Button onClick={() => navigate(`/trades/${trade.id}`)} className="w-full bg-destructive hover:bg-destructive/90 text-white">
                      <Shield className="mr-2 w-4 h-4" />
                      今回は見送る（損切りを検討）
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => navigate(`/trades/${trade.id}`)} className="w-full">
                    あとで見る
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
