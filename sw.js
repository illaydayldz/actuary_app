const CACHE='froguary-v2';
const ASSETS=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];

self.addEventListener('install', e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch', e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));

// Bildirim mesajı al
self.addEventListener('message', e=>{
  if(e.data && e.data.type==='SCHEDULE_NOTIFICATION'){
    const {title, body, delay} = e.data;
    setTimeout(()=>{
      self.registration.showNotification(title, {
        body,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'froguary-reminder'
      });
    }, delay || 0);
  }
});
