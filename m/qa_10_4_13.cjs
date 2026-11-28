#!/usr/bin/env node
'use strict';
// Production HTML runtime QA: move the *original* Reception scan filter group, never create duplicates.
const fs=require('node:fs');
const {chromium}=require('playwright');
const source=fs.readFileSync(process.argv[2]||'/tmp/MediLabX-10.4.13-QA.html','utf8');
function check(name,pass,result){if(!pass)throw Error('FAIL '+name+' '+JSON.stringify(result));console.log('PASS '+name)}
async function main(){
 const b=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[1600,950],[1100,800],[990,700]]){
   const p=await b.newPage({viewport:{width,height}});
   const errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   await p.setContent(source,{waitUntil:'domcontentloaded',timeout:55000});
   await p.waitForTimeout(1300);
   await p.evaluate(()=>{
     document.querySelector('#app')?.style.setProperty('display','block','important');
     for(const selector of ['#adcWelcome','#loginScreen','#startupSplash']) document.querySelector(selector)?.style.setProperty('display','none','important');
     document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='reception'));
   });
   await p.waitForTimeout(160);
   const initial=await p.evaluate(()=>{
     const form=document.getElementById('patientForm');
     const bar=document.getElementById('mlxScanSelect-reception');
     const heading=document.getElementById('testSearch')?.previousElementSibling;
     const count=document.getElementById('testCount');
     const btn=bar?.querySelector('button');
     const rc=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null};
     return {
       matching:!!bar&&bar.parentElement===heading,
       headingClass:heading?.classList.contains('mlx10413-filters-heading'),
       barCount:document.querySelectorAll('#mlxScanSelect-reception').length,
       btnCount:bar?.querySelectorAll('button').length,
       bar:rc(bar),title:rc(heading?.querySelector('h2')),count:rc(count),
       button:rc(btn),buttons:[...bar?.querySelectorAll('button')||[]].map(x=>x.textContent.trim()),
       headingScroll:heading?.scrollWidth,headingWidth:heading?.clientWidth,
       search:rc(document.getElementById('testSearch')),
       testList:!!document.getElementById('testResults'),
       addAll:!!document.getElementById('mlx10412TestExpand'),
       update:!!document.getElementById('adc85UpdateNow'),
       restore:!!document.getElementById('adc85RestoreUpdate'),
       versionSource:document.getElementById('adc85UpdateHeading')?.textContent,
       buttonFont:btn?getComputedStyle(btn).fontSize:null
     };
   });
   console.log('VIEW',width,JSON.stringify(initial));
   check('Existing original filter group moved into same title row '+width,initial.matching&&initial.headingClass&&initial.barCount===1&&initial.btnCount>=4,initial);
   check('Compact 28px pill and visible search below '+width,initial.button&&initial.button.h<=30&&initial.bar.y<initial.search.y,initial);
   check('No clipped controls in title row '+width,initial.headingScroll<=initial.headingWidth+4,initial);
   check('Clinical search, Add list and updater controls retained '+width,initial.testList&&initial.addAll&&initial.update&&initial.restore,initial);
   check('Installed UI release version synchronized '+width,(initial.versionSource||'').includes('10.4.13'),initial.versionSource);
   if(width>=990)check('Filters parallel to heading '+width,Math.abs(initial.bar.y-initial.title.y)<20,initial);
   const before=await p.locator('#mlxScanSelect-reception button').count();
   await p.locator('#mlxScanSelect-reception button').nth(1).click();
   const click=await p.evaluate(()=>{
     const bar=document.getElementById('mlxScanSelect-reception');
     return {n:bar.querySelectorAll('button').length,active:[...bar.querySelectorAll('button')].filter(x=>x.getAttribute('aria-pressed')==='true').map(x=>x.textContent.trim())};
   });
   check('Filter retains its original click listener '+width,click.n===before&&click.active.includes('CT'),click);
   if(width===1600){
     // User screenshot shows an additional "Other" chip in some installed shells.
     // Ensure responsive layout supports it too; do not ship a duplicate button.
     const five=await p.evaluate(()=>{
       const bar=document.getElementById('mlxScanSelect-reception'),h=bar.parentElement;
       const alreadyHasOther=[...bar.querySelectorAll('button')].some(x=>x.textContent.trim()==='Other');
       const other=alreadyHasOther?null:document.createElement('button');
       if(other){other.type='button';other.textContent='Other';other.setAttribute('aria-pressed','false');bar.appendChild(other)}
       const fifth=other||[...bar.querySelectorAll('button')].find(x=>x.textContent.trim()==='Other');
       const result={n:bar.querySelectorAll('button').length,buttonHeight:fifth?.getBoundingClientRect().height||0,overflow:h.scrollWidth>h.clientWidth+4};
       other?.remove();return result;
     });
     check('Five existing/synthetic filters also fit horizontally',five.n===5&&five.buttonHeight<=30&&!five.overflow,five);
     await p.evaluate(()=>document.body.classList.add('adc-dark-mode'));
     await p.waitForTimeout(100);
     const dark=await p.evaluate(()=>{
       const b=document.querySelector('#mlxScanSelect-reception button:not([aria-pressed="true"])'),style=getComputedStyle(b);
       return {background:style.backgroundColor,text:style.color};
     });
     const rgb=x=>x.match(/\d+/g).slice(0,3).map(Number);
     const lum=x=>rgb(x).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;}).reduce((a,b,i)=>a+b*[0.2126,0.7152,0.0722][i],0);
     const L=[lum(dark.text),lum(dark.background)].sort((a,b)=>b-a);
     const contrast=(L[0]+0.05)/(L[1]+0.05);
     check('Dark mode button contrast accessible',contrast>=4.5,{...dark,contrast});
   }
   const newErrors=errors.filter(e=>/mlx10413|moveExistingFilters/.test(e));
   check('No new 10.4.13 JavaScript exception '+width,newErrors.length===0,newErrors);
   await p.close();
  }
  console.log('PASS MediLab X 10.4.13 production-source filter layout QA');
 }finally{await b.close()}
}
main().catch(e=>{console.error(e.stack||String(e));process.exit(1)});
