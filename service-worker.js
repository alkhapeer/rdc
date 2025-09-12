// App Shell PWA Service Worker (cardsys v1.2.0)
const CACHE_NAME = 'cardsys-v1.2.2';
const CORE_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './styles.css',
  './app.js',
  './admin.js',
  './shared-utils.js',
  './i18n-ar.json',
  './i18n-en.json',
  './terms.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(CORE_ASSETS); } catch (e) { /* non-blocking */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(req)) || (await cache.match('./index.html'));
      }
    })());
    return;
  }

  if (url.host.includes('cdn.jsdelivr.net') || url.host.includes('unpkg.com')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return new Response('Offline and CDN resource not cached', { status: 503 });
      }
    })());
    return;
  }

  if (/(\.mp4|\.webm)$/i.test(url.pathname)) { return; }

  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (req.method === 'GET' && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return new Response('Offline', { status: 503 });
      }
    })());
    return;
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Cards', body: 'Notification' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Cards', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      data: data.data || {}
    })
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = './';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const c of list) { if (c.url.endsWith('/') || c.url.endsWith('/index.html')) return c.focus(); }
      return clients.openWindow(url);
    })
  );
});
