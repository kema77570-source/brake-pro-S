// 握力選手権 — 四半期ごとのトレード規律コンテスト
// 「相場を握りしめる力」= 感情に流されずルールを守る力
import { useState, useMemo, useEffect } from "react";
import { Trophy, Dumbbell, Star, TrendingUp, Shield, Target, Calendar, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────
interface QuarterRecord {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  score: number;
  components: {
    win_rate: number;      // 0-100
    discipline: number;    // 0-100
    fomo_control: number;  // 0-100
    consistency: number;   // 0-100
  };
  trades: number;
  wins: number;
  skipped: number;
  label: string;  // e.g. "2025 Q1"
}

interface TradeEntry {
  id: string; createdAt: string; result?: string;
  fomoScore?: number; pnl?: number; status?: string;
}
interface SkipEntry {
  id: string; createdAt: string;
}

// ── Storage ───────────────────────────────────────────────────────────────
const GRIP_KEY = "brake_grip_championship";

function loadHistory(): QuarterRecord[] {
  try {
    const raw = localStorage.getItem(GRIP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHistory(h: QuarterRecord[]) {
  localStorage.setItem(GRIP_KEY, JSON.stringify(h));
}
function getTrades(): TradeEntry[] {
  try { return JSON.parse(localStorage.getItem("brake_trades") || "[]"); } catch { return []; }
}
function getSkipLog(): SkipEntry[] {
  try { return JSON.parse(localStorage.getItem("brake_skip_log") || "[]"); } catch { return []; }
}

// ── Quarter helpers ────────────────────────────────────────────────────────
function getCurrentQuarter(): { year: number; quarter: 1|2|3|4; start: Date; end: Date } {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3) as 1|2|3|4;
  const startMonth = (q - 1) * 3;
  const start = new Date(now.getFullYear(), startMonth, 1);
  const end   = new Date(now.getFullYear(), startMonth + 3, 0);
  return { year: now.getFullYear(), quarter: q, start, end };
}

function quarterLabel(year: number, q: number) {
  return `${year} Q${q}`;
}

// ── Score calculation ─────────────────────────────────────────────────────
function computeQuarterScore(
  trades: TradeEntry[],
  skips: SkipEntry[],
  start: Date,
  end: Date,
): Omit<QuarterRecord, "year" | "quarter" | "label"> {
  const inRange = (d: string) => {
    const dt = new Date(d);
    return dt >= start && dt <= end;
  };

  const qTrades = trades.filter((t) => t.createdAt && inRange(t.createdAt));
  const qSkips  = skips.filter((s) => s.createdAt && inRange(s.createdAt));

  const closed  = qTrades.filter((t) => t.status === "closed");
  const wins    = closed.filter((t) => t.result === "win").length;
  const losses  = closed.filter((t) => t.result === "loss").length;

  // Win rate (0-100)
  const win_rate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;

  // Discipline ratio: skipped / (skipped + trades)
  const totalImpulses = qTrades.length + qSkips.length;
  const discipline = totalImpulses > 0
    ? Math.round((qSkips.length / totalImpulses) * 100) : 50;

  // FOMO control: 100 - avg FOMO score
  const fomoScores = qTrades.filter((t) => t.fomoScore !== undefined).map((t) => t.fomoScore!);
  const fomo_control = fomoScores.length > 0
    ? Math.round(100 - (fomoScores.reduce((a, b) => a + b, 0) / fomoScores.length))
    : 50;

  // Consistency: no big loss streaks
  // Check max consecutive losses
  let maxStreak = 0, curStreak = 0;
  closed.forEach((t) => {
    if (t.result === "loss") { curStreak++; maxStreak = Math.max(maxStreak, curStreak); }
    else { curStreak = 0; }
  });
  const consistency = Math.max(0, Math.round(100 - maxStreak * 20));

  // Weighted total
  const score = Math.round(
    win_rate * 0.40 +
    discipline * 0.30 +
    fomo_control * 0.20 +
    consistency * 0.10,
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    components: { win_rate, discipline, fomo_control, consistency },
    trades: qTrades.length,
    wins,
    skipped: qSkips.length,
  };
}

// ── Badge ─────────────────────────────────────────────────────────────────
type Badge = { label: string; color: string; bg: string; border: string; emoji: string };

function getBadge(score: number): Badge {
  if (score >= 80) return { label: "プラチナ",  color: "text-purple-300", bg: "bg-purple-500/15", border: "border-purple-500/40", emoji: "💎" };
  if (score >= 65) return { label: "ゴールド",   color: "text-amber-400",  bg: "bg-amber-500/15",  border: "border-amber-500/40",  emoji: "🥇" };
  if (score >= 50) return { label: "シルバー",   color: "text-slate-300",  bg: "bg-slate-500/15",  border: "border-slate-500/40",  emoji: "🥈" };
  if (score >= 35) return { label: "ブロンズ",   color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/40", emoji: "🥉" };
  return              { label: "修行中",     color: "text-muted-foreground", bg: "bg-white/5", border: "border-border/30", emoji: "🏋️" };
}

// ── Components ────────────────────────────────────────────────────────────
function ScoreDial({ score }: { score: number }) {
  const R = 56, C = 2 * Math.PI * R;
  const dash = (score / 100) * C;
  const color = score >= 80 ? "#a855f7" : score >= 65 ? "#f59e0b" : score >= 50 ? "#94a3b8" : score >= 35 ? "#f97316" : "#6b7280";
  return (
    <svg width={140} height={140} viewBox="0 0 140 140" className="rotate-[-90deg]">
      <circle cx={70} cy={70} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={12} />
      <circle cx={70} cy={70} r={R} fill="none" stroke={color} strokeWidth={12}
        strokeDasharray={`${dash} ${C}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x={70} y={74} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={28} fontWeight="bold" fontFamily="monospace"
        transform="rotate(90, 70, 70)">{score}</text>
      <text x={70} y={92} textAnchor="middle" dominantBaseline="middle"
        fill="rgba(255,255,255,0.4)" fontSize={9} fontFamily="sans-serif"
        transform="rotate(90, 70, 70)">握力スコア</text>
    </svg>
  );
}

function ComponentBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-bold text-foreground">{value}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function HistoryCard({ rec, onSelect }: { rec: QuarterRecord; onSelect: () => void }) {
  const badge = getBadge(rec.score);
  return (
    <button onClick={onSelect}
      className={cn("w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.01]", badge.bg, badge.border)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{rec.label}</p>
          <p className={cn("text-2xl font-mono font-bold", badge.color)}>{rec.score}</p>
        </div>
        <div className="text-right">
          <p className="text-xl">{badge.emoji}</p>
          <p className={cn("text-xs font-bold", badge.color)}>{badge.label}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
        <span>取引 {rec.trades}件</span>
        <span>勝率 {rec.components.win_rate}%</span>
        <span>見送り {rec.skipped}件</span>
      </div>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function GripStrengthChampionship() {
  const [history, setHistory] = useState<QuarterRecord[]>(loadHistory);
  const [selected, setSelected] = useState<QuarterRecord | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const cq = getCurrentQuarter();
  const trades = getTrades();
  const skips  = getSkipLog();

  const current = useMemo(() => {
    const s = computeQuarterScore(trades, skips, cq.start, cq.end);
    return {
      ...s,
      year: cq.year,
      quarter: cq.quarter,
      label: quarterLabel(cq.year, cq.quarter),
    } as QuarterRecord;
  }, []);

  const badge = getBadge(current.score);
  const best  = history.reduce((best, r) => r.score > best ? r.score : best, 0);
  const bestQ = history.find((r) => r.score === best);

  // Lock quarter at end
  const lockCurrentQuarter = () => {
    const exists = history.find((r) => r.year === current.year && r.quarter === current.quarter);
    const next = exists
      ? history.map((r) => r.year === current.year && r.quarter === current.quarter ? current : r)
      : [current, ...history];
    setHistory(next);
    saveHistory(next);
  };

  // Days left in quarter
  const today = new Date();
  const daysLeft = Math.ceil((cq.end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium mb-3">
          <Dumbbell className="w-3.5 h-3.5" />
          全国握力選手権 — 四半期大会
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">握力選手権</h1>
        <p className="text-xs text-muted-foreground mt-1">
          感情に流されず、ルールを守り続ける「握力」を競う四半期コンテスト
        </p>
      </div>

      {/* Current quarter card */}
      <div className={cn(
        "rounded-2xl border p-6 mb-5 text-center",
        badge.bg, badge.border,
      )}>
        <div className="flex items-center justify-center gap-2 mb-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          {current.label}
          <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-[10px]">
            残 {daysLeft}日
          </span>
        </div>

        <div className="flex items-center justify-center gap-8">
          <ScoreDial score={current.score} />
          <div className="text-left">
            <p className={cn("text-3xl mb-0.5")}>{badge.emoji}</p>
            <p className={cn("text-xl font-bold", badge.color)}>{badge.label}</p>
            <p className="text-xs text-muted-foreground mt-1">ランク</p>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="mt-5 space-y-2.5 text-left">
          <ComponentBar label="勝率 (40%)" value={current.components.win_rate} color="bg-emerald-500" />
          <ComponentBar label="見送り規律 (30%)" value={current.components.discipline} color="bg-primary" />
          <ComponentBar label="FOMO制御 (20%)" value={current.components.fomo_control} color="bg-purple-500" />
          <ComponentBar label="一貫性 (10%)" value={current.components.consistency} color="bg-amber-500" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: "取引", value: current.trades },
            { label: "勝利", value: current.wins },
            { label: "見送り", value: current.skipped },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 rounded-lg p-2.5 text-center">
              <p className="text-[9px] text-muted-foreground">{label}</p>
              <p className="text-lg font-mono font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <button onClick={lockCurrentQuarter}
          className="mt-4 w-full py-2 bg-primary/25 border border-primary/40 rounded-xl text-xs text-primary font-semibold hover:bg-primary/35 transition-colors">
          今期スコアを記録する
        </button>
      </div>

      {/* Personal best */}
      {best > 0 && bestQ && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-5 flex items-center gap-4">
          <Trophy className="w-8 h-8 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">自己ベスト記録</p>
            <p className="text-2xl font-mono font-bold text-amber-400">{best} pts</p>
            <p className="text-[10px] text-muted-foreground">{bestQ.label} / {getBadge(best).emoji} {getBadge(best).label}</p>
          </div>
        </div>
      )}

      {/* Score guide */}
      <div className="bg-white/5 rounded-xl border border-border/30 p-4 mb-5">
        <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400" />
          ランク基準
        </p>
        <div className="space-y-2">
          {[
            { range: "80-100", label: "💎 プラチナ", desc: "規律の達人。FOMAに打ち克つ鋼の握力", color: "text-purple-300" },
            { range: "65-79",  label: "🥇 ゴールド",  desc: "優れた自己管理。感情に流されない安定感", color: "text-amber-400" },
            { range: "50-64",  label: "🥈 シルバー",  desc: "平均以上の規律。さらなる向上で金を狙え", color: "text-slate-300" },
            { range: "35-49",  label: "🥉 ブロンズ",  desc: "基礎は固まりつつある。見送りを増やそう", color: "text-orange-400" },
            { range: "0-34",   label: "🏋️ 修行中",   desc: "まだ成長の余地がある。ルールを徹底しよう", color: "text-muted-foreground" },
          ].map(({ range, label, desc, color }) => (
            <div key={range} className="flex items-start gap-3">
              <span className="text-[9px] font-mono text-muted-foreground w-12 shrink-0 pt-0.5">{range}</span>
              <span className={cn("text-xs font-bold w-20 shrink-0", color)}>{label}</span>
              <span className="text-[10px] text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Score formula */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-5">
        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-primary" />
          握力スコア算出式
        </p>
        <div className="font-mono text-[10px] text-muted-foreground space-y-0.5">
          <p>握力スコア = 勝率×0.40 + 見送り規律×0.30 + FOMO制御×0.20 + 一貫性×0.10</p>
          <p className="mt-2 text-primary/70">・見送り規律 = 見送り数 / (取引数 + 見送り数)</p>
          <p>・FOMO制御 = 100 - 平均FOMAスコア</p>
          <p>・一貫性 = 100 - 最大連敗ストリーク×20</p>
        </div>
      </div>

      {/* History */}
      <div>
        <button onClick={() => setShowHistory((v) => !v)}
          className="flex items-center justify-between w-full text-left mb-3">
          <span className="text-sm font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            過去の記録 ({history.length}件)
          </span>
          <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", showHistory && "rotate-90")} />
        </button>

        {showHistory && (
          <div className="space-y-2">
            {history.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">まだ記録がありません。今期スコアを記録してみましょう！</p>
            )}
            {history
              .sort((a, b) => b.year * 10 + b.quarter - (a.year * 10 + a.quarter))
              .map((r, i) => (
                <HistoryCard key={i} rec={r} onSelect={() => setSelected(selected?.label === r.label ? null : r)} />
              ))}
          </div>
        )}

        {/* Selected detail */}
        {selected && (
          <div className="mt-3 p-4 bg-white/5 rounded-xl border border-border/30 space-y-2">
            <p className="text-xs font-bold text-foreground">{selected.label} 詳細</p>
            <ComponentBar label="勝率" value={selected.components.win_rate} color="bg-emerald-500" />
            <ComponentBar label="見送り規律" value={selected.components.discipline} color="bg-primary" />
            <ComponentBar label="FOMO制御" value={selected.components.fomo_control} color="bg-purple-500" />
            <ComponentBar label="一貫性" value={selected.components.consistency} color="bg-amber-500" />
          </div>
        )}
      </div>

      {/* Motivational quote */}
      <div className="mt-6 text-center text-[10px] text-muted-foreground/50 italic">
        "相場を長く生き残るための最大の武器は、感情を握りしめる力だ"
      </div>
    </div>
  );
}
