#!/usr/bin/env node
// Test production-source 10.4.12 UI patch with synthetic, non-patient data only.
'use strict';
const fs=require('node:fs'),{chromium}=require('playwright');
const html=fs.readFileSync(process.argv[2]||'/tmp/MediLabX-10.4.12-QA.html','utf8');
function pass(title,ok,details){if(!ok)throw Error('FAIL '+title+' '+JSON.stringify(details));console.log('PASS '+title)}
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[1600,950],[1100,800],[990,680]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.setContent(html,{waitUntil:'domcontentloaded',timeout:55000});
   await page.waitForTimeout(1450);
   let state=await page.evaluate(()=>{
    const $=id=>document.getElementById(id);
    const h=$('adc85UpdateHeading'),hero=document.querySelector('#settings .mlx1050-updates-header h3');
    const summary=$('mlx1049WhatsNew')?.querySelector('summary'),stat=document.querySelector('#settings .mlx1050-updates-cards .mlx1050-stat:first-child strong');
    return {
      loaded:document.body.classList.contains('mlx10412'),
      original:['testResults','testSearch','patientForm','patientRows','adc85UpdateNow','adc85RestoreUpdate','adc85CheckUpdates'].every(id=>!!$(id)),
      singleHeading:h?.textContent==='Current UI version: 10.4.12'&&getComputedStyle(h,'::after').content==='none',
      heroColor:hero?getComputedStyle(hero).color:null,
      heroFill:hero?getComputedStyle(hero).webkitTextFillColor:null,
      statText:stat?.textContent,statAfter:stat?getComputedStyle(stat,'::after').content:null,
      summary:summary?.textContent,summaryAfter:summary?getComputedStyle(summary,'::after').content:null,
      summaryAlign:summary?getComputedStyle(summary).textAlign:null,
      about:document.querySelector('#about .mlx-version')?.textContent,
      testsToggle:!!$('mlx10412TestExpand')
    };
   });
   console.log('VIEW',width,JSON.stringify(state));
   pass('Existing clinic/update controls kept '+width,state.loaded&&state.original&&state.testsToggle,state);
   pass('Current version appears once '+width,state.singleHeading&&state.statText==='10.4.12'&&state.statAfter==='none',state);
   pass('Hero text high-contrast '+width,state.heroColor==='rgb(248, 251, 255)'&&state.heroFill==='rgb(248, 251, 255)',state);
   pass('Single left-aligned Whats New '+width,state.summary?.includes('10.4.12')&&state.summaryAfter==='none'&&state.summaryAlign==='left',state);
   await page.evaluate(()=>{
    const list=document.getElementById('testResults');
    list.innerHTML=Array.from({length:16},(_,i)=>'<div class="result"><div><b>Test '+(i+1)+'</b><div class="muted">Radiology</div></div><button type="button" class="primary small" data-add="'+i+'">Add</button></div>').join('');
   });
   await page.waitForTimeout(100);
   const inspect=()=>page.evaluate(()=>{
     const list=document.getElementById('testResults'),rows=[...list.querySelectorAll(':scope > .result')],button=document.getElementById('mlx10412TestExpand');
     return{count:rows.length,visible:rows.filter(e=>getComputedStyle(e).display!=='none').length,overflow:getComputedStyle(list).overflowY,btn:button.textContent,expanded:button.getAttribute('aria-expanded'),hidden:button.hidden}
   });
   state=await inspect();
   pass('Four compact rows; no internal scroll '+width,state.count===16&&state.visible===4&&state.overflow==='visible'&&!state.hidden,state);
   await page.evaluate(()=>document.getElementById('mlx10412TestExpand').click());
   await page.waitForTimeout(65);
   state=await inspect();
   pass('Show all retains every available Add action '+width,state.visible===16&&state.expanded==='true',state);
   await page.evaluate(()=>{
      document.getElementById('mlx10412TestExpand').click();
      document.getElementById('testSearch').value='synthetic';
      const list=document.getElementById('testResults');
      list.innerHTML=Array.from({length:16},(_,i)=>'<div class="result"><b>Matching '+i+'</b><button type="button" data-add="'+i+'">Add</button></div>').join('');
   });
   await page.waitForTimeout(90);
   state=await inspect();
   pass('Six matches visible on search; all still reachable '+width,state.visible===6&&state.count===16,state);
   if(width===1600){
     await page.evaluate(()=>{
       const offer=document.getElementById('adc85UpdateOffer');offer.hidden=false;
       document.getElementById('adc85NewVersion').textContent='MediLab X 10.4.13';
     });
     await page.waitForTimeout(160);
     const offered=await page.evaluate(()=>document.querySelector('#mlx1049WhatsNew summary')?.textContent||'');
     pass('Available release takes next version in Whats New',offered.includes('10.4.13'),{offered});
     await page.evaluate(()=>{
       document.getElementById('adc85UpdateOffer').hidden=true;
       document.body.classList.add('adc-dark-mode');
     });
     await page.waitForTimeout(120);
     const dark=await page.evaluate(()=>{
       const h=document.querySelector('#settings .mlx1050-updates-header h3'),w=document.querySelector('#settings #mlx1049WhatsNew summary');
       return {hero:getComputedStyle(h).color,summaryColor:getComputedStyle(w).color,version:getComputedStyle(document.getElementById('adc85UpdateHeading')).color};
     });
     pass('Dark theme contrast and old duplicate suppressed',dark.hero==='rgb(248, 251, 255)'&&dark.summaryColor!=='rgb(22, 38, 59)',dark);
   }
   const ownErrors=errors.filter(x=>/mlx10412|syncVersions|setupTests|syncTestList/.test(x));
   pass('No new patch JS exceptions '+width,ownErrors.length===0,ownErrors);
   await page.close();
  }
  console.log('PASS MediLab X 10.4.12 production-source UI regression');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack||String(e));process.exit(1)});
