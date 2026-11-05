/* Datos de prueba: un Touareg con historia en todas las secciones. Devuelve {ruta: datos} para el mock. */
import fs from 'fs';
const base = JSON.parse(fs.readFileSync(new URL('../../seed.json', import.meta.url), 'utf8'));
const hoy = new Date(), d = n => { const x = new Date(hoy); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
export function seedStore(){
  const S = {};
  for(const [col, docs] of Object.entries(base)) for(const [id, v] of Object.entries(docs)) S[col + '/' + id] = v;
  S['config/coche'] = {kmActual: 272800, matricula: '9905 CMY', anoModelo: '2004', precioCompra: 6500, fechaCompra: '2023-05-10', asistente: true, listas1: true, motor: 'BAC', cambio: 'manual'};
  // mantenimiento: intervalos en los básicos
  for(const [id, km, m] of [['aceite-motor', 15000, 12], ['filtro-aceite', 15000, 12], ['filtro-aire', 30000, 24], ['filtro-gasoil', 30000, 24], ['liquido-frenos', null, 24], ['refrigerante', null, 48]])
    if(S['mantenimiento/' + id]) Object.assign(S['mantenimiento/' + id], {intervaloKm: km, intervaloMeses: m});
  const add = (col, id, v) => S[col + '/' + id] = v;
  add('intervenciones', 'i1', {fecha: d(-200), km: 262000, mant: 'aceite-motor', descripcion: 'Cambio de aceite 5W-30 507.00', coste: 85, tipo: 'mantenimiento'});
  add('intervenciones', 'i2', {fecha: d(-200), km: 262000, mant: 'filtro-aceite', descripcion: 'Filtro de aceite', coste: 12, tipo: 'mantenimiento'});
  add('intervenciones', 'i3', {fecha: d(-500), km: 245000, mant: 'filtro-aire', descripcion: 'Filtro de aire', coste: 25, tipo: 'mantenimiento', ref: '7L0 129 620'});
  add('intervenciones', 'i4', {fecha: d(-30), km: 271900, descripcion: 'Escobillas', coste: 30, tipo: 'reparacion'});
  add('averias', 'a1', {codigo: '01325', sintoma: 'Testigo de presión de neumáticos', estado: 'abierta', fecha: d(-20), km: 272500, notas: 'Sale en el Auto-Scan', piezas: []});
  add('averias', 'a2', {codigo: '', sintoma: 'Fuga de refrigerante por la bomba', estado: 'abierta', fecha: d(-10), km: 272700, piezas: []});
  add('averias', 'a3', {codigo: 'P0401', sintoma: 'EGR', estado: 'resuelta', fecha: d(-400), km: 250000, piezas: []});
  add('documentos', 'doc1', {tipo: 'ITV', nombre: 'ITV', caduca: d(25), notas: ''});
  add('documentos', 'doc2', {tipo: 'Seguro', nombre: 'Seguro a todo riesgo', caduca: d(200), notas: ''});
  add('documentos', 'doc3', {tipo: 'Permiso de circulación', nombre: 'Permiso', caduca: null});
  add('compras', 'c1', {nombre: 'Bomba de agua', ref: '070 121 011 D', cantidad: 1, estado: 'comprado', precio: 89.9, tienda: 'Autodoc', fechaCompra: d(-15), montaje: 'yo'});
  add('compras', 'c2', {nombre: 'Tapa de estanqueidad del cigüeñal (lado cilindro 1)', ref: '070 103 189 A', cantidad: 1, estado: 'pendiente', notas: 'Lámina 103-20 pos. 16'});
  add('compras', 'c3', {nombre: 'Junta del termostato', ref: '070 121 091', cantidad: 1, estado: 'pendiente'});
  add('compras', 'c4', {nombre: 'Escobillas', cantidad: 1, estado: 'montado', precio: 30, tienda: 'Norauto', fechaCompra: d(-31), fechaMontaje: d(-30), montaje: 'yo'});
  add('compras', 'c5', {nombre: 'Refrigerante G12++', cantidad: 2, estado: 'comprado', precio: 0, fechaCompra: d(-14)});
  add('procedimientos', 'g1', {titulo: 'Sustituir la bomba de agua', grupo: '19', seccion: 'motor', fuente: 'ElsaWin · prueba', herramientas: 'Llave dinamométrica 5–50 Nm (V.A.G 1331), T10225, ganchos 10-221',
    pasos: [{titulo: 'Vaciar el refrigerante', texto: 'Quita el tapón del vaso. Abre el tapón de vaciado.', par: 'Tapón: 20 Nm'}, {titulo: 'Quitar la tapa', texto: 'Saca la tapa de estanqueidad del cigüeñal 070 103 189 A con los ganchos 10-221.', herr: 'Ganchos 10-221'}, {titulo: 'Montar la bomba', texto: 'Tornillos nuevos.', par: '20 Nm + 90°'}]});
  add('procedimientos', 'g2', {titulo: 'Cambiar el filtro de aire', grupo: '23', pasos: [{titulo: 'Abrir la caja', texto: 'Suelta las grapas.'}, {titulo: 'Cambiar', texto: 'Pon el filtro nuevo.'}]});
  add('reparaciones', 'r1', {titulo: 'Sustituir la bomba de agua', guia: 'g1', inicio: new Date(Date.now() - 86400000).toISOString(), estado: 'en_curso', hechos: [0], paso: 1, compras: ['c1', 'c2', 'c3'], montadas: [], averia: 'a2', km: 272700, notas: ''});
  add('repostajes', 'f1', {fecha: d(-40), km: 271200, litros: 70, precioL: 1.45, total: 101.5, lleno: true, gasolinera: 'Repsol', combustible: 'diesel'});
  add('repostajes', 'f2', {fecha: d(-12), km: 272150, litros: 75, precioL: 1.42, total: 106.5, lleno: true, gasolinera: 'Cepsa', combustible: 'diesel'});
  add('neumaticos', 'n1', {nombre: 'Verano', temporada: 'verano', medida: '255/55 R18', marca: 'Michelin', modelo: 'Latitude', cantidad: 4, presionDel: 2.4, presionTras: 2.6, fechaCompra: d(-300), precio: 520});
  add('mejoras', 'mj1', {titulo: 'Radio Android', categoria: 'audio', estado: 'idea', presupuesto: 250});
  add('talleres', 't1', {nombre: 'Talleres Pepe', tipo: 'mecanico', valoracion: 4, telefono: '600000000'});
  add('itv', 'itv1', {fecha: d(-340), km: 260000, estacion: 'ITV Malpica', resultado: 'leves', coste: 45, defectos: [{texto: 'Holgura rótula', gravedad: 'leve', corregido: false}], proxima: d(25)});
  add('pendientes', 'p1', {titulo: 'Grapa del paragolpes rota', prio: 'pronto', zona: 'Delante', estado: 'abierto', fecha: d(-5)});
  add('herrs', 'h1', {nombre: 'Llave dinamométrica V.A.G 1331'});
  add('kmlog', 'k1', {fecha: d(-40), km: 271200}); add('kmlog', 'k2', {fecha: d(-1), km: 272800});
  return S;
}
