// Service Worker for offline support and caching
const CACHE_NAME = 'movierec-v1.0.0';
const STATIC_CACHE = 'movierec-static-v1.0.0';
const DYNAMIC_CACHE = 'movierec-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/login.html',
    '/dashboard.html',
    '/movie-detail.html',
    '/profile.html',
    '/css/main.css',
    '/css/components.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/api.js',
    '/js/components.js',
    '/js/dashboard.js',
    '/js/movie-detail.js',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
    /\/api\/homepage/,
    /\/api\/recommendations/,
    /\/api\/content\/\d+/,
    /\/api\/search/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Caching static files...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Static files cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Failed to cache static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle different types of requests
    if (isStaticFile(request.url)) {
        event.respondWith(cacheFirst(request));
    } else if (isAPIRequest(request.url)) {
        event.respondWith(networkFirst(request));
    } else if (isImageRequest(request.url)) {
        event.respondWith(cacheFirst(request));
    } else {
        event.respondWith(networkFirst(request));
    }
});

// Cache first strategy (for static files)
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Cache first strategy failed:', error);
        
        // Return offline fallback
        if (request.destination === 'document') {
            return caches.match('/offline.html');
        }
        
        throw error;
    }
}

// Network first strategy (for API requests)
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok && isAPIRequest(request.url)) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback for documents
        if (request.destination === 'document') {
            return caches.match('/offline.html');
        }
        
        throw error;
    }
}

// Helper functions
function isStaticFile(url) {
    return STATIC_FILES.some(file => url.includes(file)) ||
           url.includes('.css') ||
           url.includes('.js') ||
           url.includes('.woff') ||
           url.includes('.woff2');
}

function isAPIRequest(url) {
    return url.includes('/api/') ||
           API_CACHE_PATTERNS.some(pattern => pattern.test(url));
}

function isImageRequest(url) {
    return url.includes('image.tmdb.org') ||
           url.includes('.jpg') ||
           url.includes('.jpeg') ||
           url.includes('.png') ||
           url.includes('.webp') ||
           url.includes('.gif');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'sync-interactions') {
        event.waitUntil(syncInteractions());
    }
});

async function syncInteractions() {
    try {
        // Get pending interactions from IndexedDB
        const pendingInteractions = await getPendingInteractions();
        
        for (const interaction of pendingInteractions) {
            try {
                await fetch('/api/interact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${interaction.token}`
                    },
                    body: JSON.stringify(interaction.data)
                });
                
                // Remove from pending list
                await removePendingInteraction(interaction.id);
                
            } catch (error) {
                console.error('Failed to sync interaction:', error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// IndexedDB helpers (simplified)
async function getPendingInteractions() {
    // In a real implementation, this would use IndexedDB
    return [];
}

async function removePendingInteraction(id) {
    // In a real implementation, this would remove from IndexedDB
    console.log('Removing pending interaction:', id);
}

// Push notifications
self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'New content available!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Explore',
                icon: '/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/icons/xmark.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('MovieRec', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/dashboard.html')
        );
    }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);
    
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
    const cache = await caches.open(DYNAMIC_CACHE);
    
    for (const url of urls) {
        try {
            await cache.add(url);
            console.log('Cached URL:', url);
        } catch (error) {
            console.error('Failed to cache URL:', url, error);
        }
    }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
    console.log('Periodic sync triggered:', event.tag);
    
    if (event.tag === 'update-recommendations') {
        event.waitUntil(updateRecommendations());
    }
});

async function updateRecommendations() {
    try {
        // Fetch fresh recommendations
        const response = await fetch('/api/recommendations');
        
        if (response.ok) {
                        const cache = await caches.open(DYNAMIC_CACHE);
            cache.put('/api/recommendations', response.clone());
            
            console.log('Recommendations updated in background');
        }
    } catch (error) {
        console.error('Failed to update recommendations:', error);
    }
}

// Error handling
self.addEventListener('error', (event) => {
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker unhandled rejection:', event.reason);
});

// Cache management utilities
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => 
        name !== STATIC_CACHE && name !== DYNAMIC_CACHE
    );
    
    return Promise.all(
        oldCaches.map(name => caches.delete(name))
    );
}

async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const name of cacheNames) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
    }
    
    return totalSize;
}

// Expose utilities to main thread
self.getCacheSize = getCacheSize;
self.cleanupOldCaches = cleanupOldCaches;