import React from 'react';
import { STRATEGIES, StrategyId } from '@/lib/orderSystem/StrategyRegistry';
import { 
  Target, 
  Clock, 
  ShieldCheck, 
  Layers, 
  TrendingUp, 
  Zap, 
  ArrowRightLeft, 
  EyeOff, 
  Anchor, 
  Activity,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StrategySelectorProps {
  onSelect: (id: StrategyId) => void;
  selectedId?: StrategyId;
}

const STRATEGY_ICONS: Record<StrategyId, React.ReactNode> = {
  NORMAL: <Zap className="w-5 h-5 text-yellow-500" />,
  DIVIDED: <Layers className="w-5 h-5 text-blue-500" />,
  TWAP: <Clock className="w-5 h-5 text-indigo-500" />,
  VWAP: <Activity className="w-5 h-5 text-purple-500" />,
  POV: <TrendingUp className="w-5 h-5 text-emerald-500" />,
  STOP: <ShieldCheck className="w-5 h-5 text-rose-500" />,
  STOP_LIMIT: <ShieldCheck className="w-5 h-5 text-rose-600" />,
  TRAILING_STOP: <TrendingUp className="w-5 h-5 text-orange-500" />,
  TRAILING_STOP_LIMIT: <TrendingUp className="w-5 h-5 text-orange-600" />,
  OCO: <ArrowRightLeft className="w-5 h-5 text-cyan-500" />,
  PEG: <Anchor className="w-5 h-5 text-slate-500" />,
  ICEBERG: <EyeOff className="w-5 h-5 text-gray-500" />,
};

export default function StrategySelector({ onSelect, selectedId }: StrategySelectorProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">どのように発注しますか？</h2>
        <p className="text-sm text-muted-foreground">
          投資の目的に合わせて、最適な発注方式を選択してください。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.values(STRATEGIES).map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              "group relative flex items-start gap-4 p-4 rounded-xl border transition-all text-left",
              selectedId === s.id
                ? "bg-primary/5 border-primary ring-1 ring-primary"
                : "bg-card border-border/50 hover:border-primary/50 hover:bg-accent/50"
            )}
          >
            <div className="mt-1 p-2 rounded-lg bg-background border border-border/50 group-hover:border-primary/30 transition-colors">
              {STRATEGY_ICONS[s.id]}
            </div>
            <div className="flex-1 pr-6">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">
                  {s.intent}
                </span>
              </div>
              <h3 className="font-bold text-sm text-foreground">{s.label}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {s.description}
              </p>
            </div>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
