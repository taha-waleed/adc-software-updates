(()=>{
'use strict';
/* UI-only cleanup: existing authorized Electron updater remains the only installation backend. */
const q=s=>document.querySelector(s);
const DASH='Software Updates';
function keepOffscreen(node){
 if(!node)return;
 if(node.style.getPropertyValue('display')!=='none'||node.style.getPropertyPriority('display')!=='important')
  node.style.setProperty('display','none','important');
 node.setAttribute('aria-hidden','true');
}
function refresh(){
 const view=q('#settings .adc-setting-view[data-setting-view="updates"]');
 if(!view)return;
 // The status elements remain in DOM so original check, install, rollback and SHA256 logic still run.
 ['#medilabLocalReleaseNotes','#mlx1022GithubHead','#adc85UpdateCentre','.mlx-release-intro'].forEach(sel=>keepOffscreen(view.querySelector(sel)));
 keepOffscreen(view.querySelector('.adc-admin-update')); // only if legacy advanced panel still in updates
 const hero=q('#mlxrUpdateHero');
 if(!hero)return;
 const title=q('#mlxrHeroTitle');
 const summary=q('#mlxrHeroSub');
 const button=q('#mlxrHeroAction');
 const offer=q('#adc85UpdateOffer');
 const available=Boolean(offer&&!offer.hidden);
 const raw=q('#adc85NewVersion')?.textContent||'';
 const version=raw.match(/\b\d+(?:\.\d+){1,3}\b/)?.[0];
 const desired=available?(version?'MediLab X '+version+' is available':'Update available'):DASH;
 if(title&&title.textContent!==desired)title.textContent=desired;
 const live=q('#adc85UpdateMessage')?.textContent?.trim()||'Check for available updates.';
 if(summary&&summary.textContent!==live)summary.textContent=live;
 const expected=available?'Download & Install':'Check for updates';
 if(button&&button.textContent!==expected)button.textContent=expected;
 if(button)button.setAttribute('aria-label',expected);
}
let pending=false;
function schedule(){
 if(pending)return;
 pending=true;
 requestAnimationFrame(()=>{pending=false;refresh()});
}
function boot(){
 refresh();
 const root=q('#settings .adc-setting-view[data-setting-view="updates"]');
 if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
 const status=q('#adc85UpdateCentre');
 if(status)new MutationObserver(schedule).observe(status,{attributes:true,subtree:true,attributeFilter:['hidden']});
 // Old plugins may mount their duplicate UI after window startup.
 setTimeout(refresh,500);
 setTimeout(refresh,1800);
 document.addEventListener('click',e=>{
  if(e.target.closest('#adcSettingsList button[data-open-settings="updates"]'))schedule();
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();