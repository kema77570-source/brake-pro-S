// BRAKE Pro — Core Type Definitions
// Design: Dark Financial × Neo-Brutalist
// All data persisted to localStorage (no backend required)

// ─── Trade Entry ────────────────────────────────────────────────────────────

export type TradeDirection = "long" | "short";
export type TradeStatus = "planning" | "active" | "closed" | "skipped";
export type TradeResult = "win" | "loss" | "breakeven" | "pending";

export interface TradeEntry {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Basic info
  ticker: string;
  name: string;
  direction: TradeDirection;
  status: TradeStatus;

  // Price levels
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  actualEntryPrice?: number;
  actualExitPrice?: number;

  // Risk/Reward
  riskRewardRatio: number;
  riskAmount: number;        // in currency
  rewardAmount: number;      // in currency
  positionSize?: number;

  // Hold period
  plannedHoldHours: number;  // planned hold in hours
  entryTime?: string;        // actual entry timestamp
  exitTime?: string;         // actual exit timestamp
  holdDeadlineNotified?: boolean;

  // FOMO analysis
  fomoScore: number;         // 0-100
  marketFomoScore: number;   // market-side FOMO (0-100)
  userFomoScore: number;     // user-side FOMO (0-100)
  fomoFactors: FomoFactor[];

  // AI audit
  aiAuditResult?: AIAuditResult;

  // Pledge confirmation
  pledgeConfirmed: boolean;
  riskRewardPledgeConfirmed: boolean; // "リスクリワードについて明確な数字を計算した"

  // Trade psychology
  mindset?: string;          // "rule" | "mostly_rule" | "neutral" | "mostly_emotion" | "emotion"
  triggerReason: string;
  entryReason: string;
  infoSource: string;
  whyNow: string;
  holdPeriodLabel: string;
  stopLossReason: string;

  // Order routing
  orderType?: "moomoo" | "other" | "demo";  // how/where the trade was routed

  // Holding period tracking
  holdingCategory?: HoldingCategory;     // derived from holdPeriodLabel
  holdingDeadline?: string;              // ISO string - when this trade expires
  strategyChanges?: StrategyChangeRecord[]; // history of category changes

  // Result
  result?: TradeResult;
  pnl?: number;
  pnlPercent?: number;
  reflection?: string;
  reflectedAt?: string;
}

// ─── FOMO ───────────────────────────────────────────────────────────────────

export interface FomoFactor {
  label: string;
  risk: boolean;
  type: "market" | "user";
  weight: number;
}

// ─── AI Audit ───────────────────────────────────────────────────────────────

export interface AIAuditResult {
  timestamp: string;
  overallRisk: "low" | "medium" | "high" | "critical";
  rsiSignal: string;
  maSignal: string;
  volumeSignal: string;
  trendSignal: string;
  recommendation: string;
  warningFlags: string[];
  score: number; // 0-100 (higher = more risky)
}

// ─── Price Alarm ────────────────────────────────────────────────────────────

export type AlarmType = "entry" | "stop_loss" | "take_profit" | "custom";
export type AlarmDirection = "above" | "below";
export type AlarmStatus = "active" | "triggered" | "dismissed";

export interface PriceAlarm {
  id: string;
  tradeId?: string;
  ticker: string;
  targetPrice: number;
  direction: AlarmDirection;
  type: AlarmType;
  label: string;
  status: AlarmStatus;
  createdAt: string;
  triggeredAt?: string;
  notified?: boolean;
}

// ─── Loss Streak ────────────────────────────────────────────────────────────

export interface LossStreak {
  currentStreak: number;
  lastLossAt?: string;
  suspendedUntil?: string;
  suspendReason?: string;
  history: LossStreakEvent[];
}

export interface LossStreakEvent {
  id: string;
  timestamp: string;
  streakCount: number;
  action: "loss" | "win" | "suspended" | "resumed";
  suspendMinutes?: number;
}

// ─── Skip Log ───────────────────────────────────────────────────────────────

export interface SkipLogEntry {
  id: string;
  createdAt: string;
  ticker: string;
  name: string;
  skipReason: string;
  infoSource: string;
  priceAtSkip: string;
  fomoScore: number;
  reflection?: string;
  reflectedAt?: string;
  verdict?: "good_skip" | "missed_opportunity" | "neutral";
  priceAfter?: string;
}

// ─── Heart Rate / Stress ────────────────────────────────────────────────────

export interface HeartRateReading {
  id: string;
  timestamp: string;
  bpm: number;
  stressLevel: "low" | "medium" | "high" | "critical";
  source: "manual" | "apple_watch" | "garmin" | "fitbit";
  tradeId?: string;
}

// ─── Settings ───────────────────────────────────────────────────────────────

export interface AppSettings {
  // Loss streak thresholds
  streakSuspend1Count: number;    // default: 3 losses → 30 min
  streakSuspend1Minutes: number;  // default: 30
  streakSuspend2Count: number;    // default: 5 losses → 24h
  streakSuspend2Minutes: number;  // default: 1440

  // Heart rate thresholds
  hrWarningBpm: number;           // default: 100
  hrCriticalBpm: number;          // default: 120
  stressWarningEnabled: boolean;

  // Cooling time options (minutes)
  coolingOptions: number[];       // default: [5, 30, 60, 960]

  // Notification settings
  priceAlarmEnabled: boolean;
  holdDeadlineNotifyEnabled: boolean;
  streakNotifyEnabled: boolean;

  // FOMO thresholds
  fomoWarningThreshold: number;   // default: 50
  fomoCriticalThreshold: number;  // default: 75
  pledgeFomoThreshold: number;    // default: 60 — ルール通りでもこのスコア以上なら誓約を表示

