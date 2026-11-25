(()=>{
'use strict';
/* MediLab X 10.2.4 targeted UI-only fixes. Never simulate update/backup or replace native app handlers. */
const q=s=>document.querySelector(s);
function appearance(){
 const box=q('#mlxrControls');
 if(!box)return;
 const swatches=box.querySelector('.mlxr-swatches');
 if(swatches){
  const subtitle=swatches.previousElementSibling;
  const heading=subtitle&&subtitle.previousElementSibling;
  if(subtitle?.classList.contains('mlxr-sub')&&/buttons and highlights/i.test(subtitle.textContent||''))subtitle.remove();
  if(heading?.tagName==='H3'&&/accent colo(u)?r/i.test(heading.textContent||''))heading.remove();
  swatches.remove();
 }
 const legacy=q('#themeChoice')?.closest('.adc-settings-group');
 if(legacy)legacy.classList.add('mlx1024-legacy-appearance');
 const nav=q('#adcSettingsList button[data-open-settings="appearance"] small');
 if(nav&&/accent/i.test(nav.textContent||''))nav.textContent='Light / Dark modes, text size and display';
 // Retire only theme-accent preference: clinical storage keys and records remain untouched.
 try{
  const key='medilabx1023_reference_settings';
  const prefs=JSON.parse(localStorage.getItem(key)||'{}');
  if(prefs&&typeof prefs==='object'&&!Array.isArray(prefs)&&prefs.accent!==0){
   prefs.accent=0;localStorage.setItem(key,JSON.stringify(prefs));
  }
 }catch(_){}
}
function dateFilter(){
 const field=q('#patientFilterDate')?.closest('.field');
 if(!field)return;
 field.classList.add('mlxr24-date-field');
 const row=field.parentElement;
 if(row?.classList.contains('row'))row.classList.add('mlxr24-record-filters');
 const label=field.querySelector('label');
 if(label&&!label.htmlFor)label.htmlFor='patientFilterDate';
 const control=q('#patientFilterDate');
 if(control&&!control.getAttribute('aria-label'))control.setAttribute('aria-label','Record date');
 // Keep date value, checkbox behaviour, filtering and all event handlers untouched.
}
function updateRecovery(){
 const view=q('#settings .adc-setting-view[data-setting-view="updates"]');
 const backup=q('#settings .adc-setting-view[data-setting-view="backup"]');
 if(!view||!backup)return;
 view.classList.add('mlx1024-one-update-banner');
 const oldPanel=view.querySelector('.adc-admin-update');
 let details=q('#mlx1024Recovery');
 if(!details){
  details=document.createElement('details');
  details.id='mlx1024Recovery';
  details.className='mlx1024-recovery';
  const heading=document.createElement('summary');
  heading.textContent='Advanced update recovery and configuration';
  const actions=document.createElement('div');
  actions.className='mlx1024-recovery-actions';
  const entries=[
   ['Restore previous software version','adc85RestoreUpdate'],
   ['Update manually','adc85ManualUpdate']
  ];
  entries.forEach(([label,id])=>{
    if(!q('#'+id))return;
    const b=document.createElement('button');
    b.type='button';b.textContent=label;b.dataset.nativeAction=id;
    b.addEventListener('click',()=>{
      const native=q('#'+id);
      if(native&&!native.disabled)native.click();
    });
    actions.appendChild(b);
  });
  details.append(heading,actions);
  backup.append(details);
 }
 // Retain the actual trusted GitHub URL editor with its existing authenticated handlers,
 // but move it away from the simple user-facing Software Updates screen.
 if(oldPanel&&!details.contains(oldPanel)){
  details.append(oldPanel);
 }
 const btn=q('#mlxrHeroAction');
 if(btn&&!btn.dataset.mlx1024Label){btn.dataset.mlx1024Label='1';btn.setAttribute('aria-label','Check for updates or install an available release');}
}
function admin(){
 const root=q('#admin');
 if(!root)return;
 root.classList.add('mlx1024-admin-clean');
 const userForm=q('#userForm');
 if(userForm&&!userForm.dataset.mlx1024Fixed){
  userForm.dataset.mlx1024Fixed='1';
  const role=q('#uRole');
  if(role&&!role.getAttribute('aria-label'))role.setAttribute('aria-label','User role');
  const title=q('#adcPermissionPicker legend');
  if(title)title.textContent='Page access for this user';
 }
 // Layout-only; do not replace the dynamically rendered permission checkboxes.
}
function boot(){appearance();dateFilter();updateRecovery();admin();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(boot,900);
})();