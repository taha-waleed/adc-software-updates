/* MediLab X 10.2 Pearl Clinical — presentation-only activation. */
(()=>{'use strict';
 function activate(){
   if(!document.body)return;
   document.body.classList.add('mlx202-release');
   const theme=document.getElementById('mlx102-theme');
   if(theme&&document.head&&document.head.lastElementChild!==theme)document.head.appendChild(theme);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activate,{once:true});
 else activate();
 setTimeout(activate,450);setTimeout(activate,1300);
})();
