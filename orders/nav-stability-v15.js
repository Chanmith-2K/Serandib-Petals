/* Serendib Petals v15 — make sidebar/tabs resilient while the order frame finishes loading */
(function(){
  const frame=document.getElementById('operationsFrame');
  if(!frame||typeof window.switchView!=='function')return;
  const original=window.switchView;
  window.switchView=function(view,button){
    const result=original(view,button);
    if(view!=='dashboard'){
      let tries=0;
      const retry=()=>{
        tries++;
        try{
          const w=frame.contentWindow;
          if(w&&typeof w.showPage==='function'){w.showPage(view);return;}
        }catch(e){}
        if(tries<12)setTimeout(retry,80);
      };
      retry();
    }
    return result;
  };
})();
