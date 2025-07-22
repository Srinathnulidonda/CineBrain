const CACHE_NAME = 'cinescope-v1';
const urlsToCache = [
    '/',
    '/css/main.css',
    '/css/components.css',
    '/js/main.js',
    '/includes/head.html',
    '/includes/header.html',
    '/includes/footer.html',
    '/assets/icons/favicon.svg',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});