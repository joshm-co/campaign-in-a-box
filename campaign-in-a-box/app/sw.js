/* Campaign-in-a-Box — offline copy of the app.
 * Network first, so people always get the newest version when online; the saved copy is used
 * only when there's no connection. Stores the app's own files only — never the candidate's answers
 * (those stay in the browser's local storage). MIT License. */
const CACHE = "cib-app-v1";
const SHELL = ["./", "index.html", "app.css", "manifest.webmanifest", "icon.svg", "icon-180.png", "icon-512.png",
  "js/vendor/qrcode.js", "js/content.js", "js/fonts-data.js", "js/core.js", "js/render.js", "js/outputs.js", "js/keep.js",
  "js/places.js", "js/oe-counts.js", "js/openelections.js", "js/utahresults.js", "js/xlsx.js", "js/ui.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return; // only the app's own files
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("index.html") : undefined)))
  );
});
