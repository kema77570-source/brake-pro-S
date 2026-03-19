// NisaTracker — NISA管理 + 高配当株一覧 + 貸株金利
import { useState, useEffect, useMemo } from "react";
import {
  PiggyBank, TrendingUp, Percent, RefreshCw,
  ChevronUp, ChevronDown, Info, Star, DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

const MOOMOO_BASE = "http://127.0.0.1:8000";

// ── Types ──────────────────────────────────────────────────────────────────
interface DividendStock {
  code: string; ticker: string; name: string;
  sector: string; div_yield_est: number; market: string;
}
interface LendingRate {
  ticker: string; name: string; rate: number; availability: string;
}
interface NisaLimits {
  growth: number; accumulation: number; total_annual: number; lifetime: number;
}

// ── Storage key for NISA usage tracking ──────────────────────────────────
const NISA_KEY = "brake_nisa_usage";

interface NisaUsage {
  year: number;
  growth_used: number;       // 成長投資枠 使用額
  accumulation_used: number; // つみたて投資枠 使用額
  lifetime_used: number;     // 累計使用額
}

function getNisaUsage(): NisaUsage {
  try {
    const raw = localStorage.getItem(NISA_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { year: new Date().getFullYear(), growth_used: 0, accumulation_used: 0, lifetime_used: 0 };
}
function saveNisaUsage(u: NisaUsage) {
  localStorage.setItem(NISA_KEY, JSON.stringify(u));
}

// ── Progress bar ──────────────────────────────────────────────────────────
function ProgressBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = Math.min(100, (used / total) * 100);
  return (
    <div className="mt-1.5 h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function fmtJPY(n: number) {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}千万`;
  if (n >= 1_000_000)  return `${(n / 1_000_000).toFixed(1)}百万`;
  if (n >= 10_000)     return `${(n / 10_000).toFixed(0)}万`;
  return n.toLocaleString();
}

// ── Availability badge ────────────────────────────────────────────────────
const availBadge = (a: string) => {
  const map: Record<string, string> = {
    高: "bg-emerald-500/20 text-emerald-400",
    中: "bg-amber-500/20 text-amber-400",
    低: "bg-rose-500/20 text-rose-400",
  };
  return (
    <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded", map[a] || "bg-white/10 text-muted-foreground")}>
      {a}
    </span>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────
type Tab = "tracker" | "dividends" | "lending";

export default function NisaTracker() {
  const [tab, setTab] = useState<Tab>("tracker");
  const [dividends, setDividends]   = useState<DividendStock[]>([]);
  const [limits, setLimits]         = useState<NisaLimits | null>(null);
  const [lending, setLending]       = useState<LendingRate[]>([]);
  const [loading, setLoading]       = useState(false);
  const [divSort, setDivSort]       = useState<"div_yield_est" | "name">("div_yield_est");
  const [divFilter, setDivFilter]   = useState("");
  const [lendFilter, setLendFilter] = useState(0);
  const [usage, setUsage]           = useState<NisaUsage>(getNisaUsage);

  // Fetch dividend list
  const fetchDividends = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${MOOMOO_BASE}/api/nisa/dividends`, { params: { sort_by: divSort } });
      setDividends(res.data.stocks || []);
      setLimits(res.data.nisa_limit || null);
    } catch {
      // Use fallback static list
    } finally { setLoading(false); }
  };

  const fetchLending = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${MOOMOO_BASE}/api/nisa/lending-rates`, { params: { min_rate: lendFilter } });
      setLending(res.data.rates || []);
    } catch {
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === "dividends" && dividends.length === 0) fetchDividends();
    if (tab === "lending" && lending.length === 0) fetchLending();
  }, [tab]);

  const filteredDividends = useMemo(() =>
    dividends.filter((s) =>
      s.name.includes(divFilter) || s.ticker.includes(divFilter) || s.sector.includes(divFilter)
    ), [dividends, divFilter]);

  const updateUsage = (key: "growth_used" | "accumulation_used", val: number) => {
    const next = { ...usage, [key]: Math.max(0, val) };
    next.lifetime_used = usage.lifetime_used + (val - usage[key]);
    setUsage(next);
    saveNisaUsage(next);
  };

  const NISA_GROWTH    = 2_400_000;
  const NISA_ACCUM     = 1_200_000;
  const NISA_LIFETIME  = 18_000_000;

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-primary" />
          NISA管理センター
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          非課税枠管理 / 高配当株一覧 / 貸株金利
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-5 bg-white/5 rounded-xl p-1 border border-border/30">
        {[
          { key: "tracker" as Tab,   label: "非課税枠管理", icon: PiggyBank },
          { key: "dividends" as Tab, label: "高配当株",      icon: TrendingUp },
          { key: "lending" as Tab,   label: "貸株金利",       icon: Percent },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              tab === key ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground",
            )}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── Tab: 非課税枠 ── */}
      {tab === "tracker" && (
        <div className="space-y-5">
          {/* Year banner */}
          <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
            <div>
              <p className="text-sm font-bold text-foreground">{currentYear}年 NISA 非課税枠</p>
              <p className="text-[10px] text-muted-foreground">新NISA（2024年〜）/ 合計上限 360万円/年</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>生涯: {fmtJPY(usage.lifetime_used)} / {fmtJPY(NISA_LIFETIME)}</p>
            </div>
          </div>

          {/* 成長投資枠 */}
          <div className="bg-white/5 rounded-xl border border-border/30 p-4">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm font-bold text-foreground">成長投資枠</p>
                <p className="text-[10px] text-muted-foreground">株式・ETF・投資信託（上限 240万円/年）</p>
              </div>
              <span className={cn("text-xs font-mono font-bold",
                usage.growth_used >= NISA_GROWTH ? "text-rose-400" : "text-emerald-400")}>
                残 {fmtJPY(Math.max(0, NISA_GROWTH - usage.growth_used))}
              </span>
            </div>
            <ProgressBar used={usage.growth_used} total={NISA_GROWTH}
              color={usage.growth_used >= NISA_GROWTH ? "bg-rose-500" : "bg-emerald-500"} />
            <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
              <span>使用: {fmtJPY(usage.growth_used)}</span>
              <span>上限: {fmtJPY(NISA_GROWTH)}</span>
            </div>
            {/* Input */}
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">使用額を更新:</label>
              <input
                type="number" step={10000} min={0} max={NISA_GROWTH}
                className="flex-1 bg-background border border-border/50 rounded-lg px-2 py-1 text-xs font-mono text-foreground"
                value={usage.growth_used}
                onChange={(e) => updateUsage("growth_used", Number(e.target.value))}
              />
              <span className="text-xs text-muted-foreground">円</span>
            </div>
          </div>

          {/* つみたて投資枠 */}
          <div className="bg-white/5 rounded-xl border border-border/30 p-4">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm font-bold text-foreground">つみたて投資枠</p>
                <p className="text-[10px] text-muted-foreground">投資信託のみ（上限 120万円/年）</p>
              </div>
              <span className={cn("text-xs font-mono font-bold",
                usage.accumulation_used >= NISA_ACCUM ? "text-rose-400" : "text-primary")}>
                残 {fmtJPY(Math.max(0, NISA_ACCUM - usage.accumulation_used))}
              </span>
            </div>
            <ProgressBar used={usage.accumulation_used} total={NISA_ACCUM}
              color={usage.accumulation_used >= NISA_ACCUM ? "bg-rose-500" : "bg-primary"} />
            <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
              <span>使用: {fmtJPY(usage.accumulation_used)}</span>
              <span>上限: {fmtJPY(NISA_ACCUM)}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">使用額を更新:</label>
              <input
                type="number" step={10000} min={0} max={NISA_ACCUM}
                className="flex-1 bg-background border border-border/50 rounded-lg px-2 py-1 text-xs font-mono text-foreground"
                value={usage.accumulation_used}
                onChange={(e) => updateUsage("accumulation_used", Number(e.target.value))}
              />
              <span className="text-xs text-muted-foreground">円</span>
            </div>
          </div>

          {/* 生涯枠 */}
          <div className="bg-white/5 rounded-xl border border-border/30 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-foreground">生涯非課税限度額</p>
              <span className={cn("text-xs font-mono font-bold",
                usage.lifetime_used >= NISA_LIFETIME ? "text-rose-400" : "text-foreground")}>
                残 {fmtJPY(Math.max(0, NISA_LIFETIME - usage.lifetime_used))}
              </span>
            </div>
            <ProgressBar used={usage.lifetime_used} total={NISA_LIFETIME}
              color={usage.lifetime_used >= NISA_LIFETIME * 0.8 ? "bg-amber-500" : "bg-indigo-500"} />
            <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
              <span>累計: {fmtJPY(usage.lifetime_used)}</span>
              <span>上限: {fmtJPY(NISA_LIFETIME)}</span>
            </div>
          </div>

          {/* NISA rules */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-xs text-muted-foreground space-y-1.5">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" />新NISA制度概要（2024年〜）
            </p>
            <p>・成長投資枠: 年240万円 ／ 対象: 上場株式・ETF・投資信託など</p>
            <p>・つみたて枠: 年120万円 ／ 対象: 金融庁認定の長期積立用投資信託</p>
            <p>・生涯枠: 1,800万円（うち成長1,200万・つみたて600万）</p>
            <p>・非課税期間: <strong className="text-foreground">無期限</strong></p>
            <p>・売却後の枠: 翌年に復活（年間枠の範囲内）</p>
          </div>
        </div>
      )}

      {/* ── Tab: 高配当株 ── */}
      {tab === "dividends" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white/5 border border-border/50 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50"
              placeholder="銘柄名・セクター・コードで検索"
              value={divFilter}
              onChange={(e) => setDivFilter(e.target.value)}
            />
            <button onClick={fetchDividends} disabled={loading}
              className="p-1.5 rounded-lg bg-primary/20 border border-primary/30">
              <RefreshCw className={cn("w-4 h-4 text-primary", loading && "animate-spin")} />
            </button>
          </div>

          <div className="bg-white/3 rounded-xl border border-border/30 overflow-hidden">
            <div className="px-4 py-2 border-b border-border/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">NISA対象 高配当株一覧</span>
              <span className="text-[10px] text-muted-foreground">利回りは推計値</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="px-4 py-2 text-left text-muted-foreground font-medium">銘柄</th>
                  <th className="px-3 py-2 text-left text-muted-foreground font-medium">セクター</th>
                  <th
                    className="px-3 py-2 text-right text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                    onClick={() => setDivSort("div_yield_est")}
                  >
                    配当利回り ▼
                  </th>
                  <th className="px-3 py-2 text-right text-muted-foreground font-medium">市場</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {(filteredDividends.length > 0 ? filteredDividends : dividends).map((s) => (
                  <tr key={s.ticker} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{s.ticker}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">
                        {s.sector}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn("font-mono font-bold",
                        s.div_yield_est >= 4 ? "text-emerald-400" :
                        s.div_yield_est >= 2.5 ? "text-primary" : "text-foreground")}>
                        {s.div_yield_est.toFixed(2)}%
                      </span>
                      {s.div_yield_est >= 4 && <Star className="inline w-2.5 h-2.5 text-amber-400 ml-1" />}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-[10px] text-muted-foreground">{s.market}</span>
                    </td>
                  </tr>
                ))}
                {dividends.length === 0 && !loading && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-xs">
                    moomooサーバーに接続してデータを取得してください
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground/60 text-center">
            ※ 配当利回りは参考推計値です。実際の利回りは各社IR・moomoo証券でご確認ください。
          </p>
        </div>
      )}

      {/* ── Tab: 貸株金利 ── */}
      {tab === "lending" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground whitespace-nowrap">最低金利:</label>
            <input type="range" min={0} max={5} step={0.5} value={lendFilter}
              onChange={(e) => setLendFilter(Number(e.target.value))}
              className="flex-1" />
            <span className="text-xs font-mono text-primary w-12 text-right">{lendFilter}%+</span>
            <button onClick={fetchLending} disabled={loading}
              className="p-1.5 rounded-lg bg-primary/20 border border-primary/30">
              <RefreshCw className={cn("w-4 h-4 text-primary", loading && "animate-spin")} />
            </button>
          </div>

          <div className="bg-white/3 rounded-xl border border-border/30 overflow-hidden">
            <div className="px-4 py-2 border-b border-border/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">貸株金利 一覧（年率 / 参考値）</span>
              <span className="text-[10px] text-muted-foreground">高い順</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="px-4 py-2 text-left text-muted-foreground font-medium">銘柄</th>
                  <th className="px-3 py-2 text-right text-muted-foreground font-medium">年利率</th>
                  <th className="px-3 py-2 text-right text-muted-foreground font-medium">空株在庫</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {(lending.filter((r) => r.rate >= lendFilter).length > 0
                  ? lending.filter((r) => r.rate >= lendFilter)
                  : lending
                ).map((r) => (
                  <tr key={r.ticker + r.rate} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{r.ticker}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn("font-mono font-bold",
                        r.rate >= 3 ? "text-amber-400" :
                        r.rate >= 1 ? "text-primary" : "text-foreground")}>
                        {r.rate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {availBadge(r.availability)}
                    </td>
                  </tr>
                ))}
                {lending.length === 0 && !loading && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground text-xs">
                    moomooサーバーに接続してデータを取得してください
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-muted-foreground">
            <p className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />貸株サービスについて
            </p>
            <p>・貸株とは、保有株式を証券会社に貸し出し、金利収入を得るサービスです。</p>
            <p>・金利は需給により変動します。実際の金利はmoomoo証券アプリ内でご確認ください。</p>
            <p>・貸株中は配当金が「貸株金利相当額」として受け取りとなり、確定申告の扱いが異なる場合があります。</p>
            <p>・NISA口座での貸株は非課税扱いにならない場合があります。</p>
          </div>
        </div>
      )}
    </div>
  );
}
