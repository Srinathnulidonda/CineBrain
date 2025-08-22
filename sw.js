// CineScope Service Worker
const CACHE_NAME = 'cinescope-v1';
const API_CACHE_NAME = 'cinescope-api-v1';

const STATIC_ASSETS = [
  '/',
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
  '/manifest.json'
];

const API_ENDPOINTS = [
  '/api/recommendations/trending',
  '/api/recommendations/admin-choice',
  '/api/recommendations/new-releases',
  '/api/recommendations/critics-choice'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          const fetchPromise = fetch(request).then(networkResponse => {
            // Cache successful responses for 30 seconds
            if (networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              setTimeout(() => {
                cache.put(request, responseToCache);
              }, 0);
            }
            return networkResponse;
          }).catch(() => {
            // Return cached response if network fails
            return cachedResponse;
          });

          // Return cached response immediately if available, otherwise wait for network
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(request)
      .then(response => {
        return response || fetch(request);
      })
      .catch(() => {
        // Fallback for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle offline actions when back online
  const offlineActions = await getOfflineActions();
  for (const action of offlineActions) {
    try {
      await fetch(action.url, action.options);
      await removeOfflineAction(action.id);
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }
}

async function getOfflineActions() {
  // Implement offline action storage
  return [];
}

async function removeOfflineAction(id) {
  // Implement offline action removal
}