namespace MediLabX.Desktop;
internal static class JsBridge
{
 // Injected before any page scripts execute. No application data leaves this bridge
 // unless the user explicitly uses an external service (for example WhatsApp Desktop).
 public const string Script = """
 (() => {
   if (window.adcDesktop && window.adcDesktop.__medilabNative) return;
   let seq=0;
   const pending=new Map(), listeners={window:[],autoUpdate:[]};
   function invoke(method,...args){return new Promise(resolve=>{
     const id=++seq; pending.set(id,resolve);
     try{window.chrome.webview.postMessage({id,method,args});}
     catch(e){pending.delete(id);resolve({ok:false,error:String(e)});}
     setTimeout(()=>{if(pending.has(id)){pending.delete(id);resolve({ok:false,error:'Windows bridge timed out'});}},30000);
   });}
   // Prevent native form navigation if a legacy login handler is missing or throws.
   // This does not stop propagation: the existing MediLab authentication handler still runs.
   document.addEventListener('submit',e=>{
     if(e.target && e.target.id==='loginForm')e.preventDefault();
   },true);
   let errorCount=0;
   window.addEventListener('error',e=>{
      if(errorCount++<12)try{window.chrome.webview.postMessage({id:0,method:'clientDiagnostic',args:[String(e.message||'JavaScript error')+' at '+String(e.filename||'page')+':'+e.lineno]})}catch{}
   },true);
   window.addEventListener('unhandledrejection',e=>{
      if(errorCount++<12)try{window.chrome.webview.postMessage({id:0,method:'clientDiagnostic',args:[String(e.reason?.message||e.reason||'Promise rejection')]})}catch{}
   },true);
   window.chrome.webview.addEventListener('message',e=>{
     const m=e.data||{};
     if(m.id!=null){const cb=pending.get(m.id);if(cb){pending.delete(m.id);cb(m.result);}return;}
     if(m.event==='window-state')listeners.window.forEach(fn=>{try{fn(m.payload)}catch{}});
     if(m.event==='auto-update')listeners.autoUpdate.forEach(fn=>{try{fn(m.payload)}catch{}});
   });
   const api={
     __medilabNative:true,
     openPrintPreview:(html,options)=>invoke('openPrintPreview',html,options),
     openWhatsAppDesktop:(phone,message)=>invoke('openWhatsAppDesktop',phone,message),
     windowMinimize:()=>invoke('windowMinimize'),windowToggleMaximize:()=>invoke('windowToggleMaximize'),
     windowClose:()=>invoke('windowClose'),windowAuthenticated:()=>invoke('windowAuthenticated'),
     windowLoggedOut:()=>invoke('windowLoggedOut'),windowReadyForLogin:()=>invoke('windowReadyForLogin'),
     onWindowState:fn=>{listeners.window.push(fn);return()=>{const i=listeners.window.indexOf(fn);if(i>=0)listeners.window.splice(i,1)}},
     restartApp:()=>invoke('restartApp'),
     updateSource:()=>invoke('updateSource'),saveUpdateSource:url=>invoke('saveUpdateSource',url),
     checkOnline:()=>invoke('checkOnline'),installOnline:()=>invoke('installOnline'),
     installUpdate:()=>invoke('installOnline'),rollbackUpdate:()=>invoke('rollbackUpdate'),
     updateSuccessNotice:()=>invoke('updateSuccessNotice'),
     onAutoUpdate:fn=>{listeners.autoUpdate.push(fn);return()=>{const i=listeners.autoUpdate.indexOf(fn);if(i>=0)listeners.autoUpdate.splice(i,1)}},
     geminiStatus:()=>invoke('geminiStatus'),geminiConfigure:key=>invoke('geminiConfigure',key),
     geminiAsk:message=>invoke('geminiAsk',message),geminiChat:message=>invoke('geminiAsk',message)
   };
   Object.defineProperty(window,'adcDesktop',{value:api,configurable:false});
   // Desktop window dragging, only from title-bar areas, never text fields or buttons.
   document.addEventListener('pointerdown',e=>{
     if(e.button!==0) return;
     const t=e.target.closest('.desktop-titlebar,.app-titlebar,.mlx-window-titlebar,[data-window-drag]');
     if(t && !e.target.closest('button,a,input,select,textarea,[role=button]'))invoke('beginDrag');
   },true);
 })();
 """;
}