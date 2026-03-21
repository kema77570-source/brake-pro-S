import React, { useState, useEffect } from 'react';
import { StrategyDefinition } from '@/lib/orderSystem/StrategyRegistry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  ArrowRight, 
  HelpCircle,
  Clock,
  CalendarDays,
  ChevronDown,
  ChevronUp
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

interface ScheduleItem {
  id: number;
  minutesAfter: number;
  qty: number;
}

export default function StrategyConfigurator({ 
  strategy, 
  onNext, 
  onBack, 
  initialParams = {} 
}: StrategyConfiguratorProps) {
  const [params, setParams] = useState<Record<string, any>>({
    qty: initialParams.qty || '100',
    sliceCount: initialParams.sliceCount || '5',
    intervalMinutes: initialParams.intervalMinutes || '5',
    ...initialParams
  });

  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialParams.schedule || []);
  const [showSchedule, setShowSchedule] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Automatically generate schedule when sliceCount or intervalMinutes changes
  useEffect(() => {
    if (['TWAP', 'VWAP'].includes(strategy.id)) {
      const count = parseInt(params.sliceCount) || 0;
      const interval = parseInt(params.intervalMinutes) || 0;
      const totalQty = parseInt(params.qty) || 0;

      if (count > 0 && interval >= 0 && totalQty > 0) {
        const newSchedule: ScheduleItem[] = [];
        const baseQty = Math.floor(totalQty / count);
        const remainder = totalQty % count;

        for (let i = 0; i < count; i++) {
          newSchedule.push({
            id: i + 1,
            minutesAfter: i * interval,
            qty: i === count - 1 ? baseQty + remainder : baseQty
          });
        }
        setSchedule(newSchedule);
      }
    }
  }, [params.sliceCount, params.intervalMinutes, params.qty, strategy.id]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!params.qty || parseInt(params.qty) <= 0) newErrors.qty = '数量を正しく入力してください';
    
    // Validate schedule
    if (['TWAP', 'VWAP'].includes(strategy.id)) {
      const totalScheduledQty = schedule.reduce((sum, item) => sum + item.qty, 0);
      if (totalScheduledQty !== parseInt(params.qty)) {
        newErrors.schedule = `合計数量 (${totalScheduledQty}) が発注数量 (${params.qty}) と一致しません`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext({ ...params, schedule });
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

  const updateScheduleItem = (id: number, field: keyof ScheduleItem, value: number) => {
    setSchedule(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const isTimeSpread = ['TWAP', 'VWAP'].includes(strategy.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full">
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

      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 基本項目: 数量 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="qty" className="text-sm font-semibold">合計発注数量</Label>
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

          {isTimeSpread && (
            <>
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
              <div className="space-y-2">
                <Label htmlFor="intervalMinutes" className="text-sm font-semibold">実行間隔 (分)</Label>
                <Input
                  id="intervalMinutes"
                  type="number"
                  value={params.intervalMinutes}
                  onChange={(e) => updateParam('intervalMinutes', e.target.value)}
                  placeholder="5"
                />
              </div>
            </>
          )}

          {/* 方式別項目 (その他) */}
          {strategy.params.filter(p => !['qty', 'sliceCount', 'intervalMinutes'].includes(p.id)).map(p => (
            <div key={p.id} className="space-y-2">
              <Label htmlFor={p.id} className="text-sm font-semibold">{p.label}</Label>
              <Input
                id={p.id}
                type={p.type === 'time' ? 'time' : 'number'}
                value={params[p.id] || ''}
                onChange={(e) => updateParam(p.id, e.target.value)}
                placeholder={p.tooltip}
              />
            </div>
          ))}
        </div>

        {/* 個別スケジュール調整 (TWAP/VWAP用) */}
        {isTimeSpread && schedule.length > 0 && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowSchedule(!showSchedule)}
              className="flex items-center justify-between w-full p-4 rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-bold">個別スケジュールの調整</p>
                  <p className="text-[10px] text-muted-foreground">各回の実行時間と数量を微調整できます</p>
                </div>
              </div>
              {showSchedule ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {showSchedule && (
              <div className="space-y-3 p-4 rounded-xl border border-border/20 bg-card/30">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">
                  <div className="col-span-2 text-center">回</div>
                  <div className="col-span-5">開始 (分後)</div>
                  <div className="col-span-5">数量 (株)</div>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {schedule.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-background/50 border border-border/10">
                      <div className="col-span-2 text-center font-bold text-xs">{item.id}</div>
                      <div className="col-span-5">
                        <Input
                          type="number"
                          value={item.minutesAfter}
                          onChange={(e) => updateScheduleItem(item.id, 'minutesAfter', parseInt(e.target.value) || 0)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-5">
                        <Input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateScheduleItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {errors.schedule && (
                  <p className="text-[10px] text-destructive font-bold p-2 bg-destructive/10 rounded-lg">
                    {errors.schedule}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-6 flex gap-3 border-t border-border/30">
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
          確認画面へ
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
