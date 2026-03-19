// Design: Dark Financial × Neo-Brutalist
// Profile page with achievement badges display

import { useState } from "react";
import { getAllBadges, getBadgeStats } from "@/lib/badgeStorage";
import { getTrades } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Zap, TrendingUp, Calendar, Award } from "lucide-react";

export default function Profile() {
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);

  const badges = getAllBadges();
  const stats = getBadgeStats();
  const trades = getTrades();

  // Calculate profile stats
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.result === "win").length;
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : "0";
  const avgRR =
    totalTrades > 0
      ? (trades.reduce((sum, t) => sum + (t.riskRewardRatio || 0), 0) / totalTrades).toFixed(2)
      : "0";

  const rarityColors: Record<string, string> = {
    common: "bg-slate-700 border-slate-600",
    rare: "bg-blue-900 border-blue-700",
    epic: "bg-purple-900 border-purple-700",
    legendary: "bg-yellow-900 border-yellow-700",
  };

  const rarityLabels: Record<string, string> = {
    common: "コモン",
    rare: "レア",
    epic: "エピック",
    legendary: "レジェンダリー",
  };

  const filteredBadges = selectedRarity ? badges.filter((b) => b.rarity === selectedRarity) : badges;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">プロフィール</h1>
          <p className="text-muted-foreground">あなたのトレード成績とバッジを表示します</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">総トレード数</p>
                <p className="text-3xl font-bold">{totalTrades}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">勝率</p>
                <p className="text-3xl font-bold">{winRate}%</p>
              </div>
              <Zap className="w-8 h-8 text-amber-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">平均RR比</p>
                <p className="text-3xl font-bold">1:{avgRR}</p>
              </div>
              <Calendar className="w-8 h-8 text-emerald-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">バッジ数</p>
                <p className="text-3xl font-bold">{stats.totalBadges}</p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-500 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Badge Stats */}
        <Card className="p-6 border-border bg-card/50 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            バッジ統計
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-700">
              <p className="text-sm text-muted-foreground mb-1">コモン</p>
              <p className="text-2xl font-bold text-slate-400">{stats.commonCount}</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-700">
              <p className="text-sm text-muted-foreground mb-1">レア</p>
              <p className="text-2xl font-bold text-blue-400">{stats.rareCount}</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-900/30 border border-purple-700">
              <p className="text-sm text-muted-foreground mb-1">エピック</p>
              <p className="text-2xl font-bold text-purple-400">{stats.epicCount}</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-900/30 border border-yellow-700">
              <p className="text-sm text-muted-foreground mb-1">レジェンダリー</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.legendaryCount}</p>
            </div>
          </div>
        </Card>

        {/* Rarity Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            variant={selectedRarity === null ? "default" : "outline"}
            onClick={() => setSelectedRarity(null)}
            className="text-sm"
          >
            すべて ({badges.length})
          </Button>
          <Button
            variant={selectedRarity === "common" ? "default" : "outline"}
            onClick={() => setSelectedRarity("common")}
            className="text-sm"
          >
            コモン ({stats.commonCount})
          </Button>
          <Button
            variant={selectedRarity === "rare" ? "default" : "outline"}
            onClick={() => setSelectedRarity("rare")}
            className="text-sm"
          >
            レア ({stats.rareCount})
          </Button>
          <Button
            variant={selectedRarity === "epic" ? "default" : "outline"}
            onClick={() => setSelectedRarity("epic")}
            className="text-sm"
          >
            エピック ({stats.epicCount})
          </Button>
          <Button
            variant={selectedRarity === "legendary" ? "default" : "outline"}
            onClick={() => setSelectedRarity("legendary")}
            className="text-sm"
          >
            レジェンダリー ({stats.legendaryCount})
          </Button>
        </div>

        {/* Badges Grid */}
        {filteredBadges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBadges.map((badge) => (
              <Card
                key={badge.id}
                className={`p-6 border-2 ${rarityColors[badge.rarity]} hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl">{badge.icon}</div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-black/30 text-yellow-300">
                    {rarityLabels[badge.rarity]}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-1">{badge.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{badge.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {badge.year}年{badge.month}月
                  </span>
                  <span>{new Date(badge.unlockedAt).toLocaleDateString("ja-JP")}</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 border-border bg-card/50 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {selectedRarity ? "このレアリティのバッジはまだありません" : "バッジをまだ獲得していません"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">目標を達成してバッジを獲得しましょう！</p>
          </Card>
        )}

        {/* Recent Badges */}
        {stats.recentBadges.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">最近獲得したバッジ</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {stats.recentBadges.map((badge) => (
                <Card
                  key={badge.id}
                  className={`p-4 border-2 ${rarityColors[badge.rarity]} text-center hover:shadow-lg transition-shadow`}
                >
                  <div className="text-3xl mb-2">{badge.icon}</div>
                  <p className="text-sm font-bold line-clamp-2">{badge.title}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {badge.year}年{badge.month}月
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
