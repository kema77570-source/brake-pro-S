// BRAKE Pro — Goal Storage
// Manage monthly goals and track progress

import type { MonthlyGoal, GoalProgress } from "./types";
import { getTrades } from "./storage";

const GOALS_KEY = "brake_pro_monthly_goals";

export function getGoals(): MonthlyGoal[] {
  try {
    const data = localStorage.getItem(GOALS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveGoals(goals: MonthlyGoal[]): void {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch (error) {
    console.error("Failed to save goals:", error);
  }
}

export function createGoal(
  year: number,
  month: number,
  targetWinRate: number,
  targetRiskRewardRatio: number,
  targetPnL?: number
): MonthlyGoal {
  const goal: MonthlyGoal = {
    id: `goal-${Date.now()}`,
    year,
    month,
    targetWinRate,
    targetRiskRewardRatio,
    targetPnL,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const goals = getGoals();
  // Remove existing goal for this month if any
  const filtered = goals.filter((g) => !(g.year === year && g.month === month));
  filtered.push(goal);
  saveGoals(filtered);

  return goal;
}

export function updateGoal(
  year: number,
  month: number,
  targetWinRate: number,
  targetRiskRewardRatio: number,
  targetPnL?: number
): MonthlyGoal | null {
  const goals = getGoals();
  const goal = goals.find((g) => g.year === year && g.month === month);

  if (!goal) {
    return createGoal(year, month, targetWinRate, targetRiskRewardRatio, targetPnL);
  }

  goal.targetWinRate = targetWinRate;
  goal.targetRiskRewardRatio = targetRiskRewardRatio;
  goal.targetPnL = targetPnL;
  goal.updatedAt = new Date().toISOString();

  saveGoals(goals);
  return goal;
}

export function deleteGoal(year: number, month: number): void {
  const goals = getGoals();
  const filtered = goals.filter((g) => !(g.year === year && g.month === month));
  saveGoals(filtered);
}

export function getGoal(year: number, month: number): MonthlyGoal | null {
  const goals = getGoals();
  return goals.find((g) => g.year === year && g.month === month) || null;
}

export function calculateGoalProgress(year: number, month: number): GoalProgress {
  const goal = getGoal(year, month);
  const trades = getTrades();

  // Filter trades for this month
  const monthTrades = trades.filter((t) => {
    if (!t.entryTime) return false;
    const date = new Date(t.entryTime);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  // Calculate current metrics
  const wins = monthTrades.filter((t) => t.result === "win").length;
  const currentWinRate = monthTrades.length > 0 ? (wins / monthTrades.length) * 100 : 0;

  const validRRTrades = monthTrades.filter((t) => t.riskRewardRatio > 0);
  const currentRiskRewardRatio =
    validRRTrades.length > 0
      ? validRRTrades.reduce((sum, t) => sum + t.riskRewardRatio, 0) / validRRTrades.length
      : 0;

  const currentPnL = monthTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  // Calculate progress
  let winRateProgress = 0;
  let rrProgress = 0;
  let pnlProgress = 0;
  let status: "on_track" | "at_risk" | "exceeded" | "failed" = "on_track";

  if (goal) {
    winRateProgress = Math.min((currentWinRate / goal.targetWinRate) * 100, 100);
    rrProgress = Math.min((currentRiskRewardRatio / goal.targetRiskRewardRatio) * 100, 100);

    if (goal.targetPnL) {
      pnlProgress = Math.min((currentPnL / goal.targetPnL) * 100, 100);
    }

    // Determine status based on progress
    const avgProgress = (winRateProgress + rrProgress) / 2;

    if (avgProgress >= 100) {
      status = "exceeded";
    } else if (avgProgress >= 75) {
      status = "on_track";
    } else if (avgProgress >= 50) {
      status = "at_risk";
    } else {
      status = "failed";
    }
  }

  // Calculate days remaining in month
  const now = new Date();
  const lastDay = new Date(year, month, 0).getDate();
  const daysRemaining = Math.max(0, lastDay - now.getDate());

  return {
    year,
    month,
    currentWinRate: Math.round(currentWinRate * 100) / 100,
    currentRiskRewardRatio: Math.round(currentRiskRewardRatio * 100) / 100,
    currentPnL: Math.round(currentPnL * 100) / 100,
    totalTrades: monthTrades.length,
    wins,
    winRateProgress: Math.round(winRateProgress),
    rrProgress: Math.round(rrProgress),
    pnlProgress: goal?.targetPnL ? Math.round(pnlProgress) : undefined,
    status,
    daysRemaining,
  };
}

export function getCurrentMonthProgress(): GoalProgress {
  const now = new Date();
  return calculateGoalProgress(now.getFullYear(), now.getMonth() + 1);
}

export function getGoalHistory(count: number = 6): GoalProgress[] {
  const now = new Date();
  const history: GoalProgress[] = [];

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const progress = calculateGoalProgress(date.getFullYear(), date.getMonth() + 1);
    history.push(progress);
  }

  return history;
}

export function getGoalInsights(progress: GoalProgress): string[] {
  const insights: string[] = [];

  if (progress.totalTrades === 0) {
    return ["今月のトレード記録がまだありません"];
  }

  // Win rate insights
  if (progress.winRateProgress >= 100) {
    insights.push(`目標勝率を達成しました！（${progress.currentWinRate}%）`);
  } else if (progress.winRateProgress >= 75) {
    insights.push(`勝率が好調です。あと${Math.ceil(100 - progress.winRateProgress)}%で目標達成です`);
  } else if (progress.winRateProgress >= 50) {
    insights.push(`勝率がやや低下しています。注意が必要です`);
  } else {
    insights.push(`勝率が大幅に低下しています。取引戦略を見直してください`);
  }

  // RR ratio insights
  if (progress.rrProgress >= 100) {
    insights.push(`RR比が目標を達成しました！（${progress.currentRiskRewardRatio}）`);
  } else if (progress.rrProgress >= 75) {
    insights.push(`RR比が良好です。継続してください`);
  } else if (progress.rrProgress >= 50) {
    insights.push(`RR比がやや低下しています。エントリー基準を厳しくしましょう`);
  } else {
    insights.push(`RR比が目標を大きく下回っています。リスク管理を強化してください`);
  }

  // PnL insights
  if (progress.pnlProgress !== undefined) {
    if (progress.pnlProgress >= 100) {
      insights.push(`利益目標を達成しました！`);
    } else if (progress.pnlProgress >= 50) {
      insights.push(`利益が順調に増加しています`);
    } else if (progress.pnlProgress > 0) {
      insights.push(`利益がまだ目標の${progress.pnlProgress}%です`);
    } else if (progress.currentPnL < 0) {
      insights.push(`現在損失が出ています。冷却時間を活用してください`);
    }
  }

  // Days remaining insight
  if (progress.daysRemaining <= 5 && progress.daysRemaining > 0) {
    insights.push(`月末まであと${progress.daysRemaining}日です。最後の追い込みを頑張りましょう`);
  } else if (progress.daysRemaining === 0) {
    insights.push(`今月は本日が最終日です`);
  }

  return insights;
}
