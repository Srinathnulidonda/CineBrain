// Service Worker for CineBrain - Ultra-fast caching and offline support
const CACHE_NAME = 'cinebrain-v1.0.0';
const API_CACHE_NAME = 'cinebrain-api-v1.0.0';
const IMAGE_CACHE_NAME = 'cinebrain-images-v1.0.0';

// Cache duration in milliseconds
const CACHE_DURATION = {
    STATIC: 7 * 24 * 60 * 60 * 1000, // 7 days
    API: 5 * 60 * 1000, // 5 minutes
    IMAGES: 30 * 24 * 60 * 60 * 1000 // 30 days
};

// Files to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/css/styles.css',
    '/assets/js/app.js',
    '/assets/js/api.js',
    '/assets/js/components.js',
    '/assets/js/utils.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// API endpoints to cache
const CACHEABLE_APIS = [
    '/api/recommendations/trending',
    '/api/recommendations/critics-choice',
    '/api/recommendations/admin-choice',
    '/api/recommendations/genre/',
    '/api/recommendations/regional/',
    '/api/recommendations/anime'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker');

    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS.map(url =>
                    new Request(url, { mode: 'cors' })
                )).catch(error => {
                    console.warn('[SW] Failed to cache some static assets:', error);
                });
            }),
            self.skipWaiting()
        ])
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker');

    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME &&
                            cacheName !== API_CACHE_NAME &&
                            cacheName !== IMAGE_CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            self.clients.claim()
        ])
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle different types of requests
    if (url.hostname === 'backend-app-970m.onrender.com') {
        // API requests - Network First with cache fallback
        event.respondWith(handleAPIRequest(request));
    } else if (url.hostname === 'image.tmdb.org' || url.hostname === 'img.youtube.com') {
        // Image requests - Cache First with network fallback
        event.respondWith(handleImageRequest(request));
    } else if (url.hostname === self.location.hostname) {
        // Static assets - Cache First with network fallback
        event.respondWith(handleStaticRequest(request));
    } else {
        // External resources - Network First
        event.respondWith(handleExternalRequest(request));
    }
});

// Handle API requests with intelligent caching
async function handleAPIRequest(request) {
    const url = new URL(request.url);
    const isCacheable = CACHEABLE_APIS.some(pattern =>
        url.pathname.includes(pattern)
    );

    if (!isCacheable) {
        // Non-cacheable API requests - Network only
        return fetch(request).catch(() => {
            return new Response(JSON.stringify({
                error: 'Network unavailable',
                offline: true
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        });
    }

    const cache = await caches.open(API_CACHE_NAME);
    const cacheKey = request.url;

    try {
        // Try network first for fresh data
        const networkResponse = await fetch(request, {
            headers: {
                ...request.headers,
                'Cache-Control': 'no-cache'
            }
        });

        if (networkResponse.ok) {
            // Cache successful response
            const responseClone = networkResponse.clone();
            await cache.put(cacheKey, responseClone);

            // Add timestamp for cache expiration
            await cache.put(`${cacheKey}_timestamp`, new Response(Date.now().toString()));

            console.log('[SW] API response cached:', cacheKey);
            return networkResponse;
        }

        throw new Error(`Network response not ok: ${networkResponse.status}`);
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', error.message);

        // Check if cached response is still valid
        const cachedResponse = await cache.match(cacheKey);
        const cachedTimestamp = await cache.match(`${cacheKey}_timestamp`);

        if (cachedResponse && cachedTimestamp) {
            const timestamp = parseInt(await cachedTimestamp.text());
            const age = Date.now() - timestamp;

            if (age < CACHE_DURATION.API) {
                console.log('[SW] Serving fresh cached API response');
                return cachedResponse;
            } else {
                console.log('[SW] Cached API response expired');
                await cache.delete(cacheKey);
                await cache.delete(`${cacheKey}_timestamp`);
            }
        }

        // Return offline fallback
        return new Response(JSON.stringify({
            error: 'Content unavailable offline',
            offline: true,
            recommendations: []
        }), {
            status: 503,
            headers: {
                'Content-Type': 'application/json',
                'X-Served-By': 'ServiceWorker'
            }
        });
    }
}

// Handle image requests with long-term caching
async function handleImageRequest(request) {
    const cache = await caches.open(IMAGE_CACHE_NAME);

    // Try cache first for images
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            // Cache successful image response
            await cache.put(request, networkResponse.clone());
            console.log('[SW] Image cached:', request.url);
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Image fetch failed:', error.message);

        // Return placeholder image for failed requests
        return new Response(
            createPlaceholderSVG(),
            {
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'X-Served-By': 'ServiceWorker'
                }
            }
        );
    }
}

// Handle static asset requests
async function handleStaticRequest(request) {
    const cache = await caches.open(CACHE_NAME);

    // Try cache first for static assets
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            // Cache successful response
            await cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Static asset fetch failed:', error.message);

        // Return cached version or offline page
        return cachedResponse || createOfflinePage();
    }
}

// Handle external resource requests
async function handleExternalRequest(request) {
    try {
        return await fetch(request);
    } catch (error) {
        console.log('[SW] External resource failed:', error.message);

        // For critical external resources, try to serve from cache
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);

        return cachedResponse || new Response('', { status: 503 });
    }
}

// Create placeholder SVG for failed image loads
function createPlaceholderSVG() {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450">
            <rect width="300" height="450" fill="#374151"/>
            <text x="150" y="225" text-anchor="middle" fill="#fff" font-size="16" font-family="Arial">
                Image Unavailable
            </text>
            <circle cx="150" cy="180" r="20" fill="#6B7280"/>
            <path d="M140 170 L160 170 L160 190 L140 190 Z" fill="#fff"/>
        </svg>
    `;

    return svg;
}

// Create offline page
function createOfflinePage() {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>CineBrain - Offline</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    background: linear-gradient(135deg, #1F2937 0%, #111827 100%);
                    color: white;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    text-align: center;
                }
                .offline-container {
                    max-width: 400px;
                    padding: 2rem;
                }
                .logo {
                    font-size: 2rem;
                    font-weight: 900;
                    background: linear-gradient(45deg, #E50914, #0073E6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 1rem;
                }
                button {
                    background: linear-gradient(45deg, #E50914, #C53030);
                    border: none;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 1rem;
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="logo">CineBrain</div>
                <h2>You're Offline</h2>
                <p>Check your internet connection and try again.</p>
                <button onclick="window.location.reload()">Retry</button>
            </div>
        </body>
        </html>
    `;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
    });
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    console.log('[SW] Performing background sync');

    // Retry failed API requests when back online
    const cache = await caches.open(API_CACHE_NAME);
    const requests = await cache.keys();

    for (const request of requests) {
        if (request.url.includes('_timestamp')) continue;

        try {
            const response = await fetch(request);
            if (response.ok) {
                await cache.put(request, response.clone());
                await cache.put(`${request.url}_timestamp`, new Response(Date.now().toString()));
            }
        } catch (error) {
            console.log('[SW] Background sync failed for:', request.url);
        }
    }
}

// Push notification handler
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New content available!',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            {
                action: 'explore',
                title: 'Explore',
                icon: '/assets/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/assets/icons/xmark.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('CineBrain', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            cacheUrls(event.data.urls)
        );
    }
});

async function cacheUrls(urls) {
    const cache = await caches.open(CACHE_NAME);

    for (const url of urls) {
        try {
            await cache.add(url);
        } catch (error) {
            console.warn('[SW] Failed to cache URL:', url, error);
        }
    }
}

console.log('[SW] Service Worker script loaded');