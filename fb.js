/* Conexión con Firebase: inicio de sesión con Google, Firestore con caché sin conexión
   y almacén de archivos (fotos, facturas, escaneos) troceado dentro de Firestore. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut as fbSignOut, browserLocalPersistence, setPersistence } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, onSnapshot, setDoc, deleteDoc, getDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(()=>{});
let fs;
try{ fs = initializeFirestore(app, {ignoreUndefinedProperties:true, localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})}); }
catch(e){ console.warn('Sin caché persistente', e); fs = initializeFirestore(app, {ignoreUndefinedProperties:true}); }

const logErr = e => console.error('Base de datos: '+(e?.code||e?.message||e));
/* Las escrituras se aplican al instante en local y se suben cuando hay conexión:
   no se espera a la confirmación del servidor (sin conexión no llegaría nunca). */
const wrapDoc = ref => ({
  set: data => { setDoc(ref, data).catch(logErr); return Promise.resolve(); },
  delete: () => { deleteDoc(ref).catch(logErr); return Promise.resolve(); },
  onSnapshot: (cb, e) => onSnapshot(ref, d => cb({exists: d.exists(), id: d.id, data: () => d.data()}), e || logErr),
  get: async () => { const d = await getDoc(ref); return {exists: d.exists(), id: d.id, data: () => d.data()}; },
});
const db = {
  collection: name => ({
    doc: id => wrapDoc(doc(fs, name, id)),
    add: data => { const r = doc(collection(fs, name)); setDoc(r, data).catch(logErr); return Promise.resolve({id: r.id}); },
    onSnapshot: (cb, e) => onSnapshot(collection(fs, name), s => cb({docs: s.docs.map(d => ({id: d.id, data: () => d.data()}))}), e || logErr),
  }),
  doc: path => wrapDoc(doc(fs, ...path.split('/'))),
};

/* ---------- archivos troceados en Firestore (1 MiB por documento) ---------- */
const CH = 700 * 1024, urls = new Map(), thumbs = new Map();
const toB64 = u => { let s=''; for(let i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null, u.subarray(i, i+0x8000)); return btoa(s); };
const fromB64 = b => { const s=atob(b), u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; };
async function compressImage(blob){
  try{
    const bmp = await createImageBitmap(blob);
    let max = 1800, q = .82, out = null;
    for(let k=0;k<5;k++){
      const sc = Math.min(1, max/Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width*sc); c.height = Math.round(bmp.height*sc);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      out = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
      if(out && out.size < 650*1024) break;
      max *= .8; q -= .08;
    }
    return out || blob;
  }catch{ return blob; }
}
async function makeThumb(blob){
  try{
    const bmp = await createImageBitmap(blob), sc = Math.min(1, 360/Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width*sc); c.height = Math.round(bmp.height*sc);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .7);
  }catch{ return null; }
}
const assets = {
  async upload(blob, opts = {}){
    let type = opts.type || blob.type || 'application/octet-stream', b = blob;
    if(/^image\//.test(type) && type !== 'image/gif' && type !== 'image/svg+xml'){ b = await compressImage(blob); type = 'image/jpeg'; }
    const buf = new Uint8Array(await b.arrayBuffer());
    if(buf.length > 40*1024*1024) throw {code:'too_large'};
    const id = doc(collection(fs, 'blobs')).id, n = Math.max(1, Math.ceil(buf.length/CH));
    for(let i=0;i<n;i++) setDoc(doc(fs, 'blobs', id, 'c', String(i).padStart(3,'0')), {d: toB64(buf.subarray(i*CH, (i+1)*CH))}).catch(logErr);
    const th = /^image\//.test(type) ? await makeThumb(b) : null;
    setDoc(doc(fs, 'blobs', id), {tipo: type, size: buf.length, n, fecha: new Date().toISOString(), ...(th ? {th} : {})}).catch(logErr);
    if(th) thumbs.set(id, th);
    const url = URL.createObjectURL(new Blob([buf], {type})); urls.set(id, url);
    return {id, url, sizeBytes: buf.length, contentType: type};
  },
  async delete(id){
    const meta = await getDoc(doc(fs, 'blobs', id));
    const n = meta.exists() ? (meta.data().n || 1) : 0;
    for(let i=0;i<n;i++) deleteDoc(doc(fs, 'blobs', id, 'c', String(i).padStart(3,'0'))).catch(logErr);
    deleteDoc(doc(fs, 'blobs', id)).catch(logErr);
    urls.delete(id); return {deleted: true};
  },
};
async function blobGet(id){
  const meta = await getDoc(doc(fs, 'blobs', id)); if(!meta.exists()) throw new Error('archivo no encontrado');
  const m = meta.data(), parts = await getDocs(collection(fs, 'blobs', id, 'c'));
  const chunks = parts.docs.sort((a,b) => a.id.localeCompare(b.id)).map(d => fromB64(d.data().d));
  return new Blob(chunks, {type: m.tipo || 'application/octet-stream'});
}
async function blobURL(id){
  if(urls.has(id)) return urls.get(id);
  const url = URL.createObjectURL(await blobGet(id)); urls.set(id, url); return url;
}

/* miniatura guardada junto a los datos del archivo: una sola lectura y pocos KB */
async function blobThumb(id){
  if(thumbs.has(id)) return thumbs.get(id);
  if(urls.has(id)) return urls.get(id);
  const meta = await getDoc(doc(fs, 'blobs', id)); if(!meta.exists()) throw new Error('archivo no encontrado');
  const th = meta.data().th; if(th){ thumbs.set(id, th); return th; }
  return blobURL(id);
}

/* ---------- sesión ---------- */
let user = null; const waiters = []; let authOk; const authKnown = new Promise(r => authOk = r);
onAuthStateChanged(auth, u => { user = u; authOk(); window.dispatchEvent(new CustomEvent('fb-user', {detail: u})); if(u) while(waiters.length) waiters.shift()(u); });
getRedirectResult(auth).catch(e => { if(e?.code) console.warn('Inicio de sesión:', e.code); });
async function signIn(){
  const p = new GoogleAuthProvider(); p.setCustomParameters({prompt: 'select_account'});
  try{ await signInWithPopup(auth, p); }
  catch(e){
    if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment','auth/cancelled-popup-request','auth/web-storage-unsupported'].includes(e?.code)) return signInWithRedirect(auth, p);
    throw e;
  }
}
const whenUser = () => user ? Promise.resolve(user) : new Promise(r => waiters.push(r));
async function seedIfEmpty(seed){
  const d = await getDoc(doc(fs, 'config', 'coche')).catch(() => null);
  if(d && d.exists()) return false;
  for(const [col, docs] of Object.entries(seed)) for(const [id, data] of Object.entries(docs)) setDoc(doc(fs, col, id), data).catch(logErr);
  return true;
}
window.FB = {db, assets, blobGet, blobURL, blobThumb, signIn, signOut: () => fbSignOut(auth), whenUser, authKnown, user: () => user, seedIfEmpty};
window.dispatchEvent(new Event('fb-ready'));
