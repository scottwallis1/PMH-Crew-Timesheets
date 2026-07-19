/* PMH Team Manager — keeps phones on the latest build without reinstalling. */
const APP_VERSION = "1.33.0";
const CACHE_NAME = `pmh-team-${APP_VERSION}`;
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  `./styles.css?v=${APP_VERSION}`,
  `./app.js?v=${APP_VERSION}`,
  `./calendar.js?v=${APP_VERSION}`,
  `./cloud-sync.js?v=${APP_VERSION}`,
  `./google-config.js?v=${APP_VERSION}`,
  `./firebase-config.js?v=${APP_VERSION}`,
  `./update.js?v=${APP_VERSION}`
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("pmh-team-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isVersionRequest(url) {
  return url.pathname.endsWith("/version.json") || url.pathname.endsWith("version.json");
}

function isNavigateRequest(request) {
  return request.mode === "navigate" || request.destination === "document";
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Always fetch the live version file — never serve a cached one.
  if (isVersionRequest(url)) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // HTML / app shell: network first so deploys show up, cache as fallback offline.
  if (isNavigateRequest(request) || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request, { cache: "no-store" });
          if (fresh && fresh.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put("./index.html", fresh.clone());
          }
          return fresh;
        } catch {
          return (
            (await caches.match("./index.html")) ||
            (await caches.match(request)) ||
            Response.error()
          );
        }
      })()
    );
    return;
  }

  // Never cache the service worker script itself.
  if (url.pathname.endsWith("/sw.js") || url.pathname.endsWith("sw.js")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // Other same-origin assets: cache falling back to network, then cache the result.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
