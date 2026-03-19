// BRAKE Pro — TradeDetail Page
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, TrendingUp, TrendingDown, CheckCircle, XCircle, Brain, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getTradeById, saveTrade } from "@/lib/storage";
import { toast } from "sonner";

export default function TradeDetail() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [trade, setTrade] = useState(() => getTradeById(id));
  const [reflection, setReflection] = useState(trade?.reflection ?? "");

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
          <div className="ml-auto">
            {trade.result === "win" ? (
              <CheckCircle className="w-8 h-8 text-success" />
            ) : trade.result === "loss" ? (
              <XCircle className="w-8 h-8 text-destructive" />
            ) : null}
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

        {/* Psychology */}
        <div className="rounded-xl border border-border/30 bg-card/50 p-5 mb-5">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">心理記録</h2>
          <div className="space-y-3 text-sm">
            {[
              { label: "きっかけ", value: trade.triggerReason },
              { label: "エントリー理由", value: trade.entryReason },
              { label: "情報ソース", value: trade.infoSource },
              { label: "今やる理由", value: trade.whyNow },
              { label: "保有予定", value: trade.holdPeriodLabel },
              { label: "損切り根拠", value: trade.stopLossReason },
            ].filter((i) => i.value).map((item) => (
              <div key={item.label} className="flex gap-3">
                <span className="text-muted-foreground w-24 shrink-0 text-xs">{item.label}</span>
                <span className="text-foreground">{item.value}</span>
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
    </div>
  );
}
