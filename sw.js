// ARISE service worker — push plumbing only, no game logic.
// Payload contract sent by the send-push Edge Function:
//   { title, body, tag, data, action }
//   action: "show" (default) -> show a notification, replacing any with the same tag
//   action: "close"          -> close any existing notification(s) with this tag, show nothing new
//
// data.persistent: true marks a notification (T2's active-session one) that should
// stay in the notification center for as long as it's relevant — tapping it must
// NOT dismiss it, only an explicit action:"close" push (session finished) or the
// user manually swiping it away should remove it. The Notification API has no
// "don't dismiss on click" option, so the workaround is to immediately re-post
// the same notification right after handling the tap.

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
  const notif = event.notification;
  const data = notif.data || {};
  const targetUrl = data.url || './index.html';
  const isPersistent = !!data.persistent;

  notif.close();

  event.waitUntil((async () => {
    if (isPersistent) {
      // Re-post immediately so it stays put — a tap should open the app, not dismiss the notice.
      try {
        await self.registration.showNotification(notif.title, {
          body: notif.body,
          tag: notif.tag,
          renotify: false,
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png',
          data: data,
        });
      } catch (e) {}
    }

    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if ('focus' in client) {
        await client.focus();
        // postMessage instead of a hard navigate: avoids a full reload (and the
        // navigate() quirks standalone iOS PWAs have) when the app is already open.
        client.postMessage({ type: 'notif-click', data: data });
        return;
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
  })());
});
