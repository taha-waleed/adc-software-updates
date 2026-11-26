(()=>{
'use strict';
/* MediLab X 11 appearance applied to MediLab X 10.2.9.
   Delegates to the installed app's real theme, locks, settings, users, receipts and update handlers.
   Does NOT simulate patient data, subscriptions, print, backup, clinical writes or installer actions. */
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const icons={
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 userplus:'<circle cx="9" cy="8" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M19 8v6m-3-3h6"/>',
 patients:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M7 15h4"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"/>',
 calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
 wallet:'<path d="M3 5h16a2 2 0 0 1 2 2v12H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM2 9h19M16 14h2"/>',
 chart:'<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-9"/>',
 doctor:'<path d="M5 3v6a5 5 0 0 0 10 0V3M10 14v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="12" r="2"/>',
 printer:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M4.9 19.1 7 17m10-10 2.1-2.1"/>',
 palette:'<circle cx="12" cy="12" r="10"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16" cy="10" r="1"/><path d="M12 20a2 2 0 0 0 0-4h1a2 2 0 0 0 2-2"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
 refresh:'<path d="M21 12a9 9 0 0 0-15.4-6.4L3 8M3 3v5h5M3 12a9 9 0 0 0 15.4 6.4L21 16m0 5v-5h-5"/>',
 database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
 code:'<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
 building:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-7h6v7"/>',
 whatsapp:'<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l1.9-5.6A8.4 8.4 0 1 1 21 11.5z"/><path d="m9.5 9 1.3 2.4a5 5 0 0 0 2.8 2.1l1.5-1"/>',
 brief:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6"/>',
 sparkles:'<path d="M12 3l2.1 5.1L19 10l-4.9 1.9L12 17l-2.1-5.1L5 10l4.9-1.9z"/>',
 layout:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v5M12 8h.01"/>'
};
function svg(name){
 const element=document.createElementNS('http://www.w3.org/2000/svg','svg');
 element.setAttribute('viewBox','0 0 24 24');
 element.setAttribute('aria-hidden','true');
 element.setAttribute('focusable','false');
 element.innerHTML=icons[name]||icons.file;
 return element;
}
const nav={
 dashboard:'grid',reception:'userplus',patients:'patients',reports:'file',
 daily:'calendar',expenses:'wallet',earnings:'chart',ratelist:'file',
 admin:'shield',settings:'settings',about:'info'
};
const setting={
 centre:'building',whatsapp:'whatsapp',mlxdoctors:'doctor',printlayout:'printer',
 appearance:'palette',animations:'sparkles',ml10layout:'layout',brief:'brief',
 mlxnotifications:'bell',updates:'refresh',backup:'database',developer:'code',
 licence:'shield',profeatures:'sparkles'
};
function iconsMount(){
 $$('#app #nav button[data-page]').forEach(b=>{
  const element=b.querySelector('.adc-nav-icon');const key=nav[b.dataset.page];
  if(!element||!key||element.dataset.mlx11Icon===key)return;
  element.replaceChildren(svg(key));element.dataset.mlx11Icon=key;
 });
 $$('#adcSettingsList button[data-open-settings]').forEach(b=>{
  const element=b.querySelector('.adc-setting-symbol');const key=setting[b.dataset.openSettings]||'settings';
  if(!element||element.dataset.mlx11Icon===key)return;
  element.replaceChildren(svg(key));element.dataset.mlx11Icon=key;
 });
}
let lockedNode=null,lockTime=null;
function ensureLock(){
 const cover=$('#mlx101Standby');
 if(!cover)return;
 lockedNode=cover;
 if(cover.dataset.mlx11LockReady==='1'){lockTime=$('#mlx11LockTime');return}
 const card=cover.querySelector('.mlx101-card');
 if(!card)return;
 cover.dataset.mlx11LockReady='1';
 const display=document.createElement('div');
 display.id='mlx11LockTime';
 display.setAttribute('aria-live','off');
 const digits=document.createElement('span');digits.id='mlx11LockDigits';digits.textContent='--:--';
 const ampm=document.createElement('span');ampm.id='mlx11LockPeriod';
 display.append(digits,ampm);
 const old=card.querySelector('#mlx101Clock');
 if(old)old.insertAdjacentElement('afterend',display);else card.append(display);
 lockTime=display;
 cover.setAttribute('aria-label','MediLab X private workspace. Click or press any key to unlock.');
 const kicker=cover.querySelector('.mlx101-kicker');
 if(kicker)kicker.textContent='SESSION PROTECTED';
 const tip=cover.querySelector('.mlx101-tap');
 if(tip)tip.textContent='↗  Click anywhere to unlock';
 updateClock();
}
function updateClock(){
 if(!lockedNode||lockedNode.hidden||!lockedNode.classList.contains('mlx101-show'))return;
 const now=new Date();
 const parts=new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}).formatToParts(now);
 const part=t=>parts.find(p=>p.type===t)?.value||'';
 const digits=$('#mlx11LockDigits'),am=$('#mlx11LockPeriod');
 if(digits)digits.textContent=part('hour')+':'+part('minute');
 if(am)am.textContent=part('dayPeriod').toLowerCase();
 const date=$('#mlx101Date');
 if(date)date.textContent=new Intl.DateTimeFormat('en-US',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(now).toUpperCase();
}
let scheduled=false;
function mount(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{
  scheduled=false;
  document.body?.classList.add('mlx11-ui');
  iconsMount();ensureLock();
 });
}
function start(){
 mount();
 const navElement=$('#nav'),list=$('#adcSettingsList');
 if(navElement)new MutationObserver(mount).observe(navElement,{childList:true,subtree:false});
 if(list)new MutationObserver(mount).observe(list,{childList:true,subtree:false});
 const body=document.body;
 if(body)new MutationObserver(mutations=>{
  if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&n.id==='mlx101Standby')))mount();
 }).observe(body,{childList:true,subtree:false});
 // Render the live clock on the first lock frame, not after the original one-second timer.
 document.addEventListener('click',ev=>{
  if(ev.target.closest('#mlx101StandbyLock'))requestAnimationFrame(updateClock);
  if(ev.target.closest('#nav button[data-page],#adcSettingsList button[data-open-settings]'))mount();
 },true);
 setInterval(updateClock,1000);
 setTimeout(mount,450);setTimeout(mount,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();