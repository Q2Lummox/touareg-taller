/* Datos raros pero posibles (importaciones antiguas, campos vacíos, números como texto) y recorrido de todas las pantallas */
import {open, appErrs} from './run.mjs';
import {seedStore} from './seed.mjs';
import fs from 'fs';
const S=seedStore();
Object.assign(S,{
 'intervenciones/x1':{descripcion:'Sin fecha ni km'}, 'intervenciones/x2':{fecha:'2026-02-30', km:'272.000', coste:'45,5', mant:'no-existe'}, 'intervenciones/x3':{fecha:'', km:null, coste:null, tipo:null},
 'compras/x1':{estado:'pendiente'}, 'compras/x2':{nombre:'Tornillos', cantidad:'2', precio:'abc', estado:'comprado', fechaCompra:'ayer'}, 'compras/x3':{nombre:'Raro', estado:'desconocido'}, 'compras/x4':{nombre:'Montado sin fechas', estado:'montado'},
 'averias/x1':{estado:'abierta'}, 'averias/x2':{sintoma:'Sin estado'},
 'documentos/x1':{tipo:'ITV', caduca:'2026-13-40'}, 'documentos/x2':{nombre:'Sin tipo'},
 'procedimientos/x1':{titulo:'Guía sin pasos'}, 'procedimientos/x2':{pasos:[{texto:'sin título'}]},
 'reparaciones/x1':{titulo:'Guía borrada', guia:'no-existe', estado:'en_curso', hechos:[], compras:['no-existe'], montadas:[]},
 'repostajes/x1':{fecha:d(), km:272300, litros:0, total:0, lleno:true}, 'repostajes/x2':{km:'abc'},
 'kmlog/x1':{fecha:'2026-01-01', km:'mucho'}, 'mantenimiento/x1':{nombre:'Intervalo raro', intervaloKm:'15000', intervaloMeses:'doce'},
 'neumaticos/x1':{}, 'mejoras/x1':{}, 'galeria/x1':{fotos:[{id:'no-existe', tipo:'image/jpeg'}]}, 'itv/x1':{defectos:'no es lista'}, 'pendientes/x1':{}, 'autoscans/x1':{fecha:'2026-10-01', modulos:[{dir:'01'}]}, 'vcdslogs/x1':{nombre:'vacío', series:[{n:'X', t:[], v:[]}]}, 'herrs/x1':{}, 'refs/x1':{ref:''}, 'talleres/x1':{},
});
function d(){ return new Date().toISOString().slice(0,10); }
S['config/coche']={...S['config/coche'], kmActual:'272.800'};
const {b,p,errs}=await open({width:390,height:844},{store:S});
const t0=Date.now(); while(Date.now()-t0<40000){ const st=await p.evaluate(()=>({sp:!!document.getElementById('splash'), cur:!!window.__v3?.V3?.cur})); if(!st.sp&&st.cur) break; await p.waitForTimeout(500); }
await p.waitForTimeout(1500);
const ids=await p.evaluate(()=>[...Object.keys(__v3.V3.hubs).map(h=>'tab:'+h), ...Object.keys(__v3.V3.pages).filter(x=>!/vcds_det|vcds_log/.test(x))]);
const out=[]; let e0=0,a0=0;
for(const id of ids){ if(id.startsWith('tab:')) await p.evaluate(t=>__v3.tab(t), id.slice(4)); else await p.evaluate(i=>__v3.go(i), id); await p.waitForTimeout(700);
  const bad=await p.evaluate(()=>{ const t=(document.querySelector('.v3pg.on')||document.body).innerText; return [...new Set(t.match(/[^\n]{0,25}\b(undefined|NaN|Invalid Date|\[object Object\]|Infinity)\b[^\n]{0,25}/g)||[])].slice(0,4); });
  const ae=await appErrs(p); const ne=errs.slice(e0).concat(ae.slice(a0)); e0=errs.length; a0=ae.length;
  if(ne.length||bad.length) out.push(id+': '+(ne.join(' || ').slice(0,350))+(bad.length?' TEXTO '+JSON.stringify(bad):''));
  await p.screenshot({path:`shots/chaos_${id.replace(':','_')}.png`}); }
// abrir el detalle de vcds y la reparación rota
await p.evaluate(()=>__v3.go('vcds_det',{data:{scan:'x1'}})); await p.waitForTimeout(700); await p.evaluate(()=>__v3.go('vcds_log',{data:{log:'x1'}})); await p.waitForTimeout(700);
await p.evaluate(()=>__v3.go('reparaciones')); await p.waitForTimeout(700); await p.evaluate(()=>[...document.querySelectorAll('.rpitem')].find(x=>/Guía borrada/.test(x.textContent))?.click()); await p.waitForTimeout(900);
const ae=await appErrs(p); const ne=errs.slice(e0).concat(ae.slice(a0)); if(ne.length) out.push('detalles: '+ne.join(' || ').slice(0,500));
console.log(out.join('\n')||'sin fallos'); fs.writeFileSync('chaos.txt', out.join('\n')); await b.close();
