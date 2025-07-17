const CACHE_NAME = 'movierec-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/login.html',
    '/assets/css/main.css',
    '/assets/js/app.js',
    '/assets/js/api.js',
    '/assets/js/auth.js',
    '/assets/images/placeholder-poster.jpg',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap-grid.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});