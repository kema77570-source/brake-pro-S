// BRAKE Pro — Holding Period Logic
import type { TradeEntry, HoldingCategory, HoldingCategoryLimits } from "./types";

export function labelToCategory(label: string): HoldingCategory {
  if (label.includes("デイトレード") || label.includes("当日")) return "day";
  if (label.includes("数日") || label.includes("スイング")) return "swing";
  if (label.includes("1週間") || label.includes("1ヶ月")) return "short";
  if (label.includes("数ヶ月") || label.includes("中期")) return "medium";
  if (label.includes("1年") || label.includes("長期")) return "long";
  return "undecided";
}

export const CATEGORY_LABELS: Record<HoldingCategory, string> = {
  day: "デイトレード",
  short: "短期保有",
  swing: "スイングトレード",
  medium: "中期投資",
  long: "長期投資",
  undecided: "未定",
};

export const CATEGORY_ORDER: HoldingCategory[] = ["day", "short", "swing", "medium", "long", "undecided"];

export function computeDeadline(trade: TradeEntry, limits: HoldingCategoryLimits): Date | null {
  const cat = trade.holdingCategory ?? labelToCategory(trade.holdPeriodLabel);
  if (cat === "undecided" || cat === "long") return null;
  const baseTime = trade.entryTime ? new Date(trade.entryTime) : new Date(trade.createdAt);
  const hours = limits[cat] ?? trade.plannedHoldHours;
  if (!hours || hours <= 0) return null;
  return new Date(baseTime.getTime() + hours * 3600 * 1000);
}

export function isOverDeadline(trade: TradeEntry, limits: HoldingCategoryLimits): boolean {
  if (trade.status === "closed" || trade.status === "skipped") return false;
  const deadline = computeDeadline(trade, limits);
  if (!deadline) return false;
  return new Date() > deadline;
}

export function hoursUntilDeadline(trade: TradeEntry, limits: HoldingCategoryLimits): number | null {
  const deadline = computeDeadline(trade, limits);
  if (!deadline) return null;
  return (deadline.getTime() - Date.now()) / 3600000;
}

export function formatDeadline(date: Date): string {
  return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Which transitions are "escalation" (going to longer hold)
export function isEscalation(from: HoldingCategory, to: HoldingCategory): boolean {
  const order = ["day", "short", "swing", "medium", "long"];
  return order.indexOf(to) > order.indexOf(from);
}

export function getTransitionKey(from: HoldingCategory, to: HoldingCategory): string {
  return `${from}_to_${to}`;
}
