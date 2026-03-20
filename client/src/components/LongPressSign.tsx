// LongPressSign — 2秒長押しで誓約に署名するボタン
// 横スクロールのプログレスバーが内側で伸びるデザイン

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

  const pct = Math.round(holdProgress * 100);
  const remainingSec = ((1 - holdProgress) * HOLD_DURATION / 1000).toFixed(1);

  if (signed) {
    return (
      <div className={cn("flex items-center gap-2 text-primary text-sm font-medium", className)}>
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <span>署名済み</span>
      </div>
    );
  }

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={endHold}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      onTouchCancel={endHold}
      className={cn(
        "relative overflow-hidden flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium select-none transition-colors duration-150",
        holding
          ? "border border-primary/60 text-foreground"
          : "bg-card border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
        className
      )}
    >
      {/* 横スクロール プログレス背景 */}
      <div
        className="absolute inset-0 bg-primary/25 rounded-lg"
        style={{ width: `${pct}%`, transition: "none" }}
      />

      {/* コンテンツ（z-index で前面に） */}
      <ShieldCheck className="w-4 h-4 shrink-0 relative z-10" />
      <span className="relative z-10 flex items-center gap-2">
        {holding ? (
          <>
            <span>長押し中…</span>
            <span className="font-mono text-xs opacity-70">{remainingSec}s</span>
          </>
        ) : (
          "長押しで署名"
        )}
      </span>

      {/* 底面ライン プログレスバー */}
      <span
        className="absolute bottom-0 left-0 h-0.5 bg-primary rounded-full"
        style={{ width: `${pct}%`, transition: "none" }}
      />
    </button>
  );
}
