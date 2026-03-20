// BRAKE Pro — Win/Loss Calendar (GitHub contribution graph style)
// Shows past 3 months of trade results in a 7-column grid

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { TradeEntry } from "@/lib/types";

interface DaySummary {
  date: string; // YYYY-MM-DD
  wins: number;
  losses: number;
  total: number;
}

function getCellColor(day: DaySummary | undefined): string {
  if (!day || day.total === 0) return "bg-white/5 border-white/10";
  const winRate = day.wins / day.total;
  if (day.total >= 3) {
    // Dense trades — darker shade
    if (winRate >= 0.5) return "bg-emerald-600 border-emerald-500";
    return "bg-red-700 border-red-600";
  }
  if (winRate >= 0.5) return "bg-emerald-500/70 border-emerald-400/60";
  return "bg-red-500/70 border-red-400/60";
}

function getCellTitle(day: DaySummary | undefined, date: string): string {
  if (!day || day.total === 0) return `${date}: トレードなし`;
  return `${date}: ${day.wins}勝 ${day.losses}敗 (計${day.total}件)`;
}

interface Props {
  trades: TradeEntry[];
}

export default function WinCalendar({ trades }: Props) {
  const { weeks, dayMap, monthLabels } = useMemo(() => {
    // Build day map from trade results
    const map: Record<string, DaySummary> = {};
    trades.forEach((t) => {
      if (!t.result || t.result === "pending") return;
      const date = t.createdAt.slice(0, 10);
      if (!map[date]) map[date] = { date, wins: 0, losses: 0, total: 0 };
      map[date].total += 1;
      if (t.result === "win") map[date].wins += 1;
      else if (t.result === "loss") map[date].losses += 1;
    });

    // Build a 3-month grid ending today (Sunday-aligned)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Go back ~91 days
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 90);

    // Align to Sunday
    const dayOfWeek = startDate.getDay(); // 0=Sun
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const weeksArr: (string | null)[][] = [];
    const labels: { col: number; label: string }[] = [];
    let currentMonth = -1;
    let col = 0;

    let cursor = new Date(startDate);
    while (cursor <= today) {
      const week: (string | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const iso = cursor.toISOString().slice(0, 10);
        week.push(cursor <= today ? iso : null);

        // Track month labels
        if (cursor.getDate() <= 7 && cursor.getMonth() !== currentMonth && cursor <= today) {
          currentMonth = cursor.getMonth();
          labels.push({
            col,
            label: `${cursor.getMonth() + 1}月`,
          });
        }

        cursor.setDate(cursor.getDate() + 1);
      }
      weeksArr.push(week);
      col++;
    }

    return { weeks: weeksArr, dayMap: map, monthLabels: labels };
  }, [trades]);

  const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="overflow-x-auto">
      {/* Month labels */}
      <div className="flex mb-1 ml-8">
        {weeks.map((_, ci) => {
          const label = monthLabels.find((m) => m.col === ci);
          return (
            <div key={ci} className="w-4 shrink-0 mr-1">
              {label && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{label.label}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-1">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-1 mr-1 justify-between py-0.5">
          {DAY_LABELS.map((d) => (
            <span key={d} className="text-[10px] text-muted-foreground w-6 text-right leading-none h-4 flex items-center justify-end">
              {d}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((date, di) => {
                if (!date) {
                  return <div key={di} className="w-4 h-4 rounded-sm opacity-0" />;
                }
                const day = dayMap[date];
                return (
                  <div
                    key={di}
                    title={getCellTitle(day, date)}
                    className={cn(
                      "w-4 h-4 rounded-sm border transition-opacity hover:opacity-80 cursor-default",
                      getCellColor(day)
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
          <span>なし</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/70 border border-emerald-400/60" />
          <span>勝ち</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-600 border border-emerald-500" />
          <span>複数勝ち</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500/70 border border-red-400/60" />
          <span>負け</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-700 border border-red-600" />
          <span>複数負け</span>
        </div>
      </div>
    </div>
  );
}
