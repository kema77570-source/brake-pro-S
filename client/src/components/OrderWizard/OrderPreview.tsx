import React, { useState, useRef, useEffect } from 'react';
import { StrategyDefinition } from '@/lib/orderSystem/StrategyRegistry';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Activity,
  Info,
  ChevronDown,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderPreviewProps {
  strategy: StrategyDefinition;
  params: Record<string, any>;
  plan?: any; // Dry-run API result
  ticker: string;
  side: 'BUY' | 'SELL';
  onNext: () => void;
  onBack: () => void;
}

export default function OrderPreview({ 
  strategy, 
  params, 
  plan,
  ticker, 
  side, 
  onNext, 
  onBack 
}: OrderPreviewProps) {
  const isBuy = side === 'BUY';
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setHasScrolledToBottom(true);
      }
    }
  };

  useEffect(() => {
    // If no risks, allow immediately
    if (strategy.risks.length === 0) setHasScrolledToBottom(true);
  }, [strategy.risks]);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex items-center gap-3 pb-4 border-b border-border/30">
        <button 
          type="button" 
          onClick={onBack}
          className="p-2 hover:bg-accent rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-foreground">最終確認と執行計画</h2>
          <p className="text-xs text-muted-foreground">内容を最後まで確認し、リスクに同意してください。</p>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pr-2 space-y-6 max-h-[450px]"
      >
        {/* 1. 執行の全容 (One-Page Summary) */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
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
              <span className="text-[10px] text-muted-foreground block uppercase tracking-widest">Strategy</span>
              <span className="font-bold text-sm text-primary">{strategy.label}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-background/50 border border-border/30">
            <p className="text-sm leading-relaxed">
              合計 <span className="font-bold text-foreground">{Number(params.qty).toLocaleString()} 株</span> を、
              {strategy.id === 'TWAP' || strategy.id === 'VWAP' ? (
                <>
                  <span className="font-bold text-foreground">{params.endTime}</span> までに
                  {params.sliceCount && <><span className="font-bold text-foreground"> {params.sliceCount}回</span> に分けて</>}
                  執行します。
                </>
              ) : (
                <>条件合致時に即座に執行します。</>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {strategy.params.map(p => (
              <div key={p.id} className="flex justify-between py-1 border-b border-border/10">
                <span className="text-muted-foreground">{p.label}</span>
                <span className="font-mono font-bold">{params[p.id] || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 執行予定表 (Timeline) */}
        {strategy.canDryRun && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-3 h-3" />
              執行予定表 (シミュレーション)
            </h4>
            <div className="rounded-xl border border-border/50 bg-background overflow-hidden">
              <div className="max-h-32 overflow-y-auto">
                {/* Mock timeline if plan is missing */}
                {(plan?.timeline || Array.from({ length: 5 })).map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 text-[11px] border-b border-border/10 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-mono">{t?.timestamp || `T+${i*5}m`}</span>
                      <span className="font-bold">{t?.qty || Math.floor(params.qty / 5)} 株</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground italic">
                      取消期限: {t?.cancelable_until || '執行10秒前'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-2 bg-muted/20 text-[10px] text-center text-muted-foreground">
                ※ 市場の流動性により、実際の発注タイミングは前後します。
              </div>
            </div>
          </div>
        )}

        {/* 3. リスクの赤字要約 (Red-Flag Summary) */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-destructive" />
            重要事項・リスクへの同意
          </h4>
          <div className="space-y-2">
            {strategy.risks.map((risk, i) => (
              <div key={i} className={cn(
                "flex items-start gap-3 p-3 rounded-xl border",
                risk.level === 'critical' 
                  ? "bg-destructive/5 border-destructive/20 text-destructive" 
                  : "bg-warning/5 border-warning/20 text-warning"
              )}>
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed font-medium">{risk.text}</p>
              </div>
            ))}
          </div>
        </div>

        {!hasScrolledToBottom && strategy.risks.length > 0 && (
          <div className="flex items-center justify-center py-2 animate-bounce text-muted-foreground">
            <ChevronDown className="w-5 h-5" />
            <span className="text-[10px] font-bold ml-1">スクロールして確認</span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border/30 flex gap-3">
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
          disabled={!hasScrolledToBottom}
          onClick={onNext}
          className={cn(
            "flex-[2] h-12 rounded-xl font-bold gap-2 transition-all",
            !hasScrolledToBottom ? "opacity-50 grayscale" : "bg-primary hover:bg-primary/90"
          )}
        >
          {!hasScrolledToBottom ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          リスクを理解して発注
        </Button>
      </div>
    </div>
  );
}
