#!/usr/bin/env python3
"""Publish MediLab X 10.0.5 strictly by extending the live GitHub 10.0.4 HTML.
Never change 10.0.4 or earlier releases, updater transport, or clinical handlers.
"""
from pathlib import Path
import base64,hashlib,json,subprocess,tempfile,zlib
ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'m/update.json'
SOURCE=ROOT/'medilabx-ui-10.0.4/MediLabX.html'
DEST=ROOT/'medilabx-ui-10.0.5/MediLabX.html'
BUNDLE=ROOT/'m/ui-10.0.5.b64'
PREV_VERSION='10.0.4'
NEW_VERSION='10.0.5'
PREV_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.0.4/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.0.5/MediLabX.html'
PREV_SHA='5d7bf36273e3470efd8e9e2aaebc92985629f10dbd6f460c1447e2ca8039f111'
STYLE_MARK='mlx-ux105-fixed-mac-workspace'
SCRIPT_MARK='mlx-ux105-shortcut-and-preferences'
REQUIRED=['id="settings"','id="admin"','id="adcSettingsList"','id="adcSettingsViews"','id="adc85UpdateNow"','id="userForm"','id="doctorForm"','id="adc85UpdateCentre"','id="adc85UpdateOffer"','data-page="settings"','mlx-selected-ui-2026-11']

def sha(data): return hashlib.sha256(data).hexdigest()
def build():
    m=json.loads(MANIFEST.read_text('utf-8'))
    if m.get('version')!=PREV_VERSION or m.get('htmlUrl')!=PREV_URL or m.get('sha256','').lower()!=PREV_SHA:
        raise RuntimeError('10.0.4 channel is not the expected verified base. Publishing halted.')
    source=SOURCE.read_bytes()
    if sha(source)!=PREV_SHA:raise RuntimeError('GitHub 10.0.4 HTML hash mismatch. Publishing halted.')
    text=source.decode('utf-8')
    missing=[x for x in REQUIRED if x not in text]
    if missing:raise RuntimeError('Missing mandatory existing application element(s): '+', '.join(missing))
    if STYLE_MARK in text or SCRIPT_MARK in text:raise RuntimeError('10.0.5 patch already present in base')
    if text.rfind('</body>')==-1:raise RuntimeError('HTML incomplete')
    bundle=json.loads(zlib.decompress(base64.b64decode(BUNDLE.read_text('ascii').strip())))
    css,js=bundle['css'],bundle['js']
    with tempfile.TemporaryDirectory() as td:
        p=Path(td)/'ux-test.js';p.write_text(js,'utf-8')
        subprocess.run(['node','--check',str(p)],check=True)
    style=f'<style id="{STYLE_MARK}">\n{css}\n</style>\n'
    script=f'<script id="{SCRIPT_MARK}">\n{js}\n</script>\n'
    at=text.rfind('</body>')
    output=text[:at]+style+script+text[at:]
    # Clinical code and updater must be identical after stripping our two new blocks.
    if output.replace(style,'',1).replace(script,'',1).encode('utf-8')!=source:
        raise RuntimeError('Unrelated code changed')
    # Byte-for-byte reversibility above is stronger than counting literal selector strings.
    if output.count(STYLE_MARK)!=1 or output.count(SCRIPT_MARK)!=1:
        raise RuntimeError('Patch markers duplicated')
    data=output.encode('utf-8')
    DEST.parent.mkdir(parents=True,exist_ok=True)
    if DEST.exists() and DEST.read_bytes()!=data:raise RuntimeError('Destination exists with different contents')
    if not DEST.exists():DEST.write_bytes(data)
    m['version']=NEW_VERSION;m['htmlUrl']=NEW_URL;m['sha256']=sha(data)
    m['notes']=[
        'Selected Mac Preferences: fixed-size Settings workspace with separate inner scrolling only.',
        'Removed the duplicate theme selection card; compact live accent and light/dark controls now live inside Appearance.',
        'Modern slim Settings icons, preference rows and Admin Workspace without changing original forms.',
        'Release Spotlight retains live GitHub updater and existing verified-install workflow.',
        'Developer Corner shortcut Ctrl+D opens the original password-protected Developer Options.',
        'Original clinical data, receipts, lab functions and Electron updater transport unchanged.'
    ]
    MANIFEST.write_text(json.dumps(m,indent=2,ensure_ascii=False)+'\n','utf-8')
    print('PASS: 10.0.5 HTML bytes:',len(data))
    print('PASS: sha256:',sha(data))
    print('PASS: 10.0.4 source untouched:',sha(source))
    print('PASS: manifest moved to:',NEW_VERSION)
if __name__=='__main__':build()
