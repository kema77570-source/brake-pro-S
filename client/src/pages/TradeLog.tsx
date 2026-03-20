// BRAKE Pro — TradeLog Page
import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Plus, TrendingUp, TrendingDown, CheckCircle, XCircle,
  Clock, ChevronRight, Trash2, Send, Timer, AlertOctagon, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTrades, saveTrade, deleteTrade, recordTradeResult } from "@/lib/storage";
import { useApp } from "@/contexts/AppContext";
import type { TradeEntry } from "@/lib/types";
import { DEFAULT_HOLDING_LIMITS } from "@/lib/types";
import { isOverDeadline, hoursUntilDeadline } from "@/lib/holdingPeriod";
import { toast } from "sonner";
import OrderFormModal from "@/components/OrderFormModal";

type TabType = "cooling" | "active";

const STATUS_COLORS: Record<string, string> = {
  cooling: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  active:  "text-warning bg-warning/10 border-warning/20",
  closed:  "text-muted-foreground bg-muted/30 border-border/20",
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function CoolingTimer({
  coolingUntil,
  onExtend,
}: {
  coolingUntil: string;
  onExtend: () => void;
}) {
  const [remaining, setRemaining] = useState(() => new Date(coolingUntil).getTime() - Date.now());
  const [showImpulseCheck, setShowImpulseCheck] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(new Date(coolingUntil).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [coolingUntil]);

  const pct = Math.max(0, Math.min(100, (remaining / (new Date(coolingUntil).getTime() - Date.now() + remaining)) * 100));

  if (remaining <= 0) return <span className="text-emerald-400 text-xs font-medium">冷却完了</span>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Timer className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="font-mono text-blue-400 font-bold text-sm">{formatCountdown(remaining)}</span>
        <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden min-w-[60px]">
          <div
            className="h-full bg-blue-400 rounded-full transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
        <button
          onClick={() => setShowImpulseCheck(true)}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors shrink-0"
        >
          <Zap className="w-3 h-3" />衝動チェック
        </button>
      </div>

      {showImpulseCheck && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
          <p className="text-xs text-amber-300 font-medium">今すぐ入りたい衝動を感じていますか？</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowImpulseCheck(false);
                onExtend();
              }}
              className="flex-1 text-xs py-1.5 rounded-lg bg-destructive/20 border border-destructive/30 text-destructive hover:bg-destructive/30 transition-colors font-medium"
            >
              はい（衝動あり）
            </button>
            <button
              onClick={() => setShowImpulseCheck(false)}
              className="flex-1 text-xs py-1.5 rounded-lg bg-success/10 border border-success/20 text-success hover:bg-success/20 transition-colors font-medium"
            >
              問題なし
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TradeLog() {
  const [, navigate] = useLocation();
  const { settings, refreshLossStreak, checkSuspension } = useApp();
  const holdingLimits = settings.holdingLimits ?? DEFAULT_HOLDING_LIMITS;
  const [tab, setTab] = useState<TabType>("cooling");
  const [trades, setTrades] = useState<TradeEntry[]>(() => getTrades());
  const [sellTarget, setSellTarget] = useState<TradeEntry | null>(null);
  const [now, setNow] = useState(Date.now());
  const [slConfirmId, setSlConfirmId] = useState<string | null>(null);

  // Tick every second to auto-expire cooling trades
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      // Auto-promote expired cooling trades to active
      const current = getTrades();
      let changed = false;
      current.forEach((t) => {
        if (t.status === "cooling" && t.coolingUntil && new Date(t.coolingUntil).getTime() <= Date.now()) {
          saveTrade({ ...t, status: "active", entryTime: t.entryTime ?? new Date().toISOString() });
          changed = true;
        }
      });
      if (changed) setTrades(getTrades());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(() => setTrades(getTrades()), []);

  const coolingTrades = trades.filter((t) => t.status === "cooling");
  const activeTrades  = trades.filter((t) => t.status === "active");
  const displayed     = tab === "cooling" ? coolingTrades : activeTrades;

  const handleClose = (trade: TradeEntry, result: "win" | "loss" | "breakeven") => {
    saveTrade({ ...trade, status: "closed", result, exitTime: new Date().toISOString() });
    if (result === "win" || result === "loss") {
      recordTradeResult(result, settings);
      refreshLossStreak();
      checkSuspension();
    }
    refresh();
    toast.success(`${trade.ticker} を決済しました`);
  };

  const handleDelete = (id: string) => {
    deleteTrade(id);
    refresh();
    toast.info("トレードを削除しました");
  };

  const handlePromote = (trade: TradeEntry) => {
    saveTrade({ ...trade, status: "active", entryTime: new Date().toISOString(), coolingUntil: undefined });
    refresh();
    toast.success(`${trade.ticker} を保有銘柄に移動しました`);
  };

  const handleExtendCooling = (trade: TradeEntry) => {
    const currentUntil = trade.coolingUntil ? new Date(trade.coolingUntil).getTime() : Date.now();
    const newUntil = new Date(Math.max(currentUntil, Date.now()) + 30 * 60 * 1000).toISOString();
    saveTrade({ ...trade, coolingUntil: newUntil });
    refresh();
    toast.warning(`${trade.ticker} の冷却時間を30分延長しました`);
  };

  const handleSlDelay = (trade: TradeEntry) => {
    const newCount = (trade.slDelayCount ?? 0) + 1;
    const key = `sl_delay_${trade.id}`;
    localStorage.setItem(key, String(newCount));
    saveTrade({ ...trade, slDelayCount: newCount });
    refresh();
    setSlConfirmId(null);
    toast.warning(`先延ばし記録: ${newCount}回目`);
  };

  const handleSlExecute = (trade: TradeEntry) => {
    handleClose(trade, "loss");
    setSlConfirmId(null);
  };

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">トレード記録</h1>
          <p className="text-sm text-muted-foreground mt-1">
            冷却中 {coolingTrades.length}件 / 保有中 {activeTrades.length}件
          </p>
        </div>
        <Button onClick={() => navigate("/check")} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />新規チェック
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: "cooling", label: "冷却期間中", count: coolingTrades.length, color: "text-blue-400 border-blue-500/40 bg-blue-500/10" },
          { key: "active",  label: "保有銘柄",   count: activeTrades.length,  color: "text-warning border-warning/40 bg-warning/10" },
        ] as { key: TabType; label: string; count: number; color: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
              tab === t.key ? t.color : "border-border/30 bg-card/50 text-muted-foreground hover:border-border/60"
            )}
          >
            {t.label}
            <span className={cn(
              "text-[11px] px-1.5 py-0.5 rounded-full font-bold",
              tab === t.key ? "bg-white/10" : "bg-white/5"
            )}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Trade List */}
      {displayed.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">
            {tab === "cooling" ? "冷却期間中のトレードはありません" : "保有中のトレードはありません"}
          </p>
          <Button variant="outline" onClick={() => navigate("/check")} className="mt-4">
            新規チェックを始める
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((trade, i) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "rounded-xl border bg-card/50 p-4",
                trade.status === "cooling" ? "border-blue-500/20" : "border-border/30"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    trade.direction === "long" ? "bg-success/10" : "bg-destructive/10"
                  )}>
                    {trade.direction === "long"
                      ? <TrendingUp className="w-4 h-4 text-success" />
                      : <TrendingDown className="w-4 h-4 text-destructive" />}
                  </div>
                  <div>
                    <p className="font-display font-bold text-foreground">{trade.ticker}</p>
                    <p className="text-xs text-muted-foreground">{trade.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {trade.orderType && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                      trade.orderType === "moomoo" ? "text-primary bg-primary/10 border-primary/20" :
                      trade.orderType === "demo"   ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                      "text-muted-foreground bg-muted/20 border-border/20"
                    )}>
                      {trade.orderType === "moomoo" ? "📱moomoo" : trade.orderType === "demo" ? "🧪デモ" : "🏦他社"}
                    </span>
                  )}
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full border font-medium",
                    STATUS_COLORS[trade.status]
                  )}>
                    {trade.status === "cooling" ? "冷却期間中" : "保有中"}
                  </span>
                </div>
              </div>

              {/* Cooling timer */}
              {trade.status === "cooling" && trade.coolingUntil && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <CoolingTimer
                    coolingUntil={trade.coolingUntil}
                    onExtend={() => handleExtendCooling(trade)}
                  />
                </div>
              )}

              {/* Stop-loss confirm dialog */}
              {trade.status === "active" && trade.stopLossPrice && slConfirmId === trade.id && (
                <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 space-y-2">
                  <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    損切りラインに達しましたか？（設定: {trade.stopLossPrice.toLocaleString()}）
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSlExecute(trade)}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive hover:bg-destructive/30 transition-colors font-medium"
                    >
                      実行した（損切り決済）
                    </button>
                    <button
                      onClick={() => handleSlDelay(trade)}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-muted/30 border border-border/30 text-muted-foreground hover:bg-muted/50 transition-colors font-medium"
                    >
                      まだ保留
                    </button>
                  </div>
                  <button
                    onClick={() => setSlConfirmId(null)}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              )}

              {/* Holding deadline indicator */}
              {trade.status === "active" && (() => {
                const overdue = isOverDeadline(trade, holdingLimits);
                const hrs = hoursUntilDeadline(trade, holdingLimits);
                if (!overdue && (hrs === null || hrs > 4)) return null;
                return (
                  <div className={cn(
                    "flex items-center gap-1.5 text-[10px] mb-2 px-1",
                    overdue ? "text-destructive" : "text-amber-400"
                  )}>
                    <Clock className="w-3 h-3" />
                    {overdue ? "期限超過 — 戦略を確認してください" : `期限まであと${Math.round(hrs!)}時間`}
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                <div>
                  <p className="text-muted-foreground">エントリー</p>
                  <p className="font-mono font-medium text-foreground">{trade.entryPrice?.toLocaleString() ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">損切り</p>
                  <p className="font-mono font-medium text-destructive">{trade.stopLossPrice?.toLocaleString() ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">利確</p>
                  <p className="font-mono font-medium text-success">{trade.takeProfitPrice?.toLocaleString() ?? "—"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                {trade.riskRewardRatio && (
                  <span className="font-mono">RR: 1:{trade.riskRewardRatio}</span>
                )}
                {trade.fomoScore !== undefined && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full",
                    trade.fomoScore >= 70 ? "bg-destructive/10 text-destructive" :
                    trade.fomoScore >= 50 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                  )}>
                    FOMO: {trade.fomoScore}
                  </span>
                )}
                <span>{new Date(trade.createdAt).toLocaleDateString("ja-JP")}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {trade.status === "cooling" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePromote(trade)}
                    className="text-xs text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                  >
                    <Clock className="w-3 h-3 mr-1" />今すぐ保有開始
                  </Button>
                )}
                {trade.status === "active" && (
                  <>
                    {trade.orderType === "moomoo" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSellTarget(trade)}
                        className="text-xs text-primary border-primary/30 hover:bg-primary/10"
                      >
                        <Send className="w-3 h-3 mr-1" />売却注文
                      </Button>
                    )}
                    {trade.stopLossPrice && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSlConfirmId(slConfirmId === trade.id ? null : trade.id)}
                        className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        <AlertOctagon className="w-3 h-3 mr-1" />損切り確認
                        {trade.slDelayCount ? (
                          <span className="ml-1 text-[10px] bg-destructive/20 px-1 rounded">{trade.slDelayCount}回</span>
                        ) : null}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleClose(trade, "win")} className="text-xs text-success border-success/30 hover:bg-success/10">
                      <CheckCircle className="w-3 h-3 mr-1" />勝ち
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleClose(trade, "loss")} className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                      <XCircle className="w-3 h-3 mr-1" />負け
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleClose(trade, "breakeven")} className="text-xs">
                      トントン
                    </Button>
                  </>
                )}
                <button
                  onClick={() => navigate(`/trades/${trade.id}`)}
                  className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(trade.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 売却注文モーダル */}
      {sellTarget && (
        <OrderFormModal
          open={true}
          onClose={() => setSellTarget(null)}
          onSuccess={() => {
            setSellTarget(null);
            toast.success(`${sellTarget.ticker} の売却注文を送信しました`);
          }}
          ticker={sellTarget.ticker}
          name={sellTarget.name}
          side="SELL"
          defaultPrice={sellTarget.takeProfitPrice ?? sellTarget.entryPrice}
        />
      )}
    </div>
  );
}
