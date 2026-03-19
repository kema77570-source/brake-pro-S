// BRAKE Pro — Goal Setting Modal
// Design: Dark Financial × Neo-Brutalist
// Modal for setting and editing monthly goals

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGoal, updateGoal, getGoal } from "@/lib/goalStorage";
import { AlertCircle, CheckCircle } from "lucide-react";

interface GoalSettingModalProps {
  onSuccess: () => void;
  isEdit: boolean;
}

export default function GoalSettingModal({ onSuccess, isEdit }: GoalSettingModalProps) {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);

  const [targetWinRate, setTargetWinRate] = useState(55);
  const [targetRR, setTargetRR] = useState(1.5);
  const [targetPnL, setTargetPnL] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const existingGoal = getGoal(year, month);
      if (existingGoal) {
        setTargetWinRate(existingGoal.targetWinRate);
        setTargetRR(existingGoal.targetRiskRewardRatio);
        setTargetPnL(existingGoal.targetPnL?.toString() || "");
      }
    }
  }, [isEdit, year, month]);

  const handleSave = async () => {
    setError("");
    setSuccess(false);

    // Validation
    if (targetWinRate < 30 || targetWinRate > 100) {
      setError("勝率は30%～100%の範囲で設定してください");
      return;
    }

    if (targetRR < 0.5 || targetRR > 5) {
      setError("RR比は0.5～5の範囲で設定してください");
      return;
    }

    const pnlValue = targetPnL ? parseFloat(targetPnL) : undefined;
    if (targetPnL && isNaN(pnlValue!)) {
      setError("利益目標は数値で入力してください");
      return;
    }

    setLoading(true);

    try {
      if (isEdit) {
        updateGoal(year, month, targetWinRate, targetRR, pnlValue);
      } else {
        createGoal(year, month, targetWinRate, targetRR, pnlValue);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError("目標の保存に失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          {isEdit ? "目標を編集" : "目標を設定"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {year}年{month}月の月次目標を設定します
        </p>
      </div>

      {/* Win Rate */}
      <div className="space-y-4">
        <div>
          <Label className="text-foreground font-medium">
            目標勝率: <span className="font-display font-bold text-primary">{targetWinRate}%</span>
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            現実的な目標を設定してください。初心者は50%、経験者は60%以上が目安です。
          </p>
        </div>
        <Slider
          value={[targetWinRate]}
          onValueChange={(value) => setTargetWinRate(value[0])}
          min={30}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>30%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Risk/Reward Ratio */}
      <div className="space-y-4">
        <div>
          <Label className="text-foreground font-medium">
            目標RR比: <span className="font-display font-bold text-primary">1:{targetRR}</span>
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            リスク1に対する報酬の倍率。1.5以上が推奨されます。
          </p>
        </div>
        <Slider
          value={[targetRR]}
          onValueChange={(value) => setTargetRR(Math.round(value[0] * 10) / 10)}
          min={0.5}
          max={5}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.5</span>
          <span>5.0</span>
        </div>
      </div>

      {/* PnL Target (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="pnl" className="text-foreground font-medium">
          利益目標（オプション）
        </Label>
        <Input
          id="pnl"
          type="number"
          placeholder="例: 10000"
          value={targetPnL}
          onChange={(e) => setTargetPnL(e.target.value)}
          className="bg-card/50 border-border/30"
        />
        <p className="text-xs text-muted-foreground">
          月間の目標利益を設定します。設定しない場合は勝率とRR比のみで追跡します。
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30"
        >
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </motion.div>
      )}

      {/* Success Message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/30"
        >
          <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
          <p className="text-sm text-success">目標が保存されました</p>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleSave}
          disabled={loading || success}
          className="flex-1"
        >
          {loading ? "保存中..." : success ? "完了" : "保存"}
        </Button>
      </div>

      {/* Tips */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
        <p className="text-sm font-medium text-foreground">💡 目標設定のコツ</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• 勝率目標は現在の実績から+5～10%程度が現実的です</li>
          <li>• RR比は最低1.5、できれば2.0以上を目指しましょう</li>
          <li>• 利益目標は月間取引数から逆算して設定します</li>
          <li>• 目標は月初に設定し、月末に検証することが重要です</li>
        </ul>
      </div>
    </div>
  );
}
