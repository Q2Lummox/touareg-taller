/* Service worker: la app funciona sin conexión y se actualiza cuando el usuario lo pide. */
const VERSION = '1.0.3';
const CACHE = 'taller-' + VERSION;
const CDN = 'taller-cdn';
const CORE = [
  './', './index.html', './fb.js', './firebase-config.js', './manifest.webmanifest', './seed.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  './touareg.json', './touareg-geo.txt',
  ...Array.from({length: 15}, (_, i) => `./tex_${i}.png`),
];
const CDN_HOSTS = ['cdn.jsdelivr.net', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, {cache: 'reload'})))));
  // la primera instalación se activa sola; las actualizaciones esperan a que el usuario pulse «Actualizar»
  if(!self.registration.active) self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for(const k of await caches.keys()) if(k.startsWith('taller-') && k !== CACHE && k !== CDN) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => { if(e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request; if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin === location.origin){
    if(url.pathname.endsWith('/version.json')) return;            // siempre de la red: así se detectan versiones nuevas
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req, {ignoreSearch: true}) || (req.mode === 'navigate' ? await c.match('./index.html') : null);
      if(hit) return hit;
      try{ const r = await fetch(req); if(r.ok) c.put(req, r.clone()); return r; }
      catch{ return req.mode === 'navigate' ? (await c.match('./index.html')) : Response.error(); }
    })());
    return;
  }
  if(CDN_HOSTS.includes(url.hostname)){
    e.respondWith((async () => {
      const c = await caches.open(CDN), hit = await c.match(req);
      const net = fetch(req).then(r => { if(r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
  }
});
