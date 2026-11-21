#!/usr/bin/env python3
"""MediLab X 10.1 (manifest 10.1.0): additive, checksum-locked visual release.

Preserves all existing application scripts, records, saved workflow, and native updater.
"""
from pathlib import Path
import base64,hashlib,json,re,subprocess,tempfile,zlib

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.0.10/MediLabX.html'
DEST=ROOT/'medilabx-ui-10.1.0/MediLabX.html'
MANIFEST=ROOT/'m/update.json'
PATCH=ROOT/'m/ux-10.1.patch.b64'
BASE_VERSION='10.0.10'
NEW_VERSION='10.1.0'
BASE_SHA='3cb7cf460aebed3cd02b2271796fd0c40bfd253849f831fcc89664e18268f464'
PATCH_SHA='652ac5c022ee7493ab6a442000cae4cfb15760c863385361839935d352e074b8'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.0.10/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.1.0/MediLabX.html'
CSS_MARK='mlx101-duotone-design-css'
JS_MARK='mlx101-duotone-design-js'
REQUIRED=['id="app"','id="nav"','id="settings"','id="reports"','id="adc85UpdateCentre"',
          'mlx110-workspace-polish-js','mlx108-radiology-and-analytics',
          'mlx107-fishtank-css','mlx106-clinical-validation-and-dialogs',
          'id="mlx-theme-picker"','mlx-pref-design']

def sha(data):return hashlib.sha256(data).hexdigest()
def publish():
    m=json.loads(MANIFEST.read_text('utf-8'))
    if m.get('version')==NEW_VERSION:
        if m.get('htmlUrl')==NEW_URL and DEST.is_file() and sha(DEST.read_bytes())==m.get('sha256'):
            print('PASS: matching 10.1.0 already released');return
        raise RuntimeError('Existing 10.1.0 manifest differs; refusing overwrite.')
    if (m.get('version'),m.get('htmlUrl'),m.get('sha256'))!=(BASE_VERSION,OLD_URL,BASE_SHA):
        raise RuntimeError('Live MediLab manifest is no longer verified 10.0.10; abort without modifying release.')
    source=SOURCE.read_bytes()
    if sha(source)!=BASE_SHA:raise RuntimeError('Source SHA-256 differs from verified 10.0.10.')
    html=source.decode('utf-8')
    missing=[x for x in REQUIRED if x not in html]
    if missing:raise RuntimeError('Required application controls missing: '+', '.join(missing))
    if CSS_MARK in html or JS_MARK in html:raise RuntimeError('Patch identifiers already in source.')
    fragment=zlib.decompress(base64.b64decode(''.join(PATCH.read_text('ascii').split())))
    if sha(fragment)!=PATCH_SHA:raise RuntimeError('Duo-Tone patch SHA-256 invalid.')
    addon=fragment.decode('utf-8')
    if addon.count('<style id="'+CSS_MARK+'">')!=1 or addon.count('<script id="'+JS_MARK+'">')!=1:
        raise RuntimeError('Missing or repeated patch blocks.')
    js=re.search(r'<script id="'+JS_MARK+r'">(.*?)</script>',addon,re.S)
    if not js or addon.count('</script>')!=1:raise RuntimeError('JavaScript add-on invalid.')
    with tempfile.TemporaryDirectory() as tmp:
        file=Path(tmp)/'ui_101.js';file.write_text(js.group(1),'utf-8')
        subprocess.run(['node','--check',str(file)],check=True)
    end=html.rfind('</body>')
    if end<0 or html.rfind('</html>')<0:raise RuntimeError('Incomplete original HTML.')
    output=(html[:end]+addon+'\n'+html[end:]).encode('utf-8')
    if output.replace(fragment+b'\n',b'',1)!=source:
        raise RuntimeError('Original code modified outside additive skin: abort.')
    if output.count(CSS_MARK.encode())!=1 or output.count(JS_MARK.encode())!=1:
        raise RuntimeError('Patch markers duplicated.')
    DEST.parent.mkdir(parents=True,exist_ok=True)
    if DEST.exists() and DEST.read_bytes()!=output:raise RuntimeError('Release file exists with different bytes; do not overwrite.')
    if not DEST.exists():DEST.write_bytes(output)
    m['version']=NEW_VERSION
    m['htmlUrl']=NEW_URL
    m['sha256']=sha(output)
    m['notes']=[
       'MediLab X 10.1: unified Navy Duo-Tone design with consistent light and dark modes across existing workspaces.',
       'Restored flat classic left sidebar: no floating glow, refined line icons and subtle hover/focus interactions.',
       'Settings, Admin, patient tables, radiology, reports and update card share high-contrast accessible typography and surfaces.',
       'Removed alternate theme palettes from the visible interface; existing user preference data is retained.',
       'Maintained fixed Settings frame, inner scrolling, Fish Tank, Tests & Rates, notifications and all pre-existing workflows.',
       'HTML-only verified GitHub update, local data records, receipt/report handlers and native Electron updater unchanged.'
    ]
    MANIFEST.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n','utf-8')
    print('PASS: Source unchanged SHA-256',sha(SOURCE.read_bytes()))
    print('PASS: Additive design size',len(fragment),'bytes')
    print('PASS: JS syntax and required features')
    print('PASS: New release version',NEW_VERSION,'SHA-256',sha(output))
    print('PASS: Existing GitHub update channel preserved')
if __name__=='__main__':publish()
