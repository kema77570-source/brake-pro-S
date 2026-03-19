// Design: Dark Financial × Neo-Brutalist
// Badge setting modal for unlocking achievements

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addBadge,
  createWinRateBadge,
  createRRRatioBadge,
  createPnLBadge,
  createConsistencyBadge,
  createPerfectMonthBadge,
} from "@/lib/badgeStorage";
import { toast } from "sonner";
import { audioManager } from "@/lib/audioManager";

interface BadgeSettingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
}

export function BadgeSettingModal({ open, onOpenChange, year, month }: BadgeSettingModalProps) {
  const [winRate, setWinRate] = useState<number>(50);
  const [rrRatio, setRRRatio] = useState<number>(1.5);
  const [pnl, setPnl] = useState<number>(0);
  const [consecutiveWins, setConsecutiveWins] = useState<number>(5);
  const [isPerfectMonth, setIsPerfectMonth] = useState(false);

  const handleUnlockBadges = () => {
    const badgesToUnlock = [];

    if (winRate >= 50) {
      addBadge(createWinRateBadge(year, month, winRate));
      badgesToUnlock.push(`勝率 ${winRate.toFixed(1)}%`);
    }

    if (rrRatio >= 1) {
      addBadge(createRRRatioBadge(year, month, rrRatio));
      badgesToUnlock.push(`RR比 1:${rrRatio.toFixed(2)}`);
    }

    if (pnl > 0) {
      addBadge(createPnLBadge(year, month, pnl));
      badgesToUnlock.push(`¥${pnl.toLocaleString()} 利益`);
    }

    if (consecutiveWins >= 5) {
      addBadge(createConsistencyBadge(year, month, consecutiveWins));
      badgesToUnlock.push(`${consecutiveWins}連勝`);
    }

    if (isPerfectMonth) {
      addBadge(createPerfectMonthBadge(year, month));
      badgesToUnlock.push("完璧な月");
    }

    if (badgesToUnlock.length > 0) {
      toast.success(`${badgesToUnlock.length}個のバッジを獲得しました！\n${badgesToUnlock.join(", ")}`);
      audioManager.playSuccessFanfare();
      onOpenChange(false);
    } else {
      toast.error("バッジを獲得する条件を満たしていません");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>バッジを獲得</DialogTitle>
          <DialogDescription>{year}年{month}月の成績でバッジを獲得できます</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Win Rate */}
          <Card className="p-4 border-border bg-card/50">
            <Label className="text-base font-semibold mb-3 block">勝率</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={winRate}
                onChange={(e) => setWinRate(parseFloat(e.target.value) || 0)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={winRate}
                onChange={(e) => setWinRate(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs px-2 py-1 rounded bg-blue-900/30 border border-blue-700 text-blue-300">
                {winRate >= 70 ? "レジェンダリー" : winRate >= 60 ? "エピック" : winRate >= 50 ? "レア" : "コモン"}
              </span>
            </div>
          </Card>

          {/* RR Ratio */}
          <Card className="p-4 border-border bg-card/50">
            <Label className="text-base font-semibold mb-3 block">平均RR比</Label>
            <div className="flex items-center gap-4">
              <span className="text-sm">1:</span>
              <Input
                type="number"
                min="0.5"
                max="5"
                step="0.1"
                value={rrRatio}
                onChange={(e) => setRRRatio(parseFloat(e.target.value) || 0.5)}
                className="w-24"
              />
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={rrRatio}
                onChange={(e) => setRRRatio(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs px-2 py-1 rounded bg-purple-900/30 border border-purple-700 text-purple-300">
                {rrRatio >= 2.5 ? "レジェンダリー" : rrRatio >= 2 ? "エピック" : rrRatio >= 1.5 ? "レア" : "コモン"}
              </span>
            </div>
          </Card>

          {/* PnL */}
          <Card className="p-4 border-border bg-card/50">
            <Label className="text-base font-semibold mb-3 block">利益（オプション）</Label>
            <div className="flex items-center gap-4">
              <span className="text-sm">¥</span>
              <Input
                type="number"
                min="0"
                step="1000"
                value={pnl}
                onChange={(e) => setPnl(parseInt(e.target.value) || 0)}
                className="flex-1"
                placeholder="0"
              />
              <span className="text-xs px-2 py-1 rounded bg-emerald-900/30 border border-emerald-700 text-emerald-300">
                {pnl >= 100000 ? "レジェンダリー" : pnl >= 50000 ? "エピック" : pnl >= 20000 ? "レア" : "コモン"}
              </span>
            </div>
          </Card>

          {/* Consecutive Wins */}
          <Card className="p-4 border-border bg-card/50">
            <Label className="text-base font-semibold mb-3 block">連勝数</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min="0"
                step="1"
                value={consecutiveWins}
                onChange={(e) => setConsecutiveWins(parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">連勝</span>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={consecutiveWins}
                onChange={(e) => setConsecutiveWins(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs px-2 py-1 rounded bg-red-900/30 border border-red-700 text-red-300">
                {consecutiveWins >= 10 ? "レジェンダリー" : consecutiveWins >= 7 ? "エピック" : consecutiveWins >= 5 ? "レア" : "コモン"}
              </span>
            </div>
          </Card>

          {/* Perfect Month */}
          <Card className="p-4 border-border bg-card/50">
            <div className="flex items-center gap-3">
              <Checkbox
                id="perfect-month"
                checked={isPerfectMonth}
                onCheckedChange={(checked) => setIsPerfectMonth(checked as boolean)}
              />
              <Label htmlFor="perfect-month" className="text-base font-semibold cursor-pointer">
                完璧な月 👑 (レジェンダリー)
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mt-2">すべての目標を達成した場合に獲得できます</p>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleUnlockBadges} className="flex-1 bg-blue-600 hover:bg-blue-700">
              バッジを獲得
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              キャンセル
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
