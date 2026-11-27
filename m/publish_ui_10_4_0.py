#!/usr/bin/env python3
"""MediLab X 10.4.0 GitHub HTML patch over verified 10.2.11 full-feature source.
The offline Windows source ZIP is based on user's 10.0.3 archive, while this
online release preserves newer 10.2.11 clinical workflows and storage.
No local patient records are included, sent, copied or rewritten by this script.
"""
import json,hashlib,re,subprocess,tempfile,argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.2.11/MediLabX.html'
DEST=ROOT/'medilabx-ui-10.4.0/MediLabX.html'
CSS=ROOT/'m/ux-10.4.0-settings.css'
JS=ROOT/'m/ux-10.4.0-settings.js'
MANIFEST=ROOT/'m/update.json'
BASE_SHA='6548605a1168a78c282647ccca3c17243196c405217b66556e06a36cda63c8e4'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.11/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.0/MediLabX.html'
VERSION='10.4.0'
REQUIRED=[
'id="app"','id="settings"','id="admin"','id="adcSettingsList"','id="adcSettingsViews"',
'id="patientForm"','id="savePatient"','id="patients"','id="reports"',
'id="userForm"','id="adcPermissionOptions"','id="doctorForm"','id="deletePinForm"',
'id="deletedPatientRows"','id="adc85UpdateCentre"','id="adc85CheckUpdates"',
'id="adc85UpdateNow"','id="adc85RestoreUpdate"','id="backupData"','id="restoreData"',
'medilabx10_html_v1','id="mlx101-privacy-standby-js"'
]
NOTES=[
'MediLab X 10.4: Settings no longer uses the unwanted dashboard or vertical main-page scrolling; click a left tile to display the selected original Settings controls on the right.',
'Fixed Software Updates navigation and duplicate release-note presentation. Existing native Check for updates, Download/Install, Restore previous and SHA-256 validation functions are unchanged.',
'Admin simplified to clear Accounts, Doctors & Referrals, Security & Archives and (where present) Staff & Stock tabs. Existing forms, role permissions and PIN workflows remain connected.',
'Light/dark contrast, round icon tiles and smooth selected-panel animations improved without modifying printing, receipt templates or clinical data.',
'This online release is based on 10.2.11, to retain its newer features and local-storage schema. The separately provided Windows source ZIP uses the previously supplied 10.0.3 project as its packaging base.',
'Back up patient records before installing. The Windows installer is not compiled or physically tested by this GitHub workflow.'
]
def sha(x):return hashlib.sha256(x).hexdigest()
def compile_html():
    raw=SOURCE.read_bytes()
    if sha(raw)!=BASE_SHA:raise RuntimeError('Original production HTML changed; aborting unsafe update')
    html=raw.decode('utf-8')
    missing=[x for x in REQUIRED if x not in html]
    if missing:raise RuntimeError('Missing native clinical/update controls: '+repr(missing))
    if 'id="ml104-online-css"' in html or 'id="ml104-online-js"' in html:
        raise RuntimeError('Duplicate UI patch already present')
    css=CSS.read_text(encoding='utf-8')
    js=JS.read_text(encoding='utf-8')
    if css.count('{')!=css.count('}'):raise RuntimeError('CSS braces unbalanced')
    for k in ['@media screen','#adcSettingsList','#adcSettingsViews','.mlx-mac-layout','#admin','.mlx-pref-empty']:
        if k not in css:raise RuntimeError('Missing CSS selector: '+k)
    for k in ['function chosen(','function showAdmin(','function fit(','root.querySelector']:
        if k not in js:raise RuntimeError('Missing UI helper '+k)
    for forbidden in ['localStorage.', 'saveDB(', 'loadDB(', 'installOnline(', 'rollbackUpdate(', 'fetch(', 'XMLHttpRequest']:
        if forbidden in js:raise RuntimeError('Unexpected data/update I/O in UI patch: '+forbidden)
    with tempfile.TemporaryDirectory() as directory:
        f=Path(directory)/'ui.js';f.write_text(js,encoding='utf-8')
        subprocess.run(['node','--check',str(f)],check=True)
    marker=re.search(r'</body>\s*</html>\s*$',html,re.I)
    if not marker:raise RuntimeError('Unexpected original HTML close tags')
    add=('\n<style id="ml104-online-css">\n'+css.rstrip('\n')+'\n</style>\n'
         '<script id="ml104-online-js">\n'+js.rstrip('\n')+'\n</script>\n')
    result=html[:marker.start()]+add+html[marker.start():]
    if not result.startswith(html[:marker.start()]):raise RuntimeError('Original HTML modified')
    if result.count('id="ml104-online-css"')!=1 or result.count('id="ml104-online-js"')!=1:
        raise RuntimeError('Missing 10.4 patch marker')
    return result.encode('utf-8')
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--qa',action='store_true')
    parser.add_argument('--qa-output',default='/tmp/MediLabX-10.4.0-QA.html')
    args=parser.parse_args()
    result=compile_html();digest=sha(result)
    if args.qa:
        output=Path(args.qa_output);output.parent.mkdir(parents=True,exist_ok=True)
        output.write_bytes(result)
        print('PASS 10.2.11 exact clinical source + 10.4 scoped Settings/Admin patch')
        print('PASS new JS syntax and native functions preserved')
        print('QA HTML:',output,'bytes:',len(result),'sha256:',digest)
        return
    manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
    if manifest.get('version')==VERSION:
        if DEST.exists() and DEST.read_bytes()==result and manifest.get('sha256')==digest and manifest.get('htmlUrl')==NEW_URL:
            print('PASS existing 10.4.0 publication verified',digest);return
        raise RuntimeError('Different 10.4.0 publication exists; aborting')
    expected=(manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))
    if expected!=('10.2.11',OLD_URL,BASE_SHA):
        raise RuntimeError('Production manifest advanced or changed; aborting: '+repr(expected))
    if DEST.exists() and DEST.read_bytes()!=result:raise RuntimeError('Conflicting 10.4.0 HTML')
    DEST.parent.mkdir(parents=True,exist_ok=True);DEST.write_bytes(result)
    manifest.update(version=VERSION,htmlUrl=NEW_URL,sha256=digest,notes=NOTES)
    MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print('PASS published MediLab X 10.4.0 GitHub HTML; sha256',digest,'bytes',len(result))
if __name__=='__main__':main()
