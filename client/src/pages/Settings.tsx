// BRAKE Pro — Settings Page
// All thresholds, pledges, notifications, cooling times are user-configurable
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon, AlertTriangle, Activity, Bell,
  Clock, Shield, Plus, Trash2, RotateCcw, Volume2, VolumeX,
} from "lucide-react";
import { audioManager } from "@/lib/audioManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { getLossStreak, saveLossStreak } from "@/lib/storage";
import { toast } from "sonner";

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/30 bg-card/50 p-5 mb-5">
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SettingRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/20 last:border-0">
      <div className="flex-1 mr-4">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, min, max, step = 1 }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number;
}) {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v >= min && v <= max) onChange(v);
      }}
      min={min}
      max={max}
      step={step}
      className="w-24 bg-background/50 border-border/40 font-mono text-right h-9"
    />
  );
}

export default function Settings() {
  const { settings, updateSettings } = useApp();
  const [newPledge, setNewPledge] = useState("");
  const [newCooling, setNewCooling] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [volume, setVolume] = useState(50);

  const toggleAudio = (enabled: boolean) => {
    setAudioEnabled(enabled);
    audioManager.setEnabled(enabled);
    if (enabled) {
      audioManager.playSuccessShort();
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    audioManager.setVolume(v / 100);
  };

  const handleResetStreak = () => {
    const streak = getLossStreak();
    saveLossStreak({ ...streak, currentStreak: 0, suspendedUntil: undefined, suspendReason: undefined });
    toast.success("連敗ストリークをリセットしました");
  };

  const handleResetAll = () => {
    updateSettings(DEFAULT_SETTINGS);
    toast.success("設定をデフォルトにリセットしました");
  };

  const addPledge = () => {
    if (!newPledge.trim()) return;
    updateSettings({ pledges: [...settings.pledges, newPledge.trim()] });
    setNewPledge("");
    toast.success("誓約を追加しました");
  };

  const removePledge = (i: number) => {
    const next = settings.pledges.filter((_, idx) => idx !== i);
    updateSettings({ pledges: next });
  };

  const addCoolingOption = () => {
    const mins = parseInt(newCooling);
    if (isNaN(mins) || mins <= 0) return;
    const next = [...settings.coolingOptions, mins].sort((a, b) => a - b);
    updateSettings({ coolingOptions: next });
    setNewCooling("");
  };

  const removeCoolingOption = (mins: number) => {
    updateSettings({ coolingOptions: settings.coolingOptions.filter((m) => m !== mins) });
  };

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}分`;
    if (mins < 1440) return `${Math.round(mins / 60)}時間`;
    return `${Math.round(mins / 1440)}日`;
  };

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">設定</h1>
            <p className="text-sm text-muted-foreground mt-1">閾値・通知・誓約のカスタマイズ</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetAll} className="gap-2 text-xs">
            <RotateCcw className="w-3 h-3" />リセット
          </Button>
        </div>

        {/* Loss Streak */}
        <Section title="損失ストリーク停止" icon={AlertTriangle}>
          <SettingRow
            label={`${settings.streakSuspend1Count}連敗停止時間`}
            sub="連敗後に取引を一時停止する時間（分）"
          >
            <NumberInput
              value={settings.streakSuspend1Minutes}
              onChange={(v) => updateSettings({ streakSuspend1Minutes: v })}
              min={5}
              max={1440}
              step={5}
            />
          </SettingRow>
          <SettingRow label="第1停止トリガー（連敗数）" sub="デフォルト: 3連敗">
            <NumberInput
              value={settings.streakSuspend1Count}
              onChange={(v) => updateSettings({ streakSuspend1Count: v })}
              min={1}
              max={20}
            />
          </SettingRow>
          <SettingRow
            label={`${settings.streakSuspend2Count}連敗停止時間`}
            sub="連敗後に取引を長期停止する時間（分）"
          >
            <NumberInput
              value={settings.streakSuspend2Minutes}
              onChange={(v) => updateSettings({ streakSuspend2Minutes: v })}
              min={60}
              max={10080}
              step={60}
            />
          </SettingRow>
          <SettingRow label="第2停止トリガー（連敗数）" sub="デフォルト: 5連敗">
            <NumberInput
              value={settings.streakSuspend2Count}
              onChange={(v) => updateSettings({ streakSuspend2Count: v })}
              min={2}
              max={20}
            />
          </SettingRow>
          <div className="pt-3">
            <Button variant="outline" size="sm" onClick={handleResetStreak} className="text-xs gap-2 text-warning border-warning/30 hover:bg-warning/10">
              <RotateCcw className="w-3 h-3" />連敗ストリークをリセット
            </Button>
          </div>
        </Section>

        {/* Heart Rate */}
        <Section title="心拍数・ストレス警告" icon={Activity}>
          <SettingRow label="ストレス警告を有効化" sub="心拍数が閾値を超えたときに警告を表示">
            <Switch
              checked={settings.stressWarningEnabled}
              onCheckedChange={(v) => updateSettings({ stressWarningEnabled: v })}
            />
          </SettingRow>
          <SettingRow label="警告閾値 (BPM)" sub="この心拍数以上で警告を表示">
            <NumberInput
              value={settings.hrWarningBpm}
              onChange={(v) => updateSettings({ hrWarningBpm: v })}
              min={60}
              max={200}
            />
          </SettingRow>
          <SettingRow label="危険閾値 (BPM)" sub="この心拍数以上でトレードを強く警告">
            <NumberInput
              value={settings.hrCriticalBpm}
              onChange={(v) => updateSettings({ hrCriticalBpm: v })}
              min={80}
              max={220}
            />
          </SettingRow>
        </Section>

        {/* FOMO */}
        <Section title="FOMO閾値" icon={Shield}>
          <SettingRow label="FOMO警告スコア" sub="このスコア以上で警告を表示（0〜100）">
            <NumberInput
              value={settings.fomoWarningThreshold}
              onChange={(v) => updateSettings({ fomoWarningThreshold: v })}
              min={10}
              max={90}
            />
          </SettingRow>
          <SettingRow label="FOMO危険スコア" sub="このスコア以上で強く警告（0〜100）">
            <NumberInput
              value={settings.fomoCriticalThreshold}
              onChange={(v) => updateSettings({ fomoCriticalThreshold: v })}
              min={20}
              max={100}
            />
          </SettingRow>
          <SettingRow label="最低RR比" sub="この比率未満でRR警告を表示">
            <NumberInput
              value={settings.minRiskRewardRatio}
              onChange={(v) => updateSettings({ minRiskRewardRatio: v })}
              min={0.5}
              max={5}
              step={0.1}
            />
          </SettingRow>
        </Section>

        {/* VIX */}
        <Section title="VIX警告" icon={AlertTriangle}>
          <SettingRow label="VIX警告レベル" sub="このVIX値以上で警告を表示">
            <NumberInput
              value={settings.vixWarningLevel}
              onChange={(v) => updateSettings({ vixWarningLevel: v })}
              min={15}
              max={50}
            />
          </SettingRow>
          <SettingRow label="VIX危険レベル" sub="このVIX値以上で強く警告">
            <NumberInput
              value={settings.vixCriticalLevel}
              onChange={(v) => updateSettings({ vixCriticalLevel: v })}
              min={20}
              max={80}
            />
          </SettingRow>
        </Section>

        {/* Audio Settings */}
        <Section title="サウンド設定" icon={Volume2}>
          <SettingRow label="サウンドエフェクト" sub="称号獲得時などのサウンドを再生">
            <Switch
              checked={audioEnabled}
              onCheckedChange={toggleAudio}
            />
          </SettingRow>
          <SettingRow label="音量" sub="サウンドエフェクトの音量を調整">
            <div className="flex items-center gap-4 w-full max-w-[200px]">
              {volume === 0 ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-border/40 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs font-mono text-muted-foreground w-8">{volume}%</span>
            </div>
          </SettingRow>
          <div className="mt-4 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => audioManager.playSuccessFanfare()}
              disabled={!audioEnabled}
              className="text-xs"
            >
              ファンファーレ
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => audioManager.playLevelUp()}
              disabled={!audioEnabled}
              className="text-xs"
            >
              レベルアップ
            </Button>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="通知設定" icon={Bell}>
          <SettingRow label="価格アラーム" sub="エントリー・損切り・利確価格に達したとき">
            <Switch
              checked={settings.priceAlarmEnabled}
              onCheckedChange={(v) => updateSettings({ priceAlarmEnabled: v })}
            />
          </SettingRow>
          <SettingRow label="保有期限通知" sub="保有予定時間が終了したとき結果記録を促す">
            <Switch
              checked={settings.holdDeadlineNotifyEnabled}
              onCheckedChange={(v) => updateSettings({ holdDeadlineNotifyEnabled: v })}
            />
          </SettingRow>
          <SettingRow label="連敗ストリーク通知" sub="連敗閾値に達したとき">
            <Switch
              checked={settings.streakNotifyEnabled}
              onCheckedChange={(v) => updateSettings({ streakNotifyEnabled: v })}
            />
          </SettingRow>
        </Section>

        {/* Cooling Options */}
        <Section title="冷却時間オプション" icon={Clock}>
          <div className="flex flex-wrap gap-2 mb-4">
            {settings.coolingOptions.map((mins) => (
              <div key={mins} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/30 bg-card/30 text-sm">
                <span className="font-mono text-foreground">{formatMinutes(mins)}</span>
                <button onClick={() => removeCoolingOption(mins)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              value={newCooling}
              onChange={(e) => setNewCooling(e.target.value)}
              placeholder="分数を入力（例: 15）"
              className="bg-background/50 border-border/40 font-mono flex-1"
              min={1}
            />
            <Button variant="outline" onClick={addCoolingOption} className="gap-2">
              <Plus className="w-4 h-4" />追加
            </Button>
          </div>
        </Section>

        {/* Pledges */}
        <Section title="トレード誓約" icon={Shield}>
          <div className="space-y-2 mb-4">
            {settings.pledges.map((pledge, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/20 bg-background/30">
                <span className="text-xs text-muted-foreground font-mono w-5 shrink-0 mt-0.5">{i + 1}.</span>
                <span className="text-sm text-foreground flex-1">{pledge}</span>
                <button onClick={() => removePledge(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newPledge}
              onChange={(e) => setNewPledge(e.target.value)}
              placeholder="新しい誓約を入力…"
              className="bg-background/50 border-border/40 flex-1"
              onKeyDown={(e) => e.key === "Enter" && addPledge()}
            />
            <Button variant="outline" onClick={addPledge} className="gap-2">
              <Plus className="w-4 h-4" />追加
            </Button>
          </div>
        </Section>

        <div className="h-8" />
      </div>
    </div>
  );
}
