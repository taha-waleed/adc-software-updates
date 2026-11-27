#!/usr/bin/env python3
"""MediLab X 10.4.7, checked patch on the exact published 10.4.6 source."""
import argparse,base64,hashlib,json,re,subprocess,tempfile,zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.4.6/MediLabX.html'
TARGET=ROOT/'medilabx-ui-10.4.7/MediLabX.html'
MANIFEST=ROOT/'m/update.json'
OLD_SHA='53b9b86461724a0ba6acf69e44ee22dd297734012be0ca47fcec38fb53ce7613'
PY_SHA='1d8aa8e9f7f4952966641495c860701de0525cfec1acc2d17f51df9a93edd747'
CSS_SHA='676c22dc7396231a61932b4aa879f653abfc3b62495ecb6545f5aa320daf8f1a'
JS_SHA='a3a1cc02fce64d2ad1f967fb1d32f7b334a938f72ed8c1849aa048cb5de3a0fe'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.6/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.7/MediLabX.html'
NOTES=[
 'MediLab X 10.4.7: Employee Administration now opens as a tab in Admin & Users, with the existing employee, experience-letter, leave and salary controls preserved inside the main workspace.',
 'Employee Directory supports optional CNIC (stored in existing employee-only local records, masked in list), search, Remove (soft archive), Show archived and Restore. Historical references are retained.',
 'Settings now opens to a new MediLab X Settings overview, with short professional descriptions; selecting a Settings tab opens its original functional controls.',
 'Fish Tank decorative animation script, graphics and settings card removed from this HTML release.',
 'Formal Segoe UI typography; clearer MediLab branding; consistent Light/Dark surfaces and contrast, including the top workstation header and HR forms.',
 'Rate List sidebar shortcut opens the dedicated Rate List settings tab instead of leaving an unrelated Settings panel on screen with an incorrect active sidebar shortcut.',
 'Existing patient/receipt records, report editors, native updater, print templates and clinical business logic are otherwise preserved; CNIC is sensitive and remains locally stored in the employee operations dataset.',
 'Automated browser QA used synthetic employee records and original update controls. Physical Windows EXE, data confidentiality posture and all printer/device workflows require workstation acceptance testing. Back up data before installing.'
]
def sha(b):return hashlib.sha256(b).hexdigest()
def read(name,expected):
    raw=(ROOT/'m'/name).read_text(encoding='utf8').strip()
    buf=zlib.decompress(base64.b64decode(raw,validate=True))
    if sha(buf)!=expected:raise RuntimeError('Invalid 10.4.7 patch source hash: '+name)
    return buf.decode('utf8')
def build():
    original=SOURCE.read_bytes()
    if sha(original)!=OLD_SHA:raise RuntimeError('Production MediLab X 10.4.6 source mismatch. Refusing to patch unknown clinical code.')
    source=original.decode('utf8')
    needed=['medilabx10_html_v1','mlx_operations_v1','id="settings"','id="admin"','id="patientForm"',
            'id="adc85UpdateNow"','id="adc85RestoreUpdate"','function renderEmployees()',
            'function navigateHR(','id="mlx107-fishtank-css"','id="mlx107-fishtank-settings-and-animation"']
    missing=[k for k in needed if k not in source]
    if missing:raise RuntimeError('Missing original controls: '+str(missing))
    if 'id="mlx1047-fix-js"' in source:raise RuntimeError('10.4.7 patch already exists in source')
    core=read('patch_core_10_4_7.py.z64',PY_SHA)
    ns={'__name__':'__patch_module__'}
    exec(compile(core,'patch_core_10_4_7.py','exec'),ns)
    patched=ns['transform'](source,require_fish=True)
    if 'id="mlx107-fishtank-css"' in patched or 'id="mlx107-fishtank-settings-and-animation"' in patched:
        raise RuntimeError('Fish decorative code not removed')
    if patched.count('name="cnic"')!=1 or 'data-employee-action="remove"' not in patched:
        raise RuntimeError('Employee edit/remove changes incomplete')
    for key in ['medilabx10_html_v1','id="patientForm"','id="adc85UpdateNow"',
                'id="adc85RestoreUpdate"','function renderLeaves()','function renderLetters()']:
        if key not in patched:raise RuntimeError('Essential original control missing after patch: '+key)
    css=read('ux-10.4.7.css.z64',CSS_SHA)
    js=read('ux-10.4.7.js.z64',JS_SHA)
    if css.count('{')!=css.count('}'):raise RuntimeError('CSS braces unbalanced')
    for prohibited in ['localStorage.clear(', 'indexedDB.deleteDatabase(', 'fetch(', 'XMLHttpRequest(', 'eval(', 'Function(']:
        if prohibited in js:raise RuntimeError('Unexpected destructive/network operation in visual patch '+prohibited)
    if any(k not in js for k in ['function normalizeHR()', 'function createWelcome()', 'function openEmployees(', 'function syncNavigation()']):
        raise RuntimeError('Required UI functions missing')
    with tempfile.TemporaryDirectory() as t:
        path=Path(t)/'10_4_7.js';path.write_text(js,encoding='utf8')
        subprocess.run(['node','--check',str(path)],check=True)
    close=re.search(r'</body>\s*</html>\s*$',patched,re.I)
    if not close:raise RuntimeError('Unexpected original HTML end')
    injection='\n<style id="mlx1047-fix-css">\n'+css+'\n</style>\n<script id="mlx1047-fix-js">\n'+js+'\n</script>\n'
    result=(patched[:close.start()]+injection+patched[close.start():]).encode('utf8')
    if result.count(b'id="mlx1047-fix-js"')!=1 or result.count(b'id="mlx1047-fix-css"')!=1:
        raise RuntimeError('Unexpected patch duplication')
    return result
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--qa',action='store_true')
    parser.add_argument('--qa-output',default='/tmp/MediLabX-10.4.7-QA.html')
    a=parser.parse_args()
    result=build();digest=sha(result)
    if a.qa:
        out=Path(a.qa_output);out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(result)
        print('QA 10.4.7 HTML ready',len(result),'sha256',digest,'at',out)
        return
    manifest=json.loads(MANIFEST.read_text(encoding='utf8'))
    current=(manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))
    if current[0]=='10.4.7':
        if TARGET.exists() and TARGET.read_bytes()==result and current[2]==digest:
            print('Verified existing 10.4.7 publication');return
        raise RuntimeError('Unexpected 10.4.7 manifest conflict')
    if current!=('10.4.6',OLD_URL,OLD_SHA):
        raise RuntimeError('Update channel was changed; refusing to overwrite newer release '+str(current))
    if TARGET.exists() and TARGET.read_bytes()!=result:raise RuntimeError('Conflicting 10.4.7 file')
    TARGET.parent.mkdir(parents=True,exist_ok=True);TARGET.write_bytes(result)
    manifest.update(version='10.4.7',htmlUrl=NEW_URL,sha256=digest,notes=NOTES)
    MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print('PUBLISHED MediLab X 10.4.7',digest,'bytes',len(result))
if __name__=='__main__':main()
