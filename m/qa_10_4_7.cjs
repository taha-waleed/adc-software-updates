#!/usr/bin/env node
/* Browser QA is run on the actual 10.4.6 production HTML patched to 10.4.7.
   Only synthetic HR and patient storage is used; never accesses user records. */
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const html=fs.readFileSync(process.argv[2]||'/tmp/MediLabX-10.4.7-QA.html','utf8');
const folder=process.argv[3]||'/tmp/mlx1047-qa';fs.mkdirSync(folder,{recursive:true});
const patient='{"synthetic":"patient-data-untouched"}';
const initial={mlx_operations_v1:JSON.stringify({version:1,items:[],employees:[{id:'qa1',name:'Synthetic Sample Employee',job:'Lab Assistant',department:'Laboratory',joined:'2026-08-01',code:'QA-02',contact:'',notes:''}],leaves:[],letters:[],salaries:[],settings:{expiryAlertDays:30}}),medilabx10_html_v1:patient};
function check(label,yes,info){if(!yes)throw Error('FAIL '+label+': '+JSON.stringify(info));console.log('PASS',label)}
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let scriptErrors=[];
 try{
  for(const [w,h] of [[1600,960],[1100,800],[990,670]]){
   const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
   page.on('pageerror',e=>scriptErrors.push(e.message));
   await page.evaluate(seed=>{
     const store=new Map(Object.entries(seed));Object.defineProperty(window,'localStorage',{configurable:true,value:{
       getItem:k=>store.has(String(k))?store.get(String(k)):null,
       setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(String(k)),
       clear:()=>store.clear(),key:i=>[...store.keys()][i]||null,get length(){return store.size}
     }});
   },initial);
   await page.setContent(html,{waitUntil:'domcontentloaded',timeout:55000});
   await page.waitForTimeout(1400);
   await page.evaluate(()=>{
     document.querySelector('#app')?.style.setProperty('display','block','important');
     document.querySelector('#app')?.classList.add('authenticated');
     currentUser={name:'Synthetic Admin',username:'Admin',role:'admin'};
     document.documentElement.classList.remove('ml-splashing');
     document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='settings'));
     window.dispatchEvent(new Event('resize'));
   });
   await page.waitForTimeout(230);
   const shape=await page.evaluate(()=>{
     const rect=s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,right:r.right,left:r.left,height:r.height,scroll:e.scrollHeight}:null};
     return {ready:document.body.classList.contains('mlx1047'),hr:!!document.querySelector('#admin #px47-hr-container #mlxHR'),
       hrPage:document.querySelector('#mlxHR')?.classList.contains('page'),cnic:!!document.querySelector('#mlx-employee-form [name="cnic"]'),
       fishScript:!!document.querySelector('#mlx107-fishtank-settings-and-animation'),fishCard:!!document.querySelector('#mlx107Settings'),
       welcome:!!document.querySelector('#px47-welcome'),update:!!document.querySelector('#adc85UpdateNow'),restore:!!document.querySelector('#adc85RestoreUpdate'),
       patient:!!document.querySelector('#patientForm'),reports:!!document.querySelector('#reports'),rate:!!document.querySelector('#rateRows'),settings:rect('#settings')};
   });
   console.log('VIEWPORT',w,JSON.stringify(shape));
   check('Official source and all native controls preserved '+w,shape.ready&&shape.hr&&!shape.hrPage&&shape.cnic&&shape.welcome&&shape.update&&shape.restore&&shape.patient&&shape.reports&&shape.rate,shape);
   check('Fish engine and settings removed '+w,!shape.fishScript&&!shape.fishCard,shape);
   check('Settings full-page clipping fixed '+w,shape.settings?.bottom<=h+22&&shape.settings?.scroll<=shape.settings.height+14,shape);
   if(w===1600){
     await page.evaluate(()=>document.querySelector('#nav button[data-page="settings"]')?.click());
     await page.waitForTimeout(360);
     const welcome=await page.evaluate(()=>({open:document.querySelector('#settings').classList.contains('px47-welcome-active'),title:document.querySelector('#px47-welcome h2')?.textContent}));
     check('Normal Settings entry displays MediLab X welcome',welcome.open&&welcome.title==='MediLab X Settings',welcome);
     await page.screenshot({path:path.join(folder,'settings-welcome-light.png')});
     await page.evaluate(()=>document.querySelector('#settings .px-tabs [data-px-key="appearance"]')?.click());
     await page.waitForTimeout(150);
     check('Selecting appearance removes welcome',await page.evaluate(()=>!document.querySelector('#settings').classList.contains('px47-welcome-active')));
     // Rate List shortcut delegates to real settings, without old unrelated selection.
     await page.evaluate(()=>document.querySelector('#nav button[data-page="ratelist"]')?.click());
     await page.waitForTimeout(350);
     const rate=await page.evaluate(()=>({active:document.querySelector('#settings .px-tabs [data-px-key="rates"]')?.getAttribute('aria-selected'),stale:document.querySelector('#nav button[data-page="ratelist"]')?.classList.contains('active')}));
     check('Rate List opens its own settings tab with correct nav',rate.active==='true'&&!rate.stale,rate);
     await page.evaluate(()=>document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='admin')));
     await page.evaluate(()=>document.querySelector('#admin .mlx-admin-hr-card [data-mlx-hr="staff"]')?.click());
     await page.waitForTimeout(160);
     const hr=await page.evaluate(()=>({admin:document.querySelector('#admin').classList.contains('active'),embedded:document.querySelector('#admin').classList.contains('px47-employees-open'),holder:!document.querySelector('#px47-hr-container').hidden,selected:document.querySelector('#px-admin-tabs [data-px-sub="employees"]')?.getAttribute('aria-selected'),forms:!!document.querySelector('#mlx-employee-form'),letters:!!document.querySelector('#mlx-letter-form'),leave:!!document.querySelector('#mlx-leave-form')}));
     check('Employees, certificates, leave and salary embedded under Admin',hr.admin&&hr.embedded&&hr.holder&&hr.selected==='true'&&hr.forms&&hr.letters&&hr.leave,hr);
     await page.screenshot({path:path.join(folder,'employees-under-admin.png')});
     const baselinePatient=await page.evaluate(()=>localStorage.getItem('medilabx10_html_v1'));
     await page.evaluate(()=>{const f=document.querySelector('#mlx-employee-form');for(const [name,value] of Object.entries({name:'Synthetic New Staff',job:'Technician',department:'Pathology',joined:'2026-11-27',cnic:'1234512345671'})){f.elements[name].value=value;if(name==='cnic')f.elements[name].dispatchEvent(new Event('input',{bubbles:true}))}f.requestSubmit()});
     await page.waitForTimeout(150);
     const data=await page.evaluate(()=>({list:JSON.parse(localStorage.getItem('mlx_operations_v1')).employees,patient:localStorage.getItem('medilabx10_html_v1'),render:document.querySelector('#mlx-employee-rows')?.textContent}));
     check('CNIC formatted and persisted in original local employee storage',data.list.some(x=>x.name==='Synthetic New Staff'&&x.cnic==='12345-1234567-1'),data.list.map(x=>({name:x.name,hasCnic:!!x.cnic})));
     check('CNIC masked in employee list',!data.render.includes('12345-1234567-1')&&data.render.includes('5671'));
     check('Patient storage unchanged after employee save',data.patient===baselinePatient);
     await page.evaluate(()=>window.confirm=()=>true);
     await page.evaluate(()=>{const e=[...document.querySelectorAll('#mlx-employee-rows tr')].find(x=>x.textContent.includes('Synthetic New Staff'));e?.querySelector('[data-employee-action="remove"]')?.click()});
     await page.waitForTimeout(100);
     const archived=await page.evaluate(()=>({archived:JSON.parse(localStorage.getItem('mlx_operations_v1')).employees.find(e=>e.name==='Synthetic New Staff')?.archived,visible:document.querySelector('#mlx-employee-rows')?.textContent.includes('Synthetic New Staff')}));
     check('Remove archives employee and retains historical identity',archived.archived===true&&!archived.visible,archived);
     await page.evaluate(()=>document.querySelector('#mlx-employee-show-archived')?.click());
     await page.waitForTimeout(50);
     await page.evaluate(()=>{const e=[...document.querySelectorAll('#mlx-employee-rows tr')].find(x=>x.textContent.includes('Synthetic New Staff'));e?.querySelector('[data-employee-action="restore"]')?.click()});
     await page.waitForTimeout(100);
     const unarchived=await page.evaluate(()=>JSON.parse(localStorage.getItem('mlx_operations_v1')).employees.find(e=>e.name==='Synthetic New Staff')?.archived===false);
     check('Restore returns employee to active data',unarchived);
     const actionLayout=await page.evaluate(()=>{const actions=document.querySelector('#mlx-employee-rows td.mlx-employee-actions'),wrap=actions?.closest('.mlx-scroll');return {w:wrap?.clientWidth,scroll:wrap?.scrollWidth}});
     check('Employee record actions do not overflow visible panel',!actionLayout.w||actionLayout.scroll<=actionLayout.w+5,actionLayout);
     await page.evaluate(()=>document.querySelector('#px-admin-tabs [data-px-sub="users"]')?.click());
     check('Admin Accounts tab returns to original forms',await page.evaluate(()=>!document.querySelector('#admin').classList.contains('px47-employees-open')&&!!document.querySelector('#userForm')));
     await page.evaluate(()=>{
       document.body.classList.add('adc-dark-mode');
       document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='settings'));
       document.querySelector('#nav button[data-page="settings"]')?.click();
     });
     await page.waitForTimeout(320);
     const colors=await page.evaluate(()=>{const get=s=>{const cs=getComputedStyle(document.querySelector(s));return {bg:cs.backgroundColor,fg:cs.color}};return {top:get('#app .main > .top'),shell:get('#settings .adc-settings-shell'),title:get('#pageTitle')}});
     check('Dark mode header and Settings text legible',colors.top.bg!=='rgb(255, 255, 255)'&&colors.top.bg!==colors.title.fg&&colors.shell.bg!==colors.shell.fg,colors);
     await page.screenshot({path:path.join(folder,'settings-welcome-dark.png')});
     await page.emulateMedia({media:'print'});
     const printToken=await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--px47-printed').trim());
     check('No 10.4.7 visual changes forced on printed output',printToken==='');
   }
   await page.close();
  }
  const ours=scriptErrors.filter(x=>/mlx1047|normalizeHR|createWelcome|openEmployees|renderEmployees/.test(x));
  check('No new 10.4.7 script errors',!ours.length,ours);
  console.log('PASS 10.4.7 production-sourced automated browser QA');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack||String(e));process.exit(1)});