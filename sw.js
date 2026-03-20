const CACHE='froguary-v3';
const ASSETS=['./','./index.html','./manifest.json','./icon-192.png','./icon-152.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='SCHEDULE_NOTIFICATION'){
    const {title,body,delay}=e.data;
    setTimeout(()=>{
      self.registration.showNotification(title,{body,icon:'./icon-192.png',badge:'./icon-192.png',vibrate:[200,100,200],tag:'froguary-reminder'});
    },delay||0);
  }
});
