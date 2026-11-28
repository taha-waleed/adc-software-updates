#!/usr/bin/env node
/* Production-source Chromium regression with synthetic updater bridge only. */
'use strict';
const fs=require('node:fs'),{chromium}=require('playwright');
const html=fs.readFileSync(process.argv[2]||'/tmp/MediLabX-10.4.11-QA.html','utf8');
const check=(name,value,info)=>{if(!value)throw Error('FAIL '+name+': '+JSON.stringify(info));console.log('PASS '+name)};
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[1600,940],[1100,800],[990,670]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.setContent(html,{waitUntil:'domcontentloaded',timeout:55000});
   await page.waitForTimeout(1100);
   await page.evaluate(()=>{
    window.__nativeCalls=0;window.__nativeComplete=null;
    window.adcDesktop={installOnline(){window.__nativeCalls++;return new Promise(done=>{window.__nativeComplete=done})}};
    const e=document.getElementById('adc85UpdateOffer');e.hidden=false;
    document.querySelector('#adc85UpdateOverlay').hidden=true;
   });
   await page.waitForTimeout(140);
   const state=await page.evaluate(()=>{
    const p=id=>document.getElementById(id);
    const row=p('adc85UpdateOffer').querySelector(':scope > .adc85-update-actions');
    const e=p('adc85UpdateCentre');
    return {
     patched:document.body.classList.contains('mlx10411-ready'),
     offer:!p('adc85UpdateOffer').hidden,hasOffer:e.classList.contains('mlx10411-has-offer'),
     controls:['adc85UpdateNow','adc85RemindLater','adc85RestoreUpdate','adc85CheckUpdates','adc85ManualUpdate','adc85ModalPrimary'].every(id=>!!p(id)),
     sameRow:row.contains(p('adc85UpdateNow'))&&row.contains(p('adc85RemindLater'))&&row.contains(p('adc85RestoreUpdate')),
     checkHidden:getComputedStyle(p('adc85CheckUpdates')).display==='none',
     legacyOverlayHidden:p('adc85UpdateOverlay').hidden,
     versionStyle:p('mlx1050VersionBadge')?getComputedStyle(p('mlx1050VersionBadge'),'::after').content:'',
     originalPatient:!!p('patientRows')&&!!p('patientForm')
    };
   });
   console.log('VIEW',width,JSON.stringify(state));
   check('Original medical/update controls retained '+width,state.controls&&state.originalPatient,state);
   check('One responsive Update/Remind/Restore row '+width,state.patched&&state.offer&&state.sameRow&&state.hasOffer,state);
   check('No duplicate Check while update is offered '+width,state.checkHidden&&state.legacyOverlayHidden,state);
   if(state.versionStyle)check('Version badge updated to 10.4.11 '+width,state.versionStyle.includes('10.4.11'),state);
   await page.evaluate(()=>document.getElementById('adc85UpdateNow').click());
   await page.waitForTimeout(80);
   const during=await page.evaluate(()=>({calls:window.__nativeCalls,pending:document.body.classList.contains('mlx10411-native-confirm'),overlayHidden:document.getElementById('adc85UpdateOverlay').hidden,disabled:document.getElementById('adc85UpdateNow').disabled}));
   check('Exactly one native updater invocation without HTML popup '+width,during.calls===1&&during.pending&&during.overlayHidden&&during.disabled,during);
   await page.evaluate(()=>{
    const modal=document.getElementById('adc85UpdateOverlay');modal.hidden=false;modal.dataset.kind='available';
    document.getElementById('adc85ModalPrimary').click();
   });
   await page.waitForTimeout(60);
   check('Duplicate clicks do not launch second installer '+width,await page.evaluate(()=>window.__nativeCalls===1));
   await page.evaluate(()=>window.__nativeComplete({ok:false,cancelled:true}));
   await page.waitForTimeout(70);
   const after=await page.evaluate(()=>({calls:window.__nativeCalls,pending:document.body.classList.contains('mlx10411-native-confirm'),hidden:document.getElementById('adc85UpdateOverlay').hidden,disabled:document.getElementById('adc85UpdateNow').disabled,status:document.getElementById('adc85UpdateMessage').textContent}));
   check('Cancellation leaves no modal or disabled controls '+width,after.calls===1&&!after.pending&&after.hidden&&!after.disabled&&/cancelled/i.test(after.status),after);
   await page.evaluate(()=>document.getElementById('adc85UpdateOffer').hidden=true);
   await page.waitForTimeout(140);
   const restored=await page.evaluate(()=>{
    const button=document.getElementById('adc85RestoreUpdate');
    return {visible:!button.hidden,parent:button.parentElement.className,
       next:!document.getElementById('adc85UpdateCentre').classList.contains('mlx10411-has-offer')};
   });
   check('Restore previous remains outside hidden available-update panel '+width,restored.visible&&restored.next&&restored.parent==='adc85-update-actions',restored);
   if(width===1600){
    await page.evaluate(()=>document.body.classList.add('adc-dark-mode'));
    const styles=await page.evaluate(()=>{
     const b=document.getElementById('adc85RestoreUpdate');const s=getComputedStyle(b);
     return {color:s.color,background:s.backgroundColor};
    });
    check('Dark mode update action has defined text/background',!!styles.color&&!!styles.background,styles);
    await page.emulateMedia({media:'print'});
    check('App print templates remain in original HTML',html.includes('id="reportHeading"')||html.includes('reportHeading'));
   }
   const newErrors=errors.filter(s=>/mlx10411|captureNativeInstall|applyButtons/.test(s));
   check('No 10.4.11 patch JavaScript exception '+width,newErrors.length===0,newErrors);
   await page.close();
  }
  console.log('PASS MediLab X 10.4.11 production-source browser QA: single native confirmation, cancel safety, controls and responsiveness');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack||String(e));process.exit(1)});