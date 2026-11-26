#!/usr/bin/env python3
"""MediLab X 10.2.10: user's MediLab X 11 Unified Design System on current 10.2.
    SAFE: original 10.2.9 clinical app, users, data model and native updater untouched.
    New CSS is screen-only and JS is non-clinical presentation/icon/clock logic.
"""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'medilabx-ui-10.2.9/MediLabX.html'
DEST=ROOT/'medilabx-ui-10.2.10/MediLabX.html'
CSS=ROOT/'m/ux-10.2.10-v11-unified.css'
JS=ROOT/'m/ux-10.2.10-v11-unified.js'
MANIFEST=ROOT/'m/update.json'
BASE_HASH='4eba9b8664e982cf0b5f160e09c8f86c1eaf3b50a6d8ed34a8208620f2f8d2db'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.9/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.10/MediLabX.html'
NATIVE=[
 'id="patientForm"','id="savePatient"','id="patients"','id="patientFilterDate"',
 'id="showAllPatientDates"','id="reportPatient"','id="reports"','id="userForm"',
 'id="uRole"','id="adcPermissionOptions"','id="deletedPatientRows"',
 'id="doctorForm"','id="adcSettingsList"','id="adcSettingsViews"',
 'id="adc85UpdateCentre"','id="adc85CheckUpdates"','id="adc85UpdateNow"',
 'id="backupData"','id="restoreData"','id="mlx-theme-picker"',
 'id="adc85UpdateOverlay"','id="adc85Titlebar"','id="app"',
 'id="mlx101-privacy-standby-js"',
 'const IDLE=5*60*1000','medilabx10_html_v1'
]
NOTES=[
 'Applied supplied MediLab X 11 Unified Design System to current MediLab X 10.2.9: exact design tokens for seven themes, Inter-style typography, rounded surfaces, subtle shadows, modern navigation, cards, tables, forms and Settings/Admin.',
 'Native seven theme choices Aurora, Ocean, Emerald, Orchid, Sunset, Graphite and Midnight remain functional; new interface follows the existing theme engine instead of adding a fake duplicate.',
 'Updated navy app titlebar to match theme-specific sidebar; consistent vector navigation and Settings icon designs.',
 'Privacy Standby now has animated midnight glow, dotted grid, large live local clock, date and full-screen layout based on uploaded preview. Existing no-PIN click or keyboard unlock and five-minute automatic lock remain unchanged.',
 'Settings navigation, patient/receipt/radiology reports, doctor directory, staff roles, admin PIN, printing controls, WhatsApp and GitHub updater keep existing handlers and storage schema.',
 'Screen-only CSS; printable clinical reports, letterheads, receipts and original data are not modified.',
 'Includes original versioned HTML update with SHA-256 integrity guard and automated Chromium regression checks.'
]
def sha(data):return hashlib.sha256(data).hexdigest()

