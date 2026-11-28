#!/usr/bin/env python3
"""MediLab X 10.4.8: verified visual-only update on the exact released 10.4.7."""
from pathlib import Path
import argparse,base64,hashlib,json,re,subprocess,tempfile,zlib
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.4.7/MediLabX.html'
TARGET=ROOT/'medilabx-ui-10.4.8/MediLabX.html'
MANIFEST=ROOT/'m/update.json'
BEFORE_SHA='e581060ba013b6170af93711926fecda71871d02bfb679ffe55458acd8d389cf'
CSS_SHA='c9336af82e20b36d25d5778f69b5edf61874054f0fb2d9b78461fbb26fc1ec20'
JS_SHA='7f3d27c22f3528c0b65f2233115e0df6b6e3d0f142f924bcb000787abe9e2217'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.7/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.8/MediLabX.html'
NOTES=[
 'MediLab X 10.4.8: fixed selected Settings text highlighting in the navy sidebar; navigation text now remains opaque white in Light and Dark themes.',
 'Audited 15 displayed Settings categories. The empty Gemini subscription page and conflicting Interface Layout switch are hidden in Standard; original underlying settings and saved data are preserved for compatibility.',
 'Verified navigation across the remaining 13 tabs in Light and Dark modes: Centre & Receipts, Appearance, Doctors, Rate List, Notifications, Software Updates, Animations, Now Brief, AI Personalization, WhatsApp, Printing, Developer and Backup.',
 'Fixed Dark Mode text contrast on New Patient, clock/calendar, notification bell, Check for updates, Restore previous, and Admin/employee text inputs.',
 'Unified font, panel, forms, tables, action-button and focus contrast between Light/Dark modes without changing receipt, printing or user-record code.',
 'Sidebar/Rate List active-state consistency improved; Settings HTML version badge corrected to 10.4.8.',
 'Strictly HTML-only UI patch; existing patient/receipt data, doctor directories, employee records, native GitHub updater, printing and Local Storage schemas unchanged.',
 'GitHub browser smoke tests use isolated synthetic records and cannot certify the actual installed Windows EXE, physical printing, live backups, server APIs or every privileged Developer action. Keep a backup and test on a workstation.'
]
def sha(b):return hashlib.sha256(b).hexdigest()
def get_asset(name,expected):
    packed=(ROOT/'m'/name).read_text(encoding='utf8').strip()
    result=zlib.decompress(base64.b64decode(packed,validate=True))
    if sha(result)!=expected:raise RuntimeError('Patch asset SHA-256 mismatch: '+name)
    return result.decode('utf8')
def build():
    raw=SOURCE.read_bytes()
    if sha(raw)!=BEFORE_SHA:raise RuntimeError('Official 10.4.7 clinical HTML source changed; refusing update')
    source=raw.decode('utf8')
    required=['id="settings"','id="app"','id="admin"','id="adcSettingsViews"','id="adcSettingsList"',
        'id="patientForm"','id="patientRows"','id="adc85UpdateNow"','id="adc85RestoreUpdate"',
        'id="mlx1047-fix-js"','id="mlx1046-patch-js"','medilabx10_html_v1','mlx_operations_v1']
    missing=[k for k in required if k not in source]
    if missing:raise RuntimeError('Missing original UI functions: '+str(missing))
    if 'id="mlx1048-ui-js"' in source:raise RuntimeError('Duplicate 10.4.8 patch in base')
    css=get_asset('ux-10.4.8-settings-contrast.css.z64',CSS_SHA)
    js=get_asset('ux-10.4.8-settings-audit.js.z64',JS_SHA)
    if css.count('{')!=css.count('}'):raise RuntimeError('CSS bracket mismatch')
    if any(k not in js for k in ['function syncNav()','function hideUnavailable()','function markUsableControls()','function fixLabelSelection()']):
        raise RuntimeError('Settings regression handler is incomplete')
    if any(k in js for k in ['localStorage.clear(', 'indexedDB.deleteDatabase(', 'fetch(', 'XMLHttpRequest(', 'saveDB(', 'fs.writeFileSync(']):
        raise RuntimeError('Unexpected data mutation/network operation in visual-only patch')
    with tempfile.TemporaryDirectory() as t:
        file=Path(t)/'patch.js';file.write_text(js,encoding='utf8')
        subprocess.run(['node','--check',str(file)],check=True)
    m=re.search(r'</body>\s*</html>\s*$',source,re.I)
    if not m:raise RuntimeError('Unexpected HTML ending; abort')
    inject='\n<style id="mlx1048-ui-css">\n'+css+'\n</style>\n<script id="mlx1048-ui-js">\n'+js+'\n</script>\n'
    result=(source[:m.start()]+inject+source[m.start():]).encode('utf8')
    if result[:m.start()]!=raw[:m.start()]:raise RuntimeError('Original clinical HTML unexpectedly mutated')
    if result.count(b'id="mlx1048-ui-js"')!=1 or result.count(b'id="mlx1048-ui-css"')!=1:raise RuntimeError('Duplicate patch injection')
    return result
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--qa',action='store_true')
    parser.add_argument('--qa-output',default='/tmp/MediLabX-10.4.8-QA.html')
    args=parser.parse_args()
    content=build();outsha=sha(content)
    if args.qa:
        target=Path(args.qa_output);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(content)
        print('Verified 10.4.8 QA HTML',outsha,len(content),target)
        return
    meta=json.loads(MANIFEST.read_text(encoding='utf8'))
    current=(meta.get('version'),meta.get('htmlUrl'),meta.get('sha256'))
    if current[0]=='10.4.8':
        if TARGET.exists() and TARGET.read_bytes()==content and current[2]==outsha:
            print('Existing 10.4.8 release verified');return
        raise RuntimeError('10.4.8 manifest conflict')
    if current!=('10.4.7',OLD_URL,BEFORE_SHA):
        raise RuntimeError('Unexpected installed update channel; refusing overwrite '+str(current))
    if TARGET.exists() and TARGET.read_bytes()!=content:raise RuntimeError('Existing 10.4.8 file conflicts')
    TARGET.parent.mkdir(parents=True,exist_ok=True)
    TARGET.write_bytes(content)
    meta.update(version='10.4.8',htmlUrl=NEW_URL,sha256=outsha,notes=NOTES)
    MANIFEST.write_text(json.dumps(meta,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print('PUBLISHED 10.4.8',outsha,len(content))
if __name__=='__main__':main()
