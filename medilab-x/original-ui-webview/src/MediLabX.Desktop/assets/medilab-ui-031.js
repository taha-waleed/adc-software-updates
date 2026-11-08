/* MediLab X Desktop 0.3.1: non-destructive UI/login watchdog. */
(() => {
 'use strict';
 if(window.__mlx031UiMounted) return;
 window.__mlx031UiMounted=true;
 const diagnostic=(kind)=>{try{window.adcDesktop?.clientDiagnostic?.(kind)}catch{}};
 const state={authenticated:false,everUnlocked:sessionStorage.getItem('mlx031SplashPlayed')==='yes'};
 function ensureLogo(){
  const fix=el=>{
   if(!el||el.dataset.mx031LogoRepaired==='1')return;
   el.dataset.mx031LogoRepaired='1';
   const target='/MediLab-Heartbeat.png';
   // Broken legacy links are repaired without altering the user's configured logos.
   const src=el.getAttribute('src')||'';
   if(/MediLab-Heartbeat/i.test(src)||/heartbeat mark/i.test(el.alt||'')){
     el.addEventListener('error',()=>{if(!el.dataset.mx031LogoFallback){el.dataset.mx031LogoFallback='1';el.src=target;}},{once:true});
     if(!el.complete||el.naturalWidth===0||src.startsWith('assets/'))el.src=target;
   }
  };
  document.querySelectorAll('img').forEach(fix);
  const shell=document.getElementById('adcWelcomeEmblem');
  if(shell && !shell.querySelector('img')){
    const img=new Image(); img.alt='MediLab Heartbeat';img.src='/MediLab-Heartbeat.png';
    shell.replaceChildren(img);
  }
 }
 function hideSplash(){
  state.everUnlocked=true;
  sessionStorage.setItem('mlx031SplashPlayed','yes');
  document.documentElement.classList.add('mx031-after-launch');
  const splash=document.getElementById('startupSplash');if(splash){splash.classList.add('leaving');splash.style.display='none';}
 }
 function syncLogin(){
  const app=document.getElementById('app'); if(!app)return;
  const authenticated=app.classList.contains('authenticated');
  if(authenticated){
    hideSplash();
    if(!state.authenticated)diagnostic('authenticated');
    state.authenticated=true;
    const login=document.getElementById('loginScreen'); if(login)login.style.display='none';
    const welcome=document.getElementById('adcWelcome');if(welcome)welcome.classList.add('adc-closed');
  }else{
    if(state.authenticated)diagnostic('signed-out');
    state.authenticated=false;
    if(state.everUnlocked)hideSplash();
  }
 }
 function install(){
  ensureLogo();
  if(state.everUnlocked)hideSplash();
  const app=document.getElementById('app');
  if(app){new MutationObserver(syncLogin).observe(app,{attributes:true,attributeFilter:['class','style']});syncLogin()}
  const form=document.getElementById('loginForm');
  if(form){
    form.addEventListener('submit',()=>{hideSplash();diagnostic('login-form-submitted')},true);
    const error=document.getElementById('loginError');if(error){
      new MutationObserver(()=>{
        if(/software start nahi|failed to start|could not open/i.test(error.textContent||''))diagnostic('legacy-dashboard-init-failure');
      }).observe(error,{childList:true,characterData:true,subtree:true});
    }
  }
  window.addEventListener('error',()=>diagnostic('browser-script-error'));
  window.addEventListener('unhandledrejection',()=>diagnostic('browser-unhandled-rejection'));
  // A second startup splash caused by legacy scripts may not obscure the login form/dashboard.
  const splash=document.getElementById('startupSplash');if(splash){
    new MutationObserver(()=>{if(state.everUnlocked && splash.style.display!=='none')splash.style.display='none';}).observe(splash,{attributes:true,attributeFilter:['style','class']});
  }
  diagnostic('ui-polish-ready');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();