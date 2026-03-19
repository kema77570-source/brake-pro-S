// BRAKE Pro — WebSocket hook for notification scheduler
import { useEffect, useRef, useState, useCallback } from 'react';
import { showBrowserNotification } from '@/lib/notificationService';

const WS_URL = 'ws://127.0.0.1:8002/ws';
const PING_INTERVAL = 30_000;

export interface NotificationPayload {
  type: 'morning' | 'evening';
  title: string;
  body: string;
  summary: string;
  timestamp: string;
  time_str: string;
  items: NotificationItem[];
  alerts?: string[];
  bullish_count?: number;
  bearish_count?: number;
}

export interface NotificationItem {
  code: string;
  name: string;
  price: number | null;
  change_pct: number | null;
  rsi: number | null;
  rsi_label: string;
  score: number;
  score_label: string;
  cross?: string;
  alert?: string | null;
  pnl_info?: { pnl: number; pnl_pct: number; qty: number } | null;
  nearest_sr?: object | null;
  week52?: { high: number | null; low: number | null };
}

interface UseNotificationSocketReturn {
  notifications: NotificationPayload[];
  unreadCount: number;
  connected: boolean;
  clearUnread: () => void;
}

export function useNotificationSocket(): UseNotificationSocketReturn {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        // Send keep-alive ping every 30s
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, PING_INTERVAL);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const payload: NotificationPayload = JSON.parse(event.data);
          setNotifications((prev) => [payload, ...prev].slice(0, 50));
          setUnreadCount((n) => n + 1);
          // Show browser notification
          showBrowserNotification(payload.title, payload.body, { type: payload.type });
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        if (pingRef.current) clearInterval(pingRef.current);
        // Reconnect after 5s
        reconnectRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket not available (server offline)
      reconnectRef.current = setTimeout(connect, 10000);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (pingRef.current) clearInterval(pingRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  return { notifications, unreadCount, connected, clearUnread };
}
