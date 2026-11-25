#!/usr/bin/env python3
"""Publish MediLab X 10.1.4 from verified 10.1.3.
Only existing notification functions and new scoped CSS are modified.
"""
from pathlib import Path
import hashlib,json,re,subprocess,tempfile

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.1.3/MediLabX.html'
DEST=ROOT/'medilabx-ui-10.1.4/MediLabX.html'
PATCH=ROOT/'m/ux-10.1.4-notifications.json'
MANIFEST=ROOT/'m/update.json'
EXPECTED_BASE='c3acf15e078feefd9c332f667c93d32ddb30452438b0d2649a516b8ee89d65e2'
EXPECTED_PATCH='d5af738873a36e13e6ecbdf40630983a7a0786cf9a8f43c6349f2acbd76739b7'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.1.3/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.1.4/MediLabX.html'
EXPECTED_CHUNKS={
 'function notificationElements(){':'55f406d1007a18823f72f457d8c032c36f1f5e772da21a9529ec5afe24873823',
 'function renderNotices(){':'49fc467dbd773aff018887a2e4e70f772fe70bcb6dddb59ab1f3013932f98941',
 'function popup(n){':'7ccac9eefcc2291d3a715aa6b591b6dfcefb3d2ce50714eb5cfb1993ea611105',
}
REQUIRED=['mlx1013-bottom-rates-js','mlx1012-professional-contrast-css',
          'mlx108-radiology-and-analytics','mlx107-fishtank-css',
          "notifyPanel.id='mlx-notif-panel'",'mlx_notification_history_v1','id="settings"','id="nav"']
def sha(x):return hashlib.sha256(x).hexdigest()
def build():
 m=json.loads(MANIFEST.read_text('utf-8'))
 if m.get('version')=='10.1.4':
  if DEST.exists() and m.get('htmlUrl')==NEW_URL and sha(DEST.read_bytes())==m.get('sha256'):
   print('PASS: matching 10.1.4 already published');return
  raise RuntimeError('10.1.4 manifest already differs. Refusing overwrite.')
 if (m.get('version'),m.get('htmlUrl'),m.get('sha256'))!=('10.1.3',OLD_URL,EXPECTED_BASE):
  raise RuntimeError('Current update channel changed. Publication halted.')
 original=SOURCE.read_bytes()
 if sha(original)!=EXPECTED_BASE:raise RuntimeError('10.1.3 HTML checksum mismatch.')
 source=original.decode('utf-8')
 if any(marker not in source for marker in REQUIRED):
  raise RuntimeError('Required features missing from original source.')
 payload=PATCH.read_bytes().rstrip(b'\n')
 if sha(payload)!=EXPECTED_PATCH:raise RuntimeError('Notification patch checksum mismatch.')
 p=json.loads(payload)
 a='function notificationElements(){'
 b='function renderNotices(){'
 c='function popup(n){'
 d='function addNotice('
 segments=[source.index(a),source.index(b),source.index(c),source.index(d)]
 if segments!=sorted(segments):raise RuntimeError('Unexpected notification function order.')
 first,second,third,last=segments
 chunks=[source[first:second],source[second:third],source[third:last]]
 for marker,chunk in zip([a,b,c],chunks):
  if sha(chunk.encode('utf-8'))!=EXPECTED_CHUNKS[marker]:
   raise RuntimeError('Notification function changed unexpectedly: '+marker)
 elem=chunks[0]
 for old,new in p['handlers'].items():
  if elem.count(old)!=1:raise RuntimeError('Original notification tab handler missing or duplicated')
  elem=elem.replace(old,new,1)
 if p['css'].count('mlx1014-glass-notifications-css')!=1 or 'mlx1014-glass-notifications-css' in source:
  raise RuntimeError('Scoped CSS marker missing or already applied')
 output=source[:first]+elem+p['helpers']+p['render']+p['popup']+source[last:]
 pos=output.rfind('</body>')
 if pos<0:raise RuntimeError('Incomplete HTML document.')
 output=output[:pos]+p['css']+'\n'+output[pos:]
 # Confirm unchanged content beyond the intended notification functions and new CSS.
 prefix=source[:first]
 suffix=source[last:]
 if not output.startswith(prefix) or not output.endswith(suffix[suffix.rfind('</body>'):]):
  raise RuntimeError('Source preservation check failed.')
 if output.count('function mlxNoticeOpen(')!=1 or output.count('function renderNotices(')!=1 or output.count('function popup(n)')!=1:
  raise RuntimeError('Duplicate notification implementation detected.')
 scripts=re.findall(r'<script id="mlx-desktop-premium-final">(.*?)</script>',output,re.S)
 if len(scripts)!=1:raise RuntimeError('Original notification runtime not found.')
 with tempfile.TemporaryDirectory() as tmp:
  js=Path(tmp)/'medilab-notifications.js';js.write_text(scripts[0],'utf-8')
  subprocess.run(['node','--check',str(js)],check=True)
 dest_bytes=output.encode('utf-8')
 DEST.parent.mkdir(parents=True,exist_ok=True)
 if DEST.exists() and DEST.read_bytes()!=dest_bytes:
  raise RuntimeError('Existing release path differs. Refusing overwrite.')
 if not DEST.exists():DEST.write_bytes(dest_bytes)
 m.update(version='10.1.4',htmlUrl=NEW_URL,sha256=sha(dest_bytes))
 m['notes']=[
  'Frosted glass Notification Center and interactive pill-shaped popups with smooth motion and Light/Dark contrast.',
  'Click a notification card, Open button or pill to navigate to the relevant existing module; update alerts open Settings > Software Updates.',
  'Inbox displays four unread alerts initially, then Show More in batches of four instead of loading all at once.',
  'Mark as Read transfers notifications to persistent History, grouped by Today, Yesterday or calendar date.',
  'History search, Mark All Read and existing notification storage retained; at most two pill alerts stack.',
  'Original patient records, reception, reports, earnings, Rate List, Fish Tank, permissions and native GitHub update transport preserved.'
 ]
 MANIFEST.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n','utf-8')
 print('PASS: verified source hash',sha(original))
 print('PASS: exact notification function checksums and source guards')
 print('PASS: full notification runtime JavaScript syntax')
 print('PASS: published HTML bytes',len(dest_bytes),'SHA256',sha(dest_bytes))
if __name__=='__main__':build()
