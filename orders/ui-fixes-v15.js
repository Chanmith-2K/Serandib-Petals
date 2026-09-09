/* Serendib Petals v15 — stable UI state, no image logo */
(function(){
  if(window.__SP_UI_FIXES_V15__)return;window.__SP_UI_FIXES_V15__=true;
  function apply(){
    document.querySelectorAll('.brand-mark img,.sp-mobile-brand img').forEach(img=>img.remove());
    const mark=document.querySelector('.brand-mark');
    if(mark&&mark.textContent.trim()!=='SP')mark.textContent='SP';

    const connected=!!window.SerendibCloud?.connected;
    const member=window.SerendibCloud?.member;
    const status=document.querySelector('.status-dot span');
    if(status)status.textContent=connected?'Cloud connected'+(member?.role?' • '+member.role:''):'Connecting to cloud…';
    const ver=document.querySelector('.sidebar-bottom small');if(ver)ver.textContent='Serendib Orders v15 Stable';
    const label=document.getElementById('todayLabel');
    if(label&&connected){
      const date=new Date().toLocaleDateString([], {weekday:'long',year:'numeric',month:'long',day:'numeric'});
      label.textContent=date+' • Live cloud data';
    }
  }
  apply();
  window.addEventListener('focus',apply);
  window.addEventListener('storage',apply);
  setInterval(apply,1200);
})();
