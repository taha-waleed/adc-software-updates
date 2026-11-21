#!/usr/bin/env python3
"""MediLab X 10.0.10 release: additive presentation layer only, protected by checksums."""
from pathlib import Path
import base64, hashlib, json, re, subprocess, tempfile, zlib

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT/'m/update.json'
SOURCE = ROOT/'medilabx-ui-10.0.9/MediLabX.html'
DEST = ROOT/'medilabx-ui-10.0.10/MediLabX.html'
PATCH = ROOT/'m/ux-10.0.10.patch.b64'
PREVIOUS_VERSION = '10.0.9'
NEW_VERSION = '10.0.10'
PREVIOUS_SHA = 'b768b3351da066bd704c7a977d4be4573860d3431c4b6d9debcaf799cfdf57ce'
PATCH_SHA = 'd34b9ad4ee3a477d8977dcd6a70ae57582bcca2b6db3738d956e07577dccd70e'
OLD_URL = 'https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.0.9/MediLabX.html'
NEW_URL = 'https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.0.10/MediLabX.html'
STYLE_MARK = 'mlx110-workspace-polish-css'
SCRIPT_MARK = 'mlx110-workspace-polish-js'
REQUIRED = (
    'id="app"', 'id="nav"', 'id="reports"', 'id="settings"',
    'id="adc85UpdateCentre"', 'id="adc85UpdateOffer"', 'id="toast"',
    'mlx108OpenRates', 'mlx108-radiology-and-analytics',
    'mlx107-fishtank-css', 'mlx106-clinical-validation-and-dialogs'
)

def sha(data:bytes)->str:
    return hashlib.sha256(data).hexdigest()

def publish():
    manifest=json.loads(MANIFEST.read_text('utf-8'))
    if manifest.get('version')==NEW_VERSION:
        if manifest.get('htmlUrl')==NEW_URL and DEST.is_file() and sha(DEST.read_bytes())==manifest.get('sha256'):
            print('PASS: already published matching MediLab X 10.0.10')
            return
        raise RuntimeError('10.0.10 manifest differs; refusing to overwrite')
    if (manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256')) != (PREVIOUS_VERSION,OLD_URL,PREVIOUS_SHA):
        raise RuntimeError('MediLab update channel has changed: publish aborted without changes')
    original=SOURCE.read_bytes()
    if sha(original)!=PREVIOUS_SHA:
        raise RuntimeError('Original 10.0.9 HTML checksum differs: publish aborted')
    source=original.decode('utf-8')
    missing=[marker for marker in REQUIRED if marker not in source]
    if missing:
        raise RuntimeError('Required source features missing: '+', '.join(missing))
    if STYLE_MARK in source or SCRIPT_MARK in source:
        raise RuntimeError('10.0.10 fragment already exists in base release')
    payload=base64.b64decode(''.join(PATCH.read_text('ascii').split()))
    fragment=zlib.decompress(payload)
    if sha(fragment)!=PATCH_SHA:
        raise RuntimeError('UI fragment SHA256 mismatch')
    html_fragment=fragment.decode('utf-8')
    if html_fragment.count('<style id="'+STYLE_MARK+'">')!=1 or html_fragment.count('<script id="'+SCRIPT_MARK+'">')!=1:
        raise RuntimeError('Missing or duplicated patch identifiers')
    script=re.search(r'<script id="'+SCRIPT_MARK+r'">(.*?)</script>',html_fragment,re.S)
    if script is None or html_fragment.count('</script>')!=1:
        raise RuntimeError('Embedded JS block is incomplete')
    with tempfile.TemporaryDirectory() as tmp:
        js=Path(tmp)/'medilab_110.js'
        js.write_text(script.group(1),'utf-8')
        subprocess.run(['node','--check',str(js)],check=True)
    end=source.rfind('</body>')
    if end<0 or source.rfind('</html>')<0:
        raise RuntimeError('Incomplete base HTML')
    output=(source[:end]+html_fragment+'\n'+source[end:]).encode('utf-8')
    if output.replace(fragment+b'\n',b'',1)!=original:
        raise RuntimeError('Unrelated HTML bytes altered')
    if output.count(STYLE_MARK.encode())!=1 or output.count(SCRIPT_MARK.encode())!=1:
        raise RuntimeError('Patch marker count failed')
    DEST.parent.mkdir(parents=True,exist_ok=True)
    if DEST.exists() and DEST.read_bytes()!=output:
        raise RuntimeError('Version 10.0.10 destination already exists with different bytes')
    if not DEST.exists():
        DEST.write_bytes(output)
    manifest.update(version=NEW_VERSION,htmlUrl=NEW_URL,sha256=sha(output))
    manifest['notes']=[
      'New Floating Mini Sidebar: slim rounded navigation, modern line icons, original feature locations and permissions retained.',
      'Moved Rate List affordance to Radiology Reports header as Tests & Rates; existing working popup and add/edit/delete functions reused.',
      'Fixed notification visibility: floating top-right toasts stay below the taskbar, correctly stacked without blocking clicks.',
      'Settings uses the selected Aurora Floating Glass style with fixed outer workspace and scrolling inner content.',
      'Software Updates release card uses the selected Carbon Pro high-contrast theme; GitHub update mechanism unchanged.',
      'Existing fish tank, clinical records, admin/security, receipts, reports and native Electron updater unchanged.'
    ]
    MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n','utf-8')
    print('PASS: Original 10.0.9 unchanged:',sha(SOURCE.read_bytes()))
    print('PASS: Only additive CSS/JS inserted:',len(fragment),'bytes')
    print('PASS: JavaScript syntax checks completed')
    print('PASS: Version 10.0.10 HTML bytes:',len(output))
    print('PASS: Manifest SHA256:',sha(output))
if __name__=='__main__':
    publish()
