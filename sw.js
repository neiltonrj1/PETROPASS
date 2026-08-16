const CACHE = 'petropass-v7.7.0';
const ARQ = ["./","./index.html","./config.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./figuras/elet-2006-q31.png","./figuras/elet-2006-q36.png","./figuras/elet-2008-q31.png","./figuras/elet-2011-q27.png","./figuras/elet-2011-q29.png","./figuras/elet-2011-q32.png","./figuras/elet-2011-q34.png","./figuras/elet-2011-q40.png","./figuras/elet-2011-q54.png","./figuras/elet-2011-q55.png","./figuras/elet-2011-q64.png","./figuras/elet-2011-q66.png","./figuras/elet-2018-q25.png","./figuras/elet-2018-q27.png","./figuras/elet-2018-q40.png","./figuras/elet-2018-q43.png","./figuras/elet-2018-q44.png","./figuras/elet-2018-q48.png","./figuras/elet-2018-q53.png","./figuras/elet-2018-q55.png","./figuras/elet-2018-q58.png","./figuras/elet-2018-q59.png","./figuras/elet-2018-q61.png","./figuras/elet-2018-q62.png","./figuras/elet-2018-q63.png","./figuras/elet-2018-q64.png","./figuras/elet-2018-q67.png","./figuras/elet-2018-q69.png","./figuras/elet-2023-q31.png","./figuras/elet-2023-q42.png","./figuras/elet-2023-q47.png","./figuras/elet-2023-q48.png","./figuras/elet-2023-q51.png","./figuras/elet-2023-q62.png","./figuras/elet-2023-q63.png","./figuras/elet-2023-q67.png","./figuras/insp-2012-q46.png","./figuras/insp-2012-q51.png","./figuras/insp-2012-q56.png","./figuras/insp-2014-q24.png","./figuras/insp-2014-q33.png","./figuras/insp-2014-q39.png","./figuras/insp-2014-q45.png","./figuras/insp-2014-q47.png","./figuras/insp-2014-q52.png","./figuras/insp-2014-q56.png","./figuras/insp-2014-q70.png","./figuras/insp-2014-q70.png","./figuras/insp-2018-q38.png","./figuras/insp-2018-q43.png","./figuras/insp-2018-q49.png","./figuras/insp-2018-q52.png","./figuras/insp-2018-q53.png","./figuras/mec-2010-q26.png","./figuras/mec-2010-q27.png","./figuras/mec-2010-q31.png","./figuras/mec-2010-q32.png","./figuras/mec-2010-q38.png","./figuras/mec-2010-q42.png","./figuras/mec-2010-q55.png","./figuras/mec-2010-q59.png","./figuras/mec-2010-q61.png","./figuras/mec-2012-q27.png","./figuras/mec-2012-q33.png","./figuras/mec-2012-q36.png","./figuras/mec-2012-q46.png","./figuras/mec-2012-q53.png","./figuras/mec-2012-q56.png","./figuras/mec-2015-q26.png","./figuras/mec-2015-q27.png","./figuras/mec-2015-q28.png","./figuras/mec-2015-q56.png","./figuras/mec-2015-q57.png","./figuras/mec-2023-q36.png","./figuras/mec-2023-q37.png","./figuras/mec-2023-q40.png","./figuras/mec-2023-q43.png","./figuras/mec-2023-q45.png","./figuras/mec-2023-q48.png","./figuras/mec-2023-q49.png","./figuras/mec-2023-q60.png","./figuras/mec-2023-q62.png","./figuras/mec-2023-q63.png","./figuras/prod-2018-q36.png","./figuras/prod-2018-q39.png","./figuras/prod-2018-q60.png","./figuras/proj-2011-q49.png","./figuras/proj-2011-q53.png","./figuras/proj-2011-q58.png","./figuras/proj-2011-q65.png"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQ)).then(() => self.skipWaiting()));
});
/* Ao ativar uma versão nova: apaga os caches velhos, assume o controle e
   RECARREGA as janelas abertas. Sem esse recarregamento, quem já tinha o
   app aberto continuava vendo a versão anterior — foi assim que uma trilha
   recém-publicada simplesmente não apareceu para quem já usava o app. */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(js => js.forEach(c => { try { c.navigate(c.url); } catch (_) {} }))
  );
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
