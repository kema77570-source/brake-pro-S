// BRAKE Pro — FOMO分析 & 発注ページ
// 銘柄情報 → 保有期間別FOMO質問票 → 評価 + moomoo発注

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  Brain,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  SendHorizonal,
  AlertTriangle,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import axios from "axios";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ============================================================
// 定数：FOMO質問票
// ============================================================

type Axis = "urgency" | "social" | "rule";

interface Question {
  q: string;
  axis: Axis;
}

const MODE_QUESTIONS: Record<string, Question[]> = {
  day: [
    { q: "急騰・急落チャートを見て焦ってエントリーを考えていますか？", axis: "urgency" },
    { q: "今すぐ入らないとチャンスを逃すと感じていますか？", axis: "urgency" },
    { q: "SNSや掲示板で話題になっているから注目しましたか？", axis: "social" },
    { q: "他のトレーダーが利益を出しているのを見て焦っていますか？", axis: "social" },
    { q: "損切りラインを決めずにエントリーしようとしていますか？", axis: "rule" },
    { q: "今日の監視リストに事前から入っていなかった銘柄ですか？", axis: "rule" },
    { q: "出来高・板の確認をしないままエントリーしようとしていますか？", axis: "rule" },
    { q: "今日すでに損失を出していて、取り返したいと思っていますか？", axis: "urgency" },
    { q: "RR（リスクリワード）を計算せずにエントリーしようとしていますか？", axis: "rule" },
    { q: "エントリー理由が「値動きが激しい」だけになっていますか？", axis: "rule" },
  ],
  swing: [
    { q: "直近の強い動きを見て追いかけようとしていますか？", axis: "urgency" },
    { q: "今週の相場を見逃したくないという気持ちがありますか？", axis: "urgency" },
    { q: "友人や投資コミュニティで話題になっているから買いたいですか？", axis: "social" },
    { q: "他の人がこの銘柄で利益を出したという報告を見ましたか？", axis: "social" },
    { q: "ターゲット価格（利確）を決めずに入ろうとしていますか？", axis: "rule" },
    { q: "週足・日足の環境確認をしていませんか？", axis: "rule" },
    { q: "このスイングのリスク額が資産の2%を超えていますか？", axis: "rule" },
    { q: "連敗後の「取り返し」でポジションサイズを大きくしていますか？", axis: "urgency" },
    { q: "エントリー理由がテクニカル以外（SNS・話題）になっていますか？", axis: "social" },
    { q: "保有期間中のイベント（決算・指標）を確認していませんか？", axis: "rule" },
  ],
  month: [
    { q: "最近のニュースや話題性に引っ張られて注目しましたか？", axis: "social" },
    { q: "上昇が始まってから「乗り遅れた」と感じて入ろうとしていますか？", axis: "urgency" },
    { q: "投資コミュニティやSNSの期待感に影響されていますか？", axis: "social" },
    { q: "損切り設定をしないまま入ろうとしていますか？", axis: "rule" },
    { q: "複数の情報源を参照せず、一つのソースで判断していますか？", axis: "rule" },
    { q: "カタリスト（材料の期日）を確認していませんか？", axis: "rule" },
    { q: "今月のポートフォリオ配分を超えるポジションを取ろうとしていますか？", axis: "rule" },
    { q: "この銘柄に「乗れなかったら損」という感覚はありますか？", axis: "urgency" },
    { q: "他の人が利益報告をしているのを見て動こうとしていますか？", axis: "social" },
    { q: "短期急騰後にモメンタムが続くと根拠なく信じていますか？", axis: "urgency" },
  ],
  months: [
    { q: "最近の株高・市場の盛り上がりに乗り遅れたと感じていますか？", axis: "urgency" },
    { q: "投資メディアや有名人の推薦に影響されていますか？", axis: "social" },
    { q: "友人・同僚がこの銘柄で利益を出していて焦っていますか？", axis: "social" },
    { q: "バリュエーション（PER・PBR等）を確認せずに入ろうとしていますか？", axis: "rule" },
    { q: "事業内容・ビジネスモデルを十分理解していませんか？", axis: "rule" },
    { q: "定量的な目標（目標株価・撤退基準）を設定していませんか？", axis: "rule" },
    { q: "ポートフォリオに占める割合を確認せずに入ろうとしていますか？", axis: "rule" },
    { q: "「今買わないと次のチャンスは来ない」と感じていますか？", axis: "urgency" },
    { q: "他の投資家が急いで買っているから自分も買わなければと思っていますか？", axis: "social" },
    { q: "財務諸表・業績トレンドを確認せずに投資しようとしていますか？", axis: "rule" },
  ],
  longterm: [
    { q: "最近の上昇相場に乗り遅れたという焦りがありますか？", axis: "urgency" },
    { q: "著名投資家や有名人の推薦に影響されていますか？", axis: "social" },
    { q: "周囲が資産を増やしているという話を聞いて不安になっていますか？", axis: "social" },
    { q: "この企業の長期ビジョン・競争優位性を理解していませんか？", axis: "rule" },
    { q: "財務健全性（負債・キャッシュフロー）を確認していませんか？", axis: "rule" },
    { q: "競合他社との比較分析をしていませんか？", axis: "rule" },
    { q: "定期積立・資産配分計画から外れたエントリーをしようとしていますか？", axis: "rule" },
    { q: "「今が底」「最後のチャンス」という感覚で買おうとしていますか？", axis: "urgency" },
    { q: "FOMO（取り残され不安）が主な購入動機になっていますか？", axis: "urgency" },
    { q: "月次・年次の資産目標から逸脱した買い増しを考えていますか？", axis: "rule" },
  ],
  undecided: [
    { q: "保有期間を決めずにとにかく入ろうとしていますか？", axis: "urgency" },
    { q: "計画のない取引をしようとしている自覚はありますか？", axis: "rule" },
    { q: "話題性や価格の動きだけで取引しようとしていますか？", axis: "social" },
    { q: "損切りの条件が決まっていないまま入ろうとしていますか？", axis: "rule" },
    { q: "エグジット戦略（出口）が全く決まっていませんか？", axis: "rule" },
    { q: "「とりあえず入ってから考える」という気持ちがありますか？", axis: "urgency" },
    { q: "他の人が儲けているのを見て焦っている気持ちがありますか？", axis: "social" },
    { q: "計画なしの取引で過去に失敗した経験を繰り返そうとしていますか？", axis: "rule" },
    { q: "この取引に明確な根拠を3つ言えない状態ですか？", axis: "rule" },
    { q: "FOMO（取り残され不安）が主な動機になっていますか？", axis: "urgency" },
  ],
};

