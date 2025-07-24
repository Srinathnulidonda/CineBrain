const CACHE_NAME = 'cinescope-v1.0.0';
const STATIC_CACHE = 'cinescope-static-v1.0.0';
const DYNAMIC_CACHE = 'cinescope-dynamic-v1.0.0';
const IMAGE_CACHE = 'cinescope-images-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/login.html',
    '/manifest.json',
    '/css/main.css',
    '/css/components.css',
    '/css/responsive.css',
    '/js/main.js',
    '/js/include.js',
    '/includes/header.html',
    '/includes/footer.html',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css'
];

// Pages that require authentication
const PROTECTED_PAGES = [
    '/dashboard',
    '/profile',
    '/user/watchlist',
    '/user/favorites',
    '/admin/dashboard'
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/recommendations/trending',
    '/api/recommendations/popular',
    '/api/recommendations/new-releases',
    '/api/recommendations/critics-choice'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static files
            caches.open(STATIC_CACHE).then(cache => {
                console.log('Service Worker: Caching static files...');
                return cache.addAll(STATIC_FILES);
            }),
            
            // Initialize other caches
            caches.open(DYNAMIC_CACHE),
            caches.open(IMAGE_CACHE)
        ]).then(() => {
            console.log('Service Worker: Installation complete');
            // Force activation
            return self.skipWaiting();
        }).catch(error => {
            console.error('Service Worker: Installation failed', error);
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== IMAGE_CACHE) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Take control of all pages
            self.clients.claim()
        ]).then(() => {
            console.log('Service Worker: Activation complete');
        })
    );
});

// Fetch event - intercept network requests
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests and chrome-extension requests
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
        return;
    }
    
    // Handle different types of requests
    if (isImageRequest(request)) {
        event.respondWith(handleImageRequest(request));
    } else if (isAPIRequest(request)) {
        event.respondWith(handleAPIRequest(request));
    } else if (isNavigationRequest(request)) {
        event.respondWith(handleNavigationRequest(request));
    } else {
        event.respondWith(handleStaticRequest(request));
    }
});

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
    const cache = await caches.open(IMAGE_CACHE);
    
    try {
        // Try cache first
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fetch from network
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('Image fetch failed:', error);
        
        // Return placeholder image for failed requests
        return new Response(
            '<svg width="300" height="450" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#374151"/><text x="50%" y="50%" text-anchor="middle" fill="#9CA3AF" font-family="Arial" font-size="16">Image Unavailable</text></svg>',
            {
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'no-cache'
                }
            }
        );
    }
}

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    try {
        // Try network first for fresh data
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful API responses
            cache.put(request, networkResponse.clone());
            return networkResponse;
        } else {
            throw new Error(`API responded with ${networkResponse.status}`);
        }
        
    } catch (error) {
        console.log('Network failed, trying cache:', error);
        
        // Fallback to cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            // Add custom header to indicate cached response
            const response = cachedResponse.clone();
            response.headers.set('X-Served-From', 'cache');
            return response;
        }
        
        // Return offline response for API failures
        return new Response(
            JSON.stringify({
                error: 'Network unavailable',
                offline: true,
                recommendations: [],
                message: 'You are currently offline. Please check your connection and try again.'
            }),
            {
                status: 503,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Served-From': 'service-worker'
                }
            }
        );
    }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    try {
        // Try network first for navigation
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful page responses
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        throw new Error(`Navigation failed with ${networkResponse.status}`);
        
    } catch (error) {
        console.log('Navigation network failed, trying cache:', error);
        
        // Try to serve from cache
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Check if it's a protected page
        if (isProtectedPage(pathname)) {
            return caches.match('/login.html');
        }
        
        // Fallback to offline page
        return createOfflinePage(pathname);
    }
}

