#!/usr/bin/env python3
"""MediLab X 10.2.7 — reference-based Settings/Admin/popup visual upgrade.
Byte-for-byte preserved 10.2.6 core, pinned SHA256, checks for required actions.
--qa: build validation fixture without modifying the live manifest.
"""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.2.6'/'MediLabX.html'
DEST=ROOT/'medilabx-ui-10.2.7'/'MediLabX.html'
MANIFEST=ROOT/'m'/'update.json'
CSS=ROOT/'m'/'ux-10.2.7-navy-privacy.css'
JS=ROOT/'m'/'ux-10.2.7-navy-privacy.js'
OLD_SHA='cfc6ca8065477876667ee8255836de60a196595229da6a3775d29b6f8e2c939f'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.6/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.7/MediLabX.html'
REQUIRED=[
 'id="patientForm"','id="savePatient"','id="patientFilterDate"',
 'id="userForm"','id="uRole"','id="adcPermissionOptions"',
 'id="deletePinForm"','id="deletedPatientRows"',
 'id="adc85CheckUpdates"','id="adc85UpdateNow"',
 'id="adc85RestoreUpdate"','id="adc85ManualUpdate"',
 'id="backupData"','id="restoreData"',
 'id="adcSettingsList"','id="adcSettingsViews"',
 'id="adc85UpdateOverlay"','id="adc85ModalTitle"',
 'id="mlx1025-single-update-js"',"hero.id='mlxrUpdateHero'",
]
NOTES=[
 'Top taskbar and left sidebar now share exactly the same premium dark navy blue gradient #0b1530 to #13204a in Light and Dark modes.',
 'Privacy Standby redesigned to match supplied full-screen screenshot: large live clock, date, branding, fine dotted backdrop and smooth animated blue glow.',
 'Six privacy screen visual presets with keyboard keys 1–6; H hides preset ribbon. Click or Escape unlocks using original no-PIN behavior.',
 'Original five-minute automatic lock and native Windows lock button behavior retained. Added accessible lock action to main top taskbar.',
 'Settings navigation repaired so original panels reliably open and selected category stays highlighted with correct visible/hidden state.',
 'All existing clinical records, user roles, Admin forms, receipts, radiology reports, WhatsApp Desktop, updater and backup storage untouched.'
]
def sha(data):return hashlib.sha256(data).hexdigest()
def build():
 data=SOURCE.read_bytes()
 if sha(data)!=OLD_SHA:raise RuntimeError('10.2.6 baseline SHA-256 mismatch: no update')
 old=data.decode('utf-8')
 if any(x not in old for x in REQUIRED):
  raise RuntimeError('Critical existing controls missing: '+', '.join(x for x in REQUIRED if x not in old))
 if 'mlx1027-navy-privacy-css' in old or 'mlx1027-navy-privacy-js' in old:
  raise RuntimeError('Duplicate 10.2.7 patch in baseline')
 marker=re.search(r'</body>\s*</html>\s*$',old,re.I)
 if not marker:raise RuntimeError('Unexpected closing HTML tags')
 css=CSS.read_text('utf-8')
 js=JS.read_text('utf-8')
 if css.count('{')!=css.count('}'):raise RuntimeError('Unbalanced CSS braces')
 for term in ['#mlx101Standby.mlx1027-privacy','.mlx27-screen','.mlx27-time','.mlx27-presets','#app .top','#app .sidebar','#adcSettingsViews .adc-setting-view']:
  if term not in css:raise RuntimeError('New UI stylesheet missing target '+term)
 for term in ['function mountPrivacy()','function mountTaskbar()','function mountSettings()','function repairCategory(key)','function applyPreset(id)','function formatClock()']:
  if term not in js:raise RuntimeError('New UI module missing '+term)
 for forbidden in ['localStorage.clear(', 'localStorage.removeItem(', 'saveDB(', 'installOnline(', 'rollbackUpdate(', 'window.mlx1022AutoCheck=', 'fetch(']:
  if forbidden in js:raise RuntimeError('New UI JS attempts to alter sensitive function/data: '+forbidden)
 with tempfile.TemporaryDirectory() as tmp:
  f=Path(tmp)/'new-ui.js';f.write_text(js,encoding='utf-8')
  subprocess.run(['node','--check',str(f)],check=True)
  # Existing native updater JS is unmodified, but still validate source syntax.
  for term,label in [('async function checkUpdates(auto=false){','updater'),("function adcRenderPermissions(){",'permissions')]:
   p=old.index(term)
   open_at=old.rfind('<script',0,p)
   content_start=old.find('>',open_at)+1
   content_end=old.find('</script>',p)
   if open_at<0 or content_end<0:raise RuntimeError('Could not extract '+label+' JS')
   f=Path(tmp)/(label+'.js');f.write_text(old[content_start:content_end],encoding='utf-8')
   subprocess.run(['node','--check',str(f)],check=True)
 block=('\n<style id="mlx1027-navy-privacy-css">\n'+css.rstrip('\n')+'\n</style>\n'
        '<script id="mlx1027-navy-privacy-js">\n'+js.rstrip('\n')+'\n</script>\n')
 updated=old[:marker.start()]+block+old[marker.start():]
 if not updated.startswith(old[:marker.start()]):raise RuntimeError('Original HTML changed')
 if updated.count('id="mlx1027-navy-privacy-css"')!=1 or updated.count('id="mlx1027-navy-privacy-js"')!=1:
  raise RuntimeError('Build markers missing or duplicated')
 return updated.encode('utf-8')
def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--qa',action='store_true')
 ap.add_argument('--qa-output',default='/tmp/MediLabX-10.2.7-QA.html')
 args=ap.parse_args()
 result=build();digest=sha(result)
 if args.qa:
  target=Path(args.qa_output)
  target.parent.mkdir(parents=True,exist_ok=True)
  target.write_bytes(result)
  print('PASS: QA standalone built',target, 'bytes',len(result),'SHA256',digest)
  return
 manifest=json.loads(MANIFEST.read_text('utf-8'))
 if manifest.get('version')=='10.2.7':
  if DEST.is_file() and sha(DEST.read_bytes())==digest and manifest.get('sha256')==digest and manifest.get('htmlUrl')==NEW_URL:
   print('PASS: existing 10.2.7 release is verified',digest);return
  raise RuntimeError('Conflicting 10.2.7 release already exists; refuse overwrite')
 if (manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))!=('10.2.6',OLD_URL,OLD_SHA):
  raise RuntimeError('Production manifest changed from 10.2.6; abort')
 if DEST.exists() and DEST.read_bytes()!=result:
  raise RuntimeError('Refusing to overwrite differing 10.2.7 artifact')
 DEST.parent.mkdir(parents=True,exist_ok=True)
 DEST.write_bytes(result)
 manifest.update(version='10.2.7',htmlUrl=NEW_URL,sha256=digest,notes=NOTES)
 MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print('PASS: baseline preserved, UI syntax validated and release SHA256 generated')
 print('PASS: 10.2.7 bytes',len(result),'SHA256',digest)
if __name__=='__main__':main()
