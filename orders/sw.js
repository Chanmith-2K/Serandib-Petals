const CACHE="serendib-orders-v15-stable-c";
const ASSETS=[
  "./",
  "./index.html",
  "./stable-v15.html?v=15",
  "./v7.html?v=15",
  "./v9.css?v=9",
  "./v9.js?v=9",
  "./nav-stability-v15.js?v=15",
  "./styles.css?v=6",
  "./v7.css?v=7",
  "./app.js?v=6",
  "./v7.js?v=7",
  "./cloud.css?v=10",
  "./cloud-sync.js?v=10",
  "./serendib-enhancements.css?v=11",
  "./serendib-enhancements.js?v=11",
  "./expenses-v12.css?v=12",
  "./expenses-v12.js?v=12",
  "./ui-fixes-v13.css?v=15b",
  "./ui-fixes-v15.js?v=15",
  "./storage-meter-v15.js?v=15c",
  "./frame-cloud-v15.js?v=15",
  "./manifest.json?v=15",
  "./icon.svg"
];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r}).catch(()=>caches.match(e.request)))})