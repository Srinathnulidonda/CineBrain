const CACHE_NAME = 'movie-app-v1';
const urlsToCache = ['/', '/styles.css', '/api.js', '/auth.js', '/components.js', '/app.js', '/admin.js'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', event => {
    event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});