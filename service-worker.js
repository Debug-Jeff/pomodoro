/**
* Service Worker for the Pomodoro PWA
* Handles caching, offline support, background sync, and push notifications
*/

const CACHE_NAME = 'pomodoro-app-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/home.html',
  '/dashboard.html',
  '/settings.html',
  '/assets/logo.svg',
  '/assets/sounds/start.wav',
  '/assets/sounds/break.wav',
  '/assets/sounds/complete.wav',
  '/js/main.js',
  '/js/timer.js',
  '/js/audio.js',
  '/js/storage.js',
  '/js/dashboard.js',
  '/js/settings.js',
  '/js/animations.js',
  '/js/tasks.js',
  '/js/custom-sequences.js',
  'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.4/gsap.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        // Make network request
        return fetch(fetchRequest)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Fallback for offline images
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match('/assets/logo.svg');
            }

            // Return a basic offline page for HTML requests
            if (event.request.headers.get('Accept').includes('text/html')) {
              return caches.match('/index.html');
            }

            // Otherwise, just return the error
            return new Response('Network error', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sessions') {
    event.waitUntil(syncSessions());
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data.json();

  const title = data.title || 'Pomodoro Timer';
  const options = {
    body: data.body || 'Time to focus!',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If a window client is already open, focus it
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }

      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Sync sessions with server (mock implementation)
async function syncSessions() {
  // In a real app, this would send data to a server
  console.log('Syncing sessions in background');

  // Get sessions from localStorage
  const sessions = JSON.parse(localStorage.getItem('pomodoro_sessions')) || [];

  // Mark sessions as synced
  localStorage.setItem('pomodoro_sessions_synced', JSON.stringify(sessions.length));

  return Promise.resolve();
}