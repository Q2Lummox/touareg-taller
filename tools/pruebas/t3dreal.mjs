import {start, appErrs} from './run.mjs';
const W=+process.argv[2]||1280, H=+process.argv[3]||800;
const {b,p,errs}=await start({width:W,height:H},{real3d:true});
const log=[]; let e0=0,a0=0;
const chk=async lab=>{ const ae=await appErrs(p); const ne=errs.slice(e0).concat(ae.slice(a0)); e0=errs.length; a0=ae.length; if(ne.length) log.push(lab+': '+ne.join(' || ').slice(0,400)); };
await p.evaluate(()=>__v3.go('3d')); await p.waitForTimeout(12000); await chk('abrir 3D');
console.log('piezas', await p.evaluate(()=>__v3.x.parts().length));
// botones de la barra
const tb=await p.evaluate(()=>[...document.querySelectorAll('.tools > button, .tools .mb > .mbtn, .tools .dd > .ddbtn, .tools > .seg button')].filter(e=>e.offsetParent).map((e,i)=>i+':'+(e.textContent.trim()||e.getAttribute('aria-label')||e.title)));
console.log('barra', tb.join(' | '));
for(let i=0;i<tb.length;i++){ await p.evaluate(i=>{ const L=[...document.querySelectorAll('.tools > button, .tools .mb > .mbtn, .tools .dd > .ddbtn, .tools > .seg button')].filter(e=>e.offsetParent); L[i]?.click(); }, i); await p.waitForTimeout(1200); await chk('barra '+tb[i]);
  // si se abre un menú, pulsar cada opción
  const items=await p.evaluate(()=>[...document.querySelectorAll('.mpanel:not([hidden]) button, .ddmenu:not([hidden]) button, .sysm button, .elecm button')].filter(e=>e.offsetParent).map(e=>e.textContent.trim().slice(0,30)));
  log.push('  ('+items.length+' opciones en '+tb[i]+': '+items.slice(0,14).join(', ')+')');
  for(let k=0;k<Math.min(items.length,14);k++){ await p.evaluate(([i,k])=>{ const L=[...document.querySelectorAll('.tools > button, .tools .mb > .mbtn, .tools .dd > .ddbtn, .tools > .seg button')].filter(e=>e.offsetParent); const its=()=>[...document.querySelectorAll('.mpanel:not([hidden]) button, .ddmenu:not([hidden]) button, .sysm button, .elecm button')].filter(e=>e.offsetParent); if(!its().length) L[i]?.click(); its()[k]?.click(); }, [i,k]); await p.waitForTimeout(2000); await chk(`  ${tb[i]} › ${items[k]}`); await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
// tocar el coche en varios puntos
const c=await p.evaluate(()=>{ const cv=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0].getBoundingClientRect(); return [cv.left,cv.top,cv.width,cv.height]; });
for(const [fx,fy] of [[.5,.5],[.3,.6],[.7,.45],[.5,.7]]){ await p.mouse.click(c[0]+c[2]*fx, c[1]+c[3]*fy); await p.waitForTimeout(1500); await chk('tocar '+fx+','+fy); }
await p.mouse.dblclick(c[0]+c[2]*.5, c[1]+c[3]*.55); await p.waitForTimeout(2000); await chk('doble clic');
for(const k of ['x','f','v','Escape','1','2','3']){ await p.keyboard.press(k); await p.waitForTimeout(800); await chk('tecla '+k); }
console.log(log.join('\n')||'sin fallos'); await b.close();
