// BRAKE Pro — TradeDetail Page
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, TrendingUp, TrendingDown, CheckCircle, XCircle, Brain, Activity, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getTradeById, saveTrade } from "@/lib/storage";
import { toast } from "sonner";
import { computeDeadline, formatDeadline, isOverDeadline, labelToCategory, CATEGORY_LABELS } from "@/lib/holdingPeriod";
import { useApp } from "@/contexts/AppContext";
import { DEFAULT_HOLDING_LIMITS } from "@/lib/types";
import OrderFormModal from "@/components/OrderFormModal";

export default function TradeDetail() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { settings } = useApp();
  const [trade, setTrade] = useState(() => getTradeById(id));
  const [reflection, setReflection] = useState(trade?.reflection ?? "");
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const holdingLimits = settings.holdingLimits ?? DEFAULT_HOLDING_LIMITS;

  if (!trade) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">トレードが見つかりません</p>
          <Button variant="outline" onClick={() => navigate("/trades")} className="mt-4">
            一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  const saveReflection = () => {
    const updated = { ...trade, reflection, reflectedAt: new Date().toISOString() };
    saveTrade(updated);
    setTrade(updated);
    toast.success("振り返りを保存しました");
  };

  const fomoLevel = trade.fomoScore >= 75 ? "critical" : trade.fomoScore >= 50 ? "high" : trade.fomoScore >= 30 ? "medium" : "low";
  const fomoColors = {
    critical: "text-destructive",
    high: "text-warning",
    medium: "text-yellow-400",
    low: "text-success",
  };

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate("/trades")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />トレード一覧
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            trade.direction === "long" ? "bg-success/10" : "bg-destructive/10"
          )}>
            {trade.direction === "long"
              ? <TrendingUp className="w-6 h-6 text-success" />
              : <TrendingDown className="w-6 h-6 text-destructive" />}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{trade.ticker}</h1>
            <p className="text-sm text-muted-foreground">{trade.name} · {trade.direction === "long" ? "ロング" : "ショート"}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {trade.result === "win" ? (
              <CheckCircle className="w-8 h-8 text-success" />
            ) : trade.result === "loss" ? (
              <XCircle className="w-8 h-8 text-destructive" />
            ) : null}
            {trade.status === "active" && trade.orderType === "moomoo" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSellModalOpen(true)}
                className="text-xs text-primary border-primary/30 hover:bg-primary/10 gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />売却注文
              </Button>
            )}
          </div>
        </div>

        {/* Price levels */}
        <div className="rounded-xl border border-border/30 bg-card/50 p-5 mb-5">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">価格設定</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "エントリー", value: trade.entryPrice, color: "text-foreground" },
              { label: "損切り", value: trade.stopLossPrice, color: "text-destructive" },
              { label: "利確", value: trade.takeProfitPrice, color: "text-success" },
            ].map((p) => (
              <div key={p.label} className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{p.label}</p>
                <p className={cn("font-mono font-bold text-lg num", p.color)}>
                  {p.value?.toLocaleString() ?? "—"}
                </p>
              </div>
            ))}
          </div>
          {trade.riskRewardRatio && (
            <div className="mt-4 pt-4 border-t border-border/20 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">リスクリワード比</span>
              <span className={cn(
                "font-display font-bold text-xl num",
                trade.riskRewardRatio >= 2 ? "text-success" : trade.riskRewardRatio >= 1.5 ? "text-warning" : "text-destructive"
              )}>
                1 : {trade.riskRewardRatio}
              </span>
            </div>
          )}
        </div>

        {/* FOMO Analysis */}
        <div className="rounded-xl border border-border/30 bg-card/50 p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">FOMO分析</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: "総合スコア", value: trade.fomoScore, color: fomoColors[fomoLevel] },
              { label: "銘柄FOMO", value: trade.marketFomoScore, color: trade.marketFomoScore >= 70 ? "text-destructive" : trade.marketFomoScore >= 50 ? "text-warning" : "text-success" },
              { label: "自分FOMO", value: trade.userFomoScore, color: trade.userFomoScore >= 70 ? "text-destructive" : trade.userFomoScore >= 50 ? "text-warning" : "text-success" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className={cn("font-display font-bold text-2xl num", s.color)}>{s.value}</p>
              </div>
            ))}
          </div>
          {trade.fomoFactors && trade.fomoFactors.length > 0 && (
            <div className="space-y-1.5">
              {trade.fomoFactors.filter((f) => f.risk).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-warning/80">
                  <XCircle className="w-3 h-3 text-destructive shrink-0" />
                  {f.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Audit */}
        {trade.aiAuditResult && (
          <div className="rounded-xl border border-border/30 bg-card/50 p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">AIテクニカル監査</h2>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: "RSI", value: trade.aiAuditResult.rsiSignal },
                { label: "MA乖離", value: trade.aiAuditResult.maSignal },
                { label: "出来高", value: trade.aiAuditResult.volumeSignal },
                { label: "市場心理", value: trade.aiAuditResult.trendSignal },
              ].map((item) => (
                <div key={item.label} className="flex gap-3">
                  <span className="text-muted-foreground w-16 shrink-0 text-xs">{item.label}</span>
                  <span className="text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order type */}
        {trade.orderType && (
          <div className="rounded-xl border border-border/30 bg-card/50 p-4 mb-4 flex items-center gap-3">
            <span className="text-2xl">
              {trade.orderType === "moomoo" ? "📱" : trade.orderType === "demo" ? "🧪" : "🏦"}
            </span>
            <div>
              <p className="text-xs text-muted-foreground">発注方法</p>
              <p className="text-sm font-semibold text-foreground">
                {trade.orderType === "moomoo" ? "MooMoo証券" : trade.orderType === "demo" ? "デモ取引" : "他の証券会社"}
              </p>
            </div>
          </div>
        )}

        {/* Holding deadline */}
        {trade.status !== "closed" && trade.status !== "skipped" && (() => {
          const deadline = computeDeadline(trade, holdingLimits);
          const overdue = isOverDeadline(trade, holdingLimits);
          if (!deadline) return null;
          return (
            <div className={cn(
              "rounded-xl border p-4 mb-4",
              overdue ? "bg-destructive/10 border-destructive/30" : "bg-amber-500/8 border-amber-500/20"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className={cn("w-4 h-4", overdue ? "text-destructive" : "text-amber-400")} />
                  <div>
                    <p className="text-xs text-muted-foreground">保有期限</p>
                    <p className={cn("text-sm font-semibold", overdue ? "text-destructive" : "text-foreground")}>
                      {overdue ? "期限超過" : formatDeadline(deadline)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/strategy-review/${trade.id}`)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors",
                    overdue
                      ? "bg-destructive/15 border-destructive/30 text-destructive hover:bg-destructive/25"
                      : "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
                  )}
                >
                  {overdue ? "戦略を確認する" : "保有区分を変更"}
                </button>
              </div>
              {trade.strategyChanges && trade.strategyChanges.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">変更履歴 ({trade.strategyChanges.length}件)</p>
                  {trade.strategyChanges.slice(-2).map(c => (
                    <div key={c.id} className="text-[10px] text-muted-foreground">
                      {c.timestamp.slice(0, 10)} {CATEGORY_LABELS[c.fromCategory]}→{CATEGORY_LABELS[c.toCategory]}: {c.verdict === "strategy_update" ? "✅戦略更新" : "⚠️" + c.verdict}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Psychology / Survey answers */}
        <div className="rounded-xl border border-border/30 bg-card/50 p-5 mb-5">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">アンケート回答履歴</h2>
          <div className="space-y-3 text-sm">
            {[
              { label: "心理状態", value: (() => {
                const MAP: Record<string, string> = {
                  rule: "🟢 完全にルール通り", mostly_rule: "🔵 ほぼルール通り",
                  neutral: "⚪ どちらとも言えない", mostly_emotion: "🟡 やや感情寄り", emotion: "🔴 明らかに感情寄り",
                };
                return trade.mindset ? (MAP[trade.mindset] ?? trade.mindset) : "";
              })() },
              { label: "エントリー理由", value: trade.entryReason },
              { label: "情報ソース", value: trade.infoSource },
              { label: "今やる理由", value: trade.whyNow },
              { label: "保有予定", value: trade.holdPeriodLabel },
              { label: "損切り根拠", value: trade.stopLossReason },
            ].filter((i) => i.value).map((item) => (
              <div key={item.label} className="flex gap-3">
                <span className="text-muted-foreground w-28 shrink-0 text-xs pt-0.5">{item.label}</span>
                <span className="text-foreground leading-snug">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reflection */}
        <div className="rounded-xl border border-border/30 bg-card/50 p-5 mb-8">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">振り返り</h2>
          <Textarea
            placeholder="このトレードから何を学びましたか？次回に活かせることは？"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            className="min-h-[120px] bg-card/30 border-border/30 mb-4"
          />
          <Button onClick={saveReflection} className="w-full bg-primary hover:bg-primary/90">
            振り返りを保存
          </Button>
        </div>
      </div>

      <OrderFormModal
        open={sellModalOpen}
        onClose={() => setSellModalOpen(false)}
        onSuccess={() => {
          setSellModalOpen(false);
          toast.success(`${trade.ticker} の売却注文を送信しました`);
        }}
        ticker={trade.ticker}
        name={trade.name}
        side="SELL"
        defaultPrice={trade.takeProfitPrice ?? trade.entryPrice}
      />
    </div>
  );
}
