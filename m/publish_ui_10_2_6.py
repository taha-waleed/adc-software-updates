#!/usr/bin/env python3
"""MediLab X 10.2.6 — reference-based Settings/Admin/popup visual upgrade.
Byte-for-byte preserved 10.2.5 core, pinned SHA256, checks for required actions.
--qa: build validation fixture without modifying the live manifest.
"""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.2.5'/'MediLabX.html'
DEST=ROOT/'medilabx-ui-10.2.6'/'MediLabX.html'
MANIFEST=ROOT/'m'/'update.json'
CSS=ROOT/'m'/'ux-10.2.6-workspace.css'
JS=ROOT/'m'/'ux-10.2.6-workspace.js'
OLD_SHA='38bb02f09af7fb66a217d85015d8d01a18a3097eb580a38c6e579b839611f7b2'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.5/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.6/MediLabX.html'
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
 'Professional MediLab X Settings workspace: new helpful overview, quick category shortcuts, and spacious navigation/sidebar following the supplied HTML design.',
 'Admin redesigned with clean cards and adaptive access-permission tiles; original accounts, roles, PIN and deleted-record recovery handlers are unchanged.',
 'High-quality crisp vector SVG icons added to sidebar and Settings categories with circular backgrounds instead of conflicting square layers.',
 'Light/Dark themes refined for buttons, headings, fields, update modal, confirmation dialogs, notifications, and toast messages.',
 'Improved scroll containment, responsive layout, visual hierarchy and reduced-motion support across the new interface.',
 'Retained single GitHub Software Updates banner from 10.2.5 and original SHA256-verified update bridge.',
 'Existing patient registration, records, receipts, report templates, radiology printing, WhatsApp, Now Brief, data formats and native Windows bridge unchanged.'
]
def sha(data):return hashlib.sha256(data).hexdigest()
def build():
 data=SOURCE.read_bytes()
 if sha(data)!=OLD_SHA:raise RuntimeError('10.2.5 baseline SHA-256 mismatch: no update')
 old=data.decode('utf-8')
 if any(x not in old for x in REQUIRED):
  raise RuntimeError('Critical existing controls missing: '+', '.join(x for x in REQUIRED if x not in old))
 if 'mlx1026-workspace-css' in old or 'mlx1026-workspace-js' in old:
  raise RuntimeError('Duplicate 10.2.6 patch in baseline')
 marker=re.search(r'</body>\s*</html>\s*$',old,re.I)
 if not marker:raise RuntimeError('Unexpected closing HTML tags')
 css=CSS.read_text('utf-8')
 js=JS.read_text('utf-8')
 if css.count('{')!=css.count('}'):raise RuntimeError('Unbalanced CSS braces')
 for term in ['.mlx26-welcome','.adc-setting-symbol','.adc-nav-icon','#admin','#mlx-notif-panel','.adc85-modal','.adc-confirm-card','.adc-safe-dialog','[data-mlxr-mode="dark"]']:
  if term not in css:raise RuntimeError('New UI stylesheet missing target '+term)
 for term in ['function mountWelcome()','function mountIcons()','data-mlx26-open','svg(name)','dataset.mlx1026Svg']:
  if term not in js:raise RuntimeError('New UI module missing '+term)
 for forbidden in ['localStorage.', 'saveDB(', 'installOnline(', 'rollbackUpdate(', 'window.mlx1022AutoCheck=', 'fetch(']:
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
 block=('\n<style id="mlx1026-workspace-css">\n'+css.rstrip('\n')+'\n</style>\n'
        '<script id="mlx1026-workspace-js">\n'+js.rstrip('\n')+'\n</script>\n')
 updated=old[:marker.start()]+block+old[marker.start():]
 if not updated.startswith(old[:marker.start()]):raise RuntimeError('Original HTML changed')
 if updated.count('id="mlx1026-workspace-css"')!=1 or updated.count('id="mlx1026-workspace-js"')!=1:
  raise RuntimeError('Build markers missing or duplicated')
 return updated.encode('utf-8')
def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--qa',action='store_true')
 ap.add_argument('--qa-output',default='/tmp/MediLabX-10.2.6-QA.html')
 args=ap.parse_args()
 result=build();digest=sha(result)
 if args.qa:
  target=Path(args.qa_output)
  target.parent.mkdir(parents=True,exist_ok=True)
  target.write_bytes(result)
  print('PASS: QA standalone built',target, 'bytes',len(result),'SHA256',digest)
  return
 manifest=json.loads(MANIFEST.read_text('utf-8'))
 if manifest.get('version')=='10.2.6':
  if DEST.is_file() and sha(DEST.read_bytes())==digest and manifest.get('sha256')==digest and manifest.get('htmlUrl')==NEW_URL:
   print('PASS: existing 10.2.6 release is verified',digest);return
  raise RuntimeError('Conflicting 10.2.6 release already exists; refuse overwrite')
 if (manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))!=('10.2.5',OLD_URL,OLD_SHA):
  raise RuntimeError('Production manifest changed from 10.2.5; abort')
 if DEST.exists() and DEST.read_bytes()!=result:
  raise RuntimeError('Refusing to overwrite differing 10.2.6 artifact')
 DEST.parent.mkdir(parents=True,exist_ok=True)
 DEST.write_bytes(result)
 manifest.update(version='10.2.6',htmlUrl=NEW_URL,sha256=digest,notes=NOTES)
 MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print('PASS: baseline preserved, UI syntax validated and release SHA256 generated')
 print('PASS: 10.2.6 bytes',len(result),'SHA256',digest)
if __name__=='__main__':main()
