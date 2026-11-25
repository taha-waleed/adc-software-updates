#!/usr/bin/env python3
"""MediLab X 10.2.1 — contrast, type and icon hotfix.
Only new CSS/JS are appended to verified 10.2.0 HTML. All original bytes preserved.
"""
from pathlib import Path
import hashlib,json,subprocess,tempfile

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.2.0/MediLabX.html'
DEST=ROOT/'medilabx-ui-10.2.1/MediLabX.html'
MANIFEST=ROOT/'m/update.json'
CSS=ROOT/'m/pearl-10.2.1-contrast.css'
JS=ROOT/'m/pearl-10.2.1-icons.js'
EXPECTED_SOURCE='8c2c5b6c3b889da68dbc9d6f6865ded0185fdc1f128a3582af28886d07dfa63d'
EXPECTED_CSS='d25c045fffa4cadc971cfeacf0098689e9b99ebbd576683c7237b7b1c6da2312'
EXPECTED_JS='f044f328ad97adc21b40c7e426a82834fa31bf38a00f229de085bd43c818cf02'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.0/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.1/MediLabX.html'
STYLE_ID='mlx1021-contrast-fix'
SCRIPT_ID='mlx1021-polish-icons'
REQUIRED=[
 'id="app"','id="nav"','id="settings"','id="dashboard"','id="reception"',
 'id="patients"','id="reports"','id="daily"','id="expenses"','id="earnings"',
 'id="admin"','id="about"','id="patientForm"','id="savePatient"',
 'id="pAge"','id="pGender"','id="pDoctor"','id="adc85UpdateCentre"',
 'id="mlx102-theme"','id="mlx102-theme-activation"',
 'mlx1014-glass-notifications-css','mlx1013-bottom-rates-js',
 'mlx108-radiology-and-analytics','mlx107-fishtank-css'
]
def sha(x):return hashlib.sha256(x).hexdigest()
def publish():
 m=json.loads(MANIFEST.read_text(encoding='utf-8'))
 if m.get('version')=='10.2.1':
  if DEST.exists() and m.get('htmlUrl')==NEW_URL and sha(DEST.read_bytes())==m.get('sha256'):
   print('PASS: identical 10.2.1 release already published');return
  raise RuntimeError('Existing 10.2.1 release differs; refusing overwrite')
 if (m.get('version'),m.get('htmlUrl'),m.get('sha256'))!=('10.2.0',OLD_URL,EXPECTED_SOURCE):
  raise RuntimeError('Update channel no longer matches verified 10.2.0; refusing to publish')
 original=SOURCE.read_bytes()
 if sha(original)!=EXPECTED_SOURCE:raise RuntimeError('10.2.0 source checksum mismatch')
 html=original.decode('utf-8')
 missing=[x for x in REQUIRED if x not in html]
 if missing:raise RuntimeError('Missing original control(s): '+', '.join(missing))
 if STYLE_ID in html or SCRIPT_ID in html:raise RuntimeError('Hotfix already included in base')
 css_data=CSS.read_bytes();js_data=JS.read_bytes()
 if sha(css_data)!=EXPECTED_CSS or sha(js_data)!=EXPECTED_JS:
  raise RuntimeError('UI hotfix content checksum mismatch')
 css=css_data.decode('utf-8');js=js_data.decode('utf-8')
 if '#adc85NowBrief' in css or '#adc85BriefCopy' in css:
  raise RuntimeError('Now Brief original style must not be modified')
 if any(x in js for x in ['localStorage.setItem(', 'installOnline(', 'fetch(', 'deletePatient(']):
  raise RuntimeError('Unexpected application logic in visual hotfix')
 with tempfile.TemporaryDirectory() as folder:
  f=Path(folder)/'icons.js';f.write_text(js,encoding='utf-8')
  subprocess.run(['node','--check',str(f)],check=True)
 addon='\n<style id="'+STYLE_ID+'">\n'+css+'\n</style>\n<script id="'+SCRIPT_ID+'">\n'+js+'\n</script>\n'
 pos=html.rfind('</body>')
 if pos<0 or html.rfind('</html>')<0:raise RuntimeError('Source HTML incomplete')
 merged=html[:pos]+addon+html[pos:]
 if merged.replace(addon,'',1).encode('utf-8')!=original:
  raise RuntimeError('Original app source was modified outside approved visual add-on')
 if merged.count('<style id="'+STYLE_ID+'">')!=1 or merged.count('<script id="'+SCRIPT_ID+'">')!=1:
  raise RuntimeError('Unexpected duplicate release component')
 data=merged.encode('utf-8')
 DEST.parent.mkdir(parents=True,exist_ok=True)
 if DEST.exists() and DEST.read_bytes()!=data:
  raise RuntimeError('Refusing to overwrite a different release')
 if not DEST.exists():DEST.write_bytes(data)
 m.update(version='10.2.1',htmlUrl=NEW_URL,sha256=sha(data))
 m['notes']=[
  'MediLab X 10.2.1: high-contrast white sidebar labels, clear brand and group headings in both Light and Dark modes.',
  'Consistent updated Lucide-style medical/navigation SVG icons and polished Settings sidebar with readable text.',
  'Professional Manrope geometric font when online, with clear Windows offline fallback; original control locations and event handlers retained.',
  'Compact frosted-glass Notification Center (334px) and shorter pill popups below the taskbar, preserving click-to-navigate and dated history.',
  'Original Pearl Clinical palette, smooth animations and the animated Midnight Prism Now Brief remain unchanged.',
  'Existing clinical records, receipts, reporting, prices, permissions, data handling, Fish Tank and native GitHub Electron updater remain unchanged.'
 ]
 MANIFEST.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('PASS base source SHA256:',sha(original))
 print('PASS UI asset SHA256 and JS syntax')
 print('PASS original application logic byte-for-byte preserved')
 print('PASS original Now Brief not changed')
 print('PASS release 10.2.1 bytes',len(data),'SHA256',sha(data))
if __name__=='__main__':publish()
