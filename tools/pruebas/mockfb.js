/* Firebase simulado en memoria con la MISMA interfaz que fb.js (sin métodos extra: si la app llama a algo
   que el real no tiene, aquí también falla). Datos en window.__store (Map ruta→objeto). */
const store = new Map(), listeners = new Map(), blobs = new Map();
if(window.__preStore) for(const [p, v] of Object.entries(window.__preStore)) store.set(p, JSON.parse(JSON.stringify(v)));
window.__store = store; window.__blobs = blobs; window.__writes = [];
const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
let seq = 0; const newId = () => 'm' + Date.now().toString(36) + (seq++).toString(36);
const colOf = p => p.split('/').slice(0, -1).join('/');
function emit(colPath){
  for(const [k, set] of listeners){ if(k === colPath || k === 'doc:' + colPath) {} }
  const cl = listeners.get(colPath); if(cl) for(const cb of cl) deliverCol(colPath, cb);
}
function docsOf(colPath){ const out = []; for(const [p, v] of store){ if(colOf(p) === colPath) out.push({id: p.split('/').pop(), data: () => clone(v)}); } return out; }
function deliverCol(colPath, cb){ queueMicrotask(() => { try{ cb({docs: docsOf(colPath)}); }catch(e){ console.error('onSnapshot cb', e); } }); }
function deliverDoc(path, cb){ queueMicrotask(() => { const v = store.get(path); try{ cb({exists: store.has(path), id: path.split('/').pop(), data: () => clone(v)}); }catch(e){ console.error('onSnapshot doc cb', e); } }); }
function write(path, data){
  if(data === undefined) throw new Error('set(undefined)');
  const bad = JSON.stringify(data, (k, v) => (typeof v === 'number' && !isFinite(v)) ? '__NONFINITE__' : v);
  if(bad.includes('__NONFINITE__')) console.warn('MOCK: valor no finito guardado en ' + path);
  store.set(path, clone(data)); window.__writes.push(['set', path]);
  emit(colOf(path)); const dl = listeners.get('doc:' + path); if(dl) for(const cb of dl) deliverDoc(path, cb);
}
function del(path){ store.delete(path); window.__writes.push(['del', path]); emit(colOf(path)); const dl = listeners.get('doc:' + path); if(dl) for(const cb of dl) deliverDoc(path, cb); }
const on = (k, cb) => { if(!listeners.has(k)) listeners.set(k, new Set()); listeners.get(k).add(cb); return () => listeners.get(k).delete(cb); };
const wrapDoc = path => ({
  set: data => { write(path, data); return Promise.resolve(); },
  delete: () => { del(path); return Promise.resolve(); },
  onSnapshot: (cb, e) => { const u = on('doc:' + path, cb); deliverDoc(path, cb); return u; },
  get: async () => ({exists: store.has(path), id: path.split('/').pop(), data: () => clone(store.get(path))}),
});
const db = {
  collection: name => ({
    doc: id => { if(id == null || id === '') throw new Error('doc() sin id en ' + name); return wrapDoc(name + '/' + id); },
    add: data => { const id = newId(); write(name + '/' + id, data); return Promise.resolve({id}); },
    onSnapshot: (cb, e) => { const u = on(name, cb); deliverCol(name, cb); return u; },
  }),
  doc: path => wrapDoc(path),
};
const urls = new Map();
const assets = {
  async upload(blob, opts = {}){ const type = opts.type || blob.type || 'application/octet-stream'; const id = newId(); blobs.set(id, blob); const url = URL.createObjectURL(blob); urls.set(id, url); return {id, url, sizeBytes: blob.size, contentType: type}; },
  async delete(id){ blobs.delete(id); urls.delete(id); return {deleted: true}; },
};
async function blobGet(id){ if(!blobs.has(id)) throw new Error('archivo no encontrado'); return blobs.get(id); }
async function blobURL(id){ if(urls.has(id)) return urls.get(id); const u = URL.createObjectURL(await blobGet(id)); urls.set(id, u); return u; }
async function blobPut(id, blob){ blobs.set(id, blob); return {id}; }
async function blobExists(id){ return blobs.has(id); }
async function blobThumb(id){ return blobURL(id); }
const user = {uid: 'test', displayName: 'Sergio Prueba', email: 'sergio@example.com', photoURL: null};
const authKnown = Promise.resolve();
async function seedIfEmpty(seed){ if(store.has('config/coche')) return false; for(const [col, docs] of Object.entries(seed)) for(const [id, data] of Object.entries(docs)) write(col + '/' + id, data); return true; }
window.FB = {db, assets, blobGet, blobURL, blobThumb, blobPut, blobExists, signIn: async () => {}, signOut: async () => {}, whenUser: () => Promise.resolve(user), authKnown, user: () => user, seedIfEmpty};
setTimeout(() => window.dispatchEvent(new CustomEvent('fb-user', {detail: user})), 0);
window.dispatchEvent(new Event('fb-ready'));
