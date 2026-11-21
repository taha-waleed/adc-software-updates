#!/usr/bin/env python3
from pathlib import Path
import re, json, hashlib, subprocess, tempfile, sys, base64,zlib
ROOT=Path(__file__).resolve().parents[1]
PATCH_SHA='ab7333c15ec2b56929bd6549de94f7b5f7e115b6345abd06f428f00e139de756'
BASE='af77dd1043698d66304b945d6b1ed87090d0db0de01a19793485d718ceb82b14'
OLD='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.0.7/MediLabX.html'
NEW=OLD.replace('10.0.7','10.0.8')
def sha(b):return hashlib.sha256(b).hexdigest()
CLASSIFIER=r'''<script id="mlx108-classifier">
window.mlx108KnownKind=function(t){
 const s=(typeof t==='string'?t:[t?.name,t?.testName,t?.abbr].filter(Boolean).join(' ')).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 if(/\b(?:ecg|ekg|electrocardiogram|electrocardiography)\b/.test(s))return 'Other';
 if(/\b(?:ct|ncct|hrct|cect|ccect|ctscan)\b|computed tomography|\bcontrast\s+inj(?:ection)?\b|\binj(?:ection)?\s+contrast\b/.test(s))return 'CT';
 if(/x\s*ray|\b(?:cxr|xr|bamf|barium)\b|radiograph|\bba\s*(?:meal|swallow|[ae]n[ae]ma|m\b|sw\b|an\b)|\bap view only\b/.test(s))return 'X-Ray';
 if(/ultrasound|\busg\b|sonograph|doppler|\bdop\b|echocardiograph/.test(s))return 'Ultrasound';
 return '';
};
window.mlx108Kind=function(t){const k=window.mlx108KnownKind(t);if(k)return k;const explicit=t?.modality;if(['CT','X-Ray','Ultrasound','Other'].includes(explicit))return explicit;return 'Other'};
</script>'''
def build(source,fragment):
 s=source.decode('utf-8');assert 'mlx108-classifier' not in s and 'mlx107-fishtank-settings-and-animation' in s
 def sub(old,new,count=1):
  nonlocal s
  if s.count(old)!=count:raise RuntimeError(f'Expected {count}, got {s.count(old)} occurrence(s): {old[:110]!r}')
  s=s.replace(old,new)
 def rx(pattern,replacement,count=1):
  nonlocal s
  s,n=re.subn(pattern,lambda _:replacement,s,flags=re.S)
  if n!=count:raise RuntimeError(f'Expected {count}, got {n}: {pattern}')
 # Classifier is loaded before any existing inline scripts refer to it.
 sub('<html lang="en"><head>','<html lang="en"><head>'+CLASSIFIER)
 rx(r'function ml85TestKind\(t\)\{.*?\n\}',"function ml85TestKind(t){return window.mlx108Kind(t)}")
 rx(r'window\.medilabScanMatch=function\(p,cat\)\{.*?\n\};',"window.medilabScanMatch=function(p,cat){return !cat||cat==='All'||(Array.isArray(p?.tests)&&p.tests.some(t=>window.mlx108Kind(t)===cat));};")
 rx(r'function modalityOf\(t\)\{.*?\n \}',"function modalityOf(t){const k=window.mlx108Kind(t);return k==='CT'?'CT Scan':k;}")
 # Add Other to the new dashboard chart rather than silently drop ECG revenue.
 sub("{key:'Ultrasound',label:'Ultrasound',color:'#ab77df'}];","{key:'Ultrasound',label:'Ultrasound',color:'#ab77df'},{key:'Other',label:'Other',color:'#91a5ba'}];")
 rx(r'function adcIsCtScanPatient\(p\)\{[^\n]*?\}',"function adcIsCtScanPatient(p){return Array.isArray(p.tests)&&p.tests.some(t=>window.mlx108Kind(t)==='CT')}")
 rx(r'const adcIsCtScanTest=t=>[^\n]+;',"const adcIsCtScanTest=t=>window.mlx108Kind(t)==='CT';")
 # Preserve test catalogue objects so saved templates and historical test IDs remain valid.
 sub("function go(id){if(!adcHasAccess(id))", "function go(id){if(id==='ratelist'&&window.mlx108OpenRates){window.mlx108OpenRates();return}if(!adcHasAccess(id))")
 sub("String(t.department||'').toLowerCase()==='radiology'&&(t.name+' '+t.abbr+' '+t.department).toLowerCase().includes(q)).slice(0,80)","String(t.department||'').toLowerCase()==='radiology'&&!t.mlx108Archived&&((window.mlx108ReceptionKind||'All')==='All'||window.mlx108Kind(t)===window.mlx108ReceptionKind)&&(t.name+' '+t.abbr+' '+t.department).toLowerCase().includes(q)).slice(0,80)")
 sub("String(t.department).toLowerCase()==='radiology'&&(String(t.name)+' '+String(t.abbr)).toLowerCase().includes(q)","String(t.department).toLowerCase()==='radiology'&&!t.mlx108Archived&&(String(t.name)+' '+String(t.abbr)).toLowerCase().includes(q)")
 sub("String(t.department||'').toLowerCase()==='radiology'&&(!dept||t.department===dept)","String(t.department||'').toLowerCase()==='radiology'&&!t.mlx108Archived&&(!dept||t.department===dept)")
 # Report templates intentionally remain accessible for archived tests; existing report dropdown prioritizes the patient's historical tests.
 sub("const rest=db.tests.filter(t=>!ids.includes(String(t.id)));","const rest=db.tests.filter(t=>!t.mlx108Archived&&!ids.includes(String(t.id)));")
 sub("let selected='All';['All','CT','X-Ray','Ultrasound'].forEach(label=>", "let selected='All';['All','CT','X-Ray','Ultrasound','Other'].forEach(label=>")
 sub("const text=row.textContent||'',yes=selected==='All'||rules[selected].test(text);row.style.display=yes?'':'none';", "const b=row.querySelector(which==='reception'?'[data-add]':'[data-edit-rate]'),t=b&&testById(b.dataset.add||b.dataset.editRate);const yes=selected==='All'||!t||window.mlx108Kind(t)===selected;row.style.display=yes?'':'none';")
 sub("selected=b.dataset.scanFilter;\n       bar.querySelectorAll", "selected=b.dataset.scanFilter;if(which==='reception')window.mlx108ReceptionKind=selected;\n       bar.querySelectorAll")
 # Original filter handlers bind on DOMContentLoaded, so install the ECG button in the static markup first.
 pattern=r'(<button type="button" data-scan="Ultrasound" aria-pressed="false">Ultrasound</button>)'
 s,n=re.subn(pattern,lambda m:m[0]+'<button type="button" data-scan="Other" aria-pressed="false">Other</button>',s)
 if n!=3:raise RuntimeError('Expected 3 existing modality filter groups, got '+str(n))
 sub("function renderEarnings(){\n const data=adc85EarningRecordData();if(!data)return;", "function renderEarnings(){\n window.mlx108RenderAnalytics?.();const data=adc85EarningRecordData();if(!data)return;")
 # Validate all modified app JS blocks (including the new standalone script).
 if s.count('</body>')<1:raise RuntimeError('Incomplete HTML')
 at=s.rfind('</body>');s=s[:at]+fragment+'\n'+s[at:]
 # Historical print-template strings contain literal script markup, so validate each new standalone block and the changed functions separately.
 scripts=re.findall(r'<script\b[^>]*>(.*?)</script\s*>',CLASSIFIER+'\n'+fragment,re.S|re.I)
 with tempfile.TemporaryDirectory() as td:
  for i,js in enumerate(scripts):
   f=Path(td)/f'{i}.js';f.write_text(js,encoding='utf-8');subprocess.run(['node','--check',str(f)],check=True)
 return s.encode('utf-8')
