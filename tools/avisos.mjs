// Avisos del Taller 7L: lo ejecuta GitHub Actions cada hora.
// Lee el resumen público que guarda la app en Firestore (colección «avisos») y, a la hora elegida,
// manda las notificaciones push, el correo y el mensaje de Telegram que toquen.
import webpush from 'web-push';
import nodemailer from 'nodemailer';

const APP = 'https://q2lummox.github.io/touareg-taller/beta/';
const VAPID_PUBLIC = 'BCv5LnZwcZ5M50flqtBHcK5341-QVIl9NJ2Ye0SNW6Bf6U06G5gLHj8eYYixjFxVQagFIcEP4To-0-2p79hH5Ik';
const E = process.env, PRUEBA = String(E.PRUEBA || '') === 'true';
const URL_AVISOS = 'https://firestore.googleapis.com/v1/projects/touareg-taller/databases/%28default%29/documents/avisos?pageSize=200';

const val = v => v == null ? null : 'stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue) : 'doubleValue' in v ? v.doubleValue
  : 'booleanValue' in v ? v.booleanValue : 'nullValue' in v ? null : 'arrayValue' in v ? (v.arrayValue.values || []).map(val) : 'mapValue' in v ? obj(v.mapValue.fields || {}) : null;
const obj = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, val(v)]));

const r = await fetch(URL_AVISOS);
if (!r.ok) { console.error('No se pudo leer Firestore', r.status, await r.text()); process.exit(1); }
const docs = Object.fromEntries(((await r.json()).documents || []).map(d => [d.name.split('/').pop(), obj(d.fields || {})]));
const res = docs.resumen || {}, cfg = docs.config || {};
const subs = Object.entries(docs).filter(([k]) => k.startsWith('push_')).map(([k, d]) => ({ id: k, sub: JSON.parse(d.sub || '{}') }));
const C = {
  hora: cfg.hora ?? 9, diaSemanal: cfg.diaSemanal ?? 1, antelacion: cfg.antelacion || [30, 15, 7, 1, 0],
  canales: Object.assign({ mant: ['push', 'email', 'telegram'], docs: ['push', 'email', 'telegram'], compras: ['push'], semanal: ['email', 'telegram'] }, cfg.canales || {}),
};

/* hora y fecha en Madrid */
const now = new Date();
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false, weekday: 'short' }).formatToParts(now).map(p => [p.type, p.value]));
const hora = Number(parts.hour) % 24, hoy = `${parts.year}-${parts.month}-${parts.day}`;
const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
if (!PRUEBA && hora !== Number(C.hora)) { console.log(`Son las ${hora} h en Madrid; los avisos salen a las ${C.hora} h. Nada que hacer.`); process.exit(0); }
const semanal = PRUEBA || dow === Number(C.diaSemanal);

const days = d => Math.round((new Date(d + 'T12:00:00Z') - new Date(hoy + 'T12:00:00Z')) / 864e5);
const nf = n => Number(n).toLocaleString('es-ES');
const fmt = d => d ? d.split('-').reverse().join('/') : '';
const km = Number(res.kmActual) || 0;
const toca = d => PRUEBA || C.antelacion.includes(d) || (d < 0 && (-d) % 7 === 0);   // en los días elegidos, y cada semana si ya venció

/* qué hay pendiente */
const mant = [], docsA = [], compras = [], resumen = [];
for (const it of res.mantenimiento || []) {
  const d = it.proximaFecha ? days(it.proximaFecha) : null, k = (it.proximoKm != null && km) ? it.proximoKm - km : null;
  const venc = (d != null && d <= 0) || (k != null && k <= 0), prox = !venc && ((d != null && d <= 30) || (k != null && k <= 1500));
  if (!venc && !prox) continue;
  const txt = `${it.nombre}: ${[d != null ? (d < 0 ? `venció hace ${-d} días` : d === 0 ? 'vence hoy' : `en ${d} días (${fmt(it.proximaFecha)})`) : '', k != null ? (k <= 0 ? `pasado ${nf(-k)} km` : `faltan ${nf(k)} km`) : ''].filter(Boolean).join(' · ')}`;
  resumen.push((venc ? '🔴 ' : '🟠 ') + txt);
  if (d != null && toca(d)) mant.push((venc ? '🔴 ' : '🟠 ') + txt);
}
for (const dc of res.documentos || []) {
  if (!dc.caduca) continue; const d = days(dc.caduca); if (d > 30) continue;
  const txt = `${dc.tipo}${dc.nombre ? ' · ' + dc.nombre : ''}: ${d < 0 ? `caducó hace ${-d} días` : d === 0 ? 'caduca hoy' : `caduca en ${d} días (${fmt(dc.caduca)})`}`;
  resumen.push((d <= 0 ? '🔴 ' : '🟠 ') + txt); if (toca(d)) docsA.push((d <= 0 ? '🔴 ' : '🟠 ') + txt);
}
for (const c of res.compras || []) {
  const d = c.fechaCompra ? -days(c.fechaCompra) : 0;
  const txt = `${c.nombre}: comprado el ${fmt(c.fechaCompra)}, sin montar`;
  resumen.push('🛒 ' + txt); if (PRUEBA || (d >= 14 && d % 7 === 0)) compras.push('🛒 ' + txt);
}
if (res.porComprar) resumen.push(`📝 ${res.porComprar} artículo(s) en la lista de la compra`);

