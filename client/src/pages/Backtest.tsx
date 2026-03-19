// BRAKE Pro — Backtest Page
// 銘柄ごとに購入日を指定してポートフォリオ過去検証

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Plus, Trash2, Play, Sparkles, Info, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// クイック日付プリセット
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const DATE_PRESETS = [
  { label: "1週間前",  date: () => daysAgo(7) },
  { label: "2週間前",  date: () => daysAgo(14) },
  { label: "3週間前",  date: () => daysAgo(21) },
  { label: "1ヶ月前",  date: () => daysAgo(30) },
  { label: "3ヶ月前",  date: () => daysAgo(90) },
  { label: "6ヶ月前",  date: () => daysAgo(180) },
  { label: "1年前",    date: () => daysAgo(365) },
  { label: "2年前",    date: () => daysAgo(365 * 2) },
  { label: "3年前",    date: () => daysAgo(365 * 3) },
  { label: "4年前",    date: () => daysAgo(365 * 4) },
  { label: "5年前",    date: () => daysAgo(365 * 5) },
  { label: "10年前",   date: () => daysAgo(365 * 10) },
];

interface HoldingInput {
  code: string;
  weight: number;
  buyDate: string;   // YYYY-MM-DD
}

interface HoldingResult {
  code: string;
  buy_date: string;
  invested: number;
  current_value: number;
  gain: number;
  gain_pct: number;
}

interface BacktestResult {
  total_invested: number;
  total_value: number;
  total_gain: number;
  total_gain_pct: number;
  annual_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  holdings: HoldingResult[];
  chart_data: { date: string; value: number; benchmark: number }[];
  suggest?: { code: string; weight: number }[];
}

const PRESET_ASSETS = [
  { code: "HK.00700", label: "テンセント" },
  { code: "US.AAPL",  label: "Apple" },
  { code: "US.SPY",   label: "S&P500 ETF" },
  { code: "GOLD",     label: "ゴールド" },
  { code: "US.BND",   label: "米国債ETF" },
];

const DEFAULT_DATE = daysAgo(365);

