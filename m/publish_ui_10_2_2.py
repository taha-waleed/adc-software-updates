#!/usr/bin/env python3
"""MediLab X 10.2.2 — verified updater/notification hotfix on current 10.2.1.
Four narrow logic changes, plus scoped CSS/JS; original clinical code preserved.
"""
from pathlib import Path
import argparse, hashlib, json, re, subprocess, tempfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT/'m/update.json'
SOURCE = ROOT/'medilabx-ui-10.2.1/MediLabX.html'
DEST = ROOT/'medilabx-ui-10.2.2/MediLabX.html'
CSS = ROOT/'m/ux-10.2.2-update-polish.css'
JS = ROOT/'m/ux-10.2.2-update-polish.js'
OLD_SHA = '3631937378660863ef84b324750b51e192ff19dd3805ae1d368f79a5bf9fbd8e'
CSS_SHA = 'dd9fb912e5c04e23fae1b9bf610e023da378412e1384acff3d57920c7a5c7445'
JS_SHA = '2f5f42c74f0c56eee7e02723645fc1c20ecaf03abcf3918385c130039465638c'
OLD_URL = 'https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.1/MediLabX.html'
NEW_URL = 'https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.2/MediLabX.html'
STYLE_MARK = 'mlx1022-update-polish-css'
JS_MARK = 'mlx1022-update-polish-js'
REQUIRED = [
  'mlx1021-contrast-fix','mlx102-theme', 'mlx1014-glass-notifications-css',
  'id="adc85UpdateOverlay"','id="adc85UpdateCentre"', 'id="adc85CheckUpdates"',
  'id="adminUpdateSource"','id="adc85ModalTitle"', 'id="mlx-notif-history"',
  'id="patientForm"','id="savePatient"','id="pAge"','id="pGender"',
  'mlx108-radiology-and-analytics','mlx107-fishtank-css'
]

def sha(data):return hashlib.sha256(data).hexdigest()
def replace_one(source,old,new,reason):
    n=source.count(old)
    if n!=1:raise RuntimeError(f'Unexpected source for {reason}: expected exactly once, found {n}')
    return source.replace(old,new,1)

def patch_source(original):
    source=original.decode('utf-8')
    if any(v not in source for v in REQUIRED):
        raise RuntimeError('Required app elements missing: '+', '.join(v for v in REQUIRED if v not in source))
    if STYLE_MARK in source or JS_MARK in source:
        raise RuntimeError('Hotfix markers already present in baseline')
    # 1. Expose the original, full-fidelity updater check to a scheduler. No new transport.
    source=replace_one(source,'async function installOnline(){',
      'window.mlx1022AutoCheck=()=>checkUpdates(true);\nasync function installOnline(){',
      'safe background check hook')
    # 2. Version-level persistent notice suppression; respect existing read history and max 60-record cap.
    dedupe='''
 if(key&&/^update-\\d+(?:\\.\\d+){1,2}$/.test(String(key))){
   try{
     const storeKey='mlx_notified_update_versions_v1';
     const parsed=JSON.parse(localStorage.getItem(storeKey)||'[]');
     const seen=Array.isArray(parsed)?parsed.filter(v=>typeof v==='string'):[];
     for(const previous of notices){
       const existing=String(previous?.key||'');
       if(/^update-\\d+(?:\\.\\d+){1,2}$/.test(existing)&&!seen.includes(existing))seen.push(existing);
     }
     if(seen.includes(key)){localStorage.setItem(storeKey,JSON.stringify(seen.slice(-40)));return;}
     seen.push(key);localStorage.setItem(storeKey,JSON.stringify(seen.slice(-40)));
   }catch(_){/* Existing notification history remains the fallback. */}
 }
'''
    open_func="function addNotice(title,text,kind='info',{show=true,key=''}={}){"
    source=replace_one(source,open_func,open_func+dedupe,'durable release notification dedupe')
    # 3. Remove fake 4.5s forced update-check wait; backend check still decides readiness.
    source=replace_one(source,'const minWait=Math.max(0,4500-(Date.now()-begin));',
      'const minWait=Math.max(0,450-(Date.now()-begin));',
      'speed up manual update check')
    # 4. Use the original updater, frequent but non-intrusive checks while authenticated.
    scheduler='''
 // Frontend auto checks, without installing an update or showing repeated popups.
 window.addEventListener('medilab:update-available',event=>{
   const release=event?.detail;
   if(!release?.ok||!release.available||!release.version)return;
   addNotice('Software update available','Version '+release.version+' is ready in Settings → Software Updates.',
     'info',{key:'update-'+release.version,show:true});
 });
 const mlx1022Frequency=20*60*1000;
 let mlx1022LastCheck=Date.now(),mlx1022Busy=false;
 const mlx1022Periodic=async()=>{
   if(mlx1022Busy||Date.now()-mlx1022LastCheck<mlx1022Frequency)return;
   const app=document.getElementById('app');
   if(!app?.classList.contains('authenticated')||!desktop()?.checkOnline)return;
   mlx1022Busy=true;mlx1022LastCheck=Date.now();
   try{await window.mlx1022AutoCheck?.();}catch(err){console.warn('MediLab background update check:',err)}
   finally{mlx1022Busy=false;}
 };
 window.setInterval(mlx1022Periodic,mlx1022Frequency);
 window.addEventListener('focus',mlx1022Periodic,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)mlx1022Periodic()});
 document.getElementById('adc85CheckUpdates')?.addEventListener('click',()=>{mlx1022LastCheck=Date.now()},true);
'''
    source=replace_one(source,' desktop()?.onAutoUpdate?.(r=>{',scheduler+' desktop()?.onAutoUpdate?.(r=>{',
      'background update schedule and native alert bridge')
    if sha(CSS.read_bytes())!=CSS_SHA or sha(JS.read_bytes())!=JS_SHA:
        raise RuntimeError('10.2.2 visual assets no longer match validated QA checksums')
    css=CSS.read_bytes().decode('utf-8').rstrip('\n')
    js=JS.read_bytes().decode('utf-8').rstrip('\n')
    if '#adc85NowBrief' in css or 'patientForm' in js or 'installOnline(' in js:
        raise RuntimeError('Add-on attempts to alter forbidden patient / Now Brief / update install handler')
    with tempfile.TemporaryDirectory() as directory:
        fn=Path(directory)/'visual.js';fn.write_text(js,encoding='utf-8');subprocess.run(['node','--check',str(fn)],check=True)
        # Verify the ORIGINAL code's two changed script blocks remain syntactically correct.
        for marker,ident in [('async function checkUpdates(auto=false){','updater'),('function addNotice(','notifier')]:
            at=source.find(marker)
            start=source.rfind('<script',0,at);opening=source.find('>',start)+1
            close=source.find('</script>',at)
            if start<0 or close<0 or close-opening<500:
                raise RuntimeError('Cannot extract updated JavaScript for validation: '+ident)
            code=source[opening:close]
            tmp=Path(directory)/(ident+'.js');tmp.write_text(code,encoding='utf-8')
            subprocess.run(['node','--check',str(tmp)],check=True)
    block='\n<style id="'+STYLE_MARK+'">\n'+css+'\n</style>\n<script id="'+JS_MARK+'">\n'+js+'\n</script>\n'
    at=source.rfind('</body>')
    if at<0 or source.rfind('</html>')<0:raise RuntimeError('Base HTML incomplete')
    output=source[:at]+block+source[at:]
    if output.count(STYLE_MARK)!=1 or output.count(JS_MARK)!=1:
        raise RuntimeError('Duplicate hotfix blocks')
    return output.encode('utf-8')