/* mensajes por canal */
const out = { push: [], email: [], telegram: [] };
const add = (tipo, titulo, lineas, url) => { if (!lineas.length) return; for (const ch of C.canales[tipo] || []) out[ch]?.push({ titulo, lineas, url }); };
add('mant', 'Mantenimiento', mant, APP + '#mant');
add('docs', 'Documentación', docsA, APP + '#papeles');
add('compras', 'Compras sin montar', compras, APP + '#mant');
if (semanal) add('semanal', 'Resumen semanal', resumen.length ? resumen : ['✅ Todo al día. Nada vencido ni próximo.'], APP);
if (PRUEBA) for (const ch of Object.keys(out)) if (!out[ch].length) out[ch].push({ titulo: 'Aviso de prueba', lineas: ['✅ Este canal funciona. Todo al día.'], url: APP });
console.log(`Avisos: push ${out.push.length}, correo ${out.email.length}, Telegram ${out.telegram.length}`);

/* push */
if (out.push.length) {
  if (!E.VAPID_PRIVATE) console.log('Push: falta el secreto VAPID_PRIVATE');
  else if (!subs.length) console.log('Push: no hay dispositivos suscritos');
  else {
    webpush.setVapidDetails('mailto:' + (E.EMAIL_TO || E.GMAIL_USER || 'avisos@example.com'), VAPID_PUBLIC, E.VAPID_PRIVATE);
    for (const m of out.push) for (const s of subs) {
      try { await webpush.sendNotification(s.sub, JSON.stringify({ title: '🔧 ' + m.titulo, body: m.lineas.slice(0, 4).join('\n') + (m.lineas.length > 4 ? `\n…y ${m.lineas.length - 4} más` : ''), url: m.url, tag: m.titulo })); console.log('Push enviado a', s.id); }
      catch (e) { console.log('Push falló en', s.id, e.statusCode || e.message); }
    }
  }
}
/* correo */
if (out.email.length) {
  if (!E.GMAIL_USER || !E.GMAIL_APP_PASSWORD) console.log('Correo: faltan GMAIL_USER / GMAIL_APP_PASSWORD');
  else {
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user: E.GMAIL_USER, pass: E.GMAIL_APP_PASSWORD } });
    const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#14171b;color:#e9edf1;border-radius:12px;padding:20px">
      <h2 style="margin:0 0 4px;color:#f39a1e;letter-spacing:.05em">TALLER 7L</h2><p style="margin:0 0 16px;color:#9aa4ae">Touareg 7L · 9905 CMY</p>
      ${out.email.map(m => `<h3 style="margin:16px 0 6px;color:#fff">${esc(m.titulo)}</h3><ul style="margin:0;padding-left:18px;line-height:1.6">${m.lineas.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`).join('')}
      <p style="margin:22px 0 0"><a href="${APP}" style="background:#f39a1e;color:#1a1003;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Abrir la app</a></p></div>`;
    try { await t.sendMail({ from: `Taller 7L <${E.GMAIL_USER}>`, to: E.EMAIL_TO || E.GMAIL_USER, subject: '🔧 Taller 7L · ' + out.email.map(m => m.titulo).join(' · '), html, text: out.email.map(m => m.titulo + '\n' + m.lineas.join('\n')).join('\n\n') + '\n\n' + APP }); console.log('Correo enviado'); }
    catch (e) { console.log('Correo falló:', e.message); }
  }
}
/* Telegram */
if (out.telegram.length) {
  if (!E.TELEGRAM_TOKEN) console.log('Telegram: falta TELEGRAM_TOKEN');
  else {
    const TK = E.TELEGRAM_TOKEN.trim();
    let chat = (E.TELEGRAM_CHAT_ID || '').trim();
    const me = await (await fetch(`https://api.telegram.org/bot${TK}/getMe`)).json().catch(e => ({ ok: false, description: e.message }));
    if (!me.ok) console.log('Telegram: el TOKEN no es válido →', me.description, '(revisa el secreto TELEGRAM_TOKEN: debe ser 123456789:ABC… sin espacios)');
    else console.log('Telegram: bot correcto @' + me.result.username);
    if (me.ok && !chat) {
      const u = await (await fetch(`https://api.telegram.org/bot${TK}/getUpdates`)).json().catch(e => ({ ok: false, description: e.message }));
      if (!u.ok) console.log('Telegram: getUpdates falló →', u.description);
      chat = (u.result || []).map(x => (x.message || x.edited_message || x.my_chat_member || x.channel_post)?.chat?.id).filter(Boolean).pop();
      console.log(chat ? 'Telegram: chat detectado ' + chat + ' (guárdalo como secreto TELEGRAM_CHAT_ID para que no dependa de esto)' : `Telegram: el bot no tiene mensajes recientes (${(u.result || []).length}). Abre @${me.result.username} en Telegram, pulsa Iniciar o escribe /start y vuelve a lanzar la prueba`);
    }
    if (!me.ok || !chat) {}
    else for (const m of out.telegram) {
      const text = `🔧 <b>Taller 7L · ${m.titulo}</b>\n\n${m.lineas.join('\n')}\n\n<a href="${m.url}">Abrir la app</a>`;
      const rr = await fetch(`https://api.telegram.org/bot${TK}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true }) });
      console.log('Telegram', rr.ok ? 'enviado' : 'falló ' + (await rr.text()));
    }
  }
}
