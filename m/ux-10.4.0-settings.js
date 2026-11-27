(()=>{
'use strict';
/* 10.4: render real Settings beside persistent tiles, preserve ALL original handlers. */
const q=s=>document.querySelector(s);
let activeKey='centre',busy=false,adminTab='users',adminBound=false,observing=false;
const settings=()=>q('#settings'),left=()=>q('#adcSettingsList'),right=()=>q('#adcSettingsViews');
function ready(){
 const shell=q('#settings .adc-settings-shell'),layout=q('#settings .mlx-mac-layout');
 return !!(shell&&layout&&left()&&right());
}
function fit(){
 const root=settings();if(!root?.classList.contains('active'))return;
 const top=root.getBoundingClientRect().top;
 const size=Math.max(315,Math.floor(innerHeight-top-12));
 root.style.setProperty('--ml104-height',size+'px');
}
function chosen(key,reset){
 if(!ready()||busy)return false;
 const l=left(),r=right();
 const panel=[...r.querySelectorAll('.adc-setting-view')].find(p=>p.dataset.settingView===key);
 if(!panel)return false; /* Doctor Directory keeps original separate modal behavior. */
 busy=true;
 try{
  l.hidden=false;r.hidden=false;
  r.querySelectorAll('.adc-setting-view').forEach(p=>p.hidden=p!==panel);
  const empty=r.querySelector('.mlx-pref-empty');if(empty)empty.hidden=true;
  l.querySelectorAll('button[data-open-settings]').forEach(b=>{
   const yes=b.dataset.openSettings===key;
   if(yes)b.setAttribute('aria-current','page');
   else b.removeAttribute('aria-current');
  });
  if(reset&&key!==activeKey)r.scrollTop=0;
  activeKey=key;
 }finally{busy=false}
 return true;
}
function adminPanels(root){
 return [...root.querySelectorAll(':scope > .panel,:scope > section.panel,:scope > .adc-admin-onecol > .panel')];
}
function adminKind(panel){
 const title=(panel.querySelector('h2')?.textContent||'').toLowerCase();
 if(panel.classList.contains('mlx-admin-operations')||/employee|laboratory stock|inventory/.test(title))return 'operations';
 if(panel.id==='ml85DoctorAnalytics'||/doctor|referral/.test(title))return 'doctors';
 if(/delet|archive|pin|security/.test(title))return 'security';
 return 'users';
}
function showAdmin(cat){
 const root=q('#admin'),nav=q('#ml10AdminNav');if(!root||!nav)return;
 adminTab=cat;
 nav.querySelectorAll('button[data-ml10-cat]').forEach(b=>{
  const on=b.dataset.ml10Cat===cat;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
 });
 adminPanels(root).forEach(panel=>{
  const kind=adminKind(panel);
  panel.dataset.ml104Category=kind;
  panel.style.setProperty('display',kind===cat?'':'none','important');
 });
 const jump=q('#ml85DoctorsJump');
 if(jump?.parentElement)jump.parentElement.hidden=cat!=='doctors';
 root.dataset.ml104Admin=cat;
}
function adminSetup(){
 const root=q('#admin'),nav=q('#ml10AdminNav');if(!root||!nav)return;
 if(!nav.querySelector('[data-ml10-cat="operations"]')&&adminPanels(root).some(p=>adminKind(p)==='operations')){
  const b=document.createElement('button');b.type='button';b.dataset.ml10Cat='operations';b.textContent='Staff & Stock';nav.append(b);
 }
 if(!adminBound){
  adminBound=true;
  nav.addEventListener('click',e=>{
   const b=e.target.closest('button[data-ml10-cat]');
   if(b)setTimeout(()=>showAdmin(b.dataset.ml10Cat),0);
  });
  document.addEventListener('click',e=>{
   if(e.target.closest('#nav button[data-page="admin"]'))setTimeout(()=>showAdmin(adminTab),80);
  });
 }
 showAdmin(adminTab);
}
function mount(){
 const root=settings();if(!ready()||!root)return;
 document.body.classList.add('ml104-online');
 root.querySelector('.mlx-pref-empty')?.setAttribute('hidden','');
 const header=q('#settings .adc-settings-lead p');
 if(header&&header.dataset.ml104Header!=='1'){
  header.textContent='Choose a category on the left. Its settings appear on the right.';
  header.dataset.ml104Header='1';
 }
 const badge=q('#settings .adc-settings-version');if(badge)badge.textContent='MediLab X 10.4';
 if(!observing){
  observing=true;
  const list=left(),pane=right();
  list.addEventListener('click',e=>{
   const b=e.target.closest('button[data-open-settings]');if(!b)return;
   const k=b.dataset.openSettings;
   if(k==='mlxdoctors')return; // Original dialog—not an in-pane category.
   setTimeout(()=>chosen(k,true),0);
   setTimeout(()=>chosen(k,false),100);
  });
  document.addEventListener('click',e=>{
   if(e.target.closest('#nav button[data-page="settings"]')){
    setTimeout(()=>{fit();chosen(activeKey,false)},30);
    setTimeout(()=>{fit();chosen(activeKey,false)},125);
   }
  });
  window.addEventListener('resize',fit,{passive:true});
  let queued=false;
  new MutationObserver(muts=>{
   if(busy||queued)return;
   if(muts.some(m=>m.type==='childList'||m.attributeName==='hidden')){
    queued=true;requestAnimationFrame(()=>{queued=false;chosen(activeKey,false)});
   }
  }).observe(pane,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:false});
  new MutationObserver(muts=>{
   if(muts.some(m=>m.attributeName==='class'&&root.classList.contains('active'))){
    setTimeout(()=>{fit();chosen(activeKey,false)},70);
   }
  }).observe(root,{attributes:true,attributeFilter:['class']});
 }
 fit();
 const open=[...right().querySelectorAll('.adc-setting-view')].find(x=>!x.hidden);
 chosen(open?.dataset.settingView||activeKey,false);
 adminSetup();
}
function start(){
 mount();
 setTimeout(mount,300);setTimeout(mount,900);setTimeout(mount,1800);setTimeout(mount,3200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();