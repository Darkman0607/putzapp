/* Offline shell V1.4.0.16 – navigations fallback under Github Pages /putzapp/ */
const CACHE_NAME='mein-putzmanager-v1.4.0.16';
const APP_PATH='/putzapp/';
const SHELL=[APP_PATH,APP_PATH+'index.html',APP_PATH+'style.css',APP_PATH+'floorplan-premium.css',APP_PATH+'home-reference.css',APP_PATH+'floorplan-premium.js',APP_PATH+'editor.css',APP_PATH+'clean.css',APP_PATH+'cleaning.css',APP_PATH+'inventory.css',APP_PATH+'inventory-model.js',APP_PATH+'inventory-ui.js',APP_PATH+'cleaning-materials.js',APP_PATH+'cleaning-materials.css',APP_PATH+'room-timer.js',APP_PATH+'room-timer.css',APP_PATH+'backup-model.js',APP_PATH+'backup-drive.js',APP_PATH+'backup-drive.css',APP_PATH+'task-model.js',APP_PATH+'plan-model.js',APP_PATH+'plan-ui.js',APP_PATH+'photos.js',APP_PATH+'photo-compare.js',APP_PATH+'photo-compare.css',APP_PATH+'knowledge-ui.js',APP_PATH+'cleaning-ui.js',APP_PATH+'app.js',APP_PATH+'editor.js',APP_PATH+'clean-model.js',APP_PATH+'geometry.js',APP_PATH+'manifest.webmanifest',APP_PATH+'assets/floor-wood.png',APP_PATH+'assets/floor-tile.png',APP_PATH+'assets/floor-stone.png',APP_PATH+'assets/floor-slate.png',APP_PATH+'assets/icon.svg',APP_PATH+'assets/icon-192.png',APP_PATH+'assets/icon-512.png'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('mein-putzmanager-')&&name!==CACHE_NAME).map(name=>caches.delete(name)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin) return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).catch(async()=> (await caches.match(req)) || (await caches.match(APP_PATH)) || (await caches.match(APP_PATH+'index.html')) || Response.error()));
  return;
 }
 // Online-first assets avoid mixing a new index.html with stale .js from an old PWA cache.
 event.respondWith(fetch(req).then(response=>{
  if(response.ok){const saved=response.clone();event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(req,saved)).catch(()=>{}));}
  return response;
 }).catch(async()=> (await caches.match(req)) || Response.error()));
});
