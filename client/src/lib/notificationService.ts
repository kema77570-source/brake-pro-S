// BRAKE Pro — Notification Service
// Handles SW registration and browser notification display

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (e) {
    console.warn('[NotificationService] SW registration failed:', e);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

export function getPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function showBrowserNotification(title: string, body: string, data?: object) {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return;

  // Try via Service Worker first (works in background)
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: { title, body, data },
    });
    return;
  }

  // Fallback: direct Notification API
  new Notification(title, { body, icon: '/favicon.ico' });
}
