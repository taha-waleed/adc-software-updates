#!/usr/bin/env python3
"""Publish HTML-only MediLab X 10.0.11; do not build or announce an EXE."""
from pathlib import Path
import gzip, base64, hashlib, json, re

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'medilab-x' / 'current'
PUBLISH = ROOT / 'medilab-x'
OUT = PUBLISH / 'MediLab_X_10_0_11.html'
MAN = PUBLISH / 'update.json'
VERS = '10.0.11'
CURRENT_NATIVE = '10.0.11'
SRC_PARTS = json.loads((SRC / 'source-manifest.json').read_text('utf-8'))
assert SRC_PARTS['version'] == CURRENT_NATIVE
compressed = ''.join((SRC / f'index.html.gz.part{i:02d}.txt').read_text('utf-8').strip()
                     for i in range(1, int(SRC_PARTS['indexParts']) + 1))
original = gzip.decompress(base64.b64decode(compressed))
assert hashlib.sha256(original).hexdigest() == SRC_PARTS['indexHtmlSha256'], 'Source HTML SHA mismatch'
html = original.decode('utf-8')

# The verified base UI is unchanged. All new fixes are additive and HTML-only.
for file in ['medilab-rev2.css', 'medilab-rev3.css', 'medilab-rev4.css',
             'medilab-nowbrief.css', 'medilab-notifications-107.css', 'medilab-final-108.css']:
    css = (SRC / file).read_text('utf-8').replace('</style', '<\\/style')
    pattern = r'<link\s+rel=["\']stylesheet["\']\s+href=["\']' + re.escape(file) + r'["\']\s*/?>'
    html, n = re.subn(pattern, lambda _: '<style data-source="' + file + '">\n' + css + '\n</style>', html, flags=re.I)
    assert n == 1, (file, n)
for file in ['medilab-operations.js', 'medilab-documents.js', 'medilab-rev4.js',
             'medilab-nowbrief.js', 'medilab-final-108.js']:
    js = (SRC / file).read_text('utf-8')
    assert '</script' not in js.lower(), file
    pattern = r'<script\s+src=["\']' + re.escape(file) + r'["\']\s+defer\s*></script>'
    html, n = re.subn(pattern, lambda _: '<script data-source="' + file + '">\n' + js + '\n</script>', html, flags=re.I)
    assert n == 1, (file, n)

# Inline the original heartbeat logo; keep the previous design selections.
logo = (SRC / 'assets' / 'MediLab-Heartbeat.png.base64').read_text('utf-8').strip()
assert base64.b64decode(logo).startswith(b'\x89PNG')
html = html.replace('src="assets/MediLab-Heartbeat.png"', 'src="data:image/png;base64,' + logo + '"')

# HTML only: notification theme fix + One UI-inspired updates, no change to native binary.
css = (SRC / 'medilab-html-1010.css').read_text('utf-8')
js = (SRC / 'medilab-html-1010.js').read_text('utf-8')
assert '</script' not in js.lower()
assert html.lower().count('</head>') >= 1 and html.lower().count('</body>') >= 1
html = html[:html.lower().find('</head>')] + '<style data-source="medilab-html-1010.css">\n' + css + '\n</style>\n' + html[html.lower().find('</head>'):]
body_end=html.lower().rfind('</body>'); assert body_end>0
html=html[:body_end]+'<script data-source="medilab-html-1010.js">\n'+js+'\n</script>\n'+html[body_end:]
# Include the refined Light/Dark clock, 3D chart and verified HTML updater control.
css111=(SRC/'medilab-final-111.css').read_text('utf-8')
js111=(SRC/'medilab-final-111.js').read_text('utf-8')
assert '</script' not in js111.lower()
head_end=html.lower().find('</head>'); assert head_end>0
html=html[:head_end]+'<style data-source="medilab-final-111.css">\n'+css111+'\n</style>\n'+html[head_end:]
body_end=html.lower().rfind('</body>'); assert body_end>0
html=html[:body_end]+'<script data-source="medilab-final-111.js">\n'+js111+'\n</script>\n'+html[body_end:]
html = '<!-- MediLab X 10.0.11 standalone HTML edition; native shell stays 10.0.11. No installer. -->\n' + html
PUBLISH.mkdir(parents=True, exist_ok=True)
OUT.write_text(html, 'utf-8')
sha = hashlib.sha256(OUT.read_bytes()).hexdigest()

# Compatibility: v10.0.11 native EXE checks version/downloadUrl/sha256.
# NEVER advertise an HTML-only change as a newer EXE version.
manifest = json.loads(MAN.read_text('utf-8'))
assert manifest['version'] == CURRENT_NATIVE
assert re.fullmatch(r'[0-9a-f]{64}', manifest['sha256'])
assert '/medilab-x-v10.0.11/MediLab-X-Setup-10.0.11-x64.exe' in manifest['downloadUrl']
manifest['htmlVersion'] = VERS
manifest['htmlUrl'] = 'https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilab-x/MediLab_X_10_0_11.html'
manifest['htmlSha256'] = sha
manifest['htmlReleaseNotes'] = [
    'Analog + Digital clock styling refined for Light and Dark themes, with no calendar icon',
    'Animated downward-expanding calendar without a visible scrollbar',
    'Interactive 3D chart for CT, X-Ray and Ultrasound based on real receipts',
    'Preserved Prism Ribbon, Original Heartbeat and animated 270px clock',
    'One-time native 10.0.11 bridge allows future HTML-only updates without new installers'
]
MAN.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', 'utf-8')
print('HTML-only published:', OUT, OUT.stat().st_size, sha)
print('Native app remains v10.0.11; no installer built or linked as a new version.')