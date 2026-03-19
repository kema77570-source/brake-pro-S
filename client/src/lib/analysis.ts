// BRAKE Pro — Core Analysis Engine
// Risk/Reward, FOMO Detection, AI Technical Audit

import type {
  FomoFactor,
  AIAuditResult,
  TradeEntry,
  AssetHeatData,
} from "./types";
import { TRIGGER_REASONS } from "./types";

// ─── Risk / Reward Calculator ────────────────────────────────────────────────

export interface RiskRewardResult {
  ratio: number;
  riskAmount: number;
  rewardAmount: number;
  riskPercent: number;
  rewardPercent: number;
  isValid: boolean;
  warning?: string;
}

export function calculateRiskReward(
  entryPrice: number,
  stopLossPrice: number,
  takeProfitPrice: number,
  direction: "long" | "short" = "long",
  positionSize = 1
): RiskRewardResult {
  if (entryPrice <= 0 || stopLossPrice <= 0 || takeProfitPrice <= 0) {
    return { ratio: 0, riskAmount: 0, rewardAmount: 0, riskPercent: 0, rewardPercent: 0, isValid: false };
  }

  let riskAmount: number;
  let rewardAmount: number;

  if (direction === "long") {
    riskAmount = (entryPrice - stopLossPrice) * positionSize;
    rewardAmount = (takeProfitPrice - entryPrice) * positionSize;
  } else {
    riskAmount = (stopLossPrice - entryPrice) * positionSize;
    rewardAmount = (entryPrice - takeProfitPrice) * positionSize;
  }

  if (riskAmount <= 0) {
    return {
      ratio: 0, riskAmount: 0, rewardAmount: 0,
      riskPercent: 0, rewardPercent: 0,
      isValid: false,
      warning: direction === "long"
        ? "損切価格はエントリー価格より低く設定してください"
        : "損切価格はエントリー価格より高く設定してください",
    };
  }
  if (rewardAmount <= 0) {
    return {
      ratio: 0, riskAmount: 0, rewardAmount: 0,
      riskPercent: 0, rewardPercent: 0,
      isValid: false,
      warning: direction === "long"
        ? "利確価格はエントリー価格より高く設定してください"
        : "利確価格はエントリー価格より低く設定してください",
    };
  }

  const ratio = Math.round((rewardAmount / riskAmount) * 100) / 100;
  const riskPercent = Math.round((Math.abs(entryPrice - stopLossPrice) / entryPrice) * 10000) / 100;
  const rewardPercent = Math.round((Math.abs(takeProfitPrice - entryPrice) / entryPrice) * 10000) / 100;

  let warning: string | undefined;
  if (ratio < 1.0) {
    warning = `RR比 ${ratio} は1.0未満です。リスクがリワードを上回っています。`;
  } else if (ratio < 1.5) {
    warning = `RR比 ${ratio} は推奨値（1.5以上）を下回っています。`;
  }

  return {
    ratio,
    riskAmount: Math.round(riskAmount * 100) / 100,
    rewardAmount: Math.round(rewardAmount * 100) / 100,
    riskPercent,
    rewardPercent,
    isValid: true,
    warning,
  };
}

// ─── FOMO Score Calculator ───────────────────────────────────────────────────

export interface FomoScoreResult {
  totalScore: number;
  marketFomoScore: number;
  userFomoScore: number;
  factors: FomoFactor[];
  level: "low" | "medium" | "high" | "critical";
  summary: string;
}

