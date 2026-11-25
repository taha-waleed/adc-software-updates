#!/usr/bin/env python3
"""Reissue the EXACT original MediLab X 10.1.4 release as a detectable 10.2.8 rollback.
Clinical data is NEVER copied, reset, migrated or rewritten by this publisher.
The released HTML must be byte-for-byte identical to archived medilabx-ui-10.1.4/MediLabX.html.
"""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1]
ARCHIVE=ROOT/'medilabx-ui-10.1.4/MediLabX.html'
CURRENT=ROOT/'medilabx-ui-10.2.7/MediLabX.html'
OUT=ROOT/'medilabx-ui-10.2.8/MediLabX.html'
MANIFEST=ROOT/'m/update.json'
ORIGINAL_SHA='6548605a1168a78c282647ccca3c17243196c405217b66556e06a36cda63c8e4'
CURRENT_SHA='a0f983fecbf1f54bdbda5e6a0e6dbb8f40ef8c53899838e5584afbe2fa5c0712'
CURRENT_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.7/MediLabX.html'
RESTORE_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.8/MediLabX.html'
CORE_MARKERS=[
 'id="app"','id="nav"','id="reception"','id="patients"','id="reports"',
 'id="daily"','id="expenses"','id="earnings"','id="admin"','id="settings"',
 'id="patientForm"','id="savePatient"','id="patientFilterDate"',
 'id="backupData"','id="restoreData"','id="adc85UpdateCentre"',
 'id="adc85CheckUpdates"','id="adc85UpdateNow"',
 'mlx1014-glass-notifications-css','mlx1013-bottom-rates-js',
 'mlx107-fishtank-css','mlx106-clinical-validation-and-dialogs'
]
NOTES=[
 'Requested rollback: restored the exact original MediLab X 10.1.4 HTML, visually and functionally, without any later 10.2.x UI patches.',
 'This 10.2.8 update-channel version is a compatibility release label; the installed app HTML is byte-for-byte the archived 10.1.4 build.',
 'Returns Settings, Admin, Privacy Standby, notification popups, navigation, colors and other screens to their original 10.1.4 implementation.',
 'The HTML uses the same medilabx10_html_v1 patient database key and identical original loadDB/saveDB implementation as 10.2.7.',
 'No patient database files or localStorage entries are deleted by the release, but create and verify a data backup before applying a downgrade.',
 'Any features or bug fixes introduced after 10.1.4 are intentionally absent from this restored legacy build.'
]
def sha(x):return hashlib.sha256(x).hexdigest()
def validate():
 original=ARCHIVE.read_bytes()
 current=CURRENT.read_bytes()
 if sha(original)!=ORIGINAL_SHA:raise RuntimeError('Archived original 10.1.4 checksum differs: abort')
 if sha(current)!=CURRENT_SHA:raise RuntimeError('Published 10.2.7 checksum differs: abort')
 source=original.decode('utf-8')
 newer=current.decode('utf-8')
 missing=[m for m in CORE_MARKERS if m not in source]
 if missing:raise RuntimeError('Legacy software missing required control: '+', '.join(missing))
 if not re.search(r'</body>\s*</html>\s*$',source,re.I):
  raise RuntimeError('Original archived HTML has no valid closing tags')
 # Make sure old and newer versions really read/write the same existing patient data.
 begin="const KEY='medilabx10_html_v1';"
 end='function money('
 if source.count(begin)!=1 or newer.count(begin)!=1:raise RuntimeError('Patient database storage key changed')
 a=source[source.index(begin):source.index(end)]
 b=newer[newer.index(begin):newer.index(end)]
 if a!=b or 'function loadDB(){' not in a or 'function saveDB(){' not in a:
  raise RuntimeError('Patient storage implementation no longer matches the restore build')
 # Browser script syntax, using known original runtime blocks, not any newer add-ons.
 runtime=re.findall(r'<script id="mlx-desktop-premium-final">(.*?)</script>',source,re.S)
 if len(runtime)!=1:raise RuntimeError('Original clinical runtime missing/duplicated')
 with tempfile.TemporaryDirectory() as tmp:
  p=Path(tmp)/'legacy-runtime.js'
  p.write_text(runtime[0],encoding='utf-8')
  subprocess.run(['node','--check',str(p)],check=True)
 return original
def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--qa',action='store_true',help='Write test copy without publishing')
 ap.add_argument('--qa-output',default='/tmp/MediLabX-10.1.4-restore-QA.html')
 args=ap.parse_args()
 original=validate()
 if args.qa:
  path=Path(args.qa_output);path.parent.mkdir(parents=True,exist_ok=True)
  path.write_bytes(original)
  print('PASS: exact original 10.1.4 rebuilt for QA',len(original),sha(original))
  return
 manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
 if manifest.get('version')=='10.2.8':
  if OUT.is_file() and OUT.read_bytes()==original and manifest.get('sha256')==ORIGINAL_SHA and manifest.get('htmlUrl')==RESTORE_URL:
   print('PASS: previously published exact original 10.1.4 restore',sha(original))
   return
  raise RuntimeError('Conflicting 10.2.8 release exists; no overwrite')
 if (manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))!=('10.2.7',CURRENT_URL,CURRENT_SHA):
  raise RuntimeError('Production manifest changed; refusing unsafe update')
 if OUT.is_file() and OUT.read_bytes()!=original:raise RuntimeError('Destination already contains different HTML')
 OUT.parent.mkdir(parents=True,exist_ok=True)
 OUT.write_bytes(original)
 if OUT.read_bytes()!=ARCHIVE.read_bytes():raise RuntimeError('Rollback source not identical')
 manifest.update(version='10.2.8',htmlUrl=RESTORE_URL,sha256=ORIGINAL_SHA,notes=NOTES)
 MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('PASS: exact original 10.1.4 source restored byte-for-byte')
 print('PASS: unchanged patient database storage key and full load/save code')
 print('PASS: legacy JS syntax and UI control presence')
 print('PASS: SHA-256 '+ORIGINAL_SHA+'; release bytes '+str(len(original)))
if __name__=='__main__':main()
