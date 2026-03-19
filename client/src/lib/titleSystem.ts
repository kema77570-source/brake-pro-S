import { TradeEntry, SkipLogEntry } from './types';

// ============================================================================
// 称号システムの型定義
// ============================================================================

export type RankType = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'challenger';
export type ClassType = 'janestreet' | 'jpmorgan' | 'goldman' | 'blackrock';
export type SpecialTitleType = 'bnf';
export type AssetTierType = 'seed' | 'builder' | 'accumulator' | 'capitalholder' | 'capitalelite' | 'capitalsovereign';
export type LightTitleType = 
  | 'riskdisciplined' | 'ddcontrol' | 'processcomplete' | 'impulseresistant'
  | 'recoveryproven' | 'fomoresistant' | 'coolexecution' | 'capitaldefense'
  | 'winstreak' | 'perfectweek' | 'consistent' | 'rrmaster'
  | 'multistrategist' | 'marketadapter' | 'tickermaster' | 'disciplined'
  | 'researchcommit' | 'mentalmaster' | 'growthhunter' | 'longevity';
export type SecretTitleType = 'theone' | 'ddzeero' | 'perfectmans' | 'capitaldouble';
export type HiddenTitleType = 
  | 'bakusongeinin' | 'gamblingcert' | 'fomoentryadmit' | 'prayertradeadmit'
  | 'rootlotincreaser' | 'fomobuyerdisease' | 'onestrikejunkie' | 'cutlossrefusal';

export interface TitleProfile {
  rank: RankType;
  class: ClassType | null;
  specialTitle: SpecialTitleType | null;
  assetTier: AssetTierType;
  lightTitles: LightTitleType[];
  secretTitles: SecretTitleType[];
  hiddenTitles: HiddenTitleType[];
}

export interface EvaluationScores {
  capitalGrowth: number;
  riskControl: number;
  discipline: number;
  emotionalControl: number;
  consistency: number;
  researchReview: number;
}

// ============================================================================
// ランク計算ロジック
// ============================================================================

export function calculateRank(
  trades: TradeEntry[],
  scores: EvaluationScores,
  maxDD: number,
  winRate: number,
  avgRR: number,
  disciplineScore: number,
  assetSize: number,
  runningDays: number
): RankType {
  // チャレンジャー条件
  if (
    runningDays >= 90 &&
    maxDD >= -8 &&
    winRate >= 65 &&
    avgRR >= 2.5 &&
    disciplineScore >= 98 &&
    scores.emotionalControl >= 90 &&
    scores.consistency >= 90
  ) {
    return 'challenger';
  }

  // ダイヤモンド条件
  if (
    runningDays >= 180 &&
    assetSize >= 5000000 &&
    maxDD >= -10 &&
    winRate >= 62 &&
    avgRR >= 2.2 &&
    disciplineScore >= 98 &&
    Object.values(scores).every(s => s >= 85)
  ) {
    return 'diamond';
  }

  // プラチナ条件
  if (
    maxDD >= -15 &&
    winRate >= 60 &&
    avgRR >= 2.0 &&
    disciplineScore >= 95 &&
    scores.emotionalControl >= 80 &&
    scores.riskControl >= 85
  ) {
    return 'platinum';
  }

  // ゴールド条件
  if (
    maxDD >= -20 &&
    winRate >= 55 &&
    avgRR >= 1.5 &&
    disciplineScore >= 85 &&
    scores.riskControl >= 75
  ) {
    return 'gold';
  }

  // シルバー条件
  if (
    maxDD >= -20 &&
    disciplineScore >= 75 &&
    scores.emotionalControl >= 60 &&
    trades.length >= 15
  ) {
    return 'silver';
  }

  // ブロンズ条件
  if (disciplineScore >= 60 && trades.length >= 10) {
    return 'bronze';
  }

  return 'bronze';
}

// ============================================================================
// クラス計算ロジック
// ============================================================================

