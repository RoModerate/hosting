const CACHE = 'lumora-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Always fetch API calls and auth flows from the network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first for static assets; network fallback
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request);
      if (cached) return cached;
      try {
        const resp = await fetch(e.request);
        if (resp.ok && e.request.method === 'GET') {
          cache.put(e.request, resp.clone());
        }
        return resp;
      } catch {
        return cached || new Response('Offline', { status: 503 });
      }
    })
  );
});
