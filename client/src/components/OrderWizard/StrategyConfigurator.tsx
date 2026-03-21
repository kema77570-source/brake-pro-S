import React, { useState } from 'react';
import { StrategyDefinition } from '@/lib/orderSystem/StrategyRegistry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  ArrowRight, 
  Info, 
  AlertCircle, 
  HelpCircle 
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StrategyConfiguratorProps {
  strategy: StrategyDefinition;
  onNext: (params: Record<string, any>) => void;
  onBack: () => void;
  initialParams?: Record<string, any>;
}

export default function StrategyConfigurator({ 
  strategy, 
  onNext, 
  onBack, 
  initialParams = {} 
}: StrategyConfiguratorProps) {
  const [params, setParams] = useState<Record<string, any>>({
    qty: initialParams.qty || '100',
    price: initialParams.price || '',
    triggerPrice: initialParams.triggerPrice || '',
    trailAmount: initialParams.trailAmount || '',
    limitOffset: initialParams.limitOffset || '',
    sliceCount: initialParams.sliceCount || '5',
    volumeRatio: initialParams.volumeRatio || '10',
    startTime: initialParams.startTime || '',
    endTime: initialParams.endTime || '',
    ...initialParams
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!params.qty || parseInt(params.qty) <= 0) newErrors.qty = '数量を正しく入力してください';
    if (strategy.needsPrice && (!params.price || parseFloat(params.price) <= 0)) newErrors.price = '価格を正しく入力してください';
    if (strategy.needsTrigger && (!params.triggerPrice || parseFloat(params.triggerPrice) <= 0)) newErrors.triggerPrice = 'トリガー価格を正しく入力してください';
    if (strategy.needsTrail && (!params.trailAmount || parseFloat(params.trailAmount) <= 0)) newErrors.trailAmount = 'トレール幅を正しく入力してください';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext(params);
    }
  };

  const updateParam = (key: string, value: string) => {
    setParams(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center gap-3 pb-4 border-b border-border/30">
        <button 
          type="button" 
          onClick={onBack}
          className="p-2 hover:bg-accent rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{strategy.label} の設定</h2>
          <p className="text-xs text-muted-foreground">{strategy.intent}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 基本項目: 数量 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="qty" className="text-sm font-semibold">発注数量</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>合計で発注したい株数を入力してください。</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="qty"
            type="number"
            value={params.qty}
            onChange={(e) => updateParam('qty', e.target.value)}
            className={cn(errors.qty && "border-destructive focus-visible:ring-destructive")}
            placeholder="100"
          />
          {errors.qty && <p className="text-[10px] text-destructive font-medium">{errors.qty}</p>}
        </div>

        {/* 方式別項目: 価格 */}
        {strategy.needsPrice && (
          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-semibold">指値価格</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={params.price}
              onChange={(e) => updateParam('price', e.target.value)}
              className={cn(errors.price && "border-destructive focus-visible:ring-destructive")}
              placeholder="0.00"
            />
            {errors.price && <p className="text-[10px] text-destructive font-medium">{errors.price}</p>}
          </div>
        )}

        {/* 方式別項目: トリガー価格 */}
        {strategy.needsTrigger && (
          <div className="space-y-2">
            <Label htmlFor="triggerPrice" className="text-sm font-semibold">トリガー価格</Label>
            <Input
              id="triggerPrice"
              type="number"
              step="0.01"
              value={params.triggerPrice}
              onChange={(e) => updateParam('triggerPrice', e.target.value)}
              className={cn(errors.triggerPrice && "border-destructive focus-visible:ring-destructive")}
              placeholder="0.00"
            />
            {errors.triggerPrice && <p className="text-[10px] text-destructive font-medium">{errors.triggerPrice}</p>}
          </div>
        )}

        {/* 方式別項目: 分割回数 */}
        {strategy.needsSliceCount && (
          <div className="space-y-2">
            <Label htmlFor="sliceCount" className="text-sm font-semibold">分割回数</Label>
            <Input
              id="sliceCount"
              type="number"
              value={params.sliceCount}
              onChange={(e) => updateParam('sliceCount', e.target.value)}
              placeholder="5"
            />
          </div>
        )}

        {/* 方式別項目: 時間枠 */}
        {strategy.needsTimeRange && (
          <>
            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-sm font-semibold">開始時刻</Label>
              <Input
                id="startTime"
                type="time"
                value={params.startTime}
                onChange={(e) => updateParam('startTime', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="text-sm font-semibold">終了時刻</Label>
              <Input
                id="endTime"
                type="time"
                value={params.endTime}
                onChange={(e) => updateParam('endTime', e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      <div className="pt-6 flex gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          className="flex-1 h-12 rounded-xl"
        >
          戻る
        </Button>
        <Button 
          type="submit" 
          className="flex-[2] h-12 rounded-xl font-bold gap-2"
        >
          次へ進む
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
