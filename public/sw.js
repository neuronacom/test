const CACHE_NAME = 'neurona-v6';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/neurona-chat.js'
];
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// ====== PUSH API (для уведомлений PWA) ======
self.addEventListener('push', function(event) {
  let data = {};
  try { data = event.data.json(); } catch {}
  const title = data.title || "NEURONA AI Signal";
  const options = {
    body: data.body || "Новое событие на рынке крипты!",
    icon: "https://i.ibb.co/XfKRzvcy/27.png",
    badge: "https://i.ibb.co/XfKRzvcy/27.png",
    data: data.url || "/"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
