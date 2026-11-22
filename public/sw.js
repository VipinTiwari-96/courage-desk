// This service worker intentionally caches nothing. It exists only so the browser treats
// the app as an installable PWA. Requests go straight to the network, so you can never be
// served stale code, and it cannot touch your journal data (that lives in IndexedDB).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
