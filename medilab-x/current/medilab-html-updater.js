/* MediLab X: one-time native bridge for verified future HTML-only releases.
 * Stable update path; migrate localStorage once with OS-encrypted backup.
 * No auto-install, no non-GitHub code, no changes to patient records.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {safeStorage}=require('electron');
const {createHash}=require('node:crypto');
const REPO='https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilab-x/';
const VALID_VERSION=/^\d+\.\d+\.\d+$/;
const VALID_SHA=/^[a-f0-9]{64}$/i;
const uiRoot=root=>path.join(root,'html-updates');
const uiFile=root=>path.join(uiRoot(root),'active.html');
const encryptedBackup=root=>path.join(uiRoot(root),'migration-backup.enc');
const newer=(next,prev)=>{
 if(!VALID_VERSION.test(String(next))||!VALID_VERSION.test(String(prev)))return false;
 const a=next.split('.').map(Number),b=prev.split('.').map(Number);
 for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]>b[i];return false;
};
const approvedUrl=s=>{
 try{const u=new URL(String(s));return u.protocol==='https:'&&u.origin==='https://raw.githubusercontent.com'&&
 u.pathname.startsWith('/taha-waleed/adc-software-updates/main/medilab-x/MediLab_X_')&&u.pathname.endsWith('.html')&&
 !u.username&&!u.password&&!u.search&&!u.hash}catch{return false}
};
function init({root,app,dialog,remote,save,config,VERSION,getWindow}){
 const current=()=>String(config().activeHtmlVersion||VERSION);
 function activeFile(fallback){
  const p=uiFile(root),set=config();if(!set.activeHtmlVersion||!fs.existsSync(p))return fallback;
  try{const data=fs.readFileSync(p);if(createHash('sha256').update(data).digest('hex')===set.activeHtmlSha256)return p}catch(_){}
  // Fail closed: retain built-in UI if the updated file is corrupt or missing.
  return fallback;
 }
 function examine(meta){
  const v=String(meta.htmlVersion||''),url=String(meta.htmlUrl||''),sha=String(meta.htmlSha256||'').toLowerCase();
  const valid=VALID_VERSION.test(v)&&approvedUrl(url)&&VALID_SHA.test(sha);
  return {valid,available:valid&&newer(v,current()),version:valid?v:current(),url:valid?url:'',sha256:valid?sha:''};
 }
 async function install(meta){
  const info=examine(meta);if(!info.available)return{ok:false,error:'No verified HTML update is available.'};
  const win=getWindow();if(!win||win.isDestroyed())return{ok:false,error:'MediLab window unavailable.'};
  if(!safeStorage.isEncryptionAvailable())return{ok:false,error:'Secure Windows storage is unavailable. HTML updates cannot be applied safely.'};
  const dialogResult=await dialog.showMessageBox(win,{type:'question',buttons:['Cancel','Install HTML update'],defaultId:0,cancelId:0,
   message:'Update MediLab X interface to '+info.version+'?',detail:'Verified HTML only; no installer. Saved records remain local. MediLab will restart after downloading.'});
  if(dialogResult.response!==1)return{ok:false,cancelled:true};
  try{
   const file=await remote(info.url,'GET',null,30000,7*1024*1024);
   const actual=createHash('sha256').update(file).digest('hex');
   if(actual!==info.sha256)throw new Error('HTML SHA-256 mismatch. Update was cancelled.');
   const html=file.toString('utf8');
   if(!/<!doctype html/i.test(html)||!/<html\b/i.test(html)||!/<\/html\s*>/i.test(html)||!/MediLab X/i.test(html))throw new Error('Unexpected HTML package. No changes made.');
   fs.mkdirSync(uiRoot(root),{recursive:true});
   // Capture localStorage before changing file origin. Keep encrypted recovery backup.
   const json=await win.webContents.executeJavaScript(`(()=>{const d={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);d[k]=localStorage.getItem(k)}return JSON.stringify(d)})()`,true);
   if(typeof json!=='string'||json.length<2||json.length>80*1024*1024)throw new Error('Could not securely back up local data. Update cancelled.');
   const backup=safeStorage.encryptString(json);
   const temp=path.join(uiRoot(root),'incoming-'+Date.now()+'.html');
   fs.writeFileSync(temp,file,{flag:'wx'});
   fs.writeFileSync(encryptedBackup(root),backup);
   fs.renameSync(temp,uiFile(root));
   save({activeHtmlVersion:info.version,activeHtmlSha256:actual,uiMigrationRequired:true});
   app.relaunch();app.exit(0);
   return{ok:true,restarting:true};
  }catch(e){return{ok:false,error:String(e.message||e)}}
 }
 async function migrate(win){
  const state=config();if(!state.uiMigrationRequired)return false;
  if(!win||win.isDestroyed()||!fs.existsSync(encryptedBackup(root)))return false;
  try{
   const value=safeStorage.decryptString(fs.readFileSync(encryptedBackup(root)));
   // JSON is quoted twice rather than interpolated as executable code.
   const program='(()=>{const o=JSON.parse('+JSON.stringify(value)+');for(const [k,v] of Object.entries(o)){if(typeof v==="string")localStorage.setItem(k,v)}return Object.keys(o).length})()';
   await win.webContents.executeJavaScript(program,true);
   save({uiMigrationRequired:false});
   // Reload so app modules initialize from restored records, not empty defaults.
   win.webContents.reload();return true;
  }catch(err){return false}
 }
 return {current,activeFile,examine,install,migrate,needsMigration:()=>!!config().uiMigrationRequired};
}
module.exports={init};