const CACHE = "flowcrm-v1";
const PRECACHE = ["/", "/index.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// Network-first for API, cache-first for static assets
self.addEventListener("fetch", e => {
  if (e.request.url.includes("/api/")) return; // never cache API
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
