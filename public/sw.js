/* CEMP service worker (v0.9.0).
 * - /_next/static, /icons: cache-first (immutable, hashed files)
 * - page navigations: network-first; successful pages are cached for offline; fallback /offline.html
 * - never cached: /api, /admin, /auth, /login, non-GET, other origins, Next.js RSC fetches
 * - sign-out wipes all CEMP caches (pages may contain the user's notes)
 */
const VERSION = "cemp-v0.9.0";
const STATIC = `${VERSION}-static`, PAGES = `${VERSION}-pages`;
const NO_CACHE = [/^\/api\//, /^\/admin/, /^\/auth\//, /^\/login/, /\/edit$/, /^\/entry\/new/];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(["/offline.html", "/icons/icon-192.png"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const clearAll = () => caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));

async function cachePage(url, res) {
  // Only real pages for a signed-in user: no redirects (e.g. to /login), no errors.
  if (!res.ok || res.redirected || res.type !== "basic") return;
  const c = await caches.open(PAGES);
  await c.put(url, res);
}

async function precache(urls) {
  const c = await caches.open(PAGES), s = await caches.open(STATIC);
  let done = 0;
  for (const u of urls) {
    try {
      const res = await fetch(u, { credentials: "same-origin" });
      if (!res.ok || res.redirected) continue;
      const html = await res.clone().text();
      await c.put(u, res);
      // also fetch the JS/CSS chunks the page needs, so it can hydrate offline (calculators run client-side)
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) || [])];
      await Promise.all(assets.map(async (a) => { if (!(await s.match(a))) { const r = await fetch(a); if (r.ok) await s.put(a, r); } }));
      done++;
    } catch { /* offline or blocked: skip */ }
  }
  return done;
}

self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type === "precache" && Array.isArray(d.urls)) {
    e.waitUntil(precache(d.urls.filter((u) => typeof u === "string" && u.startsWith("/"))).then((n) => e.source && e.source.postMessage({ type: "precached", count: n, total: d.urls.length })));
  }
  if (d.type === "clear") e.waitUntil(clearAll());
});

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.method === "POST" && url.pathname === "/auth/signout") { e.waitUntil(clearAll()); return; }
  if (req.method !== "GET" || NO_CACHE.some((r) => r.test(url.pathname))) return;
  if (req.headers.get("RSC") || url.searchParams.has("_rsc")) return; // client-side navigation payloads

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => {
      e.waitUntil(cachePage(url.pathname + url.search, res.clone()));
      return res;
    }).catch(async () => (await caches.match(url.pathname + url.search, { cacheName: PAGES }))
      || (await caches.match(url.pathname, { cacheName: PAGES }))
      || caches.match("/offline.html")));
  }
});
