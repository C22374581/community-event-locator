/**
 * Service Worker for Community Event Locator PWA
 * Handles offline caching, background sync, and push notifications
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `cel-cache-${CACHE_VERSION}`;

// Cache strategies
const CACHE_STRATEGIES = {
  // API responses - Network first, fallback to cache
  API: 'network-first',
  // Static assets - Cache first, fallback to network
  STATIC: 'cache-first',
  // Map tiles - Cache first with long expiration
  TILES: 'cache-first',
  // HTML pages - Network first
  HTML: 'network-first'
};

// URLs to cache on install
const PRECACHE_URLS = [
  '/',
  '/map/',
  '/static/css/site.css',
  '/static/css/map.css',
  '/static/js/map.js',
  '/static/js/pwa.js',
  '/static/js/offline.js'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/events/',
  '/api/routes/',
  '/api/neighborhoods/'
];

/**
 * Install event - Cache initial resources
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching initial resources');
        return cache.addAll(PRECACHE_URLS.filter(url => {
          // Only cache URLs that exist (avoid errors)
          return true;
        }));
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[Service Worker] Install failed:', err);
      })
  );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - Implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except map tiles)
  if (url.origin !== location.origin && !url.hostname.includes('tile.openstreetmap.org')) {
    return;
  }

  // Determine cache strategy based on URL
  if (url.pathname.startsWith('/api/')) {
    // API endpoints - Network first
    event.respondWith(networkFirst(request, 'api'));
  } else if (url.hostname.includes('tile.openstreetmap.org')) {
    // Map tiles - Cache first with long expiration
    event.respondWith(cacheFirst(request, 'tiles'));
  } else if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    // Static assets - Cache first
    event.respondWith(cacheFirst(request, 'static'));
  } else if (url.pathname.match(/\.(html|htm)$/) || url.pathname === '/') {
    // HTML pages - Network first
    event.respondWith(networkFirst(request, 'html'));
  } else {
    // Default - Network first
    event.respondWith(networkFirst(request, 'default'));
  }
});

/**
 * Network First Strategy
 * Try network, fallback to cache, then offline page
 */
async function networkFirst(request, cacheType) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // For API requests, return a structured offline response
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'No internet connection. Showing cached data.',
          offline: true 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // For HTML pages, return offline page if available
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    throw error;
  }
}

/**
 * Cache First Strategy
 * Check cache first, fallback to network
 */
async function cacheFirst(request, cacheType) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background (stale-while-revalidate)
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          const cache = caches.open(CACHE_NAME);
          cache.then(c => c.put(request, networkResponse.clone()));
        }
      })
      .catch(() => {
        // Ignore network errors in background update
      });
    
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache and network failed:', request.url);
    throw error;
  }
}

/**
 * Background Sync - Sync queued actions when online
 */
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-events') {
    event.waitUntil(syncQueuedEvents());
  }
});

/**
 * Sync queued events from IndexedDB
 */
async function syncQueuedEvents() {
  // This would integrate with IndexedDB to sync queued event creations/updates
  // For now, just log that sync is happening
  console.log('[Service Worker] Syncing queued events...');
  
  // In a full implementation, you would:
  // 1. Read from IndexedDB
  // 2. Send to API
  // 3. Clear from IndexedDB on success
}

/**
 * Push Notification handler
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Community Event Locator';
  const options = {
    body: data.body || 'New event nearby!',
    icon: '/static/icons/icon-192x192.png',
    badge: '/static/icons/icon-72x72.png',
    data: data.url || '/map/',
    vibrate: [200, 100, 200],
    tag: 'event-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

/**
 * Message handler - Communication from main thread
 */
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

