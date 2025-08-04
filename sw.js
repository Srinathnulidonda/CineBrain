// Service Worker for CineScope PWA
const CACHE_NAME = 'cinescope-v1.0.0';
const RUNTIME_CACHE = 'cinescope-runtime';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/css/main.css',
  '/css/components.css',
  '/css/responsive.css',
  '/js/main.js',
  '/js/include.js',
  '/includes/header.html',
  '/includes/footer.html',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/placeholder.jpg',
  '/assets/person-placeholder.jpg',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        self.skipWaiting();
      })
      .catch(error => {
        console.error('Error caching static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Old caches cleaned up');
        self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests (except for images)
  if (url.origin !== location.origin && !isImageRequest(request)) {
    return;
  }

  // Handle different types of requests
  if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleStaticAssetRequest(request));
  }
});

// Check if request is for API
function isAPIRequest(request) {
  return request.url.includes('/api/');
}

// Check if request is for an image
function isImageRequest(request) {
  return request.destination === 'image' ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(request.url);
}

// Check if request is a navigation request
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// Handle API requests - network first, cache fallback
async function handleAPIRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);

    // Try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'You are currently offline. Please check your connection.'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle image requests - cache first, network fallback
async function handleImageRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Try network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Failed to load image:', request.url);

    // Return placeholder image
    return caches.match('/assets/placeholder.jpg');
  }
}

// Handle navigation requests - cache first, network fallback
async function handleNavigationRequest(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Network failed for navigation, trying cache');

    // Try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to index.html for SPA routing
    const indexResponse = await cache.match('/');
    if (indexResponse) {
      return indexResponse;
    }

    // Return offline page
    return new Response(
      generateOfflinePage(),
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Handle static asset requests - cache first, network fallback
async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_NAME);

  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Try network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Failed to load static asset:', request.url);

    // Return a generic error response
    return new Response('Asset not available offline', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

// Generate offline page HTML
function generateOfflinePage() {
  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Offline - CineScope</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
                    color: #f8fafc;
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
                .offline-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                h1 {
                    margin: 0 0 1rem 0;
                    color: #3b82f6;
                }
                p {
                    color: #cbd5e1;
                    margin-bottom: 2rem;
                }
                .retry-btn {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-size: 1rem;
                }
                .retry-btn:hover {
                    background: #2563eb;
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon">📱</div>
                <h1>You're Offline</h1>
                <p>It looks like you've lost your internet connection. Some content may not be available.</p>
                <button class="retry-btn" onclick="window.location.reload()">
                    Try Again
                </button>
            </div>
        </body>
        </html>
    `;
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle any offline actions that need to be synced
  console.log('Background sync triggered');
}

// Push notification handling
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-96x96.png',
      data: data.data,
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/assets/icons/view-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker loaded successfully');