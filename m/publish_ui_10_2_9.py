#!/usr/bin/env python3
"""MediLab X 10.2.9: original 10.1.4 app + isolated Settings/Admin presentation.
Pinned to existing 10.2.8 rollback. Does not touch patient data, original handlers,
updater transport, receipts, radiology, sidebar, clock, standby or clinical storage.
"""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1]
ARCHIVE=ROOT/'medilabx-ui-10.1.4/MediLabX.html'
SOURCE=ROOT/'medilabx-ui-10.2.8/MediLabX.html'
DEST=ROOT/'medilabx-ui-10.2.9/MediLabX.html'
CSS=ROOT/'m/ux-10.2.9-legacy-settings-admin.css'
JS=ROOT/'m/ux-10.2.9-legacy-settings-admin.js'
MANIFEST=ROOT/'m/update.json'
OLD_SHA='6548605a1168a78c282647ccca3c17243196c405217b66556e06a36cda63c8e4'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.8/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.9/MediLabX.html'
REQUIRED=[
 'id="app"','id="nav"','id="reception"','id="patients"','id="reports"',
 'id="patientForm"','id="savePatient"','id="patientFilterDate"',
 'id="admin"','id="settings"','id="userForm"','id="uRole"',
 'id="adcPermissionOptions"','id="doctorForm"','id="deletePinForm"',
 'id="deletedPatientRows"','id="adcSettingsList"','id="adcSettingsViews"',
 'id="adc85UpdateCentre"','id="adc85CheckUpdates"','id="adc85UpdateNow"',
 'id="backupData"','id="restoreData"',
 'mlx1014-glass-notifications-css','mlx1013-bottom-rates-js'
]
NOTES=[
 'Restored MediLab X 10.1.4 remains the complete application base: Reception, Patients, Radiology, receipts, sidebar, taskbar and Privacy Standby look and behave as before.',
 'Professionally redesigned ONLY Settings and Admin with organized navigation, readable forms, responsive grids, light/dark contrast and consistent circular vector icon tiles.',
 'Settings home now has four shortcuts that open the ORIGINAL native Centre, Appearance, Software Updates and Backup controls; original save actions are reused.',
 'Admin user creation, page permissions, performing doctors, deletion PIN, and deleted-record archive retain their existing actions and field IDs.',
 'Removes duplicate Release Spotlight decoration from Settings while retaining the real GitHub updater, check, install, rollback and backup controls.',
 'No storage schema, clinical handler, print/WhatsApp implementation, patient records or user account data are changed. Back up data before updates.'
]
def sha(data):return hashlib.sha256(data).hexdigest()
def build():
 archive=ARCHIVE.read_bytes()
 original=SOURCE.read_bytes()
 if sha(archive)!=OLD_SHA or original!=archive:
  raise RuntimeError('10.2.8 baseline no longer equals the byte-for-byte 10.1.4 restoration')
 html=original.decode('utf-8')
 missing=[m for m in REQUIRED if m not in html]
 if missing:raise RuntimeError('Required original controls missing: '+', '.join(missing))
 if 'mlx1029-legacy-css' in html or 'mlx1029-legacy-js' in html:
  raise RuntimeError('Unexpected pre-existing 10.2.9 patch')
 marker=re.search(r'</body>\s*</html>\s*$',html,re.I)
 if not marker:raise RuntimeError('Unexpected original HTML closing tags')
 css=CSS.read_text('utf-8')
 js=JS.read_text('utf-8')
 if css.count('{')!=css.count('}'):raise RuntimeError('New Styles CSS braces unbalanced')
 if any(k not in css for k in ['#settings','.mlx-mac-layout','#admin','.adc-permission-list','.mlx29-quick','mlx29-admin-icon']):
  raise RuntimeError('New Settings/Admin stylesheet incomplete')
 if any(k not in js for k in ['function settingsHome()','function settingsActive()','function adminHeaders()',"native.click()"]):
  raise RuntimeError('New Settings/Admin script incomplete')
 forbidden=['localStorage.', 'saveDB(', 'loadDB(', 'installOnline(', 'rollbackUpdate(', 'fetch(', 'window.mlx1022AutoCheck=']
 if any(k in js for k in forbidden):raise RuntimeError('Unexpected clinical/storage/update function in additive script')
 with tempfile.TemporaryDirectory() as root:
  f=Path(root)/'settings-admin.js'
  f.write_text(js,encoding='utf-8')
  subprocess.run(['node','--check',str(f)],check=True)
  matches=re.findall(r'<script id="mlx-desktop-premium-final">(.*?)</script>',html,re.S)
  if len(matches)!=1:raise RuntimeError('Original clinical runtime missing or duplicated')
  f=Path(root)/'legacy-original.js'
  f.write_text(matches[0],encoding='utf-8')
  subprocess.run(['node','--check',str(f)],check=True)
 addition=('\n<style id="mlx1029-legacy-css">\n'+css.rstrip('\n')+'\n</style>\n'
           '<script id="mlx1029-legacy-js">\n'+js.rstrip('\n')+'\n</script>\n')
 result=html[:marker.start()]+addition+html[marker.start():]
 if not result.startswith(html[:marker.start()]):raise RuntimeError('Original application code changed')
 if result.count('id="mlx1029-legacy-css"')!=1 or result.count('id="mlx1029-legacy-js"')!=1:
  raise RuntimeError('Duplicate injection markers')
 return result.encode('utf-8')
def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--qa',action='store_true')
 ap.add_argument('--qa-output',default='/tmp/MediLabX-10.2.9-QA.html')
 args=ap.parse_args()
 result=build()
 checksum=sha(result)
 if args.qa:
  target=Path(args.qa_output);target.parent.mkdir(parents=True,exist_ok=True)
  target.write_bytes(result)
  print('PASS: checksum-verified original 10.1.4 + isolated Settings/Admin')
  print('PASS: browser QA fixture',target,'bytes',len(result),'SHA256',checksum)
  return
 manifest=json.loads(MANIFEST.read_text('utf-8'))
 if manifest.get('version')=='10.2.9':
  if DEST.is_file() and DEST.read_bytes()==result and manifest.get('sha256')==checksum and manifest.get('htmlUrl')==NEW_URL:
   print('PASS: already published 10.2.9 unchanged',checksum);return
  raise RuntimeError('Conflicting 10.2.9 release, will not overwrite')
 if (manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))!=('10.2.8',OLD_URL,OLD_SHA):
  raise RuntimeError('Live update manifest changed from 10.2.8: refusing unsafe release')
 if DEST.exists() and DEST.read_bytes()!=result:raise RuntimeError('Conflicting destination HTML')
 DEST.parent.mkdir(parents=True,exist_ok=True)
 DEST.write_bytes(result)
 manifest.update(version='10.2.9',htmlUrl=NEW_URL,sha256=checksum,notes=NOTES)
 MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print('PASS: 10.1.4 full clinical source identical except appended isolated UI CSS/JS')
 print('PASS: old and new JavaScript syntax and original IDs')
 print('PASS: updated manifest with computed SHA256 '+checksum+'; HTML bytes '+str(len(result)))
if __name__=='__main__':main()
