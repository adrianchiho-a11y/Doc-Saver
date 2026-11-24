const CACHE_NAME = 'doc-saver-shell-v2';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icons/doc-saver-icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('doc-saver-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache account, Firestore, or other live API traffic.
  if (/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|accounts\.google\.com/.test(url.hostname)) return;

  // Cache the app shell and its static dependencies so it can reopen offline.
  const isAppAsset = url.origin === self.location.origin ||
    /(^|\.)gstatic\.com$|(^|\.)jsdelivr\.net$|(^|\.)googleapis\.com$|(^|\.)fonts\.gstatic\.com$/.test(url.hostname);

  if (!isAppAsset) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', response.clone());
        }
        return response;
      } catch (error) {
        return (await caches.match('./index.html')) || new Response('Doc Saver is not available offline yet. Open it once while connected to the internet.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  if (request.destination === 'script' || request.destination === 'style' ||
      request.destination === 'font' || request.destination === 'image' ||
      url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        fetch(request).then(response => {
          if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
        }).catch(() => {});
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
        return response;
      } catch (error) {
        return new Response('', { status: 504, statusText: 'Offline asset unavailable' });
      }
    })());
  }
});

/* Background notifications for installed Doc Saver. The Firebase Function sends
   a Web Push notification payload when a chat message is created. */
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) {}
  const notification = payload.notification || payload;
  const title = notification.title || 'Doc Saver';
  const options = {
    body: notification.body || 'You have a new message.',
    icon: './icons/doc-saver-icon.svg',
    badge: './icons/doc-saver-icon.svg',
    tag: (payload.data && payload.data.chatId) ? 'docsaver-chat-' + payload.data.chatId : 'docsaver-chat',
    renotify: true,
    data: { url: (payload.fcmOptions && payload.fcmOptions.link) || './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data && event.notification.data.url || './', self.location.origin).href;
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.focus();
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
