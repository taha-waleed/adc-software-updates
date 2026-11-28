#!/usr/bin/env python3
"""MediLab X 10.4.11: single native update confirmation and stable update controls.
Release input is SHA256-verified official MediLab X 10.4.10 HTML.
"""
import argparse,base64,hashlib,json,re,subprocess,tempfile,zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.4.10/MediLabX.html'
TARGET=ROOT/'medilabx-ui-10.4.11/MediLabX.html'
MANIFEST=ROOT/'m/update.json'
OLD_SHA='1c084a4b6e5a9b106282f36a664ab462820c31691f2ab2a5f90bec97056731f5'
CSS_SHA='b3ecbcc042a2d0db429ed9a2f30ea10ec069cdbdcd64ee4678247da2be7888f8'
JS_SHA='6daaac721db0bb6cc2efcf96648f14a523ef8bc1b7fd163bf2b8e8fcd1a94c0e'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.10/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.11/MediLabX.html'
NOTES=[
 'MediLab X 10.4.11: Update Now now invokes the existing Windows updater once, showing a single native confirmation instead of two simultaneous native/HTML dialogs.',
 'The old Updating MediLab overlay is suppressed during native confirmation; Cancel restores button state and reports cancellation without changing saved clinical records.',
 'Update Now, Remind Me Later and Restore previous now share one responsive button row when an update is available.',
 'The redundant Check for updates action is hidden when a version is already offered; normal Check for updates remains available when up to date.',
 'Current HTML interface release labels visually show 10.4.11 in Settings, About and Software Updates; Windows shell version is separate.',
 'Original desktop SHA-256 verification, backup snapshot, download, restart and rollback implementations are not modified.',
 'QA: production-source Chromium simulation on 1600/1100/990 windows, native bridge mock call-once/cancel, offered/up-to-date action states, responsive buttons and Light/Dark modes.',
 'Important: browser tests simulate the Electron bridge, not an actual Windows restart or patient database migration. Back up records before installing.'
]
def sha(x):return hashlib.sha256(x).hexdigest()
def asset(name,expected):
    data=zlib.decompress(base64.b64decode((ROOT/'m'/name).read_text(encoding='utf8').strip(),validate=True))
    if sha(data)!=expected:raise RuntimeError('Asset hash check failed: '+name)
    return data.decode('utf8')
def build():
    source=SOURCE.read_bytes()
    if sha(source)!=OLD_SHA:raise RuntimeError('Unexpected source (not official MediLab 10.4.10); refusing unsafe update')
    html=source.decode('utf8')
    required=['id="settings"','id="adc85UpdateCentre"','id="adc85UpdateOverlay"','id="adc85UpdateOffer"',
      'id="adc85UpdateNow"','id="adc85CheckUpdates"','id="adc85RemindLater"',
      'id="adc85RestoreUpdate"','id="adc85ModalPrimary"',
      'id="patientForm"','id="patientRows"','id="adc85NewVersion"',
      'id="mlx10410-js"','medilabx10_html_v1']
    missing=[s for s in required if s not in html]
    if missing:raise RuntimeError('Original app controls missing: '+str(missing))
    if 'id="mlx10411-js"' in html:raise RuntimeError('Duplicate 10.4.11 UI patch')
    css=asset('ux-10.4.11.css.z64',CSS_SHA)
    js=asset('ux-10.4.11.js.z64',JS_SHA)
    if css.count('{')!=css.count('}') or '@media screen' not in css:raise RuntimeError('Invalid screen-only CSS')
    for key in ['function captureNativeInstall(', 'function applyButtons(', "api.installOnline()", 'stopImmediatePropagation()', 'result?.cancelled']:
        if key not in js:raise RuntimeError('Missing confirmation/UI fix: '+key)
    for forbidden in ['localStorage.clear(', 'indexedDB.deleteDatabase(', 'fetch(', 'XMLHttpRequest(', 'saveDB(', 'rollbackUi(', 'installUpdate(']:
        if forbidden in js:raise RuntimeError('Unexpected data/transport change '+forbidden)
    with tempfile.TemporaryDirectory() as d:
        f=Path(d)/'patch.js';f.write_text(js,encoding='utf8')
        subprocess.run(['node','--check',str(f)],check=True)
    end=re.search(r'</body>\s*</html>\s*$',html,re.I)
    if not end:raise RuntimeError('Unexpected closing HTML structure')
    injection='\n<style id="mlx10411-css">\n'+css+'\n</style>\n<script id="mlx10411-js">\n'+js+'\n</script>\n'
    result=(html[:end.start()]+injection+html[end.start():]).encode('utf8')
    if result[:end.start()]!=source[:end.start()]:raise RuntimeError('Existing patient/updater scripts unexpectedly changed')
    if result.count(b'id="mlx10411-js"')!=1:raise RuntimeError('Duplicate marker')
    return result
def main():
    p=argparse.ArgumentParser()
    p.add_argument('--qa',action='store_true')
    p.add_argument('--qa-output',default='/tmp/MediLabX-10.4.11-QA.html')
    opts=p.parse_args();built=build();checksum=sha(built)
    if opts.qa:
        dest=Path(opts.qa_output);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(built)
        print('10.4.11 QA fixture',len(built),'bytes sha256',checksum)
        return
    manifest=json.loads(MANIFEST.read_text(encoding='utf8'))
    state=(manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))
    if state[0]=='10.4.11':
        if TARGET.exists() and TARGET.read_bytes()==built and state[2]==checksum:
            print('Existing 10.4.11 release verified');return
        raise RuntimeError('Conflicting 10.4.11 publication')
    if state!=('10.4.10',OLD_URL,OLD_SHA):
        raise RuntimeError('Official version has changed; refusing to overwrite '+str(state))
    if TARGET.exists() and TARGET.read_bytes()!=built:raise RuntimeError('10.4.11 HTML conflict')
    TARGET.parent.mkdir(parents=True,exist_ok=True)
    TARGET.write_bytes(built)
    manifest.update(version='10.4.11',htmlUrl=NEW_URL,sha256=checksum,notes=NOTES)
    MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print('PUBLISHED 10.4.11',checksum,len(built))
if __name__=='__main__':main()
