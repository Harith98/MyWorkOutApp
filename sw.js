// Fuel Log offline support: keeps the app on the phone so it opens without internet.
// The app page itself is fetched fresh whenever there's a connection (so updates show right away);
// the saved copy is used only when offline.
const CACHE = "fuel-log-v16";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))
      // config.js is optional (only needed for Supabase sync); a missing one must not block offline support
      .then(() => c.add(new Request("./config.js", { cache: "reload" })).catch(() => {})))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !isFont) return;   // e.g. Supabase: never cached
  const appFile = url.origin === location.origin && (req.mode === "navigate" || /\/(index\.html|config\.js)?$/.test(url.pathname) || url.pathname.endsWith("config.js"));
  if (appFile) {
    // network first, saved copy when offline
    e.respondWith(fetch(new Request(req, { cache: "no-store" })).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./index.html" : req, res.clone()));
      return res;
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match("./index.html")));
    return;
  }
  // icons, fonts: saved copy first, refreshed in the background
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});

// ---------- notifications (sent by the fuel-push function in your Supabase project) ----------
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Fuel Log", {
    body: d.body || "", icon: "./icon-192.png", badge: "./icon-192.png", tag: d.tag || "fuel-log", data: { url: d.url || "./" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope)) { return c.focus().then(w => (w || c).navigate ? (w || c).navigate(url) : null); }
    return self.clients.openWindow(url);
  }));
});
