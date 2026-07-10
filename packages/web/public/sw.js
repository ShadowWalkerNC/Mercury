/**
 * Mercury Service Worker — handles Web Push notifications.
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: 'Mercury', body: event.data.text() }; }

  const { title = 'Mercury', body = '', icon = '/icon-192.png', url = '/' } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icon-72.png',
      data:  { url },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find(c => c.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
