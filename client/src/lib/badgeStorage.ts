import type { AchievementBadge, BadgeStats } from "./types";

const BADGES_KEY = "brake_pro_badges";

export function getAllBadges(): AchievementBadge[] {
  try {
    const data = localStorage.getItem(BADGES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addBadge(badge: AchievementBadge): void {
  const badges = getAllBadges();
  const exists = badges.some((b) => b.id === badge.id);
  if (!exists) {
    badges.push(badge);
    localStorage.setItem(BADGES_KEY, JSON.stringify(badges));
  }
}

export function getBadgeStats(): BadgeStats {
  const badges = getAllBadges();
  const recentBadges = badges.slice(-5).reverse();

  return {
    totalBadges: badges.length,
    commonCount: badges.filter((b) => b.rarity === "common").length,
    rareCount: badges.filter((b) => b.rarity === "rare").length,
    epicCount: badges.filter((b) => b.rarity === "epic").length,
    legendaryCount: badges.filter((b) => b.rarity === "legendary").length,
    recentBadges,
  };
}

export function getBadgesByMonth(year: number, month: number): AchievementBadge[] {
  return getAllBadges().filter((b) => b.year === year && b.month === month);
}

export function clearAllBadges(): void {
  localStorage.removeItem(BADGES_KEY);
}

// Badge creation helpers
export function createWinRateBadge(year: number, month: number, winRate: number): AchievementBadge {
  const rarity = winRate >= 70 ? "legendary" : winRate >= 60 ? "epic" : winRate >= 50 ? "rare" : "common";

  return {
    id: `win_rate_${year}_${month}`,
    type: "win_rate",
    year,
    month,
    title: `${winRate.toFixed(1)}% 勝率達成`,
    description: `${year}年${month}月に${winRate.toFixed(1)}%の勝率を達成しました`,
    icon: "🎯",
    color: "oklch(0.7 0.2 45)",
    unlockedAt: new Date().toISOString(),
    rarity,
  };
}

export function createRRRatioBadge(year: number, month: number, rrRatio: number): AchievementBadge {
  const rarity = rrRatio >= 2.5 ? "legendary" : rrRatio >= 2 ? "epic" : rrRatio >= 1.5 ? "rare" : "common";

  return {
    id: `rr_ratio_${year}_${month}`,
    type: "rr_ratio",
    year,
    month,
    title: `RR比 1:${rrRatio.toFixed(2)} 達成`,
    description: `${year}年${month}月に平均RR比1:${rrRatio.toFixed(2)}を達成しました`,
    icon: "📊",
    color: "oklch(0.65 0.2 250)",
    unlockedAt: new Date().toISOString(),
    rarity,
  };
}

export function createPnLBadge(year: number, month: number, pnl: number): AchievementBadge {
  const rarity = pnl >= 100000 ? "legendary" : pnl >= 50000 ? "epic" : pnl >= 20000 ? "rare" : "common";

  return {
    id: `pnl_${year}_${month}`,
    type: "pnl",
    year,
    month,
    title: `¥${pnl.toLocaleString()} 利益達成`,
    description: `${year}年${month}月に¥${pnl.toLocaleString()}の利益を達成しました`,
    icon: "💰",
    color: "oklch(0.75 0.2 120)",
    unlockedAt: new Date().toISOString(),
    rarity,
  };
}

export function createConsistencyBadge(year: number, month: number, consecutiveWins: number): AchievementBadge {
  const rarity = consecutiveWins >= 10 ? "legendary" : consecutiveWins >= 7 ? "epic" : consecutiveWins >= 5 ? "rare" : "common";

  return {
    id: `consistency_${year}_${month}`,
    type: "consistency",
    year,
    month,
    title: `${consecutiveWins}連勝達成`,
    description: `${year}年${month}月に${consecutiveWins}連勝を達成しました`,
    icon: "🔥",
    color: "oklch(0.6 0.25 30)",
    unlockedAt: new Date().toISOString(),
    rarity,
  };
}

export function createPerfectMonthBadge(year: number, month: number): AchievementBadge {
  return {
    id: `perfect_month_${year}_${month}`,
    type: "perfect_month",
    year,
    month,
    title: "完璧な月",
    description: `${year}年${month}月に目標を完全達成しました`,
    icon: "👑",
    color: "oklch(0.8 0.25 60)",
    unlockedAt: new Date().toISOString(),
    rarity: "legendary",
  };
}
