#!/usr/bin/env python3
"""MediLab X 10.2.11 emergency UI restoration.
Published bytes MUST equal user's previous approved 10.1.4 software exactly.
No patient database, stored configuration, installer, Windows shell or update handlers are modified.
"""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1]
OLD=ROOT/'medilabx-ui-10.1.4/MediLabX.html'
LAST_RESTORE=ROOT/'medilabx-ui-10.2.8/MediLabX.html'
BROKEN=ROOT/'medilabx-ui-10.2.10/MediLabX.html'
DEST=ROOT/'medilabx-ui-10.2.11/MediLabX.html'
MANIFEST=ROOT/'m/update.json'
OLD_SHA='6548605a1168a78c282647ccca3c17243196c405217b66556e06a36cda63c8e4'
CURRENT_SHA='0ad4fd8d7f093a9eee111153619b956b1a14f341c8e73b66d6012acdb8dfe960'
CURRENT_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.10/MediLabX.html'
RESTORE_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.11/MediLabX.html'
NATIVE_IDS=[
 'id="app"','id="nav"','id="reception"','id="patients"','id="reports"','id="admin"','id="settings"',
 'id="patientForm"','id="savePatient"','id="patientFilterDate"','id="userForm"','id="adcPermissionOptions"',
 'id="backupData"','id="restoreData"','id="adc85UpdateCentre"','id="adc85CheckUpdates"',
 'id="adc85RestoreUpdate"','id="adc85UpdateNow"','id="mlx101-privacy-standby-js"',
 'const IDLE=5*60*1000'
]
NOTES=[
 'Emergency visual rollback requested by clinic: restored original MediLab X 10.1.4 software exactly, removing the problematic V11 unified theme and the Settings at a Glance cards.',
 '10.2.11 is the update-channel label for this exact archived 10.1.4 HTML (its contents are byte-for-byte identical).',
 'Returns original Settings, Admin, sidebar, titlebar, old animations, patient records, receipts, Radiology and Privacy Standby presentation.',
 'Original Windows updater, Restore Previous, manual HTML update bridge, patient database key and native clinical handlers remain unchanged.',
 'No patient data or settings storage are deleted by this HTML-only rollback. Back up local records before applying.',
 'The version label 10.2.11 lets users on the broken 10.2.10 release receive a normal update offer without requiring navigation inside its broken Settings.'
]
def sha(x):return hashlib.sha256(x).hexdigest()
def verify():
 old=OLD.read_bytes()
 prev=LAST_RESTORE.read_bytes()
 recent=BROKEN.read_bytes()
 if sha(old)!=OLD_SHA or prev!=old:
  raise RuntimeError('FAIL closed: verified 10.1.4 archive and earlier 10.2.8 restoration differ')
 if sha(recent)!=CURRENT_SHA:
  raise RuntimeError('FAIL closed: production 10.2.10 source changed unexpectedly')
 a=old.decode('utf-8');b=recent.decode('utf-8')
 for marker in NATIVE_IDS:
  if marker not in a:
   raise RuntimeError('Missing original stable function/control: '+marker)
 for forbidden in ['id="mlx11-unified-css"','id="mlx11-unified-js"','class="mlx29-home"','mlx29-home-overline']:
  if forbidden in a:
   raise RuntimeError('Original 10.1.4 unexpectedly contains newer settings/theme overlay: '+forbidden)
 begin="const KEY='medilabx10_html_v1';"
 end='function money('
 if a.count(begin)!=1 or b.count(begin)!=1 or end not in a or end not in b:
  raise RuntimeError('Cannot safely identify native patient storage code')
 original_clinical=a[a.index(begin):a.index(end,a.index(begin))]
 recent_clinical=b[b.index(begin):b.index(end,b.index(begin))]
 if original_clinical!=recent_clinical or 'function loadDB(){' not in original_clinical or 'function saveDB(){' not in original_clinical:
  raise RuntimeError('Patient storage implementation mismatch. Refusing rollback.')
 if not re.search(r'</body>\s*</html>\s*$',a,re.I):
  raise RuntimeError('Archived HTML truncated')
 script=re.findall(r'<script id="mlx-desktop-premium-final">([\s\S]*?)</script>',a)
 if len(script)!=1:raise RuntimeError('Legacy clinical runtime missing/duplicate')
 with tempfile.TemporaryDirectory() as folder:
  fn=Path(folder)/'clinical.js';fn.write_text(script[0],encoding='utf-8')
  subprocess.run(['node','--check',str(fn)],check=True)
 return old
def main():
 p=argparse.ArgumentParser()
 p.add_argument('--qa',action='store_true')
 p.add_argument('--qa-output',default='/tmp/MediLabX-10.2.11-rollback-QA.html')
 args=p.parse_args()
 output=verify()
 if args.qa:
  target=Path(args.qa_output);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(output)
  print('PASS source integrity, original patient storage, unchanged native functions',sha(output),len(output))
  return
 m=json.loads(MANIFEST.read_text('utf-8'))
 if m.get('version')=='10.2.11':
  if DEST.exists() and DEST.read_bytes()==output and m.get('sha256')==OLD_SHA and m.get('htmlUrl')==RESTORE_URL:
   print('PASS already published 10.2.11 rollback');return
  raise RuntimeError('Unexpected existing 10.2.11 release')
 if (m.get('version'),m.get('htmlUrl'),m.get('sha256'))!=('10.2.10',CURRENT_URL,CURRENT_SHA):
  raise RuntimeError('Production updater no longer points to verified 10.2.10: aborting')
 if DEST.exists() and DEST.read_bytes()!=output:raise RuntimeError('Conflicting rollback HTML')
 DEST.parent.mkdir(parents=True,exist_ok=True)
 DEST.write_bytes(output)
 m.update(version='10.2.11',htmlUrl=RESTORE_URL,sha256=OLD_SHA,notes=NOTES)
 MANIFEST.write_text(json.dumps(m,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print('PASS original 10.1.4 restored byte-for-byte, with no clinical data/storage changes')
 print('PASS published emergency UI-only rollback version 10.2.11, SHA-256',OLD_SHA)
if __name__=='__main__':main()
