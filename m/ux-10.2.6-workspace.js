(()=>{
'use strict';
/* Visual-only MediLab X 10.2.6. Existing authenticated app actions are delegated
   to the original buttons. Clinical records, updater and local storage are untouched. */
const Q=s=>document.querySelector(s), QA=s=>Array.from(document.querySelectorAll(s));
const PATH={
 settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M4.9 19.1 7 17m10-10 2.1-2.1"/>',
 building:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/>',
 whatsapp:'<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l1.9-5.6A8.4 8.4 0 1 1 21 11.5z"/><path d="m9.6 9.1 1.1 2.1a5 5 0 0 0 2.8 2.3l1.5-1.1"/>',
 doctor:'<path d="M5 3v6a5 5 0 0 0 10 0V3m-5 11v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="12" r="2"/>',
 printer:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
 palette:'<circle cx="12" cy="12" r="10"/><circle cx="7.5" cy="10" r="1"/><circle cx="12" cy="6.8" r="1"/><circle cx="16" cy="10" r="1"/><path d="M12 20a2 2 0 0 0 0-4h1a2 2 0 0 0 2-2"/>',
 sparkles:'<path d="m12 2 2.1 6 5.9 2-5.9 2L12 18l-2.1-6L4 10l5.9-2L12 2zM19 18v4m-2-2h4"/>',
 layout:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18"/>',
 news:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
 refresh:'<path d="M21 12a9 9 0 0 0-15-6.7L3 8M3 3v5h5M3 12a9 9 0 0 0 15 6.7L21 16M16 16h5v5"/>',
 backup:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
 code:'<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6m-3-3h6"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 patients:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 10h18M7 15h4"/>',
 report:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"/>',
 calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
 coins:'<path d="M12 2v20M17 5H9a4 4 0 1 0 0 8h6a4 4 0 1 1 0 8H6"/>',
 calculator:'<rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 7h8M8 12h1m6 0h1M8 17h1m6 0h1"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v5M12 8h.01"/>',
 lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 home:'<path d="m3 11 9-8 9 8v10H3V11z"/><path d="M9 21v-7h6v7"/>'
};
function svg(name){return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">'+(PATH[name]||PATH.settings)+'</svg>';}
const NAV={dashboard:'dashboard',reception:'users',patients:'patients',reports:'report',daily:'calendar',expenses:'coins',earnings:'calculator',ratelist:'report',admin:'shield',settings:'settings',about:'info',mlxOperations:'backup'};
const SET={
 centre:'building',whatsapp:'whatsapp',mlxdoctors:'doctor',printlayout:'printer',
 appearance:'palette',animations:'sparkles',ml10layout:'layout',brief:'news',
 mlxnotifications:'bell',updates:'refresh',backup:'backup',developer:'code',
 licence:'shield',profeatures:'sparkles',gemini:'sparkles'
};
const USER_CARDS=[
 {key:'centre',icon:'building',title:'Centre & Receipts',sub:'Centre details, billing and receipt preferences'},
 {key:'appearance',icon:'palette',title:'Appearance & Themes',sub:'Light and dark modes, comfortable typography'},
 {key:'updates',icon:'refresh',title:'Software Updates',sub:'Check verified GitHub releases securely'},
 {key:'backup',icon:'backup',title:'Backup & Data',sub:'Export or restore your local records'}
];
function mountWelcome(){
 const empty=Q('#settings .mlx-pref-empty');
 if(!empty||empty.dataset.mlx1026Welcome)return;
 const cards=USER_CARDS.filter(x=>Q('#adcSettingsList button[data-open-settings="'+x.key+'"]'));
 if(!cards.length)return;
 empty.dataset.mlx1026Welcome='1';
 const container=document.createElement('div');
 container.className='mlx26-welcome';
 container.innerHTML='<div class="mlx26-overline">MEDILAB X · CONFIGURATION</div>'+
 '<h3>Your workspace, your preferences</h3>'+
 '<p>Manage your diagnostic centre with a clear, organized settings workspace. Choose a category below or use the shortcuts on the left. Your existing settings and their original actions remain available.</p>'+
 '<div class="mlx26-quick-grid">'+cards.map(c=>'<button type="button" class="mlx26-quick" data-mlx26-open="'+c.key+'"><span class="mlx26-quick-icon">'+svg(c.icon)+'</span><strong>'+c.title+'</strong><small>'+c.sub+'</small></button>').join('')+'</div>'+
 '<div class="mlx26-tip">'+svg('shield')+'<span>Changes use MediLab X’s original controls. Back up patient records before installing software updates or restoring data.</span></div>';
 empty.replaceChildren(container);
 container.addEventListener('click',e=>{
  const button=e.target.closest('button[data-mlx26-open]');
  if(!button)return;
  const original=Q('#adcSettingsList button[data-open-settings="'+button.dataset.mlx26Open+'"]');
  if(original&&!original.disabled)original.click();
 });
}
function mountIcons(){
 document.body?.classList.add('mlx1026-polish');
 QA('#app #nav button[data-page]').forEach(b=>{
  const n=b.querySelector('.adc-nav-icon'),key=NAV[b.dataset.page]||'report';
  if(!n||n.dataset.mlx1026Svg===key)return;
  n.innerHTML=svg(key);n.dataset.mlx1026Svg=key;
 });
 QA('#adcSettingsList button[data-open-settings]').forEach(b=>{
  const n=b.querySelector('.adc-setting-symbol'),key=SET[b.dataset.openSettings]||'settings';
  if(!n||n.dataset.mlx1026Svg===key)return;
  n.innerHTML=svg(key);n.dataset.mlx1026Svg=key;
 });
 const admin=Q('#admin #ml10AdminNav');
 if(admin){
  QA('#admin #ml10AdminNav button').forEach((b,i)=>{
   if(b.querySelector('.mlx26-admin-icon'))return;
   const text=(b.textContent||'').toLowerCase();
   const key=/user|staff|employ|access/.test(text)?'users':
    /doctor/.test(text)?'doctor':/delet|archive|restore|record/.test(text)?'backup':
    /pin|secur/.test(text)?'shield':'settings';
   const n=document.createElement('span');n.className='mlx26-admin-icon';n.setAttribute('aria-hidden','true');n.innerHTML=svg(key);b.prepend(n);
  });
 }
 const orb=Q('#adc85UpdateOverlay .adc85-modal-orb');
 if(orb&&!orb.dataset.mlx1026Svg){orb.innerHTML=svg('refresh');orb.dataset.mlx1026Svg='yes';}
}
let queued=false;
function schedule(){
 if(queued)return;queued=true;
 requestAnimationFrame(()=>{queued=false;mountIcons();mountWelcome();});
}
function start(){
 schedule();
 const app=Q('#app'),list=Q('#adcSettingsList'),admin=Q('#admin');
 if(list)new MutationObserver(schedule).observe(list,{childList:true,subtree:false});
 if(admin)new MutationObserver(schedule).observe(admin,{childList:true,subtree:false});
 if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:false});
 document.addEventListener('click',e=>{
  if(e.target.closest('#nav button[data-page],#adcSettingsList button[data-open-settings],#ml10AdminNav button'))schedule();
 },true);
 setTimeout(schedule,400);setTimeout(schedule,1300);setTimeout(schedule,3100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();