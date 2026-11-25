#!/usr/bin/env node
/* Non-destructive GUI smoke checks for the archived MediLab X 10.1.4 rollback. */
const {chromium}=require('playwright');
const {pathToFileURL}=require('url');
const fs=require('fs'),path=require('path');
const filename=process.argv[2]||'/tmp/MediLabX-10.1.4-restore-QA.html';
const dir=process.argv[3]||'/tmp/mlx-restore-qa';
const check=(name,ok,detail)=>{if(!ok)throw Error('FAIL '+name+': '+JSON.stringify(detail||{}));console.log('PASS '+name);};
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-web-security']});
 try {
  for(const [w,h] of [[1440,900],[1100,800],[770,820]]) {
   const page=await browser.newPage({viewport:{width:w,height:h}});
   await page.goto(pathToFileURL(path.resolve(filename)).href,{waitUntil:'domcontentloaded',timeout:40000});
   await page.waitForTimeout(1100);
   const state=await page.evaluate(()=>{
    document.documentElement.classList.remove('ml-splashing');
    const app=document.querySelector('#app');
    app?.classList.add('authenticated');
    app?.style.setProperty('display','block','important');
    document.querySelectorAll('.page').forEach(node=>node.classList.toggle('active',node.id==='settings'));
    for(const sel of ['#startupSplash','#loginScreen','#adcWelcome'])document.querySelector(sel)?.style.setProperty('display','none','important');
    const get=id=>!!document.getElementById(id);
    return {app:get('app'),nav:get('nav'),settings:get('settings'),admin:get('admin'),reception:get('reception'),
     patients:get('patients'),reports:get('reports'),backup:get('backupData'),restore:get('restoreData'),
     checkUpdate:get('adc85CheckUpdates'),installUpdate:get('adc85UpdateNow'),
     themePatch10_2:!!document.getElementById('mlx1027-navy-privacy-css')||!!document.getElementById('mlx1026-workspace-css')||!!document.getElementById('mlx1023-reference-theme')};
   });
   check('10.1.4 restored original screens '+w,state.app&&state.nav&&state.settings&&state.admin&&state.reception&&state.patients&&state.reports,state);
   check('Original update/backup controls '+w,state.backup&&state.restore&&state.checkUpdate&&state.installUpdate,state);
   check('No later 10.2.x UI theme patches '+w,!state.themePatch10_2,state);
   if(w===1440){
    await page.screenshot({path:path.join(dir,'restore-settings-initial.png')});
    const clicked=await page.evaluate(()=>{
     const btn=document.querySelector('#adcSettingsList button[data-open-settings="centre"]');
     if(!btn)return {exists:false};
     btn.click();
     return {exists:true};
    });
    await page.waitForTimeout(200);
    const view=await page.evaluate(()=>({
     active:!document.querySelector('#adcSettingsViews .adc-setting-view[data-setting-view="centre"]')?.hidden,
     centreName:!!document.querySelector('#setCentre'),
     update:!!document.querySelector('#adc85UpdateNow'),
     lock:!!document.querySelector('#mlx101StandbyLock')
    }));
    check('Original Centre & Receipts Settings panel works',clicked.exists&&view.active&&view.centreName,view);
    check('Original update/install handlers still mounted',view.update);
    await page.screenshot({path:path.join(dir,'restore-settings-centre.png')});
    await page.evaluate(()=>{document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id==='admin'));});
    await page.screenshot({path:path.join(dir,'restore-admin.png')});
   }
   await page.close();
  }
  console.log('PASS: archived 10.1.4 GUI checks completed');
 } finally {await browser.close()}
})().catch(err=>{console.error(err.stack||String(err));process.exit(1)});
