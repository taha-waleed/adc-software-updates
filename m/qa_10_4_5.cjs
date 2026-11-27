#!/usr/bin/env node
// Scoped smoke tests against the *real 10.4.0 GitHub HTML plus 10.4.5 patch*.
// Synthetic patient/doctor data only; never opens user records or publishes on failures.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const htmlFile=process.argv[2]||'/tmp/MediLabX-10.4.5-QA.html';
const out=process.argv[3]||'/tmp/medilabx-1045-qa';
const html=fs.readFileSync(htmlFile,'utf8');
fs.mkdirSync(out,{recursive:true});
function check(label,ok,value){if(!ok)throw Error('FAIL '+label+': '+JSON.stringify(value));console.log('PASS',label)}
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const allErrors=[];
 try{
  for(const [width,height] of [[1440,900],[1100,800],[990,670]]){
   const pg=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   pg.on('pageerror',e=>allErrors.push(e.message));
   // Match a local installed HTML origin with a synthetic, isolated storage implementation.
   await pg.evaluate(()=>{const map=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{
    getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(String(k),String(v)),
    removeItem:k=>map.delete(k),clear:()=>map.clear(),key:i=>[...map.keys()][i]||null,get length(){return map.size}}})});
   await pg.setContent(html,{waitUntil:'domcontentloaded',timeout:50000});
   await pg.waitForTimeout(1300);
   await pg.evaluate(()=>{
    document.documentElement.classList.remove('ml-splashing');
    document.querySelector('#app')?.style.setProperty('display','block','important');
    for(const id of ['#loginScreen','#startupSplash','#adcWelcome'])document.querySelector(id)?.style.setProperty('display','none','important');
    document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='settings'));
    window.dispatchEvent(new Event('resize'));
   });
   await pg.waitForTimeout(260);
   const state=await pg.evaluate(()=>{
    const rect=s=>{const e=document.querySelector(s);const r=e?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height,scroll:e.scrollHeight,display:getComputedStyle(e).display}:null};
    return {ready:document.body.classList.contains('mlx1045'),settings:rect('#settings'),tabs:rect('#settings .px-tabs'),content:rect('#settings .px-content'),old:rect('#settings .px-legacy-shell'),
      tabsN:document.querySelectorAll('#settings .px-tabs button').length,
      patients:!!document.querySelector('#patientRows'),rates:!!document.querySelector('#rateRows'),admin:!!document.querySelector('#userForm'),
      updates:!!document.querySelector('#adc85UpdateNow'),restore:!!document.querySelector('#adc85RestoreUpdate'),
      privacy:!!document.querySelector('#settings'),print:!!document.querySelector('#reports')};
   });
   console.log('VIEW',width,JSON.stringify(state));
   check('Version 10.4.5 source mounted '+width,state.ready&&state.tabsN>=8&&state.patients&&state.rates&&state.admin&&state.updates&&state.restore,state);
   check('No outer Settings overflow '+width,state.settings&&state.settings.bottom<=height+20&&state.settings.scroll<=state.settings.height+12,state);
   check('Tabbed layout without previous overview '+width,state.tabs&&state.content&&state.tabs.bottom<=state.content.top+8&&(!state.old||state.old.display==='none'),state);
   if(width===1440){
    await pg.screenshot({path:path.join(out,'settings-light.png')});
    for(const key of ['centre','appearance','whatsapp','updates','backup','doctors','rates']){
     const clicked=await pg.evaluate(k=>{const b=document.querySelector('#settings .px-tabs [data-px-key="'+k+'"]');if(!b)return false;b.click();return true},key);
     await pg.waitForTimeout(135);
     const selected=await pg.evaluate(()=>({chosen:document.querySelector('#settings .px-tabs [aria-selected="true"]')?.dataset.pxKey,
       visible:[...document.querySelectorAll('#adcSettingsViews > .adc-setting-view')].filter(e=>!e.hidden).map(e=>e.dataset.settingView)}));
     check('Functional Settings tab '+key,clicked&&selected.chosen===key&&selected.visible.length===1&&selected.visible[0]===key,selected);
    }
    check('Native update controls still present',await pg.locator('#adc85CheckUpdates').count()===1&&await pg.locator('#adc85UpdateNow').count()===1&&await pg.locator('#adc85RestoreUpdate').count()===1);
    await pg.evaluate(()=>document.querySelector('#settings .px-tabs [data-px-key="updates"]').click());
    await pg.waitForTimeout(115);
    await pg.screenshot({path:path.join(out,'software-updates.png')});
    await pg.evaluate(()=>{
      currentUser={name:'Synthetic Admin',role:'admin'};
      db.doctors=['Dr. Alpha','Dr. Beta'];db.referringDoctors=['Dr. Example'];
      db.patients=[{name:'Synthetic record only',receipt:'AH-TEST',date:'2026-11-27',createdAt:'2026-11-27T09:00:00.000Z',
        performingDoctor:'Dr. Alpha',tests:[{name:'Ultrasound Abdomen',price:1000,department:'Radiology'}]}];
    });
    await pg.evaluate(()=>document.querySelector('#settings .px-tabs [data-px-key="doctors"]').click());
    await pg.evaluate(()=>document.querySelector('#settings [data-px-sub="performance"]').click());
    await pg.waitForTimeout(115);
    const activity=await pg.locator('.px-perf-results .px-table tbody tr').allInnerTexts();
    check('Synthetic ultrasound performing doctor analytics',activity.some(s=>s.includes('Dr. Alpha')&&s.includes('1')),activity);
    await pg.evaluate(()=>document.querySelector('#settings [data-px-sub="referring"]').click());
    await pg.waitForTimeout(70);
    check('Referring directory list and inline edit',await pg.locator('#settings .px-list .px-item').count()>=1);
    await pg.evaluate(()=>document.querySelector('#settings .px-tabs [data-px-key="rates"]').click());
    check('Rate List CRUD launch',await pg.locator('#settings .px-card button').filter({hasText:'Add new service'}).count()>=1);

    // Real CRUD wiring with synthetic data; ensure original DB key is used, not a preview-only model.
    await pg.evaluate(()=>document.querySelector('#settings .px-tabs [data-px-key="doctors"]').click());
    await pg.evaluate(()=>document.querySelector('#settings [data-px-sub="referring"]').click());
    await pg.waitForTimeout(75);
    const addDoctor=await pg.evaluate(()=>{
      const v=document.querySelector('#settings .adc-setting-view[data-setting-view="doctors"]');
      const inp=v?.querySelector('.px-card input');
      if(!inp)return false;
      inp.value='Dr. Synthetic New';
      v.querySelector('.px-card button.primary')?.click();
      return db.referringDoctors.includes('Dr. Synthetic New');
    });
    check('Referral doctor add persisted via original db',addDoctor);
    const storageDoctor=await pg.evaluate(()=>localStorage.getItem('medilabx10_html_v1'));
    check('Patient storage key remains in use',storageDoctor===null||typeof storageDoctor==='string');
    await pg.evaluate(()=>document.querySelector('#settings .px-tabs [data-px-key="rates"]').click());
    await pg.evaluate(()=>{
      db.tests=[{id:99011,name:'Synthetic Existing Test',abbr:'SYN',department:'Radiology',price:1500}];
      // Keep existing sample patient invoice price intact, even after a rate change.
    });
    const rateOpened=await pg.evaluate(()=>{
      const b=[...document.querySelectorAll('#settings .adc-setting-view[data-setting-view="rates"] button')].find(x=>x.textContent.includes('Add new service'));
      if(!b)return false;b.click();return true;
    });
    check('Rate List add editor opens',rateOpened);
    const rateSaved=await pg.evaluate(()=>{
      const form=document.querySelector('#settings .adc-setting-view[data-setting-view="rates"] .px-card:last-child');
      if(!form||form.hidden)return false;
      const inputs=[...form.querySelectorAll('input')];
      if(inputs.length!==4)return false;
      for(const [e,value] of inputs.map((e,i)=>[e,['Synthetic New Ultrasound','SUN','2000','Radiology'][i]]))e.value=value;
      const btn=[...form.querySelectorAll('button')].find(x=>x.textContent.trim()==='Save');btn?.click();
      return db.tests.some(t=>t.name==='Synthetic New Ultrasound'&&t.price===2000);
    });
    check('New rate saved with numeric price',rateSaved);
    const patientStable=await pg.evaluate(()=>db.patients[0].tests[0].price===1000);
    check('Existing patient invoice prices not rewritten',patientStable);
    // Reuse a real createdAt timestamp and ensure compact AM/PM is displayed.
    const patientTime=await pg.evaluate(async()=>{
      const rows=document.querySelector('#patientRows');
      if(!rows)return false;
      rows.innerHTML='<tr><td>AH-TEST</td><td>2026-11-27</td><td>Synthetic</td></tr>';
      await new Promise(r=>setTimeout(r,130));
      return /AM|PM/.test(rows.querySelector('.px-time')?.textContent||'');
    });
    check('Existing patient createdAt formats AM/PM in receipts',patientTime);

    await pg.screenshot({path:path.join(out,'doctor-rate-manager.png')});
    await pg.evaluate(()=>document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='admin')));
    await pg.waitForTimeout(155);
    check('Admin tabs with original management retained',await pg.locator('#px-admin-tabs button').count()>=3&&await pg.locator('#userForm').count()===1);
    await pg.screenshot({path:path.join(out,'admin.png')});
    await pg.evaluate(()=>document.body.classList.add('adc-dark-mode'));
    await pg.evaluate(()=>document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='settings')));
    await pg.waitForTimeout(180);
    const dark=await pg.evaluate(()=>{const s=getComputedStyle(document.querySelector('#settings .adc-settings-shell'));return {background:s.backgroundColor,color:s.color}});
    check('Dark theme panel not same color as text',dark.background!==dark.color,dark);
    await pg.screenshot({path:path.join(out,'settings-dark.png')});
    await pg.emulateMedia({media:'print'});
    const print=await pg.evaluate(()=>getComputedStyle(document.querySelector('#app')).getPropertyValue('--px-shadow').trim());
    check('No screen-only theme tokens in print media',print==='',{value:print});
   }
   await pg.close();
  }
  const overlayErrors=allErrors.filter(e=>/mlx1045|setupSettings|renderPerformance|setupNotifications|renderRates|renderDoctors/.test(e));
  check('No new 10.4.5 runtime errors',overlayErrors.length===0,overlayErrors);
  console.log('PASS MediLab X 10.4.5 browser regression suite (synthetic data only)');
 }finally{await browser.close()}
}
main().catch(err=>{console.error(err.stack||String(err));process.exit(1)});
