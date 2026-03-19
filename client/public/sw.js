// BRAKE Pro — Service Worker for background notifications
const CACHE_NAME = 'brake-pro-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Receive message from main thread → show browser notification
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  if (type !== 'SHOW_NOTIFICATION') return;

  const { title, body, data } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'brake-pro-' + (data?.type || 'notification'),
      renotify: true,
      data: data,
    })
  );
});

// Notification click → focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});