def publish():
 mfile=ROOT/'m/update.json';m=json.loads(mfile.read_text());dest=ROOT/'medilabx-ui-10.0.8/MediLabX.html';src=ROOT/'medilabx-ui-10.0.7/MediLabX.html';payload=ROOT/'m/ux-10.0.8.patch.b64'
 if m.get('version')=='10.0.8' and dest.exists() and sha(dest.read_bytes())==m.get('sha256'):print('Already published verified 10.0.8');return
 assert (m.get('version'),m.get('htmlUrl'),m.get('sha256'))==('10.0.7',OLD,BASE),'Unexpected live version'
 raw=src.read_bytes();assert sha(raw)==BASE,'Source SHA mismatch';fragment=zlib.decompress(base64.b64decode(''.join(payload.read_text().split())));assert sha(fragment)==PATCH_SHA,'Patch SHA mismatch'
 result=build(raw,fragment.decode());assert sha(src.read_bytes())==BASE;dest.parent.mkdir(parents=True,exist_ok=True);assert not dest.exists() or dest.read_bytes()==result,'Refuse overwrite';dest.write_bytes(result)
 m.update(version='10.0.8',htmlUrl=NEW,sha256=sha(result),notes=['Compact Rate List sidebar button opens an editable modal; admins can add, edit, delete and restore catalog tests.','Unified CT, X-Ray, Ultrasound and ECG/Other classification across reception, patient lists and earnings. Unknown legacy tests remain visible for review.','Test Analytics in Total Earning: booked quantities, saved gross charges, allocated collections, date/category filters, CSV and print.','Archived catalogue entries retain historical receipts and report templates; existing fish tank, settings and native updater preserved.']);mfile.write_text(json.dumps(m,indent=2)+'\n');print('PASS: prior release unchanged; new release SHA-256:',sha(result))
if __name__=='__main__':
 if len(sys.argv)>1:
  raw=Path(sys.argv[1]).read_bytes();patch=Path(__file__).with_name('patch.html').read_text();out=build(raw,patch);Path(__file__).with_name('MediLabX_10.0.8_TEST.html').write_bytes(out);print('PASS: local preview built',len(out))
 else:publish()