export function calculateClass(
  rank: RankType,
  scores: EvaluationScores,
  maxDD: number,
  winRate: number,
  avgRR: number,
  disciplineScore: number,
  assetSize: number,
  runningDays: number,
  tradingEfficiency: number,
  oneStrikeDependency: number
): ClassType | null {
  if (rank === 'bronze' || rank === 'silver') {
    return null;
  }

  // ブラックロック・クラス条件
  if (
    runningDays >= 360 &&
    assetSize >= 10000000 &&
    maxDD >= -10 &&
    winRate >= 60 &&
    avgRR >= 2.0 &&
    disciplineScore >= 99 &&
    Object.values(scores).every(s => s >= 88)
  ) {
    return 'blackrock';
  }

  // ゴールドマン・クラス条件
  if (
    runningDays >= 180 &&
    assetSize >= 5000000 &&
    maxDD >= -12 &&
    winRate >= 58 &&
    avgRR >= 2.0 &&
    disciplineScore >= 97 &&
    Object.values(scores).every(s => s >= 85)
  ) {
    return 'goldman';
  }

  // JPモルガン・クラス条件
  if (
    runningDays >= 180 &&
    assetSize >= 3000000 &&
    maxDD >= -10 &&
    winRate >= 60 &&
    disciplineScore >= 98 &&
    scores.riskControl >= 90
  ) {
    return 'jpmorgan';
  }

  // ジェーンストリート・クラス条件
  if (
    runningDays >= 90 &&
    assetSize >= 1000000 &&
    maxDD >= -15 &&
    winRate >= 65 &&
    avgRR >= 2.5 &&
    tradingEfficiency >= 85 &&
    oneStrikeDependency <= 10 &&
    disciplineScore >= 95
  ) {
    return 'janestreet';
  }

  return null;
}

// ============================================================================
// 別格称号計算ロジック
// ============================================================================

export function calculateSpecialTitle(
  rank: RankType,
  scores: EvaluationScores,
  maxDD: number,
  winRate: number,
  avgRR: number,
  disciplineScore: number,
  assetSize: number,
  runningDays: number,
  capitalGrowthRate: number,
  oneStrikeDependency: number,
  emotionalTradeRate: number
): SpecialTitleType | null {
  // BNF到達者条件
  if (
    runningDays >= 90 &&
    assetSize >= 500000 &&
    maxDD >= -20 &&
    capitalGrowthRate >= 0.8 && // 上位0.1%相当
    scores.emotionalControl >= 85 &&
    disciplineScore >= 95 &&
    oneStrikeDependency <= 20 &&
    emotionalTradeRate <= 15
  ) {
    return 'bnf';
  }

  return null;
}

// ============================================================================
// アセット階級計算ロジック
// ============================================================================

export function calculateAssetTier(assetSize: number): AssetTierType {
  if (assetSize >= 50000000) return 'capitalsovereign';
  if (assetSize >= 10000000) return 'capitalelite';
  if (assetSize >= 5000000) return 'capitalholder';
  if (assetSize >= 2000000) return 'accumulator';
  if (assetSize >= 500000) return 'builder';
  return 'seed';
}

// ============================================================================
// ライト称号計算ロジック
// ============================================================================

