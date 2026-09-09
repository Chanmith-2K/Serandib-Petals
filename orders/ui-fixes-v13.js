/* Serendib Petals v13 — cloud-status consistency + stale version cleanup */
(function(){
  if(window.__SP_UI_FIXES_V13__)return;window.__SP_UI_FIXES_V13__=true;

  function apply(){
    const connected=!!window.SerendibCloud?.connected;
    const member=window.SerendibCloud?.member;

    document.querySelectorAll('.brand-mark img,.sp-mobile-brand img').forEach(img=>img.style.display='none');

    const mark=document.querySelector('.brand-mark');
    if(mark){
      mark.classList.add('sp-logo-mark');
      if(!mark.textContent.trim() || mark.querySelector('img')){
        mark.querySelectorAll('img').forEach(x=>x.remove());
      }
    }

    const version=document.querySelector('.sidebar-bottom small');
    if(version)version.textContent='Serendib Orders v13';

    const label=document.getElementById('todayLabel');
    if(label && connected){
      label.textContent=label.textContent.replace('Live local data','Live cloud data');
    }

    const status=document.querySelector('.status-dot span');
    if(status && connected){
      status.textContent='Cloud connected'+(member?.role?' • '+member.role:'');
    }
  }

  apply();
  const observer=new MutationObserver(apply);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('focus',apply);
  window.addEventListener('storage',apply);
  setInterval(apply,1500);
})();
