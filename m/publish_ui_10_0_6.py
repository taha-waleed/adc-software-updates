#!/usr/bin/env python3
"""Publish MediLab X 10.0.6 from the verified 10.0.5 release; add-on only."""
from pathlib import Path
import base64, hashlib, json, re, subprocess, tempfile, zlib

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'m/update.json'
SOURCE=ROOT/'medilabx-ui-10.0.5/MediLabX.html'
DEST=ROOT/'medilabx-ui-10.0.6/MediLabX.html'
PATCH=ROOT/'m/ux-10.0.6.patch.b64'
PREV_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.0.5/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.0.6/MediLabX.html'
PREV_SHA='ebee7d0a377eb6d62a687b324cd25bdcf6244810aa44ed98b8e81bc74ede2eea'
PATCH_SHA='465962699bdedee25d8c8d58b90e38ba875271724fc6664022a741f2ebe75686'
REQUIRED=['id="patientForm"','id="savePatient"','id="pAge"','id="pGender"','id="pDoctor"','id="adcSettingsList"','data-setting-view="mlxdoctors"','id="adc85Close"','id="adc85UpdateCentre"','mlx-ux105-fixed-mac-workspace']

def sha(data):return hashlib.sha256(data).hexdigest()

def build():
    m=json.loads(MANIFEST.read_text('utf-8'))
    if m.get('version')=='10.0.6':
        assert m.get('htmlUrl')==NEW_URL and DEST.is_file() and sha(DEST.read_bytes())==m.get('sha256')
        print('PASS: already published matching 10.0.6')
        return
    if m.get('version')!='10.0.5' or m.get('htmlUrl')!=PREV_URL or str(m.get('sha256','')).lower()!=PREV_SHA:
        raise RuntimeError('Live update channel differs from expected 10.0.5; publishing halted.')
    source=SOURCE.read_bytes()
    if sha(source)!=PREV_SHA:raise RuntimeError('10.0.5 source SHA-256 differs; publishing halted.')
    text=source.decode('utf-8')
    missing=[item for item in REQUIRED if item not in text]
    if missing:raise RuntimeError('Required source controls not found: '+', '.join(missing))
    if 'mlx106-clinical-validation-and-dialogs' in text:raise RuntimeError('Patch already in source; halting.')
    patch=zlib.decompress(base64.b64decode(PATCH.read_text('ascii').strip()))
    if sha(patch)!=PATCH_SHA:raise RuntimeError('Add-on integrity checksum mismatch.')
    fragment=patch.decode('utf-8')
    if fragment.count('<style id="mlx106-clinical-dialogs-css">')!=1 or fragment.count('<script id="mlx106-clinical-validation-and-dialogs">')!=1:
        raise RuntimeError('Expected unique add-on markers missing.')
    scripts=re.findall(r'<script[^>]*>(.*?)</script>',fragment,flags=re.S)
    if len(scripts)!=1:raise RuntimeError('Unexpected number of patch scripts.')
    with tempfile.TemporaryDirectory() as tmp:
        js=Path(tmp)/'clinical_106.js';js.write_text(scripts[0],'utf-8')
        subprocess.run(['node','--check',str(js)],check=True)
    pivot=text.rfind('</body>')
    if pivot<0 or text.rfind('</html>')<0:raise RuntimeError('Source HTML is incomplete.')
    output=(text[:pivot]+fragment+'\n'+text[pivot:]).encode('utf-8')
    if output.replace(patch+b'\n',b'',1)!=source:
        raise RuntimeError('Unrelated bytes modified, refusing to publish.')
    DEST.parent.mkdir(parents=True,exist_ok=True)
    if DEST.exists() and DEST.read_bytes()!=output:raise RuntimeError('Destination exists with different contents.')
    if not DEST.exists():DEST.write_bytes(output)
    m.update(version='10.0.6',htmlUrl=NEW_URL,sha256=sha(output))
    m['notes']=[
      'Patient registration: Age and Gender are required before saving or generating a new receipt.',
      'Referring Doctor defaults to Self for new registrations and after form reset.',
      'Settings Doctor Directory opens in a fixed modal with existing editable doctor controls.',
      'Application close request displays a Yes/No confirmation; no cancels closing.',
      'Existing patient data, receipt histories, design choices, and Electron update transport remain unchanged.'
    ]
    MANIFEST.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n','utf-8')
    print('PASS: derived 10.0.6 from verified 10.0.5')
    print('PASS: new HTML bytes',len(output),'sha256',sha(output))
    print('PASS: old source unchanged',sha(SOURCE.read_bytes()))
if __name__=='__main__':build()
