#!/usr/bin/env python3
"""Verified 10.4.5 HTML-only UI update. Leaves native clinical source and data keys untouched."""
import argparse,base64,hashlib,json,re,subprocess,tempfile,zlib
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
SOURCE=BASE/'medilabx-ui-10.4.0/MediLabX.html'
TARGET=BASE/'medilabx-ui-10.4.5/MediLabX.html'
MANIFEST=BASE/'m/update.json'
PREVIOUS_SHA='b1ddc56a8fdf8869d9dc4486f99a2ff6817f03121a935c2a7552528950b28e10'
CSS_SHA='50c6631b8829528aa16a63401f2f687f6c822cfc3efcdc14f1ab4fa244368ec2'
JS_SHA='6755061b08b87a846551f35bd6c158a02db8cda9bc809f33c4f03b32b0221def'
URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.5/MediLabX.html'
PREV_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.0/MediLabX.html'
KEYS=['id="app"','id="admin"','id="settings"','id="adcSettingsList"','id="adcSettingsViews"',
'id="patientRows"','id="patientForm"','id="doctorForm"','id="rateRows"','id="adc85CheckUpdates"','id="adc85UpdateNow"','id="adc85RestoreUpdate"','medilabx10_html_v1']
NOTES=[
"Version 10.4.5: unified minimalist light/dark design inspired by clean desktop account-settings tabs; simple text-only navigation and matching buttons, tables and panels.",
"Settings and Admin use compact pill tabs without the old Settings dashboard; doctor directory opens in a section instead of a separate popup.",
"Performing and referring doctors have searchable short lists, add/rename/remove controls, and a view-all option (Admin). Doctor activity is summarized from existing patient registrations, with date filters.",
"Rate List provides a separate simple section for adding, editing, removing and changing service prices. Existing historical patient bills are not rewritten.",
"Patient & Receipts shows an AM/PM time when the existing record has a valid createdAt timestamp; original records without a timestamp are unchanged.",
"Notification search is removed; an available update can start using the existing native Update Now button. The original authenticated updater, SHA-256 verification and rollback are unchanged.",
"Fish-tank decorations hidden; taskbar, icons, popups and privacy lock receive a quieter UI and Aurora-style screen styling where matching native lock elements are present.",
"This update is an HTML-only UI/workflow patch over verified 10.4.0. Physical Windows app, printer, historical records, all workflows and privacy-screen compatibility still require user acceptance testing. Back up patient data before installing."
]
def digest(data):return hashlib.sha256(data).hexdigest()
def unpack(name,expected):
    b64=(BASE/'m'/name).read_text(encoding='utf8').strip()
    result=zlib.decompress(base64.b64decode(b64,validate=True))
    if digest(result)!=expected:raise RuntimeError('10.4.5 source integrity check failed: '+name)
    return result.decode('utf8')
def build():
    source=SOURCE.read_bytes()
    if digest(source)!=PREVIOUS_SHA:raise RuntimeError('Official 10.4.0 clinical UI changed unexpectedly; abort')
    text=source.decode('utf8')
    missing=[k for k in KEYS if k not in text]
    if missing:raise RuntimeError('Missing essential installed functionality: '+str(missing))
    if 'id="mlx1045-screen-js"' in text:raise RuntimeError('10.4.5 UI already present in base')
    css=unpack('ux-10.4.5-unified.css.z64',CSS_SHA)
    js=unpack('ux-10.4.5-unified.js.z64',JS_SHA)
    if css.count('{')!=css.count('}'):raise RuntimeError('Broken stylesheet block structure')
    if any(x in js for x in ('localStorage.clear(', 'indexedDB.deleteDatabase(', 'fetch(', 'XMLHttpRequest(')):
        raise RuntimeError('Unexpected destructive or remote operation in UI patch')
    if any(x not in js for x in ('function setupSettings(', 'function renderDoctors(', 'function renderRates(', 'function annotatePatientRows(', 'function setupNotifications(')):
        raise RuntimeError('Incomplete UI patch')
    with tempfile.TemporaryDirectory() as temp:
        jsfile=Path(temp)/'test.js';jsfile.write_text(js,encoding='utf8')
        subprocess.run(['node','--check',str(jsfile)],check=True)
    end=re.search(r'</body>\s*</html>\s*$',text,re.I)
    if not end:raise RuntimeError('Unexpected HTML end')
    patch='\n<style id="mlx1045-screen-css">\n'+css+'\n</style>\n<script id="mlx1045-screen-js">\n'+js+'\n</script>\n'
    updated=(text[:end.start()]+patch+text[end.start():]).encode('utf8')
    if updated[:end.start()]!=source[:end.start()]:raise RuntimeError('Original medical functions unexpectedly changed')
    if updated.count(b'id="mlx1045-screen-js"')!=1:raise RuntimeError('Update injection not unique')
    return updated
def main():
    args=argparse.ArgumentParser()
    args.add_argument('--qa',action='store_true')
    args.add_argument('--qa-output',default='/tmp/MediLabX-10.4.5-QA.html')
    a=args.parse_args()
    data=build()
    if a.qa:
        dest=Path(a.qa_output);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
        print('QA fixture written',dest,'bytes',len(data),'sha256',digest(data))
        return
    manifest=json.loads(MANIFEST.read_text(encoding='utf8'))
    expected=(manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))
    if manifest.get('version')=='10.4.5':
        if TARGET.exists() and TARGET.read_bytes()==data and manifest.get('sha256')==digest(data):
            print('10.4.5 already correctly published');return
        raise RuntimeError('Conflicting version 10.4.5 manifest')
    if expected!=('10.4.0',PREV_URL,PREVIOUS_SHA):
        raise RuntimeError('Existing update channel changed; refusing to overwrite a newer release: '+str(expected))
    if TARGET.exists() and TARGET.read_bytes()!=data:raise RuntimeError('10.4.5 file conflict')
    TARGET.parent.mkdir(parents=True,exist_ok=True);TARGET.write_bytes(data)
    manifest.update(version='10.4.5',htmlUrl=URL,sha256=digest(data),notes=NOTES)
    MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print('PUBLISHED 10.4.5',digest(data),len(data))
if __name__=='__main__':main()
