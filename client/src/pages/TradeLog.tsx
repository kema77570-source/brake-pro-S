// BRAKE Pro — TradeLog Page
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Plus, TrendingUp, TrendingDown, CheckCircle, XCircle,
  Clock, Filter, ChevronRight, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTrades, saveTrade, deleteTrade, recordTradeResult } from "@/lib/storage";
import { useApp } from "@/contexts/AppContext";
import type { TradeEntry } from "@/lib/types";
import { toast } from "sonner";

type FilterType = "all" | "planning" | "active" | "closed";

const STATUS_LABELS: Record<string, string> = {
  planning: "計画中",
  active: "保有中",
  closed: "決済済",
};
const STATUS_COLORS: Record<string, string> = {
  planning: "text-primary bg-primary/10 border-primary/20",
  active: "text-warning bg-warning/10 border-warning/20",
  closed: "text-muted-foreground bg-muted/30 border-border/20",
};

export default function TradeLog() {
  const [, navigate] = useLocation();
  const { settings, refreshLossStreak, checkSuspension } = useApp();
  const [filter, setFilter] = useState<FilterType>("all");
  const [trades, setTrades] = useState<TradeEntry[]>(() => getTrades());

  const refresh = useCallback(() => setTrades(getTrades()), []);

  const filtered = trades.filter((t) => filter === "all" || t.status === filter);

  const handleActivate = (trade: TradeEntry) => {
    saveTrade({ ...trade, status: "active", entryTime: new Date().toISOString() });
    refresh();
    toast.success(`${trade.ticker} をアクティブに変更しました`);
  };

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

  const totalPnL = trades
    .filter((t) => t.status === "closed" && t.result)
    .reduce((sum, t) => {
      if (t.result === "win") return sum + (t.rewardAmount ?? 0);
      if (t.result === "loss") return sum - (t.riskAmount ?? 0);
      return sum;
    }, 0);

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">トレード記録</h1>
          <p className="text-sm text-muted-foreground mt-1">{trades.length}件のトレード</p>
        </div>
        <Button onClick={() => navigate("/check")} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />新規チェック
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "勝ち", value: trades.filter((t) => t.result === "win").length, color: "text-success" },
          { label: "負け", value: trades.filter((t) => t.result === "loss").length, color: "text-destructive" },
          { label: "損益合計", value: `${totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(0)}`, color: totalPnL >= 0 ? "text-success" : "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/30 bg-card/50 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={cn("font-display font-bold text-xl num", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(["all", "planning", "active", "closed"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border",
              filter === f
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/30 bg-card/50 text-muted-foreground hover:border-border/60"
            )}
          >
            {f === "all" ? "すべて" : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Trade List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">トレードがありません</p>
          <Button variant="outline" onClick={() => navigate("/check")} className="mt-4">
            最初のチェックを始める
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((trade, i) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border/30 bg-card/50 p-4"
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
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full border font-medium",
                    trade.result === "win" ? "text-success bg-success/10 border-success/20" :
                    trade.result === "loss" ? "text-destructive bg-destructive/10 border-destructive/20" :
                    STATUS_COLORS[trade.status]
                  )}>
                    {trade.result === "win" ? "勝ち" : trade.result === "loss" ? "負け" : STATUS_LABELS[trade.status]}
                  </span>
                </div>
              </div>

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
              <div className="flex gap-2">
                {trade.status === "planning" && (
                  <Button size="sm" variant="outline" onClick={() => handleActivate(trade)} className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />保有開始
                  </Button>
                )}
                {trade.status === "active" && (
                  <>
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
    </div>
  );
}
