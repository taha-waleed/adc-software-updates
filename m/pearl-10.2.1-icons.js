/* MediLab X 10.2.1: presentation-only icon replacement + CSS mounting.
   No existing button nodes or event listeners are replaced. */
(()=>{
'use strict';
const FONT='https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap';
const iconPaths={
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
  reception:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 8v6m-3-3h6"/>',
  patients:'<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="2.4"/><path d="M8 16c.8-2.5 7.2-2.5 8 0"/>',
  reports:'<path d="M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h5M8 12h8M8 16h6"/>',
  daily:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h3m3 0h3"/>',
  expenses:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 10h18m-5 5h2"/>',
  earnings:'<path d="M4 20V11m5 9V7m5 13V13m5 7V4"/><path d="M2 21h20"/>',
  admin:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20v-2.1c0-2.4 2.5-4 6.5-4 1.2 0 2.3.2 3.2.6"/><circle cx="17.5" cy="16.5" r="3.3"/><path d="M17.5 14.5v4m-2-2h4"/>',
  settings:'<path d="M10 2h4l.8 2.7 2.1.9 2.5-1.2 2.1 3.5-2 2 .2 2.3 2.2 1.9-2 3.5-2.7-.7-1.9 1.5L14 21h-4l-.8-2.7-2.1-.9-2.5 1.2-2.1-3.5 2-2-.2-2.3-2.2-1.9 2-3.5 2.7.7 1.9-1.5L10 2Z" transform="translate(0 -0.2) scale(.93) translate(.9 .9)"/><circle cx="12" cy="12" r="2.5"/>',
  about:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  rates:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  lab:'<path d="M9 3h6m-4 0v7l-5 8a2 2 0 0 0 1.8 3h8.4A2 2 0 0 0 18 18l-5-8V3M8 16h8"/>',
  centre:'<path d="M3 10 12 3l9 7v11H3V10Z"/><path d="M9 21v-7h6v7"/>',
  whatsapp:'<path d="M21 11.7A8.9 8.9 0 0 1 8.7 20l-5.6 1 1.2-5.3A9 9 0 1 1 21 11.7Z"/><path d="M8 9c1 3 3.5 5.5 6.4 6.7l1.4-1.2"/>',
  appearance:'<circle cx="12" cy="12" r="9"/><path d="M12 4v16M4 12h16"/>',
  animation:'<path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7L12 2Z"/>',
  printing:'<path d="M6 9V3h12v6M6 18H4V9h16v9h-2M6 15h12v6H6v-6Z"/>',
  brief:'<path d="M4 6h16M4 11h12M4 16h16m-16 4h10"/>',
  notifications:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  updates:'<path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v6h-6"/>',
  backup:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 8h8M8 12h8m-4 0v5m-3-3 3 3 3-3"/>',
  developer:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 14"/>',
  security:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  layout:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
  doctors:'<path d="M7 3h10M9 3v7a4 4 0 0 0 8 0V3m-4 11v5a3 3 0 0 0 6 0v-2"/><circle cx="19" cy="16" r="2"/>',
  general:'<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>'
};
const svg=(name)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(iconPaths[name]||iconPaths.general)+'</svg>';
const settingsMap={centre:'centre',appearance:'appearance',animations:'animation',brief:'brief',whatsapp:'whatsapp',gemini:'animation',printlayout:'printing',updates:'updates',backup:'backup',doctors:'doctors',mlxdoctors:'doctors',developer:'developer',notifications:'notifications',licence:'security',profeatures:'layout',layout:'layout',general:'settings',accounts:'admin'};
function decorate(){
 const root=document.body;if(!root)return;
 root.classList.add('mlx1021-polished');
 for(const group of document.querySelectorAll('#app .sidebar .ml-nav-group')) {
   // Legacy !important selector has greater specificity than skin rules; inline important avoids the original bug.
   group.style.setProperty('color','#b9cbe3','important');
   group.style.setProperty('-webkit-text-fill-color','#b9cbe3','important');
   group.style.setProperty('opacity','1','important');
 }
 for(const button of document.querySelectorAll('#app #nav button[data-page]')){
  const icon=button.querySelector('.adc-nav-icon');if(!icon||icon.dataset.mlx1021Icon==='1')continue;
  const key={dashboard:'dashboard',reception:'reception',patients:'patients',reports:'reports',daily:'daily',expenses:'expenses',earnings:'earnings',admin:'admin',settings:'settings',about:'about',ratelist:'rates',mlxOperations:'lab'}[button.dataset.page]||'general';
  icon.innerHTML=svg(key);icon.dataset.mlx1021Icon='1';
 }
 const dark=root.dataset.mlx101Mode==='dark';
 const ink=dark?'#f1f5fb':'#223148';
 const muted=dark?'#bccbdf':'#617187';
 const iconColor=dark?'#acd0ff':'#145ed0';
 for(const button of document.querySelectorAll('#settings .adc-settings-item')){
  // The old Settings theme CSS has hard-coded !important text colours.
  // Explicitly set descendants so labels stay legible in both themes.
  button.style.setProperty('color',ink,'important');
  button.style.setProperty('-webkit-text-fill-color',ink,'important');
  for(const child of button.querySelectorAll('.adc-setting-copy,.adc-setting-copy strong,.adc-setting-chevron')){
   child.style.setProperty('color',ink,'important');
   child.style.setProperty('-webkit-text-fill-color',ink,'important');
  }
  for(const child of button.querySelectorAll('.adc-setting-copy small')){
   child.style.setProperty('color',muted,'important');
   child.style.setProperty('-webkit-text-fill-color',muted,'important');
  }
  const icon=button.querySelector('.adc-setting-symbol');
  if(icon){
   icon.style.setProperty('color',iconColor,'important');
   icon.style.setProperty('-webkit-text-fill-color',iconColor,'important');
  }
  if(!icon||icon.dataset.mlx1021Icon==='1')continue;
  const key=settingsMap[button.dataset.openSettings]||'general';
  icon.innerHTML=svg(key);icon.dataset.mlx1021Icon='1';
 } 
}
function boot(){
 if(!document.body)return;
 // Online font is optional: the explicit system fallback works when the clinic PC is offline.
 if(!document.getElementById('mlx1021-manrope-font')){
  const link=document.createElement('link');link.id='mlx1021-manrope-font';link.rel='stylesheet';link.href=FONT;
  document.head?.appendChild(link);
 }
 decorate();
 const theme=document.getElementById('mlx1021-contrast-fix');
 if(theme&&document.head&&document.head.lastElementChild!==theme)document.head.appendChild(theme);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(boot,500);setTimeout(boot,1800);
// Theme state toggles do not replace settings buttons; update their colours on switch.
function watchTheme(){
 const root=document.body;if(!root)return;
 new MutationObserver(()=>decorate()).observe(root,{attributes:true,attributeFilter:['data-mlx101-mode']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchTheme,{once:true});else watchTheme();
})();
