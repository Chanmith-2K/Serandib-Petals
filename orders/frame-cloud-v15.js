/* Serendib Petals v15 — lightweight cloud bridge for the single operations iframe */
(function(){
  const frame=document.getElementById('operationsFrame');
  if(!frame)return;

  function addCss(doc,id,href){
    if(doc.getElementById(id))return;
    const l=doc.createElement('link');l.id=id;l.rel='stylesheet';l.href=href;doc.head.appendChild(l);
  }
  function addJs(doc,id,src,onload){
    if(doc.getElementById(id)){if(onload)onload();return;}
    const s=doc.createElement('script');s.id=id;s.src=src;if(onload)s.onload=onload;doc.body.appendChild(s);
  }
  function inject(){
    try{
      const doc=frame.contentDocument;
      const w=frame.contentWindow;
      if(!doc||!w||doc.location.href==='about:blank')return;

      addCss(doc,'sp-cloud-css','cloud.css?v=10');

      const finish=()=>{
        addJs(doc,'sp-cloud-sync','cloud-sync.js?v=10');
        if(window.innerWidth<900){
          addCss(doc,'sp-enh-css','serendib-enhancements.css?v=11');
          addCss(doc,'sp-exp-css','expenses-v12.css?v=12');
          addCss(doc,'sp-fix-css','ui-fixes-v13.css?v=13');
          addJs(doc,'sp-enh-js','serendib-enhancements.js?v=11');
          addJs(doc,'sp-exp-js','expenses-v12.js?v=12');
          addJs(doc,'sp-fix-js','ui-fixes-v15.js?v=15');
        }
      };

      if(w.supabase&&typeof w.supabase.createClient==='function') finish();
      else addJs(doc,'sp-supabase-js','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',finish);
    }catch(e){ console.warn('Serendib frame cloud bridge delayed',e); }
  }

  frame.addEventListener('load',()=>setTimeout(inject,30));
  setTimeout(inject,250);
})();
