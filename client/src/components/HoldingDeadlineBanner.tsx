// BRAKE Pro — Holding Deadline Banner
import { useState, useEffect } from "react";
import { Clock, ChevronRight, X } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { getTrades } from "@/lib/storage";
import { isOverDeadline, hoursUntilDeadline } from "@/lib/holdingPeriod";
import { useApp } from "@/contexts/AppContext";
import { DEFAULT_HOLDING_LIMITS } from "@/lib/types";

export default function HoldingDeadlineBanner() {
  const [, navigate] = useLocation();
  const { settings } = useApp();
  const [overdueCount, setOverdueCount] = useState(0);
  const [nearDeadlineCount, setNearDeadlineCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const limits = settings.holdingLimits ?? DEFAULT_HOLDING_LIMITS;

  useEffect(() => {
    const check = () => {
      const trades = getTrades().filter(t => t.status === "active" || t.status === "planning");
      let overdue = 0;
      let near = 0;
      for (const t of trades) {
        if (isOverDeadline(t, limits)) { overdue++; continue; }
        const hrs = hoursUntilDeadline(t, limits);
        if (hrs !== null && hrs < 2) near++;
      }
      setOverdueCount(overdue);
      setNearDeadlineCount(near);
    };
    check();
    const iv = setInterval(check, 60_000);
    return () => clearInterval(iv);
  }, [limits]);

  if (dismissed || (overdueCount === 0 && nearDeadlineCount === 0)) return null;

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 text-sm border-b",
      overdueCount > 0
        ? "bg-destructive/10 border-destructive/20 text-destructive"
        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
    )}>
      <Clock className="w-4 h-4 shrink-0" />
      <span className="flex-1">
        {overdueCount > 0
          ? `${overdueCount}件のポジションが保有期限を超えています`
          : `${nearDeadlineCount}件のポジションが保有期限に近づいています`}
      </span>
      <button
        onClick={() => navigate("/trades")}
        className="flex items-center gap-1 text-xs font-medium opacity-90 hover:opacity-100"
      >
        確認する <ChevronRight className="w-3 h-3" />
      </button>
      <button onClick={() => setDismissed(true)} className="opacity-50 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
