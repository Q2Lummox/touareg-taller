/* Pulsa cada botón de cada pantalla y apunta lo que rompe: errores de JavaScript, textos raros en lo que se abre.
   node monkey.mjs <ancho> <alto> [desde] [hasta]   (rango de pantallas por índice) */
import {start, appErrs} from './run.mjs';
import fs from 'fs';
const W = +process.argv[2] || 390, H = +process.argv[3] || 844, from = +process.argv[4] || 0, to = +process.argv[5] || 999;
const SEL = 'button, [role=button], .vrow, a[href]:not([target]), summary, input[type=checkbox], select';
const log = [];
let {b, p, errs} = await start({width: W, height: H});
const ids = (await p.evaluate(() => [...Object.keys(__v3.V3.hubs).map(h => 'tab:' + h), ...Object.keys(__v3.V3.pages).filter(x => !/vcds_det|vcds_log/.test(x))])).slice(from, to);
const nav = async id => { if(id.startsWith('tab:')) await p.evaluate(t => __v3.tab(t), id.slice(4)); else await p.evaluate(i => __v3.go(i), id); await p.waitForTimeout(700); };
const cleanup = async () => {
  await p.keyboard.press('Escape').catch(() => {});
  for(let k = 0; k < 3; k++){
    const did = await p.evaluate(() => {
      const vis = e => e && e.offsetParent !== null;
      const x = document.querySelector('.vz .vzx, .gz .gzx, .ytov button[aria-label="Cerrar"]'); if(vis(x)){ x.click(); return 1; }
      const c = [...document.querySelectorAll('#sheet2 button, .shbox button, .sheet button, dialog button, .vmenu button, .lbx button')].filter(vis).find(b => /^(Cerrar|Cancelar|Listo|Hecho)$/.test(b.textContent.trim()));
      if(c){ c.click(); return 1; }
      const bd = document.querySelector('.shbg, .sheetbg, .v3menu-bg, .vmenubg'); if(vis(bd)){ bd.click(); return 1; }
      return 0; });
    if(!did) break; await p.waitForTimeout(350);
  }
};
let e0 = errs.length, a0 = (await appErrs(p)).length;
for(const id of ids){
  await nav(id).catch(e => log.push([id, '-', 'NAV ' + e.message.slice(0, 120)]));
  const n = await p.evaluate(s => [...(document.querySelector('.v3pg.on') || document).querySelectorAll(s)].filter(e => e.offsetParent !== null).length, SEL);
  for(let i = 0; i < Math.min(n, 45); i++){
    await nav(id).catch(() => {});
    const lab = await p.evaluate(([s, i]) => { const L = [...(document.querySelector('.v3pg.on') || document).querySelectorAll(s)].filter(e => e.offsetParent !== null); const e = L[i]; if(!e) return null;
      const t = (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 50);
      if(/^(Borrar|Eliminar|Cerrar sesión|Restaurar|Abandonar)/i.test(t)) return '[omitido] ' + t;
      e.scrollIntoView({block: 'center'}); e.click(); return t; }, [SEL, i]).catch(e => 'CLICKERR ' + e.message.slice(0, 80));
    if(lab == null) continue;
    await p.waitForTimeout(650);
    const pop = await p.evaluate(() => { const o = [...document.querySelectorAll('#sheet2, .shbox, .vz, .gz, .vmenu')].filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed'); const t = o.map(x => x.innerText || '').join(' ');
      return (t.match(/[^\n]{0,25}\b(undefined|NaN|\[object Object\])\b[^\n]{0,25}/g) || []).slice(0, 3); }).catch(() => []);
    const ae = await appErrs(p).catch(() => []);
    const ne = errs.slice(e0).concat(ae.slice(a0)); e0 = errs.length; a0 = ae.length;
    if(ne.length || pop.length) log.push([id, lab, (ne.join(' || ') + (pop.length ? ' TEXTO ' + JSON.stringify(pop) : '')).slice(0, 500)]);
    await cleanup();
    if(await p.evaluate(() => !window.__v3).catch(() => true)){ log.push([id, lab, 'LA APP SE HA RECARGADO / NAVEGADO FUERA']); await b.close(); ({b, p, errs} = await start({width: W, height: H})); e0 = errs.length; a0 = 0; }
  }
  fs.writeFileSync(`monkey-${W}-${from}.txt`, log.map(x => x.join(' :: ')).join('\n'));
}
console.log(log.map(x => x.join(' :: ')).join('\n') || 'sin fallos', '\n', ids.length, 'pantallas');
await b.close();
