#!/usr/bin/env python3
"""MediLab X 10.1.3: safe final Rate List dock and dark-toggle contrast hotfix.
Every pre-existing clinical, updater and theme implementation byte preserved.
"""
from pathlib import Path
import hashlib, json, re, subprocess, tempfile

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'m/update.json'
SOURCE=ROOT/'medilabx-ui-10.1.2/MediLabX.html'
DEST=ROOT/'medilabx-ui-10.1.3/MediLabX.html'
ADDON=ROOT/'m/ux-10.1.3-bottom-rates.html'
EXPECTED_SHA='5e08660e1f756eb411293c94141b5f1f8769778e0f2569e5c5d6753cf3654126'
ADDON_SHA='cab88fd360a9997eb5b0ececcebb3d043becc100e1781eff9d18d07a81d23cee'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.1.2/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.1.3/MediLabX.html'
REQUIRED=('mlx1012-professional-contrast-css','mlx1011-rect-sidebar-and-rates-js',
          'mlx108-radiology-and-analytics','id="settings"','id="nav"','id="adc85UpdateCentre"')

def sha(data):return hashlib.sha256(data).hexdigest()

def main():
    manifest=json.loads(MANIFEST.read_text('utf-8'))
    if manifest.get('version')=='10.1.3':
        if DEST.is_file() and manifest.get('htmlUrl')==NEW_URL and sha(DEST.read_bytes())==manifest.get('sha256'):
            print('PASS: matching 10.1.3 already live')
            return
        raise RuntimeError('10.1.3 already published with different content. Aborted.')
    if (manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))!=('10.1.2',OLD_URL,EXPECTED_SHA):
        raise RuntimeError('Live manifest is not expected 10.1.2, refusing publication.')
    original=SOURCE.read_bytes()
    if sha(original)!=EXPECTED_SHA:raise RuntimeError('Source checksum does not match manifest.')
    html=original.decode('utf-8')
    missing=[m for m in REQUIRED if m not in html]
    if missing:raise RuntimeError('Missing expected existing UI features: '+', '.join(missing))
    patch=ADDON.read_bytes()
    if sha(patch)!=ADDON_SHA:raise RuntimeError('Bottom Rate List patch checksum mismatch.')
    addon=patch.decode('utf-8')
    css_id='mlx1013-bottom-rates-css'
    js_id='mlx1013-bottom-rates-js'
    if html.count(css_id) or html.count(js_id):raise RuntimeError('Bottom patch was already applied.')
    if addon.count('<style id="'+css_id+'">')!=1 or addon.count('<script id="'+js_id+'">')!=1:
        raise RuntimeError('Unexpected number of patch blocks.')
    scripts=re.findall(r'<script id="'+js_id+r'">(.*?)</script>',addon,flags=re.S)
    if len(scripts)!=1:raise RuntimeError('Rate List script block missing.')
    with tempfile.TemporaryDirectory() as td:
        f=Path(td)/'dock.js';f.write_text(scripts[0],'utf-8')
        subprocess.run(['node','--check',str(f)],check=True)
    pos=html.rfind('</body>')
    if pos<0 or html.rfind('</html>')<0:raise RuntimeError('Incomplete 10.1.2 HTML.')
    output=(html[:pos]+addon+'\n'+html[pos:]).encode('utf-8')
    if output.replace(patch+b'\n',b'',1)!=original:
        raise RuntimeError('Original application source modified outside additive patch.')
    if output.count(css_id.encode())!=1 or output.count(js_id.encode())!=1:
        raise RuntimeError('Patch marker duplication.')
    DEST.parent.mkdir(parents=True,exist_ok=True)
    if DEST.exists() and DEST.read_bytes()!=output:raise RuntimeError('Refusing to overwrite an existing release file.')
    if not DEST.exists(): DEST.write_bytes(output)
    manifest.update(version='10.1.3',htmlUrl=NEW_URL,sha256=sha(output))
    manifest['notes']=[
      'MediLab X 10.1 final polish: compact Rate List button at the very bottom of the classic left navigation, above Sign Out.',
      'Removed duplicate Rate List sidebar entry while preserving the existing Radiology Rate List popup and test management actions.',
      'Final dark-mode Light/Dark selected-state contrast correction.',
      'Retained 10.1.2 unified professional Navy/White-Slate theme, consistent Settings panel, typography, cards and high-contrast update banner.',
      'Smooth restrained hover interactions and reduced-motion preference retained.',
      'No patient records, receipts, reports, stock, login, clinical workflows or Electron GitHub updater changed.'
    ]
    MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('PASS: original release SHA',sha(original))
    print('PASS: patch SHA',sha(patch))
    print('PASS: untouched original application preserved')
    print('PASS: JavaScript syntax checked')
    print('PASS: new version 10.1.3 HTML bytes',len(output),'SHA',sha(output))
if __name__=='__main__':main()
