/* Flujos completos: crear, editar, marcar, terminar, importar, copia… con comprobación sobre los datos guardados.
   node flows.mjs [nombreFlujo] */
import {start, appErrs} from './run.mjs';
import fs from 'fs';
const only = process.argv[2];
const res = [];
const ok = (f, cond, msg) => { res.push([f, cond ? 'OK ' : 'FALLO', msg]); };
const W = ms => new Promise(r => setTimeout(r, ms));
const vis = `e=>e && e.offsetParent!==null`;
async function clickText(p, re, scope = 'body'){ return p.evaluate(([re, scope]) => { const R = new RegExp(re); const b = [...document.querySelectorAll(scope + ' button, ' + scope + ' [role=button], ' + scope + ' .vrow, ' + scope + ' a')].filter(e => e.offsetParent !== null && R.test(e.textContent.trim())).pop(); if(b){ b.scrollIntoView({block: 'center'}); b.click(); return b.textContent.trim().slice(0, 40); } return null; }, [re, scope]); }
async function fill(p, sel, v){ return p.evaluate(([sel, v]) => { const e = [...document.querySelectorAll(sel)].filter(e => e.offsetParent !== null || e.type === 'hidden').pop(); if(!e) return false; e.focus(); if(e.tagName === 'SELECT'){ e.value = v; } else e.value = v; e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); return true; }, [sel, v]); }
const st = (p, f) => p.evaluate(f);
const flows = {
  async km(p){
    await p.evaluate(() => __v3.tab('hoy')); await W(800);
    await p.evaluate(() => document.querySelector('.vh-hero .vkm, .vkm')?.click()); await W(600);
    ok('km', await fill(p, '#qkIn', '272950'), 'abre la hoja de km');
    await p.evaluate(() => document.querySelector('#qkOk')?.click()); await W(900);
    const k = await st(p, () => __v3.x.S.cfg.kmActual); ok('km', k === 272950, 'km guardados: ' + k);
    const log = await st(p, () => [...__store.keys()].filter(x => x.startsWith('kmlog/')).length); ok('km', log >= 3, 'historial de km: ' + log);
    // bajar los km por error
    await p.evaluate(() => document.querySelector('.vkm')?.click()); await W(500); await fill(p, '#qkIn', '27295'); p.__dialogs = [];
    await p.evaluate(() => document.querySelector('#qkOk')?.click()); await W(800);
    const k2 = await st(p, () => __v3.x.S.cfg.kmActual); ok('km', k2 !== 27295 || (p.__dialogs || []).length, 'teclear menos km (27.295) avisa o no se guarda: guardado=' + k2 + ' avisos=' + (p.__dialogs || []).length);
  },
  async intervencion(p){
    const n0 = await st(p, () => __v3.x.S.int.length);
    await p.evaluate(() => __v3.go('intform')); await W(900);
    const form = await st(p, () => [...document.querySelectorAll('.v3pg.on input, .v3pg.on select, .v3pg.on textarea')].map(e => (e.name || e.id || e.className) + ':' + e.type).join(' '));
    res.push(['intervencion', 'INFO', form.slice(0, 300)]);
    await fill(p, '.v3pg.on textarea', 'Cambio de manguito superior');
    await fill(p, '.v3pg.on input[name=coste], .v3pg.on #ifCoste, .v3pg.on input[inputmode=decimal]', '45');
    const c = await clickText(p, '^(Guardar|Registrar)', '.v3pg.on'); await W(1200);
    const n1 = await st(p, () => __v3.x.S.int.length); ok('intervencion', n1 === n0 + 1, `guardar intervención (${c}) ${n0}→${n1}`);
    const last = await st(p, () => { const L = [...__v3.x.S.int].sort((a, b) => (b.creado || b.fecha || '').localeCompare(a.creado || a.fecha || '')); return L.find(x => /manguito/.test(x.descripcion || '')); });
    ok('intervencion', last && last.fecha && last.km != null, 'tiene fecha y km: ' + JSON.stringify(last).slice(0, 160));
  },
  async repostaje(p){
    const n0 = await st(p, () => __v3.x.S.v2.repostajes.length);
    await p.evaluate(() => __v3.go('repost')); await W(800); await clickText(p, 'Añadir repostaje'); await W(700);
    await fill(p, '#rf_km', '273400'); await fill(p, '#rf_litros', '60'); await fill(p, '#rf_precioL', '1.40');
    const tot = await st(p, () => document.querySelector('#rf_total')?.value); res.push(['repostaje', 'INFO', 'total calculado solo: ' + tot]);
    await p.evaluate(() => document.querySelector('.recf [data-a=ok]')?.click()); await W(1000);
    const n1 = await st(p, () => __v3.x.S.v2.repostajes.length); ok('repostaje', n1 === n0 + 1, `guardar repostaje ${n0}→${n1}`);
    const r = await st(p, () => __v3.x.S.v2.repostajes.find(x => +x.km === 273400)); ok('repostaje', r && Math.abs((+r.total || 0) - 84) < .6, 'total = litros × precio: ' + JSON.stringify(r).slice(0, 200));
    const km = await st(p, () => __v3.x.S.cfg.kmActual); ok('repostaje', km >= 273400, 'el repostaje sube el cuentakilómetros: ' + km);
  },
  async averia(p){
    const n0 = await st(p, () => __v3.x.S.ave.length);
    await p.evaluate(() => __v3.go('averias')); await W(800);
    await p.evaluate(() => document.querySelector('.v3bar .v3act .pri, .v3bar .v3act button')?.click()); await W(900);
    await fill(p, '.vave-f [name=sintoma]', 'Ruido al girar'); await fill(p, '.vave-f [name=codigo]', 'p0299');
    await clickText(p, '^Registrar avería'); await W(1000);
    const a = await st(p, () => __v3.x.S.ave.find(x => x.sintoma === 'Ruido al girar')); ok('averia', !!a && a.codigo === 'P0299', 'registrar avería (código en mayúsculas): ' + JSON.stringify(a).slice(0, 150));
    await p.evaluate(() => { const c = [...document.querySelectorAll('.vave')].find(x => /Ruido al girar/.test(x.textContent)); [...c.querySelectorAll('.vacts button')].find(b => /Resuelta/.test(b.textContent))?.click(); }); await W(900);
    const a2 = await st(p, () => __v3.x.S.ave.find(x => x.sintoma === 'Ruido al girar')); ok('averia', a2?.estado === 'resuelta', 'marcar resuelta: ' + a2?.estado);
  },
  async compra(p){
    await p.evaluate(() => __v3.go('compra_pend')); await W(800);
    await fill(p, '.v3pg.on .vqadd input:not(.vqn)', 'Filtro de gasoil'); await p.evaluate(() => document.querySelector('.v3pg.on .vqadd button').click()); await W(900);
    let c = await st(p, () => __v3.x.S.compras.find(x => x.nombre === 'Filtro de gasoil')); ok('compra', c?.estado === 'pendiente', 'añadir rápido a la lista');
    await p.evaluate(() => { const r = [...document.querySelectorAll('.v3pg.on .cmpi, .v3pg.on .vrow')].find(x => /Filtro de gasoil/.test(x.textContent)); (r.querySelector('.cmpb, .tx, .vtx') || r).click(); }); await W(800);
    await fill(p, '#cpP', '19.90'); await fill(p, '#cpT', 'Autodoc'); await p.evaluate(() => document.querySelector('#cpOk').click()); await W(900);
    c = await st(p, () => __v3.x.S.compras.find(x => x.nombre === 'Filtro de gasoil')); ok('compra', c?.estado === 'comprado' && +c.precio === 19.9, 'marcar comprado con precio: ' + JSON.stringify(c).slice(0, 160));
    await p.evaluate(() => __v3.go('compra_comp')); await W(800);
    await p.evaluate(() => { const r = [...document.querySelectorAll('.v3pg.on .cmpi, .v3pg.on .vrow, .v3pg.on .r2')].find(x => /Filtro de gasoil/.test(x.textContent)); [...r.querySelectorAll('button')].find(b => /Montar/.test(b.textContent))?.click(); }); await W(800);
    const t = await clickText(p, '^(Montado|Marcar como montado|Guardar)', '#sheet2'); await W(900);
    c = await st(p, () => __v3.x.S.compras.find(x => x.nombre === 'Filtro de gasoil')); ok('compra', c?.estado === 'montado', `montar (${t}): ` + c?.estado);
    // gastos: la compra cuenta
    const g = await st(p, () => { __v3.tab('gastos'); return 1; }); await W(900);
    const tot = await st(p, () => document.querySelector('.v3pg.on, .v3in')?.innerText.match(/Llevas invertido\s*([\d.,]+)/)?.[1]); res.push(['compra', 'INFO', 'Llevas invertido: ' + tot]);
  },
  async reparacion(p){
    await p.evaluate(() => __v3.go('reparaciones')); await W(900);
    await p.evaluate(() => document.querySelector('.rpitem')?.click()); await W(1200);
    const ok1 = await st(p, () => !!document.querySelector('.reprun')); ok('reparacion', ok1, 'abre la reparación en curso');
    const need = await st(p, () => document.querySelector('.rpneed')?.innerText.replace(/\n/g, ' | ').slice(0, 250)); res.push(['reparacion', 'INFO', need]);
    for(let i = 0; i < 4; i++){ await p.evaluate(() => document.querySelector('.rpok')?.click()); await W(500); }
    const r = await st(p, () => __v3.x.S.v2.reparaciones.find(x => x._id === 'r1')); ok('reparacion', (r?.hechos || []).length === 3, 'pasos marcados: ' + JSON.stringify(r?.hechos));
    const t = await clickText(p, '^Terminar'); await W(900);
    const body = await st(p, () => [...document.querySelectorAll('#sheet2, .shbox')].filter(e => e.offsetParent).map(e => e.innerText).join(' ').replace(/\n/g, ' | ').slice(0, 400)); res.push(['reparacion', 'INFO', 'hoja terminar: ' + body]);
    const n0 = await st(p, () => __v3.x.S.int.length);
    await clickText(p, '^Guardar y terminar'); await W(1500);
    const r2 = await st(p, () => __v3.x.S.v2.reparaciones.find(x => x._id === 'r1'));
    ok('reparacion', r2?.estado === 'terminada', 'terminada: ' + r2?.estado);
    ok('reparacion', (await st(p, () => __v3.x.S.int.length)) === n0 + 1, 'apunta la intervención');
    const cs = await st(p, () => ['c1', 'c2', 'c3'].map(id => __v3.x.S.compras.find(c => c._id === id)?.estado)); ok('reparacion', cs[0] === 'montado', 'piezas compradas pasan a montadas: ' + cs.join(','));
    ok('reparacion', cs[1] === 'pendiente', 'las no compradas no se marcan montadas: ' + cs[1]);
    const av = await st(p, () => __v3.x.S.ave.find(a => a._id === 'a2')?.estado); ok('reparacion', av === 'resuelta', 'cierra la avería: ' + av);
  },
  async buscar(p){
    await p.evaluate(() => __v3.openSearch()); await W(600);
    for(const q of ['bomba', '070103189A', 'itv', 'zzzzz', '<b>x</b>']){
      await fill(p, '.srch input, #srchIn, input[type=search]', q); await W(700);
      const n = await st(p, () => document.querySelectorAll('.srch .r2, .srch .vrow, .srch button.srr, .srres > *').length);
      const bold = await st(p, () => !!document.querySelector('.srch b b, .srch x'));
      res.push(['buscar', 'INFO', `«${q}» → ${n} resultados${bold ? ' (¡HTML sin escapar!)' : ''}`]);
    }
  },
  async importar(p){
    const imp = {formato: 'taller7l-import', version: 1, lote: {nombre: 'Prueba de importación', fuente: 'test', fecha: '2026-11-05'},
      guias: [{titulo: 'Guía importada de prueba', grupo: '19', pasos: [{titulo: 'Uno', texto: 'Paso uno', par: '10 Nm'}, {titulo: 'Dos', texto: 'Paso dos'}]}],
      compras: [{nombre: 'Junta del termostato', ref: '070 121 091', cantidad: 1}, {nombre: 'Termostato 87 °C', ref: '070 121 114', cantidad: 1}],
      pares: [{grupo: '19', componente: 'Termostato', valor: '15 Nm'}]};
    fs.writeFileSync('imp.json', JSON.stringify(imp));
    const c0 = await st(p, () => __v3.x.S.compras.length);
    await p.evaluate(() => __v3.go('m_importar')); await W(800);
    const btn = await p.evaluateHandle(() => [...document.querySelectorAll('button')].filter(x => x.offsetParent).find(x => /Elegir archivo/i.test(x.textContent)));
    const [fc] = await Promise.all([p.waitForEvent('filechooser', {timeout: 8000}), btn.click()]); await fc.setFiles('imp.json'); await W(1500);
    const prev = await st(p, () => [...document.querySelectorAll('#sheet2, .shbox, .v3pg.on')].filter(e => e.offsetParent).map(e => e.innerText).join(' ').replace(/\n/g, ' | ').slice(0, 500)); res.push(['importar', 'INFO', prev]);
    await p.evaluate(() => [...document.querySelectorAll('button')].filter(x => x.offsetParent).reverse().find(x => /^Importar/.test(x.textContent.trim()))?.click()); await W(2500);
    const g = await st(p, () => (__v3.x.S.procs || []).some(x => x.titulo === 'Guía importada de prueba')); ok('importar', g, 'la guía se importa');
    const c1 = await st(p, () => __v3.x.S.compras.length); ok('importar', c1 === c0 + 1, `compras: la junta ya estaba y no se duplica (${c0}→${c1})`);
    const lotes = await st(p, () => __v3.x.S.v2.lotes.length); ok('importar', lotes >= 1, 'queda el lote para deshacer');
    await p.evaluate(() => __v3.go('m_importar')); await W(800);
    p.__dialogs = []; await clickText(p, 'Prueba de importación', '.v3pg.on'); await W(900); await clickText(p, 'Deshacer', '.shbox'); await W(2500);
    const g2 = await st(p, () => (__v3.x.S.procs || []).some(x => x.titulo === 'Guía importada de prueba')); res.push(['importar', g2 ? 'FALLO' : 'OK ', 'deshacer el lote quita la guía (diálogos: ' + (p.__dialogs || []).join(' / ').slice(0, 120) + ')']);
  },
  async copia(p){
    await p.evaluate(() => __v3.go('m_backup')); await W(900);
    const [dl] = await Promise.all([p.waitForEvent('download', {timeout: 10000}).catch(() => null), clickText(p, 'Guardar en el móvil')]);
    if(!dl){ ok('copia', false, 'no se descarga el archivo de copia'); return; }
    const path = 'copia.json'; await dl.saveAs(path); const j = JSON.parse(fs.readFileSync(path, 'utf8'));
    const cols = Object.keys(j.colecciones || {}); const n = Object.values(j.colecciones).reduce((s, c) => s + Object.keys(c || {}).length, 0);
    ok('copia', n > 40, `copia con ${n} registros en ${cols.length} colecciones`);
    for(const c of ['compras', 'reparaciones', 'herrs', 'repostajes', 'pendientes', 'kmlog']) ok('copia', j.colecciones[c] && Object.keys(j.colecciones[c]).length > 0, 'incluye ' + c);
    // borrar algo y restaurar
    await p.evaluate(() => __v3.x.S.db.collection('compras').doc('c3').delete()); await W(600);
    await p.evaluate(() => __v3.go('m_backup')); await W(800);
    const btn = await p.evaluateHandle(() => [...document.querySelectorAll('button')].filter(x => x.offsetParent).find(x => /Restaurar/.test(x.textContent)));
    const [fc] = await Promise.all([p.waitForEvent('filechooser', {timeout: 8000}).catch(() => null), btn.click()]);
    if(!fc){ ok('copia', false, 'Restaurar no abre el selector'); return; }
    await fc.setFiles(path); await W(2000);
    const shown = await st(p, () => [...document.querySelectorAll('#sheet2, .shbox')].filter(e => e.offsetParent).map(e => e.innerText).join(' ').replace(/\n/g, ' | ').slice(0, 400)); res.push(['copia', 'INFO', shown]);
    const t = await clickText(p, '^Restaurar$', '.shbox'); await W(1500); const t2 = await clickText(p, '^(Restaurar|Sí|Confirmar|Recuperar)', '.shbox'); await W(3000); res.push(['copia','INFO','segundo paso: '+t2+' · '+(p.__dialogs||[]).join(' / ').slice(0,200)]);
    const back = await st(p, () => !!__v3.x.S.compras.find(c => c._id === 'c3')); ok('copia', back, `restaurar devuelve la compra borrada (${t})`);
  },
  async ajustes(p){
    await p.evaluate(() => __v3.go('m_ajustes')); await W(800);
    await p.evaluate(() => [...document.querySelectorAll('[data-k=sol] button')].find(b => /Al sol/.test(b.textContent))?.click()); await W(500);
    ok('ajustes', await st(p, () => document.body.classList.contains('sol') && document.body.classList.contains('light')), 'modo al sol');
    await p.evaluate(() => [...document.querySelectorAll('[data-k=sol] button')].find(b => /Normal/.test(b.textContent))?.click()); await W(500);
    ok('ajustes', await st(p, () => !document.body.classList.contains('sol') && !document.body.classList.contains('light')), 'vuelve al tema oscuro');
    await p.evaluate(() => [...document.querySelectorAll('[data-k=anim] button')].find(b => /Ninguna/.test(b.textContent))?.click()); await W(500);
    ok('ajustes', await st(p, () => /an-off|an-none/.test(document.body.className)), 'animaciones: ninguna → ' + await st(p, () => document.body.className));
  },
  async documento(p){
    const n0 = await st(p, () => __v3.x.S.docs.length);
    await p.evaluate(() => __v3.go('p_docs')); await W(800); await clickText(p, 'Añadir otro documento'); await W(700);
    const f = await st(p, () => [...document.querySelectorAll('.recf [id^=rf_]')].map(e => e.id).join(','));
    await fill(p, '#rf_tipo', 'Seguro'); await fill(p, '#rf_nombre', 'Seguro nuevo'); await fill(p, '#rf_caduca', '2027-12-01');
    await p.evaluate(() => document.querySelector('.recf [data-a=ok]')?.click()); await W(1000);
    const n1 = await st(p, () => __v3.x.S.docs.length); ok('documento', n1 === n0 + 1, `añadir documento ${n0}→${n1} (campos ${f})`);
  },
  async pendiente(p){
    const n0 = await st(p, () => (__v3.x.S.v2.pendientes || []).length);
    await p.evaluate(() => __v3.go('pendientes')); await W(800); await clickText(p, '^Anotar', '.v3pg.on'); await W(800);
    const f = await st(p, () => [...document.querySelectorAll('#sheet2 input, .shbox input, .shbox textarea')].filter(e => e.offsetParent).map(e => e.id || e.className).join(','));
    await fill(p, '#pdT', 'Retrovisor flojo');
    await clickText(p, '^Apuntar$', '.shbox'); await W(1000);
    const n1 = await st(p, () => (__v3.x.S.v2.pendientes || []).length); ok('pendiente', n1 === n0 + 1, `anotar pendiente ${n0}→${n1} (${f})`);
  },
  async vcds(p){
    const scan = `VCDS Version: Release 24.7.0\nData version: 20240718\n\nVIN: XXXXX   License Plate: \nMileage: 272800km\n\nChassis Type: 7L - VW Touareg\nScan: 01 02 03 08 09 15 16 17 19 44 46 56 57 61 62 65\n\n-------------------------------------------------------------------------------\nAddress 01: Engine        Labels: 070-906-016-BAC.lbl\n   Part No: 070 906 016 AF\n   Component: R5 2,5L EDC  G000SG  6430\n\n1 Fault Found:\n17964 - Charge Pressure Control: Negative Deviation\n            P1556 - 004 - Below Lower Limit - Intermittent\n\n-------------------------------------------------------------------------------\nAddress 65: Tire Pressure        Labels: 7L0-907-273.lbl\n\n1 Fault Found:\n01325 - Control Module for Tire Pressure Monitoring\n            010 - Open or Short to Ground\n\nEnd   ---------------------------------------------------------------------\n`;
    await p.evaluate(() => __v3.go('vcds')); await W(800);
    await clickText(p, 'Importar un Auto-Scan'); await W(800);
    await fill(p, '#sheet2 textarea, .shbox textarea', scan); await W(800);
    const prev = await st(p, () => [...document.querySelectorAll('.shbox, #sheet2')].filter(e => e.offsetParent).map(e => e.innerText).join(' ').replace(/\n/g, ' | ').slice(0, 300)); res.push(['vcds', 'INFO', prev]);
    await clickText(p, '^(Guardar|Importar)', '.shbox'); await W(1500);
    const s = await st(p, () => (__v3.x.S.v2.autoscans || []).length); ok('vcds', s === 1, 'escaneo guardado');
  },

  async itv(p){
    await p.evaluate(() => __v3.go('p_itv')); await W(800); await clickText(p, 'Registrar inspección'); await W(800);
    await fill(p, '#rf_fecha', '2026-11-04'); await fill(p, '#rf_km', '272900'); await fill(p, '#rf_resultado', 'fav'); await fill(p, '#rf_coste', '48');
    const pr = await st(p, () => document.querySelector('#rf_proxima')?.value); res.push(['itv', 'INFO', 'próxima propuesta: ' + pr]);
    await p.evaluate(() => document.querySelector('.recf [data-a=ok]')?.click()); await W(1500);
    const n = await st(p, () => __v3.x.S.v2.itv.length); ok('itv', n === 2, 'inspección guardada');
    const cad = await st(p, () => __v3.x.S.docs.find(d => /ITV/i.test(d.tipo))?.caduca); ok('itv', cad && cad > '2027', 'favorable actualiza la caducidad en Papeles: ' + cad);
  },
  async listas(p){
    await p.evaluate(() => __v3.go('listas')); await W(800); await p.evaluate(() => document.querySelector('.lsc')?.click()); await W(800);
    const t = await st(p, () => document.querySelector('.v3pg.on')?.innerText.slice(0, 120).replace(/\n/g, ' | ')); res.push(['listas', 'INFO', t]);
    await p.evaluate(() => document.querySelector('.v3pg.on input[type=checkbox], .v3pg.on .lsi, .v3pg.on .chk')?.click()); await W(900);
    const m = await st(p, () => JSON.stringify(__v3.x.S.cfgX?.listas?.marcas || {})); ok('listas', m.length > 4, 'marcar un punto se guarda: ' + m.slice(0, 100));
  },
  async galeria(p){
    await p.evaluate(() => __v3.go('galeria')); await W(800);
    const [fc] = await Promise.all([p.waitForEvent('filechooser', {timeout: 6000}).catch(() => null), clickText(p, 'Añadir fotos', '.v3pg.on')]);
    if(!fc){ ok('galeria', false, 'no abre el selector de fotos'); return; }
    await fc.setFiles(new URL('../../icons/icon-512.png', import.meta.url).pathname); await W(1200); await fill(p, '#rf_titulo', 'Foto de prueba'); await W(300);
    await p.evaluate(() => document.querySelector('.recf [data-a=ok]')?.click()); await W(2500);
    const g = await st(p, () => __v3.x.S.v2.galeria.find(x => x.titulo === 'Foto de prueba')); ok('galeria', g && (g.fotos || []).length === 1, 'foto subida y guardada: ' + JSON.stringify(g).slice(0, 150));
    await p.evaluate(() => __v3.go('galeria')); await W(900);
    await p.evaluate(() => document.querySelector('.v3pg.on img')?.closest('button, a')?.click()); await W(900);
    ok('galeria', await st(p, () => !!document.querySelector('.vz')), 'tocar la foto abre el visor');
  },
  async enlace(p){
    await p.evaluate(() => __v3.go('m_compartir')); await W(800);
    await clickText(p, 'Crear enlace'); await W(1500);
    const sh = await st(p, () => [...__store.keys()].filter(k => k.startsWith('compartido/'))); ok('enlace', sh.length === 1, 'enlace creado: ' + sh.join(','));
    const url = await st(p, () => document.querySelector('.v3pg.on input[readonly], .v3pg.on .lnk, .v3pg.on a[href*="taller.html"]')?.value || document.querySelector('.v3pg.on a[href*="taller.html"]')?.href || document.querySelector('.v3pg.on')?.innerText.match(/https?:\S+taller\.html\S*/)?.[0]);
    res.push(['enlace', 'INFO', 'url: ' + url]);
    const d = await st(p, () => { const k = [...__store.keys()].find(k => k.startsWith('compartido/')); const v = __store.get(k); return JSON.stringify(v).slice(0, 300) + ' VIN?' + /WVGZZZ/.test(JSON.stringify(v)); }); res.push(['enlace', 'INFO', d]);
  },
  async guia(p){
    const n0 = await st(p, () => __v3.x.S.procs.length);
    await p.evaluate(() => __v3.go('guias')); await W(800); await clickText(p, 'Nueva guía'); await W(900);
    const f = await st(p, () => [...document.querySelectorAll('.shbox input, .shbox textarea, .v3pg.on .gedit input')].filter(e => e.offsetParent).map(e => e.id || e.placeholder).join(' / '));
    res.push(['guia', 'INFO', 'formulario: ' + f.slice(0, 200)]);
    await p.evaluate(() => { const i = [...document.querySelectorAll('.shbox input, .v3pg.on input')].filter(e => e.offsetParent && !/Buscar/.test(e.placeholder))[0]; i.value = 'Guía nueva de prueba'; i.dispatchEvent(new Event('input', {bubbles: true})); const t = [...document.querySelectorAll('.shbox textarea')].filter(e => e.offsetParent)[0]; if(t){ t.value = 'Paso 1\nPaso 2'; t.dispatchEvent(new Event('input', {bubbles: true})); } });
    await clickText(p, '^(Guardar|Crear)', '.shbox'); await W(1200);
    const n1 = await st(p, () => __v3.x.S.procs.length); ok('guia', n1 === n0 + 1, `crear guía ${n0}→${n1}`);
  },
  async vcdslog(p){
    fs.writeFileSync('log1.csv', 'Tuesday,14,October,2026,10:12:01:00000,VCDS Version: Release 24.7.0\n,,G001,F1,G001,F2,,G013,F1\nMarker,STAMP,Engine Speed,Coolant Temperature,STAMP,Injector Deviation Cyl 1\n,,/min,°C,,mg/str\n' + Array.from({length: 50}, (_, k) => `,${(k * .25).toFixed(2)},${820 + k % 7},${80 + k * .2},${(k * .25 + .1).toFixed(2)},${(-.5 + (k % 5) * .1).toFixed(2)}`).join('\n'));
    await p.evaluate(() => __v3.go('vcds')); await W(800); await clickText(p, 'registro \\(\\.csv\\)'); await W(800);
    await p.setInputFiles('.vgf', 'log1.csv'); await W(800);
    const pv = await st(p, () => document.querySelector('.vgprev2')?.innerText); ok('vcdslog', /3 valores/.test(pv || ''), 'vista previa: ' + pv);
    await clickText(p, '^Guardar', '.shbox'); await W(1800);
    ok('vcdslog', await st(p, () => document.querySelectorAll('.vgcard').length === 3), 'tres gráficas');
  },
  async neumaticos(p){
    await p.evaluate(() => __v3.go('ruedas')); await W(800); await clickText(p, 'Añadir juego'); await W(800);
    await fill(p, '#rf_nombre', 'Invierno'); await fill(p, '#rf_medida', '255/55 R18'); await fill(p, '#rf_cantidad', '4');
    await p.evaluate(() => document.querySelector('.recf [data-a=ok]')?.click()); await W(1000);
    ok('neumaticos', await st(p, () => __v3.x.S.v2.neumaticos.length === 2), 'juego añadido');
  },
  async dossier(p){
    await p.evaluate(() => __v3.go('m_dossier')); await W(800);
    const [dl] = await Promise.all([p.waitForEvent('download', {timeout: 12000}).catch(() => null), clickText(p, '^(Crear|Generar|Descargar)')]);
    await W(1500); const toast = await st(p, () => document.querySelector('.toast, #toast')?.innerText); res.push(['dossier', dl ? 'OK ' : 'INFO', dl ? 'PDF descargado' : 'sin descarga (jsPDF bloqueado en pruebas): aviso=' + toast]);
  },
};
for(const [name, fn] of Object.entries(flows)){
  if(only && only !== name) continue;
  const {b, p, errs} = await start({width: 390, height: 844}, {acceptDialogs: ['importar','copia'].includes(name)});
  try{ await fn(p); }catch(e){ res.push([name, 'EXCEPCIÓN', e.message.slice(0, 200)]); }
  const ae = await appErrs(p).catch(() => []); const all = errs.concat(ae);
  if(all.length) res.push([name, 'ERRORES', all.join(' || ').slice(0, 600)]);
  await b.close();
}
const txt = res.map(r => r.join(' · ')).join('\n'); fs.writeFileSync('flows' + (only ? '-' + only : '') + '.txt', txt); console.log(txt);
