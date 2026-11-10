#!/usr/bin/env python3
"""Publicar sin las fuentes: se edita beta/index.html directamente.
   python3 deploy2.py beta 4.2.1-beta.1 "nota 1" "nota 2"      → sube la beta
   python3 deploy2.py check                                     → solo comprobaciones"""
import sys, os, re, json, subprocess, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
os.chdir(REPO)
def sh(*a): return subprocess.run(a, check=True, capture_output=True, text=True).stdout
def checks(path):
    h = open(path, encoding='utf-8').read()
    vin = os.path.join(HERE, '.bastidor')   # archivo local, no se sube: el comienzo del bastidor que no puede publicarse
    if os.path.exists(vin):
        pat = open(vin).read().strip(); assert pat and pat not in h, 'el bastidor no puede publicarse'
    else: print('AVISO: falta tools/pruebas/.bastidor; no se comprueba el bastidor')
    i = h.index('<script type="module">', h.index('src="./fb.js"')); j = h.index('</script>', i)
    open(os.path.join(HERE, 'lint', 'main.mjs'), 'w').write(h[i + len('<script type="module">'):j])
    r = subprocess.run(['node', '--check', os.path.join(HERE, 'lint', 'main.mjs')], capture_output=True, text=True)
    assert r.returncode == 0, 'error de sintaxis:\n' + r.stderr[:800]
    e = subprocess.run(['/opt/node-tools/node_modules/.bin/eslint', '-c', 'eslint.config.mjs', 'main.mjs', '-f', 'json'], capture_output=True, text=True, cwd=os.path.join(HERE, 'lint'))
    msgs = json.loads(e.stdout)[0]['messages']
    nuevos = [m for m in msgs if m.get('ruleId') == 'no-undef' and not re.search(r"'(docsVig|segAvisos|pdAvisos|renderMas)'", m['message'])] + [m for m in msgs if m.get('severity') == 2 and m.get('ruleId') != 'no-undef']
    assert not nuevos, 'eslint: ' + '; '.join(f"{m['line']}: {m['message']}" for m in nuevos[:10])
    return h
mode = sys.argv[1]
if mode == 'check':
    checks('beta/index.html'); print('OK comprobaciones'); sys.exit()