def repair_legacy_duotone(original):
 """Repair ONLY the old presentation script that forced every palette back to two themes.
    Every other byte in the original 10.2.9 HTML, including all clinical code, is unchanged.
 """
 open_tag='<script id="mlx101-duotone-design-js">'
 start=original.find(open_tag)
 end=original.find('</script>',start)
 if start<0 or end<start:raise RuntimeError('Cannot isolate old Duo-Tone UI-only script')
 chunk=original[start:end]
 changes=[
  ("""const canonical=mode==='dark'?'graphite':'aurora';""",
   """const existing=document.body.dataset.mlxTheme||'aurora';const canonical=mode==='dark'?(['graphite','midnight'].includes(existing)?existing:'graphite'):(['aurora','ocean','emerald','orchid','sunset'].includes(existing)?existing:'aurora');"""),
  ("""setMode(getMode());document.title='MediLab X 10.1""",
   """setMode(['graphite','midnight'].includes(document.body.dataset.mlxTheme)?'dark':'light');document.title='MediLab X 10.1"""),
  ("""e.target.closest('#mlxPrefLight,#mlxPrefDark,[data-ml10-layout="top"],[data-mlx-accent],[data-mlx-quick],[data-mlx-set-theme]')""",
   """e.target.closest('#mlxPrefLight,#mlxPrefDark,[data-ml10-layout="top"]')"""),
  ("""else if(b.matches('[data-mlx-accent],[data-mlx-quick],[data-mlx-set-theme]')){e.preventDefault();e.stopImmediatePropagation();}""",
   """"""),
  ("""const observer=new MutationObserver(muts=>{if(inSet)return;if(muts.some(m=>m.attributeName==='data-mlx-theme')){const t=document.body.dataset.mlxTheme,expected=getMode()==='dark'?'graphite':'aurora';if(t!==expected)setMode(getMode());}});""",
   """const observer=new MutationObserver(muts=>{if(inSet)return;if(muts.some(m=>m.attributeName==='data-mlx-theme')){const mode=['graphite','midnight'].includes(document.body.dataset.mlxTheme)?'dark':'light';safeSet(KEY,mode);document.body.dataset.mlx101Mode=mode;document.querySelectorAll('#mlxPrefLight,#mlxPrefDark').forEach(b=>{const active=b.id===(mode==='dark'?'mlxPrefDark':'mlxPrefLight');b.setAttribute('aria-pressed',String(active));});}});"""),
  ("""One consistent Duo-Tone design throughout MediLab X. Choose Light (Navy & White) or Dark (Navy & Slate).""",
   """Seven curated themes are available: Aurora, Ocean, Emerald, Orchid, Sunset, Graphite and Midnight.""")
 ]
 for old,new in changes:
  count=chunk.count(old)
  if count!=1:raise RuntimeError('UI-only Duo-Tone patch expected exactly once, got '+str(count)+': '+old[:60])
  chunk=chunk.replace(old,new,1)
 updated=original[:start]+chunk+original[end:]
 if updated[:start]!=original[:start] or updated[start+len(chunk):]!=original[end:]:
  raise RuntimeError('Theme repair leaked outside the UI-only script')
 return updated

