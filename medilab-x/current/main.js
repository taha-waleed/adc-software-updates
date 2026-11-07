'use strict';
const {app,BrowserWindow,ipcMain,dialog,shell} = require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const https=require('node:https'),crypto=require('node:crypto');
const VERSION='10.0.9';
const DEFAULT_UPDATE_SOURCE='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilab-x/update.json';
const root=path.join(app.getPath('appData'),'MediLab','Standard');
app.setPath('userData',root); // keep the existing MediLab Standard data location
// Keep Chromium's defaults; disabling runtime features can create inconsistent rendering.
let win,shownLogin=false,isAuthenticated=false,checking=false;
const printWindows=new Map();
const MAX_PREVIEW_CHARS=1200000;
const statePath=path.join(root,'medilab-x-desktop-settings.json');
function config(){try{return JSON.parse(fs.readFileSync(statePath,'utf8'))||{}}catch{return {}}}
function save(patch){fs.mkdirSync(root,{recursive:true});const x={...config(),...patch};fs.writeFileSync(statePath,JSON.stringify(x,null,2));return x}
function uiState(){if(!win||win.isDestroyed())return;win.webContents.send('mlx:window-state',{maximized:win.isMaximized()})}
function readyForLogin(){if(!win||win.isDestroyed()||shownLogin)return;shownLogin=true;win.setSkipTaskbar(false);if(!win.isMaximized()){win.setMinimumSize(990,670);win.setSize(1080,760);win.center()}uiState()}
function create(){
 win=new BrowserWindow({width:760,height:520,minWidth:760,minHeight:520,center:true,backgroundColor:'#122042',show:false,frame:false,title:'MediLab X',skipTaskbar:true,autoHideMenuBar:true,icon:path.join(__dirname,'assets','MediLab-X.ico'),webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,preload:path.join(__dirname,'preload.js'),webSecurity:true,spellcheck:false}});
 win.removeMenu();win.loadFile(path.join(__dirname,'index.html'),{query:{medilabDesktop:'1'}});
 win.once('ready-to-show',()=>{win.show()});
 win.webContents.on('did-finish-load',()=>{setTimeout(readyForLogin,3150)});
 win.on('maximize',uiState);win.on('unmaximize',uiState);
 win.on('closed',()=>{win=null});
 win.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\/(?:github\.com|aistudio\.google\.com|ai\.google\.dev)\//i.test(url)){shell.openExternal(url)}return{action:'deny'}});
 win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('file://'))e.preventDefault()});
}
const allowManifest=(raw)=>{try{const u=new URL(raw);return u.protocol==='https:'&&['raw.githubusercontent.com','github.com'].includes(u.hostname)&&!u.username&&!u.password}catch{return false}};
function remote(url,method='GET',body=null,timeout=12000,limit=15*1024*1024){return new Promise((resolve,reject)=>{
 const u=new URL(url);if(u.protocol!=='https:')return reject(new Error('HTTPS required'));
 const opts={method,timeout,headers:{'User-Agent':'MediLab-X/10.0.9','Accept':'application/json'}};
 if(body){opts.headers['Content-Type']='application/json';opts.headers['Content-Length']=Buffer.byteLength(body)}
 const req=https.request(u,opts,res=>{
  if([301,302,307,308].includes(res.statusCode)){const loc=new URL(res.headers.location,u).href;res.resume();if(!/^https:\/\//.test(loc))return reject(new Error('Insecure redirect'));return remote(loc,method,body,timeout,limit).then(resolve,reject)}
  if(res.statusCode<200||res.statusCode>=300){res.resume();return reject(new Error('HTTP '+res.statusCode))}
  const chunks=[];let len=0;res.on('data',x=>{len+=x.length;if(len>limit){req.destroy(new Error('Response too large'));return}chunks.push(x)});res.on('end',()=>resolve(Buffer.concat(chunks)));
 });req.on('timeout',()=>req.destroy(new Error('Connection timed out')));req.on('error',reject);if(body)req.write(body);req.end();
})}
function newer(v){const a=String(v).match(/^\d+(?:\.\d+){1,2}$/);if(!a)return false;const x=v.split('.').map(Number),y=VERSION.split('.').map(Number);for(let i=0;i<3;i++){const n=x[i]||0,m=y[i]||0;if(n!==m)return n>m}return false}
async function checkOnline(automatic=false){
 if(checking)return {ok:false,error:'An update check is already in progress.'};
 const savedSource=config().updateSource;const legacySource=typeof savedSource==='string'&&/\/adc-software-updates\/main\/update\.json(?:\?.*)?$/i.test(savedSource);const source=(!savedSource||legacySource)?DEFAULT_UPDATE_SOURCE:savedSource;
 if(!allowManifest(source))return {ok:false,error:'Invalid update URL: only trusted GitHub HTTPS manifests are supported.'};
 checking=true;
 try{const b=await remote(source);const d=JSON.parse(b.toString('utf8'));if(!d||typeof d.version!=='string')throw new Error('The update service is not ready yet. Please check again later.');
 const avail=newer(d.version);const url=String(d.downloadUrl||'');const sha=String(d.sha256||'').toLowerCase();const okDownload=/^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\/[^?]+\.exe(?:\?.*)?$/i.test(url)&&/^[a-f0-9]{64}$/.test(sha);
 const r={ok:true,available:avail,version:d.version,notes:Array.isArray(d.notes)?d.notes.slice(0,30).map(String):typeof d.notes==='string'?d.notes:'',downloadUrl:okDownload?url:null,sha256:okDownload?sha:null};
 if(avail){save({lastAvailableVersion:d.version});if(automatic&&win&&!win.isDestroyed())win.webContents.send('mlx:auto-update',r)}return r;
 }catch(err){return{ok:false,error:/HTTP 404/.test(err.message)?'No verified installer has been released yet. Please check again later.':err.message}}finally{checking=false}
}
async function downloadVerified(file,hash){
 if(!/^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\/[^?]+\.exe(?:\?.*)?$/i.test(file)||!/^[a-f0-9]{64}$/i.test(hash))throw new Error('Invalid update package metadata');
 // Electron uses its own secure HTTPS connection; no forced install.
 const buffer=await remote(file,'GET',null,120000,1024*1024*1024);
 const actual=crypto.createHash('sha256').update(buffer).digest('hex');if(actual!==hash.toLowerCase())throw new Error('SHA-256 mismatch. Installation cancelled.');
 const filename='MediLab-X-verified-'+Date.now()+'.exe';const dest=path.join(os.tmpdir(),filename);fs.writeFileSync(dest,buffer);return dest
}
async function installOnline(){const info=await checkOnline();if(!info.ok||!info.available)return{ok:false,error:info.error||'No new update is available'};if(!info.downloadUrl)return{ok:false,error:'Manifest lacks a valid GitHub EXE and SHA-256 checksum'};
 if(!win||win.isDestroyed())return{ok:false,error:'Window not available'};
 const answer=await dialog.showMessageBox(win,{type:'question',buttons:['Cancel','Download and open installer'],defaultId:0,cancelId:0,message:'Install MediLab X '+info.version+'?',detail:'Back up the patient database before updating. Only the verified installer will be opened. Installation needs your confirmation.'});if(answer.response!==1)return{ok:false,cancelled:true};
 try{const exe=await downloadVerified(info.downloadUrl,info.sha256);save({installingVersion:info.version});const error=await shell.openPath(exe);if(error)return{ok:false,error};return{ok:true,message:'Verified installer opened'}}catch(e){return{ok:false,error:e.message}}
}

// Native Windows preview, print dialog and WhatsApp Desktop integration.
// Only the authenticated main renderer may register a print preview;
// only its own child print window may request a print job.
const validPhone=(input)=>/^\d{8,15}$/.test(String(input||''));
function previewOptions(input){
 const o=input&&typeof input==='object'?input:{};
 return {autoPrint:!!o.autoPrint,receipt:!!o.receipt,phone:validPhone(o.phone)?String(o.phone):'',
 message:String(o.message||'').slice(0,1500)};
}
async function openPrintPreview(event,html,input){
 if(!win||win.isDestroyed()||event.sender.id!==win.webContents.id)return{ok:false,error:'Print preview is only available inside MediLab.'};
 if(!isAuthenticated)return{ok:false,error:'Sign in before printing.'};
 if(typeof html!=='string'||html.length<20||html.length>MAX_PREVIEW_CHARS||!/^\s*<!doctype html>/i.test(html))return{ok:false,error:'Invalid print document.'};
 const opts=previewOptions(input);
 let child=new BrowserWindow({parent:win,modal:false,width:opts.receipt?570:1040,height:opts.receipt?850:900,minWidth:480,minHeight:450,show:false,
 title:opts.receipt?'MediLab X · Receipt Preview':'MediLab X · Print Preview',autoHideMenuBar:true,backgroundColor:'#ffffff',
 webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,preload:path.join(__dirname,'print-preview-preload.js')}});
 child.removeMenu();
 child.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 child.webContents.on('will-navigate',(e)=>e.preventDefault());
 child.webContents.on('will-attach-webview',(e)=>e.preventDefault());
 const id=child.webContents.id;printWindows.set(id,{child,...opts,busy:false,whatsappOpened:false});
 child.on('closed',()=>printWindows.delete(id));
 try{
  // No external URL requests: each print job is loaded from memory into this sandboxed view.
  await child.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));
  if(!child.isDestroyed())child.show();
  if(opts.autoPrint&&!child.isDestroyed()){
   child.webContents.print({silent:false,printBackground:true},()=>{});
  }
  return{ok:true};
 }catch(e){if(!child.isDestroyed())child.close();return{ok:false,error:'Preview could not be opened: '+e.message}}
}
async function openWhatsAppDesktop(phone,message){
 if(process.platform!=='win32')return{ok:false,error:'WhatsApp Desktop integration requires Windows.'};
 if(!validPhone(phone))return{ok:false,error:'A valid international phone number is required.'};
 // Deliberately NO wa.me or WhatsApp Web fallback.
 const url='whatsapp://send?phone='+encodeURIComponent(phone)+'&text='+encodeURIComponent(String(message||'').slice(0,1500));
 try{await shell.openExternal(url);return{ok:true}}catch(e){return{ok:false,error:'Install and sign in to WhatsApp Desktop in Windows. No browser fallback will be used.'}}
}
async function printFromPreview(event,mode){
 const entry=printWindows.get(event.sender.id);
 if(!entry||entry.child.isDestroyed())return{ok:false,error:'Unknown print window.'};
 if(entry.busy)return{ok:false,error:'Printing in progress.'};
 entry.busy=true;
 const page=entry.child.webContents;
 try{
  // Class names must be set before the native printing snapshot is taken.
  const selected=['patient','centre','both'].includes(mode)?mode:'both';
  if(entry.receipt)await page.executeJavaScript(`document.body.classList.toggle('only-patient',${selected==='patient'});document.body.classList.toggle('only-centre',${selected==='centre'});`);
  const result=await new Promise(resolve=>page.print({silent:false,printBackground:true},(success,failureReason)=>resolve({success,reason:failureReason})));
  if(!result.success)return{ok:false,cancelled:true,error:result.reason||'Print cancelled'};
  // Print was queued, not proof that paper came out.
  let whatsapp={ok:false,skipped:true};
  if(entry.receipt&&entry.phone&&!entry.whatsappOpened){entry.whatsappOpened=true;whatsapp=await openWhatsAppDesktop(entry.phone,entry.message)}
  return{ok:true,queued:true,whatsapp};
 }catch(e){return{ok:false,error:String(e.message||e)}}finally{entry.busy=false}
}

