
// PWA public build with i18n & media (v2.1.0)
const CACHE='rdc-public-i18n-v2.1.0';
const ASSETS=['./','./index.html','./styles.css','./app.js','./i18n.js','./i18n-ar.json','./i18n-en.json','./card-render.js','./manifest.json','./icon-192.png','./icon-512.png','./cards-public.json'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);try{await c.addAll(ASSETS);}catch(e){}self.skipWaiting();})())});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))) });
// runtime: prefer network for cards-public.json and i18n JSON
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.pathname.endsWith('/cards-public.json') || url.pathname.endsWith('/i18n-ar.json') || url.pathname.endsWith('/i18n-en.json')){
    e.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{ const res=await fetch(e.request); cache.put(e.request, res.clone()); return res; }
      catch{ const hit=await cache.match(e.request); if(hit) return hit; throw new Error('offline and no cache'); }
    })());
    return;
  }
  // don't precache large media; let them stream normally
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