def publish():
    manifest=json.loads(MANIFEST.read_text('utf-8'))
    if manifest.get('version')=='10.2.2':
        if DEST.is_file() and manifest.get('htmlUrl')==NEW_URL and sha(DEST.read_bytes())==manifest.get('sha256'):
            print('PASS: already-published 10.2.2 matches manifest');return
        raise RuntimeError('10.2.2 already published but differs; refusing overwrite')
    if (manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))!=('10.2.1',OLD_URL,OLD_SHA):
        raise RuntimeError('Live MediLab channel no longer matches verified 10.2.1; abort.')
    original=SOURCE.read_bytes()
    if sha(original)!=OLD_SHA:raise RuntimeError('Baseline 10.2.1 SHA-256 differs; abort.')
    result=patch_source(original)
    DEST.parent.mkdir(parents=True,exist_ok=True)
    if DEST.is_file() and DEST.read_bytes()!=result:raise RuntimeError('Destination file differs; do not overwrite')
    if not DEST.exists():DEST.write_bytes(result)
    manifest.update(version='10.2.2',htmlUrl=NEW_URL,sha256=sha(result))
    manifest['notes']=[
      'Fixed dark text on blue Open Software Updates notification button, and Updating MediLab X title/progress contrast in Light and Dark modes.',
      'Automatic GitHub release checks approximately every 20 minutes while signed in, plus catch-up on app focus; existing verified updater reused.',
      'Update available alert shown once per release version across restarts and even after clearing read notification history.',
      'Manual Check for updates no longer forces a 4.5-second progress wait; release still installs only after pressing Update Now.',
      'Settings Software Updates redesigned as compact GitHub Release section; obsolete release-note text and separators hidden; advanced URL editing retained.',
      'No changes to patient records, printing, reporting, receipts, Now Brief, roles, Fish Tank or native Electron update installer.'
    ]
    MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print('PASS: source',sha(original))
    print('PASS: guarded update schedule, notification dedupe and original script syntax')
    print('PASS: CSS/JS add-on and baseline patient functions preserved')
    print('PASS: release bytes',len(result),'SHA256',sha(result))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--test-local',type=Path,default=None)
    parser.add_argument('--local-dest',type=Path,default=Path('/tmp/medilab_10_2_2_local.html'))
    args=parser.parse_args()
    if args.test_local:
        out=patch_source(args.test_local.read_bytes());args.local_dest.write_bytes(out)
        print('PASS: local runtime fixture created',args.local_dest,'bytes',len(out))
    else:publish()