ver, notas = sys.argv[2], sys.argv[3:]
if mode == 'oficial':
    # la oficial sale de la beta deshaciendo lo propio de la beta (rutas ../, título β, insignia Beta)
    b = checks('beta/index.html')
    SUBS = [('<meta name="apple-mobile-web-app-title" content="Taller 7L β">', '<meta name="apple-mobile-web-app-title" content="Taller 7L">', 1),
            ('href="../icons/', 'href="icons/', 2), ('src="../icons/', 'src="icons/', 1), ('<title>Taller 7L · Beta</title>', '<title>Taller 7L</title>', 1),
            ('    <span class="t2beta" title="Versión de prueba del nuevo diseño">Beta</span>\n', '', 1), ("fetch('../seed.json')", "fetch('seed.json')", 1),
            ("icon:'../icons/icon-192.png', badge:'../icons/icon-192.png'", "icon:'icons/icon-192.png', badge:'icons/icon-192.png'", 1)]
    o = b
    for a, c, n in SUBS:
        assert o.count(a) == n, f'esperaba {n} de {a!r} y hay {o.count(a)}'
        o = o.replace(a, c)
    assert '../' not in re.sub(r'<script type="module">.*?</script>', '', o, flags=re.S).replace('</', ''), 'quedan rutas ../ fuera del código'
    old = re.search(r'<meta name="app-version" content="([^"]+)">', o).group(1)
    for x, y in [(f'<meta name="app-version" content="{old}">', f'<meta name="app-version" content="{ver}">'), (f'<span class="spver">v{old}</span>', f'<span class="spver">v{ver}</span>'), (f"window.APP_VERSION='{old}';", f"window.APP_VERSION='{ver}';"), (f"const APP_VERSION='{old}';", f"const APP_VERSION='{ver}';")]:
        o = o.replace(x, y); b = b.replace(x, y)
    assert o.count(ver) >= 4 and b.count(ver) >= 4
    open('index.html', 'w', encoding='utf-8').write(o); open('beta/index.html', 'w', encoding='utf-8').write(b)
    checks('index.html'); checks('beta/index.html')
    for sw, pre in [('sw.js', 'taller-v-'), ('beta/sw.js', 'taller-beta-')]:
        t = open(sw, encoding='utf-8').read(); t2 = re.sub(r"const CACHE = '[^']+'", f"const CACHE = '{pre}{ver}'", t); assert t2 != t; open(sw, 'w', encoding='utf-8').write(t2)
    hoy = datetime.date.today().isoformat(); ent = {'version': ver, 'fecha': hoy, 'notas': notas}
    for vf in ['version.json', 'beta/version.json']:
        vj = json.load(open(vf, encoding='utf-8')); vj = {**ent, 'historial': [ent] + [x for x in vj.get('historial', []) if x.get('version') != ver]}
        json.dump(vj, open(vf, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ch = open('CHANGELOG.md', encoding='utf-8').read(); ch = ch.replace('# Novedades\n', f'# Novedades\n\n## v{ver} · {hoy}\n' + ''.join(f'- {n}\n' for n in notas), 1); open('CHANGELOG.md', 'w', encoding='utf-8').write(ch)
    if os.environ.get('NOPUSH'): print('PREPARADO oficial', ver, '(sin subir)'); sys.exit()
    sh('git', 'add', 'index.html', 'sw.js', 'version.json', 'CHANGELOG.md', 'manifest.webmanifest', 'beta/index.html', 'beta/sw.js', 'beta/version.json', 'beta/manifest.webmanifest')
    msg = f'oficial {ver}: ' + ' · '.join(notas[:3]) + (' …' if len(notas) > 3 else '') + '\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01Po5nD6AnAZ3q1zEm4sK2cu'
    subprocess.run(['git', '-c', 'user.name=Q2Lummox', '-c', 'user.email=q2lummox@users.noreply.github.com', 'commit', '-q', '-m', msg], check=True)
    subprocess.run(['git', 'push', '-q', 'origin', 'main'], check=True)
    print('SUBIDA oficial', ver, sh('git', 'rev-parse', '--short', 'HEAD').strip()); sys.exit()
assert mode == 'beta'
h = checks('beta/index.html')
old = re.search(r'<meta name="app-version" content="([^"]+)">', h).group(1)
h = h.replace(f'<meta name="app-version" content="{old}">', f'<meta name="app-version" content="{ver}">')
h = h.replace(f'<span class="spver">v{old}</span>', f'<span class="spver">v{ver}</span>')
h = h.replace(f"window.APP_VERSION='{old}';", f"window.APP_VERSION='{ver}';").replace(f"const APP_VERSION='{old}';", f"const APP_VERSION='{ver}';")
assert h.count(ver) >= 4, 'no se cambiaron todas las marcas de versión'
open('beta/index.html', 'w', encoding='utf-8').write(h)
sw = open('beta/sw.js', encoding='utf-8').read(); sw = re.sub(r"const CACHE = 'taller-beta-[^']+'", f"const CACHE = 'taller-beta-{ver}'", sw); open('beta/sw.js', 'w', encoding='utf-8').write(sw)
vj = json.load(open('beta/version.json', encoding='utf-8'))
hoy = datetime.date.today().isoformat()
ent = {'version': ver, 'fecha': hoy, 'notas': notas}
vj = {**ent, 'historial': [ent] + [x for x in vj.get('historial', []) if x.get('version') != ver]}
json.dump(vj, open('beta/version.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
checks('beta/index.html')
sh('git', 'add', 'beta/index.html', 'beta/sw.js', 'beta/version.json')
msg = f'beta {ver}: ' + ' · '.join(notas) + '\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01Po5nD6AnAZ3q1zEm4sK2cu'
subprocess.run(['git', '-c', 'user.name=Q2Lummox', '-c', 'user.email=q2lummox@users.noreply.github.com', 'commit', '-q', '-m', msg], check=True)
subprocess.run(['git', 'push', '-q', 'origin', 'main'], check=True)
print('SUBIDO beta', ver, sh('git', 'rev-parse', '--short', 'HEAD').strip())
