// BRAKE Pro — Notification Settings Page (port 8002)
import { useState, useEffect, useCallback } from 'react';
import {
  Bell, Plus, Trash2, Play, Clock, Wifi, WifiOff,
  RefreshCw, CheckCircle, AlertCircle, Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { requestNotificationPermission, getPermission } from '@/lib/notificationService';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';

const API = 'http://127.0.0.1:8002';

interface WatchItem { code: string; name: string; qty: number; cost_price: number }
interface ScheduleSettings {
  morning_hour: number; morning_minute: number;
  evening_hour: number; evening_minute: number;
  enabled: boolean;
}

const DEFAULT_SETTINGS: ScheduleSettings = {
  morning_hour: 8, morning_minute: 0,
  evening_hour: 18, evening_minute: 0,
  enabled: true,
};

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function NotificationSettings() {
  const { notifications, unreadCount, connected } = useNotificationSocket();

  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [settings, setSettings] = useState<ScheduleSettings>(DEFAULT_SETTINGS);
  const [nextMorning, setNextMorning] = useState<string | null>(null);
  const [nextEvening, setNextEvening] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(getPermission());
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);

  // New watchlist item form
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newCost, setNewCost] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [wRes, sRes] = await Promise.all([
        fetch(`${API}/watchlist`),
        fetch(`${API}/settings`),
      ]);
      if (wRes.ok) {
        const d = await wRes.json();
        setWatchlist(d.watchlist || []);
      }
      if (sRes.ok) {
        const d = await sRes.json();
        setSettings(d.settings || DEFAULT_SETTINGS);
        setNextMorning(d.next_morning);
        setNextEvening(d.next_evening);
      }
    } catch {
      // scheduler offline
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function saveWatchlist(list: WatchItem[]) {
    try {
      await fetch(`${API}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list),
      });
    } catch { /* offline */ }
  }

  function addItem() {
    if (!newCode.trim()) return;
    const item: WatchItem = {
      code: newCode.trim().toUpperCase(),
      name: newName.trim() || newCode.trim(),
      qty: parseInt(newQty) || 0,
      cost_price: parseFloat(newCost) || 0,
    };
    const next = [...watchlist, item];
    setWatchlist(next);
    saveWatchlist(next);
    setNewCode(''); setNewName(''); setNewQty(''); setNewCost('');
  }

  function removeItem(idx: number) {
    const next = watchlist.filter((_, i) => i !== idx);
    setWatchlist(next);
    saveWatchlist(next);
  }

  async function saveSettings() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (r.ok) {
        const d = await r.json();
        setNextMorning(d.settings?.next_morning ?? null);
        setNextEvening(d.settings?.next_evening ?? null);
        setSaveMsg('保存しました');
        setTimeout(() => setSaveMsg(''), 2000);
        fetchData();
      }
    } catch { /* offline */ }
    setLoading(false);
  }

  async function triggerNow(type: 'morning' | 'evening') {
    setTriggerLoading(type);
    try {
      await fetch(`${API}/trigger/${type}`, { method: 'POST' });
    } catch { /* offline */ }
    setTimeout(() => setTriggerLoading(null), 1500);
  }

  async function handlePermission() {
    const perm = await requestNotificationPermission();
    setPermission(perm);
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">自動通知設定</h1>
          <p className="text-xs text-muted-foreground">朝・夜に保有銘柄の分析を通知</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {connected
            ? <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-emerald-400">スケジューラー接続中</span></>
            : <><WifiOff className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">スケジューラー未接続</span></>
          }
        </div>
      </div>

      {/* Browser permission */}
      {permission !== 'granted' && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">ブラウザ通知が許可されていません</p>
            <p className="text-xs text-muted-foreground mt-0.5">通知を受け取るには許可が必要です</p>
          </div>
          <button
            onClick={handlePermission}
            className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            許可する
          </button>
        </div>
      )}
      {permission === 'granted' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-emerald-300">ブラウザ通知が許可されています</span>
        </div>
      )}

      {/* Schedule Settings */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">通知スケジュール</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-muted-foreground">有効</span>
            <div
              onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
              className={cn(
                'w-9 h-5 rounded-full transition-colors cursor-pointer',
                settings.enabled ? 'bg-primary' : 'bg-muted'
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-full bg-white shadow transition-transform mt-0.5',
                settings.enabled ? 'translate-x-4.5 ml-0.5' : 'ml-0.5'
              )} />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Morning */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              🌅 朝の通知
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} max={23}
                value={settings.morning_hour}
                onChange={e => setSettings(s => ({ ...s, morning_hour: parseInt(e.target.value) || 0 }))}
                className="w-14 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center font-mono"
              />
              <span className="text-muted-foreground">:</span>
              <input
                type="number" min={0} max={59}
                value={settings.morning_minute}
                onChange={e => setSettings(s => ({ ...s, morning_minute: parseInt(e.target.value) || 0 }))}
                className="w-14 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center font-mono"
              />
            </div>
            {nextMorning && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                次回: {nextMorning.slice(0, 16)}
              </p>
            )}
          </div>

          {/* Evening */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              🌙 夜の通知
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} max={23}
                value={settings.evening_hour}
                onChange={e => setSettings(s => ({ ...s, evening_hour: parseInt(e.target.value) || 0 }))}
                className="w-14 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center font-mono"
              />
              <span className="text-muted-foreground">:</span>
              <input
                type="number" min={0} max={59}
                value={settings.evening_minute}
                onChange={e => setSettings(s => ({ ...s, evening_minute: parseInt(e.target.value) || 0 }))}
                className="w-14 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center font-mono"
              />
            </div>
            {nextEvening && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                次回: {nextEvening.slice(0, 16)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={saveSettings}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
            保存する
          </button>
          {saveMsg && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{saveMsg}</span>}
        </div>
      </div>

      {/* Test buttons */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">手動テスト</p>
        <p className="text-xs text-muted-foreground">今すぐ分析を実行して通知を確認できます</p>
        <div className="flex gap-2">
          <button
            onClick={() => triggerNow('morning')}
            disabled={!connected || triggerLoading === 'morning'}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/15 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/25 disabled:opacity-40 transition-colors"
          >
            {triggerLoading === 'morning'
              ? <RefreshCw className="w-3 h-3 animate-spin" />
              : <Play className="w-3 h-3" />
            }
            🌅 朝レポートを今すぐ実行
          </button>
          <button
            onClick={() => triggerNow('evening')}
            disabled={!connected || triggerLoading === 'evening'}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/15 border border-violet-500/20 text-violet-400 rounded-lg text-xs font-medium hover:bg-violet-500/25 disabled:opacity-40 transition-colors"
          >
            {triggerLoading === 'evening'
              ? <RefreshCw className="w-3 h-3 animate-spin" />
              : <Play className="w-3 h-3" />
            }
            🌙 夜レポートを今すぐ実行
          </button>
        </div>
        {!connected && (
          <p className="text-[10px] text-muted-foreground">
            ※ スケジューラーを起動してください: <code className="bg-muted px-1 rounded">python server/notification_scheduler.py</code>
          </p>
        )}
      </div>

      {/* Watchlist */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">監視銘柄リスト</p>
          <span className="text-xs text-muted-foreground">{watchlist.length}銘柄</span>
        </div>

        {/* Add form */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input
            placeholder="コード (US.AAPL)"
            value={newCode}
            onChange={e => setNewCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs placeholder:text-muted-foreground"
          />
          <input
            placeholder="銘柄名"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs placeholder:text-muted-foreground"
          />
          <input
            placeholder="保有数"
            type="number"
            value={newQty}
            onChange={e => setNewQty(e.target.value)}
            className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs placeholder:text-muted-foreground"
          />
          <input
            placeholder="取得単価"
            type="number"
            value={newCost}
            onChange={e => setNewCost(e.target.value)}
            className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/20 text-primary rounded-lg text-xs font-medium hover:bg-primary/25 transition-colors"
        >
          <Plus className="w-3 h-3" /> 銘柄を追加
        </button>

        {/* List */}
        {watchlist.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">監視銘柄が登録されていません</p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground px-2 pb-1">
              <span>コード</span><span>名前</span><span className="text-right">保有数</span><span className="text-right">取得単価</span>
            </div>
            {watchlist.map((item, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-center bg-background/50 rounded-lg px-2 py-2">
                <span className="text-xs font-mono text-primary truncate">{item.code}</span>
                <span className="text-xs text-foreground truncate">{item.name}</span>
                <span className="text-xs font-mono text-right text-muted-foreground">{item.qty}</span>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{item.cost_price > 0 ? `$${item.cost_price}` : '—'}</span>
                  <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent notifications preview */}
      {notifications.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">最近の通知 ({unreadCount > 0 ? `${unreadCount}件未読` : ''})</p>
          {notifications.slice(0, 3).map((n, i) => (
            <div key={i} className="bg-background/50 rounded-lg p-3">
              <div className="text-xs font-medium text-foreground">{n.title}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{n.time_str} — {n.summary}</div>
              <div className="text-[10px] text-muted-foreground mt-1 whitespace-pre-line">{n.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
