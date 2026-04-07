// SVD Stickertausch – Service Worker
// Push Notifications + Offline Caching

const CACHE_NAME = 'svd-sticker-v1'
const OFFLINE_URL = '/'

// Install: Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        OFFLINE_URL,
        '/manifest.json',
      ])
    })
  )
  self.skipWaiting()
})

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: Network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    )
  }
})

// Push Notification Handler
self.addEventListener('push', (event) => {
  let data = { title: 'SVD Stickertausch', body: 'Du hast eine neue Nachricht!' }

  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/nachrichten',
    },
    actions: [
      { action: 'open', title: 'Öffnen' },
      { action: 'dismiss', title: 'Schließen' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'SVD Stickertausch', options)
  )
})

// Notification Click Handler — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/nachrichten'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url)
    })
  )
})