export default function Backtest() {
  const [holdings, setHoldings] = useState<HoldingInput[]>([
    { code: "US.SPY", weight: 60, buyDate: daysAgo(365) },
    { code: "GOLD",   weight: 40, buyDate: daysAgo(365) },
  ]);
  const [capital, setCapital] = useState("1000000");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalWeight = holdings.reduce((s, h) => s + (h.weight || 0), 0);

  function addHolding() {
    setHoldings((prev) => [...prev, { code: "", weight: 0, buyDate: DEFAULT_DATE }]);
  }

  function removeHolding(i: number) {
    setHoldings((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateHolding(i: number, field: keyof HoldingInput, value: string | number) {
    setHoldings((prev) =>
      prev.map((h, idx) => (idx === i ? { ...h, [field]: value } : h))
    );
  }

  function setPreset(i: number, dateStr: string) {
    updateHolding(i, "buyDate", dateStr);
  }

  const runBacktest = useCallback(async () => {
    if (totalWeight !== 100) { setError("配分の合計を 100% にしてください"); return; }
    const invalid = holdings.filter((h) => h.code && !h.buyDate);
    if (invalid.length > 0) { setError("すべての銘柄に購入日を設定してください"); return; }
    setError(null);
    setLoading(true);
    try {
      const { data } = await axios.post<BacktestResult>(`${API_BASE}/api/backtest/run`, {
        holdings: holdings.filter((h) => h.code).map((h) => ({
          code: h.code,
          weight: h.weight,
          buy_date: h.buyDate,
        })),
        initial_capital: Number(capital),
      });
      setResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "バックテスト実行に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [holdings, capital, totalWeight]);

  const runSuggest = useCallback(async () => {
    setSuggesting(true);
    setError(null);
    try {
      const { data } = await axios.post<BacktestResult>(`${API_BASE}/api/backtest/suggest`, {
        initial_capital: Number(capital),
        target_sharpe: 1.2,
        buy_date: daysAgo(365),
      });
      setResult(data);
      if (data.suggest) {
        setHoldings(data.suggest.map((s) => ({ code: s.code, weight: s.weight, buyDate: daysAgo(365) })));
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "サジェスト取得に失敗しました");
    } finally {
      setSuggesting(false);
    }
  }, [capital]);

  return (
    <div className="min-h-screen p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">ポートフォリオ バックテスト</h1>
        </div>
        <p className="text-sm text-muted-foreground pl-11">
          「あの日に買っていたら今いくら？」を銘柄ごとに検証します。
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 左：入力パネル */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border/50 bg-card p-5 space-y-5"
        >
          {/* 銘柄 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">銘柄・配分・購入日</h2>
              <span className={cn("text-xs font-mono", totalWeight === 100 ? "text-primary" : "text-destructive")}>
                合計 {totalWeight}%
              </span>
            </div>

            {/* プリセット銘柄 */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ASSETS.map((a) => (
                <button
                  key={a.code}
                  onClick={() => {
                    if (!holdings.find((h) => h.code === a.code))
                      setHoldings((prev) => [...prev, { code: a.code, weight: 0, buyDate: DEFAULT_DATE }]);
                  }}
                  className="text-xs px-2 py-1 rounded-md border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  {a.label}
                </button>
              ))}
            </div>

            {/* 銘柄リスト */}
            <div className="space-y-3">
              {holdings.map((h, i) => (
                <div key={i} className="rounded-lg border border-border/40 bg-background p-3 space-y-2.5">
                  {/* 1行目：コード・配分・削除 */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="コード (例: US.AAPL)"
                      value={h.code}
                      onChange={(e) => updateHolding(i, "code", e.target.value)}
                      className="flex-1 h-8 text-sm bg-card"
                    />
                    <div className="relative w-20 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={h.weight}
                        onChange={(e) => updateHolding(i, "weight", Number(e.target.value))}
                        className="h-8 text-sm bg-card pr-5"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <button
                      onClick={() => removeHolding(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 2行目：購入日 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="w-3 h-3" />
                      <span>購入日</span>
                    </div>

                    {/* クイック選択 */}
                    <div className="flex flex-wrap gap-1">
                      {DATE_PRESETS.map((p) => {
                        const d = p.date();
                        const isActive = h.buyDate === d;
                        return (
                          <button
                            key={p.label}
                            onClick={() => setPreset(i, d)}
                            className={cn(
                              "text-[11px] px-2 py-0.5 rounded-md border transition-all",
                              isActive
                                ? "bg-primary/15 border-primary/40 text-primary"
                                : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                            )}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* 日付手動入力 */}
                    <input
                      type="date"
                      value={h.buyDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => updateHolding(i, "buyDate", e.target.value)}
                      className="w-full h-7 rounded-md border border-border/50 bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />

                    {/* 選択中の日付を読みやすく表示 */}
                    {h.buyDate && (
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(h.buyDate).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })} に購入
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addHolding} className="w-full gap-1.5 h-8">
              <Plus className="w-3.5 h-3.5" />
              銘柄を追加
            </Button>
          </div>

          {/* 初期資本 */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">初期投資額（円）</h2>
            <Input
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              className="bg-background"
              placeholder="1000000"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={runBacktest} disabled={loading || suggesting} className="flex-1 gap-1.5">
              <Play className="w-4 h-4" />
              {loading ? "計算中…" : "シミュレーション実行"}
            </Button>
            <Button
              variant="outline"
              onClick={runSuggest}
              disabled={loading || suggesting}
              className="gap-1.5"
              title="シャープレシオ最大化の配分を自動サジェスト（1年前基準）"
            >
              <Sparkles className="w-4 h-4" />
              {suggesting ? "…" : "自動サジェスト"}
            </Button>
          </div>
        </motion.div>

        {/* 右：結果パネル */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border/50 bg-card p-5 space-y-5"
        >
          {result ? (
            <>
              <h2 className="text-sm font-semibold text-foreground">シミュレーション結果</h2>

              {/* 合計サマリー */}
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 space-y-1">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">現在の評価額</p>
                  <p className="text-xl font-bold text-primary font-mono">
                    ¥{result.total_value.toLocaleString()}
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">投資元本</span>
                  <span className="font-mono text-muted-foreground">¥{result.total_invested.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">損益</span>
                  <span className={cn("font-mono font-bold", result.total_gain >= 0 ? "text-primary" : "text-destructive")}>
                    {result.total_gain >= 0 ? "+" : ""}¥{result.total_gain.toLocaleString()}
                    （{result.total_gain >= 0 ? "+" : ""}{result.total_gain_pct.toFixed(1)}%）
                  </span>
                </div>
              </div>

              {/* KPIグリッド */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "年率リターン",     value: `${(result.annual_return * 100).toFixed(1)}%`, pos: result.annual_return > 0 },
                  { label: "シャープレシオ",   value: result.sharpe_ratio.toFixed(2),               pos: result.sharpe_ratio > 1 },
                  { label: "最大ドローダウン", value: `${(result.max_drawdown * 100).toFixed(1)}%`, pos: false },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-lg bg-background border border-border/30 p-2.5">
                    <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                    <p className={cn(
                      "text-base font-bold font-mono mt-0.5",
                      kpi.pos === true ? "text-primary" :
                      kpi.pos === false && kpi.label !== "ボラティリティ" ? "text-destructive" :
                      "text-foreground"
                    )}>
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* 銘柄別内訳 */}
              {result.holdings.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-medium text-muted-foreground">銘柄別損益</h3>
                  {result.holdings.map((h) => (
                    <div key={h.code} className="flex items-center justify-between rounded-lg bg-background border border-border/30 px-3 py-2 text-xs">
                      <div>
                        <span className="font-mono font-medium text-foreground">{h.code}</span>
                        <span className="ml-2 text-muted-foreground">{new Date(h.buy_date).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}購入</span>
                      </div>
                      <div className="text-right">
                        <span className={cn("font-mono font-bold", h.gain >= 0 ? "text-primary" : "text-destructive")}>
                          {h.gain >= 0 ? "+" : ""}¥{h.gain.toLocaleString()}
                        </span>
                        <span className={cn("ml-1 font-mono", h.gain_pct >= 0 ? "text-primary" : "text-destructive")}>
                          ({h.gain_pct >= 0 ? "+" : ""}{h.gain_pct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* チャート */}
              {result.chart_data.length > 0 && (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.chart_data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => v.slice(0, 7)}
                        interval={Math.floor(result.chart_data.length / 4)}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`}
                        width={55}
                      />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => [`¥${v.toLocaleString()}`, ""]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="value" name="ポートフォリオ" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="benchmark" name="S&P500基準" stroke="hsl(var(--muted-foreground))" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                銘柄・配分・購入日を設定して<br />
                シミュレーションを実行してください
              </p>
              <div className="flex items-start gap-2 text-left bg-primary/5 border border-primary/15 rounded-lg p-3 max-w-xs">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  例: 「2024年1月1日にS&P500を60万円、ゴールドを40万円買っていたら今いくら？」を計算します。
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