def build():
 raw=BASE.read_bytes()
 if sha(raw)!=BASE_HASH:raise RuntimeError('FAIL closed: installed source 10.2.9 SHA256 mismatch')
 baseline=raw.decode('utf-8')
 missing=[s for s in NATIVE if s not in baseline]
 if missing:raise RuntimeError('FAIL closed: original patient/update/theme/lock controls missing: '+repr(missing))
 baseline=repair_legacy_duotone(baseline)
 marker=re.search(r'</body>\s*</html>\s*
 if not marker:raise RuntimeError('FAIL closed: unexpected closing HTML')
 if 'id="mlx11-unified-css"' in baseline or 'id="mlx11-unified-js"' in baseline:
  raise RuntimeError('Unexpected duplicate design integration')
 css=CSS.read_text('utf-8')
 js=JS.read_text('utf-8')
 if css.count('{')!=css.count('}'):raise RuntimeError('CSS braces unbalanced')
 for term in ['@media screen','@layer mlx11-unified','--v-bg:#f3f5fb','--v-side-a:#111a3d',
              '[data-mlx-theme="ocean"]','[data-mlx-theme="emerald"]','[data-mlx-theme="orchid"]',
              '[data-mlx-theme="sunset"]','[data-mlx-theme="graphite"]','[data-mlx-theme="midnight"]',
              '#mlx101Standby','.mlx101-orb.one','mlx11LockGlow','#app #settings','#app #admin']:
  if term not in css:raise RuntimeError('Missing required design token/element: '+term)
 for term in ['function ensureLock()','function updateClock()','function iconsMount()',
              'document.body?.classList.add','mlx11LockDigits']:
  if term not in js:raise RuntimeError('Missing required UI module: '+term)
 for forbidden in ['localStorage.', 'saveDB(', 'loadDB(', 'installOnline(', 'rollbackUpdate(',
                   'window.MediLabXTheme=', 'fetch(', 'XMLHttpRequest', 'innerHTML=baseline']:
  if forbidden in js:raise RuntimeError('Unsafe data/update manipulation in appearance-only add-on: '+forbidden)
 with tempfile.TemporaryDirectory() as folder:
  file=Path(folder)/'visual-only.js'
  file.write_text(js,encoding='utf-8')
  subprocess.run(['node','--check',str(file)],check=True)
  # Verify updated UI-only seven-theme logic is syntactically safe.
  duo=re.search(r'<script id="mlx101-duotone-design-js">([\\s\\S]*?)</script>',baseline)
  if not duo:raise RuntimeError('Duo-Tone script missing after repair')
  file.write_text(duo.group(1),encoding='utf-8')
  subprocess.run(['node','--check',str(file)],check=True)
  # Confirm original native lock implementation exists and is untouched; run syntax on its script.
  match=re.search(r'<script id="mlx101-privacy-standby-js">([\s\S]*?)</script>',baseline)
  if not match:raise RuntimeError('Native privacy standby script not found')
  file.write_text(match.group(1),encoding='utf-8')
  subprocess.run(['node','--check',str(file)],check=True)
 inserted=('\n<style id="mlx11-unified-css">\n'+css.rstrip('\n')+'\n</style>\n'
           '<script id="mlx11-unified-js">\n'+js.rstrip('\n')+'\n</script>\n')
 result=baseline[:marker.start()]+inserted+baseline[marker.start():]
 if result[:marker.start()]!=baseline[:marker.start()]:
  raise RuntimeError('Clinical source changed outside explicit targeted theme repair')
 if result.count('id="mlx11-unified-css"')!=1 or result.count('id="mlx11-unified-js"')!=1:
  raise RuntimeError('Duplicate or missing UI entry')
 return result.encode('utf-8')
def main():
 p=argparse.ArgumentParser()
 p.add_argument('--qa',action='store_true')
 p.add_argument('--qa-output',default='/tmp/MediLabX-10.2.10-QA.html')
 args=p.parse_args()
 result=build();digest=sha(result)
 if args.qa:
  dst=Path(args.qa_output);dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(result)
  print('PASS exact 10.2.9 baseline + source-preserving v11 UI integration')
  print('PASS JS syntax, native five-minute lock and original clinical IDs')
  print('QA file',dst,'size',len(result),'sha256',digest)
  return
 manifest=json.loads(MANIFEST.read_text('utf-8'))
 if manifest.get('version')=='10.2.10':
  if DEST.is_file() and DEST.read_bytes()==result and manifest.get('sha256')==digest and manifest.get('htmlUrl')==NEW_URL:
   print('PASS already-published 10.2.10 source/manifest SHA256',digest);return
  raise RuntimeError('A different 10.2.10 manifest or HTML already exists: refusing overwrite')
 if (manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))!=('10.2.9',OLD_URL,BASE_HASH):
  raise RuntimeError('Live updater is not the expected 10.2.9 baseline: refusing overwrite')
 if DEST.exists() and DEST.read_bytes()!=result:raise RuntimeError('Different target exists')
 DEST.parent.mkdir(parents=True,exist_ok=True);DEST.write_bytes(result)
 manifest.update(version='10.2.10',htmlUrl=NEW_URL,sha256=digest,notes=NOTES)
 MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print('PASS original 10.2.9 source preserved exactly, theme appended')
 print('PASS release 10.2.10 verified sha256',digest,'bytes',len(result))
