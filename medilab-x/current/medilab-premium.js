/* MediLab X — stability and desktop refinement. Existing patient/report storage keys are preserved. */
(function(){'use strict';
const $=id=>document.getElementById(id),desktop=()=>window.adcDesktop;
const STORE='mlx_ui_preferences_v1',NOTICES='mlx_notification_history_v1';
const initial={notificationStyle:'glass',notificationFrequency:60,expenseRatio:0.65,goodDayMultiplier:1.25,aiLogo:'sparkle',aiInsightsEnabled:false,lastInsightAt:0};
function read(){try{return {...initial,...JSON.parse(localStorage.getItem(STORE)||'{}')}}catch(_){return {...initial}}}
function put(x){const next={...read(),...x};localStorage.setItem(STORE,JSON.stringify(next));return next}
function loadNotices(){try{return JSON.parse(localStorage.getItem(NOTICES)||'[]').filter(x=>x&&x.id).slice(0,350)}catch(_){return []}}
function persistNotices(a){try{localStorage.setItem(NOTICES,JSON.stringify(a.slice(0,350)))}catch(_){}}
let notices=loadNotices(),toastHost,notifyPanel,historyMode=false,closing=false;
function notifyOpen(){if(!notifyPanel)return;clearTimeout(closing);notifyPanel.hidden=false;notifyPanel.classList.remove('mlx-notif-closing');notifyPanel.classList.remove('mlx-notif-opening');void notifyPanel.offsetWidth;notifyPanel.classList.add('mlx-notif-opening');renderNotices()}
function notifyClose(){if(!notifyPanel||notifyPanel.hidden)return;notifyPanel.classList.remove('mlx-notif-opening');notifyPanel.classList.add('mlx-notif-closing');closing=setTimeout(()=>{notifyPanel.hidden=true;notifyPanel.classList.remove('mlx-notif-closing')},180)}
function normalizeBrand(){
 document.title='MediLab X';
 const title=$('startupSplash')?.querySelector('.splash-title');if(title)title.innerHTML='MediLab <span>X</span>';
 const brand=document.querySelector('.ml-new-brand-label');if(brand){const strong=brand.querySelector('strong');if(strong)strong.innerHTML='MediLab <span>X</span>';brand.querySelectorAll('small').forEach(x=>{x.textContent='Diagnostic Centre Management'})}
 const foot=document.querySelector('#app .sidebar-foot .app-version');if(foot)foot.textContent='MediLab X';
 const titlebar=document.querySelector('#adc85Titlebar .adc85-drag span:last-child');if(titlebar){titlebar.textContent='MediLab X';if(!titlebar.dataset.mlxBrandWatcher){titlebar.dataset.mlxBrandWatcher='1';new MutationObserver(()=>{if(titlebar.textContent!=='MediLab X')titlebar.textContent='MediLab X'}).observe(titlebar,{childList:true,characterData:true,subtree:true})}}
 const versionChip=$('loginScreen')?.querySelector('.version-chip');if(versionChip)versionChip.innerHTML='<span>MediLab X</span>';
 document.querySelectorAll('#adc85UpdateHeading').forEach(x=>{if(!x.textContent.includes('10.0'))x.textContent='Installed version: 10.0.7'});
 document.querySelectorAll('#adc85ModalTitle').forEach(x=>x.textContent=x.textContent.replace(/MediLab 8\.5/gi,'MediLab X'));
 if($('stAccent'))$('stAccent').value='X';
 const splashSwitch=$('stEnabled'),duration=$('stDuration');if(splashSwitch){splashSwitch.value='1';splashSwitch.disabled=true;splashSwitch.title='The professional startup screen is enabled for this build.'}
 if(duration){duration.value='3';duration.disabled=true;duration.title='Fixed three-second startup animation.'}
}
function logo(){const el=document.querySelector('.mlx-logo-reference');return el?.src||document.querySelector('.login-logo')?.src||''}
function remakeAbout(){const target=$('about');if(!target)return;
 target.replaceChildren();const card=document.createElement('div');card.className='panel mlx-about';
 const img=document.createElement('img');img.className='mlx-about-logo';img.src=logo();img.alt='MediLab X logo';
 const h=document.createElement('h2');h.textContent='MediLab X';
 const sub=document.createElement('p');sub.className='mlx-about-sub';sub.textContent='Diagnostic Centre Management · Standard';
 const chip=document.createElement('span');chip.className='mlx-version';chip.textContent='Version 10.0.7';
 const intro=document.createElement('p');intro.textContent='A focused desktop workspace for patient registration, receipts, accounting, radiology reporting and doctor referrals.';intro.style.cssText='line-height:1.7;max-width:490px;margin:20px auto;color:var(--ink);font-size:13px';
 const grid=document.createElement('div');grid.className='mlx-grid';
 [['Storage','Local device','Existing records retained'],['Edition','Standard','No subscription required'],['Updates','GitHub release','User-approved installation']].forEach(([a,b,c])=>{const el=document.createElement('div');const label=document.createElement('small');label.textContent=a;const val=document.createElement('strong');val.textContent=b;const foot=document.createElement('small');foot.textContent=c;el.append(label,val,foot);grid.append(el)});
 const btn=document.createElement('button');btn.className='secondary';btn.type='button';btn.textContent='Open software updates';btn.onclick=()=>{$('nav button[data-page="settings"]')?.click();setTimeout(()=>$('[data-open-settings="updates"]')?.click(),30)};
 const copyright=document.createElement('p');copyright.className='muted';copyright.style.marginTop='19px';copyright.textContent='Created by Taha Waleed · Al Hameed Diagnostic Centre';
 card.append(img,h,sub,chip,intro,grid,copyright);target.append(card);
}
function fixSidebar(){const nav=$('nav');if(!nav)return;const about=nav.querySelector('[data-page="about"]');const settings=nav.querySelector('[data-page="settings"]');if(about&&settings&&about.previousElementSibling!==settings)settings.insertAdjacentElement('afterend',about);
 // Don't attach update badges to About. Only Settings + bell may have notification dots.
 nav.querySelector('[data-page="about"] .adc85-notify-dot')?.remove();
}
function preventAboutScrollbar(){const about=$('about');if(!about)return;about.addEventListener('pointerenter',()=>{const dlg=$('adcAboutDialog');if(dlg)dlg.style.scrollbarWidth='none'})}
function styleAIBrand(){const pref=read(),options={sparkle:'✦',brain:'◈',orbit:'◎'};const icon=options[pref.aiLogo]||options.sparkle;const orb=document.querySelector('#ml10AiPanel .ml10-ai-orb');if(orb)orb.textContent=icon;
 const btn=$('ml10AiOpen');if(btn){const svg=btn.querySelector('svg');if(svg)svg.outerHTML='<span aria-hidden="true" style="font-size:21px;line-height:1">'+icon+'</span>';const span=btn.querySelector('span[aria-hidden]');if(span)span.textContent=icon;}
}
function notificationElements(){const actions=document.querySelector('#app .top .actions');if(!actions||$('mlx-notif-btn'))return;
 const btn=document.createElement('button');btn.id='mlx-notif-btn';btn.type='button';btn.title='Notifications';btn.setAttribute('aria-label','Open notifications');btn.innerHTML='<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span class="mlx-dot" hidden></span>';
 const ai=$('ml10AiOpen');if(ai)ai.insertAdjacentElement('afterend',btn);else actions.prepend(btn);
 notifyPanel=document.createElement('div');notifyPanel.id='mlx-notif-panel';notifyPanel.hidden=true;notifyPanel.innerHTML='<div class="mlx-panel-head"><div><h2 id="mlx-notif-heading">Notifications</h2><small id="mlx-notif-count" class="mlx-count"></small></div><button type="button" class="secondary small" id="mlx-mark-read">Mark all read</button></div><div id="mlx-notif-items"></div><div class="mlx-notif-foot"><button type="button" class="secondary small" id="mlx-notif-history">◷ &nbsp; Notification History</button></div>';
 document.body.append(notifyPanel);
 toastHost=document.createElement('div');toastHost.className='mlx-toast-host';document.body.append(toastHost);
 btn.onclick=e=>{e.stopPropagation();if(!notifyPanel.hidden)notifyClose();else{historyMode=false;notifyOpen()}};
 $('mlx-mark-read').onclick=()=>{notices.forEach(x=>x.read=true);persistNotices(notices);historyMode=false;renderNotices()};
 $('mlx-notif-history').onclick=()=>{historyMode=!historyMode;renderNotices()};
 document.addEventListener('pointerdown',e=>{if(!notifyPanel.hidden&&!e.target.closest('#mlx-notif-panel,#mlx-notif-btn'))notifyClose()});
 renderNotices();
}
function renderNotices(){const box=$('mlx-notif-items');if(!box)return;box.replaceChildren();const unread=notices.filter(x=>!x.read).length;
 const dot=document.querySelector('#mlx-notif-btn .mlx-dot');if(dot)dot.hidden=!unread;
 const visible=(historyMode?notices:notices.filter(x=>!x.read));
 const title=$('mlx-notif-heading'),count=$('mlx-notif-count'),history=$('mlx-notif-history'),allRead=$('mlx-mark-read');
 if(title)title.textContent=historyMode?'Notification History':'Notifications';
 if(count)count.textContent=historyMode?`${notices.length} saved notifications`:`${unread} unread`;
 if(history)history.textContent=historyMode?'‹  Back to notifications':'◷  Notification History';
 if(allRead)allRead.hidden=historyMode||unread===0;
 if(!visible.length){const empty=document.createElement('p');empty.className='mlx-empty';empty.textContent=historyMode?'No saved notifications yet.':'All caught up — no unread notifications.';box.append(empty);return}
 visible.slice(0,historyMode?100:40).forEach(n=>{const article=document.createElement('article');article.className='mlx-notif-card';article.dataset.kind=n.kind;article.dataset.read=String(!!n.read);
 const mark=document.createElement('div');mark.className='mlx-nicon';mark.textContent=n.kind==='success'?'✓':n.kind==='warning'?'!':'✦';const content=document.createElement('div');const title=document.createElement('strong');title.textContent=n.title;const p=document.createElement('p');p.textContent=n.text;const time=document.createElement('small');time.textContent=new Date(n.time).toLocaleString('en-PK')+(n.read?' · Read':' · New');content.append(title,p,time);article.append(mark,content);box.append(article)})
}
function popup(n){if(!toastHost)return;const st=read().notificationStyle;const el=document.createElement('div');el.className='mlx-toast '+(st==='banner'?'mlx-banner':st==='compact'?'mlx-compact':'');const h=document.createElement('strong');h.textContent=n.title;const p=document.createElement('span');p.textContent=n.text;el.append(h,p);toastHost.append(el);setTimeout(()=>el.remove(),6500)}
function addNotice(title,text,kind='info',{show=true,key=''}={}){if(key&&notices.some(x=>x.key===key))return;const n={id:String(Date.now())+Math.random(),key,title,text,kind,read:false,time:Date.now()};notices.unshift(n);persistNotices(notices);renderNotices();if(String(key).startsWith('update-')){const settings=document.querySelector('#nav button[data-page="settings"]');if(settings&&!settings.querySelector('.adc85-notify-dot')){const dot=document.createElement('span');dot.className='adc85-notify-dot';settings.append(dot);settings.style.position='relative'}}if(show)popup(n)}
function financialSnapshot(){try{const d=JSON.parse(localStorage.getItem('ahdc_software_v1')||'{}');const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 const p=Array.isArray(d.patients)?d.patients:[],e=Array.isArray(d.expenses)?d.expenses:[];const day=p.filter(x=>x.date===today),exp=e.filter(x=>x.date===today);
 const received=day.reduce((s,x)=>s+(Number(x.received)||0),0),expense=exp.reduce((s,x)=>s+(Number(x.amount)||0),0);return{today,received,expense,day:day.length,patients:p,expenses:e};}catch(_){return null}}
function localInsights(force=false){
 if(!$('app')?.classList.contains('authenticated'))return;
 const pref=read(),now=Date.now();
 // Stagger alerts like desktop notifications; never loop rapidly or fabricate business events.
 const next=Number(pref.nextInsightAt)||0;
 if(!force&&next&&now<next)return;
 const base=Math.max(30,Math.min(180,Number(pref.notificationFrequency)||60));
 put({nextInsightAt:now+Math.round(base*(.75+Math.random()*.5)*60000)});
 const info=financialSnapshot();if(!info)return;
 const raw=(()=>{try{return JSON.parse(localStorage.getItem('ahdc_software_v1')||'{}')||{}}catch{return {}}})();
 const op=(()=>{try{return JSON.parse(localStorage.getItem('mlx_operations_v1')||'{}')||{}}catch{return {}}})();
 const totalDue=(Array.isArray(raw.patients)?raw.patients:[]).reduce((sum,p)=>sum+Math.max(0,(Number(p.subtotal||p.total)||0)-(Number(p.discount)||0)-(Number(p.received)||0)),0);
 const batches=Array.isArray(op.items)?op.items:[],leaves=Array.isArray(op.leaves)?op.leaves:[];
 const money=v=>'Rs '+Math.round(v).toLocaleString('en-PK');const facts=[];
 if(info.expense>0&&info.received>0&&info.expense/info.received>=pref.expenseRatio)
  facts.push({id:'expense-'+info.today,title:'Expense alert',text:`Today's expenses are ${money(info.expense)} (${Math.round(info.expense/info.received*100)}% of collections).`,kind:'warning'});
 if(info.received>0)facts.push({id:'collections-'+info.today,title:'Collection snapshot',text:`Today's received payments total ${money(info.received)} across ${info.day} visits.`,kind:'info'});
 if(info.day>0)facts.push({id:'visits-'+info.today,title:'Reception update',text:`${info.day} patient visits registered today.`,kind:'info'});
 if(totalDue>0)facts.push({id:'balance-'+info.today,title:'Outstanding balance',text:`${money(totalDue)} is outstanding across saved patient receipts.`,kind:'info'});
 const soon=batches.filter(x=>{if(x.closed||Number(x.qty||0)<=0||!x.expiry)return false;const d=new Date(x.expiry+'T12:00:00');return Number.isFinite(d.getTime())&&(d.getTime()-Date.now())<=30*86400000});
 if(soon.length)facts.push({id:'reagents-'+info.today,title:'Reagent expiry reminder',text:`${soon.length} active reagent batches need expiry review within 30 days.`,kind:'warning'});
 const pending=leaves.filter(x=>String(x.status||'').toLowerCase()==='pending').length;
 if(pending)facts.push({id:'leaves-'+info.today,title:'Leave requests',text:`${pending} staff leave requests are awaiting Admin review.`,kind:'info'});
 if(info.received>info.expense*1.5&&info.received>0)facts.push({id:'day-success-'+info.today,title:'Good day',text:`Today's recorded collections are ${money(info.received)}, above expenses of ${money(info.expense)}.`,kind:'success'});
 if(!facts.length)return;
 // Only notify about real saved figures; rotating categories avoid repeated lines.
 const unused=facts.filter(f=>!notices.some(n=>n.key===f.id));if(!unused.length)return;
 const selected=unused[Math.floor(Math.random()*unused.length)];
 const send=t=>addNotice(selected.title,t,selected.kind,{key:selected.id,show:true});
 // Gemini can reword only an anonymized, preverified sentence. Never send the database.
 if(pref.aiInsightsEnabled&&desktop()?.geminiAsk){
  const original=selected.text;
  const prompt='Rewrite ONLY this MediLab business alert in natural English, 20 words maximum, keeping EVERY number unchanged. Do not add any new facts, diagnoses, names, patients, or suggestions to disclose records. Text: '+original;
  desktop().geminiAsk(prompt).then(r=>{
   const t=String(r?.text||'').trim().replace(/[\r\n]+/g,' ').slice(0,180);
   const nums=t=>[...t.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map(m=>m[0].replace(/,/g,'')).sort();
   const allowed=r?.ok&&t.length>=16&&JSON.stringify(nums(t))===JSON.stringify(nums(original))&&!/diagnos|patient name|medical advice/i.test(t);
   send(allowed?t:original);
  }).catch(()=>send(original));
 }else send(selected.text);
}
function settingsItem(name,description,symbol,view){const btn=document.createElement('button');btn.type='button';btn.className='adc-settings-item';btn.dataset.openSettings=view;btn.innerHTML='<span aria-hidden="true" class="adc-setting-symbol">'+symbol+'</span><span class="adc-setting-copy"><strong></strong><small></small></span><span class="adc-setting-chevron">›</span>';btn.querySelector('strong').textContent=name;btn.querySelector('small').textContent=description;return btn}
function settingView(name){const view=document.createElement('div');view.className='adc-setting-view';view.dataset.settingView=name;view.hidden=true;view.innerHTML='<button class="adc-settings-back" data-settings-back type="button">‹ Settings</button>';return view}
function addSettings(){const list=$('adcSettingsList'),views=$('adcSettingsViews');if(!list||!views)return;
 // Personalization and integrations are visually separated from operational settings.
 const newItems=[
 ['Notification Center','Three styles, alerts and local insights','♧','mlxnotifications'],
 ['Doctor Directory','Kharian referrals, hospitals and editable entries','⚕','mlxdoctors'],
 ['AI Personalization','Assistant icon and connection guidance','✦','mlxaicustom']];
 newItems.forEach(([a,b,c,d])=>{if(!list.querySelector('[data-open-settings="'+d+'"]'))list.append(settingsItem(a,b,c,d))});
 const intro=document.createElement('div');intro.id='ml-settings-section-label';intro.textContent='CUSTOMIZATION & PREFERENCES';const appearance=list.querySelector('[data-open-settings="appearance"]');if(appearance)list.insertBefore(intro,appearance);
 function moveAfter(key,anchor){const el=list.querySelector('[data-open-settings="'+key+'"]');const a=list.querySelector('[data-open-settings="'+anchor+'"]');if(el&&a)a.insertAdjacentElement('afterend',el)}
 moveAfter('animations','appearance');moveAfter('ml10layout','animations');moveAfter('brief','ml10layout');moveAfter('mlxnotifications','brief');moveAfter('mlxaicustom','mlxnotifications');moveAfter('gemini','mlxaicustom');
 moveAfter('mlxdoctors','whatsapp');
 const n=settingView('mlxnotifications');n.id='mlx-notification-settings';
 n.insertAdjacentHTML('beforeend','<h2>Notifications</h2><p class="muted">Choose how desktop alerts appear. These examples show the real notification layouts.</p><div class="adc-settings-group"><h2>Notification appearance</h2><div class="mlx-select-grid"><label><div class="mlx-preview" data-appearance="glass"><div class="fake"></div></div><strong>Floating Glass</strong><small>Soft rounded alert</small><input type="radio" name="mlx-notif-style" value="glass"></label><label><div class="mlx-preview" data-appearance="banner"><div class="fake"></div></div><strong>Top Banner</strong><small>Wide notification</small><input type="radio" name="mlx-notif-style" value="banner"></label><label><div class="mlx-preview" data-appearance="compact"><div class="fake"></div></div><strong>Compact</strong><small>Subtle corner alert</small><input type="radio" name="mlx-notif-style" value="compact"></label></div><button class="secondary" type="button" id="mlx-notif-sample">Preview notification</button></div><div class="adc-settings-group"><h2>Financial insights</h2><div class="row"><div class="field"><label>Insights interval</label><select id="mlx-notif-freq"><option value="30">Every 30 minutes</option><option value="60">Every hour</option><option value="180">Every 3 hours</option></select></div><div class="field"><label>Expense warning at</label><select id="mlx-expense-ratio"><option value="0.4">40% of received sales</option><option value="0.65">65% of received sales</option><option value="0.8">80% of received sales</option></select></div></div><label style="display:flex;gap:9px;align-items:center;margin-top:14px;font-size:12px"><input id="mlx-ai-insights" type="checkbox" style="width:auto"> Use connected Gemini AI for anonymous daily financial insight (opt-in)</label><p class="mlx-settings-note">Rules use saved daily receipts and expenses, never sample figures. Optional Gemini sends only aggregated daily totals and a visit count, not patient information. Notifications are informational.</p><button class="secondary" type="button" id="mlx-insights-run">Analyze today</button></div>');
 views.append(n);
 n.querySelectorAll('input[name="mlx-notif-style"]').forEach(x=>{x.checked=x.value===read().notificationStyle;x.addEventListener('change',()=>put({notificationStyle:x.value}))});
 $('mlx-notif-freq').value=String(read().notificationFrequency);$('mlx-expense-ratio').value=String(read().expenseRatio);$('mlx-ai-insights').checked=!!read().aiInsightsEnabled;$('mlx-ai-insights').onchange=e=>put({aiInsightsEnabled:e.target.checked});
 $('mlx-notif-freq').onchange=e=>put({notificationFrequency:Number(e.target.value)});$('mlx-expense-ratio').onchange=e=>put({expenseRatio:Number(e.target.value)});
 $('mlx-notif-sample').onclick=()=>popup({title:'MediLab X',text:'Your notification style is active.'});
 $('mlx-insights-run').onclick=()=>{const i=financialSnapshot();localInsights(true);if(!i||!i.day)addNotice('No transactions yet','Register patients and expenses to generate your first daily financial insight.','info')};
 const ai=settingView('mlxaicustom');ai.innerHTML+='<h2>AI Assistant</h2><div class="adc-settings-group"><h2>Choose assistant icon</h2><label id="mlx-ai-logo-label">Select a clean, macOS-inspired icon:</label><select id="mlx-ai-logo-select"><option value="sparkle">✦  Sparkle</option><option value="brain">◈  Intelligent diamond</option><option value="orbit">◎  Orbit</option></select><p class="mlx-settings-note">AI chat uses Gemini only when you connect an API key securely in the Windows app. No patient details are automatically uploaded.</p><button type="button" class="secondary" id="mlx-gemini-open">Configure Gemini</button></div>';views.append(ai);
 $('mlx-ai-logo-select').value=read().aiLogo;$('mlx-ai-logo-select').onchange=e=>{put({aiLogo:e.target.value});styleAIBrand()};$('mlx-gemini-open').onclick=()=>{list.hidden=true;views.hidden=false;views.querySelectorAll('[data-setting-view]').forEach(x=>x.hidden=x.dataset.settingView!=='gemini')};
 const doctor=settingView('mlxdoctors');doctor.innerHTML+='<h2>Kharian Doctor & Hospital Directory</h2><p class="muted">Editable local directory. Practitioners and associations change; verify details before clinical use.</p><div class="adc-settings-group" id="mlx-doctor-mount"><h2>Referring doctors</h2><p class="muted">Existing saved entries remain available.</p></div>';views.append(doctor);
 const doctorPanels=[...document.querySelectorAll('#admin .panel')];const found=doctorPanels.find(el=>/Performing Doctors/i.test(el.querySelector('h2')?.textContent||''));if(found){$('mlx-doctor-mount').append(found);found.classList.add('mlx-moved-doctors');found.style.marginTop='13px'}
 const extra=document.createElement('div');extra.className='adc-settings-group';extra.innerHTML='<h2>Directory categories</h2><p class="muted">Use your existing doctors list above to add, edit or remove doctors. Add hospitals or clinics in the referring facilities settings.</p><div id="mlx-directory-categories"></div>';doctor.append(extra);
 const refresh=()=>{const target=$('mlx-directory-categories');if(!target)return;const d=financialSnapshot();const raw=(()=>{try{return JSON.parse(localStorage.getItem('ahdc_software_v1')||'{}')}catch(_){return{}}})();const ds=Array.isArray(raw.doctors)?raw.doctors:[],hs=Array.isArray(raw.referringPlaces)?raw.referringPlaces:[];target.textContent=ds.length+' saved doctors · '+hs.length+' saved hospitals/clinics. This is not guaranteed to be an exhaustive Kharian registry.'};refresh();list.querySelector('[data-open-settings="mlxdoctors"]')?.addEventListener('click',refresh);
 // Keep Admin short and focused: user access + patient safety. Existing handlers remain attached.
 const admin=$('admin');if(admin){const hs=admin.querySelectorAll('.panel h2');hs.forEach(h=>{if(/Doctor Referral Analytics/i.test(h.textContent))h.closest('.panel')?.classList.add('mlx-admin-analytics')})}
}
function checkProgress(){const target=$('adc85UpdateCentre');if(!target||$('mlx-update-wait'))return;const progress=document.createElement('div');progress.id='mlx-update-wait';progress.hidden=true;progress.innerHTML='<strong>Checking for updates…</strong><div class="track"><span></span></div><small>Verifying the official GitHub release manifest.</small>';target.append(progress);
 const btn=$('adc85CheckUpdates');if(!btn)return;btn.addEventListener('click',async e=>{e.stopImmediatePropagation();e.preventDefault();const begin=Date.now();btn.disabled=true;progress.hidden=false;const status=$('adc85UpdateMessage');if(status)status.textContent='Checking for updates…';let result;
 try{result=desktop()?.checkOnline?await desktop().checkOnline():{ok:false,error:'Online updates require the Windows desktop build.'}}catch(error){result={ok:false,error:String(error)}}
 const minWait=Math.max(0,4500-(Date.now()-begin));await new Promise(resolve=>setTimeout(resolve,minWait));progress.hidden=true;btn.disabled=false;
 if(result.ok){if(result.available){
 const offer=$('adc85UpdateOffer');if(offer)offer.hidden=false;
 const ver=$('adc85NewVersion');if(ver)ver.textContent='MediLab X · '+result.version;
 const notes=$('adc85ReleaseNotes');if(notes)notes.textContent=Array.isArray(result.notes)?result.notes.join('\n'):String(result.notes||'Release notes not provided');
 addNotice('Update available','MediLab X version '+result.version+' is ready to review.','info',{key:'update-'+result.version});if(status)status.textContent='New version '+result.version+' available.'}
 else if(status)status.textContent='Your software is up to date.'}
 else if(status)status.textContent=result.error||'Update check failed.';
 },true);
 // The existing update system installs only after user confirmation; background checks never silently install.
 const updateNow=$('adc85UpdateNow');if(updateNow)updateNow.addEventListener('click',async e=>{
 e.stopImmediatePropagation();e.preventDefault();updateNow.disabled=true;
 const out=$('adc85UpdateMessage');if(out)out.textContent='Preparing verified installer…';
 try{const r=await desktop()?.installOnline?.();if(out)out.textContent=r?.ok?'Verified installer opened. Finish installation in Windows.':r?.cancelled?'Installation cancelled.':r?.error||'Install failed.'}
 catch(err){if(out)out.textContent='Install failed: '+String(err)}finally{updateNow.disabled=false}
 },true);
 desktop()?.onAutoUpdate?.(r=>{if(r?.ok&&r.available){const suppress=window.sessionStorage.getItem('mlx-later-'+r.version)==='yes';if(!suppress)addNotice('Software update available','Version '+r.version+' can be installed from Settings → Software Updates.','info',{key:'update-'+r.version,show:true})}});
 $('adc85RemindLater')?.addEventListener('click',()=>{const version=$('adc85NewVersion')?.textContent?.match(/\d+\.\d+(\.\d+)?/)?.[0];if(version){sessionStorage.setItem('mlx-later-'+version,'yes');addNotice('Update postponed','We will remind you when MediLab X restarts.','info',{show:false,key:'later-'+version})}},true);
}
function boot(){
 window.medilabNotify=(title,text,kind='info',key='')=>addNotice(title,text,kind,{key});
 setTimeout(()=>{document.documentElement.classList.remove('ml-splashing');const tb=$('adc85Titlebar');if(tb&&document.documentElement.classList.contains('medilab-desktop'))tb.style.setProperty('display','flex','important');desktop()?.windowReadyForLogin?.();},3210);
 normalizeBrand();fixSidebar();remakeAbout();notificationElements();addSettings();preventAboutScrollbar();styleAIBrand();checkProgress();
 $('adc85Restore')?.setAttribute('title','Maximize / Restore');
 desktop()?.onWindowState?.(state=>{const b=$('adc85Restore');if(b)b.textContent=state.maximized?'❐':'□'});
 // Cancel any unexpected legacy repositioning: only Electron shell controls window size.
 $('adc85ModalClose')?.addEventListener('click',()=>{$('mlx-update-wait')&&( $('mlx-update-wait').hidden=true )});
 localInsights();setInterval(()=>localInsights(),60000);
 const about=$('nav button[data-page="about"]');about?.addEventListener('click',()=>setTimeout(remakeAbout,0));
 // A brand normalization pass after the original startup settings initializers.
 setTimeout(normalizeBrand,200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();