/* Serendib Petals cloud shell v13 */
(function(){
  const rootFrame=document.getElementById('cloudAppFrame');
  const desktop=window.matchMedia&&window.matchMedia('(min-width:900px)').matches;
  const baseTarget=desktop?'v9.html?v=13':'v7.html?v=13';
  let authReloadDone=false;

  function addCss(doc,id,href){if(doc.getElementById(id))return;const l=doc.createElement('link');l.id=id;l.rel='stylesheet';l.href=href;doc.head.appendChild(l)}
  function addJs(doc,id,src,onload){if(doc.getElementById(id))return;const s=doc.createElement('script');s.id=id;s.src=src;if(onload)s.onload=onload;doc.body.appendChild(s)}

  function addEnhancements(doc){
    addCss(doc,'serendib-enhancements-css','serendib-enhancements.css?v=11');
    addCss(doc,'serendib-expenses-css','expenses-v12.css?v=12');
    addCss(doc,'serendib-ui-fixes-css','ui-fixes-v13.css?v=13');
    addJs(doc,'serendib-enhancements-js','serendib-enhancements.js?v=11');
    addJs(doc,'serendib-expenses-js','expenses-v12.js?v=12');
    addJs(doc,'serendib-ui-fixes-js','ui-fixes-v13.js?v=13');
  }

  function addCloudAssets(frame){
    try{
      const doc=frame.contentDocument;
      if(!doc||!doc.documentElement||doc.location.href==='about:blank')return;
      addCss(doc,'serendib-cloud-css','cloud.css?v=10');
      addEnhancements(doc);
      const loadCloud=()=>addJs(doc,'serendib-cloud-sync','cloud-sync.js?v=10');
      if(frame.contentWindow.supabase&&typeof frame.contentWindow.supabase.createClient==='function')loadCloud();
      else if(!doc.getElementById('serendib-supabase-js')){const s=doc.createElement('script');s.id='serendib-supabase-js';s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=loadCloud;doc.body.appendChild(s)}
      const nested=doc.getElementById('operationsFrame');
      if(nested&&!nested.dataset.cloudHooked){nested.dataset.cloudHooked='1';nested.addEventListener('load',()=>addCloudAssets(nested));setTimeout(()=>addCloudAssets(nested),100)}
    }catch(e){console.warn('Cloud frame injection delayed',e)}
  }

  rootFrame.addEventListener('load',()=>setTimeout(()=>addCloudAssets(rootFrame),60));
  rootFrame.src=baseTarget;
  const authWatcher=setInterval(()=>{
    if(window.SerendibCloud&&window.SerendibCloud.connected&&!authReloadDone){authReloadDone=true;rootFrame.src=baseTarget+'&cloudready='+Date.now()}
    if(authReloadDone)clearInterval(authWatcher);
  },250);
})();