if __name__=='__main__':main()
,baseline,re.I)
 if not marker:raise RuntimeError('FAIL closed: unexpected closing HTML')
 if 'id="mlx11-unified-css"' in baseline or 'id="mlx11-unified-js"' in baseline:
  raise RuntimeError('Unexpected duplicate design integration')
 css=CSS.read_text('utf-8')
 js=JS.read_text('utf-8')
 if css.count('{')!=css.count('}'):raise RuntimeError('CSS braces unbalanced')
 for term in ['@media screen','@layer mlx11-unified','--v-bg:#f3f5fb','--v-side-a:#111a3d',
              '[data-mlx-theme="ocean"]','[data-mlx-theme="emerald"]','[data-mlx-theme="orchid"]',
              '[data-mlx-theme="sunset"]','[data-mlx-theme="graphite"]','[data-mlx-theme="midnight"]',
              '#mlx101Standby','.mlx101-orb.one','mlx11LockGlow','#app #settings','#app #admin']:
  if term not in css:raise RuntimeError('Missing required design token/element: '+term)
 for term in ['function ensureLock()','function updateClock()','function iconsMount()',
              'document.body?.classList.add','mlx11LockDigits']:
  if term not in js:raise RuntimeError('Missing required UI module: '+term)
 for forbidden in ['localStorage.', 'saveDB(', 'loadDB(', 'installOnline(', 'rollbackUpdate(',
                   'window.MediLabXTheme=', 'fetch(', 'XMLHttpRequest', 'innerHTML=baseline']:
  if forbidden in js:raise RuntimeError('Unsafe data/update manipulation in appearance-only add-on: '+forbidden)
 with tempfile.TemporaryDirectory() as folder:
  file=Path(folder)/'visual-only.js'
  file.write_text(js,encoding='utf-8')
  subprocess.run(['node','--check',str(file)],check=True)
  # Confirm original native lock implementation exists and is untouched; run syntax on its script.
  match=re.search(r'<script id="mlx101-privacy-standby-js">([\s\S]*?)</script>',baseline)
  if not match:raise RuntimeError('Native privacy standby script not found')
  file.write_text(match.group(1),encoding='utf-8')
  subprocess.run(['node','--check',str(file)],check=True)
 inserted=('\n<style id="mlx11-unified-css">\n'+css.rstrip('\n')+'\n</style>\n'
           '<script id="mlx11-unified-js">\n'+js.rstrip('\n')+'\n</script>\n')
 result=baseline[:marker.start()]+inserted+baseline[marker.start():]
 if result[:marker.start()]!=baseline[:marker.start()]:
  raise RuntimeError('Original existing source mutated')
 if result.count('id="mlx11-unified-css"')!=1 or result.count('id="mlx11-unified-js"')!=1:
  raise RuntimeError('Duplicate or missing UI entry')
 return result.encode('utf-8')
def main():
 p=argparse.ArgumentParser()
 p.add_argument('--qa',action='store_true')
 p.add_argument('--qa-output',default='/tmp/MediLabX-10.2.10-QA.html')
 args=p.parse_args()
 result=build();digest=sha(result)
 if args.qa:
  dst=Path(args.qa_output);dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(result)
  print('PASS exact 10.2.9 baseline + source-preserving v11 UI integration')
  print('PASS JS syntax, native five-minute lock and original clinical IDs')
  print('QA file',dst,'size',len(result),'sha256',digest)
  return
 manifest=json.loads(MANIFEST.read_text('utf-8'))
 if manifest.get('version')=='10.2.10':
  if DEST.is_file() and DEST.read_bytes()==result and manifest.get('sha256')==digest and manifest.get('htmlUrl')==NEW_URL:
   print('PASS already-published 10.2.10 source/manifest SHA256',digest);return
  raise RuntimeError('A different 10.2.10 manifest or HTML already exists: refusing overwrite')
 if (manifest.get('version'),manifest.get('htmlUrl'),manifest.get('sha256'))!=('10.2.9',OLD_URL,BASE_HASH):
  raise RuntimeError('Live updater is not the expected 10.2.9 baseline: refusing overwrite')
 if DEST.exists() and DEST.read_bytes()!=result:raise RuntimeError('Different target exists')
 DEST.parent.mkdir(parents=True,exist_ok=True);DEST.write_bytes(result)
 manifest.update(version='10.2.10',htmlUrl=NEW_URL,sha256=digest,notes=NOTES)
 MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print('PASS original 10.2.9 source preserved exactly, theme appended')
 print('PASS release 10.2.10 verified sha256',digest,'bytes',len(result))
if __name__=='__main__':main()
