import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Brain, Heart, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeSurveyProps {
  onComplete: (choice: string) => void;
}

export default function TradeSurvey({ onComplete }: TradeSurveyProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const options = [
    {
      id: 'rational',
      label: '論理的・計画的',
      description: 'ルールに基づいた冷静な判断',
      icon: Brain,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      id: 'emotional',
      label: '直感的・感情的',
      description: '相場感や衝動による判断',
      icon: Heart,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20'
    }
  ];

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold">今回の判断はどちらに近い？</h3>
        <p className="text-sm text-muted-foreground">
          トレード心理を記録することで、後の振り返りに役立ちます。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => setSelected(option.id)}
            className={cn(
              "relative p-5 rounded-2xl border transition-all duration-300 text-left group",
              selected === option.id 
                ? "bg-background ring-2 ring-primary border-transparent"
                : "bg-card/50 border-border/30 hover:border-primary/50"
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn("p-3 rounded-xl", option.bgColor)}>
                <option.icon className={cn("w-6 h-6", option.color)} />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-bold text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              {selected === option.id && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <Button 
        disabled={!selected}
        onClick={() => onComplete(selected!)}
        className="w-full h-12 rounded-xl font-bold mt-auto"
      >
        回答して終了
      </Button>
    </div>
  );
}
