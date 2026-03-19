import { TitleProfile } from './titleSystem';
import { audioManager } from './audioManager';

const TITLE_PROFILE_KEY = 'brake_title_profile';
const TITLE_HISTORY_KEY = 'brake_title_history';

export interface TitleAchievementRecord {
  timestamp: string;
  type: 'rank' | 'class' | 'special' | 'asset' | 'light' | 'secret' | 'hidden';
  titleId: string;
  titleName: string;
}

// ============================================================================
// 現在の称号プロフィールを保存・取得
// ============================================================================

export function saveTitleProfile(profile: TitleProfile): void {
  try {
    localStorage.setItem(TITLE_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Failed to save title profile:', error);
  }
}

export function getTitleProfile(): TitleProfile | null {
  try {
    const data = localStorage.getItem(TITLE_PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get title profile:', error);
    return null;
  }
}

// ============================================================================
// 称号獲得履歴を保存・取得
// ============================================================================

export function addTitleAchievement(record: TitleAchievementRecord): void {
  try {
    const history = getTitleHistory();
    history.push(record);
    localStorage.setItem(TITLE_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to add title achievement:', error);
  }
}

export function getTitleHistory(): TitleAchievementRecord[] {
  try {
    const data = localStorage.getItem(TITLE_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get title history:', error);
    return [];
  }
}

// ============================================================================
// 称号の変更を検出して履歴に記録
// ============================================================================

export function updateTitleProfileWithHistory(newProfile: TitleProfile): void {
  const oldProfile = getTitleProfile();
  
  // ランク変更
  if (!oldProfile || oldProfile.rank !== newProfile.rank) {
    addTitleAchievement({
      timestamp: new Date().toISOString(),
      type: 'rank',
      titleId: newProfile.rank,
      titleName: newProfile.rank,
    });
    // ランクアップ（レベルアップ）時にサウンドを再生
    if (oldProfile) {
      audioManager.playLevelUp();
    }
  }

  // クラス変更
  if (!oldProfile || oldProfile.class !== newProfile.class) {
    if (newProfile.class) {
      addTitleAchievement({
        timestamp: new Date().toISOString(),
        type: 'class',
        titleId: newProfile.class,
        titleName: newProfile.class,
      });
    }
  }

  // 別格称号変更
  if (!oldProfile || oldProfile.specialTitle !== newProfile.specialTitle) {
    if (newProfile.specialTitle) {
      addTitleAchievement({
        timestamp: new Date().toISOString(),
        type: 'special',
        titleId: newProfile.specialTitle,
        titleName: newProfile.specialTitle,
      });
    }
  }

  // アセット階級変更
  if (!oldProfile || oldProfile.assetTier !== newProfile.assetTier) {
    addTitleAchievement({
      timestamp: new Date().toISOString(),
      type: 'asset',
      titleId: newProfile.assetTier,
      titleName: newProfile.assetTier,
    });
  }

  // ライト称号追加
  if (oldProfile) {
    const newLightTitles = newProfile.lightTitles.filter(
      t => !oldProfile.lightTitles.includes(t)
    );
    for (const title of newLightTitles) {
      addTitleAchievement({
        timestamp: new Date().toISOString(),
        type: 'light',
        titleId: title,
        titleName: title,
      });
    }
  } else {
    for (const title of newProfile.lightTitles) {
      addTitleAchievement({
        timestamp: new Date().toISOString(),
        type: 'light',
        titleId: title,
        titleName: title,
      });
    }
  }

  // シークレット称号追加
  if (oldProfile) {
    const newSecretTitles = newProfile.secretTitles.filter(
      t => !oldProfile.secretTitles.includes(t)
    );
    for (const title of newSecretTitles) {
      addTitleAchievement({
        timestamp: new Date().toISOString(),
        type: 'secret',
        titleId: title,
        titleName: title,
      });
    }
  } else {
    for (const title of newProfile.secretTitles) {
      addTitleAchievement({
        timestamp: new Date().toISOString(),
        type: 'secret',
        titleId: title,
        titleName: title,
      });
    }
  }

  // 裏称号追加（本人向けのみ）
  if (oldProfile) {
    const newHiddenTitles = newProfile.hiddenTitles.filter(
      t => !oldProfile.hiddenTitles.includes(t)
    );
    for (const title of newHiddenTitles) {
      addTitleAchievement({
        timestamp: new Date().toISOString(),
        type: 'hidden',
        titleId: title,
        titleName: title,
      });
    }
  } else {
    for (const title of newProfile.hiddenTitles) {
      addTitleAchievement({
        timestamp: new Date().toISOString(),
        type: 'hidden',
        titleId: title,
        titleName: title,
      });
    }
  }

  // 最後に新しいプロフィールを保存
  saveTitleProfile(newProfile);
}

// ============================================================================
// 称号プロフィールの公開版を取得（非公開情報を除外）
// ============================================================================

export function getPublicTitleProfile(profile: TitleProfile): Partial<TitleProfile> {
  return {
    rank: profile.rank,
    class: profile.class,
    specialTitle: profile.specialTitle,
    assetTier: profile.assetTier === 'seed' || profile.assetTier === 'builder' ? undefined : profile.assetTier,
    lightTitles: profile.lightTitles,
    secretTitles: profile.secretTitles.filter(t => t === 'perfectmans'), // パーフェクトマンスのみ公開
    hiddenTitles: [], // 裏称号は非公開
  };
}

// ============================================================================
// 月次レポート用の称号サマリー
// ============================================================================

export interface TitleSummary {
  currentRank: string;
  currentClass: string | null;
  currentAssetTier: string;
  totalLightTitles: number;
  totalSecretTitles: number;
  newTitlesThisMonth: TitleAchievementRecord[];
  allTimeAchievements: number;
}

export function getTitleSummary(profile: TitleProfile): TitleSummary {
  const history = getTitleHistory();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const newTitlesThisMonth = history.filter(
    record => new Date(record.timestamp) >= monthStart
  );

  return {
    currentRank: profile.rank,
    currentClass: profile.class || 'なし',
    currentAssetTier: profile.assetTier,
    totalLightTitles: profile.lightTitles.length,
    totalSecretTitles: profile.secretTitles.length,
    newTitlesThisMonth,
    allTimeAchievements: history.length,
  };
}

// ============================================================================
// 称号の統計情報
// ============================================================================

export interface TitleStatistics {
  rankDistribution: Record<string, number>;
  classCount: number;
  specialTitleCount: number;
  lightTitleCount: number;
  secretTitleCount: number;
  hiddenTitleCount: number;
  totalAchievements: number;
  averageTitlesPerUser: number;
}

export function calculateTitleStatistics(profiles: TitleProfile[]): TitleStatistics {
  const rankDistribution: Record<string, number> = {};
  let classCount = 0;
  let specialTitleCount = 0;
  let lightTitleCount = 0;
  let secretTitleCount = 0;
  let hiddenTitleCount = 0;

  for (const profile of profiles) {
    rankDistribution[profile.rank] = (rankDistribution[profile.rank] || 0) + 1;
    if (profile.class) classCount++;
    if (profile.specialTitle) specialTitleCount++;
    lightTitleCount += profile.lightTitles.length;
    secretTitleCount += profile.secretTitles.length;
    hiddenTitleCount += profile.hiddenTitles.length;
  }

  const totalAchievements = classCount + specialTitleCount + lightTitleCount + secretTitleCount + hiddenTitleCount;
  const averageTitlesPerUser = profiles.length > 0 ? totalAchievements / profiles.length : 0;

  return {
    rankDistribution,
    classCount,
    specialTitleCount,
    lightTitleCount,
    secretTitleCount,
    hiddenTitleCount,
    totalAchievements,
    averageTitlesPerUser,
  };
}
