import React from 'react';
import { StrategyDefinition } from '@/lib/orderSystem/StrategyRegistry';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers, 
  TrendingUp, 
  ShieldCheck, 
  EyeOff, 
  ArrowRightLeft, 
  Anchor, 
  Activity,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderPreviewProps {
  strategy: StrategyDefinition;
  params: Record<string, any>;
  ticker: string;
  side: 'BUY' | 'SELL';
  onNext: () => void;
  onBack: () => void;
}

export default function OrderPreview({ 
  strategy, 
  params, 
  ticker, 
  side, 
  onNext, 
  onBack 
}: OrderPreviewProps) {
  const isBuy = side === 'BUY';

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 pb-4 border-b border-border/30">
        <button 
          type="button" 
          onClick={onBack}
          className="p-2 hover:bg-accent rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-foreground">注文内容の確認</h2>
          <p className="text-xs text-muted-foreground">発注前に、シミュレーション結果を確認してください。</p>
        </div>
      </div>

      {/* 注文サマリーカード */}
      <div className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
              isBuy ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {isBuy ? "買い" : "売り"}
            </div>
            <span className="font-display font-bold text-lg">{ticker}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">発注方式</span>
            <span className="font-bold text-sm">{strategy.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">合計数量</span>
            <span className="font-mono font-bold text-lg">{Number(params.qty).toLocaleString()} 株</span>
          </div>
          {strategy.needsPrice && (
            <div>
              <span className="text-xs text-muted-foreground block mb-1">指値価格</span>
              <span className="font-mono font-bold text-lg">¥{Number(params.price).toLocaleString()}</span>
            </div>
          )}
          {strategy.needsTrigger && (
            <div>
              <span className="text-xs text-muted-foreground block mb-1">トリガー価格</span>
              <span className="font-mono font-bold text-lg text-primary">¥{Number(params.triggerPrice).toLocaleString()}</span>
            </div>
          )}
          {strategy.needsSliceCount && (
            <div>
              <span className="text-xs text-muted-foreground block mb-1">分割回数</span>
              <span className="font-mono font-bold text-lg">{params.sliceCount} 回</span>
            </div>
          )}
        </div>

        {/* 視覚化プレビュー (Dry-run) */}
        <div className="mt-6 p-4 rounded-xl bg-background border border-border/50">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-3 h-3" />
            実行シミュレーション
          </h4>
          
          {/* 簡易的なタイムライン表示 (TWAP/DIVIDED等の場合) */}
          {(strategy.id === 'TWAP' || strategy.id === 'DIVIDED' || strategy.id === 'ICEBERG') ? (
            <div className="space-y-4">
              <div className="flex justify-between items-end h-12 gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex-1 rounded-t-sm transition-all duration-500",
                      isBuy ? "bg-success/40" : "bg-destructive/40"
                    )}
                    style={{ height: `${30 + Math.random() * 70}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>開始: {params.startTime || '即時'}</span>
                <span>終了: {params.endTime || '当日中'}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                ※ 市場の流動性や価格変動により、実際の発注タイミングは最適化されます。
              </p>
            </div>
          ) : (
            <div className="py-4 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                条件合致時に即座に執行されます。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* リスク表示セクション */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-warning" />
          重要事項・リスク
        </h4>
        <div className="space-y-2">
          {strategy.risks.map((risk, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-warning/5 border border-warning/20">
              <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80 leading-relaxed">{risk}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 flex gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          className="flex-1 h-12 rounded-xl"
        >
          修正する
        </Button>
        <Button 
          type="button" 
          onClick={onNext}
          className="flex-[2] h-12 rounded-xl font-bold gap-2"
        >
          リスクを理解して次へ
          <CheckCircle2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
