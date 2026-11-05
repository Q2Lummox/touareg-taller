/* Recorre todas las pantallas: errores, textos raros (undefined, NaN…), desbordes a lo ancho y captura.
   node crawl.mjs <ancho> <alto> <dark|light> [vacio] */
import {start, appErrs} from './run.mjs';
import fs from 'fs';
const [W, H, scheme, vacio] = [+process.argv[2] || 390, +process.argv[3] || 844, process.argv[4] || 'dark', process.argv[5] === 'vacio'];
const tag = `${W}${scheme[0]}${vacio ? 'v' : ''}`; fs.mkdirSync('shots/' + tag, {recursive: true});
const {b, p, errs} = await start({width: W, height: H}, {scheme, empty: vacio});
const ids = await p.evaluate(() => [...Object.keys(__v3.V3.hubs).map(h => 'tab:' + h), ...Object.keys(__v3.V3.pages), '3d']);
const out = [];
let e0 = 0, a0 = 0;
for(const id of ids){
  if(/vcds_det|vcds_log/.test(id)) continue;
  try{
    if(id.startsWith('tab:')) await p.evaluate(t => __v3.tab(t), id.slice(4)); else await p.evaluate(i => __v3.go(i), id);
  }catch(e){ out.push([id, 'NAV ' + e.message.slice(0, 150)]); continue; }
  await p.waitForTimeout(id === '3d' ? 2500 : 900);
  const info = await p.evaluate(() => {
    const pg = document.querySelector('.v3pg.on') || document.body;
    const txt = pg.innerText || '';
    const bad = [...new Set((txt.match(/[^\n]{0,30}\b(undefined|NaN|null|\[object Object\]|Infinity)\b[^\n]{0,30}/g) || []))].slice(0, 5);
    const sw = document.scrollingElement.scrollWidth, iw = innerWidth;
    const wide = [...pg.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > iw + 2 && getComputedStyle(e).position !== 'fixed' && !e.closest('.vscrollx, .hscroll, [style*="overflow-x"], .vchips, .cmpbar, .vseg, pre, code, table, .gvids, .pzshops'); }).slice(0, 4).map(e => e.tagName + '.' + String(e.className).split(' ').slice(0, 2).join('.') + ' r=' + Math.round(e.getBoundingClientRect().right));
    const title = document.querySelector('.v3bar .v3bt b, .v3bar b')?.textContent || '';
    return {bad, sw, iw, wide, title, len: txt.length};
  });
  const ae = await appErrs(p);
  const newE = errs.slice(e0).concat(ae.slice(a0)); e0 = errs.length; a0 = ae.length;
  await p.screenshot({path: `shots/${tag}/${id.replace(':', '_')}.png`});
  const prob = [];
  if(newE.length) prob.push('ERR ' + newE.join(' || ').slice(0, 400));
  if(info.bad.length) prob.push('TEXTO ' + JSON.stringify(info.bad));
  if(info.sw > info.iw + 1) prob.push(`ANCHO página ${info.sw}>${info.iw}`);
  if(info.wide.length) prob.push('DESBORDA ' + info.wide.join(', '));
  if(info.len < 20 && id !== '3d') prob.push('VACÍA');
  out.push([id, prob.join(' | ') || 'ok']);
}
fs.writeFileSync(`crawl-${tag}.txt`, out.map(x => x.join(': ')).join('\n'));
console.log(out.filter(x => x[1] !== 'ok').map(x => x.join(': ')).join('\n') || 'todo ok', '\n', out.length, 'pantallas');
await b.close();
