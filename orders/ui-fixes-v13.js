/* Serendib Petals v13 — cloud-status consistency + stale version cleanup */
(function(){
  if(window.__SP_UI_FIXES_V13__)return;window.__SP_UI_FIXES_V13__=true;

  function setTextIfChanged(el,value){if(el&&el.textContent!==value)el.textContent=value}

  function apply(){
    const connected=!!window.SerendibCloud?.connected;
    const member=window.SerendibCloud?.member;

    document.querySelectorAll('.brand-mark img,.sp-mobile-brand img').forEach(img=>{if(img.style.display!=='none')img.style.display='none'});

    const mark=document.querySelector('.brand-mark');
    if(mark){
      if(!mark.classList.contains('sp-logo-mark'))mark.classList.add('sp-logo-mark');
      mark.querySelectorAll('img').forEach(x=>x.remove());
    }

    setTextIfChanged(document.querySelector('.sidebar-bottom small'),'Serendib Orders v13');

    const label=document.getElementById('todayLabel');
    if(label&&connected&&label.textContent.includes('Live local data')){
      label.textContent=label.textContent.replace('Live local data','Live cloud data');
    }

    const status=document.querySelector('.status-dot span');
    if(status&&connected){
      setTextIfChanged(status,'Cloud connected'+(member?.role?' • '+member.role:''));
    }
  }

  apply();
  const observer=new MutationObserver(apply);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('focus',apply);
  window.addEventListener('storage',apply);
  setInterval(apply,1500);
})();
