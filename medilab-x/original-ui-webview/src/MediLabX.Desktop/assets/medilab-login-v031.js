/* Desktop-only compatibility patch: preserve the original login/auth code. */
(function(){
 'use strict';
 const logo='/MediLab-Heartbeat.png';
 function repairBrand(){
   const targets=document.querySelectorAll('img[alt*="heartbeat" i],img[alt*="MediLab X" i],#adcWelcomeEmblem img,#splashLogoShell img');
   for(const image of targets){
     if(image.dataset.ml031LogoBound==='1')continue;
     image.dataset.ml031LogoBound='1';
     const replace=()=>{if(image.getAttribute('src')!==logo){image.src=logo;image.dataset.ml031LogoFixed='1'}};
     image.addEventListener('error',replace,{once:true});
     if(image.complete&&image.naturalWidth===0)replace();
   }
   const mark=document.getElementById('adcWelcomeEmblem');
   if(mark&&!mark.querySelector('img')){
      const image=document.createElement('img');image.src=logo;image.alt='MediLab heartbeat logo';image.width=58;image.height=58;mark.replaceChildren(image);
   }
 }
 function sync(){
   const app=document.getElementById('app');
   const signedIn=!!app&&app.classList.contains('authenticated');
   document.documentElement.classList.toggle('ml031-authenticated',signedIn);
   // This obsolete HTML splash was being reinserted/showing after login. WPF owns startup now.
   document.getElementById('startupSplash')?.remove();
   document.getElementById('startupPanel')?.remove();
   if(signedIn){
     document.getElementById('adcWelcome')?.classList.add('adc-closed');
     const login=document.getElementById('loginScreen');if(login)login.style.display='none';
   }
 }
 function init(){
   repairBrand();sync();
   const app=document.getElementById('app');
   if(app){new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['class']});}
   const login=document.getElementById('adcWelcome');
   if(login){new MutationObserver(()=>{if(document.getElementById('app')?.classList.contains('authenticated'))sync()}).observe(login,{attributes:true,attributeFilter:['class']});}
   window.__ml031Ready=true;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();