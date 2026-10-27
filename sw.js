// Meow Home: keeps the page and its icons for opening quickly (and as an installed app). The game files themselves
// are cached by Unity's own loader, so they are simply fetched here.
const PAGE_CACHE = "meowhome-page-v2";
const PAGE_FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGE_CACHE).then((cache) => cache.addAll(PAGE_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== PAGE_CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// The page: newest from the network, the kept copy when offline. Everything else goes straight through.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isPage = event.request.mode === "navigate" || PAGE_FILES.some((f) => url.pathname.endsWith(f.replace("./", "/")));
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !isPage) return;
  event.respondWith(fetch(event.request).then((res) => {
    const copy = res.clone();
    caches.open(PAGE_CACHE).then((cache) => cache.put(event.request, copy));
    return res;
  }).catch(() => caches.match(event.request).then((hit) => hit || caches.match("./index.html"))));
});
