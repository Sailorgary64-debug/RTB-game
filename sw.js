/* RankTheBaller — service worker
   Caches the self-contained game so it loads instantly and works offline.
   Bump CACHE_VERSION whenever you upload a new index.html to force an update. */
const CACHE_VERSION = 'rtb-v17';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

// Install: pre-cache the core shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

// Activate: drop old caches from previous versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for same-origin GETs, network fallback.
// (Three.js is bundled inside index.html, so there are no cross-origin deps to worry about.)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let cross-origin requests pass straight through

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // cache successful navigations/assets as they're fetched
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => {
        // offline fallback: if it's a navigation, serve the cached game
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
