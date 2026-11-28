'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(process.argv[2]||'/tmp/MediLabX-10.4.10-QA.html','utf8');
const dest=process.argv[3]||'/tmp/medilabx-10410-qa';fs.mkdirSync(dest,{recursive:true});
function check(label,predicate,context){if(!predicate)throw Error('FAIL '+label+': '+JSON.stringify(context));console.log('PASS',label)}
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const errors=[];
 try{
  for(const [width,height] of [[1600,900],[1100,800],[990,670]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   page.on('pageerror',e=>errors.push(String(e.message)));
   await page.setContent(html,{waitUntil:'domcontentloaded',timeout:55000});await page.waitForTimeout(1400);
   await page.evaluate(()=>{
    document.documentElement.classList.remove('ml-splashing');
    const app=document.querySelector('#app');if(app)app.style.setProperty('display','block','important');
    for(const id of ['#loginScreen','#startupSplash','#adcWelcome'])document.querySelector(id)?.style.setProperty('display','none','important');
    document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='reception'));
   });
   await page.waitForTimeout(200);
   const state=await page.evaluate(()=>{
    const e=id=>document.getElementById(id);
    const nav=document.querySelector('#nav button[data-page="settings"]'),style=nav&&getComputedStyle(nav);
    return {loaded:document.body.classList.contains('mlx1050'),theme:getComputedStyle(document.body).fontFamily,
      navRadius:style?.borderRadius,navFont:document.querySelector('#nav button .adc-nav-label')&&getComputedStyle(document.querySelector('#nav button .adc-nav-label')).fontSize,
      notes:e('pNotes')&&getComputedStyle(e('pNotes')).display,phoneBox:!!e('mlx1050PhoneMatches'),recall:e('ml85RecallMR')?.placeholder,
      about:document.querySelector('#about .mlx-version')?.textContent,updater:e('adc85UpdateHeading')?.textContent,
      originalControls:['patientForm','patientRows','testResults','adc85UpdateNow','adc85RestoreUpdate','adc85CheckUpdates','adc85UpdateOffer'].every(x=>!!e(x)),
      splash:document.querySelector('#startupSplash .splash-title')?getComputedStyle(document.querySelector('#startupSplash .splash-title')).fontFamily:null,
      login:document.querySelector('#loginScreen input')?getComputedStyle(document.querySelector('#loginScreen input')).fontSize:null};
   });
   console.log('VIEW',width,JSON.stringify(state));
   check('Original clinical/updater controls retained '+width,state.loaded&&state.originalControls,state);
   check('Readability, capsule and startup font '+width,state.navFont==='14px'&&state.navRadius==='13px'&&(state.login===null||parseFloat(state.login)>=15)&&(state.splash===null||state.splash.includes('Manrope')),state);
   check('Notes removed and compact returning-patient lookup '+width,state.notes==='none'&&state.phoneBox&&/phone/i.test(state.recall),state);
   check('Consistent UI version '+width,/(10\.4\.10)/.test(state.about||'')&&/(10\.4\.10)/.test(state.updater||''),state);
   if(width===1600){
    await page.evaluate(()=>{
     const patients=[
      {name:'Synthetic Alex',phone:'0312-2223333',age:25,gender:'Male',mr:'0007',receipt:'TEST-1',date:'2026-11-20',tests:[{name:'Ultrasound',price:1200}]},
      {name:'Synthetic Sam',phone:'+92 312 2223333',age:35,gender:'Female',mr:'0008',receipt:'TEST-2',date:'2026-11-22',tests:[{name:'X-ray',price:800}]}
     ];
     if(typeof db!=='undefined')db.patients=patients;else window.db={patients};
    });
    await page.locator('#pPhone').fill('03122223333');await page.waitForTimeout(90);
    const n=await page.locator('#mlx1050PhoneMatches .mlx1050-match-row').count();
    const blank=await page.locator('#pName').inputValue();
    check('Family phone matches 2 patients without forced autofill',n===2&&blank==='',{matches:n,name:blank});
    await page.locator('#mlx1050PhoneMatches .mlx1050-match-row button').first().click();
    const chosen=await page.locator('#pName').inputValue();
    const tests=await page.locator('#selectedTests').innerText();
    check('Optional Use details fills chosen demographics only',chosen.startsWith('Synthetic')&&!tests.includes('Ultrasound')&&!tests.includes('X-ray'),{chosen,tests});
    await page.locator('#ml85RecallMR').fill('03122223333');
    await page.locator('#ml85RecallButton').click();await page.waitForTimeout(75);
    check('Returning-patient phone search yields family choices',await page.locator('#ml85RecallResults button').count()===2);
    await page.screenshot({path:path.join(dest,'reception-compact.png')});
    await page.evaluate(()=>document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='patients')));
    await page.waitForTimeout(120);
    const patient=await page.evaluate(()=>{
     const b=document.getElementById('ml10ContactExport');const c=document.querySelector('#patients .medilab-filter-position');
     const row=document.querySelector('#patients .panel-head>.row');
     const r=b?.getBoundingClientRect(),cbox=c?.getBoundingClientRect();
     return {contact:!!b,text:b?.textContent,withinFilters:!!c?.contains(b),width:r?.width,wrap:row&&getComputedStyle(row).flexWrap,
      inputContrast:getComputedStyle(document.getElementById('patientSearch')).color,filter:cbox?.right};
    });
    check('No VCF/filter overlap: compact control resides inside filter toolbar',patient.contact&&patient.withinFilters&&patient.width<230&&patient.wrap==='wrap',patient);
    await page.screenshot({path:path.join(dest,'patients-responsive.png')});
    await page.evaluate(()=>document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='settings')));
    await page.waitForTimeout(130);
    await page.locator('#settings .px-tabs button[data-px-key="updates"]').click({force:true});await page.waitForTimeout(160);
    const updates=await page.evaluate(()=>({hero:!!document.querySelector('.mlx1050-updates-header'),stats:document.querySelectorAll('.mlx1050-updates-cards .mlx1050-stat').length,
      original:!!document.getElementById('adc85UpdateNow')&&!!document.getElementById('adc85RestoreUpdate'),notes:document.querySelectorAll('#mlx1049WhatsNew').length,
      badges:[...document.querySelectorAll('#settings #mlx1050VersionBadge')].map(x=>x.textContent)}));
    check('Professional Software Updates and one Whats New, original updater kept',updates.hero&&updates.stats===3&&updates.original&&updates.notes===1&&updates.badges.join('').includes('10.4.10'),updates);
    await page.screenshot({path:path.join(dest,'updates-light.png')});
    await page.evaluate(()=>document.body.classList.add('adc-dark-mode'));await page.waitForTimeout(150);
    await page.screenshot({path:path.join(dest,'updates-dark.png')});
    const dark=await page.evaluate(()=>{const r=document.getElementById('patientSearch'),c=getComputedStyle(r);const e=document.querySelector('.mlx1050-updates-header h3');const h=getComputedStyle(e);return {inputColor:c.color,inputBg:c.backgroundColor,heroText:h.color}});
    check('Dark theme input and gradient heading readable',dark.inputColor!==dark.inputBg&&dark.heroText==='rgb(255, 255, 255)',dark);
    await page.emulateMedia({media:'print'});
    const print=await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--mlx10-navy').trim());
    check('Screen styling isolated from printing',print==='',{print});
   }
   await page.close();
  }
  const introduced=errors.filter(s=>/mlx1050|suggestPhone|extendReturningSearch|updateVersionText|tabsFallback|removeNotificationDemo/.test(s));
  check('No new patch JavaScript runtime exceptions',introduced.length===0,introduced);
  console.log('PASS MediLab X 10.4.10 production-source UI/phone-suggestions browser QA');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack||String(e));process.exit(1)});