const HOLDING_OPTIONS = [
  { key: "day",      label: "当日",     sub: "デイトレード",   mode: "day" },
  { key: "swing",    label: "数日",     sub: "スイング",       mode: "swing" },
  { key: "month",    label: "1週間〜1ヶ月", sub: "短期",       mode: "month" },
  { key: "months",   label: "数ヶ月",   sub: "中期",           mode: "months" },
  { key: "longterm", label: "1年以上",  sub: "長期投資",       mode: "longterm" },
  { key: "undecided",label: "未定",     sub: "未計画",         mode: "undecided" },
];

const SOURCE_OPTIONS = ["チャート", "SNS/X", "YouTube", "ニュース", "掲示板", "知人・コミュニティ", "自分の分析", "その他"];
const INFO_SOURCE_OPTIONS = ["Twitter/X", "YouTube", "Reddit/掲示板", "ニュースサイト", "証券会社レポート", "自分の分析", "インフルエンサー", "その他"];

const SCORE_LABELS = ["１", "２", "３", "４", "５"];
const SCORE_DESC = ["まったく当てはまらない", "あまり当てはまらない", "やや当てはまる", "当てはまる", "強く当てはまる"];

const PIE_COLORS = ["hsl(0,65%,55%)", "hsl(270,65%,60%)", "hsl(200,65%,55%)"];

// ============================================================
// Score calculation
// ============================================================

function calcFomo(answers: number[], questions: Question[]) {
  if (answers.length === 0) return { urgency: 0, social: 0, rule: 0, total: 0 };

  const byAxis: Record<Axis, number[]> = { urgency: [], social: [], rule: [] };
  questions.forEach((q, i) => {
    if (answers[i] !== undefined) byAxis[q.axis].push(answers[i]);
  });

  const axisScore = (vals: number[]) =>
    vals.length === 0 ? 0 : Math.round(((vals.reduce((s, v) => s + v, 0) / vals.length - 1) / 4) * 100);

  const urgency = axisScore(byAxis.urgency);
  const social  = axisScore(byAxis.social);
  const rule    = axisScore(byAxis.rule);
  const total   = Math.round(urgency * 0.35 + social * 0.30 + rule * 0.35);

  return { urgency, social, rule, total };
}

