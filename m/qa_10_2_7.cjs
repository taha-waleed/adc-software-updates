#!/usr/bin/env node
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const input=process.argv[2]||'/tmp/MediLabX-10.2.7-QA.html',out=process.argv[3]||'/tmp/mlx1027-qa';
const check=(name,truth,context)=>{if(!truth)throw Error('FAIL '+name+' '+JSON.stringify(context||{}));console.log('PASS '+name);};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-web-security']});
 const errors=[];
 try{
  for(const [width,height] of [[1440,900],[1100,800],[770,820]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.resolve(input)).href,{waitUntil:'domcontentloaded',timeout:45000});
   await page.evaluate(()=>{
    document.documentElement.classList.remove('ml-splashing');
    const app=document.querySelector('#app');app?.classList.add('authenticated');
    app?.style.setProperty('display','block','important');
    for(const sel of ['#loginScreen','#startupSplash','#adcWelcome'])document.querySelector(sel)?.style.setProperty('display','none','important');
    document.body.classList.add('mlx101-ui','mlx202-release');
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='settings'));
   });
   await page.waitForTimeout(1750);
   const basics=await page.evaluate(()=>{
    const top=document.querySelector('#app .top'),sidebar=document.querySelector('#app .sidebar'),
      lock=document.querySelector('#mlx27PrivacyLock');
    const bg=x=>x?getComputedStyle(x).backgroundImage:'';
    const root=document.querySelector('#settings');
    const list=document.querySelector('#adcSettingsList'),views=document.querySelector('#adcSettingsViews');
    return {topBg:bg(top),sideBg:bg(sidebar),title:getComputedStyle(document.querySelector('#pageTitle')).color,
      lock:!!lock,night:document.body.classList.contains('mlx1027-ready'),
      settings:!!root,list:!!list,views:!!views,overflow:root?.getBoundingClientRect().right>window.innerWidth+15};
   });
   console.log('WIDTH',width,JSON.stringify(basics));
   check('Navy taskbar and sidebar match at '+width,basics.topBg===basics.sideBg&&/gradient/.test(basics.topBg),basics);
   check('Privacy lock in top taskbar at '+width,basics.lock&&basics.night);
   check('Settings layout exists and fits '+width,basics.settings&&basics.list&&basics.views&&!basics.overflow,basics);
   if(width===1440){
    await page.screenshot({path:path.join(out,'settings-navy-light.png')});
    for(const key of ['centre','appearance','whatsapp','printlayout','updates','backup']){
     const status=await page.evaluate((target)=>{
      const button=document.querySelector('#adcSettingsList button[data-open-settings="'+target+'"]');
      if(!button)return {exists:false};
      button.click();
      return {exists:true};
     },key);
     await page.waitForTimeout(190);
     const view=await page.evaluate((target)=>{
      const el=document.querySelector('#adcSettingsViews .adc-setting-view[data-setting-view="'+target+'"]');
      const opened=Array.from(document.querySelectorAll('#adcSettingsViews .adc-setting-view')).filter(x=>!x.hidden).map(x=>x.dataset.settingView);
      const btn=document.querySelector('#adcSettingsList button[data-open-settings="'+target+'"]');
      return {visible:!!el&&!el.hidden,opened,highlight:btn?.getAttribute('aria-current')};
     },key);
     check('Settings category '+key+' opens exclusively',status.exists&&view.visible&&view.opened.length===1&&view.opened[0]===key,view);
     check('Settings category '+key+' highlighted',view.highlight==='page',view);
    }
    await page.screenshot({path:path.join(out,'settings-backup.png')});
    // Theme toggle must continue using original controls.
    await page.evaluate(()=>{document.body.dataset.mlxrMode='dark'});
    const dark=await page.evaluate(()=>{
     const top=document.querySelector('#app .top'),side=document.querySelector('#app .sidebar');
     return {top:getComputedStyle(top).backgroundImage,side:getComputedStyle(side).backgroundImage};
    });
    check('Top taskbar stays navy in dark mode',dark.top===dark.side&&dark.top===basics.topBg,dark);
    await page.screenshot({path:path.join(out,'settings-navy-dark.png')});
    const native=await page.evaluate(()=>({native:!!document.querySelector('#mlx101StandbyLock'),disabled:!!document.querySelector('#mlx101StandbyLock')?.disabled}));
    check('Original privacy lock remains available',native.native&&!native.disabled,native);
    await page.evaluate(()=>document.querySelector('#mlx27PrivacyLock').click());
    await page.waitForTimeout(400);
    const privacy=await page.evaluate(()=>{
      const cover=document.querySelector('#mlx101Standby'),screen=document.querySelector('.mlx27-screen');
      return {visible:!!cover&&!cover.hidden&&cover.classList.contains('mlx101-show'),
       screen:!!screen,digit:document.querySelector('#mlx27ClockDigits')?.textContent,
       date:document.querySelector('#mlx27Date')?.textContent,
       themeButtons:document.querySelectorAll('.mlx27-presets button').length,
       glow:getComputedStyle(screen,'::after').animationName};
    });
    check('Privacy standby opens with live clock and date',privacy.visible&&privacy.screen&&!!privacy.digit&&!!privacy.date,privacy);
    check('Six interactive themes and animated glow',privacy.themeButtons===6&&privacy.glow.includes('mlx27Glow'),privacy);
    await page.screenshot({path:path.join(out,'privacy-midnight.png')});
    await page.evaluate(()=>document.querySelector('.mlx27-presets button[data-mlx27-theme="3"]').click());
    const themed=await page.evaluate(()=>({selected:document.querySelector('.mlx27-screen')?.dataset.theme,
      locked:document.querySelector('#mlx101Standby')?.classList.contains('mlx101-show')}));
    check('Changing privacy preset does not unlock',themed.selected==='3'&&themed.locked,themed);
    await page.keyboard.press('Digit5');
    const shortcut=await page.evaluate(()=>document.querySelector('.mlx27-screen')?.dataset.theme);
    check('Keyboard 1–6 privacy preset shortcut',shortcut==='5',{shortcut});
    await page.keyboard.press('h');
    const hidden=await page.evaluate(()=>document.querySelector('.mlx27-presets')?.classList.contains('mlx27-hidden'));
    check('H shortcut hides preset ribbon',hidden===true);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(670);
    const restored=await page.evaluate(()=>({hidden:document.querySelector('#mlx101Standby')?.hidden,
      card:!!document.querySelector('#userForm'),patients:!!document.querySelector('#patientForm')}));
    check('Escape unlocks original workspace without deleting forms',restored.hidden&&restored.card&&restored.patients,restored);
   }
   await page.close();
  }
  const ours=errors.filter(s=>/mlx1027|mlx27|mountPrivacy|mountSettings|formatClock|applyPreset/.test(s));
  check('No new 10.2.7 runtime errors',!ours.length,{ours,oldErrors:errors.slice(0,8)});
  console.log('PASS: 10.2.7 Chromium UI and interaction QA completed');
 }finally{await browser.close()}
})().catch(err=>{console.error(err.stack||String(err));process.exit(1)});
