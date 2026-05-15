const CACHE = 'noctual-v1';
const STATIC = [
  '/',
  '/index.html',
  '/planner.html',
  '/finance.html',
  '/habits.html',
  '/roast.html',
  '/hype.html',
  '/that-thing.html',
  '/config.js',
  '/manifest.json',
  '/css/global.css',
  '/css/home.css',
  '/css/planner.css',
  '/css/finance.css',
  '/css/pages.css',
  '/css/mobile.css',
  '/js/store.js',
  '/js/assistant.js',
  '/js/obsidian.js',
  '/js/mobile-nav.js',
  '/js/home.js',
  '/js/planner.js',
  '/js/finance.js',
  '/js/habits.js',
  '/js/transitions.js',
  '/js/ai-pages.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-1024.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Don't cache API calls
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