// Handle static file requests
async function handleStaticRequest(request) {
    // Try cache first for static files
    const staticCache = await caches.open(STATIC_CACHE);
    const cachedResponse = await staticCache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        // Fetch from network
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache static files
            const dynamicCache = await caches.open(DYNAMIC_CACHE);
            dynamicCache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('Static file fetch failed:', error);
        
        // Try dynamic cache as fallback
        const dynamicCache = await caches.open(DYNAMIC_CACHE);
        const fallbackResponse = await dynamicCache.match(request);
        
        if (fallbackResponse) {
            return fallbackResponse;
        }
        
        // Return minimal error response
        return new Response('File not available offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// Utility functions
function isImageRequest(request) {
    const url = new URL(request.url);
    return url.pathname.includes('/t/p/') || // TMDB images
           url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
           request.destination === 'image';
}

function isAPIRequest(request) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/api/') ||
           url.hostname.includes('backend-app') ||
           url.hostname.includes('movies-rec');
}

function isNavigationRequest(request) {
    return request.mode === 'navigate' ||
           (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

function isProtectedPage(pathname) {
    return PROTECTED_PAGES.some(page => pathname.startsWith(page));
}

function createOfflinePage(pathname) {
    const offlineHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Offline - CineScope</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #0B0F19;
                    color: #F8FAFC;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    text-align: center;
                }
                .offline-container {
                    max-width: 500px;
                    padding: 2rem;
                }
                .offline-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    opacity: 0.7;
                }
                .offline-title {
                    font-size: 2rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    color: #4F46E5;
                }
                .offline-message {
                    font-size: 1.1rem;
                    line-height: 1.6;
                    margin-bottom: 2rem;
                    color: #CBD5E1;
                }
                .offline-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                .btn {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    text-decoration: none;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .btn-primary {
                    background: #4F46E5;
                    color: white;
                }
                .btn-primary:hover {
                    background: #3730A3;
                }
                .btn-secondary {
                    background: transparent;
                    color: #CBD5E1;
                    border: 1px solid #475569;
                }
                .btn-secondary:hover {
                    background: #475569;
                    color: white;
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon">📱</div>
                <h1 class="offline-title">You're Offline</h1>
                <p class="offline-message">
                    No internet connection detected. Some features may not be available, 
                    but you can still browse cached content.
                </p>
                <div class="offline-actions">
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        Try Again
                    </button>
                    <a href="/" class="btn btn-secondary">
                        Go Home
                    </a>
                </div>
            </div>
            
            <script>
                // Auto-retry connection
                function checkConnection() {
                    if (navigator.onLine) {
                        window.location.reload();
                    }
                }
                
                // Check every 5 seconds
                setInterval(checkConnection, 5000);
                
                // Listen for online event
                window.addEventListener('online', () => {
                    window.location.reload();
                });
            </script>
        </body>
        </html>
    `;
    
    return new Response(offlineHTML, {
        headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache'
        }
    });
}

// Background sync for offline actions
self.addEventListener('sync', event => {
    console.log('Service Worker: Sync event', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        // Sync pending actions when back online
        const cache = await caches.open(DYNAMIC_CACHE);
        const requests = await cache.keys();
        
        // Process any pending offline actions
        for (const request of requests) {
            if (request.url.includes('/api/interactions')) {
                // Retry failed interaction requests
                try {
                    await fetch(request);
                    await cache.delete(request);
                } catch (error) {
                    console.log('Sync failed for:', request.url);
                }
            }
        }
        
        console.log('Background sync completed');
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Push notifications
self.addEventListener('push', event => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: 'New movies and shows have been added to CineScope!',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        tag: 'cinescope-update',
        requireInteraction: false,
        actions: [
            {
                action: 'explore',
                title: 'Explore Now',
                icon: '/assets/icons/action-explore.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/assets/icons/action-dismiss.png'
            }
        ]
    };
    
    if (event.data) {
        try {
            const data = event.data.json();
            options.body = data.body || options.body;
            options.title = data.title || 'CineScope';
            if (data.icon) options.icon = data.icon;
            if (data.badge) options.badge = data.badge;
            if (data.tag) options.tag = data.tag;
        } catch (error) {
            console.error('Failed to parse push data:', error);
        }
    }
    
    event.waitUntil(
        self.registration.showNotification('CineScope', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked', event);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'dismiss') {
        // Just close the notification
        return;
    } else {
        // Default action - open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handling from main thread
self.addEventListener('message', event => {
    console.log('Service Worker: Message received', event.data);
    
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
            console.log('Cached:', url);
        } catch (error) {
            console.error('Failed to cache:', url, error);
        }
    }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
    console.log('Service Worker: Periodic sync', event.tag);
    
    if (event.tag === 'content-sync') {
        event.waitUntil(syncContent());
    }
});

async function syncContent() {
    try {
        // Sync trending content in background
        const response = await fetch('/api/recommendations/trending');
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put('/api/recommendations/trending', response.clone());
        }
        
        console.log('Content sync completed');
    } catch (error) {
        console.error('Content sync failed:', error);
    }
}

// Cache management utilities
function logCacheStatus() {
    caches.keys().then(cacheNames => {
        console.log('Active caches:', cacheNames);
        
        cacheNames.forEach(cacheName => {
            caches.open(cacheName).then(cache => {
                cache.keys().then(requests => {
                    console.log(`${cacheName}: ${requests.length} items`);
                });
            });
        });
    });
}

// Log cache status on activation (for debugging)
self.addEventListener('activate', () => {
    setTimeout(logCacheStatus, 1000);
});