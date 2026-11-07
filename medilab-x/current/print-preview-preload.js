'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('medilabPrint',Object.freeze({
 print:(mode)=>ipcRenderer.invoke('mlx:previewPrint',mode)
}));