// StockAnalysisPro — 銘柄詳細分析（moomoo経由）
// テクニカル・ファンダメンタル・S/R・強弱シナリオ
import { useState, useCallback } from "react";
import {
  Search, RefreshCw, TrendingUp, TrendingDown,
  Activity, BarChart3, Target, Shield, Info,
  ChevronUp, ChevronDown, Minus, Zap, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

const MOOMOO_BASE = "http://127.0.0.1:8000";

// ── Types ──────────────────────────────────────────────────────────────────
interface AnalysisResult {
  code: string;
  price: {
    current: number; change_val: number; change_rate: number;
    high_today: number; low_today: number;
    week52_high: number; week52_low: number;
  };
  technical: {
    rsi14: number; rsi_signal: string;
    ma50: number | null; ma200: number | null; ema200: number | null;
    macd: { macd: number | null; signal: number | null; hist: number | null };
    bollinger: { upper: number | null; mid: number | null; lower: number | null };
    ma_signals: { cross: string; short: string; long: string };
    overall_score: number;
  };
  support_resistance: Array<{
    price: number; kind: string; strength: number; dist_pct: number;
  }>;
  chart_closes: number[];
}

// ── Color helpers ─────────────────────────────────────────────────────────
const scoreToColor = (s: number) => {
  if (s >= 50)  return "text-emerald-400";
  if (s >= 10)  return "text-emerald-300/70";
  if (s >= -10) return "text-muted-foreground";
  if (s >= -50) return "text-rose-300/70";
  return "text-rose-400";
};
const scoreToLabel = (s: number) => {
  if (s >= 60)  return "強い買い";
  if (s >= 20)  return "買い優勢";
  if (s >= -20) return "中立";
  if (s >= -60) return "売り優勢";
  return "強い売り";
};
const rsiColor = (rsi: number) => {
  if (rsi >= 70) return "text-rose-400";
  if (rsi <= 30) return "text-emerald-400";
  if (rsi >= 60) return "text-orange-400";
  return "text-foreground";
};
const rsiLabel = (s: string) => ({
  overbought: "買われ過ぎ", oversold: "売られ過ぎ",
  bullish: "強気圏", bearish: "弱気圏", neutral: "中立",
}[s] || s);

const signalBadge = (s: string, invert = false) => {
  const pos = invert ? s === "bearish" || s === "dead" : s === "bullish" || s === "golden";
  return (
    <span className={cn(
      "text-[10px] font-semibold px-1.5 py-0.5 rounded",
      pos ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400",
    )}>
      {({
        golden: "ゴールデンクロス", dead: "デッドクロス",
        bullish: "強気", bearish: "弱気",
      } as Record<string, string>)[s] || s}
    </span>
  );
};

// ── Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const W = 400, H = 80;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.001;
  const xStep = W / (data.length - 1);
  const y = (v: number) => H - ((v - min) / range) * H;
  const path = data.map((v, i) => `${i === 0 ? "M" : "L"} ${i * xStep},${y(v)}`).join(" ");
  const isUp = data[data.length - 1] >= data[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${(data.length - 1) * xStep},${H} L 0,${H} Z`}
        fill="url(#spark-grad)" />
      <path d={path} fill="none"
        stroke={isUp ? "#10b981" : "#ef4444"} strokeWidth={1.5} />
    </svg>
  );
}

// ── S/R Bar ───────────────────────────────────────────────────────────────
function SRLevelsView({ levels, current }: {
  levels: AnalysisResult["support_resistance"];
  current: number;
}) {
  const allPrices = [...levels.map((l) => l.price), current];
  const min = Math.min(...allPrices) * 0.99;
  const max = Math.max(...allPrices) * 1.01;
  const range = max - min || 1;
  const pct = (p: number) => ((p - min) / range) * 100;

  return (
    <div className="relative h-56 select-none">
      {/* Vertical axis */}
      <div className="absolute left-24 right-4 top-0 bottom-0 border-l border-border/30">
        {/* Current price line */}
        <div
          className="absolute left-0 right-0 border-t-2 border-primary border-dashed flex items-center"
          style={{ top: `${100 - pct(current)}%` }}
        >
          <span className="absolute right-0 text-[10px] font-mono text-primary bg-background px-1 rounded">
            ${current.toFixed(2)}
          </span>
        </div>

        {/* S/R lines */}
        {levels.map((l, i) => (
          <div
            key={i}
            className={cn(
              "absolute left-0 right-0 border-t flex items-center gap-2",
              l.kind === "resistance" ? "border-rose-500/60" : "border-emerald-500/60",
            )}
            style={{ top: `${100 - pct(l.price)}%` }}
          >
            <div
              className={cn(
                "absolute -left-24 flex items-end gap-1 w-20 text-right pr-2",
              )}
            >
              <span className="text-[9px] font-mono text-muted-foreground w-full text-right">
                ${l.price.toFixed(2)}
              </span>
            </div>
            <div className="ml-2 flex items-center gap-1.5">
              {Array.from({ length: Math.min(l.strength, 5) }).map((_, j) => (
                <div
                  key={j}
                  className={cn(
                    "w-1 h-1 rounded-full",
                    l.kind === "resistance" ? "bg-rose-500/70" : "bg-emerald-500/70",
                  )}
                />
              ))}
              <span className={cn(
                "text-[9px]",
                l.kind === "resistance" ? "text-rose-400" : "text-emerald-400",
              )}>
                {l.dist_pct > 0 ? "+" : ""}{l.dist_pct.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Labels on left */}
      <div className="absolute left-0 top-0 w-24 h-full flex flex-col justify-between">
        <span className="text-[9px] text-muted-foreground">${max.toFixed(2)}</span>
        <span className="text-[9px] text-muted-foreground">${min.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── Bull/Bear Thesis ───────────────────────────────────────────────────────
const BULL_POINTS = [
  "RSI ≤30：売られ過ぎ圏→テクニカルリバウンドの可能性",
  "アナリスト目標株価が現在値から大幅アップサイド",
  "強いサポートレベルで下値が支えられている",
  "ゴールデンクロス確認→中長期上昇トレンド",
  "MACD ヒストグラムがプラス転換→短期モメンタム回復",
];
const BEAR_POINTS = [
  "デッドクロス状態→テクニカルトレンドは下向き",
  "RSI ≥70：買われ過ぎ圏→反落リスク",
  "200EMAがレジスタンスとして機能している",
  "MACD ヒストグラムがマイナス継続→モメンタム弱い",
  "52週安値圏での推移→下値余地に注意",
];

function ThesisPanel({ result }: { result: AnalysisResult }) {
  const { technical, price } = result;

  const bullPoints: string[] = [];
  const bearPoints: string[] = [];

  // Dynamically build thesis from actual indicators
  if (technical.rsi14 <= 30) bullPoints.push(`RSI ${technical.rsi14}（売られ過ぎ）→逆張りリバウンドの可能性`);
  if (technical.rsi14 >= 70) bearPoints.push(`RSI ${technical.rsi14}（買われ過ぎ）→反落リスク`);
  if (technical.ma_signals.cross === "golden") bullPoints.push("ゴールデンクロス確認→中長期トレンド上向き");
  if (technical.ma_signals.cross === "dead")   bearPoints.push("デッドクロス状態→テクニカルトレンドは下向き");
  if (technical.ma_signals.short === "bullish") bullPoints.push(`MA50（${technical.ma50?.toFixed(2)}）を上回る→短期強気`);
  if (technical.ma_signals.short === "bearish") bearPoints.push(`MA50（${technical.ma50?.toFixed(2)}）を下回る→短期弱気`);
  if (technical.ma_signals.long === "bullish") bullPoints.push(`MA200（${technical.ma200?.toFixed(2)}）を上回る→長期強気`);
  if (technical.ma_signals.long === "bearish") bearPoints.push(`MA200（${technical.ma200?.toFixed(2)}）を下回る→長期弱気`);
  if (technical.macd.hist !== null && technical.macd.hist > 0) bullPoints.push("MACDヒストグラム プラス→モメンタム回復");
  if (technical.macd.hist !== null && technical.macd.hist < 0) bearPoints.push("MACDヒストグラム マイナス→モメンタム弱い");

  const priceFromLow = ((price.current - price.week52_low) / price.week52_low) * 100;
  const priceFromHigh = ((price.week52_high - price.current) / price.week52_high) * 100;
  if (priceFromHigh > 30) bearPoints.push(`52週高値から${priceFromHigh.toFixed(0)}%下落→強い下降トレンド`);
  if (priceFromLow < 10)  bearPoints.push(`52週安値圏（+${priceFromLow.toFixed(1)}%）→下値リスク継続`);
  if (priceFromLow > 50)  bullPoints.push(`52週安値から${priceFromLow.toFixed(0)}%回復→底打ち確認の可能性`);

  if (technical.bollinger.lower && price.current < technical.bollinger.lower)
    bullPoints.push("ボリンジャーバンド下限を下回る→過売り状態");
  if (technical.bollinger.upper && price.current > technical.bollinger.upper)
    bearPoints.push("ボリンジャーバンド上限を上回る→過買い状態");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-400">ブル（強気）シナリオ</span>
        </div>
        <ul className="space-y-2">
          {(bullPoints.length > 0 ? bullPoints : ["現在の指標からブル要因は限定的"]).map((p, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <ChevronUp className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-rose-400" />
          <span className="text-sm font-bold text-rose-400">ベア（弱気）シナリオ</span>
        </div>
        <ul className="space-y-2">
          {(bearPoints.length > 0 ? bearPoints : ["現在の指標からベア要因は限定的"]).map((p, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <ChevronDown className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function StockAnalysisPro() {
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const EXAMPLES = ["US.CLSK", "US.AAPL", "US.NVDA", "JP.7203", "HK.00700"];

  const analyze = useCallback(async (c?: string) => {
    const target = c || input.trim();
    if (!target) return;
    setLoading(true); setError(null); setCode(target);
    try {
      const res = await axios.get<AnalysisResult>(`${MOOMOO_BASE}/api/analysis/${target}`,
        { timeout: 30000 });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "moomoo OpenD に接続できません。起動確認してください。");
    } finally { setLoading(false); }
  }, [input]);

  const { price: p, technical: t } = result || { price: null, technical: null };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          銘柄詳細分析
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          moomoo経由でテクニカル・S/R・強弱シナリオを自動生成
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full bg-white/5 border border-border/50 rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            placeholder="コード入力: US.AAPL / JP.7203 / HK.00700"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
          />
        </div>
        <button
          onClick={() => analyze()}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-primary/20 border border-primary/30 text-primary text-sm font-medium rounded-xl hover:bg-primary/30 transition-colors disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "分析"}
        </button>
      </div>

      {/* Quick examples */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => { setInput(ex); analyze(ex); }}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
            {ex}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/15 border border-destructive/30 rounded-xl text-xs text-destructive flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          {code} を分析中...
        </div>
      )}

      {/* Results */}
      {result && !loading && p && t && (
        <div className="space-y-5">
          {/* Price Summary */}
          <div className="bg-white/3 rounded-xl border border-border/30 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">{result.code}</p>
                <p className="text-3xl font-mono font-bold text-foreground">
                  ${p.current.toFixed(2)}
                </p>
                <p className={cn("text-sm font-mono mt-0.5",
                  p.change_val >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {p.change_val >= 0 ? "+" : ""}{p.change_val.toFixed(2)}
                  ({p.change_rate >= 0 ? "+" : ""}{p.change_rate.toFixed(2)}%)
                </p>
              </div>
              <div className="text-right">
                <div className={cn(
                  "inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-sm font-bold",
                  t.overall_score >= 20
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : t.overall_score <= -20
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                    : "bg-white/10 border-border/30 text-muted-foreground",
                )}>
                  <Zap className="w-3.5 h-3.5" />
                  {scoreToLabel(t.overall_score)} ({t.overall_score > 0 ? "+" : ""}{t.overall_score})
                </div>
              </div>
            </div>

            {/* Sparkline */}
            <div className="mt-3">
              <Sparkline data={result.chart_closes} />
            </div>

            {/* 52W + Today stats */}
            <div className="grid grid-cols-4 gap-3 mt-3">
              {[
                { label: "本日高値", value: `$${p.high_today.toFixed(2)}` },
                { label: "本日安値", value: `$${p.low_today.toFixed(2)}` },
                { label: "52週高値", value: `$${p.week52_high.toFixed(2)}` },
                { label: "52週安値", value: `$${p.week52_low.toFixed(2)}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">{label}</p>
                  <p className="text-xs font-mono font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Indicators */}
          <div className="bg-white/3 rounded-xl border border-border/30 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">テクニカル分析</span>
            </div>
            <div className="p-4 space-y-3">
              {/* RSI */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">RSI(14)</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", t.rsi14 >= 70 ? "bg-rose-500" : t.rsi14 <= 30 ? "bg-emerald-500" : "bg-primary")}
                      style={{ width: `${t.rsi14}%` }} />
                  </div>
                  <span className={cn("text-xs font-mono font-bold w-8 text-right", rsiColor(t.rsi14))}>
                    {t.rsi14}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">
                    {rsiLabel(t.rsi_signal)}
                  </span>
                </div>
              </div>

              {/* MA cross */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">MA クロス</span>
                <div className="flex items-center gap-2">
                  {signalBadge(t.ma_signals.cross)}
                </div>
              </div>

              {/* MA50 vs price */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">MA50 ({t.ma50?.toFixed(2) ?? "—"})</span>
                {t.ma50 && signalBadge(t.ma_signals.short)}
              </div>

              {/* MA200 vs price */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">MA200 ({t.ma200?.toFixed(2) ?? "—"})</span>
                {t.ma200 && signalBadge(t.ma_signals.long)}
              </div>

              {/* EMA200 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">EMA200</span>
                <span className="text-xs font-mono text-foreground">
                  {t.ema200?.toFixed(2) ?? "—"}
                  {t.ema200 && (
                    <span className={cn("ml-2 text-[10px]",
                      p.current > t.ema200 ? "text-emerald-400" : "text-rose-400")}>
                      {p.current > t.ema200 ? "上方" : "下方"}
                    </span>
                  )}
                </span>
              </div>

              {/* MACD */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">MACD ヒスト</span>
                <span className={cn("text-xs font-mono font-bold",
                  t.macd.hist && t.macd.hist > 0 ? "text-emerald-400" : "text-rose-400")}>
                  {t.macd.hist !== null ? (t.macd.hist >= 0 ? "+" : "") + t.macd.hist.toFixed(4) : "—"}
                </span>
              </div>

              {/* Bollinger */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">ボリンジャー(20σ2)</span>
                <div className="text-xs font-mono text-muted-foreground">
                  {t.bollinger.lower?.toFixed(2)} ～ {t.bollinger.upper?.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Support/Resistance */}
          <div className="bg-white/3 rounded-xl border border-border/30 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">サポート・レジスタンス</span>
            </div>
            <div className="p-4">
              {result.support_resistance.length > 0 ? (
                <>
                  <div className="divide-y divide-border/20 mb-4">
                    {result.support_resistance.map((l, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded",
                            l.kind === "resistance"
                              ? "bg-rose-500/20 text-rose-400"
                              : "bg-emerald-500/20 text-emerald-400")}>
                            {l.kind === "resistance" ? "抵抗" : "支持"}
                          </span>
                          <span className="text-xs font-mono text-foreground font-bold">
                            ${l.price.toFixed(2)}
                          </span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: Math.min(l.strength, 5) }).map((_, j) => (
                              <div key={j} className={cn("w-1 h-1 rounded-full",
                                l.kind === "resistance" ? "bg-rose-500/60" : "bg-emerald-500/60")} />
                            ))}
                          </div>
                        </div>
                        <span className={cn("text-xs font-mono",
                          l.dist_pct >= 0 ? "text-rose-300" : "text-emerald-300")}>
                          {l.dist_pct >= 0 ? "+" : ""}{l.dist_pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <SRLevelsView levels={result.support_resistance} current={p.current} />
                </>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">データ不足（より長い期間が必要）</p>
              )}
            </div>
          </div>

          {/* Bull/Bear Thesis */}
          <div className="bg-white/3 rounded-xl border border-border/30 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">投資シナリオ分析</span>
            </div>
            <div className="p-4">
              <ThesisPanel result={result} />
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/50 text-center pb-4">
            ※ 本分析はmoomoo経由のテクニカルデータに基づく参考情報です。投資判断は自己責任でお願いします。
          </p>
        </div>
      )}
    </div>
  );
}
