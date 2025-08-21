// sw.js - Service Worker for offline functionality and caching
const CACHE_NAME = 'cinescope-v1';
const API_CACHE = 'cinescope-api-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/js/config.js',
    '/js/api.js',
    '/js/auth.js',
    '/js/app.js',
    '/css/main.css',
    '/css/components.css',
    '/css/layouts.css',
    '/css/animations.css',
    '/css/responsive.css',
    '/css/theme.css'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Handle static assets
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(request).then(response => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(request, responseToCache);
                        });

                    return response;
                });
            })
            .catch(() => {
                // Return offline page if available
                if (request.destination === 'document') {
                    return caches.match('/offline.html');
                }
            })
    );
});

// Handle API requests with intelligent caching
async function handleApiRequest(request) {
    const cache = await caches.open(API_CACHE);

    // Try to get from cache first
    const cachedResponse = await cache.match(request);

    // Define cache durations for different endpoints
    const cacheDurations = {
        '/trending': 300000, // 5 minutes
        '/popular': 300000,
        '/top_rated': 3600000, // 1 hour
        '/genres': 86400000, // 24 hours
        '/content/': 3600000, // 1 hour for content details
        '/search': 60000 // 1 minute for search results
    };

    // Check if cached response is still valid
    if (cachedResponse) {
        const cachedAt = new Date(cachedResponse.headers.get('sw-cached-at'));
        const endpoint = Object.keys(cacheDurations).find(key => request.url.includes(key));
        const maxAge = cacheDurations[endpoint] || 300000; // Default 5 minutes

        if (Date.now() - cachedAt.getTime() < maxAge) {
            return cachedResponse;
        }
    }

    // Fetch from network
    try {
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            const headers = new Headers(responseToCache.headers);
            headers.set('sw-cached-at', new Date().toISOString());

            const cachedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });

            cache.put(request, cachedResponse);
        }

        return networkResponse;
    } catch (error) {
        // Return cached response if available, even if expired
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return error response
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Background sync for user interactions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-interactions') {
        event.waitUntil(syncInteractions());
    }
});

async function syncInteractions() {
    // Implement background sync for user interactions
    // This would sync watchlist, favorites, ratings etc. when back online
}

// Push notifications (if implemented)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});