export function calculateFomoScore(params: {
  ticker: string;
  triggerReason: string;
  entryReason: string;
  infoSource: string;
  whyNow: string;
  holdPeriodLabel: string;
  stopLossReason: string;
  assetHeat?: AssetHeatData | null;
  marketFearGreedValue?: number;
}): FomoScoreResult {
  const factors: FomoFactor[] = [];

  // ── Market-side FOMO factors ──────────────────────────────────────────────
  const heat = params.assetHeat;

  const highRsi = heat ? heat.rsi >= 70 : false;
  factors.push({
    label: `RSI過熱（${heat ? heat.rsi : "不明"}）`,
    risk: highRsi,
    type: "market",
    weight: 15,
  });

  const highVolumeSpike = heat ? heat.volumeIncrease >= 100 : false;
  factors.push({
    label: `出来高急増（+${heat ? heat.volumeIncrease : 0}%）`,
    risk: highVolumeSpike,
    type: "market",
    weight: 12,
  });

  const highMaDeviation = heat ? Math.abs(heat.maDeviation) >= 10 : false;
  factors.push({
    label: `移動平均乖離率大（${heat ? heat.maDeviation : 0}%）`,
    risk: highMaDeviation,
    type: "market",
    weight: 12,
  });

  const fearGreedHigh = params.marketFearGreedValue
    ? params.marketFearGreedValue >= 75
    : false;
  factors.push({
    label: `市場の強欲指数高（${params.marketFearGreedValue ?? "不明"}）`,
    risk: fearGreedHigh,
    type: "market",
    weight: 11,
  });

  const highHeatLevel = heat ? heat.heatLevel === "High" : false;
  factors.push({
    label: "銘柄過熱度: High",
    risk: highHeatLevel,
    type: "market",
    weight: 10,
  });

  // ── User-side FOMO factors ────────────────────────────────────────────────
  const snsSource =
    params.infoSource.toLowerCase().includes("sns") ||
    params.infoSource.toLowerCase().includes("twitter") ||
    params.infoSource.toLowerCase().includes("x.com") ||
    params.infoSource.toLowerCase().includes("youtube") ||
    params.infoSource.toLowerCase().includes("discord") ||
    params.infoSource.toLowerCase().includes("tiktok") ||
    params.infoSource.toLowerCase().includes("instagram");
  factors.push({
    label: "SNS・動画で知った",
    risk: snsSource,
    type: "user",
    weight: 15,
  });

  const hypeReason =
    params.triggerReason === "SNSや動画で話題になっていた" ||
    params.triggerReason === "家族・友人・知人に勧められた" ||
    params.triggerReason === "ニュースで知った";
  factors.push({
    label: "話題性・口コミがきっかけ",
    risk: hypeReason,
    type: "user",
    weight: 12,
  });

  const shortReason = !params.entryReason || params.entryReason.length < 20;
  factors.push({
    label: "エントリー理由が不明確",
    risk: shortReason,
    type: "user",
    weight: 10,
  });

  const noStopLoss =
    !params.stopLossReason ||
    params.stopLossReason.length < 3 ||
    params.stopLossReason.includes("未定");
  factors.push({
    label: "損切りライン未設定",
    risk: noStopLoss,
    type: "user",
    weight: 13,
  });

  const urgencyKeywords = ["乗り遅れ", "急いで", "今すぐ", "チャンス", "逃す", "もう上がる"];
  const hasUrgency = urgencyKeywords.some(
    (k) => params.whyNow.includes(k) || params.entryReason.includes(k)
  );
  factors.push({
    label: "焦り・乗り遅れ感の表現",
    risk: hasUrgency,
    type: "user",
    weight: 10,
  });

  const shortHold =
    params.holdPeriodLabel === "当日（デイトレード）" ||
    params.holdPeriodLabel === "数日（スイング）";
  factors.push({
    label: "短期売買の衝動",
    risk: shortHold,
    type: "user",
    weight: 8,
  });

  // ── Score calculation ─────────────────────────────────────────────────────
  const marketFactors = factors.filter((f) => f.type === "market");
  const userFactors = factors.filter((f) => f.type === "user");

  const marketMaxWeight = marketFactors.reduce((s, f) => s + f.weight, 0);
  const userMaxWeight = userFactors.reduce((s, f) => s + f.weight, 0);

  const marketRiskWeight = marketFactors
    .filter((f) => f.risk)
    .reduce((s, f) => s + f.weight, 0);
  const userRiskWeight = userFactors
    .filter((f) => f.risk)
    .reduce((s, f) => s + f.weight, 0);

  const marketFomoScore = marketMaxWeight > 0
    ? Math.round((marketRiskWeight / marketMaxWeight) * 100)
    : 0;
  const userFomoScore = userMaxWeight > 0
    ? Math.round((userRiskWeight / userMaxWeight) * 100)
    : 0;
  const totalScore = Math.round((marketFomoScore + userFomoScore) / 2);

  const level =
    totalScore >= 75 ? "critical" :
    totalScore >= 50 ? "high" :
    totalScore >= 30 ? "medium" : "low";

  const summaries = {
    critical: "衝動買いの可能性が非常に高いです。今すぐ取引を停止し、冷却時間を取ることを強く推奨します。",
    high: "複数のFOMOシグナルが検出されています。もう一度自分のルールを確認しましょう。",
    medium: "いくつかの懸念があります。損切りラインとリスクリワードを再確認してください。",
    low: "比較的冷静な判断ができている可能性があります。",
  };

  return {
    totalScore,
    marketFomoScore,
    userFomoScore,
    factors,
    level,
    summary: summaries[level],
  };
}

// ─── AI Technical Audit ──────────────────────────────────────────────────────

