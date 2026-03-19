import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTitleProfile, getTitleHistory, getTitleSummary } from '@/lib/titleStorage';
import {
  RANK_METADATA,
  CLASS_METADATA,
  ASSET_TIER_METADATA,
  LIGHT_TITLE_METADATA,
  SECRET_TITLE_METADATA,
  HIDDEN_TITLE_METADATA,
  TitleProfile,
} from '@/lib/titleSystem';
import { Trophy, Zap, Star, Lock, Skull } from 'lucide-react';

export default function TitleShowcase() {
  const [profile, setProfile] = useState<TitleProfile | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prof = getTitleProfile();
    if (prof) {
      setProfile(prof);
      setSummary(getTitleSummary(prof));
    }
    setHistory(getTitleHistory());
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p>称号プロフィールを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle>称号プロフィールが見つかりません</CardTitle>
              <CardDescription>
                まずはトレードを記録して、称号を獲得してください。
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const rankMeta = RANK_METADATA[profile.rank];
  const classMeta = profile.class ? CLASS_METADATA[profile.class] : null;
  const assetMeta = ASSET_TIER_METADATA[profile.assetTier];

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold">称号プロフィール</h1>
          <p className="text-muted-foreground">あなたのトレード人生の記録</p>
        </div>

        {/* メインランク表示 */}
        <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-5xl">{rankMeta.emoji}</span>
                  <div>
                    <CardTitle className="text-3xl">{rankMeta.name}</CardTitle>
                    <CardDescription>{rankMeta.description}</CardDescription>
                  </div>
                </div>
              </div>
              <div className="text-right space-y-2">
                <div className="text-sm text-muted-foreground">
                  {summary?.allTimeAchievements || 0} 個の称号を獲得
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* クラス・アセット階級 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classMeta && (
            <Card className="border-blue-500/50 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-3xl">{classMeta.emoji}</span>
                  {classMeta.name}
                </CardTitle>
                <CardDescription>{classMeta.description}</CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-3xl">{assetMeta.emoji}</span>
                {assetMeta.name}
              </CardTitle>
              <CardDescription>{assetMeta.description}</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* 別格称号 */}
        {profile.specialTitle && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-500" />
                別格称号
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {profile.specialTitle.toUpperCase()}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* タブ表示 */}
        <Tabs defaultValue="light" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="light">
              <Star className="w-4 h-4 mr-2" />
              ライト ({profile.lightTitles.length})
            </TabsTrigger>
            <TabsTrigger value="secret">
              <Trophy className="w-4 h-4 mr-2" />
              シークレット ({profile.secretTitles.length})
            </TabsTrigger>
            <TabsTrigger value="hidden">
              <Lock className="w-4 h-4 mr-2" />
              裏 ({profile.hiddenTitles.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <Zap className="w-4 h-4 mr-2" />
              履歴
            </TabsTrigger>
          </TabsList>

          {/* ライト称号 */}
          <TabsContent value="light" className="space-y-4">
            {profile.lightTitles.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  ライト称号をまだ獲得していません
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.lightTitles.map(titleId => {
                  const meta = LIGHT_TITLE_METADATA[titleId];
                  return (
                    <Card key={titleId} className="border-blue-500/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <span className="text-2xl">{meta.emoji}</span>
                          {meta.name}
                        </CardTitle>
                        <CardDescription>{meta.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* シークレット称号 */}
          <TabsContent value="secret" className="space-y-4">
            {profile.secretTitles.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  シークレット称号をまだ獲得していません
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.secretTitles.map(titleId => {
                  const meta = SECRET_TITLE_METADATA[titleId];
                  return (
                    <Card key={titleId} className="border-yellow-500/50 bg-yellow-500/5">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <span className="text-2xl">{meta.emoji}</span>
                          {meta.name}
                        </CardTitle>
                        <CardDescription>{meta.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* 裏称号 */}
          <TabsContent value="hidden" className="space-y-4">
            {profile.hiddenTitles.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  裏称号はまだ獲得していません
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.hiddenTitles.map(titleId => {
                  const meta = HIDDEN_TITLE_METADATA[titleId];
                  return (
                    <Card key={titleId} className="border-red-500/50 bg-red-500/5">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <span className="text-2xl">{meta.emoji}</span>
                          {meta.name}
                        </CardTitle>
                        <CardDescription>{meta.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* 獲得履歴 */}
          <TabsContent value="history" className="space-y-4">
            {history.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  獲得履歴がありません
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {history.slice().reverse().map((record, idx) => (
                  <Card key={idx} className="border-border/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold">{record.titleName}</p>
                          <p className="text-sm text-muted-foreground">
                            {record.type === 'rank' && 'ランク'}
                            {record.type === 'class' && 'クラス'}
                            {record.type === 'special' && '別格称号'}
                            {record.type === 'asset' && 'アセット階級'}
                            {record.type === 'light' && 'ライト称号'}
                            {record.type === 'secret' && 'シークレット称号'}
                            {record.type === 'hidden' && '裏称号'}
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {new Date(record.timestamp).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* サマリー */}
        {summary && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>称号統計</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{summary.totalLightTitles}</div>
                  <div className="text-sm text-muted-foreground">ライト称号</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">{summary.totalSecretTitles}</div>
                  <div className="text-sm text-muted-foreground">シークレット</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{profile.hiddenTitles.length}</div>
                  <div className="text-sm text-muted-foreground">裏称号</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{summary.allTimeAchievements}</div>
                  <div className="text-sm text-muted-foreground">総獲得数</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
