(()=>{
'use strict';
/* 10.2.7: presentation and Settings navigation only.
   Five-minute automatic privacy lock, native unlock, user roles, clinical records and updater are unchanged. */
const $=q=>document.querySelector(q), $$=q=>Array.from(document.querySelectorAll(q));
const PREF='medilabx10_2_7_privacy_theme';
const LOCK='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
const HEART='<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M24.5 8.6c0 4.6-5.8 9.5-10.5 13C9.3 18.1 3.5 13.2 3.5 8.6c0-4.8 5.4-7.4 9.1-3.2l1.4 1.5 1.4-1.5c3.7-4.2 9.1-1.6 9.1 3.2z"/><path d="M4 13h6l2.1-4.7 3.4 8 2.1-3.3H24"/></svg>';
const presets=['Aurora Glass','Midnight','Neon Pulse','Aquarium','Frosted Light','Obsidian'];
let selected='2',barHidden=false,cover=null,screen=null;
try{const v=localStorage.getItem(PREF);if(/^[1-6]$/.test(v||''))selected=v;}catch(_){}
function applyPreset(id){
 if(!/^[1-6]$/.test(String(id)))return;
 selected=String(id);
 if(screen)screen.dataset.theme=selected;
 if(cover)$$('#mlx101Standby .mlx27-presets button[data-mlx27-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mlx27Theme===selected)));
 try{localStorage.setItem(PREF,selected)}catch(_){}
}
function formatClock(){
 if(!screen||!cover||cover.hidden)return;
 const d=new Date();
 const parts=new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}).formatToParts(d);
 const num=type=>parts.find(p=>p.type===type)?.value||'';
 const clock=$('#mlx27ClockDigits'),am=$('#mlx27ClockAmPm'),date=$('#mlx27Date');
 if(clock)clock.textContent=num('hour')+':'+num('minute');
 if(am)am.textContent=(num('dayPeriod')||'').toLowerCase();
 if(date)date.textContent=new Intl.DateTimeFormat('en-US',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d).toUpperCase();
}
function mountPrivacy(){
 const node=$('#mlx101Standby');
 if(!node)return;
 cover=node;
 if(node.dataset.mlx1027Ready==='1'){screen=node.querySelector('.mlx27-screen');return}
 node.dataset.mlx1027Ready='1';node.classList.add('mlx1027-privacy');
 node.setAttribute('aria-label','MediLab X private workspace. Click the background or press Escape to unlock.');
 const root=document.createElement('div');
 root.className='mlx27-screen';root.dataset.theme=selected;
 root.innerHTML=
  '<div class="mlx27-aura" aria-hidden="true"></div>'+
  '<div class="mlx27-brand"><span class="mlx27-brand-icon">'+HEART+'</span><div><strong>MediLab X</strong><small>Private Workspace · Locked</small></div></div>'+
  '<div class="mlx27-session"><div class="mlx27-shortcuts">Keys: 1–6 designs · H hides presets · Esc unlocks</div><div class="mlx27-session-label">SESSION PROTECTED</div></div>'+
  '<div class="mlx27-time"><div class="mlx27-time-line"><span class="mlx27-clock-digits" id="mlx27ClockDigits">--:--</span><span class="mlx27-clock-ampm" id="mlx27ClockAmPm"></span></div><div class="mlx27-date" id="mlx27Date"></div></div>'+
  '<div class="mlx27-bottom"><div class="mlx27-unlock-hint"><span aria-hidden="true">↗</span>Click anywhere to unlock</div>'+
  '<div class="mlx27-presets" role="group" aria-label="Privacy screen designs">'+presets.map((name,i)=>'<button type="button" data-mlx27-theme="'+(i+1)+'" aria-pressed="'+String(selected===String(i+1))+'"><span>'+(i+1)+'</span>'+name+'</button>').join('')+'</div>'+
  '<div class="mlx27-foot">AL HAMEED DIAGNOSTIC CENTRE · A PROJECT BY TAHA WALEED</div></div>';
 node.append(root);screen=root;
 const bar=root.querySelector('.mlx27-presets');
 bar.addEventListener('click',ev=>{
  const btn=ev.target.closest('button[data-mlx27-theme]');
  ev.preventDefault();ev.stopPropagation();
  if(btn)applyPreset(btn.dataset.mlx27Theme);
 });
 bar.addEventListener('pointerdown',ev=>ev.stopPropagation());
 bar.addEventListener('keydown',ev=>ev.stopPropagation());
 formatClock();
}
function mountTaskbar(){
 const top=$('#app .top .actions'),native=$('#mlx101StandbyLock');
 if(!top||!native||$('#mlx27PrivacyLock'))return;
 const btn=document.createElement('button');
 btn.id='mlx27PrivacyLock';btn.type='button';btn.title='Lock private workspace';
 btn.setAttribute('aria-label','Lock private workspace');
 btn.innerHTML=LOCK;
 btn.addEventListener('click',ev=>{
  ev.preventDefault();ev.stopPropagation();
  const active=$('#mlx101StandbyLock');
  if(active&&!active.disabled)active.click();
 });
 top.appendChild(btn);
}
let navBound=false;
function syncSettings(){
 const list=$('#adcSettingsList'),views=$('#adcSettingsViews');
 if(!list||!views)return;
 const active=views.querySelector('.adc-setting-view:not([hidden])');
 // Preserve the persistent left navigation used by this UI, not the old slide-out menu.
 if(list.hidden)list.hidden=false;
 if(views.hidden)views.hidden=false;
 const empty=views.querySelector('.mlx-pref-empty');
 if(empty){
  if(empty.hidden===!active){}else empty.hidden=!!active;
  const wanted=active?'none':'flex';
  if(empty.style.display!==wanted)empty.style.display=wanted;
 }
 list.querySelectorAll('button[data-open-settings]').forEach(btn=>{
  const chosen=!!active&&btn.dataset.openSettings===active.dataset.settingView;
  if(btn.classList.contains('mlx-pref-active')!==chosen)btn.classList.toggle('mlx-pref-active',chosen);
  if(chosen&&btn.getAttribute('aria-current')!=='page')btn.setAttribute('aria-current','page');
  if(!chosen&&btn.hasAttribute('aria-current'))btn.removeAttribute('aria-current');
 });
}
function repairCategory(key){
 const list=$('#adcSettingsList'),views=$('#adcSettingsViews');
 if(!key||!list||!views)return;
 const view=Array.from(views.querySelectorAll('.adc-setting-view')).find(x=>x.dataset.settingView===key);
 if(!view)return; // Never invent a functional panel for an unavailable feature.
 if(view.hidden){
  views.querySelectorAll('.adc-setting-view').forEach(x=>{x.hidden=x!==view});
 }
 syncSettings();
}
function mountSettings(){
 if(navBound)return;
 const list=$('#adcSettingsList'),views=$('#adcSettingsViews');
 if(!list||!views)return;
 navBound=true;
 list.addEventListener('click',ev=>{
  const button=ev.target.closest('button[data-open-settings]');
  if(!button||button.disabled)return;
  const key=button.dataset.openSettings;
  // Let original MediLab X handlers execute first (including security and data loading).
  setTimeout(()=>repairCategory(key),70);
  setTimeout(syncSettings,250);
 });
 views.addEventListener('click',ev=>{
  if(!ev.target.closest('[data-settings-back]'))return;
  setTimeout(()=>{
   views.querySelectorAll('.adc-setting-view').forEach(x=>{x.hidden=true});
   syncSettings();
  },75);
 });
 const nav=$('#nav');
 nav?.addEventListener('click',ev=>{
  if(ev.target.closest('button[data-page="settings"]'))setTimeout(syncSettings,130);
 });
 let queued=false;
 new MutationObserver(()=>{
  if(queued)return;queued=true;
  requestAnimationFrame(()=>{queued=false;syncSettings();});
 }).observe(views,{attributes:true,attributeFilter:['hidden'],subtree:true});
 syncSettings();
}
let pending=false;
function mount(){
 if(pending)return;pending=true;
 requestAnimationFrame(()=>{
  pending=false;
  document.body?.classList.add('mlx1027-ready');
  mountPrivacy();mountTaskbar();mountSettings();syncSettings();
 });
}
window.addEventListener('keydown',ev=>{
 if(!cover||cover.hidden||!cover.classList.contains('mlx101-show'))return;
 const target=ev.target;
 if(target&&/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))return;
 if(/^[1-6]$/.test(ev.key)){
  ev.preventDefault();ev.stopImmediatePropagation();applyPreset(ev.key);
 }else if(ev.key.toLowerCase()==='h'&&!ev.ctrlKey&&!ev.altKey&&!ev.metaKey){
  ev.preventDefault();ev.stopImmediatePropagation();
  barHidden=!barHidden;
  screen?.querySelector('.mlx27-presets')?.classList.toggle('mlx27-hidden',barHidden);
 }
},true);
function start(){
 mount();
 new MutationObserver(mutations=>{
  if(mutations.some(m=>Array.from(m.addedNodes).some(n=>n.nodeType===1&&(
   n.id==='mlx101Standby'||n.id==='mlx101StandbyLock'||n.id==='adcSettingsList'||n.id==='adcSettingsViews'
  ))))mount();
 }).observe(document.body,{childList:true,subtree:true});
 document.addEventListener('click',e=>{
  if(e.target.closest('#nav button[data-page="settings"],#adcSettingsList button[data-open-settings]'))mount();
 },true);
 setInterval(formatClock,1000);
 setTimeout(mount,450);setTimeout(mount,1600);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();