export function generateAIAudit(
  asset: AssetHeatData | null,
  fearGreedValue: number,
  entryPrice: number,
  stopLossPrice: number,
  takeProfitPrice: number,
  direction: "long" | "short"
): AIAuditResult {
  const warnings: string[] = [];
  let score = 0;

  // RSI analysis
  const rsi = asset?.rsi ?? 50;
  let rsiSignal: string;
  if (rsi >= 80) {
    rsiSignal = `RSI ${rsi} — 強い買われすぎ。反落リスク高`;
    warnings.push("RSIが80超。高値掴みのリスクがあります");
    score += 25;
  } else if (rsi >= 70) {
    rsiSignal = `RSI ${rsi} — 買われすぎ圏内`;
    warnings.push("RSIが70超。過熱状態です");
    score += 15;
  } else if (rsi <= 20) {
    rsiSignal = `RSI ${rsi} — 強い売られすぎ。反発期待`;
    score -= 10;
  } else if (rsi <= 30) {
    rsiSignal = `RSI ${rsi} — 売られすぎ圏内`;
    score -= 5;
  } else {
    rsiSignal = `RSI ${rsi} — 中立圏`;
  }

  // MA deviation analysis
  const maDeviation = asset?.maDeviation ?? 0;
  let maSignal: string;
  if (Math.abs(maDeviation) >= 15) {
    maSignal = `MA乖離 ${maDeviation}% — 大幅乖離、平均回帰リスク`;
    warnings.push(`移動平均から${maDeviation}%乖離。急騰後の反落に注意`);
    score += 20;
  } else if (Math.abs(maDeviation) >= 8) {
    maSignal = `MA乖離 ${maDeviation}% — 要注意`;
    score += 10;
  } else {
    maSignal = `MA乖離 ${maDeviation}% — 正常範囲`;
  }

  // Volume analysis
  const volumeIncrease = asset?.volumeIncrease ?? 0;
  let volumeSignal: string;
  if (volumeIncrease >= 200) {
    volumeSignal = `出来高 +${volumeIncrease}% — 異常な急増（FOMO注意）`;
    warnings.push("出来高が200%超増加。投機的な動きの可能性");
    score += 20;
  } else if (volumeIncrease >= 100) {
    volumeSignal = `出来高 +${volumeIncrease}% — 大幅増加`;
    score += 10;
  } else if (volumeIncrease >= 50) {
    volumeSignal = `出来高 +${volumeIncrease}% — 増加傾向`;
    score += 5;
  } else {
    volumeSignal = `出来高 ${volumeIncrease >= 0 ? "+" : ""}${volumeIncrease}% — 通常範囲`;
  }

  // Fear & Greed
  let trendSignal: string;
  if (fearGreedValue >= 80) {
    trendSignal = `市場心理: 極度の強欲（${fearGreedValue}）— 天井圏の可能性`;
    warnings.push("市場全体が極度の強欲状態。反転リスクに注意");
    score += 15;
  } else if (fearGreedValue >= 65) {
    trendSignal = `市場心理: 強欲（${fearGreedValue}）— 過熱注意`;
    score += 8;
  } else if (fearGreedValue <= 20) {
    trendSignal = `市場心理: 極度の恐怖（${fearGreedValue}）— 押し目の可能性`;
    score -= 5;
  } else {
    trendSignal = `市場心理: ${fearGreedValue <= 44 ? "恐怖" : fearGreedValue <= 55 ? "中立" : "やや強欲"}（${fearGreedValue}）`;
  }

  // Risk/Reward check
  const rr = calculateRiskReward(entryPrice, stopLossPrice, takeProfitPrice, direction);
  if (rr.isValid && rr.ratio < 1.0) {
    warnings.push(`RR比 ${rr.ratio} — リスクがリワードを上回っています`);
    score += 15;
  } else if (rr.isValid && rr.ratio < 1.5) {
    warnings.push(`RR比 ${rr.ratio} — 推奨値（1.5以上）を下回っています`);
    score += 8;
  }

  const clampedScore = Math.max(0, Math.min(100, score));
  const overallRisk =
    clampedScore >= 70 ? "critical" :
    clampedScore >= 45 ? "high" :
    clampedScore >= 20 ? "medium" : "low";

  const recommendations = {
    critical: "複数の過熱シグナルが検出されています。このエントリーは高リスクです。冷却時間を取り、ルールを再確認することを強く推奨します。",
    high: "いくつかの警告シグナルがあります。損切りラインとポジションサイズを慎重に設定してください。",
    medium: "軽微な懸念があります。エントリー前にリスク管理を再確認してください。",
    low: "テクニカル指標は比較的落ち着いています。ただし、常にリスク管理を怠らないでください。",
  };

  return {
    timestamp: new Date().toISOString(),
    overallRisk,
    rsiSignal,
    maSignal,
    volumeSignal,
    trendSignal,
    recommendation: recommendations[overallRisk],
    warningFlags: warnings,
    score: clampedScore,
  };
}

// ─── Heart Rate Stress Level ─────────────────────────────────────────────────

export function classifyHeartRate(
  bpm: number,
  warningBpm: number,
  criticalBpm: number
): { level: "low" | "medium" | "high" | "critical"; label: string; color: string } {
  if (bpm >= criticalBpm) {
    return { level: "critical", label: "危険レベル", color: "text-red-400" };
  } else if (bpm >= warningBpm) {
    return { level: "high", label: "高ストレス", color: "text-amber-400" };
  } else if (bpm >= warningBpm * 0.85) {
    return { level: "medium", label: "やや高め", color: "text-yellow-400" };
  }
  return { level: "low", label: "正常", color: "text-emerald-400" };
}
