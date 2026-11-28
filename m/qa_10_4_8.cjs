#!/usr/bin/env node
/* Tests actual published 10.4.7 HTML + 10.4.8 overlay, with synthetic storage only. */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(process.argv[2]||'/tmp/MediLabX-10.4.8-QA.html','utf8');
const dir=process.argv[3]||'/tmp/medilabx-1048-qa';fs.mkdirSync(dir,{recursive:true});
const KEYS=['centre','appearance','doctors','rates','mlxnotifications','updates','animations','brief','mlxaicustom','whatsapp','printlayout','developer','backup'];
const assert=(label,ok,result)=>{if(!ok)throw new Error('FAIL '+label+': '+JSON.stringify(result));console.log('PASS',label)};
const rgb=s=>[...s.matchAll(/\d+(?:\.\d+)?/g)].slice(0,3).map(x=>Number(x[0]));
const contrast=(a,b)=>{
 const lum=c=>{const x=rgb(c).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return x[0]*.2126+x[1]*.7152+x[2]*.0722};
 const [l,r]=[lum(a),lum(b)].sort((x,y)=>y-x);return (l+.05)/(r+.05)
};
async function main(){
 const b=await chromium.launch({headless:true,args:['--no-sandbox']});
 const errors=[];
 try{
  for(const [width,height] of [[1600,900],[1100,800],[990,670]]){
   const page=await b.newPage({viewport:{width,height},deviceScaleFactor:1});
   page.on('pageerror',e=>errors.push(e.message));
   // Isolate tests from real users' records, avoid any actual server connection.
   await page.evaluate(()=>{
    const map=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{
      getItem:k=>map.has(k)?map.get(k):null,
      setItem:(k,v)=>map.set(String(k),String(v)),removeItem:k=>map.delete(k),clear:()=>map.clear(),
      key:i=>[...map.keys()][i]||null,get length(){return map.size}}
    });
   });
   await page.setContent(html,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForTimeout(1450);
   await page.evaluate(()=>{
    document.documentElement.classList.remove('ml-splashing');
    ['#mlxSelectedStartup','#loginScreen','#startupSplash','#adcWelcome'].forEach(s=>document.querySelector(s)?.style.setProperty('display','none','important'));
    document.querySelector('#app')?.style.setProperty('display','block','important');
    document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='settings'));
   });
   await page.waitForTimeout(250);
   for(const mode of ['light','dark']){
    await page.evaluate(mode=>document.body.classList.toggle('adc-dark-mode',mode==='dark'),mode);
    await page.waitForTimeout(200);
    const state=await page.evaluate(()=>{
      const css=s=>{const e=document.querySelector(s);if(!e)return null;const c=getComputedStyle(e);return {bg:c.backgroundColor,color:c.color,fill:c.webkitTextFillColor,userSelect:c.userSelect,display:c.display}};
      const root=document.querySelector('#settings'),rect=root?.getBoundingClientRect();
      return{
       ready:document.body.classList.contains('mlx1048'),
       selected:css('#nav button[data-page="settings"] .adc-nav-label'),
       side:css('#app aside.sidebar'),title:css('#adc85Titlebar'),
       clock:css('#mlxClockWidget'),clockText:css('#mlxClockDigital'),
       notif:css('#mlx-notif-btn'),newPatient:css('#quickReception'),
       badge:document.querySelector('#settings .adc-settings-version')?.textContent.trim(),
       unsupported:['gemini','ml10layout'].map(key=>{const el=document.querySelector('#settings .px-tabs button[data-px-key="'+key+'"]');return{key,display:el?getComputedStyle(el).display:'missing',hidden:el?.hidden}}),
       total:[...document.querySelectorAll('#settings .px-tabs button[data-px-key]')].filter(x=>getComputedStyle(x).display!=='none').length,
       patient:!!document.querySelector('#patientForm'),admin:!!document.querySelector('#userForm'),
       doctors:!!document.querySelector('#settings [data-setting-view="doctors"]'),
       rates:!!document.querySelector('#settings [data-setting-view="rates"]'),
       update:!!document.querySelector('#adc85UpdateNow'),restore:!!document.querySelector('#adc85RestoreUpdate'),
       setting:rect?{bottom:rect.bottom,height:rect.height,scroll:root.scrollHeight}:null
      };
    });
    console.log('STATE',width,mode,JSON.stringify(state));
    assert('Patch and original patient/admin/update controls '+mode+' '+width,state.ready&&state.patient&&state.admin&&state.doctors&&state.rates&&state.update&&state.restore,state);
    assert('Same navy bars and readable selected Settings label '+mode+' '+width,state.side?.bg==='rgb(24, 44, 77)'&&state.title?.bg===state.side.bg&&state.selected?.userSelect==='none'&&state.selected?.fill==='rgb(255, 255, 255)',state);
    assert('Empty/unsupported tabs hidden '+mode+' '+width,state.unsupported.every(v=>v.display==='none')&&state.total===13,state.unsupported);
    assert('Settings HTML version badge '+mode+' '+width,state.badge==='10.4.8',state.badge);
    assert('Settings fits without outer page scroll '+mode+' '+width,state.setting?.bottom<=height+22&&state.setting?.scroll<=state.setting.height+14,state.setting);
    assert('Clock and New Patient contrast '+mode+' '+width,contrast(state.clockText.color,state.clock.bg)>=4.5&&contrast(state.newPatient.fill,state.newPatient.bg)>=4.5,{clock:state.clock,clockText:state.clockText,newPatient:state.newPatient});
    if(width===1600){
     for(const key of KEYS){
      const clicked=await page.evaluate(k=>{const el=document.querySelector('#settings .px-tabs button[data-px-key="'+k+'"]');if(!el)return false;el.click();return true},key);
      await page.waitForTimeout(280);
      const result=await page.evaluate(()=>({shown:[...document.querySelectorAll('#adcSettingsViews > .adc-setting-view')].filter(x=>!x.hidden).map(x=>x.dataset.settingView),nav:[...document.querySelectorAll('#nav button.active')].map(x=>x.dataset.page)}));
      assert('Functional Settings category '+key+' '+mode,clicked&&result.shown.length===1&&result.shown[0]===key&&result.nav.includes('settings'),result);
     }
     await page.evaluate(()=>document.querySelector('#settings .px-tabs button[data-px-key="updates"]').click());
     await page.waitForTimeout(300);
     const buttons=await page.evaluate(()=>{
      const value=s=>{const e=document.querySelector(s),c=e?getComputedStyle(e):null;return c?{bg:c.backgroundColor,color:c.color,fill:c.webkitTextFillColor}:null};
      return {check:value('#adc85CheckUpdates'),restore:value('#adc85RestoreUpdate')}
     });
     assert('Update and Restore button labels readable '+mode,buttons.check&&buttons.restore&&contrast(buttons.check.fill,buttons.check.bg)>=4.5&&contrast(buttons.restore.fill,buttons.restore.bg)>=4.5,buttons);
     await page.screenshot({path:path.join(dir,'settings-updates-'+mode+'.png')});
     await page.evaluate(()=>document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='admin')));
     await page.waitForTimeout(180);
     const admin=await page.evaluate(()=>{
       const e=document.querySelector('#admin input:not([type="checkbox"]):not([type="radio"])'),c=e?getComputedStyle(e):null;
       return {input:c?{bg:c.backgroundColor,color:c.color,fill:c.webkitTextFillColor}:null,adminTabs:document.querySelectorAll('#px-admin-tabs button').length,cnic:!!document.querySelector('#mlx-employee-form input[name="cnic"]')}
     });
     assert('Admin and employee settings preserved '+mode,admin.adminTabs>=3&&admin.cnic,admin);
     assert('Admin input light/dark contrast '+mode,admin.input&&contrast(admin.input.fill,admin.input.bg)>=4.5,admin);
     await page.screenshot({path:path.join(dir,'admin-'+mode+'.png')});
     // Workstation-wide form contrast: dark mode previously rendered white text on
     // white inputs outside Settings. Test one real field in each clinical area.
     for(const section of ['reception','patients','reports','daily','expenses']){
      await page.evaluate(k=>document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id===k)),section);
      await page.waitForTimeout(45);
      const input=await page.evaluate(k=>{
       const root=document.querySelector('#'+k);
       const e=[...(root?.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),select,textarea')||[])].find(el=>{
        const r=el.getBoundingClientRect();return getComputedStyle(el).display!=='none'&&r.width>10&&r.height>10
       });
       if(!e)return null;
       const c=getComputedStyle(e);return {id:e.id,bg:c.backgroundColor,fill:c.webkitTextFillColor};
      },section);
      assert('App-wide input contrast '+section+' '+mode,input&&contrast(input.fill,input.bg)>=4.5,input);
     }
     await page.evaluate(()=>document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='settings')));
     await page.waitForTimeout(150);
     await page.evaluate(()=>document.querySelector('#nav button[data-page="settings"]')?.click());
     await page.waitForTimeout(280);
     await page.screenshot({path:path.join(dir,'settings-home-'+mode+'.png')});
    }
   }
   if(width===1600){
    await page.emulateMedia({media:'print'});
    const c=await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--mlx48-navy').trim());
    assert('Screen-only update leaves print CSS untouched',c==='',{cssVar:c});
   }
   await page.close();
  }
  assert('No new patch JS runtime exceptions',!errors.some(e=>/mlx1048|syncNav\(|hideUnavailable\(|fixLabelSelection\(/i.test(e)),errors.slice(0,10));
  console.log('PASS MediLab X 10.4.8 Settings/light-dark regression QA. Native update/printing not executed.');
 }finally{await b.close()}
}
main().catch(e=>{console.error(e.stack||String(e));process.exit(1)});