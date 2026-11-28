#!/usr/bin/env python3
"""Verified MediLab X 10.4.12 UI-only patch on released 10.4.11 HTML."""
from pathlib import Path
import argparse,base64,hashlib,json,re,subprocess,tempfile,zlib
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'medilabx-ui-10.4.11/MediLabX.html'
TARGET=ROOT/'medilabx-ui-10.4.12/MediLabX.html'
MANIFEST=ROOT/'m/update.json'
OLD_SHA='b2ca5a298fe3851028917ca608fc56e41d77c7ae2fd5102038eeadc64e61a5e1'
CSS_SHA='4c7debb9b3dab855599232f087f35e3da770bb597559b4ed0b95c8979eea7815'
JS_SHA='d01e41ddc255267ae1c45c8e2d04f977cf74a619daf1d35f278d5f32f18b2b33'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.11/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.12/MediLabX.html'
NOTES=[
 'MediLab X 10.4.12: fixed doubled current-version heading in Software Updates. Native status stays functional; legacy CSS pseudo-version text is suppressed and UI labels synchronize to 10.4.12.',
 'Improved navy-to-violet update hero: readable high-contrast white headings and descriptions, consistent Inter/Manrope typography in Light and Dark modes.',
 'Fixed Whats New alignment and duplicate version generated text: one left-aligned accordion; the heading shows the installed UI version, or the offered update version when an update is available.',
 'Reception tests/services uses a compact list without an inner scrollbar: four rows initially, six search results, and a Show all/Show fewer action for complete access.',
 'The existing test search, Add buttons, selected services, billing and patient registration handlers are unchanged. All existing tests remain accessible.',
 'Only screen-specific CSS and scoped UI JavaScript are appended to the verified 10.4.11 HTML. Original patient records, print templates, native update transport, SHA-256 verification and backups are preserved.',
 'Synthetic Chromium browser regression passed for responsive viewports, update text, expandable test list, and Light/Dark presentation. Actual Windows/printing/clinical workflow requires workstation acceptance testing.'
]
def sha(data):return hashlib.sha256(data).hexdigest()
def get_asset(name,expected):
    data=zlib.decompress(base64.b64decode((ROOT/'m'/name).read_text(encoding='utf8').strip(),validate=True))
    if sha(data)!=expected:raise RuntimeError('MediLab X 10.4.12 asset verification failed: '+name)
    return data.decode('utf8')
def build():
    original=BASE.read_bytes()
    if sha(original)!=OLD_SHA:raise RuntimeError('Official 10.4.11 HTML modified; refusing to change unknown clinical code')
    html=original.decode('utf8')
    required=['id="settings"','id="reception"','id="patientForm"','id="testSearch"','id="testResults"',
      'id="testCount"','id="adc85UpdateHeading"','id="adc85UpdateOffer"',
      'id="adc85UpdateNow"','id="adc85CheckUpdates"','id="adc85RestoreUpdate"',
      'id="mlx10411-js"','id="mlx10410-js"','medilabx10_html_v1']
    missing=[key for key in required if key not in html]
    if missing:raise RuntimeError('Existing clinical/update controls missing: '+str(missing))
    if 'id="mlx10412-script"' in html:raise RuntimeError('10.4.12 patch already present')
    css=get_asset('ux-10.4.12.css.z64',CSS_SHA)
    js=get_asset('ux-10.4.12.js.z64',JS_SHA)
    if not css.lstrip().startswith('/* MediLab X 10.4.12') or css.count('{')!=css.count('}'):
        raise RuntimeError('Invalid or unbalanced CSS patch')
    if any(key not in js for key in ['function syncVersions()', 'function setupTests()', "const VERSION='10.4.12'", "MutationObserver(syncTestList)"]):
        raise RuntimeError('UI patch missing required helpers')
    if any(bad in js for bad in ['fetch(', 'XMLHttpRequest(', 'saveDB(', 'localStorage.clear(', 'indexedDB.deleteDatabase(', 'installOnline(', 'rollbackUi(', 'document.write(']):
        raise RuntimeError('Unexpected patient/transport mutation in patch')
    with tempfile.TemporaryDirectory() as d:
        path=Path(d)/'patch.js'
        path.write_text(js,encoding='utf8')
        subprocess.run(['node','--check',str(path)],check=True)
    end=re.search(r'</body>\s*</html>\s*$',html,re.I)
    if not end:raise RuntimeError('Unexpected HTML end')
    inject='\n<style id="mlx10412-style">\n'+css+'\n</style>\n<script id="mlx10412-script">\n'+js+'\n</script>\n'
    result=(html[:end.start()]+inject+html[end.start():]).encode('utf8')
    if result[:end.start()]!=original[:end.start()]:
        raise RuntimeError('Original clinical source unexpectedly changed')
    if result.count(b'id="mlx10412-script"')!=1:
        raise RuntimeError('Duplicate patch marker')
    return result
def main():
    p=argparse.ArgumentParser()
    p.add_argument('--qa',action='store_true')
    p.add_argument('--qa-output',default='/tmp/MediLabX-10.4.12-QA.html')
    args=p.parse_args()
    data=build();newsha=sha(data)
    if args.qa:
        target=Path(args.qa_output);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
        print('QA: verified 10.4.12',len(data),newsha)
        return
    manifest=json.loads(MANIFEST.read_text(encoding='utf8'))
    current=(manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))
    if current[0]=='10.4.12':
        if TARGET.exists() and TARGET.read_bytes()==data and current[2]==newsha:
            print('Existing 10.4.12 release verified');return
        raise RuntimeError('Conflicting 10.4.12 manifest')
    if current!=('10.4.11',OLD_URL,OLD_SHA):
        raise RuntimeError('Production update channel changed; abort: '+repr(current))
    if TARGET.exists() and TARGET.read_bytes()!=data:raise RuntimeError('10.4.12 file conflict')
    TARGET.parent.mkdir(parents=True,exist_ok=True);TARGET.write_bytes(data)
    manifest.update(version='10.4.12',htmlUrl=NEW_URL,sha256=newsha,notes=NOTES)
    MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print('PUBLISHED MediLab X 10.4.12',len(data),newsha)
if __name__=='__main__':main()