function bind(){
 const on=(name,fn)=>ipcMain.handle('mlx:'+name,fn);
 on('openPrintPreview',openPrintPreview);
 on('previewPrint',printFromPreview);
 on('openWhatsAppDesktop',(_,phone,message)=>openWhatsAppDesktop(phone,message));
 on('windowMinimize',()=>{win?.minimize();return{ok:true}});
 on('windowToggleMaximize',()=>{if(!win)return{ok:false};if(win.isMaximized())win.unmaximize();else win.maximize();uiState();return{ok:true,maximized:win.isMaximized()}});
 on('windowClose',()=>{win?.close();return{ok:true}});
 on('windowAuthenticated',()=>{if(!win)return{ok:false};isAuthenticated=true;readyForLogin();if(!win.isMaximized())win.maximize();uiState();return{ok:true}});
 on('windowLoggedOut',()=>{if(!win||!isAuthenticated)return{ok:true};isAuthenticated=false;if(win.isMaximized())win.unmaximize();win.setSize(1080,760);win.center();uiState();return{ok:true}});
 on('windowReadyForLogin',()=>{readyForLogin();return{ok:true}});
 on('restartApp',()=>{app.relaunch();app.exit(0);return{ok:true}});
 on('updateSource',()=>({ok:true,url:config().updateSource||DEFAULT_UPDATE_SOURCE}));
 on('saveUpdateSource',(_,url)=>{if(url&&!allowManifest(url))return{ok:false,error:'Use a RAW GitHub HTTPS manifest URL.'};save({updateSource:url||''});return{ok:true}});
 on('checkOnline',()=>checkOnline(false));
 on('installOnline',installOnline);
 on('installUpdate',async()=>{const r=await dialog.showOpenDialog(win,{title:'Select MediLab update installer',properties:['openFile'],filters:[{name:'Windows installer',extensions:['exe']} ]});if(r.canceled)return{ok:false,cancelled:true};return{ok:false,error:'Manual installers cannot be verified automatically. Use the trusted GitHub update manifest instead.'}});
 on('rollbackUpdate',()=>({ok:false,error:'Rollback is not automated. Restore a verified backup and use a signed previous installer.'}));
 on('updateSuccessNotice',()=>{const c=config();if(c.installingVersion===VERSION){save({installingVersion:null});return{ok:true,version:VERSION}}return{ok:false}});
 // Gemini model selection: never bundle the API key in HTML or in the installer.
 const DEFAULT_GEMINI_MODEL='gemini-3.8-flash';
 const selectedGeminiModel=()=>String(process.env.GEMINI_MODEL||DEFAULT_GEMINI_MODEL).trim();
 on('geminiStatus',()=>({ok:true,configured:!!process.env.GEMINI_API_KEY,model:selectedGeminiModel(),recommendedModel:DEFAULT_GEMINI_MODEL,legacyModel:selectedGeminiModel()==='gemini-2.5-flash'}));
 on('geminiConfigure',()=>({ok:false,error:'For security, set GEMINI_API_KEY in Windows User Environment Variables and restart MediLab. See GEMINI-SETUP.md.'}));
 async function geminiRequest(key,model,question){
  const api='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent';
  const reqBody=JSON.stringify({contents:[{role:'user',parts:[{text:question}]}],generationConfig:{maxOutputTokens:1100}});
  return new Promise((resolve,reject)=>{
   const r=https.request(api,{method:'POST',timeout:24000,headers:{'Content-Type':'application/json','x-goog-api-key':key}},res=>{
    let chunks=[],len=0;
    res.on('data',x=>{len+=x.length;if(len>2*1024*1024){r.destroy(new Error('Response too large'));return}chunks.push(x)});
    res.on('end',()=>{const data=Buffer.concat(chunks);if(res.statusCode>=400){const err=new Error('Gemini HTTP '+res.statusCode);err.status=res.statusCode;return reject(err)}resolve(data)});
   });
   r.on('error',reject);r.on('timeout',()=>r.destroy(new Error('AI request timed out')));r.write(reqBody);r.end();
  });
 }
 const geminiFriendlyError=(e,model)=>{
  if(e.status===404)return 'Gemini model '+model+' is unavailable for this API key. Set GEMINI_MODEL=gemini-3.8-flash in Windows User Environment Variables and completely restart MediLab.';
  if(e.status===401||e.status===403)return 'Gemini API key was not accepted or access is restricted. Check GEMINI_API_KEY, the Google AI Studio project, and billing/access settings.';
  if(e.status===429)return 'Gemini usage quota/rate limit reached. Review your Google AI Studio usage and billing, then try again.';
  if(e.status>=500)return 'Gemini service is temporarily unavailable (HTTP '+e.status+'). Try again later.';
  if(e.status)return 'Gemini request failed (HTTP '+e.status+'). Check the model, API access and network.';
  return String(e?.message||'Gemini connection failed').slice(0,230);
 };
 const ask=async(_,prompt)=>{
  const key=process.env.GEMINI_API_KEY;
  if(!key)return{ok:false,error:'Gemini key not configured. Set GEMINI_API_KEY in Windows User Environment Variables and restart MediLab.'};
  const q=String(prompt||'').trim().slice(0,4000);
  if(!q)return{ok:false,error:'Enter a question first.'};
  const model=selectedGeminiModel();
  if(!/^[a-zA-Z0-9.\-]{3,70}$/.test(model))return{ok:false,error:'Invalid GEMINI_MODEL. Use gemini-3.8-flash.'};
  let usedModel=model,usedFallback=false;
  try{
   let result;
   try{result=await geminiRequest(key,model,q)}catch(e){
    // One compatibility retry for old installations with an explicit stale override.
    if(e.status===404&&model==='gemini-2.5-flash'){
     usedModel=DEFAULT_GEMINI_MODEL;usedFallback=true;
     result=await geminiRequest(key,DEFAULT_GEMINI_MODEL,q);
    } else throw e;
   }
   const j=JSON.parse(result.toString('utf8'));
   return{ok:true,model:usedModel,usedFallback,text:(j.candidates?.[0]?.content?.parts||[]).map(x=>x.text||'').join('\n').slice(0,12000)||'No content returned.'};
  }catch(e){return{ok:false,error:geminiFriendlyError(e,usedModel),model:usedModel}}
 };
 on('geminiAsk',ask);on('geminiChat',async(_,arg)=>ask(null,typeof arg==='string'?arg:arg?.prompt||arg?.message||''));
}
app.whenReady().then(()=>{bind();create();setTimeout(()=>{checkOnline(true).catch(()=>{})},20000);setInterval(()=>{checkOnline(true).catch(()=>{})},60*60*1000)});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});