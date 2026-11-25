/* MediLab X 10.2.2: visual-only update settings clean-up. Existing handlers preserved. */
(() => {
  'use strict';
  const mount=()=>{
    const view=document.querySelector('#settings .adc-setting-view[data-setting-view="updates"]');
    if(!view || view.dataset.mlx1022Ready==='1') return;
    view.dataset.mlx1022Ready='1';
    const center=document.getElementById('adc85UpdateCentre');
    const admin=view.querySelector('.adc-admin-update');
    if(center && !document.getElementById('mlx1022GithubHead')){
      const heading=document.createElement('div');heading.id='mlx1022GithubHead';heading.className='mlx1022-github-head';
      heading.innerHTML='<div class="mlx1022-github-identity"><span class="mlx1022-github-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h9a4 4 0 0 1 4 4v3"/><path d="M4 12h13a4 4 0 0 1 4 4v2"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="17" cy="13" r="1.5"/></svg></span><span class="mlx1022-github-title"><strong>GitHub Software Updates</strong><small>Verified releases · Secure HTML updates</small></span></div><span class="mlx1022-check-pill">Automatic checks · 20 min</span>';
      center.insertBefore(heading,center.firstChild);
    }
    if(admin && !admin.querySelector('.mlx1022-advanced')){
      const h=admin.querySelector('#adcAdminUpdateHeading');
      if(h)h.textContent='Release Channel';
      const description=admin.querySelector('p.muted');
      if(description)description.textContent='MediLab X uses its trusted GitHub release manifest.';
      const details=document.createElement('details');details.className='mlx1022-advanced';
      const summary=document.createElement('summary');summary.textContent='Advanced · Manage trusted update URL';
      details.append(summary);
      const field=admin.querySelector('.field');
      const actions=admin.querySelector('.actions');
      const status=document.getElementById('adminUpdateSourceStatus');
      if(field)details.append(field);
      if(actions)details.append(actions);
      if(status)details.append(status);
      admin.append(details);
      const origin=document.createElement('p');origin.className='mlx1022-github-source';
      origin.textContent='Source: GitHub · Integrity checked before installation. Your local patient records remain on this PC.';
      admin.insertBefore(origin,details);
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  setTimeout(mount,900);
})();
