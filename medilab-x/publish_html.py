#!/usr/bin/env python3
"""Build a standalone MediLab X HTML from the versioned GitHub source, preserving the Windows installer update channel."""
from pathlib import Path
import gzip, base64, hashlib, json, re

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'medilab-x'/'current'
OUT=ROOT/'medilab-x'/'MediLab_X_10_0_8.html'
MAN=ROOT/'medilab-x'/'update.json'
parts=json.loads((SRC/'source-manifest.json').read_text('utf-8'))
compressed=''.join((SRC/f'index.html.gz.part{i:02d}.txt').read_text('utf-8').strip() for i in range(1,int(parts['indexParts'])+1))
original=gzip.decompress(base64.b64decode(compressed))
assert hashlib.sha256(original).hexdigest()==parts['indexHtmlSha256'], 'Source HTML SHA mismatch'
html=original.decode('utf-8')

# Inlining files preserves the browser-compatible UI and allows a single HTML to open offline.
for item in ['medilab-rev2.css','medilab-rev3.css','medilab-rev4.css','medilab-nowbrief.css','medilab-notifications-107.css','medilab-final-108.css']:
    css=(SRC/item).read_text('utf-8').replace('</style','<\\/style')
    pattern=r'<link\s+rel=["\']stylesheet["\']\s+href=["\']'+re.escape(item)+r'["\']\s*/?>'
    html,n=re.subn(pattern,lambda _: '<style data-source="'+item+'">\n'+css+'\n</style>',html,flags=re.I)
    assert n==1,(item,n)
for item in ['medilab-operations.js','medilab-documents.js','medilab-rev4.js','medilab-nowbrief.js','medilab-final-108.js']:
    js=(SRC/item).read_text('utf-8')
    assert '</script' not in js.lower(),item
    pattern=r'<script\s+src=["\']'+re.escape(item)+r'["\']\s+defer\s*></script>'
    html,n=re.subn(pattern,lambda _: '<script data-source="'+item+'">\n'+js+'\n</script>',html,flags=re.I)
    assert n==1,(item,n)

logo_file=SRC/'assets'/'MediLab-Heartbeat.png.base64'
logo=logo_file.read_text('utf-8').strip()
# PNG is published as base64 text in source to keep GitHub files text-only.
assert base64.b64decode(logo).startswith(b'\x89PNG'), 'Invalid logo'
html=html.replace('src="assets/MediLab-Heartbeat.png"', 'src="data:image/png;base64,'+logo+'"')
# Reference to an optional directory should remain local to the native app; standalone preview is not a data migration.
html='<!-- MediLab X 10.0.8 standalone HTML — Windows-specific printing, secure updates and WhatsApp require the EXE installer. -->\n'+html
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(html,'utf-8')
sha=hashlib.sha256(OUT.read_bytes()).hexdigest()
manifest=json.loads(MAN.read_text('utf-8'))
assert manifest['version']=='10.0.8', 'Refusing to overwrite a different version manifest'
assert manifest['downloadUrl'].startswith('https://github.com/taha-waleed/adc-software-updates/releases/download/medilab-x-v10.0.8/'), 'Installer URL mismatch'
assert re.fullmatch(r'[0-9a-f]{64}',manifest['sha256']), 'Installer hash missing'
manifest['htmlUrl']='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilab-x/MediLab_X_10_0_8.html'
manifest['htmlSha256']=sha
MAN.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n','utf-8')
print(f'Published standalone HTML, {OUT.stat().st_size} bytes, SHA256 {sha}')
print('Installer version and SHA256 preserved; old 8.x manifest remains untouched.')