#!/usr/bin/env python3
"""MediLab X 10.2.4 guarded HTML-only release using the existing updater.
Source clinical handlers are byte-for-byte unchanged. Fails closed on unexpected manifest.
"""
from pathlib import Path
import hashlib, json, re, subprocess, tempfile

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.2.3/MediLabX.html'
DEST=ROOT/'medilabx-ui-10.2.4/MediLabX.html'
CSS=ROOT/'m/ux-10.2.4-cleanup.css'
JS=ROOT/'m/ux-10.2.4-cleanup.js'
MANIFEST=ROOT/'m/update.json'
OLD_SHA='44d30be9fb21abacc525c295dfca4643aafcc3143a07407336c266f15bdbd67a'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.3/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.4/MediLabX.html'
REQUIRED=[
 'id="patientFilterDate"','id="showAllPatientDates"','id="patientSearch"',
 'id="userForm"','id="adcPermissionOptions"','id="uRole"',
 'id="deletePinForm"','id="deletedPatientRows"',
 'id="adc85CheckUpdates"','id="adc85UpdateNow"','id="adc85RestoreUpdate"',
 'id="adc85ManualUpdate"','id="adc85UpdateHeading"','id="adc85UpdateMessage"',
 'id="backupData"','id="restoreData"','id="patientForm"','id="savePatient"',
 "hero.id='mlxrUpdateHero'","box.id='mlxrControls'"
]
NOTES=[
 'Software Updates simplified to one top update banner. Removed duplicate GitHub Software Updates header, Release Spotlight and repeated Check for updates buttons.',
 'Actual update check, verified Update Now, update status, manual install and rollback handlers are preserved; advanced recovery controls are available inside Backup & Data.',
 'Removed accent-color swatches and obsolete duplicated appearance editor. Reference Manrope blue/violet theme and Light / Dark / Automatic cards retained.',
 'Fixed Patients & Receipts record-date input clipping, narrow calendar button and labels at different screen widths.',
 'Admin workspace redesigned with responsive permission tiles, structured user forms, readable controls, deletion-PIN form and tables in Light and Dark themes.',
 'Original patient records, receipts, radiology, WhatsApp, reports, Now Brief, notifications, printer logic, security and data-storage format unchanged.'
]
def sha(x):return hashlib.sha256(x).hexdigest()
def render():
 source=SOURCE.read_bytes()
 if sha(source)!=OLD_SHA:raise RuntimeError('Base 10.2.3 does not match published SHA-256')
 old=source.decode('utf-8')
 if not re.search(r'</body>\s*</html>\s*$',old,re.I):raise RuntimeError('Unexpected missing HTML closing tags')
 if any(x not in old for x in REQUIRED):raise RuntimeError('Required production controls missing: '+','.join(x for x in REQUIRED if x not in old))
 if 'id="mlx1024-cleanup-css"' in old or 'id="mlx1024-cleanup-js"' in old:raise RuntimeError('Already applied')
 css=CSS.read_text('utf-8')
 js=JS.read_text('utf-8')
 for key in ['#patientFilterDate','#admin','#mlxrUpdateHero','mlxr24-record-filters','.adc-permission-list']:
  if key not in css:raise RuntimeError('Missing style: '+key)
 for key in ['function appearance()','function dateFilter()','function updateRecovery()','function admin()','adc85RestoreUpdate','adc85ManualUpdate']:
  if key not in js:raise RuntimeError('Missing scoped UI behavior: '+key)
 if 'localStorage.clear(' in js or 'function saveDB(' in js or 'function installOnline(' in js:
  raise RuntimeError('Patch attempts to modify sensitive clinical or installer code')
 if css.count('{')!=css.count('}'):raise RuntimeError('Unbalanced CSS braces')
 with tempfile.TemporaryDirectory() as root:
  file=Path(root)/'ui.js';file.write_text(js,encoding='utf-8')
  subprocess.run(['node','--check',str(file)],check=True)
 block='\n<style id="mlx1024-cleanup-css">\n'+css.rstrip('\n')+'\n</style>\n<script id="mlx1024-cleanup-js">\n'+js.rstrip('\n')+'\n</script>\n'
 close=old.rfind('</body>')
 newer=old[:close]+block+old[close:]
 if not newer.startswith(old[:close]):raise RuntimeError('Original scripts modified')
 if newer.count('id="mlx1024-cleanup-css"')!=1 or newer.count('id="mlx1024-cleanup-js"')!=1:raise RuntimeError('Duplicated patch')
 return newer.encode('utf-8')
def main():
 manifest=json.loads(MANIFEST.read_text('utf-8'))
 out=render()
 checksum=sha(out)
 if manifest.get('version')=='10.2.4':
  if DEST.is_file() and sha(DEST.read_bytes())==checksum and manifest.get('sha256')==checksum and manifest.get('htmlUrl')==NEW_URL:
   print('PASS: 10.2.4 already published, checksum verified',checksum);return
  raise RuntimeError('10.2.4 conflicts with existing release: manual intervention required')
 if (manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))!=('10.2.3',OLD_URL,OLD_SHA):
  raise RuntimeError('Live manifest no longer matches 10.2.3, refusing overwrite')
 if DEST.exists() and DEST.read_bytes()!=out:raise RuntimeError('Destination file differs from reproducible build')
 DEST.parent.mkdir(parents=True,exist_ok=True)
 DEST.write_bytes(out)
 manifest.update(version='10.2.4',htmlUrl=NEW_URL,sha256=checksum,notes=NOTES)
 MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print('PASS: original 10.2.3 clinical source retained exactly')
 print('PASS: update/backup/roles/date controls present')
 print('PASS: 10.2.4 JS syntax and CSS shape')
 print('PASS: release bytes',len(out),'SHA-256',checksum)
if __name__=='__main__':main()
