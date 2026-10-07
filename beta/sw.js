/* Service worker de la beta: primero la red (para ver siempre lo último), caché si no hay conexión. */
const CACHE = 'taller-beta-1.1.0-beta.1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('taller-beta-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.endsWith('/version.json')) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try { const r = await fetch(req, {cache: 'no-cache'}); if (r.ok) c.put(req, r.clone()); return r; }
    catch { return (await c.match(req, {ignoreSearch: true})) || (req.mode === 'navigate' ? await c.match('./index.html') || await c.match('./') : Response.error()); }
  })());
});
