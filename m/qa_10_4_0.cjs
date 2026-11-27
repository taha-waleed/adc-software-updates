#!/usr/bin/env node
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const html=process.argv[2]||'/tmp/MediLabX-10.4.0-QA.html';
const out=process.argv[3]||'/tmp/mlx104-qa';
function check(name,ok,details={}){if(!ok)throw new Error('FAIL '+name+' '+JSON.stringify(details));console.log('PASS '+name)}
const sleep=t=>new Promise(r=>setTimeout(r,t));
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-web-security']});
 let runtime=[];
 try{
  for(const [width,height] of [[1440,900],[1100,800],[990,670]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   page.on('pageerror',err=>runtime.push(err.message));
   await page.goto(pathToFileURL(path.resolve(html)).href,{waitUntil:'domcontentloaded',timeout:45000});
   await sleep(1850);
   const dims=await page.evaluate(()=>{
    const app=document.querySelector('#app');app?.style.setProperty('display','block','important');
    for(const sel of ['#loginScreen','#startupSplash','#adcWelcome'])document.querySelector(sel)?.style.setProperty('display','none','important');
    document.documentElement.classList.remove('ml-splashing');
    document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='settings'));
    const root=document.querySelector('#settings'),frame=document.querySelector('.mlx-mac-layout');
    const get=el=>{const r=el?.getBoundingClientRect();return r?{x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height,scrollHeight:el.scrollHeight,overflow:getComputedStyle(el).overflowY}:null};
    return {ready:document.body.classList.contains('ml104-online'),root:get(root),
     frame:get(frame),left:get(document.querySelector('#adcSettingsList')),right:get(document.querySelector('#adcSettingsViews')),
     shadow:getComputedStyle(document.querySelector('#settings .adc-settings-lead')).backgroundColor,
     hasPatients:!!document.querySelector('#patientForm'),hasReports:!!document.querySelector('#reports'),
     hasUpdate:!!document.querySelector('#adc85CheckUpdates'),
     hasUsers:!!document.querySelector('#userForm')};
   });
   await sleep(130);
   const fitted=await page.evaluate(()=>{
    const get=s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,h:r.height,scrollHeight:e.scrollHeight,display:getComputedStyle(e).display}:null};
    return {page:get('#settings'),frame:get('.mlx-mac-layout'),left:get('#adcSettingsList'),right:get('#adcSettingsViews'),
      emptyVisible:[...document.querySelectorAll('#settings .mlx-pref-empty')].some(x=>getComputedStyle(x).display!=='none'),
      bodyOverflow:document.scrollingElement.scrollHeight>innerHeight+20};
   });
   console.log('VIEWPORT',width,JSON.stringify({dims,fitted}));
   check('10.4 UI patch mounted '+width,dims.ready&&dims.hasPatients&&dims.hasReports&&dims.hasUpdate&&dims.hasUsers);
   check('Persistent left tiles and right panel layout '+width,!!fitted.left&&!!fitted.right&&fitted.left.right<fitted.right.left&&fitted.right.right<=width+18,fitted);
   check('No Settings dashboard and no full-page scrolling '+width,!fitted.emptyVisible&&fitted.page.bottom<=height+18&&fitted.page.scrollHeight<=fitted.page.h+10,fitted);
   if(width===1440){
    await page.screenshot({path:path.join(out,'settings-light.png')});
    for(const key of ['centre','appearance','whatsapp','printlayout','updates','backup','developer']){
     const found=await page.evaluate(k=>{const el=document.querySelector('#adcSettingsList button[data-open-settings="'+k+'"]');if(!el)return false;el.click();return true},key);
     await sleep(140);
     const result=await page.evaluate(k=>({
      visible:[...document.querySelectorAll('#adcSettingsViews .adc-setting-view')].filter(x=>!x.hidden).map(x=>x.dataset.settingView),
      selected:document.querySelector('#adcSettingsList [aria-current="page"]')?.dataset.openSettings,
      leftDisplay:getComputedStyle(document.querySelector('#adcSettingsList')).display,
      rightDisplay:getComputedStyle(document.querySelector('#adcSettingsViews')).display
     }),key);
     check('Settings '+key+' opens solely on right',found&&result.visible.length===1&&result.visible[0]===key&&result.selected===key&&result.leftDisplay==='flex',result);
    }
    await page.evaluate(()=>document.querySelector('#adcSettingsList button[data-open-settings="updates"]').click());
    await sleep(140);
    const update=await page.evaluate(()=>({
     check:!!document.querySelector('#adc85CheckUpdates'),install:!!document.querySelector('#adc85UpdateNow'),restore:!!document.querySelector('#adc85RestoreUpdate'),
     oldNotes:getComputedStyle(document.querySelector('#medilabLocalReleaseNotes')).display,
     status:document.querySelector('#adc85UpdateHeading')?.textContent
    }));
    check('Actual update handlers retained, duplicated notes hidden',update.check&&update.install&&update.restore&&update.oldNotes==='none',update);
    await page.screenshot({path:path.join(out,'software-updates.png')});
    await page.evaluate(()=>document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='admin')));
    await sleep(280);
    const admin=await page.evaluate(()=>{
     const el=document.querySelector('#admin');
     return {user:!!el.querySelector('#userForm'),permissions:!!el.querySelector('#adcPermissionOptions'),
     doctor:!!el.querySelector('#doctorForm'),archive:!!el.querySelector('#deletedPatientRows'),
     pin:!!el.querySelector('#deletePinForm'),nav:!!el.querySelector('#ml10AdminNav')};
    });
    check('Admin forms/accounts/doctor/PIN/archive kept',Object.values(admin).every(Boolean),admin);
    for(const key of ['users','doctors','security']){
     await page.evaluate(k=>document.querySelector('#ml10AdminNav [data-ml10-cat="'+k+'"]')?.click(),key);
     await sleep(140);
     const active=await page.evaluate(()=>document.querySelector('#ml10AdminNav button.active')?.dataset.ml10Cat);
     check('Admin '+key+' tab activates',active===key,{active});
    }
    await page.screenshot({path:path.join(out,'admin-security.png')});
    await page.evaluate(()=>document.body.classList.add('adc-dark-mode'));
    await page.evaluate(()=>document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='settings')));
    await sleep(170);
    const dark=await page.evaluate(()=>{
     const e=document.querySelector('#adcSettingsViews');const t=getComputedStyle(e);
     return {bg:t.backgroundColor,ink:t.color};
    });
    check('Dark settings contrasts',dark.bg!==dark.ink,dark);
    await page.screenshot({path:path.join(out,'settings-dark.png')});
    await page.emulateMedia({media:'print'});
    const print=await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--m104-blue').trim());
    check('UI-only CSS does not affect printing',print==='',{print});
   }
   await page.close();
  }
  const ours=runtime.filter(x=>['ml104','mount(','chosen(','showAdmin(','adminSetup('].some(k=>x.includes(k)));
  check('No new 10.4 script exceptions',ours.length===0,{ours,oldErrors:runtime.slice(0,9)});
  console.log('PASS completed MediLab 10.4 UI regression suite');
 }finally{await browser.close()}
})().catch(err=>{console.error(err.stack||String(err));process.exit(1)});
