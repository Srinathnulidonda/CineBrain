const CACHE_NAME = 'movieapp-v1';
const STATIC_CACHE = 'movieapp-static-v1';
const DYNAMIC_CACHE = 'movieapp-dynamic-v1';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/css/main.css',
    '/assets/css/components.css',
    '/assets/css/themes.css',
    '/assets/css/responsive.css',
    '/assets/js/core/app.js',
    '/assets/js/core/api.js',
    '/assets/js/core/auth.js',
    '/assets/js/core/storage.js',
    '/assets/js/utils/constants.js',
    '/assets/js/utils/helpers.js',
    '/assets/images/icons/icon-192x192.png',
    '/assets/images/icons/icon-512x512.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

const CACHE_STRATEGIES = {
    images: 'cache-first',
    api: 'network-first',
    static: 'cache-first',
    html: 'network-first'
};

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service Worker: Static assets cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Failed to cache static assets', error);
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
    const url = new URL(request.url);
    
    try {
        // API requests - Network first
        if (url.pathname.startsWith('/api/')) {
            return await networkFirst(request);
        }
        
        // Images - Cache first
        if (isImageRequest(request)) {
            return await cacheFirst(request);
        }
        
        // Static assets - Cache first
        if (isStaticAsset(request)) {
            return await cacheFirst(request);
        }
        
        // HTML pages - Network first
        if (isHTMLRequest(request)) {
            return await networkFirst(request);
        }
        
        // Default strategy - Network first
        return await networkFirst(request);
        
    } catch (error) {
        console.error('Service Worker: Fetch failed', error);
        return await handleOfflineFallback(request);
    }
}

async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        // Update cache in background
        updateCacheInBackground(request);
        return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
}

async function updateCacheInBackground(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse);
        }
    } catch (error) {
        // Silently fail background updates
    }
}

async function handleOfflineFallback(request) {
    // For HTML requests, return offline page
    if (isHTMLRequest(request)) {
        const offlinePage = await caches.match('/offline.html');
        if (offlinePage) {
            return offlinePage;
        }
    }
    
    // For images, return placeholder
    if (isImageRequest(request)) {
        const placeholder = await caches.match('/assets/images/placeholders/offline.png');
        if (placeholder) {
            return placeholder;
        }
    }
    
    // Return a basic offline response
    return new Response(
        JSON.stringify({ 
            error: 'Offline', 
            message: 'This content is not available offline' 
        }),
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
        }
    );
}

function isImageRequest(request) {
    return request.destination === 'image' || 
           /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i.test(new URL(request.url).pathname);
}

function isStaticAsset(request) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/assets/') ||
           url.pathname.includes('fonts.googleapis.com') ||
           url.pathname.includes('cdnjs.cloudflare.com');
}

function isHTMLRequest(request) {
    return request.destination === 'document' ||
           request.headers.get('Accept')?.includes('text/html');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'sync-interactions') {
        event.waitUntil(syncOfflineInteractions());
    }
});

async function syncOfflineInteractions() {
    try {
        const cache = await caches.open('offline-interactions');
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                await fetch(request);
                await cache.delete(request);
                console.log('Service Worker: Synced offline interaction');
            } catch (error) {
                console.log('Service Worker: Failed to sync interaction', error);
            }
        }
    } catch (error) {
        console.error('Service Worker: Background sync failed', error);
    }
}

// Push notifications
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push received');
    
    const options = {
        body: event.data ? event.data.text() : 'New content available!',
        icon: '/assets/images/icons/icon-192x192.png',
        badge: '/assets/images/icons/badge-72x72.png',
        tag: 'movieapp-notification',
        requireInteraction: false,
        actions: [
            {
                action: 'view',
                title: 'View',
                icon: '/assets/images/icons/view-icon.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/assets/images/icons/dismiss-icon.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('MovieRec', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Error handling
self.addEventListener('error', (event) => {
    console.error('Service Worker: Error', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker: Unhandled promise rejection', event.reason);
});

// Cache management
setInterval(() => {
    cleanupCache();
}, 24 * 60 * 60 * 1000); // Clean up once per day

async function cleanupCache() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const requests = await cache.keys();
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        for (const request of requests) {
            const response = await cache.match(request);
            const dateHeader = response.headers.get('date');
            
            if (dateHeader) {
                const age = now - new Date(dateHeader).getTime();
                if (age > maxAge) {
                    await cache.delete(request);
                    console.log('Service Worker: Deleted old cache entry', request.url);
                }
            }
        }
    } catch (error) {
        console.error('Service Worker: Cache cleanup failed', error);
    }
}

console.log('Service Worker: Loaded');