  // Risk/Reward minimum
  minRiskRewardRatio: number;     // default: 1.5

  // Custom pledges
  pledges: string[];

  // VIX warning threshold
  vixWarningLevel: number;        // default: 25
  vixCriticalLevel: number;       // default: 35

  // Holding period limits (hours)
  holdingLimits: HoldingCategoryLimits;
}

export const DEFAULT_SETTINGS: AppSettings = {
  streakSuspend1Count: 3,
  streakSuspend1Minutes: 30,
  streakSuspend2Count: 5,
  streakSuspend2Minutes: 1440,
  hrWarningBpm: 100,
  hrCriticalBpm: 120,
  stressWarningEnabled: true,
  coolingOptions: [5, 30, 60, 960],
  priceAlarmEnabled: true,
  holdDeadlineNotifyEnabled: true,
  streakNotifyEnabled: true,
  fomoWarningThreshold: 50,
  fomoCriticalThreshold: 75,
  pledgeFomoThreshold: 60,
  minRiskRewardRatio: 1.5,
  pledges: [
    "私はSNSの熱狂だけでは買わない",
    "エントリー前にリスクを3つ確認する",
    "損切りラインを決めずに注文しない",
    "話題性だけで銘柄を選ばない",
    "冷却時間を飛ばさない",
    "リスクリワードについて明確な数字を計算した",
  ],
  vixWarningLevel: 25,
  vixCriticalLevel: 35,
  holdingLimits: {
    day: 8,
    short: 72,
    swing: 336,
    medium: 4320,
    long: 99999,
  },
};

// ─── Holding Period ─────────────────────────────────────────────────────────

export type HoldingCategory = "day" | "short" | "swing" | "medium" | "long" | "undecided";

export interface HoldingCategoryLimits {
  day: number;      // hours - default 8 (same day, full trading hours)
  short: number;    // hours - default 72 (3 business days)
  swing: number;    // hours - default 336 (14 days)
  medium: number;   // hours - default 4320 (180 days)
  long: number;     // hours - default 99999 (open-ended, very large)
}

export const DEFAULT_HOLDING_LIMITS: HoldingCategoryLimits = {
  day: 8,        // same day (8 trading hours)
  short: 72,     // 3 business days
  swing: 336,    // 14 days
  medium: 4320,  // 180 days
  long: 99999,   // open-ended
};

export interface StrategyChangeRecord {
  id: string;
  timestamp: string;
  fromCategory: HoldingCategory;
  toCategory: HoldingCategory;
  stage: 1 | 2;
  answers: Record<string, string>;
  verdict: "strategy_update" | "delay" | "emotional" | "insufficient";
  dangerLevel: "low" | "medium" | "high";
  score: number;  // 0-100 emotional risk score
  recommendedAction: string;
}

// ─── Market Data ────────────────────────────────────────────────────────────

export interface MarketFearGreed {
  value: number;
  label: string;
  timestamp: string;
  source: "crypto" | "stock";
}

export interface VixData {
  value: number;
  change: number;
  timestamp: string;
}

export interface AssetHeatData {
  symbol: string;
  name: string;
  type: "stock_jp" | "stock_us" | "crypto" | "commodity";
  price: number;
  currency: string;
  change24h: number;
  volumeIncrease: number;
  maDeviation: number;
  rsi: number;
  heatLevel: "Low" | "Medium" | "High";
}

// ─── Trigger Reasons ────────────────────────────────────────────────────────

export const TRIGGER_REASONS = [
  "業績が良かった",
  "配当・株主優待に魅力を感じた",
  "株価が割安に見えた",
  "チャートや値動きが良かった",
  "普段使っている商品・サービスの会社だった",
  "将来性のある業界だと思った",
  "ニュースで知った",
  "SNSや動画で話題になっていた",
  "家族・友人・知人に勧められた",
  "長期投資に向いていると思った",
  "NISAで買いたかった",
  "その他",
] as const;

export const HOLD_PERIOD_OPTIONS = [
  { label: "当日（デイトレード）", hours: 0.5 },
  { label: "数日（スイング）", hours: 72 },
  { label: "1週間〜1ヶ月", hours: 336 },
  { label: "数ヶ月", hours: 2160 },
  { label: "1年以上", hours: 8760 },
  { label: "未定", hours: 0 },
] as const;

// ─── Monthly Goals ──────────────────────────────────────────────────────────

export interface MonthlyGoal {
  id: string;
  year: number;
  month: number; // 1-12
  targetWinRate: number; // 0-100
  targetRiskRewardRatio: number; // e.g., 1.5
  targetPnL?: number; // optional profit target
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  year: number;
  month: number;
  currentWinRate: number;
  currentRiskRewardRatio: number;
  currentPnL: number;
  totalTrades: number;
  wins: number;
  winRateProgress: number; // 0-100
  rrProgress: number; // 0-100
  pnlProgress?: number; // 0-100 if target exists
  status: "on_track" | "at_risk" | "exceeded" | "failed";
  daysRemaining: number;
}

// ─── Achievement Badges ────────────────────────────────────────────────────

export type BadgeType = "win_rate" | "rr_ratio" | "pnl" | "consistency" | "streak" | "perfect_month";

export interface AchievementBadge {
  id: string;
  type: BadgeType;
  year: number;
  month: number;
  title: string;
  description: string;
  icon: string; // emoji or icon name
  color: string; // oklch color
  unlockedAt: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface BadgeStats {
  totalBadges: number;
  commonCount: number;
  rareCount: number;
  epicCount: number;
  legendaryCount: number;
  recentBadges: AchievementBadge[];
}
