# Mapa del código y cómo se trabaja

## Dónde está cada cosa

- `index.html` — la app oficial (un solo archivo con todo: estilos, 3D, pantallas).
- `beta/` — la beta: su `index.html`, `sw.js`, `version.json`, `manifest.webmanifest`, `fb.js` y los recursos del 3D.
- `fb.js` / `firebase-config.js` — acceso a Firebase (inicio de sesión con Google, Firestore). La configuración de Firebase es pública; el acceso lo limitan las reglas de Firestore al correo de Sergio.
- `taller.html` — la página del enlace para el taller (lee `compartido/{id}`).
- `tools/avisos.mjs` — avisos por correo, Telegram y notificaciones (se ejecuta en GitHub Actions con secretos que solo están en GitHub).
- `tools/pruebas/` — banco de pruebas y publicación (ver abajo).
- `docs/PENDIENTES.md` — lo que falta.

Desde el 5-11-2026 ya no existen las fuentes por piezas (`ui/`, `v2/`, `v3/`): se trabaja directamente sobre `beta/index.html`. Cada bloque del código empieza con un comentario `/* ====================== TÍTULO ====================== */`, que sirve de índice:

| Bloque | Qué hace |
|---|---|
| v1.x (usabilidad, gestos, detalles vivos) | El visor 3D original: piezas, selección, notas, rayos X, vistas |
| v2.0 Registro / Consulta / Utilidades | Mantenimiento, intervenciones, averías, documentos, repostajes, neumáticos, ITV, listas, buscador |
| v2.0 Importación por lotes y catálogo | Formato `taller7l-import`: guías, compras, pares, láminas; deshacer lotes |
| Electricidad, cableado y marcadores 3D | Cables, fusibles y relés, masas, centralitas, cajas, sensores |
| Circuitos de fluidos y menú «Sistemas» | Refrigeración, aceite, combustible y drenajes en 3D |
| Reparación en curso, diagnóstico, pendientes | Guía paso a paso con fotos, manos libres; síntomas del BAC |
| 4.0 Núcleo de navegación | `V3.pages`, `V3.hubs`, `v3go(id, {data})`, barra inferior, avisos y novedades |
| Hoy, Coche, Taller, Gastos, Papeles, Ajustes | Las cinco pestañas y sus páginas |
| Lista de la compra | Resumen, por comprar, sin montar, historial; filtros y ordenar |
| 4.1 Vídeos, Auto-Scan, Guías por hacer, cuadro de instrumentos, 3D ligero | |
| 4.2 Visor de fotos, ficha de pieza, gráficas VCDS, pedido, herramientas, ruidos, atajos, ITV, modo garaje | |

Atajos útiles para pruebas: `window.__v3.go(id)`, `__v3.tab(t)`, `__v3.x.S` (datos cargados), `__v3.V3`.

## Publicar

```bash
python3 tools/pruebas/deploy2.py check                       # sintaxis, nombres sin definir (eslint) y que no se cuele el bastidor
python3 tools/pruebas/deploy2.py beta 4.2.2-beta.1 "nota" …   # cambia la versión en beta/, guarda y sube
```

Pasar a la oficial: `python3 tools/pruebas/deploy2.py oficial 4.3.0 "nota" …` (con `NOPUSH=1` delante solo lo prepara). Saca `index.html` de la beta deshaciendo lo propio de la beta (rutas `../`, título «β», insignia Beta) y pone la misma versión en las dos. Antes de subir, probar la oficial con `OFICIAL=1 node crawl.mjs …` y `OFICIAL=1 node flows.mjs`.

Firma de los commits: `q2lummox@users.noreply.github.com`, con las líneas `Co-Authored-By` y `Claude-Session` al final.

## Banco de pruebas (`tools/pruebas/`)

Necesita Node, Playwright con Chromium y three.js r160 en `tools/pruebas/three160/` (no se sube):

```bash
cd tools/pruebas
git clone --depth 1 --filter=blob:none --sparse --branch r160 https://github.com/mrdoob/three.js three160 && (cd three160 && git sparse-checkout set build examples/jsm)
node lint/g.mjs        # genera lint/globals.json (nombres del navegador) para eslint
./up.sh                # servidor local en :8767 (sirve la raíz del repositorio)
```

- `mockfb.js` — Firebase de mentira en memoria, con la misma interfaz que `fb.js` (si la app usa algo que el real no tiene, aquí también falla).
- `seed.mjs` — un Touareg con historia en todas las secciones; `run.mjs` → `start(viewport, opciones)` abre la app ya lista.
- `crawl.mjs ancho alto dark|light [vacio]` — todas las pantallas: errores, textos raros (undefined, NaN), desbordes, capturas.
- `monkey.mjs ancho alto` — pulsa cada botón de cada pantalla.
- `flows.mjs [flujo]` — 22 tareas completas con comprobación de lo guardado.
- `chaos.mjs` — datos raros o incompletos.
- `t3dreal.mjs` — el 3D de verdad (lento: render por software).