export function calculateLightTitles(
  trades: TradeEntry[],
  scores: EvaluationScores,
  maxDD: number,
  winRate: number,
  avgRR: number,
  disciplineScore: number,
  emotionalTradeRate: number,
  fomoScore: number,
  runningDays: number,
  capitalGrowthRate: number,
  monthlyWinRates: number[],
  monthlyMaxLosses: number[],
  tradingEfficiency: number,
  strategyCount: number,
  tickerCount: number,
  researchReviewRate: number
): LightTitleType[] {
  const titles: LightTitleType[] = [];

  // リスクディシプリンド
  if (disciplineScore >= 95 && runningDays >= 90) {
    titles.push('riskdisciplined');
  }

  // ドローダウンコントロール
  if (maxDD >= -15 && runningDays >= 90) {
    titles.push('ddcontrol');
  }

  // プロセスコンプリート
  if (scores.discipline >= 95 && runningDays >= 30) {
    titles.push('processcomplete');
  }

  // インパルスレジスタント
  if (emotionalTradeRate <= 10 && runningDays >= 60) {
    titles.push('impulseresistant');
  }

  // リカバリープルーブン
  const hasRecovery = trades.filter(t => t.result === 'loss').length >= 3;
  if (hasRecovery && runningDays >= 60) {
    titles.push('recoveryproven');
  }

  // フォモレジスタント
  if (fomoScore <= 30 && runningDays >= 30) {
    titles.push('fomoresistant');
  }

  // クールエグゼキューション
  if (winRate >= 60 && runningDays >= 60) {
    titles.push('coolexecution');
  }

  // キャピタルディフェンス
  if (monthlyMaxLosses.every(loss => loss >= -0.05) && runningDays >= 180) {
    titles.push('capitaldefense');
  }

  // ウィンストリーク
  const winStreaks = calculateWinStreaks(trades);
  if (Math.max(...winStreaks, 0) >= 5) {
    titles.push('winstreak');
  }

  // パーフェクトウィーク
  if (calculatePerfectWeeks(trades) >= 1) {
    titles.push('perfectweek');
  }

  // コンシステント
  if (monthlyWinRates.filter(r => r >= 0.55).length >= 6) {
    titles.push('consistent');
  }

  // リスクリワードマスター
  if (avgRR >= 2.0 && runningDays >= 90) {
    titles.push('rrmaster');
  }

  // マルチストラテジスト
  if (strategyCount >= 3) {
    titles.push('multistrategist');
  }

  // マーケットアダプター
  if (scores.consistency >= 80) {
    titles.push('marketadapter');
  }

  // ティッカーマスター
  if (tickerCount >= 5) {
    titles.push('tickermaster');
  }

  // ディシプリンド
  if (disciplineScore >= 98 && runningDays >= 180) {
    titles.push('disciplined');
  }

  // リサーチコミット
  if (researchReviewRate >= 1.0 && runningDays >= 180) {
    titles.push('researchcommit');
  }

  // メンタルマスター
  if (scores.emotionalControl >= 85 && runningDays >= 90) {
    titles.push('mentalmaster');
  }

  // グロースハンター
  if (capitalGrowthRate >= 0.05 && runningDays >= 90) {
    titles.push('growthhunter');
  }

  // ロンジェビティ
  if (runningDays >= 365) {
    titles.push('longevity');
  }

  return titles;
}

// ============================================================================
// シークレット称号計算ロジック
// ============================================================================

export function calculateSecretTitles(
  trades: TradeEntry[],
  maxDD: number,
  winRate: number,
  monthlyWinRates: number[],
  capitalGrowthRate: number,
  assetSize: number
): SecretTitleType[] {
  const titles: SecretTitleType[] = [];

  // ザ・ワン（月次勝率100%）
  if (monthlyWinRates.some(r => r === 1.0)) {
    titles.push('theone');
  }

  // ドローダウンゼロ（90日間DD 0%）
  if (maxDD === 0) {
    titles.push('ddzeero');
  }

  // パーフェクトマンス（3ヶ月連続勝率≥70%）
  const last3Months = monthlyWinRates.slice(-3);
  if (last3Months.length === 3 && last3Months.every(r => r >= 0.7)) {
    titles.push('perfectmans');
  }

  // キャピタルダブル（資産2倍）
  if (capitalGrowthRate >= 1.0) {
    titles.push('capitaldouble');
  }

  return titles;
}

// ============================================================================
// 裏称号計算ロジック
// ============================================================================

