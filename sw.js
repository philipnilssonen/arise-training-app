// ARISE service worker — push plumbing only, no game logic.
// Payload contract sent by the send-push Edge Function:
//   { title, body, tag, data, action }
//   action: "show" (default) -> show a notification, replacing any with the same tag
//   action: "close"          -> close any existing notification(s) with this tag, show nothing new

const CACHE_NAME = 'arise-shell-v1';
const SHELL_ASSETS = ['./index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'ARISE', body: event.data.text() };
  }

  const tag = payload.tag || undefined;

  if (payload.action === 'close') {
    event.waitUntil(
      self.registration.getNotifications({ tag }).then((notifications) => {
        notifications.forEach((n) => n.close());
      })
    );
    return;
  }

  const title = payload.title || 'ARISE';
  const options = {
    body: payload.body || '',
    tag: tag,
    renotify: !!tag,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './index.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl).catch(() => {});
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
