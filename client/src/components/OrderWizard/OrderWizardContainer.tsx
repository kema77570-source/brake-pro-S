import React, { useState } from 'react';
import { STRATEGIES, StrategyId } from '@/lib/orderSystem/StrategyRegistry';
import StrategySelector from './StrategySelector';
import StrategyConfigurator from './StrategyConfigurator';
import OrderPreview from './OrderPreview';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface OrderWizardContainerProps {
  ticker: string;
  side: 'BUY' | 'SELL';
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

type Step = 'select' | 'config' | 'preview' | 'executing' | 'done' | 'error';

export default function OrderWizardContainer({ 
  ticker, 
  side, 
  onClose, 
  onSuccess 
}: OrderWizardContainerProps) {
  const [step, setStep] = useState<Step>('select');
  const [strategyId, setStrategyId] = useState<StrategyId | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (id: StrategyId) => {
    setStrategyId(id);
    setStep('config');
  };

  const handleConfigNext = (p: Record<string, any>) => {
    setParams(p);
    setStep('preview');
  };

  const handlePreviewNext = async () => {
    setStep('executing');
    try {
      const payload = {
        code: ticker,
        side,
        strategy: strategyId,
        ...params,
        quantity: parseInt(params.qty),
        price: params.price ? parseFloat(params.price) : undefined,
        trigger_price: params.triggerPrice ? parseFloat(params.triggerPrice) : undefined,
      };

      const res = await axios.post(`${API_BASE}/api/trade/place-order`, payload);
      setResult(res.data);
      setStep('done');
      if (onSuccess) onSuccess(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "発注に失敗しました。";
      setError(msg);
      setStep('error');
    }
  };

  const handleBack = () => {
    if (step === 'config') setStep('select');
    if (step === 'preview') setStep('config');
  };

  return (
    <div className="relative min-h-[500px] flex flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex-1 p-6"
        >
          {step === 'select' && (
            <StrategySelector onSelect={handleSelect} selectedId={strategyId || undefined} />
          )}

          {step === 'config' && strategyId && (
            <StrategyConfigurator 
              strategy={STRATEGIES[strategyId]} 
              onNext={handleConfigNext} 
              onBack={handleBack}
              initialParams={params}
            />
          )}

          {step === 'preview' && strategyId && (
            <OrderPreview 
              strategy={STRATEGIES[strategyId]} 
              params={params} 
              ticker={ticker} 
              side={side} 
              onNext={handlePreviewNext} 
              onBack={handleBack} 
            />
          )}

          {step === 'executing' && (
            <div className="flex flex-col items-center justify-center h-full py-20 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                <Loader2 className="w-16 h-16 text-primary animate-spin relative" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">注文を送信中...</h3>
                <p className="text-sm text-muted-foreground">
                  moomoo OpenAPI 経由で安全に発注しています。
                </p>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center h-full py-12 space-y-8">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-success" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">発注完了</h3>
                <p className="text-sm text-muted-foreground">
                  注文が正常に受け付けられました。
                </p>
              </div>
              <div className="w-full p-4 rounded-xl bg-card border border-border/50 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">注文ID</span>
                  <span className="font-mono font-bold">{result?.order_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ステータス</span>
                  <span className="text-success font-bold">SUBMITTED</span>
                </div>
              </div>
              <Button onClick={onClose} className="w-full h-12 rounded-xl font-bold">
                閉じる
              </Button>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center h-full py-12 space-y-8">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-destructive" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-destructive">発注エラー</h3>
                <p className="text-sm text-muted-foreground px-6">
                  {error || "予期せぬエラーが発生しました。"}
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('preview')} 
                  className="flex-1 h-12 rounded-xl"
                >
                  戻って修正
                </Button>
                <Button 
                  onClick={onClose} 
                  className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90"
                >
                  閉じる
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress Indicator */}
      {['select', 'config', 'preview'].includes(step) && (
        <div className="px-6 pb-6 flex items-center gap-2">
          {[
            { id: 'select', label: '方式選択' },
            { id: 'config', label: '設定' },
            { id: 'preview', label: '確認' }
          ].map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                step === s.id ? "bg-primary" : 
                (i < ['select', 'config', 'preview'].indexOf(step) ? "bg-primary/40" : "bg-border/50")
              )} />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