export function calculateHiddenTitles(
  monthlyPnL: number[],
  emotionalTradeRate: number,
  fomoScore: number,
  cutLossExecutionRate: number,
  oneStrikeDependency: number,
  skipLogs: SkipLogEntry[],
  averageHoldingTime: number
): HiddenTitleType[] {
  const titles: HiddenTitleType[] = [];

  // バク損芸人（月次損失-30%以上）
  if (monthlyPnL.some(pnl => pnl <= -0.3)) {
    titles.push('bakusongeinin');
  }

  // ギャンブル検定一級（感情的トレード率≥50%）
  if (emotionalTradeRate >= 0.5) {
    titles.push('gamblingcert');
  }

  // 雰囲気エントリー修了者（FOMO傾向≥80）
  if (fomoScore >= 80) {
    titles.push('fomoentryadmit');
  }

  // 祈祷トレード認定（損切実行率≤50%）
  if (cutLossExecutionRate <= 0.5) {
    titles.push('prayertradeadmit');
  }

  // 根性ロット増量士（ドローダウン中のロット増加）
  // ※ この条件は取引ログから検出する必要がある
  // 簡易実装：一撃依存度が高い場合
  if (oneStrikeDependency >= 0.4) {
    titles.push('rootlotincreaser');
  }

  // いま入らないと病（見送り後の追いかけエントリー）
  const chasingEntries = skipLogs.filter(s => s.verdict === 'missed_opportunity').length;
  if (chasingEntries >= 3) {
    titles.push('fomobuyerdisease');
  }

  // 一撃依存症（一撃依存度≥40%）
  if (oneStrikeDependency >= 0.4) {
    titles.push('onestrikejunkie');
  }

  // 損切拒否症（損切までの平均保有時間≥5日）
  if (averageHoldingTime >= 5) {
    titles.push('cutlossrefusal');
  }

  return titles;
}

// ============================================================================
// ヘルパー関数
// ============================================================================

function calculateWinStreaks(trades: TradeEntry[]): number[] {
  const streaks: number[] = [];
  let currentStreak = 0;

  for (const trade of trades) {
    if (trade.result === 'win') {
      currentStreak++;
    } else {
      if (currentStreak > 0) {
        streaks.push(currentStreak);
      }
      currentStreak = 0;
    }
  }

  if (currentStreak > 0) {
    streaks.push(currentStreak);
  }

  return streaks;
}

function calculatePerfectWeeks(trades: TradeEntry[]): number {
  const weeks = new Map<number, number[]>();

  for (const trade of trades) {
    const entryTime = trade.entryTime ? (typeof trade.entryTime === 'string' ? new Date(trade.entryTime).getTime() : trade.entryTime) : Date.now();
    const weekNumber = Math.floor(entryTime / (7 * 24 * 60 * 60 * 1000));
    if (!weeks.has(weekNumber)) {
      weeks.set(weekNumber, []);
    }
    weeks.get(weekNumber)!.push(trade.result === 'win' ? 1 : 0);
  }

  let perfectWeeks = 0;
  const weekArray = Array.from(weeks.values());
  for (const results of weekArray) {
    if (results.every((r: number) => r === 1)) {
      perfectWeeks++;
    }
  }

  return perfectWeeks;
}

// ============================================================================
// 称号プロフィール計算（統合関数）
// ============================================================================

