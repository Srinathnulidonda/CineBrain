const CACHE_NAME = 'cinescope-v1.0.0';
const STATIC_CACHE = 'cinescope-static-v1.0.0';
const DYNAMIC_CACHE = 'cinescope-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/css/main.css',
  '/css/components.css',
  '/css/responsive.css',
  '/js/main.js',
  '/js/include.js',
  '/login',
  '/dashboard',
  '/search',
  '/manifest.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/recommendations\//,
  /\/api\/content\//,
  /\/api\/search/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
});

// Activate event - clean up old caches
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

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (request.url.includes('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle asset requests
  event.respondWith(handleAssetRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful API responses
      const shouldCache = API_CACHE_PATTERNS.some(pattern =>
        pattern.test(request.url)
      );

      if (shouldCache) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log('Service Worker: Serving API from cache', request.url);
      return cachedResponse;
    }

    // Return offline API response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This feature is not available offline',
        cached: false
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Network failed, serve cached page or offline page
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Serve offline page
    const offlineResponse = await caches.match('/');
    return offlineResponse || new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Handle asset requests with cache-first strategy
async function handleAssetRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Try network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Return placeholder for images
    if (request.destination === 'image') {
      return new Response(
        '<svg width="300" height="450" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1a1a1a"/><text x="50%" y="50%" font-family="Arial" font-size="16" fill="#666" text-anchor="middle">Image not available offline</text></svg>',
        {
          headers: {
            'Content-Type': 'image/svg+xml'
          }
        }
      );
    }

    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);

  switch (event.tag) {
    case 'sync-user-interactions':
      event.waitUntil(syncUserInteractions());
      break;
    case 'sync-search-queries':
      event.waitUntil(syncSearchQueries());
      break;
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received', event);

  const options = {
    body: event.data ? event.data.text() : 'New content available!',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/assets/icons/explore.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/icons/close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('CineScope', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click', event);

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Sync offline user interactions
async function syncUserInteractions() {
  try {
    // Get stored interactions from IndexedDB
    const interactions = await getStoredInteractions();

    for (const interaction of interactions) {
      try {
        await fetch('/api/interactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${interaction.token}`
          },
          body: JSON.stringify(interaction.data)
        });

        // Remove synced interaction
        await removeStoredInteraction(interaction.id);
      } catch (error) {
        console.error('Failed to sync interaction:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Sync offline search queries
async function syncSearchQueries() {
  // Implementation for syncing search analytics
  console.log('Syncing search queries...');
}

// IndexedDB helpers (simplified)
async function getStoredInteractions() {
  // Implementation would use IndexedDB
  return [];
}

async function removeStoredInteraction(id) {
  // Implementation would use IndexedDB
  console.log('Removing interaction:', id);
}

// Message handling
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_URLS':
      event.waitUntil(
        caches.open(DYNAMIC_CACHE)
          .then(cache => cache.addAll(event.data.payload))
      );
      break;
  }
});