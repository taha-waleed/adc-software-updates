#!/usr/bin/env node
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(process.argv[2]||'/tmp/MediLabX-10.4.6-QA.html','utf8');
const dir=process.argv[3]||'/tmp/medilabx-1046-qa';fs.mkdirSync(dir,{recursive:true});
const check=(name,okay,info)=>{if(!okay)throw Error('FAIL '+name+' '+JSON.stringify(info));console.log('PASS '+name)};
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let errors=[];
 try{
  for(const [width,height] of [[1590,958],[1100,800],[990,670]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   page.on('pageerror',e=>errors.push(e.message));
   await page.evaluate(()=>{
    const entries=new Map();
    Object.defineProperty(window,'localStorage',{configurable:true,value:{
      getItem:k=>entries.has(k)?entries.get(k):null,
      setItem:(k,v)=>entries.set(String(k),String(v)),
      removeItem:k=>entries.delete(k),clear:()=>entries.clear(),
      key:i=>[...entries.keys()][i]||null,get length(){return entries.size}
    }});
   });
   await page.setContent(html,{waitUntil:'domcontentloaded',timeout:55000});
   await page.waitForTimeout(1200);
   await page.evaluate(()=>{
    for(const s of ['#adcWelcome','#loginScreen','#startupSplash','#mlxSelectedStartup'])
      document.querySelector(s)?.style.setProperty('display','none','important');
    document.querySelector('#app')?.style.setProperty('display','block','important');
    document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='settings'));
    window.dispatchEvent(new Event('resize'));
   });
   await page.waitForTimeout(250);
   for(const mode of ['light','dark','ocean','midnight']){
    await page.evaluate(mode=>{
      document.body.classList.toggle('adc-dark-mode',mode==='dark');
      if(mode==='ocean'||mode==='midnight')document.body.setAttribute('data-mlx-theme',mode);
      else document.body.removeAttribute('data-mlx-theme');
    },mode);
    await page.waitForTimeout(120);
    const stat=await page.evaluate(()=>{
      const info=s=>{
        const e=document.querySelector(s);
        if(!e)return null;
        const cs=getComputedStyle(e);
        return {bg:cs.backgroundColor,fg:cs.color,fill:cs.webkitTextFillColor};
      };
      const root=document.querySelector('#settings'),r=root?.getBoundingClientRect();
      const tabs=document.querySelector('#settings .px-tabs');
      return {
        title:info('#adc85Titlebar'),side:info('#app aside.sidebar'),
        nav:info('#nav button[data-page="settings"] .adc-nav-label'),
        primary:info('#settings button.primary'),
        selected:info('#settings .px-tabs > button[aria-selected="true"]'),
        badge:document.querySelector('#settings .adc-settings-version')?.textContent.trim(),
        visible:[...document.querySelectorAll('#settings .px-tabs > button[data-px-key]')].map(e=>e.dataset.pxKey),
        hidden:[...document.querySelectorAll('#settings .px-more-menu button[data-px-key]')].map(e=>e.dataset.pxKey),
        more:!!document.querySelector('#settings .px-more'),
        update:!!document.querySelector('#adc85UpdateNow'),
        restore:!!document.querySelector('#adc85RestoreUpdate'),
        patient:!!document.querySelector('#patientForm'),
        settings:r?{bottom:r.bottom,height:r.height,scroll:root.scrollHeight}:null,
        tabWidth:tabs?.scrollWidth,tabClient:tabs?.clientWidth
      };
    });
    console.log('VIEW',width,mode,JSON.stringify(stat));
    const NAVY='rgb(24, 44, 77)';
    check('Top taskbar and sidebar same navy '+width+' '+mode,stat.title?.bg===NAVY&&stat.side?.bg===NAVY,stat);
    check('Sidebar labels readable white '+width+' '+mode,stat.nav?.fill==='rgb(246, 249, 255)',stat);
    check('Buttons and selected tabs are professionally contrasted '+width+' '+mode,
      stat.primary?.bg==='rgb(36, 92, 170)'&&stat.selected?.bg===NAVY&&stat.selected?.fill==='rgb(255, 255, 255)',stat);
    check('UI and native medical/update controls retained '+width+' '+mode,
      stat.patient&&stat.update&&stat.restore&&stat.more&&stat.visible.length===6&&stat.hidden.length>=7,stat);
    check('No horizontal tab overflow or main Settings scroll '+width+' '+mode,
      stat.tabWidth<=stat.tabClient+12&&stat.settings?.bottom<=height+18&&stat.settings?.scroll<=stat.settings.height+12,stat);
   }
   if(width===1590){
     await page.evaluate(()=>{document.body.classList.remove('adc-dark-mode');document.body.removeAttribute('data-mlx-theme')});
     await page.waitForTimeout(150);
     await page.screenshot({path:path.join(dir,'navy-light.png')});
     await page.evaluate(()=>document.querySelector('#settings .px-more > summary').click());
     check('More settings menu opens',await page.evaluate(()=>document.querySelector('#settings .px-more').open));
     await page.evaluate(()=>document.querySelector('#settings .px-more-menu button[data-px-key="developer"]').click());
     await page.waitForTimeout(180);
     const clicked=await page.evaluate(()=>({
      shown:[...document.querySelectorAll('#adcSettingsViews .adc-setting-view')].filter(e=>!e.hidden).map(e=>e.dataset.settingView),
      selected:document.querySelector('#settings .px-more-menu button[data-px-key="developer"]')?.getAttribute('aria-selected'),
      open:document.querySelector('#settings .px-more').open
     }));
     check('Developer tab preserved and dropdown closes',clicked.shown.length===1&&clicked.shown[0]==='developer'&&clicked.selected==='true'&&!clicked.open,clicked);
     await page.evaluate(()=>document.querySelector('#settings .px-tabs > button[data-px-key="doctors"]').click());
     await page.waitForTimeout(130);
     check('Doctors remain accessible',await page.evaluate(()=>[...document.querySelectorAll('#adcSettingsViews .adc-setting-view')].filter(x=>!x.hidden).map(x=>x.dataset.settingView).includes('doctors')));
     await page.evaluate(()=>document.body.classList.add('adc-dark-mode'));
     await page.waitForTimeout(130);
     await page.screenshot({path:path.join(dir,'navy-dark.png')});
     await page.emulateMedia({media:'print'});
     const printToken=await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--mlx-nav-navy').trim());
     check('Screen-only visual changes do not touch print styles',printToken==='',{printToken});
   }
   await page.close();
  }
  check('No new 10.4.6 runtime exceptions',errors.filter(e=>/mlx1046|organize\(/i.test(e)).length===0,errors.slice(0,6));
  console.log('PASS full 10.4.6 visual-only release smoke QA');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack||String(e));process.exit(1)});
