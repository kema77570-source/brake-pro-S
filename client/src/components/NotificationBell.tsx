// BRAKE Pro — Notification Bell with dropdown
import { useState, useRef, useEffect } from 'react';
import { Bell, Wifi, WifiOff, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationSocket, type NotificationPayload } from '@/hooks/useNotificationSocket';

function ItemRow({ item }: { item: { code: string; name: string; price: number | null; change_pct: number | null; rsi_label: string; score_label: string; alert?: string | null; pnl_info?: { pnl: number; pnl_pct: number } | null } }) {
  const up = item.change_pct != null && item.change_pct >= 0;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-foreground truncate">{item.name}</span>
          {item.alert && (
            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded shrink-0">⚠️</span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground">{item.rsi_label}</div>
      </div>
      <div className="text-right shrink-0 ml-2">
        {item.price != null && (
          <div className="text-xs font-mono font-medium text-foreground">${item.price.toFixed(2)}</div>
        )}
        {item.change_pct != null && (
          <div className={cn('text-[10px] font-mono flex items-center gap-0.5 justify-end', up ? 'text-emerald-400' : 'text-red-400')}>
            {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {up ? '+' : ''}{item.change_pct.toFixed(1)}%
          </div>
        )}
        {item.pnl_info && (
          <div className={cn('text-[10px] font-mono', item.pnl_info.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {item.pnl_info.pnl >= 0 ? '+' : ''}{item.pnl_info.pnl_pct.toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationCard({ n, onDismiss }: { n: NotificationPayload; onDismiss?: () => void }) {
  const isMorning = n.type === 'morning';
  return (
    <div className={cn(
      'rounded-lg border p-3 mb-2',
      isMorning
        ? 'bg-blue-500/5 border-blue-500/20'
        : 'bg-violet-500/5 border-violet-500/20'
    )}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs font-semibold text-foreground">{n.title}</div>
          <div className="text-[10px] text-muted-foreground">{n.time_str} — {n.summary}</div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground ml-1">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {n.items.filter(it => it.price != null).slice(0, 4).map(item => (
        <ItemRow key={item.code} item={item} />
      ))}
      {n.alerts && n.alerts.length > 0 && (
        <div className="mt-1.5 text-[10px] text-amber-400 bg-amber-500/10 rounded px-2 py-1">
          ⚠️ {n.alerts[0]}
        </div>
      )}
    </div>
  );
}

export default function NotificationBell() {
  const { notifications, unreadCount, connected, clearUnread } = useNotificationSocket();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    setOpen(o => !o);
    if (!open) clearUnread();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 transition-colors"
        title="通知"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span className={cn(
          'absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full',
          connected ? 'bg-emerald-400' : 'bg-muted-foreground/40'
        )} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
            <span className="text-xs font-semibold text-foreground">通知</span>
            <div className="flex items-center gap-1.5">
              {connected
                ? <><Wifi className="w-3 h-3 text-emerald-400" /><span className="text-[10px] text-emerald-400">接続中</span></>
                : <><WifiOff className="w-3 h-3 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">未接続</span></>
              }
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto p-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">通知はありません</p>
                <p className="text-[10px] mt-1 opacity-60">
                  {connected ? '朝8:00・夜18:00に自動分析' : 'スケジューラー未起動'}
                </p>
              </div>
            ) : (
              notifications.map((n, i) => (
                <NotificationCard key={`${n.timestamp}-${i}`} n={n} />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border/50 px-3 py-2">
              <a href="/alarms" className="text-[10px] text-primary hover:underline">
                通知設定を変更する →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
