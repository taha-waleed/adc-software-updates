'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const invoke=(name,...a)=>ipcRenderer.invoke('mlx:'+name,...a);
function listen(event,callback){if(typeof callback!=='function')return()=>{};const handler=(_,data)=>callback(data);ipcRenderer.on(event,handler);return()=>ipcRenderer.removeListener(event,handler)}
contextBridge.exposeInMainWorld('adcDesktop',Object.freeze({
 openPrintPreview:(html,options)=>invoke('openPrintPreview',html,options),openWhatsAppDesktop:(phone,message)=>invoke('openWhatsAppDesktop',phone,message),
 windowMinimize:()=>invoke('windowMinimize'),windowToggleMaximize:()=>invoke('windowToggleMaximize'),windowClose:()=>invoke('windowClose'),
 windowAuthenticated:()=>invoke('windowAuthenticated'),windowLoggedOut:()=>invoke('windowLoggedOut'),windowReadyForLogin:()=>invoke('windowReadyForLogin'),
 onWindowState:cb=>listen('mlx:window-state',cb),restartApp:()=>invoke('restartApp'),
 updateSource:()=>invoke('updateSource'),saveUpdateSource:url=>invoke('saveUpdateSource',url),checkOnline:()=>invoke('checkOnline'),installOnline:()=>invoke('installOnline'),installUpdate:()=>invoke('installUpdate'),rollbackUpdate:()=>invoke('rollbackUpdate'),updateSuccessNotice:()=>invoke('updateSuccessNotice'),onAutoUpdate:cb=>listen('mlx:auto-update',cb),
 geminiStatus:()=>invoke('geminiStatus'),geminiConfigure:key=>invoke('geminiConfigure',key),geminiAsk:message=>invoke('geminiAsk',message),geminiChat:message=>invoke('geminiChat',message)
}));