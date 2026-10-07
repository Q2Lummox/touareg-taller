/* Service worker de la beta.
   - Al instalarse guarda la app, el modelo comprimido y las librerías (three.js, Firebase, fuentes):
     así funciona sin conexión desde la primera vez.
   - La app y el modelo: primero la red (para ver siempre lo último; si no cambió, es una respuesta 304 mínima).
   - Librerías de CDN (direcciones con versión fija): primero la caché. */
const CACHE = 'taller-beta-1.1.3-beta', LIBS = 'taller-libs';
const T = 'https://cdn.jsdelivr.net/npm/three@0.160.0/', FBJ = 'https://www.gstatic.com/firebasejs/10.12.2/';
const CORE = ['./', './index.html', './fb.js', './firebase-config.js', './touareg.json', './touareg-geo.txt', '../seed.json', './manifest.webmanifest',
  '../icons/icon-192.png', '../icons/apple-touch-icon.png', ...Array.from({length: 15}, (_, i) => `./tex_${i}.webp`),
  ...['brick','floor','plate'].flatMap(n => ['diff','nor','rough'].map(k => `./garage/${n}_${k}.webp`))];
const CDN = [T + 'build/three.module.js',
  ...['controls/OrbitControls.js', 'loaders/GLTFLoader.js', 'environments/RoomEnvironment.js', 'postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js',
      'postprocessing/OutputPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/OutlinePass.js', 'postprocessing/MaskPass.js', 'postprocessing/Pass.js',
      'shaders/CopyShader.js', 'shaders/OutputShader.js', 'objects/Reflector.js', 'utils/BufferGeometryUtils.js'].map(f => T + 'examples/jsm/' + f),
  FBJ + 'firebase-app.js', FBJ + 'firebase-auth.js', FBJ + 'firebase-firestore.js'];
const CDN_HOSTS = ['cdn.jsdelivr.net', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(CACHE), l = await caches.open(LIBS);
  await Promise.allSettled(CORE.map(u => c.add(new Request(u, {cache: 'reload'}))));
  await Promise.allSettled(CDN.map(async u => { if (!(await l.match(u))) await l.add(u); }));
  self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('taller-beta-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith((async () => {
      const l = await caches.open(LIBS), hit = await l.match(req);
      if (hit) return hit;
      try { const r = await fetch(req); if (r.ok || r.type === 'opaque') l.put(req, r.clone()); return r; } catch { return Response.error(); }
    })());
    return;
  }
  if (url.origin !== location.origin || url.pathname.endsWith('/version.json')) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try { const r = await fetch(req, {cache: 'no-cache'}); if (r.ok) c.put(req, r.clone()); return r; }
    catch { return (await c.match(req, {ignoreSearch: true})) || (req.mode === 'navigate' ? (await c.match('./index.html')) || (await c.match('./')) : Response.error()); }
  })());
});

/* notificaciones push enviadas por la tarea diaria de GitHub */
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = {title: 'Taller 7L', body: e.data?.text() || ''}; }
  e.waitUntil(self.registration.showNotification(d.title || '🔧 Taller 7L', {body: d.body || '', tag: d.tag || 'taller', icon: '../icons/icon-192.png', badge: '../icons/icon-192.png', data: {url: d.url || './'}}));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './';
  e.waitUntil((async () => {
    const all = await clients.matchAll({type: 'window', includeUncontrolled: true});
    for (const c of all) if (c.url.includes('/beta/')) { await c.focus(); c.navigate?.(url); return; }
    await clients.openWindow(url);
  })());
});
