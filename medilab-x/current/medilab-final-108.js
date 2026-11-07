/* MediLab X 10.0.11 — selected clock, mini profile and clean update view. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const two=x=>String(x).padStart(2,'0');
let month=new Date(),picked=null;
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
function mount(){
 const actions=document.querySelector('#app .main .top .actions');
 if(!actions||$('mlx108ClockWrap'))return;
 const wrap=document.createElement('div');wrap.id='mlx108ClockWrap';
 wrap.innerHTML=`<button type="button" id="mlx108ClockPill" aria-label="Open calendar" aria-expanded="false"><svg class="dial" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#d7dae2" stroke-width="3"/><circle cx="50" cy="50" r="40" fill="none" stroke="#b8bcc8" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 19.13"/><line id="mlx108Hour" class="mlx108-hands" x1="50" y1="50" x2="50" y2="28" stroke="#222a38" stroke-width="4.5" stroke-linecap="round"/><line id="mlx108Minute" class="mlx108-hands" x1="50" y1="50" x2="50" y2="17" stroke="#2b3544" stroke-width="3" stroke-linecap="round"/><line id="mlx108Second" class="mlx108-hands" x1="50" y1="58" x2="50" y2="12" stroke="#e84d5a" stroke-width="1.7" stroke-linecap="round"/><circle cx="50" cy="50" r="3.5" fill="#e84d5a"/></svg><span class="mlx108-digital"><span class="mlx108-digits"><span id="mlx108Hm">12:00</span>:<span class="mlx108-seconds" id="mlx108Ss">00</span><span class="mlx108-am" id="mlx108Am">PM</span></span><span class="mlx108-date" id="mlx108Date">SAT, 07 NOV 2026</span></span><span class="mlx108-calendar-icon" aria-hidden="true">▦</span></button><div id="mlx108Calendar" hidden><div class="mlx108-cal-top"><button id="mlx108Prev" type="button" aria-label="Previous month">‹</button><strong id="mlx108Month"></strong><button id="mlx108Next" type="button" aria-label="Next month">›</button></div><div class="mlx108-week">${['S','M','T','W','T','F','S'].map(x=>`<span>${x}</span>`).join('')}</div><div class="mlx108-days" id="mlx108Days"></div><div class="mlx108-cal-bottom"><span id="mlx108Picked">Choose a date</span><button type="button" id="mlx108Today">Today</button></div></div>`;
 const old=$('adcBriefClock');old?.insertAdjacentElement('beforebegin',wrap);
 if(!old)actions.prepend(wrap);
 const clockBtn=$('mlx108ClockPill'), cal=$('mlx108Calendar');
 clockBtn.addEventListener('click',()=>{const show=cal.hidden;cal.hidden=!show;clockBtn.setAttribute('aria-expanded',String(show));if(show){month=new Date();renderCalendar()}});
 $('mlx108Prev').addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);renderCalendar()});
 $('mlx108Next').addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);renderCalendar()});
 $('mlx108Today').addEventListener('click',()=>{month=new Date();picked=new Date();renderCalendar()});
 document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target)){cal.hidden=true;clockBtn.setAttribute('aria-expanded','false')}});
 updateClock();setInterval(updateClock,1000);
 initProfile();initBrand();initUpdatePanel();
 }
function updateClock(){
 const now=new Date(),h=now.getHours()%12||12,m=now.getMinutes(),s=now.getSeconds(),ms=now.getMilliseconds();
 if(!$('mlx108Hm'))return;
 $('mlx108Hm').textContent=two(h)+':'+two(m);$('mlx108Ss').textContent=two(s);$('mlx108Am').textContent=now.getHours()<12?'AM':'PM';
 $('mlx108Date').textContent=now.toLocaleDateString('en-PK',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
 const rotate=(id,angle)=>{const el=$(id);if(el){el.style.transform=`rotate(${angle}deg)`;el.style.transformOrigin='50% 50%';el.style.transformBox='view-box'}};
 rotate('mlx108Hour',(now.getHours()%12+m/60)*30);
 rotate('mlx108Minute',(m+s/60)*6);
 // Smooth hand motion interpolates via requestAnimationFrame; this fallback ticks at second resolution.
 rotate('mlx108Second',(s+ms/1000)*6);
}
let motionFrame;
function animateSecondHand(){
 const el=$('mlx108Second');if(el){const now=new Date(),v=(now.getSeconds()+now.getMilliseconds()/1000)*6;el.style.transform=`rotate(${v}deg)`;el.style.transformOrigin='50% 50%';el.style.transformBox='view-box'}
 motionFrame=requestAnimationFrame(animateSecondHand);
}
function renderCalendar(){
 const el=$('mlx108Days');if(!el)return;el.replaceChildren();
 const year=month.getFullYear(),mon=month.getMonth();$('mlx108Month').textContent=months[mon]+' '+year;
 const offset=new Date(year,mon,1).getDay(),total=new Date(year,mon+1,0).getDate(),today=new Date();
 for(let i=0;i<offset;i++)el.append(document.createElement('span'));
 for(let n=1;n<=total;n++){
  const btn=document.createElement('button');btn.type='button';btn.textContent=n;
  if(year===today.getFullYear()&&mon===today.getMonth()&&n===today.getDate())btn.className='today';
  btn.addEventListener('click',()=>{picked=new Date(year,mon,n);$('mlx108Picked').textContent=picked.toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'})});el.append(btn)
 }
 $('mlx108Picked').textContent=picked?picked.toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'}):'Choose a date';
}
function initProfile(){
 const trigger=$('adcEditMyProfile');if(!trigger||$('mlx108ProfileMenu'))return;
 const sidebarNav=document.querySelector('#app .sidebar #nav');if(sidebarNav&&!trigger.closest('.sidebar'))sidebarNav.insertAdjacentElement('beforebegin',trigger);
 const pop=document.createElement('div');pop.id='mlx108ProfileMenu';pop.hidden=true;
 pop.innerHTML='<div class="profile-header"><span>A</span><div><strong id="mlx108ProfileName">Admin</strong><br><small>Signed-in staff</small></div></div><button type="button" id="mlx108EditProfile">Edit my profile</button><button type="button" id="mlx108SignOut">Sign out</button>';
 document.body.append(pop);let passthrough=false;
 trigger.addEventListener('click',e=>{
  if(passthrough)return;
  e.preventDefault();e.stopImmediatePropagation();pop.hidden=!pop.hidden;
  if(!pop.hidden){const box=trigger.getBoundingClientRect();pop.style.left=Math.min(window.innerWidth-255,Math.max(12,box.right+10))+'px';pop.style.top=Math.max(42,box.top)+'px';$('mlx108ProfileName').textContent=$('adcMyProfileName')?.textContent||'Staff'}
 },true);
 $('mlx108EditProfile').onclick=()=>{pop.hidden=true;passthrough=true;trigger.click();passthrough=false};
 $('mlx108SignOut').onclick=()=>{pop.hidden=true;$('logoutBtn')?.click()};
 document.addEventListener('pointerdown',e=>{if(!pop.hidden&&!pop.contains(e.target)&&!trigger.contains(e.target))pop.hidden=true});
}
function initBrand(){
 document.querySelectorAll('.brand-logo,.login-logo,#aboutLogo').forEach(el=>{if(el.tagName==='IMG')el.src='assets/MediLab-Heartbeat.png'});
 const st=document.querySelector('.ml-new-brand-label strong');if(st)st.textContent='MediLab X';
 const name=document.querySelector('#adc85NowBrief .adc85-brief-kicker');if(name)name.textContent='NOW BRIEF';
}
function initUpdatePanel(){
 const h=$('adc85UpdateHeading'),message=$('adc85UpdateMessage');if(h)h.textContent='Installed version: 10.0.11';
 const updates=$('adc85UpdateCentre');if(!updates)return;
 const subtitle=updates.querySelector('p.muted');if(subtitle)subtitle.textContent='MediLab checks for verified updates automatically. Your records remain stored locally.';
 const observer=new MutationObserver(()=>{
  if(h&&(/10\.0\.[0-7]|GitHub|update\.json/i.test(h.textContent||'')))h.textContent='Installed version: 10.0.11';
  if(message&&/invalid release manifest|GitHub|update\.json/i.test(message.textContent||''))message.textContent='Unable to verify an update right now. Please try again later.';
 });observer.observe(updates,{subtree:true,characterData:true,childList:true});
}
function boot(){mount();if($('mlx108ClockPill'))animateSecondHand();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
/* MediLab X 10.0.11 — centered analog hands, unclipped calendar and accessible popup. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
let ready=false,btn,cal,wrap;
function putCalendar(){
 if(!btn||!cal||cal.hidden)return;
 const r=btn.getBoundingClientRect(),w=Math.min(322,window.innerWidth-24);
 let x=Math.min(window.innerWidth-w-12,Math.max(12,r.right-w));
 let y=r.bottom+9;
 if(y+410>window.innerHeight&&r.top>425)y=Math.max(42,r.top-425);
 cal.style.left=x+'px';cal.style.top=y+'px';cal.style.right='auto';
}
function attach(){
 if(ready)return;
 btn=$('mlx108ClockPill');cal=$('mlx108Calendar');wrap=$('mlx108ClockWrap');
 if(!btn||!cal||!wrap)return;
 ready=true;
 // Put calendar above every dashboard scroll container. Preserve existing month/day callbacks.
 document.body.append(cal);
 cal.setAttribute('role','dialog');cal.setAttribute('aria-label','Calendar');
 cal.addEventListener('pointerdown',e=>e.stopPropagation());
 const observer=new MutationObserver(()=>{
   const open=!cal.hidden;
   btn.setAttribute('aria-expanded',String(open));
   if(open)putCalendar();
 });observer.observe(cal,{attributes:true,attributeFilter:['hidden']});
 // Old clock click handler still toggles hidden and renders months.
 btn.addEventListener('click',()=>requestAnimationFrame(putCalendar));
 window.addEventListener('resize',putCalendar,{passive:true});
 window.addEventListener('scroll',putCalendar,{passive:true,capture:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!cal.hidden){cal.hidden=true;btn.focus()}});
 // Needle geometry is repaired in the original clock updater using SVG viewBox coordinates.
}
const timer=setInterval(()=>{attach();if(ready)clearInterval(timer)},300);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();