function getFomoLevel(score: number) {
  if (score >= 70) return { label: "非常に高い", color: "hsl(0,80%,55%)",   bg: "hsl(0,80%,10%)",   icon: "🔴", proceed: false };
  if (score >= 50) return { label: "高い",       color: "hsl(25,85%,55%)",  bg: "hsl(25,85%,10%)",  icon: "🟠", proceed: false };
  if (score >= 30) return { label: "やや高い",   color: "hsl(50,85%,50%)",  bg: "hsl(50,85%,10%)",  icon: "🟡", proceed: true };
  return                  { label: "低い",       color: "hsl(120,60%,40%)", bg: "hsl(120,60%,9%)",  icon: "🟢", proceed: true };
}

function generateReport(scores: ReturnType<typeof calcFomo>, mode: string, _answers: number[]) {
  const { total, urgency, social, rule } = scores;
  const level = getFomoLevel(total);
  const modeLabel = HOLDING_OPTIONS.find(h => h.mode === mode)?.label ?? mode;

  const reasons: string[] = [];
  if (urgency >= 60) reasons.push("焦り・緊急性が高く、冷静な判断が難しい状態です。");
  if (social >= 60)  reasons.push("他人比較・話題性への依存が強く、外部刺激に引きずられています。");
  if (rule >= 60)    reasons.push("ルール逸脱・分析不足が見られ、手順が崩れているサインです。");
  if (reasons.length === 0) reasons.push("各軸ともに低水準で、比較的冷静な判断ができている状態です。");

  const actions: string[] = [];
  if (total >= 70) {
    actions.push("今すぐ取引を停止し、5分以上時間を置いてください。");
    actions.push("監視銘柄外であれば新規エントリーを見送ってください。");
    actions.push("今日の取引サイズを通常の半分以下に下げることを検討してください。");
  } else if (total >= 50) {
    actions.push("エントリー条件（損切り・利確・RR）を書き出してから判断してください。");
    actions.push("この取引の根拠を3つ言えるか確認してください。");
    actions.push(modeLabel === "当日" ? "監視銘柄以外は触らないようにしてください。" : "ポートフォリオ配分を再確認してください。");
  } else if (total >= 30) {
    actions.push("損切りラインと利確ラインを事前に設定してください。");
    actions.push("5分待って再評価してから発注してください。");
  } else {
    actions.push("冷静な状態です。通常通りのリスク管理でエントリー可能です。");
  }

  return { level, reasons, actions };
}

// ============================================================
// Sub-components
// ============================================================

function TagButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-sm border transition-all",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border text-muted-foreground hover:border-primary/40"
      )}
    >
      {label}
    </button>
  );
}

function ScoreRow({ index, question, value, onChange }: {
  index: number;
  question: Question;
  value: number;
  onChange: (v: number) => void;
}) {
  const axisColor: Record<Axis, string> = {
    urgency: "hsl(0,70%,55%)",
    social:  "hsl(270,65%,60%)",
    rule:    "hsl(200,65%,55%)",
  };
  const axisLabel: Record<Axis, string> = {
    urgency: "焦り",
    social:  "他人比較",
    rule:    "ルール",
  };

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-xs font-mono text-muted-foreground shrink-0 pt-0.5">Q{index + 1}</span>
        <div className="flex-1">
          <p className="text-sm text-foreground leading-relaxed">{question.q}</p>
          <span
            className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: axisColor[question.axis] + "22", color: axisColor[question.axis] }}
          >
            {axisLabel[question.axis]}
          </span>
        </div>
      </div>
      <div className="flex gap-1.5">
        {SCORE_LABELS.map((lbl, i) => (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            title={SCORE_DESC[i]}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-bold border transition-all",
              value === i + 1
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {lbl}
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-[11px] text-muted-foreground">{SCORE_DESC[value - 1]}</p>
      )}
    </div>
  );
}

// ============================================================
// Order Panel
// ============================================================

