const CACHE = "serendib-orders-v4";
const ASSETS = ["./","./index.html","./manifest.json","./icon.svg","./styles.css","./app.js"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch", e => { e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))); });