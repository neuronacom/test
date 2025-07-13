const CACHE_NAME = "neurona-v1";
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([
      "/",
      "/index.html",
      "/manifest.json",
      "https://i.ibb.co/XfKRzvcy/27.png"
    ]))
  );
});
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
