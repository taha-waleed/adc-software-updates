#!/usr/bin/env python3
"""10.2.5: remove duplicated update UI and stale hard-coded current-version text.
This release changes no clinical handler or native update/download code.
"""
from pathlib import Path
import hashlib,json,re,subprocess,tempfile

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'medilabx-ui-10.2.4/MediLabX.html'
OUT=ROOT/'medilabx-ui-10.2.5/MediLabX.html'
CSS=ROOT/'m/ux-10.2.5-single-update.css'
JS=ROOT/'m/ux-10.2.5-single-update.js'
MANIFEST=ROOT/'m/update.json'
OLD_SHA='2f25d9a59b4b404c8f9a4f32134de8c0a546bc97924890b9b8120d259ca9b66a'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.4/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.5/MediLabX.html'
STALE="const h=$('adc85UpdateHeading');if(h)h.textContent='Current version: 10.0.3';"
CORRECT="const h=$('adc85UpdateHeading');if(h)h.textContent='Software Updates';"
NOTES=[
 'Corrected Software Updates to display only one top action banner; redundant GitHub Software Updates and Release Spotlight panels stay hidden even when legacy scripts inject them.',
 'Removed the old hard-coded Current version: 10.0.3 UI label so it cannot misrepresent the installed HTML or native application.',
 'When a genuine release is available, the single top button runs the original SHA-256-verifying Update Now handler. Otherwise it runs the original Check for updates handler.',
 'Preserved real update-installation, rollback and manual-update handlers, with advanced controls accessible in Settings > Backup & Data.',
 'Retained the 10.2.4 responsive date control and Administration/Permissions redesign, the uploaded reference theme and its blue-violet styling.',
 'Patient registration, stored patient records, reporting, receipts, WhatsApp Desktop, imaging, Now Brief, printing, roles and local storage remain unchanged.'
]
def sha(data):return hashlib.sha256(data).hexdigest()
def render():
 data=BASE.read_bytes()
 if sha(data)!=OLD_SHA:raise RuntimeError('Baseline SHA-256 mismatch; refusing to modify another release')
 text=data.decode('utf-8')
 if text.count(STALE)!=1:raise RuntimeError('Stale version text not found exactly once')
 required=[
  'id="adc85UpdateCentre"','id="adc85UpdateNow"','id="adc85CheckUpdates"','id="adc85UpdateOffer"',
  'id="patientFilterDate"','id="patientForm"','id="savePatient"','id="userForm"',
  'id="adcPermissionOptions"','id="backupData"','id="restoreData"',
  'id="mlx1024-cleanup-js"',"hero.id='mlxrUpdateHero'"
 ]
 if any(x not in text for x in required):
  raise RuntimeError('Required app controls missing: '+', '.join(x for x in required if x not in text))
 text=text.replace(STALE,CORRECT,1)
 css=CSS.read_text('utf-8')
 js=JS.read_text('utf-8')
 if 'localStorage' in js or 'installOnline(' in js or 'saveDB(' in js:
  raise RuntimeError('New UI JS touches sensitive data/update implementation')
 if css.count('{')!=css.count('}'):raise RuntimeError('CSS braces unbalanced')
 if not re.search(r'</body>\s*</html>\s*$',text,re.I):raise RuntimeError('HTML closing tags missing')
 with tempfile.TemporaryDirectory() as tmp:
  base_script_at=text.index(CORRECT)
  opening=text.rfind('<script',0,base_script_at)
  start=text.index('>',opening)+1
  end=text.index('</script>',base_script_at)
  original_script=text[start:end]
  for name,code in [('original-update-ui.js',original_script),('new-cleanup.js',js)]:
   f=Path(tmp)/name;f.write_text(code,encoding='utf-8')
   subprocess.run(['node','--check',str(f)],check=True)
 addon='\n<style id="mlx1025-single-update-css">\n'+css.rstrip('\n')+'\n</style>\n<script id="mlx1025-single-update-js">\n'+js.rstrip('\n')+'\n</script>\n'
 last=text.rfind('</body>')
 result=text[:last]+addon+text[last:]
 if not result.count('id="mlx1025-single-update-css"')==1 or not result.count('id="mlx1025-single-update-js"')==1:
  raise RuntimeError('New patch duplicated')
 return result.encode('utf-8')
def main():
 manifest=json.loads(MANIFEST.read_text('utf-8'))
 out=render()
 digest=sha(out)
 if manifest.get('version')=='10.2.5':
  if OUT.exists() and sha(OUT.read_bytes())==digest and manifest.get('sha256')==digest and manifest.get('htmlUrl')==NEW_URL:
   print('PASS: previously published 10.2.5 is intact');return
  raise RuntimeError('Existing 10.2.5 manifest differs; refuse overwrite')
 if (manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))!=('10.2.4',OLD_URL,OLD_SHA):
  raise RuntimeError('Live manifest has changed from expected 10.2.4; abort')
 if OUT.exists() and OUT.read_bytes()!=out:raise RuntimeError('Refusing overwrite of mismatching release')
 OUT.parent.mkdir(parents=True,exist_ok=True)
 OUT.write_bytes(out)
 manifest.update(version='10.2.5',htmlUrl=NEW_URL,sha256=digest,notes=NOTES)
 MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print('PASS: only stale update label changed in pre-existing code')
 print('PASS: existing application JS syntax and new UI syntax')
 print('PASS: updater, patient data and recovery controls verified')
 print('PASS: SHA256',digest,'release bytes',len(out))
if __name__=='__main__':main()
