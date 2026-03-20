// BRAKE Pro — Alarms Page
// Price alarms + hold deadline notifications + heart rate input
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bell, Plus, Trash2, Activity, Clock, CheckCircle,
  TrendingUp, TrendingDown, Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getAlarms, saveAlarm, deleteAlarm, triggerAlarm, addHeartRateReading, getHeartRateHistory } from "@/lib/storage";
import type { PriceAlarm, HeartRateReading } from "@/lib/types";
import { useApp } from "@/contexts/AppContext";
import { classifyHeartRate } from "@/lib/analysis";
import { nanoid } from "nanoid";
import { toast } from "sonner";

const ALARM_TYPE_LABELS: Record<string, string> = {
  entry: "エントリー",
  stop_loss: "損切り",
  take_profit: "利確",
  custom: "カスタム",
};

const ALARM_TYPE_COLORS: Record<string, string> = {
  entry: "text-primary border-primary/20 bg-primary/10",
  stop_loss: "text-destructive border-destructive/20 bg-destructive/10",
  take_profit: "text-success border-success/20 bg-success/10",
  custom: "text-muted-foreground border-border/20 bg-card/50",
};

export default function Alarms() {
  const { settings, latestHR, refreshHR } = useApp();
  const [alarms, setAlarms] = useState<PriceAlarm[]>(() => getAlarms());
  const [hrHistory, setHrHistory] = useState<HeartRateReading[]>(() => getHeartRateHistory().slice(0, 10));
  const [showAddAlarm, setShowAddAlarm] = useState(false);
  const [showAddHR, setShowAddHR] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Add alarm form
  const [ticker, setTicker] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [alarmType, setAlarmType] = useState<PriceAlarm["type"]>("custom");
  const [alarmLabel, setAlarmLabel] = useState("");

  // HR form
  const [bpm, setBpm] = useState("");
  const [hrSource, setHrSource] = useState<HeartRateReading["source"]>("manual");

  const refresh = useCallback(() => {
    setAlarms(getAlarms());
    setHrHistory(getHeartRateHistory().slice(0, 10));
  }, []);

  // Poll alarms every 30s (in a real app, this would use Web Push or native notifications)
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleAddAlarm = () => {
    if (!ticker || !targetPrice) {
      toast.error("銘柄と目標価格を入力してください");
      return;
    }
    const alarm: PriceAlarm = {
      id: nanoid(),
      ticker: ticker.toUpperCase(),
      targetPrice: parseFloat(targetPrice),
      direction,
      type: alarmType,
      label: alarmLabel || `${ticker.toUpperCase()} ${direction === "above" ? "↑" : "↓"} ${targetPrice}`,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    saveAlarm(alarm);
    refresh();
    setShowAddAlarm(false);
    setTicker("");
    setTargetPrice("");
    setAlarmLabel("");
    toast.success("アラームを設定しました");
  };

  const handleDismiss = (id: string) => {
    triggerAlarm(id);
    refresh();
    toast.info("アラームを確認済みにしました");
  };

  const handleDelete = (id: string) => {
    deleteAlarm(id);
    refresh();
    toast.info("アラームを削除しました");
  };

  const handleAddHR = () => {
    const bpmNum = parseInt(bpm);
    if (!bpm || isNaN(bpmNum) || bpmNum < 30 || bpmNum > 250) {
      toast.error("有効な心拍数を入力してください（30〜250）");
      return;
    }
    const hrInfo = classifyHeartRate(bpmNum, settings.hrWarningBpm, settings.hrCriticalBpm);
    addHeartRateReading({ bpm: bpmNum, stressLevel: hrInfo.level, source: hrSource });
    refreshHR();
    refresh();
    setShowAddHR(false);
    setBpm("");

    if (hrInfo.level === "critical") {
      toast.error(`心拍数 ${bpmNum} BPM — 危険レベルです。トレードを控えてください。`);
    } else if (hrInfo.level === "high") {
      toast.warning(`心拍数 ${bpmNum} BPM — 高ストレス状態です。冷静に判断してください。`);
    } else {
      toast.success(`心拍数 ${bpmNum} BPM を記録しました`);
    }
  };

  const activeAlarms = alarms.filter((a) => a.status === "active");
  const triggeredAlarms = alarms.filter((a) => a.status === "triggered");

  const hrInfo = latestHR
    ? classifyHeartRate(latestHR.bpm, settings.hrWarningBpm, settings.hrCriticalBpm)
    : null;

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">アラーム</h1>
          <p className="text-sm text-muted-foreground mt-1">価格アラーム・心拍数モニタリング</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddHR(true)} className="gap-2">
            <Heart className="w-4 h-4" />心拍
          </Button>
          <Button onClick={() => setShowAddAlarm(true)} className="gap-2 bg-primary hover:bg-primary/90" size="sm">
            <Plus className="w-4 h-4" />アラーム追加
          </Button>
        </div>
      </div>

      {/* Heart Rate Card */}
      <div className={cn(
        "rounded-xl border p-5 mb-6",
        hrInfo?.level === "critical" ? "border-destructive/40 bg-destructive/10" :
        hrInfo?.level === "high" ? "border-warning/40 bg-warning/10" :
        "border-border/30 bg-card/50"
      )}>
        <div className="flex items-center gap-3 mb-4">
          <Activity className={cn(
            "w-5 h-5",
            hrInfo?.level === "critical" ? "text-destructive" :
            hrInfo?.level === "high" ? "text-warning" : "text-muted-foreground"
          )} />
          <h2 className="font-display font-semibold text-sm text-foreground">心拍数・ストレスモニター</h2>
          {!settings.stressWarningEnabled && (
            <span className="text-xs text-muted-foreground ml-auto">（無効）</span>
          )}
        </div>

        {latestHR ? (
          <div className="flex items-center gap-6">
            <div>
              <p className={cn("font-display font-bold text-4xl num", hrInfo?.color ?? "text-foreground")}>
                {latestHR.bpm}
              </p>
              <p className="text-xs text-muted-foreground mt-1">BPM</p>
            </div>
            <div>
              <p className={cn("font-medium text-sm", hrInfo?.color ?? "text-foreground")}>
                {hrInfo?.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(latestHR.timestamp).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 計測
              </p>
              <p className="text-xs text-muted-foreground">
                ソース: {latestHR.source === "manual" ? "手動入力" :
                  latestHR.source === "apple_watch" ? "Apple Watch" :
                  latestHR.source === "garmin" ? "Garmin" : "Fitbit"}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">警告: {settings.hrWarningBpm} BPM</p>
              <p className="text-xs text-muted-foreground">危険: {settings.hrCriticalBpm} BPM</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">心拍数データなし</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Apple Watch等のデータを手動で入力するか、連携アプリから同期してください
            </p>
            <Button variant="outline" size="sm" onClick={() => setShowAddHR(true)} className="mt-3 gap-2">
              <Heart className="w-3 h-3" />心拍数を入力
            </Button>
          </div>
        )}

        {/* HR History */}
        {hrHistory.length > 1 && (
          <div className="mt-4 pt-4 border-t border-border/20">
            <p className="text-xs text-muted-foreground mb-2">最近の記録</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {hrHistory.slice(0, 8).map((r) => {
                const info = classifyHeartRate(r.bpm, settings.hrWarningBpm, settings.hrCriticalBpm);
                return (
                  <div key={r.id} className="shrink-0 text-center">
                    <p className={cn("font-mono text-xs font-bold", info.color)}>{r.bpm}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.timestamp).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active Alarms */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            アクティブアラーム ({activeAlarms.length})
          </h2>
        </div>
        {activeAlarms.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-border/30 bg-card/50">
            <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">アクティブなアラームなし</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlarms.map((alarm, i) => (
              <motion.div
                key={alarm.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border/30 bg-card/50 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-foreground">{alarm.ticker}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", ALARM_TYPE_COLORS[alarm.type])}>
                      {ALARM_TYPE_LABELS[alarm.type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {alarm.direction === "above"
                      ? <TrendingUp className="w-4 h-4 text-success" />
                      : <TrendingDown className="w-4 h-4 text-destructive" />}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{alarm.label}</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono font-bold text-lg text-foreground">
                    {alarm.direction === "above" ? "↑" : "↓"} {alarm.targetPrice.toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDismiss(alarm.id)} className="text-xs gap-1">
                      <CheckCircle className="w-3 h-3" />確認
                    </Button>
                    <button onClick={() => setDeleteConfirmId(alarm.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  設定: {new Date(alarm.createdAt).toLocaleDateString("ja-JP")}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Triggered Alarms */}
      {triggeredAlarms.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              確認済み ({triggeredAlarms.length})
            </h2>
          </div>
          <div className="space-y-2 opacity-60">
            {triggeredAlarms.slice(0, 5).map((alarm) => (
              <div key={alarm.id} className="rounded-xl border border-border/20 bg-card/30 p-3 flex items-center justify-between">
                <div>
                  <span className="font-display font-bold text-sm text-foreground">{alarm.ticker}</span>
                  <span className="text-xs text-muted-foreground ml-2">{alarm.label}</span>
                </div>
                <button onClick={() => setDeleteConfirmId(alarm.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/50 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-display text-lg font-bold text-foreground mb-2">アラームを削除しますか？</h3>
            <p className="text-sm text-muted-foreground mb-6">この操作は元に戻せません。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 rounded-xl border border-border/40 text-sm text-muted-foreground hover:text-foreground transition-colors">
                キャンセル
              </button>
              <button onClick={() => { handleDelete(deleteConfirmId); setDeleteConfirmId(null); }} className="flex-1 py-2.5 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/30 transition-colors">
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Alarm Dialog */}
      <Dialog open={showAddAlarm} onOpenChange={setShowAddAlarm}>
        <DialogContent className="bg-card border-border/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">価格アラームを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">銘柄</label>
              <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="例: NVDA, BTC" className="bg-background/50 font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">目標価格</label>
              <Input value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder="例: 150.00" type="number" className="bg-background/50 font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">方向</label>
              <div className="grid grid-cols-2 gap-2">
                {(["above", "below"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-all",
                      direction === d
                        ? d === "above"
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-destructive/40 bg-destructive/10 text-destructive"
                        : "border-border/30 bg-background/30 text-muted-foreground"
                    )}
                  >
                    {d === "above" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {d === "above" ? "以上になったら" : "以下になったら"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">種類</label>
              <div className="grid grid-cols-2 gap-2">
                {(["entry", "stop_loss", "take_profit", "custom"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAlarmType(t)}
                    className={cn(
                      "py-2 rounded-lg border text-xs font-medium transition-all",
                      alarmType === t
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/30 bg-background/30 text-muted-foreground"
                    )}
                  >
                    {ALARM_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">ラベル（任意）</label>
              <Input value={alarmLabel} onChange={(e) => setAlarmLabel(e.target.value)} placeholder="例: NVDA 損切りライン" className="bg-background/50" />
            </div>
            <Button onClick={handleAddAlarm} className="w-full bg-primary hover:bg-primary/90">
              アラームを設定
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add HR Dialog */}
      <Dialog open={showAddHR} onOpenChange={setShowAddHR}>
        <DialogContent className="bg-card border-border/40 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">心拍数を入力</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">心拍数 (BPM)</label>
              <Input
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                placeholder="例: 85"
                type="number"
                min={30}
                max={250}
                className="bg-background/50 font-mono text-2xl h-14 text-center"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">計測デバイス</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "manual", label: "手動入力" },
                  { value: "apple_watch", label: "Apple Watch" },
                  { value: "garmin", label: "Garmin" },
                  { value: "fitbit", label: "Fitbit" },
                ] as const).map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setHrSource(s.value)}
                    className={cn(
                      "py-2 rounded-lg border text-xs font-medium transition-all",
                      hrSource === s.value
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/30 bg-background/30 text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border/30 bg-background/30 p-3 text-xs text-muted-foreground">
              <p>警告閾値: <span className="font-mono text-warning">{settings.hrWarningBpm} BPM</span></p>
              <p className="mt-1">危険閾値: <span className="font-mono text-destructive">{settings.hrCriticalBpm} BPM</span></p>
            </div>
            <Button onClick={handleAddHR} className="w-full bg-primary hover:bg-primary/90">
              記録する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
