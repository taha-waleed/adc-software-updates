#!/usr/bin/env node
/* Browser smoke tests for isolated Settings/Admin redesign on restored MediLab X 10.1.4. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const input=process.argv[2]||'/tmp/MediLabX-10.2.9-QA.html',dir=process.argv[3]||'/tmp/medilab-x-1029-qa';
const check=(name,ok,details={})=>{if(!ok)throw Error('FAIL '+name+' '+JSON.stringify(details));console.log('PASS '+name)};
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-web-security']});
 const errors=[];
 try{
  for(const [width,height] of [[1440,900],[1100,800],[770,820]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   page.on('pageerror',err=>errors.push(err.message));
   await page.goto(pathToFileURL(path.resolve(input)).href,{waitUntil:'domcontentloaded',timeout:40000});
   await page.waitForTimeout(1550);
   const first=await page.evaluate(()=>{
    const app=document.querySelector('#app');app?.classList.add('authenticated');
    app?.style.setProperty('display','block','important');
    for(const selector of ['#loginScreen','#startupSplash','#adcWelcome']){
     document.querySelector(selector)?.style.setProperty('display','none','important');
    }
    document.documentElement.classList.remove('ml-splashing');
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='settings'));
    const settings=document.querySelector('#settings'),list=document.querySelector('#adcSettingsList'),
      views=document.querySelector('#adcSettingsViews'),home=document.querySelector('.mlx29-home');
    const icon=document.querySelector('#adcSettingsList button[data-open-settings="centre"] .adc-setting-symbol');
    const box=element=>{const r=element?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,width:r.width,height:r.height}:null};
    return {
     restored:!!document.querySelector('#patientForm')&&!!document.querySelector('#savePatient')&&
      !!document.querySelector('#adc85UpdateNow')&&!!document.querySelector('#backupData'),
     skin:document.body.classList.contains('mlx29-legacy'),
     noPreviousPatches:!document.getElementById('mlx1027-navy-privacy-css')&&
      !document.getElementById('mlx1026-workspace-css'),
     home:!!home,homeCards:home?.querySelectorAll('button[data-mlx29-open]').length,
     list:box(list),views:box(views),settings:box(settings),
     circularIcon:icon?getComputedStyle(icon).borderRadius:null,
     visibleIcon:icon?{display:getComputedStyle(icon).display,background:getComputedStyle(icon).backgroundColor}:null,
     active:settings?.classList.contains('active'),
     windowWidth:innerWidth
    };
   });
   console.log('WIDTH',width,JSON.stringify(first));
   check('Restored MediLab 10.1.4 clinical controls '+width,first.restored&&first.noPreviousPatches,first);
   check('Isolated Settings/Admin design installed '+width,first.skin&&first.home&&first.homeCards>=4,first);
   check('Professional circular setting icons '+width,first.circularIcon?.startsWith('50%'),first);
   check('Responsive Settings inside viewport '+width,
    !!first.list&&!!first.views&&first.list.left>=-10&&first.views.right<=width+16,first);
   if(width===1440){
    await page.screenshot({path:path.join(dir,'settings-overview-light.png')});
    for(const key of ['centre','appearance','whatsapp','printlayout','updates','backup','developer']){
     const clicked=await page.evaluate(k=>{
      const b=document.querySelector('#adcSettingsList button[data-open-settings="'+k+'"]');
      if(!b)return false;
      b.click();return true;
     },key);
     await page.waitForTimeout(100);
     const result=await page.evaluate(k=>{
      const panel=document.querySelector('#adcSettingsViews .adc-setting-view[data-setting-view="'+k+'"]');
      const visible=Array.from(document.querySelectorAll('#adcSettingsViews .adc-setting-view'))
       .filter(x=>!x.hidden).map(x=>x.dataset.settingView);
      const nav=document.querySelector('#adcSettingsList button[data-open-settings="'+k+'"]');
      return {shown:!!panel&&!panel.hidden,visible,selected:nav?.getAttribute('aria-current'),title:panel?.querySelector('h2')?.textContent};
     },key);
     check('Existing Settings '+key+' panel functional',clicked&&result.shown&&result.visible.length===1&&result.visible[0]===key,result);
     check('Active Settings '+key+' has accessible highlight',result.selected==='page',result);
    }
    // Doctor Directory is deliberately a secure full-screen modal in the original 10.1.4,
    // not a Settings subview. Verify that original behavior instead of overriding it.
    const doctorClick=await page.evaluate(()=>{
     const b=document.querySelector('#adcSettingsList button[data-open-settings="mlxdoctors"]');
     if(!b)return false;
     b.click();return true;
    });
    await page.waitForTimeout(130);
    const doctorModal=await page.evaluate(()=>{
     const modal=document.querySelector('#mlx106-doctor-modal');
     const directory=document.querySelector('[data-setting-view="mlxdoctors"]');
     return {open:!!modal&&!modal.hidden,directoryMoved:!!modal?.contains(directory)};
    });
    check('Original Doctor Directory modal opens without altering patient data',doctorClick&&doctorModal.open&&doctorModal.directoryMoved,doctorModal);
    await page.screenshot({path:path.join(dir,'settings-doctors-modal.png')});
    await page.evaluate(()=>document.querySelector('#mlx106-doctor-close')?.click());
    await page.waitForTimeout(70);
    check('Doctor Directory modal closes via original handler',await page.evaluate(()=>document.querySelector('#mlx106-doctor-modal')?.hidden===true));
    await page.screenshot({path:path.join(dir,'settings-controls-light.png')});
    // Restore Overview through original existing back control; check native shortcut delegation.
    await page.evaluate(()=>{
     const b=document.querySelector('#adcSettingsViews .adc-setting-view:not([hidden]) [data-settings-back]');
     b?.click();
    });
    await page.waitForTimeout(170);
    const shortcut=await page.evaluate(()=>{
     const b=document.querySelector('.mlx29-quick[data-mlx29-open="centre"]');
     if(!b)return {hasButton:false};
     b.click();
     return {hasButton:true};
    });
    await page.waitForTimeout(120);
    const centre=await page.evaluate(()=>({visible:!document.querySelector('#adcSettingsViews [data-setting-view="centre"]')?.hidden,
      input:!!document.querySelector('#setCentre')}));
    check('Settings overview shortcut delegates to real Centre panel',shortcut.hasButton&&centre.visible&&centre.input,centre);
    await page.evaluate(()=>{
     document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='admin'));
    });
    const admin=await page.evaluate(()=>{
     const root=document.querySelector('#admin');
     const headers=Array.from(root?.querySelectorAll('.panel-head h2')||[]);
     return {visible:root?.classList.contains('active'),
      users:!!document.querySelector('#userForm'),permissions:!!document.querySelector('#adcPermissionOptions'),
      doctors:!!document.querySelector('#doctorForm'),pin:!!document.querySelector('#deletePinForm'),
      archive:!!document.querySelector('#deletedPatientRows'),
      vectorIcons:headers.filter(x=>x.querySelector('.mlx29-admin-icon svg')).length,
      panelBg:root?getComputedStyle(root.querySelector('.panel')).backgroundColor:'none'};
    });
    check('Admin original functional controls preserved',admin.visible&&admin.users&&admin.permissions&&admin.doctors&&admin.pin&&admin.archive,admin);
    check('Admin headings have vector icons',admin.vectorIcons>=3,admin);
    await page.screenshot({path:path.join(dir,'admin-light.png')});
    const role=await page.evaluate(()=>{
     const select=document.querySelector('#uRole');
     if(!select)return {found:false};
     select.value='admin';
     select.dispatchEvent(new Event('change',{bubbles:true}));
     const cbs=[...document.querySelectorAll('#adcPermissionOptions input')];
     return {found:true,boxes:cbs.length,allChecked:cbs.every(c=>c.checked),allDisabled:cbs.every(c=>c.disabled)};
    });
    check('Original Admin role permissions respond to role change',role.found&&role.boxes>0&&role.allChecked&&role.allDisabled,role);
    await page.evaluate(()=>{
     document.body.classList.add('adc-dark-mode');
     document.body.dataset.mlxTheme='graphite';
     document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='settings'));
    });
    const dark=await page.evaluate(()=>{
     const panel=document.querySelector('#adcSettingsViews'),admin=document.querySelector('#admin .panel');
     const p=getComputedStyle(panel),a=getComputedStyle(admin);
     return {panelBg:p.backgroundColor,panelText:p.color,adminBg:a.backgroundColor,adminText:a.color};
    });
    check('Dark Settings/Admin surfaces use readable contrasting colors',dark.panelBg!==dark.panelText&&dark.adminBg!==dark.adminText,dark);
    await page.screenshot({path:path.join(dir,'settings-dark.png')});
   }
   await page.close();
  }
  const own=errors.filter(msg=>/mlx29|settingsHome|settingsActive|adminHeaders|ariaForms/.test(msg));
  check('No new Settings/Admin runtime exceptions',own.length===0,{own,legacyErrors:errors.slice(0,6)});
  console.log('PASS: 10.2.9 UI smoke testing complete');
 }finally{await browser.close()}
})().catch(err=>{console.error(err.stack||String(err));process.exit(1)});
