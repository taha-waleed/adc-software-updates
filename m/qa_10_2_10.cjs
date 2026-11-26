#!/usr/bin/env node
/* Non-destructive Chromium acceptance checks for the attached X11 theme integrated into X10.2.
 * In particular, NO clinical save, delete, print submission, install or backup button is clicked.
 */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs'),{pathToFileURL}=require('url');
const file=process.argv[2]||'/tmp/MediLabX-10.2.10-QA.html';
const dir=process.argv[3]||'/tmp/medilab-x-10-2-10-qa';
const assert=(name,pass,details={})=>{if(!pass)throw Error('FAIL '+name+' '+JSON.stringify(details));console.log('PASS '+name);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-web-security']});
 const errors=[];
 try{
  for(const [width,height] of [[1440,900],[1100,800],[770,820]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.resolve(file)).href,{waitUntil:'domcontentloaded',timeout:50000});
   await page.evaluate(()=>{
    const app=document.querySelector('#app');
    app?.style.setProperty('display','block','important');
    document.documentElement.classList.remove('ml-splashing');
    for(const s of ['#loginScreen','#startupSplash','#adcWelcome'])document.querySelector(s)?.style.setProperty('display','none','important');
    document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='dashboard'));
   });
   await sleep(1700);
   const init=await page.evaluate(()=>{
    const d=document.body,app=document.querySelector('#app'),bar=document.querySelector('#adc85Titlebar'),
      sidebar=document.querySelector('#app .sidebar'),cards=document.querySelectorAll('#dashboard .panel');
    const s=getComputedStyle(d),b=bar?getComputedStyle(bar):null,nav=sidebar?getComputedStyle(sidebar):null;
    return {theme:d.dataset.mlxTheme,installed:d.classList.contains('mlx11-ui'),
     bg:s.getPropertyValue('--v-bg').trim(),accent:s.getPropertyValue('--v-accent').trim(),
     side:s.getPropertyValue('--v-side-a').trim(),navBg:nav?.backgroundImage,
     taskbarBg:b?.backgroundColor,mainBg:app?getComputedStyle(app).backgroundColor:'',
     controls:['#patientForm','#savePatient','#reportPatient','#userForm','#adc85CheckUpdates',
       '#adc85UpdateNow','#backupData','#restoreData','#patientFilterDate',
       '#adcPermissionOptions'].map(k=>[k,!!document.querySelector(k)]),
     cardCount:cards.length,themeEngine:typeof window.MediLabXTheme?.set==='function',
     availablePickers:{sidebar:!!document.querySelector('#mlx-theme-picker'),appearance:document.querySelectorAll('#settings [data-mlx-set-theme]').length}};
   });
   console.log('WINDOW',width,JSON.stringify(init));
   assert('new unified V11 skin active at '+width,init.installed&&!!init.bg&&!!init.accent,init);
   assert('all critical clinical/role/update controls exist '+width,init.controls.every(([_,yes])=>yes)&&init.themeEngine,init);
   assert('titlebar/sidebar theme navy '+width,init.navBg?.includes('gradient')&&init.taskbarBg?.startsWith('rgb('),init);
   const fit=await page.evaluate(()=>{
    const r=document.querySelector('#app .main')?.getBoundingClientRect();
    return {right:r?.right,left:r?.left,win:innerWidth}
   });
   assert('Main app fits screen without overflow '+width,fit.right<=width+18&&fit.left>=-10,fit);
   if(width===1440){
    await page.screenshot({path:path.join(dir,'dashboard-aurora.png')});
    const scheme={
     aurora:['#4f6bed','#f3f5fb','#111a3d'],
     ocean:['#0e8fb5','#f1f7fb','#072a40'],
     emerald:['#109670','#f1f8f5','#0a2f2b'],
     orchid:['#8a4fe0','#f7f4fd','#25134a'],
     sunset:['#e2674f','#fdf6f2','#301c33'],
     graphite:['#7fb0ff','#0a1120','#070c17'],
     midnight:['#a5a6ff','#0c0b1f','#08071a']
    };
    for(const [name,expected] of Object.entries(scheme)){
     const item=await page.evaluate(name=>{
      window.MediLabXTheme?.set(name);
      const s=getComputedStyle(document.body);
      return {theme:document.body.dataset.mlxTheme,
       accent:s.getPropertyValue('--v-accent').trim(),bg:s.getPropertyValue('--v-bg').trim(),
       side:s.getPropertyValue('--v-side-a').trim(),
       card:getComputedStyle(document.querySelector('#app .panel')).backgroundColor,
       text:getComputedStyle(document.querySelector('#app .panel')).color};
     },name);
     assert('Original theme picker supplies '+name,item.theme===name,item);
     assert('Exact uploaded V11 palette '+name,item.accent===expected[0]&&item.bg===expected[1]&&item.side===expected[2],item);
     assert('Readable '+name+' card text',item.card!==item.text,item);
     await sleep(95);
     const persistence=await page.evaluate(()=>document.body.dataset.mlxTheme);
     assert('Theme '+name+' persists after legacy UI observers',persistence===name,{expected:name,actual:persistence});
     if(name==='graphite')await page.screenshot({path:path.join(dir,'dashboard-graphite.png')});
    }
    await page.evaluate(()=>{
     window.MediLabXTheme.set('aurora');
     document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='settings'));
    });
    await sleep(150);
    const home=await page.evaluate(()=>({
      nav:!!document.querySelector('#adcSettingsList'),
      views:!!document.querySelector('#adcSettingsViews'),
      cards:document.querySelectorAll('.mlx29-quick[data-mlx29-open]').length,
      icon:document.querySelector('#adcSettingsList button[data-open-settings="centre"] .adc-setting-symbol svg')?.tagName
    }));
    assert('Original Settings with live shortcuts and SVG icons',home.nav&&home.views&&home.cards===4&&home.icon?.toLowerCase()==='svg',home);
    const appearanceOptions=await page.evaluate(()=>document.querySelectorAll('#settings [data-mlx-set-theme]').length);
    assert('Seven real Appearance theme cards are accessible',appearanceOptions===7,{appearanceOptions});
    await page.evaluate(()=>document.querySelector('#adcSettingsList button[data-open-settings="appearance"]').click());
    await sleep(120);
    const clicked=await page.evaluate(()=>{
      const button=document.querySelector('#settings [data-mlx-set-theme="ocean"]');
      button?.click();
      return !!button;
    });
    await sleep(160);
    const clickedTheme=await page.evaluate(()=>document.body.dataset.mlxTheme);
    assert('Appearance theme card really updates persistent UI',clicked&&clickedTheme==='ocean',{clicked,clickedTheme});
    await page.evaluate(()=>window.MediLabXTheme.set('aurora'));
    await sleep(110);
    await page.screenshot({path:path.join(dir,'settings-aurora.png')});
    for(const tab of ['centre','appearance','whatsapp','printlayout','updates','backup','developer']){
     await page.evaluate(tab=>document.querySelector('#adcSettingsList button[data-open-settings="'+tab+'"]')?.click(),tab);
     await sleep(75);
     const result=await page.evaluate(tab=>{
      const panels=[...document.querySelectorAll('#adcSettingsViews .adc-setting-view')].filter(x=>!x.hidden);
      const nav=document.querySelector('#adcSettingsList button[data-open-settings="'+tab+'"]');
      return {shown:panels.map(x=>x.dataset.settingView),active:nav?.getAttribute('aria-current')};
     },tab);
     assert('Original Settings '+tab+' panel opens',result.shown.length===1&&result.shown[0]===tab&&result.active==='page',result);
    }
    await page.screenshot({path:path.join(dir,'settings-updates.png')});
    await page.evaluate(()=>{
     window.MediLabXTheme.set('graphite');
     document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='admin'));
    });
    await sleep(140);
    const admin=await page.evaluate(()=>{
     const root=document.querySelector('#admin');
     const cards=[...root.querySelectorAll('.panel')];
     return {users:!!root.querySelector('#userForm'),
      roles:!!root.querySelector('#uRole'),permissions:!!root.querySelector('#adcPermissionOptions'),
      doctorsModal:!!document.querySelector('#mlx106-doctor-modal'),deletion:!!root.querySelector('#deletePinForm'),
      archived:!!root.querySelector('#deletedPatientRows'),cards:cards.length,
      bg:cards.length?getComputedStyle(cards[0]).backgroundColor:'',
      text:cards.length?getComputedStyle(cards[0]).color:''};
    });
    assert('Admin user/role/doctor/PIN/deleted archive controls preserved',admin.users&&admin.roles&&admin.permissions&&admin.deletion&&admin.archived,admin);
    assert('Admin Graphite dark contrast',admin.bg!==admin.text,admin);
    const doctorClick=await page.evaluate(()=>{
      const b=document.querySelector('#adcSettingsList button[data-open-settings="mlxdoctors"]');
      if(!b)return false;b.click();return true;
    });
    await sleep(120);
    const doctorState=await page.evaluate(()=>{
      const modal=document.querySelector('#mlx106-doctor-modal');
      const directory=modal?.querySelector('[data-setting-view="mlxdoctors"]');
      return {open:!!modal&&!modal.hidden,directory:!!directory};
    });
    assert('Original Doctor Directory opens its native modal',doctorClick&&doctorState.open&&doctorState.directory,doctorState);
    await page.evaluate(()=>document.querySelector('#mlx106-doctor-close')?.click());
    await sleep(75);
    assert('Doctor Directory closes via original handler',await page.evaluate(()=>document.querySelector('#mlx106-doctor-modal')?.hidden===true));
    await page.screenshot({path:path.join(dir,'admin-graphite.png')});
    // Only a local, unpersisted role selection; never submit the user form.
    const role=await page.evaluate(()=>{
      const select=document.querySelector('#uRole');select.value='admin';
      select.dispatchEvent(new Event('change',{bubbles:true}));
      const boxes=[...document.querySelectorAll('#adcPermissionOptions input')];
      return {total:boxes.length,allChecked:boxes.every(b=>b.checked),allDisabled:boxes.every(b=>b.disabled)};
    });
    assert('Native Admin role permissions still respond',role.total>0&&role.allChecked&&role.allDisabled,role);
    // Visual-only modal check; do not click installation.
    const modal=await page.evaluate(()=>{
      const element=document.querySelector('#adc85UpdateOverlay');
      if(element)element.hidden=false;
      const card=element?.querySelector('.adc85-modal');
      return {present:!!card,bg:card?getComputedStyle(card).backgroundColor:'',
       text:card?getComputedStyle(card).color:'',radius:card?getComputedStyle(card).borderRadius:''};
    });
    assert('Graphite popup dark background and rounded corners',modal.present&&modal.bg!==modal.text&&parseFloat(modal.radius)>15,modal);
    await page.screenshot({path:path.join(dir,'update-modal-graphite.png')});
    await page.evaluate(()=>document.querySelector('#adc85UpdateOverlay').hidden=true);
    await page.evaluate(()=>document.querySelector('#app .top')?.scrollIntoView());
    const lock=await page.evaluate(()=>{
      const button=document.querySelector('#mlx101StandbyLock');
      if(button&&!button.disabled)button.click();
      return {exists:!!button,disabled:!!button?.disabled};
    });
    await sleep(340);
    const privacy=await page.evaluate(()=>{
      const cover=document.querySelector('#mlx101Standby');
      const text=document.querySelector('#mlx11LockDigits');
      const style=cover?getComputedStyle(cover,'::after'):null;
      return {native:!!cover,visible:!!cover&&!cover.hidden&&cover.classList.contains('mlx101-show'),
       digits:text?.textContent||null,date:document.querySelector('#mlx101Date')?.textContent||null,
       glow:style?.animationName,theme:document.body.dataset.mlxTheme};
    });
    assert('Original native privacy lock opens live time/date',lock.exists&&!lock.disabled&&privacy.visible&&/^\d{2}:\d{2}$/.test(privacy.digits||'')&&privacy.date,privacy);
    assert('Lock screen animated glow is active',privacy.glow?.includes('mlx11LockGlow'),privacy);
    await page.screenshot({path:path.join(dir,'animated-privacy.png')});
    await page.keyboard.press('Escape');
    await sleep(600);
    const unlocked=await page.evaluate(()=>({
      hidden:document.querySelector('#mlx101Standby')?.hidden,
      patients:!!document.querySelector('#patientForm'),
      admin:!!document.querySelector('#userForm')
    }));
    assert('Original keyboard unlock and clinical DOM intact',unlocked.hidden&&unlocked.patients&&unlocked.admin,unlocked);
    // The new visual CSS is screen-only and MUST NOT style receipts/reports in print media.
    await page.emulateMedia({media:'print'});
    const print=await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--v-bg').trim());
    assert('V11 design CSS isolated from print media',print==='',{vbg:print});
    // Restart/reload-level theme persistence; the old duo-tone script previously erased non-default palettes.
    await page.emulateMedia({media:'screen'});
    await page.evaluate(()=>window.MediLabXTheme.set('ocean'));
    await sleep(150);
    await page.reload({waitUntil:'domcontentloaded'});
    await sleep(1300);
    const restoredTheme=await page.evaluate(()=>({
      theme:document.body.dataset.mlxTheme,
      accent:getComputedStyle(document.body).getPropertyValue('--v-accent').trim()
    }));
    assert('Saved Ocean theme survives application reload',restoredTheme.theme==='ocean'&&restoredTheme.accent==='#0e8fb5',restoredTheme);

   }
   await page.close();
  }
  const newErrors=errors.filter(m=>/mlx11|ensureLock|updateClock|iconsMount|mlx11Lock/.test(m));
  assert('No V11 add-on runtime errors',newErrors.length===0,{newErrors,legacyErrors:errors.slice(0,8)});
  console.log('PASS all screen sizes, 7 themes, Settings/Admin, update dialog, animation, unlock, print-media isolation');
 }finally{await browser.close()}
})().catch(err=>{console.error(err.stack||err);process.exit(1)});
