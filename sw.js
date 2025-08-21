// CineScope Service Worker - Advanced Caching Strategy
const CACHE_NAME = 'cinescope-v1.0.0';
const STATIC_CACHE = 'cinescope-static-v1.0.0';
const DYNAMIC_CACHE = 'cinescope-dynamic-v1.0.0';
const API_CACHE = 'cinescope-api-v1.0.0';

// Files to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/main.css',
    '/css/components.css',
    '/css/layouts.css',
    '/css/animations.css',
    '/css/responsive.css',
    '/css/theme.css',
    '/js/config.js',
    '/js/api.js',
    '/js/auth.js',
    '/js/app.js',
    '/auth/login.html',
    '/auth/register.html',
    '/content/search.html',
    '/content/details.html'
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/recommendations/trending',
    '/api/recommendations/new-releases',
    '/api/recommendations/critics-choice',
    '/api/recommendations/admin-choice'
];

// Cache strategies
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first', 
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
    NETWORK_ONLY: 'network-only',
    CACHE_ONLY: 'cache-only'
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service Worker: Static assets cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Failed to cache static assets', error);
            })
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== API_CACHE) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated successfully');
                return self.clients.claim();
            })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip Chrome extension requests
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }
    
    // Static assets
    if (isStaticAsset(url.pathname)) {
        event.respondWith(handleStaticAsset(request));
        return;
    }
    
    // HTML pages
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(handleHtmlRequest(request));
        return;
    }
    
    // Images and media
    if (request.headers.get('accept')?.includes('image/')) {
        event.respondWith(handleImageRequest(request));
        return;
    }
    
    // Default: Network first with cache fallback
    event.respondWith(handleDefaultRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            const cache = await caches.open(API_CACHE);
            
            // Only cache GET requests for certain endpoints
            if (shouldCacheApiResponse(url.pathname)) {
                cache.put(request, networkResponse.clone());
            }
            
            return networkResponse;
        }
        
        throw new Error(`Network response not ok: ${networkResponse.status}`);
        
    } catch (error) {
        console.warn('Service Worker: Network failed for API request', error);
        
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('Service Worker: Serving API request from cache');
            return cachedResponse;
        }
        
        // Return offline response for critical endpoints
        return createOfflineApiResponse(url.pathname);
    }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
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
        console.error('Service Worker: Failed to fetch static asset', error);
        return new Response('Asset not available offline', { status: 404 });
    }
}

// Handle HTML requests with network-first, cache fallback
async function handleHtmlRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        throw new Error(`Network response not ok: ${networkResponse.status}`);
        
    } catch (error) {
        console.warn('Service Worker: Network failed for HTML request', error);
        
        // Try cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fallback to offline page
        const offlinePage = await caches.match('/index.html');
        return offlinePage || new Response('Page not available offline', { 
            status: 404,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.warn('Service Worker: Failed to fetch image', error);
        
        // Return placeholder image
        return new Response(createPlaceholderImage(), {
            headers: { 'Content-Type': 'image/svg+xml' }
        });
    }
}

// Handle default requests
async function handleDefaultRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response('Resource not available offline', { 
            status: 404 
        });
    }
}

// Utility functions
function isStaticAsset(pathname) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.svg', '.ico', '.woff', '.woff2'];
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

function shouldCacheApiResponse(pathname) {
    const cachableEndpoints = [
        '/api/recommendations/trending',
        '/api/recommendations/new-releases', 
        '/api/recommendations/critics-choice',
        '/api/recommendations/admin-choice',
        '/api/recommendations/genre/',
        '/api/recommendations/regional/',
        '/api/content/'
    ];
    
    return cachableEndpoints.some(endpoint => pathname.startsWith(endpoint));
}

function createOfflineApiResponse(pathname) {
    const offlineData = {
        error: 'Network unavailable',
        offline: true,
        message: 'This content is not available offline'
    };
    
    // Provide cached-like responses for critical endpoints
    if (pathname.includes('trending')) {
        offlineData.recommendations = [];
        offlineData.message = 'Trending content will be available when you\'re back online';
    }
    
    return new Response(JSON.stringify(offlineData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

function createPlaceholderImage() {
    return `
        <svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#1e1e23"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#a1a1aa" font-family="Arial, sans-serif" font-size="16">
                Image unavailable offline
            </text>
        </svg>
    `;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    console.log('Service Worker: Performing background sync');
    
    try {
        // Sync any pending offline actions
        const offlineActions = await getOfflineActions();
        
        for (const action of offlineActions) {
            try {
                await syncAction(action);
                await removeOfflineAction(action.id);
            } catch (error) {
                console.error('Service Worker: Failed to sync action', error);
            }
        }
        
    } catch (error) {
        console.error('Service Worker: Background sync failed', error);
    }
}

async function getOfflineActions() {
    // In a real implementation, this would read from IndexedDB
    return [];
}

async function syncAction(action) {
    // Sync individual offline actions
    switch (action.type) {
        case 'interaction':
            return fetch('/api/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(action.data)
            });
        default:
            console.warn('Unknown offline action type:', action.type);
    }
}

async function removeOfflineAction(actionId) {
    // Remove synced action from storage
    console.log('Service Worker: Removed synced action', actionId);
}

// Push notifications
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: data.url,
        actions: [
            {
                action: 'view',
                title: 'View',
                icon: '/icons/view-icon.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/icons/dismiss-icon.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow(event.notification.data)
        );
    }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        case 'CACHE_URLS':
            event.waitUntil(cacheUrls(data.urls));
            break;
        case 'CLEAR_CACHE':
            event.waitUntil(clearCache(data.cacheName));
            break;
        default:
            console.warn('Unknown message type:', type);
    }
});

async function cacheUrls(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);
    return cache.addAll(urls);
}

async function clearCache(cacheName) {
    return caches.delete(cacheName || DYNAMIC_CACHE);
}

// Network status tracking
let isOnline = true;

self.addEventListener('online', () => {
    isOnline = true;
    console.log('Service Worker: Back online');
    
    // Notify all clients
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ type: 'ONLINE' });
        });
    });
});

self.addEventListener('offline', () => {
    isOnline = false;
    console.log('Service Worker: Gone offline');
    
    // Notify all clients
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ type: 'OFFLINE' });
        });
    });
});

// Periodic background sync
if ('periodicsync' in self.registration) {
    self.addEventListener('periodicsync', (event) => {
        if (event.tag === 'content-sync') {
            event.waitUntil(syncContentInBackground());
        }
    });
}

async function syncContentInBackground() {
    console.log('Service Worker: Syncing content in background');
    
    try {
        // Fetch and cache latest trending content
        const trending = await fetch('/api/recommendations/trending?limit=10');
        if (trending.ok) {
            const cache = await caches.open(API_CACHE);
            cache.put('/api/recommendations/trending?limit=10', trending);
        }
        
    } catch (error) {
        console.error('Service Worker: Background content sync failed', error);
    }
}

console.log('Service Worker: Script loaded successfully');