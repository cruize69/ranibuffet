// Minimal service worker: only handles push notifications for the staff
// manager. It does not do any offline caching / PWA install behavior.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* ignore malformed payload */ }

  const title = data.title || 'Rani Mahal';
  const options = {
    body: data.body || 'You have a new reservation.',
    tag: 'rani-mahal-reservation',
    renotify: true,
    data: { url: data.url || '/staff' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/staff';
  const targetPath = new URL(url, self.location.origin).pathname;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientsList) => {
      for (const client of clientsList) {
        const clientPath = new URL(client.url, self.location.origin).pathname;
        if (clientPath === targetPath) {
          // An existing /staff tab — navigate it to the specific reservation
          // (with its sunday + highlight query params) rather than just
          // focusing it wherever it already was.
          try {
            if ('navigate' in client) await client.navigate(url);
          } catch { /* navigate unsupported/failed — focusing is still useful */ }
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
