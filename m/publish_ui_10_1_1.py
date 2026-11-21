#!/usr/bin/env python3
"""MediLab X 10.1.1: strictly additive, square Sidebar + accessible Rates UI patch."""
from pathlib import Path
import hashlib, json, re, subprocess, tempfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'medilabx-ui-10.1.0' / 'MediLabX.html'
DEST = ROOT / 'medilabx-ui-10.1.1' / 'MediLabX.html'
ADDON = ROOT / 'm' / 'ux-10.1.1-addon.html'
MANIFEST = ROOT / 'm' / 'update.json'
OLD_VERSION = '10.1.0'
NEW_VERSION = '10.1.1'
OLD_SHA = '9f9ba1b0adfc2b3962d253d948e08d65ae02051c118d3870f9c3a81ca05c3674'
PATCH_SHA = '841b32581a3396a2b810a0b4ef555d078beda69524c855fd9f62d079400d2109'
OLD_URL = 'https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.1.0/MediLabX.html'
NEW_URL = 'https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.1.1/MediLabX.html'
STYLE_MARK = 'mlx1011-rect-sidebar-and-rates-css'
SCRIPT_MARK = 'mlx1011-rect-sidebar-and-rates-js'
REQUIRED = ['id="app"','id="nav"','id="reception"','id="reports"',
    'data-page="ratelist"','data-page="reports"', 'id="adc85UpdateCentre"',
    'mlx101-duotone-design-css','mlx110-workspace-polish-css',
    'mlx108-radiology-and-analytics', 'mlx107-fishtank-css',
    'mlx106-clinical-validation-and-dialogs']

def sha(data): return hashlib.sha256(data).hexdigest()

def publish():
    m=json.loads(MANIFEST.read_text('utf-8'))
    if m.get('version') == NEW_VERSION:
        if m.get('htmlUrl') == NEW_URL and DEST.exists() and sha(DEST.read_bytes()) == m.get('sha256'):
            print('PASS: MediLab X 10.1.1 already released with verified checksum')
            return
        raise RuntimeError('Existing 10.1.1 version differs; refusing overwrite')
    if (m.get('version'),m.get('htmlUrl'),m.get('sha256')) != (OLD_VERSION,OLD_URL,OLD_SHA):
        raise RuntimeError('Current official MediLab version changed; refusing update')
    source=SOURCE.read_bytes()
    if sha(source)!=OLD_SHA: raise RuntimeError('10.1.0 source checksum does not match manifest')
    text=source.decode('utf-8')
    missing=[x for x in REQUIRED if x not in text]
    if missing: raise RuntimeError('Mandatory application features missing: '+', '.join(missing))
    if STYLE_MARK in text or SCRIPT_MARK in text: raise RuntimeError('Patch already in base release')
    patch=ADDON.read_bytes()
    if sha(patch)!=PATCH_SHA: raise RuntimeError('Add-on file checksum mismatch')
    frag=patch.decode('utf-8')
    if frag.count('<style id="'+STYLE_MARK+'">')!=1 or frag.count('<script id="'+SCRIPT_MARK+'">')!=1:
        raise RuntimeError('Missing or duplicate CSS/JS patch blocks')
    block=re.search('<script id="'+SCRIPT_MARK+'">(.*?)</script>',frag,re.S)
    if not block or frag.count('</script>')!=1: raise RuntimeError('JavaScript block invalid')
    with tempfile.TemporaryDirectory() as tmp:
        file=Path(tmp)/'mlx1011.js';file.write_text(block.group(1),'utf-8')
        subprocess.run(['node','--check',str(file)],check=True)
    pos=text.rfind('</body>')
    if pos<0 or text.rfind('</html>')<0: raise RuntimeError('Source HTML closing tags missing')
    new=(text[:pos]+frag+'\n'+text[pos:]).encode('utf-8')
    if new.replace(patch+b'\n',b'',1)!=source:
        raise RuntimeError('Unrelated code changed during patch integration')
    if new.count(STYLE_MARK.encode())!=1 or new.count(SCRIPT_MARK.encode())!=1:
        raise RuntimeError('Duplicate patch markers')
    DEST.parent.mkdir(parents=True,exist_ok=True)
    if DEST.exists() and DEST.read_bytes()!=new:
        raise RuntimeError('Target 10.1.1 already exists with different content')
    if not DEST.exists(): DEST.write_bytes(new)
    m.update(version=NEW_VERSION,htmlUrl=NEW_URL,sha256=sha(new))
    m['notes']=[
        'Corrected left sidebar geometry to fully rectangular: no rounded outer corners, detached gap, shadow or glow.',
        'Restored the original Radiology Rate List item directly below Radiology Reports in the left sidebar, with a clean modern icon.',
        'Added visible Tests & Rates quick-access beside Patient Registration; both controls open the existing Rate List popup and honor permissions.',
        'Existing Navy Duo-Tone Light/Dark design, clinical workflows, Fish Tank, records, reports and receipts preserved.',
        'Original Electron update transport and GitHub m/update.json channel unchanged.'
    ]
    MANIFEST.write_text(json.dumps(m,indent=2,ensure_ascii=False)+'\n','utf-8')
    print('PASS: original release SHA256:',sha(SOURCE.read_bytes()))
    print('PASS: JavaScript syntax and required feature checks')
    print('PASS: additive patch only, bytes:',len(patch))
    print('PASS: new version:',NEW_VERSION,'html bytes:',len(new),'SHA256:',sha(new))
if __name__ == '__main__': publish()