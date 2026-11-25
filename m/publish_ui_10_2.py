#!/usr/bin/env python3
"""MediLab X 10.2 — verified visual-only Pearl Clinical release.
Do not change MediLab native updater, clinical records, report logic or button IDs.
"""
from pathlib import Path
import hashlib,json,subprocess,tempfile

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.1.4/MediLabX.html'
DEST=ROOT/'medilabx-ui-10.2.0/MediLabX.html'
MANIFEST=ROOT/'m/update.json'
CSS=ROOT/'m/pearl-10.2.0-theme.css'
JS=ROOT/'m/pearl-10.2.0-activate.js'
OLD_SHA='6548605a1168a78c282647ccca3c17243196c405217b66556e06a36cda63c8e4'
CSS_SHA='ad8b24083f39b2335eae66fb9802c97af25f0ad0695e796c017f281e7993e408'
JS_SHA='67f4bd5b909e88f2faada900d590f5c531fcfb768328fd38db5004701c8ba870'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.1.4/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.0/MediLabX.html'
STYLE_ID='mlx102-theme'
SCRIPT_ID='mlx102-theme-activation'
REQUIRED=[
 'id="app"','id="nav"','id="dashboard"','id="reception"','id="patients"','id="reports"',
 'id="daily"','id="expenses"','id="earnings"','id="admin"','id="settings"','id="about"',
 'id="patientForm"','id="savePatient"','id="pAge"','id="pGender"','id="pDoctor"',
 'id="adc85UpdateCentre"','id="adc85UpdateOffer"','id="adc85UpdateNow"',
 'mlx1014-glass-notifications-css','mlx1013-bottom-rates-js',
 'mlx108-radiology-and-analytics','mlx107-fishtank-css',
 'mlx106-clinical-validation-and-dialogs',
 'adc85NowBrief','adc85BriefCopy'
]
def sha(data):return hashlib.sha256(data).hexdigest()
def publish():
 m=json.loads(MANIFEST.read_text(encoding='utf-8'))
 if m.get('version')=='10.2.0':
  if DEST.is_file() and m.get('htmlUrl')==NEW_URL and sha(DEST.read_bytes())==m.get('sha256'):
   print('PASS: identical MediLab X 10.2.0 release already published');return
  raise RuntimeError('10.2.0 is already published with different content; refusing overwrite')
 if (m.get('version'),m.get('htmlUrl'),m.get('sha256'))!=('10.1.4',OLD_URL,OLD_SHA):
  raise RuntimeError('Unexpected live 10.1.4 manifest; aborting publication')
 original=SOURCE.read_bytes()
 if sha(original)!=OLD_SHA:raise RuntimeError('10.1.4 HTML does not match the signed-off checksum')
 text=original.decode('utf-8')
 missing=[marker for marker in REQUIRED if marker not in text]
 if missing:raise RuntimeError('Missing original feature IDs: '+', '.join(missing))
 css_bytes=CSS.read_bytes()
 js_bytes=JS.read_bytes()
 if sha(css_bytes)!=CSS_SHA or sha(js_bytes)!=JS_SHA:
  raise RuntimeError('Pearl theme source checksum mismatch')
 css=css_bytes.decode('utf-8')
 js=js_bytes.decode('utf-8')
 if '#adc85NowBrief' in css or 'mlx202-preview' in css or 'px-preview' in css:
  raise RuntimeError('Unsafe preview / original Now Brief override found')
 if any(word in js for word in ('localStorage','installOnline(','deletePatient','fetch(')):
  raise RuntimeError('Activation script contains unexpected clinical or updater behaviour')
 if STYLE_ID in text or SCRIPT_ID in text:raise RuntimeError('10.2 theme already present in source')
 if '</body>' not in text or '</html>' not in text:raise RuntimeError('Source HTML incomplete')
 with tempfile.TemporaryDirectory() as tmp:
  f=Path(tmp)/'activate.js';f.write_text(js,encoding='utf-8')
  subprocess.run(['node','--check',str(f)],check=True)
 addon='\n<style id="'+STYLE_ID+'">\n'+css+'\n</style>\n<script id="'+SCRIPT_ID+'">\n'+js+'\n</script>\n'
 ix=text.rfind('</body>')
 merged=text[:ix]+addon+text[ix:]
 if merged.replace(addon,'',1).encode('utf-8')!=original:
  raise RuntimeError('Unrelated clinical, navigation or updater source modified')
 if merged.count('<style id="'+STYLE_ID+'">')!=1 or merged.count('<script id="'+SCRIPT_ID+'">')!=1:
  raise RuntimeError('Unexpected duplicate stylesheet or script')
 data=merged.encode('utf-8')
 DEST.parent.mkdir(parents=True,exist_ok=True)
 if DEST.exists() and DEST.read_bytes()!=data:
  raise RuntimeError('Version destination exists with differing HTML. No overwrite allowed.')
 if not DEST.exists():DEST.write_bytes(data)
 m.update(version='10.2.0',htmlUrl=NEW_URL,sha256=sha(data))
 m['notes']=[
  'MediLab X 10.2 — Pearl Clinical: original button locations and workflows preserved with reference-style rounded pearl-grey cards, soft shadows, electric-blue actions and professional Inter/Segoe typography.',
  'One consistent, readable light and dark colour system across Dashboard, Reception, Patients, Radiology, Expenses, Earnings, Admin, Settings, tables, dialogs and notifications.',
  'Fixed dark-on-dark / light-on-light text conflicts, including selected navigation, theme controls, sign-out and Software Updates card version text.',
  'Original animated Midnight Prism Now Brief design retained without overrides.',
  'Smoother hover/popup transitions and reduced-motion support; no preview toolbar in the production build.',
  'Existing patient data, receipt and report handlers, Rate List, Fish Tank, notification routing, roles and native Electron GitHub update transport unchanged.'
 ]
 MANIFEST.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('PASS source 10.1.4 SHA256',sha(original))
 print('PASS theme and activation script SHA256')
 print('PASS existing section/button IDs and byte-for-byte original HTML retention')
 print('PASS Now Brief CSS untouched')
 print('PASS activation JavaScript syntax')
 print('PASS new 10.2.0 HTML bytes',len(data),'SHA256',sha(data))
if __name__=='__main__':publish()
