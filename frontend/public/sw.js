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
  e.respondWith(handleFetch(e.request));
});

// caches.match() resolves to `undefined` when nothing matches — passing
// that straight to e.respondWith() crashes with "Failed to convert value
// to 'Response'" (a real bug that was actually happening: a page
// navigation like /dashboard failed over the network, e.g. during a
// backend cold start, then found nothing cached for that exact URL since
// only "/" and "/index.html" are precached). This always resolves to a
// real Response, so that crash can't happen again.
async function handleFetch(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Full-page navigations (e.g. reloading /dashboard while offline) fall
    // back to the cached app shell so the SPA can still boot and render its
    // own "you're offline" / retry state, instead of a bare browser error.
    if (request.mode === "navigate") {
      const shell = await caches.match("/index.html");
      if (shell) return shell;
    }

    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

// ── Web Push ────────────────────────────────────────────────
// Shows an OS-level notification even if no FlowCRM tab is open.
self.addEventListener("push", (event) => {
  let data = { title: "FlowCRM", body: "You have a new notification.", link: "/dashboard" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch { /* use defaults */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: { link: data.link || "/dashboard" },
      tag: data.link, // replaces any existing notification for the same record instead of stacking
    })
  );
});

// Clicking the notification focuses an existing FlowCRM tab (navigating it
// to the linked record) or opens a new one if none is open.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.postMessage({ type: "PUSH_NAVIGATE", link });
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    })
  );
});
