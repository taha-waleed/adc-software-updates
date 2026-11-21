#!/usr/bin/env python3
"""MediLab X 10.1.2 — CSS-only unified light/dark, no application logic changes."""
from pathlib import Path
from hashlib import sha256
import json,re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'medilabx-ui-10.1.1/MediLabX.html'
DEST = ROOT/'medilabx-ui-10.1.2/MediLabX.html'
MANIFEST = ROOT/'m/update.json'
PATCH = ROOT/'m/ux-10.1.2-addon.html'
EXPECTED_SOURCE_SHA = 'f40c786d27a7fe51cbf6ed44046f844669cf3d4389e32de6d4709e847a3c9541'
EXPECTED_PATCH_SHA = 'c27d0c25cbe5af30ceffed4e14a6b12768136914a3dc023078f37c0d712d613d'
BASE_VERSION='10.1.1'
NEW_VERSION='10.1.2'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.1.1/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.1.2/MediLabX.html'
STYLE_MARK='mlx1012-professional-contrast-css'
REQUIRED=[
  'id="settings"','id="adc85UpdateCentre"','id="adc85UpdateOffer"',
  'id="adcSettingsList"','id="mlxPrefLight"','id="mlxPrefDark"',
  'mlx101-duotone-design-css','mlx1011-rect-sidebar-and-rates-css',
  'mlx108-radiology-and-analytics','mlx107-fishtank-css'
]
def digest(b):return sha256(b).hexdigest()
def publish():
    manifest=json.loads(MANIFEST.read_text('utf8'))
    if manifest.get('version')==NEW_VERSION:
        if DEST.exists() and manifest.get('htmlUrl')==NEW_URL and digest(DEST.read_bytes())==manifest.get('sha256'):
            print('PASS: existing MediLab X 10.1.2 release verified; no changes required')
            return
        raise RuntimeError('10.1.2 already in manifest with unmatched file; no overwrite')
    if (manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256')) != (BASE_VERSION,OLD_URL,EXPECTED_SOURCE_SHA):
        raise RuntimeError('Current manifest is not verified 10.1.1; refusing update')
    base=SOURCE.read_bytes()
    if digest(base)!=EXPECTED_SOURCE_SHA:
        raise RuntimeError('Base HTML checksum mismatch; refusing update')
    text=base.decode('utf8')
    absent=[x for x in REQUIRED if x not in text]
    if absent:
        raise RuntimeError('Required existing controls absent: '+','.join(absent))
    addon=PATCH.read_bytes()
    if digest(addon)!=EXPECTED_PATCH_SHA:
        raise RuntimeError('CSS-only additive patch SHA-256 mismatch')
    frag=addon.decode('utf8')
    if frag.count('<style id="'+STYLE_MARK+'">')!=1 or frag.count('</style>')!=1:
        raise RuntimeError('Stylesheet marker invalid')
    if '<script' in frag.lower() or '</body>' in frag.lower() or '<iframe' in frag.lower():
        raise RuntimeError('Add-on unexpectedly contains application logic')
    if STYLE_MARK in text:
        raise RuntimeError('Patch already exists in source')
    css=frag.split('<style id="'+STYLE_MARK+'">',1)[1].split('</style>',1)[0]
    if css.count('{')!=css.count('}'):
        raise RuntimeError('CSS block braces unbalanced')
    critical=['#adcSettingsList','#adcSettingsViews','.mlx-pref-segment',
       '#adc85NewVersion','prefers-reduced-motion','[data-mlx101-mode="dark"]']
    missing=[x for x in critical if x not in css]
    if missing:raise RuntimeError('Missing required UI corrections: '+','.join(missing))
    at=text.rfind('</body>')
    if at<0 or text.rfind('</html>')<0:
        raise RuntimeError('Source HTML incomplete')
    output=(text[:at]+frag+'\n'+text[at:]).encode('utf8')
    # Original HTML is entirely unchanged, and patch can be subtracted byte-for-byte.
    if output.replace(addon+b'\n',b'',1)!=base:
        raise RuntimeError('Original app bytes changed beyond CSS insertion')
    if output.count(STYLE_MARK.encode())!=1:
        raise RuntimeError('Unexpected duplicate style block')
    DEST.parent.mkdir(parents=True,exist_ok=True)
    if DEST.exists() and DEST.read_bytes()!=output:
        raise RuntimeError('Refusing to overwrite a different existing 10.1.2 release')
    if not DEST.exists():DEST.write_bytes(output)
    manifest['version']=NEW_VERSION
    manifest['htmlUrl']=NEW_URL
    manifest['sha256']=digest(output)
    manifest['notes']=[
       'Professional Light/Dark Duo-Tone contrast corrections across Settings, forms, tables, cards, popups and panels.',
       'Fixed mismatched pale Settings navigation in Dark Mode; restored consistent app-matching inner sidebar.',
       'Fixed Light/Dark segmented button labels with explicit high-contrast selected and unselected states.',
       'Software Updates release title and version now explicitly white on a solid Navy banner.',
       'Readable Segoe UI typography, calm hover transitions and reduced-motion accessibility support.',
       'Existing square left taskbar, Rate List, Fish Tank, patient records, reports, receipts and GitHub updater code unchanged.'
    ]
    MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n','utf8')
    print('PASS: source SHA256',digest(base))
    print('PASS: patch SHA256',digest(addon))
    print('PASS: non-CSS application bytes unchanged')
    print('PASS: new MediLab X version',NEW_VERSION)
    print('PASS: output bytes',len(output),'SHA256',digest(output))
if __name__=='__main__':publish()
