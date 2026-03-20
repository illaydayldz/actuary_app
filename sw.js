const CACHE='froguary-v4';
const ASSETS=['./','./index.html','./manifest.json'];
self.addEventListener('install', e=>{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); });
self.addEventListener('activate', e=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
self.addEventListener('message', e=>{
  if(e.data && e.data.type==='SCHEDULE_NOTIFICATION'){
    const {title, body, delay} = e.data;
    setTimeout(()=>{
      self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200,100,200],
        tag: 'froguary-'+Date.now()
      });
    }, delay||0);
  }
  if(e.data && e.data.type==='TEST'){
    self.registration.showNotification('🐸 Test', { body: 'Bildirim çalışıyor!', icon: '/icon-192.png' });
  }
});
