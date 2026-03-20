// Lead-Lag Analysis — 日米業種リードラグ + ヒートマップ + パフォーマンス
// US sector close (t) → JP sector prediction (t+1)
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp, RefreshCw, Settings2,
  BarChart3, Activity, ArrowUpRight, ArrowDownRight,
  Minus, Info, Zap, Globe, Sun, Calendar,
  DollarSign, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

const LEAD_LAG_BASE = "http://127.0.0.1:8001";

// ── localStorage trade reader ─────────────────────────────────────────────
function getLocalTrades(): Array<{ id: string; ticker: string; createdAt: string; pnl?: number; result?: string; direction: string }> {
  try {
    const raw = localStorage.getItem("brake_trades");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

// ── Types ─────────────────────────────────────────────────────────────────
interface Prediction {
  ticker: string; name: string; score: number; rank: number;
  side: "LONG" | "SHORT" | "NEUTRAL"; weight: number;
}
interface SignalResponse {
  date: string; signal_date: string;
  predictions: Prediction[];
  weights: Record<string, number>;
  factor: { explained_var: number; eigenvalues: number[] };
  config: { L: number; lambda: number; K: number; q: number };
}
interface ReturnPoint { date: string; r: number; pct: number; }
interface MarketSnapshot {
  us_returns: Record<string, ReturnPoint[]>;
  jp_returns: Record<string, ReturnPoint[]>;
  all_dates: string[];
  yesterday_date: string;
  yesterday: {
    us: { top: Array<{ticker:string;name:string;pct:number}>; bottom: Array<{ticker:string;name:string;pct:number}>; market_return: number; prev: Record<string,number> };
    jp: { top: Array<{ticker:string;name:string;pct:number}>; bottom: Array<{ticker:string;name:string;pct:number}>; market_return: number; prev: Record<string,number> };
  };
  us_names: Record<string, string>;
  jp_names: Record<string, string>;
}
interface BacktestResp {
  metrics: Record<string, MetricsEntry>;
  cumulative: Record<string, Record<string, number>>;
  n_days: number;
}
interface MetricsEntry {
  annualised_return: number; annualised_volatility: number;
  sharpe_ratio: number; max_drawdown: number;
  information_ratio: number; n_days: number;
}
interface DailyReturnsResp {
  daily_returns: Array<{ date: string; return: number }>;
  signals: Array<Record<string, number | string>>;
}

// ── Color helpers ─────────────────────────────────────────────────────────
function pctToColor(pct: number): string {
  const clamped = Math.max(-3, Math.min(3, pct));
  if (clamped >= 0) {
    const alpha = 0.15 + (clamped / 3) * 0.65;
    return `rgba(16,185,129,${alpha.toFixed(2)})`;
  }
  const alpha = 0.15 + (-clamped / 3) * 0.65;
  return `rgba(239,68,68,${alpha.toFixed(2)})`;
}
function pctTextColor(pct: number): string {
  if (pct > 0.5) return "text-emerald-400";
  if (pct > 0) return "text-emerald-300/80";
  if (pct > -0.5) return "text-rose-300/80";
  return "text-rose-400";
}
function fmtJPY(val: number): string {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(0);
}
function fmtDateLabel(dateStr: string, gran: "year" | "month" | "week"): string {
  const d = new Date(dateStr);
  if (gran === "year") return `${d.getFullYear()}`;
  if (gran === "month") return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  // week: show "M/D"
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── Sub-components ────────────────────────────────────────────────────────

function SideIcon({ side }: { side: string }) {
  if (side === "LONG")  return <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (side === "SHORT") return <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
}

// ── Sector Heatmap ────────────────────────────────────────────────────────
interface HeatmapProps {
  snapshot: MarketSnapshot;
  tradeDates: Set<string>;  // dates where user had active trades
}
function SectorHeatmap({ snapshot, tradeDates }: HeatmapProps) {
  const dates = snapshot.all_dates.slice(-30);  // last 30 days
  const [hovered, setHovered] = useState<{t:string;d:string;pct:number}|null>(null);

  const buildRow = (
    tickers: string[],
    returns: Record<string, ReturnPoint[]>,
    names: Record<string, string>,
    label: string,
  ) => (
    <>
      {/* Section header */}
      <div
        className="col-span-full flex items-center gap-1.5 px-1 py-0.5 bg-white/5 rounded sticky left-0 z-10 mb-0.5"
        style={{ gridColumn: `1 / span ${dates.length + 2}` }}
      >
        <Globe className="w-3 h-3 text-primary shrink-0" />
        <span className="text-[9px] font-bold text-primary tracking-widest uppercase">{label}</span>
      </div>
      {tickers.map((ticker) => {
        const retMap: Record<string, number> = {};
        (returns[ticker] || []).forEach((p) => { retMap[p.date] = p.pct; });
        return (
          <div key={ticker} className="contents">
            {/* Ticker label */}
            <div className="sticky left-0 z-10 bg-background flex items-center pr-2">
              <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">
                {names[ticker] || ticker}
              </span>
            </div>
            {/* Cells */}
            {dates.map((d) => {
              const pct = retMap[d] ?? null;
              const isTrade = tradeDates.has(d);
              return (
                <div
                  key={d}
                  className={cn(
                    "h-5 rounded-sm cursor-default transition-all duration-100 relative",
                    isTrade && "ring-1 ring-yellow-400/60",
                    hovered?.t === ticker && hovered?.d === d && "ring-1 ring-white/50",
                  )}
                  style={{ backgroundColor: pct !== null ? pctToColor(pct) : "rgba(255,255,255,0.04)" }}
                  onMouseEnter={() => pct !== null && setHovered({ t: ticker, d, pct })}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
            {/* Latest % */}
            <div className="pl-1">
              {(() => {
                const last = retMap[dates[dates.length - 1]] ?? null;
                return last !== null ? (
                  <span className={cn("text-[9px] font-mono", pctTextColor(last))}>
                    {last >= 0 ? "+" : ""}{last.toFixed(1)}%
                  </span>
                ) : <span className="text-[9px] text-muted-foreground/30">—</span>;
              })()}
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <div className="relative">
      {/* Tooltip */}
      {hovered && (
        <div className="absolute top-0 right-0 z-20 bg-background border border-border/50 rounded-lg px-3 py-2 text-xs shadow-xl">
          <p className="font-medium text-foreground">{snapshot.us_names[hovered.t] || snapshot.jp_names[hovered.t] || hovered.t}</p>
          <p className="text-muted-foreground font-mono">{hovered.d}</p>
          <p className={cn("font-mono font-bold", pctTextColor(hovered.pct))}>
            {hovered.pct >= 0 ? "+" : ""}{hovered.pct.toFixed(2)}%
          </p>
        </div>
      )}

      {/* Date header */}
      <div className="overflow-x-auto pb-2">
        {/* Date row */}
        <div className="flex items-center gap-0.5 mb-1 ml-[90px]">
          {dates.map((d, i) => (
            <div
              key={d}
              className={cn(
                "w-5 text-center text-[7px] text-muted-foreground shrink-0",
                tradeDates.has(d) && "text-yellow-400",
              )}
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {i % 5 === 0 ? d.slice(5) : ""}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div
          className="grid gap-x-0.5 gap-y-0.5"
          style={{
            gridTemplateColumns: `90px repeat(${dates.length}, 20px) 36px`,
          }}
        >
          {buildRow(Object.keys(snapshot.us_returns), snapshot.us_returns, snapshot.us_names, "US セクター")}
          <div className="my-1" style={{ gridColumn: `1 / span ${dates.length + 2}`, height: "4px" }} />
          {buildRow(Object.keys(snapshot.jp_returns), snapshot.jp_returns, snapshot.jp_names, "JP セクター")}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 text-[9px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(16,185,129,0.80)" }} />
          <span>強い上昇</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(16,185,129,0.25)" }} />
          <span>小幅上昇</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
          <span>データなし</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(239,68,68,0.25)" }} />
          <span>小幅下落</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(239,68,68,0.80)" }} />
          <span>強い下落</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm ring-1 ring-yellow-400/60" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
          <span>取引あり</span>
        </div>
      </div>
    </div>
  );
}

// ── Morning Brief ─────────────────────────────────────────────────────────
function MorningBrief({ snapshot, signal }: { snapshot: MarketSnapshot; signal: SignalResponse | null }) {
  const { yesterday } = snapshot;
  const date = snapshot.yesterday_date;

  const SectorRow = ({
    item, prev,
  }: {
    item: { ticker: string; name: string; pct: number };
    prev?: number;
  }) => {
    const change = prev !== undefined ? item.pct - prev : null;
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
        <span className="text-xs text-foreground truncate flex-1">{item.name}</span>
        <div className="flex items-center gap-3 shrink-0">
          {change !== null && (
            <span className={cn("text-[10px] font-mono", change >= 0 ? "text-emerald-400/60" : "text-rose-400/60")}>
              {change >= 0 ? "▲" : "▼"}{Math.abs(change).toFixed(1)}%
            </span>
          )}
          <span className={cn("text-xs font-mono font-bold w-14 text-right", pctTextColor(item.pct))}>
            {item.pct >= 0 ? "+" : ""}{item.pct.toFixed(2)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Date banner */}
      <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl">
        <Sun className="w-4 h-4 text-primary shrink-0" />
        <div>
          <p className="text-xs font-bold text-foreground">昨日の相場サマリー</p>
          <p className="text-[10px] text-muted-foreground">{date} 終値ベース</p>
        </div>
        {signal && (
          <div className="ml-auto text-right">
            <p className="text-[10px] text-muted-foreground">今日の予測日</p>
            <p className="text-xs font-bold text-primary font-mono">{signal.signal_date}</p>
          </div>
        )}
      </div>

      {/* US + JP overview */}
      <div className="grid grid-cols-2 gap-3">
        {/* US market */}
        <div className="bg-white/5 rounded-xl p-3 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-foreground">🇺🇸 US市場</span>
            <span className={cn("text-xs font-mono font-bold", pctTextColor(yesterday.us.market_return))}>
              平均 {yesterday.us.market_return >= 0 ? "+" : ""}{yesterday.us.market_return.toFixed(2)}%
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground mb-1 font-semibold uppercase tracking-wide">上昇セクター</p>
          {yesterday.us.top.slice(0, 3).map((item) => (
            <SectorRow key={item.ticker} item={item} prev={yesterday.us.prev[item.ticker]} />
          ))}
          <p className="text-[9px] text-muted-foreground mb-1 font-semibold uppercase tracking-wide mt-2">下落セクター</p>
          {yesterday.us.bottom.slice(0, 3).map((item) => (
            <SectorRow key={item.ticker} item={item} prev={yesterday.us.prev[item.ticker]} />
          ))}
        </div>

        {/* JP market */}
        <div className="bg-white/5 rounded-xl p-3 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-foreground">🇯🇵 JP市場</span>
            <span className={cn("text-xs font-mono font-bold", pctTextColor(yesterday.jp.market_return))}>
              平均 {yesterday.jp.market_return >= 0 ? "+" : ""}{yesterday.jp.market_return.toFixed(2)}%
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground mb-1 font-semibold uppercase tracking-wide">上昇セクター</p>
          {yesterday.jp.top.slice(0, 3).map((item) => (
            <SectorRow key={item.ticker} item={item} prev={yesterday.jp.prev[item.ticker]} />
          ))}
          <p className="text-[9px] text-muted-foreground mb-1 font-semibold uppercase tracking-wide mt-2">下落セクター</p>
          {yesterday.jp.bottom.slice(0, 3).map((item) => (
            <SectorRow key={item.ticker} item={item} prev={yesterday.jp.prev[item.ticker]} />
          ))}
        </div>
      </div>

      {/* Today's signal preview */}
      {signal && (
        <div className="bg-white/3 rounded-xl border border-border/30 overflow-hidden">
          <div className="px-4 py-2 border-b border-border/20 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">本日 JP業種予測 TOP5</span>
          </div>
          <div className="divide-y divide-border/20">
            {signal.predictions.slice(0, 5).map((p) => (
              <div key={p.ticker} className="flex items-center gap-3 px-4 py-2">
                <SideIcon side={p.side} />
                <span className="flex-1 text-xs text-foreground">{p.name}</span>
                <span className={cn(
                  "text-xs font-mono",
                  p.score > 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {p.score >= 0 ? "+" : ""}{p.score.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PnL Bar Chart ─────────────────────────────────────────────────────────
type Granularity = "year" | "month" | "week";

interface PeriodBucket {
  label: string;
  pnl: number;
  trades: number;
  wins: number;
}

function aggregateByPeriod(
  dailyReturns: Array<{ date: string; return: number }>,
  trades: ReturnType<typeof getLocalTrades>,
  capital: number,
  gran: Granularity,
): PeriodBucket[] {
  // Build period key
  const key = (d: string): string => {
    const dt = new Date(d);
    if (gran === "year") return `${dt.getFullYear()}`;
    if (gran === "month") return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    // week: ISO week start (Monday)
    const dayOfWeek = dt.getDay() || 7;
    const mon = new Date(dt);
    mon.setDate(dt.getDate() - dayOfWeek + 1);
    return mon.toISOString().slice(0, 10);
  };

  // Aggregate backtest daily P&L
  const btBuckets: Record<string, number> = {};
  dailyReturns.forEach(({ date, return: r }) => {
    const k = key(date);
    btBuckets[k] = (btBuckets[k] || 0) + r * capital;
  });

  // Aggregate actual trades P&L
  const tradeBuckets: Record<string, { pnl: number; count: number; wins: number }> = {};
  trades.forEach((t) => {
    const d = (t.createdAt || "").slice(0, 10);
    if (!d) return;
    const k = key(d);
    if (!tradeBuckets[k]) tradeBuckets[k] = { pnl: 0, count: 0, wins: 0 };
    tradeBuckets[k].pnl += t.pnl || 0;
    tradeBuckets[k].count += 1;
    if (t.result === "win") tradeBuckets[k].wins += 1;
  });

  // Merge: prefer actual trades P&L if available, otherwise backtest
  const allKeys = new Set([...Object.keys(btBuckets), ...Object.keys(tradeBuckets)]);
  const sorted = Array.from(allKeys).sort();

  return sorted.map((k) => {
    const hasTrades = tradeBuckets[k] && tradeBuckets[k].count > 0;
    const pnl = hasTrades ? tradeBuckets[k].pnl : (btBuckets[k] || 0);
    return {
      label: fmtDateLabel(k + (gran === "week" ? "" : "-01"), gran),
      pnl,
      trades: tradeBuckets[k]?.count || 0,
      wins: tradeBuckets[k]?.wins || 0,
    };
  });
}

function PnLBarChart({
  dailyReturns, capital, localTrades,
}: {
  dailyReturns: Array<{ date: string; return: number }>;
  capital: number;
  localTrades: ReturnType<typeof getLocalTrades>;
}) {
  const [gran, setGran] = useState<Granularity>("month");

  const buckets = useMemo(
    () => aggregateByPeriod(dailyReturns, localTrades, capital, gran),
    [dailyReturns, localTrades, capital, gran],
  );

  if (buckets.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">データなし</p>;
  }

  const maxAbs = Math.max(...buckets.map((b) => Math.abs(b.pnl)), 1);
  const cumulative = buckets.reduce<number[]>((acc, b) => {
    acc.push((acc[acc.length - 1] || 0) + b.pnl);
    return acc;
  }, []);
  const maxCum = Math.max(...cumulative.map(Math.abs), 1);

  const W = 700, H = 200, PAD_L = 10, PAD_R = 70, PAD_T = 16, PAD_B = 40;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const midY = PAD_T + chartH / 2;

  const barW = Math.max(4, (chartW / buckets.length) - 2);

  const barX = (i: number) => PAD_L + (i + 0.5) * (chartW / buckets.length) - barW / 2;
  const barH = (pnl: number) => (Math.abs(pnl) / maxAbs) * (chartH / 2);
  const cumY = (i: number) => midY - (cumulative[i] / maxCum) * (chartH / 2) * 0.9;

  // Y-axis labels (right side)
  const yLabels = [-1, -0.5, 0, 0.5, 1].map((f) => ({
    y: midY - f * (chartH / 2),
    label: fmtJPY(f * maxCum),
  }));

  const cumPath = cumulative
    .map((_, i) => `${i === 0 ? "M" : "L"} ${barX(i) + barW / 2},${cumY(i)}`)
    .join(" ");

  return (
    <div className="space-y-3">
      {/* Granularity selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">表示単位:</span>
        <div className="flex bg-white/5 rounded-lg border border-border/30 overflow-hidden">
          {(["year", "month", "week"] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGran(g)}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                gran === g ? "bg-primary/25 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {{ year: "年", month: "月", week: "週" }[g]}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {localTrades.length > 0 ? "実取引P&L優先" : "バックテスト推定"}
        </span>
      </div>

      {/* SVG chart */}
      <div className="bg-white/3 rounded-xl border border-border/30 p-3 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: Math.max(400, buckets.length * 20) }}>
          {/* Grid lines */}
          {yLabels.map(({ y, label }) => (
            <g key={label}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
                stroke="rgba(255,255,255,0.06)" strokeDasharray="4 3" />
              {/* Y-axis label on right */}
              <text x={W - PAD_R + 6} y={y + 4} fill="rgba(255,255,255,0.4)"
                fontSize={8} fontFamily="monospace">{label}</text>
            </g>
          ))}

          {/* Zero line */}
          <line x1={PAD_L} x2={W - PAD_R} y1={midY} y2={midY}
            stroke="rgba(255,255,255,0.2)" />

          {/* Bars */}
          {buckets.map((b, i) => {
            const h = barH(b.pnl);
            const x = barX(i);
            const isPos = b.pnl >= 0;
            return (
              <g key={i}>
                <rect
                  x={x} y={isPos ? midY - h : midY}
                  width={barW} height={h}
                  fill={isPos ? "rgba(16,185,129,0.70)" : "rgba(239,68,68,0.70)"}
                  rx={1}
                />
                {/* Value label on top of bar (only if bar is tall enough) */}
                {h > 14 && (
                  <text
                    x={x + barW / 2} y={isPos ? midY - h - 2 : midY + h + 8}
                    textAnchor="middle" fontSize={7}
                    fill={isPos ? "rgb(110,231,183)" : "rgb(252,165,165)"}
                    fontFamily="monospace"
                  >
                    {fmtJPY(b.pnl)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Cumulative line */}
          <path d={cumPath} fill="none" stroke="rgba(99,102,241,0.8)" strokeWidth={1.5} />
          {/* Dots on cumulative line */}
          {cumulative.map((_, i) => (
            <circle key={i} cx={barX(i) + barW / 2} cy={cumY(i)} r={2}
              fill="rgba(99,102,241,0.9)" />
          ))}

          {/* X-axis labels */}
          {buckets.map((b, i) => {
            const skip = Math.ceil(buckets.length / 24);
            if (i % skip !== 0) return null;
            return (
              <text key={i}
                x={barX(i) + barW / 2} y={H - PAD_B + 12}
                textAnchor="middle" fontSize={7}
                fill="rgba(255,255,255,0.4)"
                fontFamily="monospace"
              >
                {b.label}
              </text>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 text-[9px] text-muted-foreground justify-center">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-emerald-500/70" />利益
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-rose-500/70" />損失
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-0.5 rounded-full bg-indigo-400/80" />累積損益
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          {
            label: "合計損益",
            value: fmtJPY(buckets.reduce((s, b) => s + b.pnl, 0)),
            color: buckets.reduce((s, b) => s + b.pnl, 0) >= 0 ? "text-emerald-400" : "text-rose-400",
          },
          {
            label: "利益期間",
            value: `${buckets.filter((b) => b.pnl > 0).length} / ${buckets.length}`,
            color: "text-foreground",
          },
          {
            label: "最大利益",
            value: fmtJPY(Math.max(...buckets.map((b) => b.pnl), 0)),
            color: "text-emerald-400",
          },
          {
            label: "最大損失",
            value: fmtJPY(Math.min(...buckets.map((b) => b.pnl), 0)),
            color: "text-rose-400",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/5 rounded-xl p-2.5 border border-border/30 text-center">
            <p className="text-[9px] text-muted-foreground mb-0.5">{label}</p>
            <p className={cn("text-sm font-mono font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Cumulative chart (backtest tab) ───────────────────────────────────────
function CumReturnChart({ cumulative, strategies }: {
  cumulative: Record<string, Record<string, number>>;
  strategies: string[];
}) {
  const colors: Record<string, string> = {
    PCA_SUB: "#10b981", MOM: "#f59e0b", PCA_PLAIN: "#6366f1", DOUBLE_SORT: "#ec4899",
  };
  const W = 600, H = 200;
  const allDates = strategies.length > 0
    ? Object.keys(cumulative[strategies[0]] || {}).sort() : [];
  if (allDates.length < 2) return <p className="text-xs text-muted-foreground text-center py-8">データ不足</p>;
  const allVals = strategies.flatMap((s) => allDates.map((d) => cumulative[s]?.[d] ?? 1));
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const rangeV = maxV - minV || 0.01;
  const xScale = (i: number) => (i / (allDates.length - 1)) * W;
  const yScale = (v: number) => H - ((v - minV) / rangeV) * H;
  const toPath = (s: string) =>
    `M ${allDates.map((d, i) => `${xScale(i)},${yScale(cumulative[s]?.[d] ?? 1)}`).join(" L ")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
      <line x1={0} x2={W} y1={yScale(1)} y2={yScale(1)}
        stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
      {strategies.map((s) => (
        <path key={s} d={toPath(s)} fill="none" stroke={colors[s] || "#888"} strokeWidth={1.5} />
      ))}
    </svg>
  );
}

// ── Config panel ──────────────────────────────────────────────────────────
function ConfigPanel({ L, lam, K, q, capital, onChange, onCapChange }: {
  L: number; lam: number; K: number; q: number; capital: number;
  onChange: (k: "L" | "lam" | "K" | "q", v: number) => void;
  onCapChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-white/5 rounded-xl border border-border/30">
      {[
        { key: "L" as const, label: "ルックバック (L)", min: 20, max: 252, step: 5, val: L },
        { key: "lam" as const, label: "正則化 (λ)", min: 0, max: 1, step: 0.05, val: lam },
        { key: "K" as const, label: "主成分数 (K)", min: 1, max: 8, step: 1, val: K },
        { key: "q" as const, label: "分位数 (q)", min: 0.1, max: 0.5, step: 0.05, val: q },
      ].map(({ key, label, min, max, step, val }) => (
        <div key={key}>
          <label className="text-xs text-muted-foreground block mb-1">{label}</label>
          <input type="number" className="w-full bg-background border border-border/50 rounded-lg px-2 py-1 text-sm font-mono text-foreground"
            min={min} max={max} step={step} value={val}
            onChange={(e) => onChange(key, parseFloat(e.target.value))} />
        </div>
      ))}
      <div>
        <label className="text-xs text-muted-foreground block mb-1">初期資金 (円)</label>
        <input type="number" className="w-full bg-background border border-border/50 rounded-lg px-2 py-1 text-sm font-mono text-foreground"
          min={100000} step={100000} value={capital}
          onChange={(e) => onCapChange(parseFloat(e.target.value))} />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
type Tab = "signal" | "morning" | "heatmap" | "performance" | "backtest" | "factor";

export default function LeadLagAnalysis() {
  const [activeTab, setActiveTab] = useState<Tab>("signal");
  const [signal, setSignal]       = useState<SignalResponse | null>(null);
  const [snapshot, setSnapshot]   = useState<MarketSnapshot | null>(null);
  const [backtest, setBacktest]   = useState<BacktestResp | null>(null);
  const [dailyRet, setDailyRet]   = useState<DailyReturnsResp | null>(null);

  const [sigLoading, setSigLoading]   = useState(false);
  const [snapLoading, setSnapLoading] = useState(false);
  const [btLoading, setBtLoading]     = useState(false);
  const [perfLoading, setPerfLoading] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [showConfig, setShowConfig]   = useState(false);

  // Config
  const [L, setL]       = useState(60);
  const [lam, setLam]   = useState(0.9);
  const [K, setK]       = useState(3);
  const [q, setQ]       = useState(0.30);
  const [capital, setCap] = useState(1_000_000);

  const handleConfig = (key: "L" | "lam" | "K" | "q", v: number) => {
    if (key === "L")   setL(v);
    if (key === "lam") setLam(v);
    if (key === "K")   setK(v);
    if (key === "q")   setQ(v);
  };

  const localTrades = useMemo(() => getLocalTrades(), []);

  // Trade dates for heatmap overlay
  const tradeDates = useMemo(() => {
    const dates = new Set<string>();
    localTrades.forEach((t) => {
      const d = (t.createdAt || "").slice(0, 10);
      if (d) dates.add(d);
    });
    return dates;
  }, [localTrades]);

  const fetchSignal = useCallback(async () => {
    setSigLoading(true); setError(null);
    try {
      const res = await axios.get<SignalResponse>(`${LEAD_LAG_BASE}/signals/latest`,
        { params: { L, lam, K, q }, timeout: 90000 });
      setSignal(res.data);
    } catch (e: any) {
      // lead_lag_api.py (python server/lead_lag/lead_lag_api.py) が未起動の場合にここに到達する
      setError(e?.response?.data?.detail || "分析サーバーに接続できません");
    } finally { setSigLoading(false); }
  }, [L, lam, K, q]);

  const fetchSnapshot = useCallback(async () => {
    setSnapLoading(true);
    try {
      const res = await axios.get<MarketSnapshot>(`${LEAD_LAG_BASE}/market/snapshot`,
        { params: { days: 40 }, timeout: 60000 });
      setSnapshot(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "スナップショット取得失敗");
    } finally { setSnapLoading(false); }
  }, []);

  const fetchBacktest = useCallback(async () => {
    setBtLoading(true);
    try {
      const res = await axios.post<BacktestResp>(`${LEAD_LAG_BASE}/backtest/run`,
        { L, lam, K, q, lookback_years: 3 }, { timeout: 240000 });
      setBacktest(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "バックテスト失敗");
    } finally { setBtLoading(false); }
  }, [L, lam, K, q]);

  const fetchDailyReturns = useCallback(async () => {
    setPerfLoading(true);
    try {
      const res = await axios.post<DailyReturnsResp>(`${LEAD_LAG_BASE}/backtest/daily_returns`,
        { L, lam, K, q, lookback_years: 5 }, { timeout: 240000 });
      setDailyRet(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "パフォーマンスデータ取得失敗");
    } finally { setPerfLoading(false); }
  }, [L, lam, K, q]);

  // Auto-load signal on mount
  useEffect(() => { fetchSignal(); }, []);

  const onTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if ((tab === "morning" || tab === "heatmap") && !snapshot) fetchSnapshot();
    if (tab === "backtest" && !backtest) fetchBacktest();
    if (tab === "performance" && !dailyRet) fetchDailyReturns();
  };

  const TABS = [
    { key: "signal" as Tab,      label: "シグナル",       icon: TrendingUp },
    { key: "morning" as Tab,     label: "朝確認",          icon: Sun },
    { key: "heatmap" as Tab,     label: "ヒートマップ",    icon: Globe },
    { key: "performance" as Tab, label: "パフォーマンス",  icon: DollarSign },
    { key: "backtest" as Tab,    label: "バックテスト",    icon: BarChart3 },
    { key: "factor" as Tab,      label: "因子",            icon: Activity },
  ] as const;

  const STRATEGIES = ["PCA_SUB", "MOM", "PCA_PLAIN", "DOUBLE_SORT"];
  const STRAT_LABELS: Record<string, string> = {
    PCA_SUB: "PCA-SUB（本モデル）", MOM: "モメンタム",
    PCA_PLAIN: "PCA（正則化なし）", DOUBLE_SORT: "ダブルソート",
  };

  const maxAbsScore = signal
    ? Math.max(...signal.predictions.map((p) => Math.abs(p.score)), 0.001) : 1;

  const isLoading = sigLoading || snapLoading || btLoading || perfLoading;

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            日米業種リードラグ分析
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            部分空間正則化PCA — US t日終値 → JP t+1日予測
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowConfig((v) => !v)}
            className="p-2 rounded-lg bg-white/5 border border-border/30 hover:bg-white/10 transition-colors">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => {
              if (activeTab === "signal") fetchSignal();
              else if (activeTab === "morning" || activeTab === "heatmap") fetchSnapshot();
              else if (activeTab === "backtest") fetchBacktest();
              else if (activeTab === "performance") fetchDailyReturns();
            }}
            disabled={isLoading}
            className="p-2 rounded-lg bg-primary/20 border border-primary/30 hover:bg-primary/30 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4 text-primary", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Config */}
      {showConfig && (
        <div className="mb-4">
          <ConfigPanel L={L} lam={lam} K={K} q={q} capital={capital}
            onChange={handleConfig} onCapChange={setCap} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-6 text-center mb-4">
          <WifiOff className="w-10 h-10 text-amber-400/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-amber-300 mb-1">リードラグ分析サーバーが未起動です</p>
          <p className="text-xs text-muted-foreground mb-4">
            MooMoo証券と接続するか、分析サーバーを起動してください
          </p>
          <div className="flex flex-col gap-2 max-w-xs mx-auto">
            <a
              href="/connect"
              className="px-4 py-2.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
            >
              MooMoo接続設定へ
            </a>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 mb-4 bg-white/5 rounded-xl p-1 border border-border/30 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => onTabChange(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap min-w-[64px]",
              activeTab === key
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground",
            )}>
            <Icon className="w-3 h-3 shrink-0" />{label}
          </button>
        ))}
      </div>

      {/* ── Tab: シグナル ── */}
      {activeTab === "signal" && (
        <div className="space-y-4">
          {sigLoading && (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              シグナル生成中（初回は1-2分かかります）...
            </div>
          )}
          {signal && !sigLoading && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>US基準日: <span className="text-foreground font-mono">{signal.date}</span></span>
                <span>JP予測日: <span className="text-primary font-mono font-bold">{signal.signal_date}</span></span>
              </div>
              <div className="bg-white/3 rounded-xl border border-border/30 overflow-hidden">
                <div className="px-4 py-2 border-b border-border/20 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">JP業種予測ランキング</span>
                </div>
                <div className="divide-y divide-border/20">
                  {signal.predictions.map((p) => {
                    const barPct = Math.min(100, (Math.abs(p.score) / maxAbsScore) * 100);
                    return (
                      <div key={p.ticker} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                        <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">{p.rank}</span>
                        <SideIcon side={p.side} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{p.ticker}</p>
                        </div>
                        <div className="w-24 h-2 bg-white/10 rounded-full relative overflow-hidden shrink-0">
                          <div className={cn("absolute top-0 h-full rounded-full", p.score >= 0 ? "bg-emerald-500" : "bg-rose-500")}
                            style={{ width: `${barPct / 2}%`, left: p.score >= 0 ? "50%" : `${50 - barPct / 2}%` }} />
                        </div>
                        <span className={cn("text-xs font-mono w-12 text-right shrink-0",
                          p.score > 0 ? "text-emerald-400" : p.score < 0 ? "text-rose-400" : "text-muted-foreground")}>
                          {p.score >= 0 ? "+" : ""}{p.score.toFixed(3)}
                        </span>
                        <span className={cn("text-[10px] font-mono w-14 text-right shrink-0 px-1.5 py-0.5 rounded",
                          p.side === "LONG"  ? "bg-emerald-500/15 text-emerald-400" :
                          p.side === "SHORT" ? "bg-rose-500/15 text-rose-400" : "text-muted-foreground")}>
                          {p.side !== "NEUTRAL" ? `${(p.weight * 100).toFixed(0)}%` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Factor mini-bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-1 bg-white/5 rounded-xl p-3 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">累積寄与率</p>
                  <p className="text-lg font-mono font-bold text-primary">{(signal.factor.explained_var * 100).toFixed(1)}%</p>
                </div>
                {signal.factor.eigenvalues.map((ev, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">λ{i + 1}</p>
                    <p className="text-lg font-mono font-bold text-foreground">{ev.toFixed(3)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: 朝確認 ── */}
      {activeTab === "morning" && (
        <div>
          {snapLoading && (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />相場データ取得中...
            </div>
          )}
          {snapshot && !snapLoading && (
            <MorningBrief snapshot={snapshot} signal={signal} />
          )}
        </div>
      )}

      {/* ── Tab: ヒートマップ ── */}
      {activeTab === "heatmap" && (
        <div className="space-y-3">
          {snapLoading && (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />ヒートマップデータ取得中...
            </div>
          )}
          {snapshot && !snapLoading && (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>直近30日間の日次騰落率 | 黄枠 = 取引記録あり</span>
                {tradeDates.size > 0 && (
                  <span className="ml-auto text-yellow-400 font-medium">{tradeDates.size}日分の取引</span>
                )}
              </div>
              <div className="bg-white/3 rounded-xl border border-border/30 p-4 overflow-x-auto">
                <SectorHeatmap snapshot={snapshot} tradeDates={tradeDates} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: パフォーマンス ── */}
      {activeTab === "performance" && (
        <div className="space-y-4">
          {perfLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground text-sm">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              パフォーマンスデータ計算中（2-3分かかる場合があります）...
            </div>
          )}
          {!perfLoading && !dailyRet && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <DollarSign className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">バックテストデータが必要です</p>
              <button onClick={fetchDailyReturns}
                className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-lg text-sm text-primary font-medium hover:bg-primary/30 transition-colors">
                データ取得
              </button>
            </div>
          )}
          {dailyRet && !perfLoading && (
            <PnLBarChart
              dailyReturns={dailyRet.daily_returns}
              capital={capital}
              localTrades={localTrades}
            />
          )}
        </div>
      )}

      {/* ── Tab: バックテスト ── */}
      {activeTab === "backtest" && (
        <div className="space-y-4">
          {btLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground text-sm">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              バックテスト実行中（2-5分かかる場合があります）...
            </div>
          )}
          {!btLoading && !backtest && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <BarChart3 className="w-10 h-10 text-muted-foreground/40" />
              <button onClick={fetchBacktest}
                className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-lg text-sm text-primary font-medium hover:bg-primary/30 transition-colors">
                バックテスト実行
              </button>
            </div>
          )}
          {backtest && !btLoading && (
            <>
              <div className="bg-white/3 rounded-xl border border-border/30 overflow-hidden">
                <div className="px-4 py-2 border-b border-border/20">
                  <span className="text-xs font-semibold text-foreground">パフォーマンス比較 ({backtest.n_days}日)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/20">
                        {["戦略", "年率", "ボラ", "シャープ", "MDD", "IR"].map((h) => (
                          <th key={h} className={cn("px-3 py-2 text-muted-foreground font-medium", h === "戦略" ? "text-left px-4" : "text-right")}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {STRATEGIES.filter((s) => backtest.metrics[s]).map((s) => {
                        const m = backtest.metrics[s];
                        const ar = m.annualised_return;
                        return (
                          <tr key={s} className={cn("hover:bg-white/5 transition-colors", s === "PCA_SUB" && "bg-primary/5")}>
                            <td className="px-4 py-2 font-medium text-foreground">
                              {STRAT_LABELS[s]}
                              {s === "PCA_SUB" && <span className="ml-1.5 text-[9px] bg-primary/20 text-primary px-1 rounded">本モデル</span>}
                            </td>
                            <td className={cn("px-3 py-2 text-right font-mono", ar >= 0 ? "text-emerald-400" : "text-rose-400")}>
                              {ar >= 0 ? "+" : ""}{ar.toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{m.annualised_volatility.toFixed(1)}%</td>
                            <td className={cn("px-3 py-2 text-right font-mono", m.sharpe_ratio >= 0 ? "text-emerald-400" : "text-rose-400")}>{m.sharpe_ratio.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-mono text-rose-400">{m.max_drawdown.toFixed(1)}%</td>
                            <td className={cn("px-3 py-2 text-right font-mono", m.information_ratio >= 0 ? "text-emerald-400" : "text-rose-400")}>{m.information_ratio.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white/3 rounded-xl border border-border/30 p-4">
                <p className="text-xs font-semibold text-foreground mb-3">累積リターン推移</p>
                <CumReturnChart cumulative={backtest.cumulative}
                  strategies={STRATEGIES.filter((s) => backtest.cumulative[s])} />
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {[
                    { key: "PCA_SUB", color: "#10b981" }, { key: "MOM", color: "#f59e0b" },
                    { key: "PCA_PLAIN", color: "#6366f1" }, { key: "DOUBLE_SORT", color: "#ec4899" },
                  ].map(({ key, color }) => (
                    <div key={key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="w-4 h-0.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                      {STRAT_LABELS[key]}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: 因子 ── */}
      {activeTab === "factor" && signal && (
        <div className="space-y-4">
          <div className="bg-white/3 rounded-xl border border-border/30 p-4">
            <p className="text-xs font-semibold text-foreground mb-4">主成分因子スコア</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {signal.factor.eigenvalues.map((ev, i) => {
                const total = signal.factor.eigenvalues.reduce((a, b) => a + b, 0.001);
                const pct = (ev / total) * 100;
                return (
                  <div key={i} className="bg-white/5 rounded-xl p-4 border border-border/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">PC{i + 1}</span>
                      <span className="text-xs font-mono text-primary">{pct.toFixed(1)}%</span>
                    </div>
                    <p className="text-2xl font-mono font-bold text-foreground">{ev.toFixed(3)}</p>
                    <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-white/5 rounded-xl border border-border/20">
              <p className="text-xs text-muted-foreground mb-2">Top-{signal.config.K} 累積寄与率</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full"
                    style={{ width: `${(signal.factor.explained_var * 100).toFixed(1)}%` }} />
                </div>
                <span className="text-sm font-mono font-bold text-primary">
                  {(signal.factor.explained_var * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-primary" />モデル概要
            </p>
            C_reg = (1−{signal.config.lambda})·C_t + {signal.config.lambda}·C_0 で転がり相関行列を正則化し、
            上位{signal.config.K}個の固有ベクトルから伝播行列 B = V_J · V_U^T を計算。
            US業種zスコアに乗じてJP業種予測を生成。
            ロング上位{Math.round(signal.config.q * 100)}%・ショート下位{Math.round(signal.config.q * 100)}%でポートフォリオ構築。
          </div>
        </div>
      )}
      {activeTab === "factor" && !signal && (
        <div className="py-16 text-center text-muted-foreground text-sm">
          「シグナル」タブでデータを取得してください
        </div>
      )}
    </div>
  );
}
