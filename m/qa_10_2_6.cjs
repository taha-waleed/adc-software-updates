#!/usr/bin/env node
/* Automated browser QA for 10.2.6 — non-destructive visual/interaction smoke checks. */
const {chromium}=require('playwright');
const fs=require('fs');
const {pathToFileURL}=require('url');
const path=require('path');
const source=process.argv[2]||'/tmp/MediLabX-10.2.6-QA.html';
const out=process.argv[3]||'/tmp/medilab-x-qa';
const check=(name,condition,data)=>{if(!condition)throw Error('FAIL '+name+' '+JSON.stringify(data??{}));console.log('PASS',name)};
const mkdir=()=>fs.mkdirSync(out,{recursive:true});
(async()=>{
 mkdir();const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-web-security']});
 let errors=[];
 try{
  for(const [width,height] of [[1440,900],[1100,800],[770,820]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.resolve(source)).href,{waitUntil:'domcontentloaded',timeout:40000});
   await page.waitForTimeout(1600);
   const result=await page.evaluate(()=>{
    const app=document.querySelector('#app'),settings=document.querySelector('#settings'),admin=document.querySelector('#admin');
    if(app)app.style.setProperty('display','block','important');
    const hide=q=>document.querySelector(q)?.style.setProperty('display','none','important');
    hide('#loginScreen');hide('#startupSplash');
    document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id==='settings'));
    settings?.removeAttribute('hidden');
    document.body.classList.add('mlx101-ui','mlx202-release');
    const root=document.querySelector('#settings .mlx-pref-empty');
    const icon=document.querySelector('#adcSettingsList .adc-setting-symbol');
    const svg=icon?.querySelector('svg');
    const br=icon?getComputedStyle(icon).borderRadius:'';
    const hero=document.querySelector('#mlxrUpdateHero');
    const dupes=['#mlx1022GithubHead','.mlx-release-intro','#adc85UpdateCentre'].map(k=>{
     const el=document.querySelector('#settings .adc-setting-view[data-setting-view="updates"] '+k);
     return {selector:k,exists:!!el,display:el?getComputedStyle(el).display:null};
    });
    const w=window.innerWidth;
    const list=document.querySelector('#adcSettingsList')?.getBoundingClientRect();
    const views=document.querySelector('#adcSettingsViews')?.getBoundingClientRect();
    const cards=root?.querySelectorAll('button[data-mlx26-open]').length;
    return {hasApp:!!app,hasSettings:!!settings,hasAdmin:!!admin,skin:document.body.classList.contains('mlx1026-polish'),
      hasWelcome:!!root?.querySelector('.mlx26-welcome'),cards,hasSVG:!!svg,iconRadius:br,
      hasHero:!!hero,dupes,w,list:list?{left:list.left,right:list.right,width:list.width}:null,
      views:views?{left:views.left,right:views.right,width:views.width}:null};
   });
   console.log('UI',width,JSON.stringify(result));
   check('application DOM '+width,result.hasApp&&result.hasSettings&&result.hasAdmin);
   check('new 10.2.6 skin '+width,result.skin);
   check('Settings welcome with live shortcuts '+width,result.hasWelcome&&result.cards>=3);
   check('vector icons with circular backgrounds '+width,result.hasSVG&&result.iconRadius.includes('50%'));
   check('existing single-update banner '+width,result.hasHero);
   check('Settings panels within viewport '+width,!!result.list&&!!result.views&&result.views.right<=width+15&&result.list.left>=-6);
   if(width===1440){
    await page.screenshot({path:path.join(out,'settings-light.png'),fullPage:false});
    const category=await page.evaluate(()=>{
     const el=document.querySelector('#adcSettingsList button[data-open-settings="appearance"]');
     if(!el)return {found:false};
     el.click();
     const view=document.querySelector('#settings .adc-setting-view[data-setting-view="appearance"]');
     return {found:true,viewVisible:!!view&&!view.hidden,originalAppearance:!!document.querySelector('#mlxrControls')};
    });
    console.log('appearance category',category);
    check('existing Appearance navigation',category.found&&category.viewVisible&&category.originalAppearance);
    await page.screenshot({path:path.join(out,'settings-appearance-light.png'),fullPage:false});
    const admin=await page.evaluate(()=>{
     document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id==='admin'));
     const userForm=document.querySelector('#userForm'),perm=document.querySelector('#adcPermissionOptions');
     return {exists:!!userForm,permissionContainer:!!perm,deletePin:!!document.querySelector('#deletePinForm'),deleted:!!document.querySelector('#deletedPatientRows')};
    });
    check('Admin user, permissions, deletion and archive remain',admin.exists&&admin.permissionContainer&&admin.deletePin&&admin.deleted);
    await page.screenshot({path:path.join(out,'admin-light.png'),fullPage:false});
    const dark=await page.evaluate(()=>{
     document.body.dataset.mlxrMode='dark';
     const dialog=document.querySelector('#adc85UpdateOverlay');
     if(dialog)dialog.hidden=false;
     const modal=document.querySelector('.adc85-modal');
     const styles=modal?getComputedStyle(modal):null;
     return {modalPresent:!!modal,modalBg:styles?.backgroundColor,modalText:styles?.color};
    });
    check('update dialog has dark styling',dark.modalPresent&&dark.modalBg!=='rgba(0, 0, 0, 0)'&&dark.modalText!==dark.modalBg,dark);
    await page.screenshot({path:path.join(out,'admin-dark-modal.png'),fullPage:false});
   }
   await page.close();
  }
  // Older scripts may emit errors unrelated to this additive UI; isolate plugin failures.
  const ours=errors.filter(x=>/mlx1026|mountWelcome|mountIcons|mlx26-welcome/.test(x));
  check('no new 10.2.6 script errors',ours.length===0,{ours,otherErrors:errors.slice(0,12)});
  console.log('PASS: browser QA complete; screenshots',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(String(e.stack||e));process.exit(1)});