export function calculateTitleProfile(
  trades: TradeEntry[],
  scores: EvaluationScores,
  metrics: {
    maxDD: number;
    winRate: number;
    avgRR: number;
    disciplineScore: number;
    assetSize: number;
    runningDays: number;
    tradingEfficiency: number;
    oneStrikeDependency: number;
    emotionalTradeRate: number;
    fomoScore: number;
    capitalGrowthRate: number;
    monthlyWinRates: number[];
    monthlyMaxLosses: number[];
    monthlyPnL: number[];
    strategyCount: number;
    tickerCount: number;
    researchReviewRate: number;
    cutLossExecutionRate: number;
    averageHoldingTime: number;
  },
  skipLogs: SkipLogEntry[]
): TitleProfile {
  const rank = calculateRank(
    trades,
    scores,
    metrics.maxDD,
    metrics.winRate,
    metrics.avgRR,
    metrics.disciplineScore,
    metrics.assetSize,
    metrics.runningDays
  );

  const titleClass = calculateClass(
    rank,
    scores,
    metrics.maxDD,
    metrics.winRate,
    metrics.avgRR,
    metrics.disciplineScore,
    metrics.assetSize,
    metrics.runningDays,
    metrics.tradingEfficiency,
    metrics.oneStrikeDependency
  );

  const specialTitle = calculateSpecialTitle(
    rank,
    scores,
    metrics.maxDD,
    metrics.winRate,
    metrics.avgRR,
    metrics.disciplineScore,
    metrics.assetSize,
    metrics.runningDays,
    metrics.capitalGrowthRate,
    metrics.oneStrikeDependency,
    metrics.emotionalTradeRate
  );

  const assetTier = calculateAssetTier(metrics.assetSize);

  const lightTitles = calculateLightTitles(
    trades,
    scores,
    metrics.maxDD,
    metrics.winRate,
    metrics.avgRR,
    metrics.disciplineScore,
    metrics.emotionalTradeRate,
    metrics.fomoScore,
    metrics.runningDays,
    metrics.capitalGrowthRate,
    metrics.monthlyWinRates,
    metrics.monthlyMaxLosses,
    metrics.tradingEfficiency,
    metrics.strategyCount,
    metrics.tickerCount,
    metrics.researchReviewRate
  );

  const secretTitles = calculateSecretTitles(
    trades,
    metrics.maxDD,
    metrics.winRate,
    metrics.monthlyWinRates,
    metrics.capitalGrowthRate,
    metrics.assetSize
  );

  const hiddenTitles = calculateHiddenTitles(
    metrics.monthlyPnL,
    metrics.emotionalTradeRate,
    metrics.fomoScore,
    metrics.cutLossExecutionRate,
    metrics.oneStrikeDependency,
    skipLogs,
    metrics.averageHoldingTime
  );

  return {
    rank,
    class: titleClass,
    specialTitle,
    assetTier,
    lightTitles,
    secretTitles,
    hiddenTitles,
  };
}

// ============================================================================
// 称号の表示名とメタデータ
// ============================================================================

export const RANK_METADATA: Record<RankType, { name: string; emoji: string; color: string; description: string }> = {
  bronze: { name: 'ブロンズ', emoji: '🥉', color: '#CD7F32', description: '基礎を学ぶ段階' },
  silver: { name: 'シルバー', emoji: '🥈', color: '#C0C0C0', description: '安定性を求める段階' },
  gold: { name: 'ゴールド', emoji: '🥇', color: '#FFD700', description: '再現性を確立する段階' },
  platinum: { name: 'プラチナ', emoji: '💎', color: '#E5E4E2', description: '高度な規律と安定性' },
  diamond: { name: 'ダイヤモンド', emoji: '💠', color: '#B9F2FF', description: '資本規模と安定性の両立' },
  challenger: { name: 'チャレンジャー', emoji: '⚡', color: '#FF6B00', description: '最高峰への挑戦者' },
};

export const CLASS_METADATA: Record<ClassType, { name: string; emoji: string; color: string; description: string }> = {
  janestreet: { name: 'ジェーンストリート・クラス', emoji: '🔬', color: '#4A90E2', description: '精密・高効率・スマートさ' },
  jpmorgan: { name: 'JPモルガン・クラス', emoji: '🛡️', color: '#2E7D32', description: '防御・資金管理・安定感' },
  goldman: { name: 'ゴールドマン・クラス', emoji: '👑', color: '#FFD700', description: '王道エリート・総合力' },
  blackrock: { name: 'ブラックロック・クラス', emoji: '🏛️', color: '#1A1A1A', description: '資本規模・安定・成熟' },
};

export const ASSET_TIER_METADATA: Record<AssetTierType, { name: string; emoji: string; description: string }> = {
  seed: { name: 'シード', emoji: '🌱', description: '成長の初期段階' },
  builder: { name: 'ビルダー', emoji: '🏗️', description: '基礎を築く段階' },
  accumulator: { name: 'アキュムレーター', emoji: '📈', description: '資本を蓄積する段階' },
  capitalholder: { name: 'キャピタルホルダー', emoji: '💼', description: '資本を保有する段階' },
  capitalelite: { name: 'キャピタルエリート', emoji: '👑', description: '資本エリート' },
  capitalsovereign: { name: 'キャピタルソブリン', emoji: '🏛️', description: '資本主権者' },
};

