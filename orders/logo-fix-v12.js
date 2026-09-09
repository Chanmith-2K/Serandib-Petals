/* Serendib Petals v12 logo cache-bust fix */
(function(){
  const SRC='serendib-logo.svg?v=12';
  function fix(){
    document.querySelectorAll('.sp-logo-mark img,.sp-mobile-brand img').forEach(img=>{
      if(img.dataset.logo12)return;
      img.dataset.logo12='1';
      img.src=SRC;
      img.onerror=()=>{
        const p=img.parentElement;
        img.remove();
        if(p&&p.classList.contains('brand-mark')){p.textContent='SP';p.style.color='#7b1e2b';p.style.fontWeight='900';p.style.fontSize='18px';}
      };
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(fix,120));else setTimeout(fix,120);
  setTimeout(fix,700);setTimeout(fix,1800);
})();