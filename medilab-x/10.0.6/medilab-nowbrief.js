/* MediLab X 10.0.6 — Now Brief only: on-device analytics + opt-in Gemini wording.
   Reads saved modules locally. Never sends raw patient/employee records or medical text to Gemini. */
(()=>{'use strict';
const $=id=>document.getElementById(id),STORE='mlx_nowbrief_v106';
const money=n=>'Rs '+Math.round(n||0).toLocaleString('en-PK');
const num=n=>{const v=Number(n);return Number.isFinite(v)?v:0};
const arr=x=>Array.isArray(x)?x:[];
const date=d=>{const x=d||new Date();return [x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-')};
const isoBack=n=>{const d=new Date();d.setDate(d.getDate()-n);return date(d)};
const data=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')||{}}catch(_){return{}}};
const pref=()=>({cloud:false,frequency:18,...data(STORE)});
const save=v=>localStorage.setItem(STORE,JSON.stringify({...pref(),...v}));
const active=()=>!!$('app')?.classList.contains('authenticated');
function snapshot(){
 const d=data('ahdc_software_v1'),op=data('mlx_operations_v1');
 const patients=arr(d.patients),exp=arr(d.expenses),r=arr(d.reports),b=arr(op.items),staff=arr(op.employees),leaves=arr(op.leaves);
 const today=date(),prior=isoBack(1),week=isoBack(6),month=today.slice(0,7);
 const day=patients.filter(p=>p.date===today),weekP=patients.filter(p=>p.date>=week&&p.date<=today),prevP=patients.filter(p=>p.date===prior),monthP=patients.filter(p=>String(p.date||'').startsWith(month));
 const due=p=>Math.max(0,num(p.subtotal||p.total||0)-num(p.discount)-num(p.received));
 const received=p=>arr(p).reduce((v,x)=>v+num(x.received),0);
 const billed=p=>arr(p).reduce((v,x)=>v+Math.max(0,num(x.subtotal||x.total)-num(x.discount)),0);
 const expense=p=>arr(p).reduce((v,x)=>v+num(x.amount),0);
 const expToday=exp.filter(x=>x.date===today),expWeek=exp.filter(x=>x.date>=week&&x.date<=today);
 let low=0,expired=0,finished=0,lowStock=0;
 const todayStamp=new Date(today+'T12:00:00').getTime(),days=Number(op.settings?.expiryAlertDays)||30;
 for(const x of b){if(x.closed||num(x.qty)<=0){finished++;continue};lowStock+=num(x.qty);const dt=new Date(String(x.expiry||'')+'T12:00:00').getTime();if(Number.isFinite(dt)){const n=Math.round((dt-todayStamp)/86400000);if(n<0)expired++;else if(n<=days)low++}}
 const tests={},ref=new Map();
 for(const p of patients){for(const t of arr(p.tests)){const name=String(t.name||t.test||'').slice(0,55);if(name)tests[name]=(tests[name]||0)+1}
  const referring=String(p.doctor||p.referringDoctor||'').trim();if(referring)ref.set(referring,(ref.get(referring)||0)+1)}
 const topTest=Object.entries(tests).sort((a,b)=>b[1]-a[1])[0];
 return {day:today,visits:patients.length,todayVisits:day.length,weekVisits:weekP.length,monthVisits:monthP.length,
  allReceived:received(patients),todayReceived:received(day),weekReceived:received(weekP),monthReceived:received(monthP),
  prevReceived:received(prevP),todayBilled:billed(day),totalDue:patients.reduce((v,p)=>v+due(p),0),dueVisits:patients.filter(p=>due(p)>0).length,
  totalExpense:expense(exp),todayExpense:expense(expToday),weekExpense:expense(expWeek),expenseEntries:exp.length,
  reports:r.length,testsTotal:Object.values(tests).reduce((a,b)=>a+b,0),topTest:topTest?{name:topTest[0],count:topTest[1]}:null,
  referrals:ref.size,referralVisits:[...ref.values()].reduce((a,b)=>a+b,0),
  reagentBatches:b.length,expiring:low,expired,finished,stockUnits:Math.round(lowStock*100)/100,
  employees:staff.length,leavePending:leaves.filter(l=>String(l.status||'').toLowerCase()==='pending').length,
  salarySlips:arr(op.salaries).length,letters:arr(op.letters).length,
  changedAt:Math.floor(Date.now()/600000)};
}
function messages(s){let m=[];const a=(id,msg,prio=0)=>m.push({id,msg,prio});
 a('intro',`MediLab X is ready. ${s.visits.toLocaleString('en-PK')} patient visit${s.visits===1?'':'s'} saved across your centre.`,0);
 a('today-visits',`Today's reception has recorded ${s.todayVisits} patient visit${s.todayVisits===1?'':'s'} so far.`,1);
 a('week-visits',`Over the last seven days, ${s.weekVisits} patient visit${s.weekVisits===1?'':'s'} were registered.`,1);
 a('month-visits',`This month, MediLab has recorded ${s.monthVisits} patient visits.`,1);
 a('today-collected',`Today's received payments total ${money(s.todayReceived)}.`,2);
 a('week-collected',`Collections during the last seven days add up to ${money(s.weekReceived)}.`,2);
 a('month-collected',`This month's collections currently stand at ${money(s.monthReceived)}.`,2);
 a('all-collected',`Saved patient receipts show ${money(s.allReceived)} collected in total.`,0);
 a('expenses-today',`Today's recorded expenses are ${money(s.todayExpense)}.`,1);
 a('expenses-week',`The last seven days contain ${money(s.weekExpense)} in expenses.`,1);
 a('outstanding',`${money(s.totalDue)} remains outstanding across ${s.dueVisits} patient visit${s.dueVisits===1?'':'s'}. Review balances in Patients & Receipts.`,s.totalDue>0?4:0);
 if(s.todayReceived>0&&s.todayExpense>s.todayReceived*.65)a('expense-warning',`Expenses are ${Math.round(s.todayExpense/s.todayReceived*100)}% of today's collections; review spending.`,6);
 if(s.todayReceived>0&&s.prevReceived>0&&s.todayReceived>s.prevReceived*1.2)a('growth',`Congratulations! Today's collections are ${money(s.todayReceived)}, above yesterday's ${money(s.prevReceived)}.`,5);
 if(s.todayVisits>0&&s.todayBilled>0)a('billing',`Today's registered billing is ${money(s.todayBilled)} across ${s.todayVisits} visits.`,2);
 if(s.expired)a('expired',`${s.expired} reagent batch${s.expired===1?' is':'es are'} past the recorded expiry date. Please review stock before use.`,7);
 if(s.expiring)a('expiry',`${s.expiring} active reagent batch${s.expiring===1?' is':'es are'} nearing expiry. Check Laboratory stock.`,6);
 if(s.finished)a('finished',`${s.finished} reagent batch${s.finished===1?' is':'es are'} marked finished or out of stock; history remains saved.`,2);
 if(s.reagentBatches)a('batches',`${s.reagentBatches} reagent batches are registered in Laboratory inventory.`,2);
 if(s.leavePending)a('leave',`${s.leavePending} employee leave request${s.leavePending===1?' is':'s are'} pending in Admin.`,5);
 if(s.employees)a('employees',`${s.employees} employee record${s.employees===1?' is':'s are'} available in Admin.`,1);
 if(s.salarySlips)a('payroll',`${s.salarySlips} salary slip${s.salarySlips===1?' is':'s are'} recorded in payroll.`,1);
 if(s.letters)a('letters',`${s.letters} experience letter${s.letters===1?' is':'s are'} saved in HR.`,1);
 if(s.reports)a('reports',`${s.reports} radiology report record${s.reports===1?' is':'s are'} saved.`,2);
 if(s.topTest)a('top-test',`The most frequently recorded test is ${s.topTest.name}, appearing ${s.topTest.count} times.`,3);
 if(s.referrals)a('referrals',`${s.referralVisits} recorded visits have referring doctors across ${s.referrals} distinct names.`,2);
 if(!s.visits)a('first-visit','Register your first patient to start generating meaningful daily trends.',2);
 if(!s.reagentBatches)a('stock-setup','Add reagent batches with lot numbers and expiry dates to activate stock reminders.',1);
 if(!s.expenseEntries)a('expenses-setup','Record daily expenses to compare operating costs with collections.',1);
 if(!s.reports)a('report-workflow','Radiology reports can be managed inside the Reports workspace.',0);
 return m;
}
let current='',index=0,source=null,lastHash='',inflight=false,lastAIAt=0,generated='',aiSig='';
let recently=[];try{recently=JSON.parse(sessionStorage.getItem('mlx_brief_recent_v106')||'[]')}catch{}
function output(text){if(!source||!text)return;source.textContent=text;source.classList.remove('mlx-brief-reveal');void source.offsetWidth;source.classList.add('mlx-brief-reveal');current=text}
function pick(items){const sorted=[...items].sort((a,b)=>b.prio-a.prio);const options=sorted.filter(x=>!recently.includes(x.id));const pool=options.length?options:sorted;const chosen=pool[index%pool.length];index++;if(!chosen)return null;
 recently.push(chosen.id);if(recently.length>Math.min(12,Math.max(2,items.length-1)))recently.shift();try{sessionStorage.setItem('mlx_brief_recent_v106',JSON.stringify(recently))}catch{}return chosen}
function safeAI(candidate,text){let t=String(text||'').replace(/[\r\n]+/g,' ').trim().replace(/^['"“]|['"”]$/g,'');if(t.length<25||t.length>190)return null;
 const nums=s=>[...s.matchAll(/\b(?:\d[\d,]*)(?:\.\d+)?%?\b/g)].map(m=>m[0].replace(/,/g,'')).sort();
 if(JSON.stringify(nums(t))!==JSON.stringify(nums(candidate)))return null;
 if(/\b(?:patient name|MR number|diagnos|prescri|medical advice|personal phone)\b/i.test(t))return null;return t}
async function maybeGemini(s,selected){if(inflight||!pref().cloud||!active()||!window.adcDesktop?.geminiAsk||!selected)return;
 if(Date.now()-lastAIAt<60*60*1000)return;lastAIAt=Date.now();inflight=true;
 const prompt=`You write ONE professional English Now Brief sentence for the MediLab X dashboard.\nRewrite the verified statement below for variety, no extra facts. Preserve every number and monetary amount EXACTLY. Do not mention any individual patient, staff member, doctor, phone, MR number, or clinical findings. Only output one sentence, max 180 characters. Do not invent metrics.\nVERIFIED STATEMENT: ${selected.msg}\nSAFE NON-IDENTIFYING METRIC COUNTS: ${JSON.stringify({visitsToday:s.todayVisits,visits7Days:s.weekVisits,receivedToday:s.todayReceived,expensesToday:s.todayExpense,outstanding:s.totalDue,expiringBatches:s.expiring,pendingLeave:s.leavePending})}`;
 try{const result=await window.adcDesktop.geminiAsk(prompt);if(result?.ok){const safe=safeAI(selected.msg,result.text);if(safe){generated=safe;aiSig=selected.id;output(safe)}}}catch(_){}finally{inflight=false}}
function render(){if(!active())return;const s=snapshot();const hash=JSON.stringify({...s,changedAt:undefined});const items=messages(s);const selected=pick(items);if(!selected)return;
 const kick=$('adc85NowBrief')?.querySelector('.adc85-brief-kicker');if(kick)kick.textContent='MEDILAB INTELLIGENCE · LIVE DATA';
 output(aiSig===selected.id&&generated?generated:selected.msg);if(hash!==lastHash){lastHash=hash;lastAIAt=0}maybeGemini(s,selected)}
function controls(){const target=document.querySelector('[data-setting-view="brief"]')||document.querySelector('#settings .adc-settings-group');if(!target||$('mlx-brief-controls'))return;
 const box=document.createElement('div');box.id='mlx-brief-controls';box.className='adc-settings-group';box.innerHTML='<h2>AI Now Brief</h2><p class="muted">Local, read-only analysis of patient visits, receipts, expenses, reports, reagent inventory and HR. No individual medical or patient records leave the PC.</p><label class="mlx-brief-toggle"><input id="mlx-brief-cloud" type="checkbox"> Optional Gemini wording improvements (sends only anonymized aggregate statistics, at most hourly)</label><p class="muted">Requires Gemini API key configured in Windows. Local insights work offline. Cloud mode never changes saved records.</p>';
 target.append(box);const el=$('mlx-brief-cloud');el.checked=!!pref().cloud;el.onchange=()=>save({cloud:el.checked})}
function eliminateChat(){document.querySelectorAll('#ml10AiOpen,#ml10AiPanel,#ml10AiBackdrop,#adcAiOverlay,#adcAssistantOpen,#adc85DeveloperGeminiMount,#mlx-ai-local-preview,#mlx-ai-data-option').forEach(n=>{if(n.id==='ml10AiPanel'||n.id==='ml10AiBackdrop'||n.id==='adcAiOverlay'){n.setAttribute('aria-hidden','true');n.remove()}else n.hidden=true});
 document.querySelectorAll('[data-open-settings="mlxaicustom"],[data-open-settings="gemini"],#adc85GeminiSave,#adc85GeminiRemove').forEach(n=>n.hidden=true)}
function init(){const old=$('adc85BriefCopy');if(!old){setTimeout(init,100);return};
 // Legacy animation observers capture the original node. Replace it once to avoid old stock phrases overwriting real metrics.
 source=old.cloneNode(false);source.id='adc85BriefCopy';old.replaceWith(source);
 $('adc85NowBrief')?.classList.add('mlx-nowbrief-smart');controls();eliminateChat();render();
 setInterval(()=>{eliminateChat();controls()},7000);
 setInterval(()=>{render()},Math.max(12,Math.min(90,num(pref().frequency))) *1000);
 window.addEventListener('storage',e=>{if(['ahdc_software_v1','mlx_operations_v1'].includes(e.key))render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,900),{once:true});else setTimeout(init,900);
})();