import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HoldToConfirmProps {
  onConfirm: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export default function HoldToConfirm({ 
  onConfirm, 
  disabled, 
  label = "長押しして発注を確定", 
  className 
}: HoldToConfirmProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const controls = useAnimation();

  const HOLD_DURATION = 1500; // 1.5 seconds

  const startHolding = () => {
    if (disabled) return;
    setIsHolding(true);
    startTimeRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setIsHolding(false);
        onConfirm();
      }
    }, 16);
  };

  const stopHolding = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsHolding(false);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className={cn("relative w-full h-14 select-none", className)}>
      <button
        type="button"
        disabled={disabled}
        onMouseDown={startHolding}
        onMouseUp={stopHolding}
        onMouseLeave={stopHolding}
        onTouchStart={startHolding}
        onTouchEnd={stopHolding}
        className={cn(
          "relative w-full h-full rounded-2xl font-bold flex items-center justify-center gap-2 transition-all overflow-hidden",
          disabled 
            ? "bg-muted text-muted-foreground cursor-not-allowed" 
            : "bg-primary text-primary-foreground active:scale-[0.98]"
        )}
      >
        {/* Progress Background */}
        <motion.div 
          className="absolute left-0 top-0 bottom-0 bg-white/20"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
        
        <div className="relative flex items-center gap-2 z-10">
          {progress >= 100 ? (
            <CheckCircle2 className="w-5 h-5 animate-bounce" />
          ) : (
            <Lock className={cn("w-5 h-5", isHolding && "animate-pulse")} />
          )}
          <span className="tracking-tight">{label}</span>
        </div>
      </button>
      
      {isHolding && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-12 left-1/2 -translate-x-1/2 bg-primary px-3 py-1.5 rounded-lg text-white text-[10px] font-bold shadow-xl"
        >
          そのまま押し続けてください...
        </motion.div>
      )}
    </div>
  );
}
