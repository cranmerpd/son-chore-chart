const CACHE = 'mission-control-v1.53';
const SHELL = [
  './',
  './index.html',
  './settings.html',
  './account.html',
  './style.css?v=152',
  './script.js?v=152',
  './settings.js?v=152',
  './account.js?v=152',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const isPage = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  const networked = isPage ? new Request(request, { cache: 'reload' }) : request;
  event.respondWith(
    fetch(networked).then((response) => {
      if (response && response.ok && !isPage) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request))
  );
});
