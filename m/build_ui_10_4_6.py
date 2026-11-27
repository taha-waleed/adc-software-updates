#!/usr/bin/env python3
"""MediLab X 10.4.6: production-source visual-only CSS and tab presentation update."""
from pathlib import Path
import argparse,base64,hashlib,json,re,subprocess,tempfile,zlib
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.4.5/MediLabX.html'
TARGET=ROOT/'medilabx-ui-10.4.6/MediLabX.html'
MANIFEST=ROOT/'m/update.json'
CURRENT_SHA='b2a06cb1c7350a18a76559638dc3967caccab11fc82463f20cfcaf3a6e9d0d29'
CSS_SHA='e0024037987400950813482374a45ab3ef3b30cf2e40adf9e833f02c8c90581d'
JS_SHA='781416eaad69690eafbb21ef9824b785d93e7a12052be851407a05caa23b4063'
PRIOR='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.5/MediLabX.html'
NEXT='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.6/MediLabX.html'
NOTES=[
 'MediLab X 10.4.6: top Windows titlebar and left navigation both use matching dark navy #182C4D.',
 'Fixed all sidebar navigation and window-control text/icon contrast in Light and Dark modes.',
 'Professional, consistent primary, secondary, danger and selected-tab buttons; improved hover and keyboard focus states.',
 'Reduced Settings tab overflow by retaining six common tabs and placing remaining original tabs under More settings; original event handlers are reused.',
 'Existing patient, receipt, doctor, rate-list, report, printing, permissions, backup and GitHub updater JavaScript is preserved unchanged.',
 'HTML-only appearance update; native Windows desktop, physical printing and live patient workflows are not fully tested in this GitHub CI.'
]
def sha(b):return hashlib.sha256(b).hexdigest()
def read_asset(name,expected):
 text=(ROOT/'m'/name).read_text(encoding='utf8').strip()
 b=zlib.decompress(base64.b64decode(text,validate=True))
 if sha(b)!=expected:raise RuntimeError('UI patch asset checksum mismatch: '+name)
 return b.decode('utf8')
def build():
 raw=SOURCE.read_bytes()
 if sha(raw)!=CURRENT_SHA:raise RuntimeError('10.4.5 production HTML source SHA mismatch; refusing unsafe patch')
 text=raw.decode('utf8')
 required=['id="app"','id="settings"','id="admin"','id="adcSettingsList"','id="adcSettingsViews"',
           'id="patientForm"','id="patientRows"','id="adc85Titlebar"','id="adc85UpdateNow"',
           'medilabx10_html_v1','id="mlx1045-screen-js"']
 missing=[x for x in required if x not in text]
 if missing:raise RuntimeError('Missing required clinical UI elements: '+str(missing))
 if 'id="mlx1046-patch-js"' in text:raise RuntimeError('Patch duplication')
 css=read_asset('ux-10.4.6-navy.css.z64',CSS_SHA)
 js=read_asset('ux-10.4.6-tabs.js.z64',JS_SHA)
 if css.count('{')!=css.count('}'):raise RuntimeError('CSS braces unbalanced')
 if any(x in js for x in ('localStorage.', 'indexedDB.', 'fetch(', 'XMLHttpRequest(', 'saveDB(')):
  raise RuntimeError('Unexpected record/network operations in visual-only patch')
 if '#adc85Titlebar' not in css or '--mlx-nav-navy' not in css or 'button.primary' not in css:
  raise RuntimeError('Missing requested theme or button rules')
 with tempfile.TemporaryDirectory() as t:
  f=Path(t)/'patch.js';f.write_text(js,encoding='utf8')
  subprocess.run(['node','--check',str(f)],check=True)
 m=re.search(r'</body>\s*</html>\s*$',text,re.I)
 if not m:raise RuntimeError('Unexpected production HTML closing')
 patch='\n<style id="mlx1046-patch-css">\n'+css+'\n</style>\n<script id="mlx1046-patch-js">\n'+js+'\n</script>\n'
 updated=(text[:m.start()]+patch+text[m.start():]).encode('utf8')
 if updated[:m.start()]!=raw[:m.start()]:raise RuntimeError('Clinical source changed unexpectedly')
 if updated.count(b'id="mlx1046-patch-css"')!=1 or updated.count(b'id="mlx1046-patch-js"')!=1:
  raise RuntimeError('Patch has duplicate markers')
 return updated
def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--qa',action='store_true')
 ap.add_argument('--qa-output',default='/tmp/MediLabX-10.4.6-QA.html')
 args=ap.parse_args();b=build();h=sha(b)
 if args.qa:
  output=Path(args.qa_output);output.parent.mkdir(parents=True,exist_ok=True);output.write_bytes(b)
  print('QA HTML built',len(b),h,output)
  return
 m=json.loads(MANIFEST.read_text(encoding='utf8'))
 actual=(m.get('version'),m.get('htmlUrl'),m.get('sha256'))
 if m.get('version')=='10.4.6':
  if TARGET.exists() and TARGET.read_bytes()==b and m.get('sha256')==h:
   print('Existing 10.4.6 release verified');return
  raise RuntimeError('10.4.6 manifest mismatch; abort')
 if actual!=('10.4.5',PRIOR,CURRENT_SHA):raise RuntimeError('Manifest advanced or changed; abort '+repr(actual))
 if TARGET.exists() and TARGET.read_bytes()!=b:raise RuntimeError('Conflicting 10.4.6 HTML')
 TARGET.parent.mkdir(parents=True,exist_ok=True);TARGET.write_bytes(b)
 m.update(version='10.4.6',htmlUrl=NEXT,sha256=h,notes=NOTES)
 MANIFEST.write_text(json.dumps(m,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
 print('PUBLISHED 10.4.6',h,'bytes',len(b))
if __name__=='__main__':main()
