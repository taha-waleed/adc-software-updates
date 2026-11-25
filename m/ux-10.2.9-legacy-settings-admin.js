(()=>{
'use strict';
/* Lightweight additive 10.2.9 enhancement, deliberately NOT a new settings engine.
   All existing events (roles, user creation, doctors, PIN, backup, updater) stay native. */
const q=sel=>document.querySelector(sel);
const qa=sel=>Array.from(document.querySelectorAll(sel));
const glyphs={
 centre:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-7h6v7"/>',
 appearance:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
 updates:'<path d="M21 12a9 9 0 0 0-15.4-6.4L3 8M3 3v5h5M3 12a9 9 0 0 0 15.4 6.4L21 16m0 5v-5h-5"/>',
 backup:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
 users:'<circle cx="9" cy="8" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M19 8v6m-3-3h6"/>',
 doctor:'<path d="M5 3v6a5 5 0 0 0 10 0V3M10 14v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="12" r="2"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
 archive:'<rect x="3" y="4" width="18" height="6" rx="2"/><path d="M5 10v11h14V10M10 15h4"/>'
};
function svg(name){
 const ns='http://www.w3.org/2000/svg';
 const item=document.createElementNS(ns,'svg');
 item.setAttribute('viewBox','0 0 24 24');
 item.setAttribute('aria-hidden','true');
 item.setAttribute('focusable','false');
 item.innerHTML=glyphs[name]||glyphs.centre;
 return item;
}
const quick=[
 ['centre','Centre & Receipts','Centre details and receipt preferences'],
 ['appearance','Appearance & Themes','Light or dark mode and display settings'],
 ['updates','Software Updates','Secure GitHub release checks'],
 ['backup','Backup & Data','Export or restore centre records']
];
function settingsHome(){
 const empty=q('#settings .mlx-pref-empty'),list=q('#adcSettingsList');
 if(!empty||!list||empty.dataset.mlx29Home)return;
 const ready=quick.filter(x=>q('#adcSettingsList button[data-open-settings="'+x[0]+'"]'));
 if(!ready.length)return;
 const over=document.createElement('div');over.className='mlx29-home-overline';over.textContent='WORKSPACE PREFERENCES';
 const title=document.createElement('h3');title.textContent='Settings at a glance';
 const desc=document.createElement('p');desc.textContent='Find the controls you need without changing how MediLab X works. Select a section from the left or open one below.';
 const grid=document.createElement('div');grid.className='mlx29-quick-grid';
 for(const [id,name,description] of ready){
  const btn=document.createElement('button');
  btn.type='button';btn.className='mlx29-quick';btn.dataset.mlx29Open=id;
  const icon=document.createElement('span');icon.className='mlx29-quick-icon';icon.append(svg(id));
  const heading=document.createElement('strong');heading.textContent=name;
  const small=document.createElement('small');small.textContent=description;
  btn.append(icon,heading,small);grid.append(btn);
 }
 const note=document.createElement('div');note.className='mlx29-home-note';
 note.textContent='Your original patient database, user accounts and settings controls remain unchanged. Back up centre records before restoring data or installing updates.';
 empty.classList.add('mlx29-home');
 empty.replaceChildren(over,title,desc,grid,note);
 empty.dataset.mlx29Home='1';
 // A quick shortcut delegates to the real existing category button.
 empty.addEventListener('click',e=>{
  const shortcut=e.target.closest('button[data-mlx29-open]');
  if(!shortcut)return;
  const native=q('#adcSettingsList button[data-open-settings="'+shortcut.dataset.mlx29Open+'"]');
  if(native&&!native.disabled)native.click();
 });
}
function settingsActive(){
 const list=q('#adcSettingsList'),views=q('#adcSettingsViews');
 if(!list||!views)return;
 const active=views.querySelector('.adc-setting-view:not([hidden])');
 for(const btn of list.querySelectorAll('button[data-open-settings]')){
  const selected=!!active&&btn.dataset.openSettings===active.dataset.settingView;
  if(selected&&btn.getAttribute('aria-current')!=='page')btn.setAttribute('aria-current','page');
  if(!selected&&btn.hasAttribute('aria-current'))btn.removeAttribute('aria-current');
 }
 const empty=views.querySelector('.mlx-pref-empty');
 if(empty){
  if(empty.hidden!==!!active)empty.hidden=!!active;
  const needed=active?'none':'block';
  if(empty.style.display!==needed)empty.style.display=needed;
 }
}
let navBound=false;
function settingsListeners(){
 if(navBound)return;
 const list=q('#adcSettingsList'),views=q('#adcSettingsViews');
 if(!list||!views)return;
 navBound=true;
 let queued=false;
 new MutationObserver(()=>{
  if(queued)return;queued=true;
  requestAnimationFrame(()=>{queued=false;settingsActive()});
 }).observe(views,{attributes:true,subtree:true,attributeFilter:['hidden']});
 list.addEventListener('click',e=>{
  if(!e.target.closest('button[data-open-settings]'))return;
  // Let original MediLab X category code show the real form first.
  setTimeout(settingsActive,0);
 },false);
 settingsActive();
}
function adminHeaders(){
 const admin=q('#admin');if(!admin)return;
 for(const head of admin.querySelectorAll('.panel-head h2')){
  if(head.dataset.mlx29Icon)return;
  const label=(head.textContent||'').toLowerCase();
  const key=label.includes('user')?'users':label.includes('doctor')?'doctor':label.includes('pin')?'shield':label.includes('delet')?'archive':null;
  if(!key)continue;
  const icon=document.createElement('span');icon.className='mlx29-admin-icon';icon.setAttribute('aria-hidden','true');icon.append(svg(key));
  head.prepend(icon);head.dataset.mlx29Icon=key;
 }
}
function ariaForms(){
 const user=q('#userForm'),role=q('#uRole');
 if(user&&role&&!role.getAttribute('aria-label'))role.setAttribute('aria-label','User role');
 const field=q('#adcPermissionPicker');if(field&&!field.getAttribute('aria-label'))field.setAttribute('aria-label','Pages this user can access');
}
let pending=false;
function mount(){
 if(pending)return;pending=true;
 requestAnimationFrame(()=>{
  pending=false;document.body?.classList.add('mlx29-legacy');
  settingsHome();settingsListeners();settingsActive();
  adminHeaders();ariaForms();
 });
}
function start(){
 mount();
 // Legacy app builds Settings/Admin containers asynchronously; watch only their direct children.
 const admin=q('#admin'),settings=q('#settings');
 if(admin)new MutationObserver(mount).observe(admin,{childList:true,subtree:false});
 if(settings)new MutationObserver(mount).observe(settings,{childList:true,subtree:false});
 setTimeout(mount,380);setTimeout(mount,1250);
 document.addEventListener('click',e=>{
  if(e.target.closest('#nav button[data-page="settings"],#nav button[data-page="admin"]'))setTimeout(mount,30);
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();