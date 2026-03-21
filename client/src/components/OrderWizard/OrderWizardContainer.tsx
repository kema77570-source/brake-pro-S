import React, { useState, useEffect, useCallback } from 'react';
import { STRATEGIES, StrategyId } from '@/lib/orderSystem/StrategyRegistry';
import StrategySelector from './StrategySelector';
import StrategyConfigurator from './StrategyConfigurator';
import OrderPreview from './OrderPreview';
import TradeSurvey from './TradeSurvey';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import { Loader2, CheckCircle2, AlertCircle, X, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface OrderWizardContainerProps {
  ticker: string;
  side: 'BUY' | 'SELL';
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

type Step = 'select' | 'config' | 'preview' | 'executing' | 'survey' | 'done' | 'error';

export default function OrderWizardContainer({ 
  ticker, 
  side, 
  onClose, 
  onSuccess 
}: OrderWizardContainerProps) {
  const [step, setStep] = useState<Step>('select');
  const [strategyId, setStrategyId] = useState<StrategyId | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});
  const [plan, setPlan] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // 1. Generate Idempotency Key on start
  useEffect(() => {
    setIdempotencyKey(nanoid());
  }, []);

  const handleSelect = (id: StrategyId) => {
    setStrategyId(id);
    setStep('config');
  };

  // 2. Dry-run API call
  const handleConfigNext = async (p: Record<string, any>) => {
    setParams(p);
    const strategy = STRATEGIES[strategyId!];
    
    if (strategy.canDryRun) {
      setIsLoadingPlan(true);
      try {
        const res = await axios.post(`${API_BASE}/api/trade/strategy/preview`, {
          strategy_id: strategyId,
          ticker,
          side,
          ...p
        });
        setPlan(res.data);
        setStep('preview');
      } catch (err) {
        toast.error("執行計画の生成に失敗しました。");
        // Fallback to preview without plan if necessary, or stay in config
        setStep('preview');
      } finally {
        setIsLoadingPlan(false);
      }
    } else {
      setStep('preview');
    }
  };

  // 3. Final Execution with Idempotency Key
  const handlePreviewNext = async () => {
    setStep('executing');
    try {
      const payload = {
        code: ticker,
        side,
        strategy: strategyId,
        ...params,
        quantity: parseInt(params.qty),
        // Use plan_id if available to ensure consistency
        plan_id: plan?.plan_id,
      };

      const res = await axios.post(`${API_BASE}/api/trade/place-order`, payload, {
        headers: {
          'X-Idempotency-Key': idempotencyKey
        }
      });
      setResult(res.data);
      setStep('survey');
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

  const handleSurveyComplete = async (choice: string) => {
    // Optionally save survey result to backend
    try {
      await axios.post(`${API_BASE}/api/trade/survey`, {
        order_id: result?.order_id,
        choice
      });
    } catch (e) {
      console.error("Failed to save survey", e);
    }
    setStep('done');
  };

  return (
    <div className="relative min-h-[550px] flex flex-col bg-card/30">
      {/* Security Header */}
      <div className="px-6 py-3 border-b border-border/20 bg-background/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Secure Order Engine
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-mono text-muted-foreground">
            IDEM: {idempotencyKey.slice(0, 8)}...
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex-1 p-6"
        >
          {isLoadingPlan ? (
            <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-bold text-muted-foreground animate-pulse">執行計画を生成中...</p>
            </div>
          ) : (
            <>
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
                  plan={plan}
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

              {step === 'survey' && (
                <TradeSurvey onComplete={handleSurveyComplete} />
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
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress Indicator */}
      {['select', 'config', 'preview'].includes(step) && !isLoadingPlan && (
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
