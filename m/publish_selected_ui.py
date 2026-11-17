#!/usr/bin/env python3
"""MediLab X UI-only release generator. Strict manifest/source validation."""
import base64, hashlib, json, pathlib, subprocess, tempfile, zlib

ROOT=pathlib.Path(__file__).resolve().parents[1] if pathlib.Path(__file__).resolve().parent.name=='m' else pathlib.Path(__file__).resolve().parent
OLD='medilabx-final-standby/MediLabX.html'
MANIFEST='m/update.json'
NEW='medilabx-ui-10.0.4/MediLabX.html'
URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/'+NEW
VERSION='10.0.4'
STYLE='mlx-selected-ui-2026-11'
SCRIPT='mlx-selected-js-2026-11'
REQUIRED=['id="settings"','id="admin"','id="adcSettingsList"','id="adcSettingsViews"','id="adc85UpdateCentre"','id="adc85UpdateNow"','id="userForm"','id="doctorForm"','id="deletePinForm"','id="deletedCount"']

def sha(data):return hashlib.sha256(data).hexdigest()
def release():
    manifest_path=ROOT/MANIFEST
    if not manifest_path.is_file():raise RuntimeError('Manifest not found at '+str(manifest_path))
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    if manifest.get('version')!= '10.0.2':raise RuntimeError('Manifest version changed: refusing to overwrite a newer live release')
    if not str(manifest.get('htmlUrl','')).endswith('/'+OLD):raise RuntimeError('Unexpected current release URL; refusing')
    old=ROOT/OLD
    source=old.read_bytes()
    if sha(source).lower()!=str(manifest.get('sha256','')).lower():raise RuntimeError('Current GitHub HTML checksum does not match manifest; refusing')
    contents=json.loads(zlib.decompress(base64.b64decode((ROOT/'m/selected-ui.bundle.b64').read_text().strip())).decode('utf-8'))
    css,js=contents['css'],contents['js']
    for k in REQUIRED:
        if k not in source.decode('utf-8'):raise RuntimeError('Missing required app element '+k)
    if STYLE.encode() in source or SCRIPT.encode() in source:raise RuntimeError('Design patch already exists')
    if b'</head>' not in source or b'</body>' not in source:raise RuntimeError('Source document incomplete')
    # JavaScript syntax validation; runner Node is available by default.
    with tempfile.TemporaryDirectory() as td:
        f=pathlib.Path(td)/'verify.js';f.write_text(js,encoding='utf-8')
        subprocess.run(['node','--check',str(f)],check=True)
    s=source.decode('utf-8')
    style='<style id="'+STYLE+'">\n'+css+'\n</style>\n'
    script='<script id="'+SCRIPT+'">\n'+js+'\n</script>\n'
    s=s.replace('</head>',style+'</head>',1)
    idx=s.rfind('</body>')
    s=s[:idx]+script+s[idx:]
    # Reversibility check: old HTML must be byte-for-byte identical after removing only injected blocks.
    if s.replace(style,'',1).replace(script,'',1).encode('utf-8')!=source:raise RuntimeError('Unexpected changes beyond selected UI injection')
    result=s.encode('utf-8')
    if result.count(STYLE.encode())!=1 or result.count(SCRIPT.encode())!=1:raise RuntimeError('Duplicate patch marker')
    target=ROOT/NEW
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists():
        if target.read_bytes()!=result:raise RuntimeError('Release exists with different content')
    else:target.write_bytes(result)
    # Last operation changes channel. Git will commit both files together.
    manifest['version']=VERSION
    manifest['htmlUrl']=URL
    manifest['sha256']=sha(result)
    manifest['notes']=[
        'Settings redesigned as Mac Preferences with original category controls.',
        'Admin Centre redesigned as Admin Workspace using existing user, doctor and security navigation.',
        'Software Updates redesigned as Release Spotlight with improved visibility and contrast.',
        'All underlying clinical, patient, report, receipt and native update handlers unchanged.',
        'Original 10.0.2 Midnight Prism Standby release preserved.'
    ]
    manifest_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print('RELEASE PASS:',NEW,'bytes=',len(result),'sha256=',sha(result))
    print('Original unchanged:',OLD,'sha256=',sha(source))
if __name__=='__main__':release()