export const LIGHT_TITLE_METADATA: Record<LightTitleType, { name: string; emoji: string; description: string }> = {
  riskdisciplined: { name: 'リスクディシプリンド', emoji: '🛡️', description: 'リスク管理の規律を守る者' },
  ddcontrol: { name: 'ドローダウンコントロール', emoji: '📉', description: '最大DDを制限' },
  processcomplete: { name: 'プロセスコンプリート', emoji: '✅', description: 'チェックフロー完全実施' },
  impulseresistant: { name: 'インパルスレジスタント', emoji: '🧠', description: '衝動的トレードを排除' },
  recoveryproven: { name: 'リカバリープルーブン', emoji: '🔄', description: '損失からの回復能力' },
  fomoresistant: { name: 'フォモレジスタント', emoji: '🚫', description: 'FOMO傾向を克服' },
  coolexecution: { name: 'クールエグゼキューション', emoji: '❄️', description: '冷徹な判断と実行' },
  capitaldefense: { name: 'キャピタルディフェンス', emoji: '🏰', description: '資本防衛の鬼' },
  winstreak: { name: 'ウィンストリーク', emoji: '🔥', description: '連勝の快感' },
  perfectweek: { name: 'パーフェクトウィーク', emoji: '⭐', description: '完璧な1週間' },
  consistent: { name: 'コンシステント', emoji: '📊', description: '安定的な成績' },
  rrmaster: { name: 'リスクリワードマスター', emoji: '⚖️', description: 'RR比の達人' },
  multistrategist: { name: 'マルチストラテジスト', emoji: '🎯', description: '複数戦略の使い手' },
  marketadapter: { name: 'マーケットアダプター', emoji: '🌊', description: '相場環境への適応力' },
  tickermaster: { name: 'ティッカーマスター', emoji: '📱', description: '複数銘柄の使い手' },
  disciplined: { name: 'ディシプリンド', emoji: '⚔️', description: '規律の化身' },
  researchcommit: { name: 'リサーチコミット', emoji: '📚', description: '検証・振り返りの鬼' },
  mentalmaster: { name: 'メンタルマスター', emoji: '🧘', description: '感情統制の達人' },
  growthhunter: { name: 'グロースハンター', emoji: '🚀', description: '成長志向の追求者' },
  longevity: { name: 'ロンジェビティ', emoji: '🏅', description: '長期継続の証' },
};

export const SECRET_TITLE_METADATA: Record<SecretTitleType, { name: string; emoji: string; description: string }> = {
  theone: { name: 'ザ・ワン', emoji: '🌟', description: '月次勝率100%を達成' },
  ddzeero: { name: 'ドローダウンゼロ', emoji: '✨', description: '90日間DD 0%を達成' },
  perfectmans: { name: 'パーフェクトマンス', emoji: '🎆', description: '3ヶ月連続勝率≥70%' },
  capitaldouble: { name: 'キャピタルダブル', emoji: '💎', description: '資本を2倍にした者' },
};

export const HIDDEN_TITLE_METADATA: Record<HiddenTitleType, { name: string; emoji: string; description: string }> = {
  bakusongeinin: { name: 'バク損芸人', emoji: '🎭', description: '月次損失-30%以上' },
  gamblingcert: { name: 'ギャンブル検定一級', emoji: '🎰', description: '感情的トレード率≥50%' },
  fomoentryadmit: { name: '雰囲気エントリー修了者', emoji: '🌪️', description: 'FOMO傾向スコア≥80' },
  prayertradeadmit: { name: '祈祷トレード認定', emoji: '🙏', description: '損切実行率≤50%' },
  rootlotincreaser: { name: '根性ロット増量士', emoji: '💪', description: 'ドローダウン中のロット増加' },
  fomobuyerdisease: { name: 'いま入らないと病', emoji: '🤒', description: '見送り後の追いかけエントリー' },
  onestrikejunkie: { name: '一撃依存症', emoji: '💉', description: '一撃依存度≥40%' },
  cutlossrefusal: { name: '損切拒否症', emoji: '🚫', description: '損切までの平均保有時間≥5日' },
};
