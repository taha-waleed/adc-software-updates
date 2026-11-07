/* MediLab X HTML-only update experience v10.0.10 — no EXE installation. */
(()=>{'use strict';
const ROOT='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilab-x/',MANIFEST=ROOT+'update.json';
const LOCAL_VERSION='10.0.10', NATIVE_VERSION='10.0.9';
const $=id=>document.getElementById(id);
const safeUrl=url=>{try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='raw.githubusercontent.com'&&u.pathname.startsWith('/taha-waleed/adc-software-updates/main/medilab-x/MediLab_X_')}catch{return false}};
const newer=(v,cur)=>{const a=String(v||'').split('.').map(Number),b=String(cur).split('.').map(Number);return a.length===3&&a.every(Number.isFinite)&&a.some((x,i)=>x!==b[i])&&a.find((x,i)=>x!==b[i])>b.find((x,i)=>a[i]!==b[i])};
function repositionNotifications(){const panel=$('mlx-notif-panel'),bell=$('mlx-notif-btn');if(!panel||!bell)return;
 const r=bell.getBoundingClientRect(), w=Math.min(370,window.innerWidth-24);panel.style.setProperty('--mln-top',Math.max(52,Math.min(window.innerHeight-130,r.bottom+9))+'px');
 panel.style.setProperty('--mln-left',Math.max(12,Math.min(window.innerWidth-w-12,r.right-w+24))+'px');panel.style.setProperty('--mln-right','auto');}
function renderUpdates(){const host=$('adc85UpdateCentre');if(!host||$('mlx1010UpdateUi'))return;host.classList.add('mlx1010-html-updates');
 const wrap=document.createElement('div');wrap.id='mlx1010UpdateUi';
 wrap.innerHTML=`<div class="su-hero"><span class="su-symbol" aria-hidden="true">↻</span><div><h2>Software update</h2><p>Keep your MediLab workspace fresh and organized.</p></div></div>
 <section class="su-card"><div class="su-row"><div><h3>Current HTML design</h3><p>Appearance, notifications and the software update screen.</p></div><span class="su-tag">v${LOCAL_VERSION}</span></div>
 <div class="su-row"><div><h3>Windows application</h3><p>Installed desktop shell has its own separate update system.</p></div><span class="su-tag">v${NATIVE_VERSION} channel</span></div></section>
 <section class="su-card"><div class="su-row"><div><h3>HTML updates</h3><p>Check GitHub for a newer HTML design. No installer required for the standalone HTML.</p></div><span aria-hidden="true" style="font-size:22px;color:var(--su-blue)">✦</span></div>
 <div class="su-actions"><button type="button" id="mlx1010Check" class="su-primary"><span id="mlx1010Spin" class="su-loader"></span>Check for HTML updates</button><button type="button" id="mlx1010Notes">What's new <span aria-hidden="true">⌄</span></button><button type="button" id="mlx1010Copy">Copy HTML link</button></div>
 <p id="mlx1010Status" class="su-status" role="status" aria-live="polite">Ready to check HTML updates.</p><div id="mlx1010Release" class="su-reveal" hidden><ul><li>Readable dark-mode notification inbox and popups</li><li>One UI-inspired Software Updates cards</li><li>Preserved Neon Frame popup and Float Down animation</li><li>No new Windows installer in this HTML update</li></ul></div></section>
 <p class="su-quiet">ⓘ For the installed Windows EXE, HTML files cannot automatically replace packaged application files. No installer will be downloaded here.</p>`;
 host.prepend(wrap);
 const check=$('mlx1010Check'),spin=$('mlx1010Spin'),status=$('mlx1010Status');
 $('mlx1010Notes').onclick=()=>{$('mlx1010Release').hidden=!$('mlx1010Release').hidden};
 $('mlx1010Copy').onclick=async()=>{const url=ROOT+'MediLab_X_10_0_10.html';try{await navigator.clipboard.writeText(url);status.textContent='HTML link copied.'}catch{status.textContent='HTML link: '+url}};
 check.onclick=async()=>{check.disabled=true;spin.classList.add('active');status.textContent='Checking verified HTML version…';try{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 let res;try{res=await fetch(MANIFEST,{cache:'no-store',signal:controller.signal})}finally{clearTimeout(timer)}
 if(!res.ok)throw Error('Update server returned '+res.status);
 const meta=await res.json();const latest=String(meta.htmlVersion||'');if(!/^\d+\.\d+\.\d+$/.test(latest)||!safeUrl(meta.htmlUrl))throw Error('Invalid HTML update information');
 if(newer(latest,LOCAL_VERSION))status.textContent='HTML version '+latest+' is available. Use Copy HTML link to open the published file.';
 else status.textContent='Your HTML design is up to date ('+LOCAL_VERSION+').';
 }catch(e){status.textContent='Could not check HTML updates: '+(e?.name==='AbortError'?'connection timed out':String(e.message||e));}finally{check.disabled=false;spin.classList.remove('active')}};
}
function init(){renderUpdates();repositionNotifications();
 const bell=$('mlx-notif-btn');bell?.addEventListener('click',()=>requestAnimationFrame(repositionNotifications),true);
 window.addEventListener('resize',repositionNotifications,{passive:true});
 const app=$('app');if(app){new MutationObserver(()=>{requestAnimationFrame(repositionNotifications)}).observe(app,{attributes:true,attributeFilter:['class','data-theme']});}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();