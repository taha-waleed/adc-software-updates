/* MediLab X HTML-only 10.0.12 — five-minute privacy standby.
   No authentication, database, receipt or existing navigation changes. */
(()=>{'use strict';
 const IDLE_MS=5*60*1000, EXIT_MS=510;
 const $=id=>document.getElementById(id);
 let lastActivity=Date.now(),lastMove=0,locked=false,wasWorkspace=false,overlay=null,button=null,leaveTimer=0;
 const reduced=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function workspace(){
  const a=$('app');if(!a||a.hidden||a.classList.contains('hidden'))return false;
  const cs=getComputedStyle(a);return cs.display!=='none'&&cs.visibility!=='hidden'&&a.getClientRects().length>0;
 }
 function timeText(){
  const d=new Date(),time=$('mlx12Clock'),date=$('mlx12Date');
  if(time)time.textContent=d.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit',hour12:true});
  if(date)date.textContent=d.toLocaleDateString('en-PK',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
 }
 function activity(){if(!locked)lastActivity=Date.now()}
 function mount(){
  if(overlay)return true;
  const title=document.querySelector('#adc85Titlebar .adc85-winbuttons');
  if(!title)return false;
  button=document.createElement('button');button.type='button';button.id='mlx12LockBtn';
  button.title='Privacy standby — lock screen';button.setAttribute('aria-label','Lock screen');
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1"/></svg>';
  title.insertBefore(button,$('adc85Minimize')||title.firstChild);
  overlay=document.createElement('section');overlay.id='mlx12Privacy';overlay.hidden=true;
  overlay.tabIndex=-1;overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','MediLab X privacy standby. Tap or press a key to unlock.');
  overlay.innerHTML='<span class="mlx12-orb a" aria-hidden="true"></span><span class="mlx12-orb b" aria-hidden="true"></span>'+
    '<div class="mlx12-shell"><div class="mlx12-top"><span class="mlx12-dot"></span>PRIVATE WORKSPACE</div>'+
    '<div class="mlx12-emblem" id="mlx12Emblem"><svg viewBox="0 0 90 80" aria-hidden="true"><path d="M45 68 13 37a18 18 0 0 1 25-25l7 7 7-7a18 18 0 0 1 25 25Z"/><path d="M9 40h20l7-13 12 28 7-16h25"/></svg></div>'+
    '<div class="mlx12-brand">MediLab X</div><div class="mlx12-sub">Your workspace is resting securely out of view.</div>'+
    '<div class="mlx12-clock" id="mlx12Clock">--:--</div><div class="mlx12-date" id="mlx12Date"></div>'+
    '<div class="mlx12-openhint"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 19h14"/></svg>Tap anywhere to unlock</div>'+
    '<div class="mlx12-foot">AL HAMEED DIAGNOSTIC CENTRE · A PROJECT BY TAHA WALEED</div></div>';
  document.body.appendChild(overlay);
  const img=document.querySelector('#app .brand-logo, #app .brand img');
  if(img&&img.src&&img.src.startsWith('data:image/')){
   const image=document.createElement('img');image.src=img.src;image.alt='MediLab heartbeat logo';
   $('mlx12Emblem').replaceChildren(image);
  }
  button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();lock()});
  overlay.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation()});
  overlay.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();unlock()});
  overlay.addEventListener('contextmenu',e=>e.preventDefault());
  timeText();return true;
 }
 function lock(){
  if(!mount()||locked||!workspace())return;
  clearTimeout(leaveTimer);locked=true;timeText();
  document.activeElement&&document.activeElement.blur&&document.activeElement.blur();
  overlay.hidden=false;overlay.classList.remove('mlx12-leave','mlx12-enter');
  void overlay.offsetWidth;
  overlay.classList.add('mlx12-enter');overlay.focus({preventScroll:true});
  button.setAttribute('aria-label','Screen locked — tap standby screen to unlock');
  button.title='Screen locked';
 }
 function unlock(){
  if(!locked)return;
  locked=false;lastActivity=Date.now();
  button.setAttribute('aria-label','Lock screen');button.title='Privacy standby — lock screen';
  overlay.classList.remove('mlx12-enter');overlay.classList.add('mlx12-leave');
  clearTimeout(leaveTimer);
  leaveTimer=setTimeout(()=>{if(!locked){overlay.hidden=true;overlay.classList.remove('mlx12-leave')}},reduced()?0:EXIT_MS);
 }
 function resetAfterLogout(){
  if(locked){locked=false;clearTimeout(leaveTimer);overlay.hidden=true;overlay.classList.remove('mlx12-enter','mlx12-leave')}
  lastActivity=Date.now();
 }
 function tick(){
  if(!mount())return;
  const active=workspace();
  if(button)button.disabled=!active;
  if(!active){if(wasWorkspace)resetAfterLogout();wasWorkspace=false;return}
  if(!wasWorkspace){lastActivity=Date.now();wasWorkspace=true}
  if(!locked&&Date.now()-lastActivity>=IDLE_MS)lock();
  if(locked)timeText();
  const tags=document.querySelectorAll('#mlx1010UpdateUi .su-row');
  tags.forEach(row=>{const h=row.querySelector('h3'),tag=row.querySelector('.su-tag');
   if(h&&tag&&h.textContent.includes('HTML'))tag.textContent='v10.0.12';
  });
 }
 document.addEventListener('keydown',e=>{
  if(locked){e.preventDefault();e.stopImmediatePropagation();unlock();return}
  activity();
 },true);
 document.addEventListener('pointerdown',e=>{if(!locked&&!e.target.closest('#mlx12LockBtn'))activity()},true);
 document.addEventListener('pointermove',()=>{const now=Date.now();if(!locked&&now-lastMove>1100){lastMove=now;activity()}},{capture:true,passive:true});
 document.addEventListener('wheel',()=>activity(),{capture:true,passive:true});
 document.addEventListener('touchstart',()=>activity(),{capture:true,passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
 window.addEventListener('focus',()=>tick());
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
 setInterval(tick,1000);
})();