function OrderPanel({ code, direction, initialPrice }: {
  code: string;
  direction: "long" | "short";
  initialPrice: string;
}) {
  const [qty, setQty] = useState("100");
  const [price, setPrice] = useState(initialPrice);
  const [orderType, setOrderType] = useState<"NORMAL" | "MARKET">("NORMAL");
  const [simulate, setSimulate] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleOrder() {
    const numQty = parseInt(qty);
    const numPrice = parseFloat(price);
    if (isNaN(numQty) || numQty <= 0) { toast.error("数量を正しく入力してください"); return; }
    if (orderType === "NORMAL" && (isNaN(numPrice) || numPrice <= 0)) { toast.error("価格を正しく入力してください"); return; }

    setPlacing(true);
    setResult(null);
    try {
      const res = await axios.post(`${API_BASE}/api/order/place`, {
        code,
        side: direction === "long" ? "BUY" : "SELL",
        qty: numQty,
        price: orderType === "MARKET" ? 0 : numPrice,
        order_type: orderType,
        simulate,
      });
      const orderId = res.data?.order?.[0]?.order_id ?? "–";
      setResult({ ok: true, message: `発注完了 (OrderID: ${orderId})` });
      toast.success(`発注しました (${simulate ? "模擬" : "実口座"})`);
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? String(e);
      setResult({ ok: false, message: msg });
      toast.error(`発注失敗: ${msg}`);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <SendHorizonal className="w-4 h-4 text-primary" />
        moomoo 発注
      </h3>

      {/* Code + direction */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-0.5">銘柄</p>
          <p className="font-mono font-bold text-foreground">{code || "–"}</p>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border",
          direction === "long"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        )}>
          {direction === "long"
            ? <><TrendingUp className="w-4 h-4" /> Long (買い)</>
            : <><TrendingDown className="w-4 h-4" /> Short (売り)</>}
        </div>
      </div>

      {/* Qty & Price */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">数量（株・口）</label>
          <Input
            value={qty}
            onChange={e => setQty(e.target.value)}
            placeholder="100"
            className="font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            価格 {orderType === "MARKET" ? "(成行：入力不要)" : "(指値)"}
          </label>
          <Input
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0.00"
            className="font-mono"
            disabled={orderType === "MARKET"}
          />
        </div>
      </div>

      {/* Order type */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">注文種類</p>
        <div className="flex gap-2">
          {(["NORMAL", "MARKET"] as const).map(ot => (
            <button
              key={ot}
              onClick={() => setOrderType(ot)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                orderType === ot
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {ot === "NORMAL" ? "指値" : "成行"}
            </button>
          ))}
        </div>
      </div>

      {/* Simulate toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <div
          onClick={() => setSimulate(s => !s)}
          className={cn(
            "w-10 h-5 rounded-full relative transition-all",
            simulate ? "bg-primary" : "bg-border"
          )}
        >
          <div className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
            simulate ? "left-[22px]" : "left-0.5"
          )} />
        </div>
        <span className="text-sm text-muted-foreground">
          {simulate ? "模擬口座 (シミュレーション)" : "実口座"}
        </span>
      </label>

      {/* Result */}
      {result && (
        <div className={cn(
          "rounded-lg p-3 text-sm font-medium",
          result.ok
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-red-500/10 text-red-400 border border-red-500/20"
        )}>
          {result.message}
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleOrder}
        disabled={placing || !code}
      >
        {placing ? (
          <><Activity className="w-4 h-4 mr-2 animate-spin" /> 発注中…</>
        ) : (
          <><SendHorizonal className="w-4 h-4 mr-2" /> 発注する</>
        )}
      </Button>
    </div>
  );
}

// ============================================================
// Result screen
// ============================================================

function ResultScreen({
  scores,
  mode,
  answers,
  preTrade,
  onReset,
}: {
  scores: ReturnType<typeof calcFomo>;
  mode: string;
  answers: number[];
  preTrade: PreTrade;
  onReset: () => void;
}) {
  const { level, reasons, actions } = useMemo(
    () => generateReport(scores, mode, answers),
    [scores, mode, answers]
  );

  const pieData = [
    { name: "焦り・緊急性", value: Math.max(scores.urgency, 4) },
    { name: "他人比較・話題性", value: Math.max(scores.social, 4) },
    { name: "ルール逸脱・分析不足", value: Math.max(scores.rule, 4) },
  ];

  const barItems = [
    { name: "焦り・緊急性",      score: scores.urgency, color: PIE_COLORS[0] },
    { name: "他人比較・話題性依存", score: scores.social,  color: PIE_COLORS[1] },
    { name: "ルール逸脱・分析不足", score: scores.rule,    color: PIE_COLORS[2] },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* FOMO Index */}
      <div
        className="rounded-2xl border p-5 text-center"
        style={{ borderColor: level.color + "55", background: level.bg }}
      >
        <p className="text-xs text-muted-foreground mb-1">総合FOMOスコア</p>
        <div className="text-6xl font-black tracking-tight" style={{ color: level.color }}>
          {scores.total}
        </div>
        <div className="text-sm font-semibold mt-1" style={{ color: level.color }}>
          {level.icon} {level.label}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {level.proceed
            ? "ルールを守ればエントリー可能な状態です"
            : "今の状態では判断が歪みやすいです。一度立ち止まってください"}
        </p>
      </div>

      {/* Pie + Explanation */}
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">分析結果</p>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Pie (small, left) */}
          <div className="shrink-0 w-full sm:w-44">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={34}
                  outerRadius={58}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number, name: string) => [`${val}点`, name]}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PIE_COLORS[i] }} />
                  {d.name}
                </div>
              ))}
            </div>
          </div>

          {/* Explanation (right) */}
          <div className="flex-1 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">FOMOになっている理由</p>
            {reasons.map((r, i) => (
              <p key={i} className="text-sm text-foreground leading-relaxed">• {r}</p>
            ))}
            <div className="h-px bg-border my-2" />
            <p className="text-xs font-semibold text-muted-foreground">3軸スコア</p>
            {barItems.map((b, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{b.name}</span>
                  <span className="font-mono text-foreground">{b.score}</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${b.score}%` }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ background: b.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended actions */}
      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">推奨アクション</p>
        {actions.map((a, i) => (
          <div key={i} className="flex gap-2 text-sm text-foreground">
            <span className="text-primary shrink-0">▶</span>
            {a}
          </div>
        ))}
      </div>

      {/* Warning banner for high FOMO */}
      {!level.proceed && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-sm text-orange-300">
            FOMO指数が高い状態での発注は注意が必要です。
            これは金融アドバイスではなく、意思決定の質の分析です。
            最終判断はご自身の責任で行ってください。
          </p>
        </div>
      )}

      {/* Order panel */}
      <OrderPanel
        code={preTrade.code}
        direction={preTrade.direction}
        initialPrice={preTrade.price}
      />

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          最初からやり直す
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================
// Types & State
// ============================================================

interface PreTrade {
  code: string;
  price: string;
  direction: "long" | "short";
  source: string;
  reason: string;
  infoSource: string;
  whyNow: string;
  holdingKey: string;
}

const initPreTrade = (): PreTrade => ({
  code: "",
  price: "",
  direction: "long",
  source: "",
  reason: "",
  infoSource: "",
  whyNow: "",
  holdingKey: "",
});

// ============================================================
// Main component
// ============================================================

export default function FomoAnalysis() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [preTrade, setPreTrade] = useState<PreTrade>(initPreTrade());
  const [answers, setAnswers] = useState<number[]>([]);

  const currentMode = HOLDING_OPTIONS.find(h => h.key === preTrade.holdingKey)?.mode ?? "day";
  const questions = MODE_QUESTIONS[currentMode] ?? MODE_QUESTIONS.day;

  const scores = useMemo(
    () => calcFomo(answers, questions),
    [answers, questions]
  );

  function handleReset() {
    setPreTrade(initPreTrade());
    setAnswers([]);
    setStep(0);
  }

  function setAnswer(i: number, v: number) {
    setAnswers(prev => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  const canProceedStep0 = preTrade.code.trim() !== "" && preTrade.holdingKey !== "";
  const allAnswered = answers.filter(v => v > 0).length >= questions.length;

  const stepLabels = ["銘柄情報", "FOMO質問票", "評価・発注"];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          FOMO分析 & 発注
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          取引前にFOMO（取り残され不安）を評価し、合理的かどうかを確認します
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center">
        {stepLabels.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                  active  ? "bg-primary border-primary text-primary-foreground" :
                  done    ? "bg-primary/20 border-primary text-primary" :
                            "bg-card border-border text-muted-foreground"
                )}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={cn("text-[10px] mt-1 text-center", active ? "text-primary font-semibold" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={cn("h-px flex-1 mx-1 mb-5 transition-all", done ? "bg-primary" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {/* ─────────── Step 0: 銘柄情報 ─────────── */}
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-4"
          >
            {/* Code & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">銘柄コード *</label>
                <Input
                  value={preTrade.code}
                  onChange={e => setPreTrade(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="US.AAPL / HK.00700"
                  className="font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">現在価格</label>
                <Input
                  value={preTrade.price}
                  onChange={e => setPreTrade(p => ({ ...p, price: e.target.value }))}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
            </div>

            {/* Long / Short */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">方向</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreTrade(p => ({ ...p, direction: "long" }))}
                  className={cn(
                    "flex-1 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all",
                    preTrade.direction === "long"
                      ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400"
                      : "bg-card border-border text-muted-foreground hover:border-emerald-500/30"
                  )}
                >
                  <TrendingUp className="w-4 h-4" /> Long（買い）
                </button>
                <button
                  onClick={() => setPreTrade(p => ({ ...p, direction: "short" }))}
                  className={cn(
                    "flex-1 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all",
                    preTrade.direction === "short"
                      ? "bg-red-500/15 border-red-500/50 text-red-400"
                      : "bg-card border-border text-muted-foreground hover:border-red-500/30"
                  )}
                >
                  <TrendingDown className="w-4 h-4" /> Short（売り）
                </button>
              </div>
            </div>

            {/* Source */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">この銘柄を知ったきっかけ</label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_OPTIONS.map(s => (
                  <TagButton
                    key={s}
                    label={s}
                    active={preTrade.source === s}
                    onClick={() => setPreTrade(p => ({ ...p, source: s }))}
                  />
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">なぜこの銘柄を取引するのですか？</label>
              <textarea
                value={preTrade.reason}
                onChange={e => setPreTrade(p => ({ ...p, reason: e.target.value }))}
                placeholder="例：RSIが30を割り込んでおり反発を狙っている"
                rows={2}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Info source */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">この情報をどこで見ましたか？</label>
              <div className="flex flex-wrap gap-2">
                {INFO_SOURCE_OPTIONS.map(s => (
                  <TagButton
                    key={s}
                    label={s}
                    active={preTrade.infoSource === s}
                    onClick={() => setPreTrade(p => ({ ...p, infoSource: s }))}
                  />
                ))}
              </div>
            </div>

            {/* Why now */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">なぜ「今」取引するのですか？</label>
              <textarea
                value={preTrade.whyNow}
                onChange={e => setPreTrade(p => ({ ...p, whyNow: e.target.value }))}
                placeholder="例：決算発表前で材料が出る前にポジションを持ちたい"
                rows={2}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Holding period — determines mode */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                いつまで保有するつもりですか？ * <span className="text-primary">(質問内容が変わります)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {HOLDING_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setPreTrade(p => ({ ...p, holdingKey: opt.key }))}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      preTrade.holdingKey === opt.key
                        ? "bg-primary/10 border-primary/50 text-foreground"
                        : "bg-card border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!canProceedStep0}
              onClick={() => {
                setAnswers(new Array(questions.length).fill(0));
                setStep(1);
              }}
            >
              FOMO質問票へ
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* ─────────── Step 1: 質問票 ─────────── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-4"
          >
            {/* Mode badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">モード：</span>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {HOLDING_OPTIONS.find(h => h.key === preTrade.holdingKey)?.sub}
                </span>
                <span className="text-xs font-mono font-bold text-foreground">{preTrade.code}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {answers.filter(v => v > 0).length} / {questions.length} 回答済み
              </span>
            </div>

            {/* Progress */}
            <div className="h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(answers.filter(v => v > 0).length / questions.length) * 100}%` }}
              />
            </div>

            {/* Score scale legend */}
            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
              {SCORE_DESC.map((d, i) => (
                <span key={i} className="text-center">{i + 1}: {d.split("当てはまら").join("").split("当てはまる").join("").split("やや").join("")}</span>
              ))}
            </div>

            {/* Questions */}
            <div className="space-y-3">
              {questions.map((q, i) => (
                <ScoreRow
                  key={i}
                  index={i}
                  question={q}
                  value={answers[i] ?? 0}
                  onChange={v => setAnswer(i, v)}
                />
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
              <Button
                className="flex-1"
                disabled={!allAnswered}
                onClick={() => setStep(2)}
              >
                評価を見る
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {!allAnswered && (
              <p className="text-xs text-center text-muted-foreground">
                全{questions.length}問に回答してください（残り {questions.length - answers.filter(v => v > 0).length} 問）
              </p>
            )}
          </motion.div>
        )}

        {/* ─────────── Step 2: Result ─────────── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <ResultScreen
              scores={scores}
              mode={currentMode}
              answers={answers}
              preTrade={preTrade}
              onReset={handleReset}
            />
            <Button variant="outline" className="w-full mt-3" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              質問票に戻る
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
