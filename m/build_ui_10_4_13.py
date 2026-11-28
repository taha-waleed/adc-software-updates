#!/usr/bin/env python3
"""MediLab X 10.4.13 — relocate existing Reception filter buttons beside title.
Pinned to SHA256-verified release 10.4.12. Keep all original filter click handlers.
"""
from pathlib import Path
import argparse,base64,hashlib,json,re,subprocess,tempfile,zlib
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'medilabx-ui-10.4.12/MediLabX.html'
DEST=ROOT/'medilabx-ui-10.4.13/MediLabX.html'
MANIFEST=ROOT/'m/update.json'
SOURCE_SHA='329aa9d3f3c729bfc3c4a1a8d1a9772fe97b57f300c2cf8dbb96f02d5928803e'
CSS_SHA='788c4bc83f8a60791eadffa94de493f3f5dfa8c4e26dcfaca30f5c422bda5e0a'
JS_SHA='a6b41fd1f535669cff9396b97f5d0fda5cfcec69938eacd1f6a7851f305415a5'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.12/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.13/MediLabX.html'
NOTES=[
 'MediLab X 10.4.13: Reception modality filters moved beside Add tests / services heading instead of underneath Selected tests.',
 'Smaller Soft Capsule All/CT/X-Ray/Ultrasound/Other filters; existing buttons moved, not duplicated, so old selection listeners and active filter remain available.',
 'Responsive spacing: 28px high filter chips, same-row alignment when room allows; compact wrap on smaller windows.',
 'Light and Dark mode button contrast and focus states improved; test search, Add, Show all tests, selected services and patient billing logic unchanged.',
 'Current HTML UI release display updated to 10.4.13 in the existing version-synchronization script; Windows executable version remains separately managed.',
 'Existing patient and doctor records, test catalogue, original desktop update engine, receipts and print styles preserved.',
 'Chrome UI tests run against the production-sourced HTML and a synthetic filter fixture. Native Windows/physical printing and clinical end-to-end checks still require workstation testing. Back up data first.'
]
def digest(b): return hashlib.sha256(b).hexdigest()
def load(name,expected):
    raw=(ROOT/'m'/name).read_text(encoding='utf8').strip()
    buf=zlib.decompress(base64.b64decode(raw,validate=True))
    if digest(buf)!=expected:raise RuntimeError('Asset checksum mismatch '+name)
    return buf.decode('utf8')
def build():
    raw=BASE.read_bytes()
    if digest(raw)!=SOURCE_SHA:raise RuntimeError('Official MediLab X 10.4.12 source does not match released SHA256')
    s=raw.decode('utf8')
    mandatory=['id="reception"','id="patientForm"','id="testSearch"','id="testResults"',
        'id="testCount"','id="selectedTests"','id="mlx10412-script"','id="mlx10411-js"',
        'id="adc85UpdateNow"','id="adc85RestoreUpdate"','medilabx10_html_v1']
    missing=[x for x in mandatory if x not in s]
    if missing:raise RuntimeError('Missing essential clinical UI: '+repr(missing))
    if 'id="mlx10413-filter-script"' in s:raise RuntimeError('Duplicate 10.4.13 patch')
    needle="const VERSION='10.4.12';"
    if s.count(needle)!=1:raise RuntimeError('Unexpected version management script; refusing patch')
    css=load('ux-10.4.13.css.z64',CSS_SHA)
    js=load('ux-10.4.13.js.z64',JS_SHA)
    if '@media screen' not in css or css.count('{')!=css.count('}'):
        raise RuntimeError('Screen-only style source invalid')
    for must in ['function moveExistingFilters()', 'insertBefore(bar,count)', "mlxScanSelect-reception"]:
        if must not in js:raise RuntimeError('Moving existing filter DOM is incomplete')
    for forbidden in ['saveDB(', 'fetch(', 'XMLHttpRequest(', 'localStorage.', 'indexedDB.', 'installOnline(', 'window.adcDesktop.']:
        if forbidden in js:raise RuntimeError('Unexpected medical/updater/data operation')
    with tempfile.TemporaryDirectory() as folder:
        temp=Path(folder)/'filter.js';temp.write_text(js,encoding='utf8')
        subprocess.run(['node','--check',str(temp)],check=True)
    s=s.replace(needle,"const VERSION='10.4.13';",1)
    end=re.search(r'</body>\s*</html>\s*$',s,re.I)
    if not end:raise RuntimeError('Official HTML is malformed')
    injection='\n<style id="mlx10413-filter-style">\n'+css+'\n</style>\n<script id="mlx10413-filter-script">\n'+js+'\n</script>\n'
    result=(s[:end.start()]+injection+s[end.start():]).encode('utf8')
    prefix=s[:end.start()].encode('utf8')
    expected=raw.replace(needle.encode(),b"const VERSION='10.4.13';",1)
    if prefix!=expected[:len(prefix)]:raise RuntimeError('Existing source changed unexpectedly beyond UI version')
    return result
def main():
    p=argparse.ArgumentParser()
    p.add_argument('--qa',action='store_true')
    p.add_argument('--qa-output',default='/tmp/MediLabX-10.4.13-QA.html')
    args=p.parse_args()
    out=build();checksum=digest(out)
    if args.qa:
        target=Path(args.qa_output);target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(out);print('QA built 10.4.13',len(out),checksum)
        return
    meta=json.loads(MANIFEST.read_text(encoding='utf8'))
    existing=(meta.get('version'),meta.get('htmlUrl'),meta.get('sha256'))
    if existing[0]=='10.4.13':
        if DEST.exists() and DEST.read_bytes()==out and existing[2]==checksum:
            print('Verified previously-published 10.4.13');return
        raise RuntimeError('Conflicting version 10.4.13 manifest')
    if existing!=('10.4.12',OLD_URL,SOURCE_SHA):
        raise RuntimeError('Official manifest moved; refusing overwrite '+str(existing))
    if DEST.exists() and DEST.read_bytes()!=out:raise RuntimeError('Conflicting 10.4.13 output HTML')
    DEST.parent.mkdir(parents=True,exist_ok=True);DEST.write_bytes(out)
    meta.update(version='10.4.13',htmlUrl=NEW_URL,sha256=checksum,notes=NOTES)
    MANIFEST.write_text(json.dumps(meta,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print('PUBLISHED MediLab X 10.4.13',len(out),checksum)
if __name__=='__main__':main()
