const CACHE_NAME = 'dudu-studio-v33-inbox-20261016-r2';
self.addEventListener('install', (event) => { self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('dudu-studio-')&&key!==CACHE_NAME)
      .map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
