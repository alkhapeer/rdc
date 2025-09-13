
// RDC public PWA (pro v3.3.0)
const CACHE='rdc-public-pro-v3.3.0';
const ASSETS=['./','./index.html','./styles.css','./app.js','./i18n.js','./i18n-ar.json','./i18n-en.json','./card-render.js','./manifest.json','./icon-192.png','./icon-512.png','./cards-public.json'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);try{await c.addAll(ASSETS);}catch(e){}self.skipWaiting();})())});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))) });
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.pathname.endsWith('/cards-public.json')||url.pathname.endsWith('/i18n-ar.json')||url.pathname.endsWith('/i18n-en.json')||url.pathname.endsWith('/partners.json')){
    e.respondWith((async()=>{const c=await caches.open(CACHE); try{const r=await fetch(e.request,{cache:'no-store'}); c.put(e.request,r.clone()); return r;}catch{const h=await c.match(e.request); if(h) return h; throw new Error('offline');}})()); return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
