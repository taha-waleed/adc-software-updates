/* MediLab X 10.0.11: selected clean clock and animated 3D modality chart. No synthetic data. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const motion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let chartTooltip=null,chartWatcher=null,calendarReady=false;
 function clock(){
  const pill=$('mlx108ClockPill'),cal=$('mlx108Calendar');if(!pill||!cal||calendarReady)return false;
  calendarReady=true;
  pill.setAttribute('aria-label','Open animated calendar');pill.setAttribute('aria-haspopup','dialog');
  const icon=pill.querySelector('.mlx108-calendar-icon');if(icon)icon.remove();
  cal.setAttribute('role','dialog');cal.setAttribute('aria-label','Calendar');
  const dial=pill.querySelector('svg.dial');
  if(dial){
   dial.setAttribute('aria-hidden','true');
   dial.querySelectorAll('line').forEach(el=>{el.style.transformBox='view-box';el.style.transformOrigin='50% 50%'})
  }
  function position(){
   if(cal.hidden)return;
   const box=pill.getBoundingClientRect(),width=Math.min(300,window.innerWidth-24),left=Math.max(12,Math.min(box.left,window.innerWidth-width-12));
   cal.style.position='fixed';cal.style.left=left+'px';cal.style.right='auto';cal.style.top=(box.bottom+8)+'px';
   cal.style.width=width+'px';cal.style.overflow='hidden';
  }
  pill.addEventListener('click',()=>requestAnimationFrame(position));
  window.addEventListener('resize',position,{passive:true});
  document.addEventListener('scroll',position,{passive:true,capture:true});
  // Existing calendar code handles opening, closing and month navigation.
  // Event handling here only corrects the screen position and removes the old icon.
  position();return true;
 }
 function popup(){if(!chartTooltip){chartTooltip=document.createElement('div');chartTooltip.className='ml111-hover-tip';chartTooltip.hidden=true;chartTooltip.setAttribute('role','tooltip');document.body.append(chartTooltip)}return chartTooltip}
 function tipPosition(bar){const t=popup(),r=bar.getBoundingClientRect();t.style.left=Math.max(12,Math.min(window.innerWidth-272,r.left+3))+'px';t.style.top=Math.max(45,r.top-67)+'px'}
 function enter(bar){const t=popup();t.textContent=bar.dataset.description||bar.getAttribute('title')||'';t.hidden=!t.textContent;tipPosition(bar)}
 function hide(){if(chartTooltip)chartTooltip.hidden=true}
 function decorate(){const root=$('ml85DailyChart');if(!root)return;const days=root.querySelectorAll('.ml85-chart-day');root.style.setProperty('--ml111-days',Math.max(1,Math.min(31,days.length)));
  root.querySelectorAll('.ml85-chart-bar').forEach(bar=>{
   if(bar.dataset.ml111Interactive==='true')return;
   bar.dataset.ml111Interactive='true';bar.dataset.description=bar.getAttribute('title')||'Recorded examination';
   const height=parseFloat(bar.style.getPropertyValue('--bar-height'))||0;
   if(height<=0){bar.setAttribute('aria-hidden','true');return}
   bar.tabIndex=0;bar.setAttribute('role','img');bar.setAttribute('aria-label',bar.dataset.description);
   bar.addEventListener('pointerenter',()=>enter(bar));bar.addEventListener('pointermove',()=>tipPosition(bar));bar.addEventListener('pointerleave',hide);
   bar.addEventListener('focus',()=>enter(bar));bar.addEventListener('blur',hide);
  });
 }
 function chart(){const root=$('ml85DailyChart');if(!root)return false;
  if(chartWatcher)return true;
  const title=$('ml85DailyTrend')?.querySelector('.ml85-trend-title');if(title)title.textContent='Modality performance · 3D';
  const sub=$('ml85DailyTrend')?.querySelector('.ml85-trend-sub');if(sub)sub.title='Real receipt data · CT, X-Ray and Ultrasound';
  chartWatcher=new MutationObserver(()=>{requestAnimationFrame(decorate)});
  chartWatcher.observe(root,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('[data-ml85-metric],[data-ml10-range]'))setTimeout(decorate,60)});
  decorate();return true;
 }
 function nativeHtmlUpdates(){
  const host=$('mlx1010UpdateUi');if(!host||!window.adcDesktop?.checkOnline||host.dataset.ml111Native==='1')return;
  host.dataset.ml111Native='1';
  const rows=host.querySelectorAll('.su-row');
  rows.forEach(row=>{const h=row.querySelector('h3'),tag=row.querySelector('.su-tag');if(!h||!tag)return;
   if(h.textContent.includes('HTML'))tag.textContent='v10.0.11';
   if(h.textContent.includes('Windows'))tag.textContent='v10.0.11';
  });
  const fine=host.querySelector('.su-quiet');if(fine)fine.textContent='Verified HTML-only updates are supported directly by the Windows app. A one-time backup is made before switching the UI.';
  const btn=$('mlx1010Check'),status=$('mlx1010Status');if(!btn||!status)return;
  const install=document.createElement('button');install.className='su-primary';install.type='button';install.id='mlx111InstallHtml';install.textContent='Install HTML update';install.hidden=true;
  btn.insertAdjacentElement('afterend',install);
  btn.addEventListener('click',async e=>{
   e.preventDefault();e.stopImmediatePropagation();btn.disabled=true;status.textContent='Checking verified MediLab updates…';
   try{const m=await window.adcDesktop.checkOnline();if(!m?.ok)throw Error(m?.error||'Could not check for updates.');
    if(m.htmlAvailable){status.textContent='New HTML design v'+m.htmlVersion+' is ready. No EXE installer required.';install.hidden=false}
    else{status.textContent='MediLab X is up to date.';install.hidden=true}
   }catch(ex){status.textContent=String(ex.message||ex);install.hidden=true}finally{btn.disabled=false}
  },true);
  install.onclick=async()=>{
   install.disabled=true;status.textContent='Preparing verified HTML update and encrypted data backup…';
   try{const r=await window.adcDesktop.installOnline();if(!r?.ok)status.textContent=r?.error||'Update not installed.'}
   catch(ex){status.textContent=String(ex.message||ex)}finally{install.disabled=false}
  };
 }
 function boot(){clock();chart();nativeHtmlUpdates();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 let count=0;const init=setInterval(()=>{boot();if((calendarReady&&chartWatcher&&(!window.adcDesktop||$('mlx111InstallHtml')))||++count>35)clearInterval(init)},500);
})();