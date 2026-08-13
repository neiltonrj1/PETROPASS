const CACHE = 'petropass-v7.0.0';
const ARQ = ["./","./index.html","./config.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./figuras/elet-2008-q28.png","./figuras/elet-2011-q29.png","./figuras/elet-2011-q32.png","./figuras/elet-2011-q34.png","./figuras/elet-2011-q40.png","./figuras/elet-2018-q27.png","./figuras/elet-2018-q32.png","./figuras/elet-2018-q40.png","./figuras/elet-2018-q44.png","./figuras/elet-2018-q53.png","./figuras/elet-2018-q55.png","./figuras/elet-2018-q56.png","./figuras/elet-2018-q58.png","./figuras/elet-2018-q59.png","./figuras/elet-2018-q61.png","./figuras/elet-2018-q63.png","./figuras/elet-2018-q67.png","./figuras/insp-2012-q46.png","./figuras/insp-2012-q51.png","./figuras/insp-2012-q56.png","./figuras/insp-2014-q33.png","./figuras/insp-2014-q47.png","./figuras/insp-2014-q70.png","./figuras/insp-2014-q70.png","./figuras/insp-2018-q49.png","./figuras/insp-2018-q53.png"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQ)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      const cp = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, cp)).catch(()=>{});
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
