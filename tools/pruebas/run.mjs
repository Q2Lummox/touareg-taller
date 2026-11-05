const { chromium } = await import(process.env.PW || '/opt/npm-tools/node_modules/playwright/index.mjs');
import fs from 'fs';
const BT = new URL('.', import.meta.url).pathname;
const T = BT + 'three160/';
export const BASE = 'http://localhost:8767/';
const js = body => ({status: 200, headers: {'content-type': 'application/javascript', 'access-control-allow-origin': '*'}, body});
/* opts: {beta:true, real3d:false, scheme:'dark', init:fn, fakeMic, store:{...}} */
export async function open(vp = {width: 390, height: 844}, opts = {}){
  const args = opts.real3d ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [];
  if(opts.fakeMic) args.push('--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream');
  const b = await chromium.launch({args});
  const ctx = await b.newContext({viewport: vp, deviceScaleFactor: opts.dpr || (opts.real3d ? 1 : 2), serviceWorkers: 'block', hasTouch: vp.width < 800, isMobile: vp.width < 800, colorScheme: opts.scheme || 'dark', locale: 'es-ES', timezoneId: 'Europe/Madrid'});
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  p.on('console', m => { if(m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300)); if(m.type() === 'warning' && /MOCK/.test(m.text())) errs.push('WARN ' + m.text()); });
  p.on('dialog', d => { (p.__dialogs = p.__dialogs || []).push(d.message()); opts.acceptDialogs ? d.accept(opts.promptText || '') : d.dismiss(); });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if(u.startsWith(BASE)){
      if(/\/fb\.js(\?|$)/.test(u)) return r.fulfill(js(fs.readFileSync(BT + 'mockfb.js', 'utf8')));
      return r.continue();
    }
    let m;
    if((m = u.match(/three@0\.160\.0\/(build\/three\.module\.js|examples\/jsm\/.*)$/))){
      const f = T + m[1].split('?')[0];
      if(!opts.real3d && m[1].startsWith('build')) return r.fulfill(js(fs.readFileSync(T + 'build/three.module.js', 'utf8')));
      return fs.existsSync(f) ? r.fulfill(js(fs.readFileSync(f, 'utf8'))) : r.fulfill({status: 404, body: ''});
    }
    if(/fonts\.googleapis|fonts\.gstatic/.test(u)) return r.fulfill({status: 200, headers: {'content-type': 'text/css'}, body: ''});
    return r.abort();
  });
  await ctx.addInitScript(({ui, store}) => {
    try{ localStorage.setItem('taller7l-ui', JSON.stringify(ui)); localStorage.setItem('taller7l-v3intro', '1'); localStorage.setItem('taller7l-intro', '1'); }catch{}
    if(store) window.__preStore = store;
  }, {ui: Object.assign({sound: false, theme: opts.scheme === 'light' ? 'light' : 'dark'}, opts.ui || {}), store: opts.store || null});
  if(opts.init) await ctx.addInitScript(opts.init);
  await p.goto(BASE + (opts.beta === false ? '' : 'beta/') + (opts.q || ''));
  return {b, ctx, p, errs};
}
export const appErrs = p => p.evaluate(() => (window.__errs || []).slice());
import {seedStore} from './seed.mjs';
/* abre la app con datos y espera a que esté lista (sin arranque ni asistente) */
export async function start(vp, opts = {}){
  const o = await open(vp, Object.assign({store: opts.empty ? null : seedStore()}, opts));
  const {p} = o; const t0 = Date.now();
  while(Date.now() - t0 < 40000){
    const st = await p.evaluate(() => ({sp: !!document.getElementById('splash'), wiz: !!document.querySelector('#wiz:not([hidden])'), cur: !!window.__v3?.V3?.cur}));
    if(st.wiz){ await p.click('.wzfoot .btn2.ghost').catch(() => {}); }
    if(!st.sp && st.cur) break;
    if(st.sp) await p.evaluate(() => document.querySelector('#splash .spstart, #splash button')?.click()).catch(() => {});
    await p.waitForTimeout(500);
  }
  await p.waitForTimeout(1200);
  return o;
}
