#!/usr/bin/env python3
"""MediLab X 10.4.9: single What's New toggle and updater popup contrast.
    UI-only release against exact official 10.4.8 clinical HTML.
"""
from pathlib import Path
import argparse,base64,hashlib,json,re,subprocess,tempfile,zlib

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.4.8/MediLabX.html'
TARGET=ROOT/'medilabx-ui-10.4.9/MediLabX.html'
MANIFEST=ROOT/'m/update.json'
SOURCE_SHA='413ac670e33365ac85b7319305f663313c64ac3134548968bde4158007107818'
CSS_SHA='88df4dbff43e9a848216b94b1ed2a48d956b65f65180906fce130fecee464820'
JS_SHA='98033479a81c99e1afc50fe58b4b76cdc63918d7d1a42f8872a45cd9401962ba'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.8/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.9/MediLabX.html'
NOTES=[
  'MediLab X 10.4.9: professional Software Updates section with compact status, consistent actions and simplified visual hierarchy.',
  'Removed visible GitHub/Release Spotlight promotional copy, legacy duplicated release notes and redundant technical footer text, while retaining underlying native update functionality.',
  'One collapsible What’s New panel: current workspace features when up to date; automatically switches to What’s New in MediLab X (version) with official manifest notes when an update is available.',
  'Updating MediLab popup fixed in Light and Dark themes: white text on navy header and high-contrast text/buttons on white or dark slate content surfaces.',
  'Improved faded account/footer contrast in navy sidebar; corrected Settings HTML version badge to 10.4.9.',
  'No changes to native Check for updates, Update Now, Restore previous, SHA256 verification, clinical patient records, receipts, doctors, payroll or printers.',
  'Verified UI-only browser tests with simulated available/up-to-date states, single-toggle behavior, Light/Dark modal readability and 1600/1100/990 viewport sizes.',
  'Actual Windows EXE updater network/backup/printing and real clinical records were not physically tested. Keep a patient-data backup before updating.'
]
def digest(data):return hashlib.sha256(data).hexdigest()
def unpack(name,expected):
    packed=(ROOT/'m'/name).read_text(encoding='utf8').strip()
    data=zlib.decompress(base64.b64decode(packed,validate=True))
    if digest(data)!=expected:raise RuntimeError('Failed content SHA-256 check for '+name)
    return data.decode('utf8')
def build():
    base=SOURCE.read_bytes()
    if digest(base)!=SOURCE_SHA:
        raise RuntimeError('Official 10.4.8 production HTML changed; abort to protect patient workflows')
    html=base.decode('utf8')
    for key in ['id="settings"','id="adc85UpdateCentre"','id="adc85UpdateOverlay"',
        'id="adc85UpdateNow"','id="adc85RestoreUpdate"','id="adc85CheckUpdates"',
        'id="adc85NotesToggle"','id="adc85ReleaseNotes"','id="adc85NewVersion"',
        'id="patientForm"','id="patientRows"','id="admin"','medilabx10_html_v1','id="mlx1048-ui-js"']:
        if key not in html:raise RuntimeError('Original critical UI control missing: '+key)
    if 'id="mlx1049-updates-js"' in html:raise RuntimeError('10.4.9 already embedded in parent HTML')
    css=unpack('ux-10.4.9-updates.css.z64',CSS_SHA)
    js=unpack('ux-10.4.9-updates.js.z64',JS_SHA)
    if css.count('{')!=css.count('}'):raise RuntimeError('Broken screen-only stylesheet')
    if '@media screen' not in css or '#adc85UpdateOverlay' not in css or '#adc85UpdateCentre' not in css:
        raise RuntimeError('Updater visual theme is incomplete')
    for prohibited in ['localStorage.clear(', 'indexedDB.deleteDatabase(', 'fetch(', 'XMLHttpRequest(', 'saveDB(', 'installOnline(', 'rollbackUpdate(']:
        if prohibited in js:raise RuntimeError('Unexpected updater/data transport change: '+prohibited)
    for required in ['function available()', 'function offeredVersion()', 'function renderNotes(', 'function ensure(']:
        if required not in js:raise RuntimeError('Incomplete release-notes UI logic: '+required)
    with tempfile.TemporaryDirectory() as temp:
        jsfile=Path(temp)/'patch.js';jsfile.write_text(js,encoding='utf8')
        subprocess.run(['node','--check',str(jsfile)],check=True)
    end=re.search(r'</body>\s*</html>\s*$',html,re.I)
    if not end:raise RuntimeError('Unexpected official HTML ending')
    patch='\n<style id="mlx1049-updates-css">\n'+css+'\n</style>\n<script id="mlx1049-updates-js">\n'+js+'\n</script>\n'
    out=(html[:end.start()]+patch+html[end.start():]).encode('utf8')
    if out[:end.start()]!=base[:end.start()]:
        raise RuntimeError('Original clinical logic was modified')
    if out.count(b'id="mlx1049-updates-js"')!=1:raise RuntimeError('Duplicate UI patch')
    return out
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--qa',action='store_true')
    parser.add_argument('--qa-output',default='/tmp/MediLabX-10.4.9-QA.html')
    args=parser.parse_args()
    result=build();checksum=digest(result)
    if args.qa:
        out=Path(args.qa_output);out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(result)
        print('QA 10.4.9 generated',len(result),checksum)
        return
    meta=json.loads(MANIFEST.read_text(encoding='utf8'))
    current=(meta.get('version'),meta.get('htmlUrl'),meta.get('sha256'))
    if current[0]=='10.4.9':
        if TARGET.exists() and TARGET.read_bytes()==result and current[2]==checksum:
            print('Verified existing 10.4.9 publication');return
        raise RuntimeError('10.4.9 version conflict')
    if current!=('10.4.8',OLD_URL,SOURCE_SHA):
        raise RuntimeError('Published update channel changed; refusing to overwrite '+str(current))
    if TARGET.exists() and TARGET.read_bytes()!=result:
        raise RuntimeError('Existing 10.4.9 HTML differs')
    TARGET.parent.mkdir(parents=True,exist_ok=True);TARGET.write_bytes(result)
    meta.update(version='10.4.9',htmlUrl=NEW_URL,sha256=checksum,notes=NOTES)
    MANIFEST.write_text(json.dumps(meta,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print('PUBLISHED MediLab X 10.4.9',checksum,'bytes',len(result))
if __name__=='__main__':main()
