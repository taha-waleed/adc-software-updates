#!/usr/bin/env node
/* MediLab X 10.4.9 production-sourced UI smoke tests; synthetic records only. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(process.argv[2]||'/tmp/MediLabX-10.4.9-QA.html','utf8');
const out=process.argv[3]||'/tmp/medilabx-1049-qa';fs.mkdirSync(out,{recursive:true});
const test=(label,pass,details)=>{if(!pass)throw new Error('FAIL '+label+': '+JSON.stringify(details));console.log('PASS '+label)};
async function main(){
 const b=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[1600,960],[1100,800],[990,670]]){
   const page=await b.newPage({viewport:{width,height}}),errs=[];
   page.on('pageerror',e=>errs.push(e.message));
   await page.evaluate(()=>{const store=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear(),key:i=>[...store.keys()][i]||null,get length(){return store.size}}})});
   await page.setContent(html,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForTimeout(1250);
   await page.evaluate(()=>{
    document.documentElement.classList.remove('ml-splashing');
    for(const k of ['#loginScreen','#startupSplash','#adcWelcome','#mlxSelectedStartup'])document.querySelector(k)?.style.setProperty('display','none','important');
    document.querySelector('#app')?.style.setProperty('display','block','important');
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='settings'));
    document.querySelector('#settings .px-tabs [data-px-key="updates"]')?.click();
   });
   await page.waitForTimeout(180);
   for(const dark of [false,true]){
    await page.evaluate(v=>document.body.classList.toggle('adc-dark-mode',v),dark);
    await page.waitForTimeout(130);
    const d=await page.evaluate(()=>{
     const find=s=>document.querySelector(s);const style=s=>{const el=find(s);if(!el)return null;const c=getComputedStyle(el);return {display:c.display,bg:c.backgroundColor,color:c.color,fill:c.webkitTextFillColor,backgroundImage:c.backgroundImage}};
     const summary=find('#mlx1049WhatsNew summary'),root=find('#adc85UpdateCentre');
     return {version:find('#settings .adc-settings-version')?.textContent.trim(),summary:summary?.textContent,detailsCount:document.querySelectorAll('#mlx1049WhatsNew').length,
       currentItems:document.querySelectorAll('#mlx1049WhatsNew li').length,
       legacy:style('#adc85UpdateCentre .mlx-release-intro'),legacyNotes:style('#adc85UpdateCentre .adc854-current-notes'),nativeNotes:style('#adc85NotesToggle'),
       headline:style('#adc85UpdateCentre .adc85-update-status strong'),status:style('#adc85UpdateCentre .adc85-update-status'),
       controls:['adc85CheckUpdates','adc85UpdateNow','adc85RestoreUpdate','adc85ReleaseNotes','adc85NewVersion','adc85ModalPrimary'].every(id=>!!document.getElementById(id)),
       sidebar:style('#app .sidebar .sidebar-foot'),screenRect:root&&{right:root.getBoundingClientRect().right}
     };
    });
    console.log('STATE',width,dark?'dark':'light',JSON.stringify(d));
    test('Single current-feature toggle '+width+' '+dark,d.detailsCount===1&&d.currentItems>=7&&d.summary==='What’s New in MediLab X',d);
    test('No duplicate Release Spotlight or notes '+width+' '+dark,[d.legacy,d.legacyNotes,d.nativeNotes].every(x=>!x||x.display==='none'),d);
    test('Native updater controls retained '+width+' '+dark,d.controls,d);
    test('Status and footer visible '+width+' '+dark,d.headline?.display!=='none'&&d.status?.display!=='none'&&d.sidebar?.display!=='none',d);
    test('Correct HTML release badge '+width+' '+dark,d.version==='10.4.9',d);
    const available=await page.evaluate(()=>{
      const box=document.querySelector('#adc85UpdateOffer');box.hidden=false;
      document.querySelector('#adc85NewVersion').textContent='MediLab 10.5.0';
      document.querySelector('#adc85ReleaseNotes').textContent='• Better ultrasound reporting\n• Improved staff controls';
      return true;
    });
    await page.waitForTimeout(90);
    const offer=await page.evaluate(()=>({title:document.querySelector('#mlx1049WhatsNew summary')?.textContent,
       items:[...document.querySelectorAll('#mlx1049WhatsNew li')].map(x=>x.textContent),old:getComputedStyle(document.querySelector('#adc85NotesToggle')).display}));
    test('Official version and its real notes, never duplicate '+width+' '+dark,
      available&&offer.title==='What’s New in MediLab X (10.5.0)'&&offer.items.join('|')==='Better ultrasound reporting|Improved staff controls'&&offer.old==='none',offer);
    await page.evaluate(()=>document.querySelector('#mlx1049WhatsNew summary').click());
    test('Whats New expands with native details',await page.evaluate(()=>document.querySelector('#mlx1049WhatsNew').open));
    await page.evaluate(()=>document.querySelector('#adc85UpdateOffer').hidden=true);
    await page.waitForTimeout(80);
    const reset=await page.evaluate(()=>({title:document.querySelector('#mlx1049WhatsNew summary').textContent,open:document.querySelector('#mlx1049WhatsNew').open}));
    test('Current features return when no update available '+width+' '+dark,reset.title==='What’s New in MediLab X'&&!reset.open,reset);
    await page.evaluate(()=>{const modal=document.querySelector('#adc85UpdateOverlay');modal.hidden=false;modal.dataset.kind='installing';document.querySelector('#adc85ModalTitle').textContent='Updating MediLab'});
    await page.waitForTimeout(120);
    const modal=await page.evaluate(()=>{const css=s=>{let e=document.querySelector(s),st=getComputedStyle(e);return {bg:st.backgroundColor,fill:st.webkitTextFillColor,display:st.display,gradient:st.backgroundImage}};
      return {overlay:css('#adc85UpdateOverlay'),title:css('#adc85ModalTitle'),head:css('#adc85UpdateOverlay .adc85-modal-head'),body:css('#adc85UpdateOverlay .adc85-modal-content'),message:css('#adc85ModalMessage')}});
    test('Popup heading white on navy '+width+' '+dark,modal.title.fill==='rgb(255, 255, 255)'&&modal.head.gradient.includes('linear-gradient'),modal);
    test('Popup body message contrasts panel '+width+' '+dark,modal.body.bg!==modal.message.fill&&modal.overlay.display!=='none',modal);
    if(width===1600){await page.screenshot({path:path.join(out,dark?'updates-popup-dark.png':'updates-popup-light.png')});
      await page.evaluate(()=>document.querySelector('#adc85UpdateOverlay').hidden=true);
      await page.screenshot({path:path.join(out,dark?'updates-light-dark.png':'updates-light.png')});}
    await page.evaluate(()=>document.querySelector('#adc85UpdateOverlay').hidden=true);
   }
   test('No 10.4.9 JS errors '+width,!errs.some(e=>/mlx1049|readNotes|renderNotes/.test(e)),errs.slice(0,3));
   await page.close();
  }
  console.log('PASS MediLab X 10.4.9 production-source UI smoke tests; native network/printing not executed');
 }finally{await b.close()}
}
main().catch(e=>{console.error(e.stack||String(e));process.exit(1)});