// BRAKE Pro — Challenge Page
// Daily streak challenges to enforce trading discipline
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Plus, Trophy, CheckCircle, XCircle, Calendar, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getChallenges, saveChallenge } from "@/lib/storage";
import type { Challenge } from "@/lib/types";
import { nanoid } from "nanoid";
import { toast } from "sonner";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ChallengePage() {
  const [challenges, setChallenges] = useState<Challenge[]>(() => getChallenges());
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDays, setNewDays] = useState("30");
  const [newDesc, setNewDesc] = useState("");
  const [failingId, setFailingId] = useState<string | null>(null);

  const refresh = () => setChallenges(getChallenges());

  const activeChallenges = challenges.filter((c) => c.status === "active");
  const finishedChallenges = challenges.filter((c) => c.status !== "active");

  const handleCreate = () => {
    if (!newTitle.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    const days = parseInt(newDays, 10);
    if (!days || days < 1) {
      toast.error("目標日数は1以上にしてください");
      return;
    }
    const challenge: Challenge = {
      id: nanoid(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      targetDays: days,
      startDate: today(),
      currentStreak: 0,
      bestStreak: 0,
      status: "active",
      lastCheckedDate: "",
    };
    saveChallenge(challenge);
    refresh();
    setShowForm(false);
    setNewTitle("");
    setNewDays("30");
    setNewDesc("");
    toast.success(`チャレンジ「${challenge.title}」を開始しました！`);
  };

  const handleCheck = (challenge: Challenge, success: boolean) => {
    const todayStr = today();
    if (challenge.lastCheckedDate === todayStr) {
      toast.info("今日はすでにチェック済みです");
      return;
    }

    if (success) {
      const newStreak = challenge.currentStreak + 1;
      const newBest = Math.max(newStreak, challenge.bestStreak);
      const completed = newStreak >= challenge.targetDays;
      const updated: Challenge = {
        ...challenge,
        currentStreak: newStreak,
        bestStreak: newBest,
        lastCheckedDate: todayStr,
        status: completed ? "completed" : "active",
      };
      saveChallenge(updated);
      refresh();
      if (completed) {
        toast.success(`🏆 チャレンジ「${challenge.title}」達成！ ${newStreak}日間継続！`);
      } else {
        toast.success(`${newStreak}日目継続中！ 残り${challenge.targetDays - newStreak}日`);
      }
    } else {
      setFailingId(challenge.id);
    }
  };

  const confirmFail = (challenge: Challenge) => {
    const updated: Challenge = {
      ...challenge,
      status: "failed",
      currentStreak: 0,
      lastCheckedDate: today(),
    };
    saveChallenge(updated);
    refresh();
    setFailingId(null);
    toast.error(`チャレンジ「${challenge.title}」が失敗しました。また新しく始めましょう。`);
  };

  const progressPercent = (c: Challenge) =>
    Math.min(100, Math.round((c.currentStreak / c.targetDays) * 100));

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Flame className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">チャレンジ</h1>
            <p className="text-sm text-muted-foreground mt-0.5">毎日ルールを守り抜け</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold"
        >
          <Plus className="w-4 h-4" />新規
        </Button>
      </div>

      {/* New Challenge Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-6"
          >
            <p className="text-sm font-medium text-amber-400 mb-3">新しいチャレンジを作成</p>
            <div className="space-y-2">
              <Input
                placeholder="チャレンジタイトル（例: 毎日損切りを守る）"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-card/50 border-border/40"
              />
              <Input
                placeholder="詳細説明（任意）"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="bg-card/50 border-border/40"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="目標日数"
                  value={newDays}
                  onChange={(e) => setNewDays(e.target.value)}
                  className="bg-card/50 border-border/40 w-32"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">日間</span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button onClick={handleCreate} className="bg-amber-500 hover:bg-amber-400 text-black font-bold">
                開始する
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                キャンセル
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Challenges */}
      {activeChallenges.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <Flame className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">アクティブなチャレンジはありません</p>
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
            className="mt-4 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            最初のチャレンジを作成
          </Button>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {activeChallenges.map((challenge, i) => {
            const todayStr = today();
            const alreadyChecked = challenge.lastCheckedDate === todayStr;
            const pct = progressPercent(challenge);

            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-amber-500/20 bg-card/50 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-bold text-foreground">{challenge.title}</h3>
                    {challenge.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{challenge.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span className="font-mono font-bold text-amber-400 text-lg">
                      {challenge.currentStreak}
                    </span>
                    <span className="text-xs text-muted-foreground">/ {challenge.targetDays}日</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>進捗</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>開始: {challenge.startDate}</span>
                  {challenge.bestStreak > 0 && (
                    <>
                      <span>·</span>
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>ベスト: {challenge.bestStreak}日</span>
                    </>
                  )}
                </div>

                {/* Fail confirmation inline */}
                <AnimatePresence>
                  {failingId === challenge.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
                    >
                      <p className="text-xs text-destructive font-medium mb-2">
                        本当にルールを破りましたか？チャレンジが失敗になります。
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmFail(challenge)}
                          className="flex-1 text-xs py-1.5 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive font-medium hover:bg-destructive/30 transition-colors"
                        >
                          失敗を認める
                        </button>
                        <button
                          onClick={() => setFailingId(null)}
                          className="flex-1 text-xs py-1.5 rounded-lg bg-muted/30 border border-border/30 text-muted-foreground font-medium hover:bg-muted/50 transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* YES / NO buttons */}
                {!alreadyChecked && failingId !== challenge.id && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">今日ルールを守れましたか？</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCheck(challenge, true)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-success/30 bg-success/10 text-success text-sm font-bold hover:bg-success/20 transition-all"
                      >
                        <CheckCircle className="w-4 h-4" />YES
                      </button>
                      <button
                        onClick={() => handleCheck(challenge, false)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-all"
                      >
                        <XCircle className="w-4 h-4" />NO
                      </button>
                    </div>
                  </div>
                )}

                {alreadyChecked && (
                  <div className="flex items-center gap-1.5 text-xs text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2">
                    <CheckCircle className="w-3.5 h-3.5" />
                    今日はチェック済みです
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Finished Challenges */}
      {finishedChallenges.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">過去のチャレンジ</p>
          <div className="space-y-2">
            {finishedChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className={cn(
                  "rounded-xl border bg-card/30 p-3 flex items-center gap-3",
                  challenge.status === "completed"
                    ? "border-success/20"
                    : "border-destructive/20"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  challenge.status === "completed" ? "bg-success/10" : "bg-destructive/10"
                )}>
                  {challenge.status === "completed"
                    ? <Trophy className="w-4 h-4 text-success" />
                    : <XCircle className="w-4 h-4 text-destructive" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{challenge.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {challenge.status === "completed" ? "達成" : "失敗"} · ベスト{challenge.bestStreak}日 / 目標{challenge.targetDays}日
                  </p>
                </div>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full border font-medium shrink-0",
                  challenge.status === "completed"
                    ? "text-success bg-success/10 border-success/20"
                    : "text-destructive bg-destructive/10 border-destructive/20"
                )}>
                  {challenge.status === "completed" ? "達成" : "失敗"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
