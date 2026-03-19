// BRAKE Pro — Notification & Alarm Monitoring Hook
// Handles: price alarm polling, hold deadline notifications, streak alerts
// Uses browser Notification API + sonner toasts as fallback

import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { getAlarms, getTrades, triggerAlarm } from "@/lib/storage";
import type { AppSettings } from "@/lib/types";

// Request notification permission on first use
export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendNotification(title: string, body: string, tag?: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, tag, icon: "/favicon.ico" });
  } else {
    // Fallback to sonner toast
    toast.warning(title, { description: body });
  }
}

export function useNotifications(settings: AppSettings) {
  const notifiedAlarms = useRef<Set<string>>(new Set());
  const notifiedDeadlines = useRef<Set<string>>(new Set());

  const checkAlarms = useCallback(() => {
    if (!settings.priceAlarmEnabled) return;
    const alarms = getAlarms().filter((a) => a.status === "active");
    alarms.forEach((alarm) => {
      if (notifiedAlarms.current.has(alarm.id)) return;
      // Since we can't get real-time prices without a backend, we check if
      // the alarm was manually triggered or if it's past its check time
      // In production, this would compare against live price feeds
      // For now, we show a reminder to check prices manually
      const ageMinutes = (Date.now() - new Date(alarm.createdAt).getTime()) / 60000;
      if (ageMinutes > 60 && !alarm.notified) {
        // Remind user to check price after 1 hour
        notifiedAlarms.current.add(alarm.id);
        sendNotification(
          `📊 価格確認リマインダー: ${alarm.ticker}`,
          `${alarm.label} — 目標価格 ${alarm.targetPrice.toLocaleString()} を確認してください`,
          `alarm-${alarm.id}`
        );
      }
    });
  }, [settings.priceAlarmEnabled]);

  const checkHoldDeadlines = useCallback(() => {
    if (!settings.holdDeadlineNotifyEnabled) return;
    const trades = getTrades().filter((t) => t.status === "active" && t.entryTime && t.plannedHoldHours > 0);

    trades.forEach((trade) => {
      if (notifiedDeadlines.current.has(trade.id)) return;
      if (!trade.entryTime) return;

      const entryMs = new Date(trade.entryTime).getTime();
      const deadlineMs = entryMs + trade.plannedHoldHours * 3600 * 1000;
      const now = Date.now();
      const remainingMs = deadlineMs - now;

      // Notify 30 minutes before deadline
      if (remainingMs <= 30 * 60 * 1000 && remainingMs > 0) {
        notifiedDeadlines.current.add(trade.id);
        sendNotification(
          `⏰ 保有期限まで30分: ${trade.ticker}`,
          `${trade.holdPeriodLabel}の保有期限が近づいています。結果を記録する準備をしてください。`,
          `deadline-${trade.id}`
        );
        toast.warning(`${trade.ticker} 保有期限まで30分`, {
          description: "トレード記録ページで結果を記録してください",
          action: { label: "記録する", onClick: () => window.location.hash = "/trades" },
        });
      }

      // Notify at deadline
      if (remainingMs <= 0 && remainingMs > -30 * 60 * 1000) {
        const key = `${trade.id}-expired`;
        if (!notifiedDeadlines.current.has(key)) {
          notifiedDeadlines.current.add(key);
          sendNotification(
            `🔔 保有期限到達: ${trade.ticker}`,
            `${trade.holdPeriodLabel}の保有期限が来ました。結果を記録してください。`,
            `expired-${trade.id}`
          );
          toast.info(`${trade.ticker} 保有期限到達`, {
            description: "結果を記録して振り返りを行いましょう",
            duration: 10000,
          });
        }
      }
    });
  }, [settings.holdDeadlineNotifyEnabled]);

  useEffect(() => {
    requestNotificationPermission();
    checkAlarms();
    checkHoldDeadlines();

    const interval = setInterval(() => {
      checkAlarms();
      checkHoldDeadlines();
    }, 60_000); // Check every minute

    return () => clearInterval(interval);
  }, [checkAlarms, checkHoldDeadlines]);
}

// Hook for price alarm manual trigger
export function usePriceAlarmTrigger() {
  const handleTrigger = useCallback((alarmId: string, ticker: string, targetPrice: number, type: string) => {
    triggerAlarm(alarmId);
    const typeLabel: Record<string, string> = {
      entry: "エントリー",
      stop_loss: "損切り",
      take_profit: "利確",
      custom: "カスタム",
    };
    sendNotification(
      `🔔 ${typeLabel[type] ?? ""}アラーム: ${ticker}`,
      `目標価格 ${targetPrice.toLocaleString()} に到達しました`,
      `triggered-${alarmId}`
    );
    toast.success(`${ticker} ${typeLabel[type] ?? ""}アラーム発動`, {
      description: `目標価格 ${targetPrice.toLocaleString()} に到達`,
    });
  }, []);

  return { handleTrigger };
}
