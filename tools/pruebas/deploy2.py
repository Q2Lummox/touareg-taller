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
