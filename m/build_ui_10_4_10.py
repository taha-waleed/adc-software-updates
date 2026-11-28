#!/usr/bin/env python3
"""MediLab X 10.4.10 — verified production-sourced UI/Reception patch.

Patient, test, user, rate list, report and native updater source is kept byte-for-byte.
Only appends scoped presentation/phone-matching UI code. No schema migration.
"""
from pathlib import Path
import argparse,base64,hashlib,json,re,subprocess,tempfile,zlib
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'medilabx-ui-10.4.9/MediLabX.html'
TARGET=ROOT/'medilabx-ui-10.4.10/MediLabX.html'
MANIFEST=ROOT/'m/update.json'
OLD_SHA='70d18b416f0af689626daa957371ff6f62c69b8da1ca198316a279f1f8d54338'
CSS_SHA='4daba9f307577c22b087b2a51ce9a8460cc1979d5b285eeccd6e17ee33c691ed'
JS_SHA='862625e3319f704475e9c1f9099c8703d1c8369a3a68ccb1ee14f89cde18919d'
OLD_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.9/MediLabX.html'
NEW_URL='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.4.10/MediLabX.html'
NOTES=[
 "MediLab X 10.4.10: Soft Capsule sidebar selected-state styling with larger Manrope/Inter-first headings and inputs, generous Workspace/Operations/System spacing and a visible update indicator.",
 "Patients & Receipts: responsive modality filters, date/search/export controls, clearer Light/Dark contrast and smaller Export Contacts button without toolbar overlap.",
 "Reception: compact Returning Patient MR/receipt/phone lookup; mobile number presents optional matching patient suggestions, including multiple family members, before any data is filled.",
 "Selecting Use details copies only chosen demographics; never auto-selects a phone match, replaces existing patient records, or reuses a prior visit's tests, receipt, payment or date.",
 "Clinical Notes input removed from the registration screen and cleared on new submission; existing historical clinical notes and database structure preserved; tests moved higher.",
 "About, Settings and Software Updates HTML/UI version labels use 10.4.10 with one stable current-version badge; native Windows shell version is separate.",
 "Software Updates presentation: compact blue/violet update header with verified native Check, Restore and existing single Whats New toggle; no fabricated auto-download, install-on-exit or version-history controls.",
 "Hide broken decorative Notification Appearance example card while retaining actual notifications/insights. AI Personalization opens native Gemini API configuration fields rather than a blank pane when native controls are available.",
 "Light/Dark mode contrast and larger typography extend to starting and login screens; actual external web fonts require connectivity unless already installed locally.",
 "HTML-only upgrade; original clinical billing, patient reports, rates, printing, encrypted update verification, backup and authorization handlers were not replaced.",
 "Automated browser tests use isolated synthetic patient data; physical Windows EXE, real patient records, external AI provider/network, and clinical/printing workflows still require acceptance tests. Keep a patient backup."
]
def sha(data):return hashlib.sha256(data).hexdigest()
def unpack(name,expected):
    packed=(ROOT/'m'/name).read_text(encoding='utf8').strip()
    data=zlib.decompress(base64.b64decode(packed,validate=True))
    if sha(data)!=expected:raise RuntimeError('10.4.10 asset SHA mismatch: '+name)
    return data.decode('utf8')
def build():
    original=SOURCE.read_bytes()
    if sha(original)!=OLD_SHA:raise RuntimeError('10.4.9 clinical HTML does not match published checksum; refusing update')
    html=original.decode('utf8')
    keys=['id="app"','id="settings"','id="admin"','id="patients"','id="reception"',
       'id="patientForm"','id="pPhone"','id="pName"','id="pNotes"','id="patientRows"',
       'id="testResults"','id="ml85RecallMR"','id="ml85RecallButton"',
       'id="adc85UpdateCentre"','id="adc85UpdateOffer"','id="adc85UpdateNow"',
       'id="adc85RestoreUpdate"','id="adc85CheckUpdates"','id="adc85NewVersion"',
       'id="adc85UpdateHeading"','id="loginScreen"','id="startupSplash"',
       'id="mlx1049-updates-js"','medilabx10_html_v1']
    missing=[x for x in keys if x not in html]
    if missing:raise RuntimeError('Essential native UI elements missing: '+str(missing))
    if 'id="mlx10410-js"' in html:raise RuntimeError('10.4.10 patch duplicate')
    css=unpack('ux-10.4.10.css.z64',CSS_SHA)
    js=unpack('ux-10.4.10.js.z64',JS_SHA)
    if css.count('{')!=css.count('}'):raise RuntimeError('CSS block balance error')
    for needle in ['function suggestPhone()','function extendReturningSearch()','function updateVersionText()','function updateDesign()','function repairAI()']:
        if needle not in js:raise RuntimeError('Incomplete UI workflow: '+needle)
    for blocked in ['localStorage.clear(', 'indexedDB.deleteDatabase(', 'XMLHttpRequest(', 'fetch(', 'saveDB(', 'fs.writeFileSync(']:
        if blocked in js:raise RuntimeError('Unexpected destructive/network operation in UI patch '+blocked)
    with tempfile.TemporaryDirectory() as temp:
        f=Path(temp)/'ui.js';f.write_text(js,encoding='utf8')
        subprocess.run(['node','--check',str(f)],check=True)
    last=re.search(r'</body>\s*</html>\s*$',html,re.I)
    if not last:raise RuntimeError('Unexpected HTML closing sequence; refusing release')
    injected='\n<style id="mlx10410-css">\n'+css+'\n</style>\n<script id="mlx10410-js">\n'+js+'\n</script>\n'
    result=(html[:last.start()]+injected+html[last.start():]).encode('utf8')
    if result[:last.start()]!=original[:last.start()]:raise RuntimeError('Original application code changed unexpectedly')
    if result.count(b'id="mlx10410-js"')!=1 or result.count(b'id="mlx10410-css"')!=1:
        raise RuntimeError('New patch markers are not unique')
    return result
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--qa',action='store_true')
    ap.add_argument('--qa-output',default='/tmp/MediLabX-10.4.10-QA.html')
    args=ap.parse_args();b=build();checksum=sha(b)
    if args.qa:
        p=Path(args.qa_output);p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
        print('QA MediLab X 10.4.10',checksum,len(b));return
    meta=json.loads(MANIFEST.read_text(encoding='utf8'))
    state=(meta.get('version'),meta.get('htmlUrl'),meta.get('sha256'))
    if state[0]=='10.4.10':
        if TARGET.exists() and TARGET.read_bytes()==b and state[2]==checksum:
            print('Existing 10.4.10 publication verified');return
        raise RuntimeError('Different 10.4.10 published manifest; stop')
    if state!=('10.4.9',OLD_URL,OLD_SHA):
        raise RuntimeError('Published channel was modified. Refusing to overwrite '+str(state))
    if TARGET.exists() and TARGET.read_bytes()!=b:raise RuntimeError('10.4.10 source file conflict')
    TARGET.parent.mkdir(parents=True,exist_ok=True);TARGET.write_bytes(b)
    meta.update(version='10.4.10',htmlUrl=NEW_URL,sha256=checksum,notes=NOTES)
    MANIFEST.write_text(json.dumps(meta,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print('PUBLISHED MediLab X 10.4.10',checksum,len(b))
if __name__=='__main__':main()
