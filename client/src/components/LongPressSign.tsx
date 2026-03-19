// LongPressSign — 2秒長押しで誓約に署名するボタン
// cool-down-check-main の PledgeScreen.tsx より移植・汎用化

import { useState, useRef, useCallback, useEffect } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const HOLD_DURATION = 2000;

interface LongPressSignProps {
  signed: boolean;
  onSign: () => void;
  className?: string;
}

export function LongPressSign({ signed, onSign, className }: LongPressSignProps) {
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const animateProgress = useCallback(() => {
    if (holdStartRef.current === null) return;
    const elapsed = Date.now() - holdStartRef.current;
    const progress = Math.min(elapsed / HOLD_DURATION, 1);
    setHoldProgress(progress);

    if (progress >= 1) {
      holdStartRef.current = null;
      setHolding(false);
      setHoldProgress(0);
      onSign();
    } else {
      rafRef.current = requestAnimationFrame(animateProgress);
    }
  }, [onSign]);

  const startHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (signed) return;
    holdStartRef.current = Date.now();
    setHolding(true);
    setHoldProgress(0);
    rafRef.current = requestAnimationFrame(animateProgress);
  }, [signed, animateProgress]);

  const endHold = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    holdStartRef.current = null;
    if (!signed) {
      setHolding(false);
      setHoldProgress(0);
    }
  }, [signed]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // 円周 = 2π × r（r=20 で viewBox 50×50）
  const CIRCUMFERENCE = 2 * Math.PI * 20; // ≈ 125.6

  if (signed) {
    return (
      <div className={cn("flex items-center gap-2 text-primary text-sm font-medium", className)}>
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <span>署名済み</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative inline-flex">
        {/* 円形プログレス */}
        <svg
          className="absolute -inset-2.5"
          width="calc(100% + 20px)"
          height="calc(100% + 20px)"
          viewBox="0 0 50 50"
          style={{ width: "calc(100% + 20px)", height: "calc(100% + 20px)" }}
        >
          {/* 背景リング */}
          <circle
            cx="25" cy="25" r="20"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="2.5"
          />
          {/* 進捗リング */}
          <circle
            cx="25" cy="25" r="20"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${holdProgress * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            transform="rotate(-90 25 25)"
            style={{ transition: "none" }}
          />
        </svg>

        <button
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          onTouchCancel={endHold}
          className={cn(
            "relative flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium select-none transition-all duration-150",
            holding
              ? "scale-95 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          {holding ? "長押し中…" : "長押しで署名"}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">2秒間長押しして署名</p>
    </div>
  );
}
