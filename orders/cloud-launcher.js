/* Loads the existing Serendib UI inside the cloud-authenticated shell and injects cloud sync + v11 enhancements into same-origin app frames. */
(function(){
  const rootFrame = document.getElementById('cloudAppFrame');
  const desktop = window.matchMedia && window.matchMedia('(min-width:900px)').matches;
  const baseTarget = desktop ? 'v9.html?v=11' : 'v7.html?v=11';
  let authReloadDone = false;

  function addEnhancements(doc){
    if(!doc.getElementById('serendib-enhancements-css')){
      const link = doc.createElement('link');
      link.id = 'serendib-enhancements-css';
      link.rel = 'stylesheet';
      link.href = 'serendib-enhancements.css?v=11';
      doc.head.appendChild(link);
    }
    if(!doc.getElementById('serendib-enhancements-js')){
      const script = doc.createElement('script');
      script.id = 'serendib-enhancements-js';
      script.src = 'serendib-enhancements.js?v=11';
      doc.body.appendChild(script);
    }
  }

  function addCloudAssets(frame){
    try{
      const doc = frame.contentDocument;
      if(!doc || !doc.documentElement || doc.location.href === 'about:blank') return;

      if(!doc.getElementById('serendib-cloud-css')){
        const link = doc.createElement('link');
        link.id = 'serendib-cloud-css';
        link.rel = 'stylesheet';
        link.href = 'cloud.css?v=10';
        doc.head.appendChild(link);
      }

      addEnhancements(doc);

      const loadCloud = () => {
        if(doc.getElementById('serendib-cloud-sync')) return;
        const cloud = doc.createElement('script');
        cloud.id = 'serendib-cloud-sync';
        cloud.src = 'cloud-sync.js?v=10';
        doc.body.appendChild(cloud);
      };

      if(frame.contentWindow.supabase && typeof frame.contentWindow.supabase.createClient === 'function'){
        loadCloud();
      } else if(!doc.getElementById('serendib-supabase-js')){
        const supa = doc.createElement('script');
        supa.id = 'serendib-supabase-js';
        supa.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        supa.onload = loadCloud;
        doc.body.appendChild(supa);
      }

      const nested = doc.getElementById('operationsFrame');
      if(nested && !nested.dataset.cloudHooked){
        nested.dataset.cloudHooked = '1';
        nested.addEventListener('load', () => addCloudAssets(nested));
        setTimeout(() => addCloudAssets(nested), 100);
      }
    }catch(e){ console.warn('Cloud frame injection delayed', e); }
  }

  rootFrame.addEventListener('load', () => {
    setTimeout(() => addCloudAssets(rootFrame), 60);
  });

  rootFrame.src = baseTarget;

  const authWatcher = setInterval(() => {
    if(window.SerendibCloud && window.SerendibCloud.connected && !authReloadDone){
      authReloadDone = true;
      rootFrame.src = baseTarget + '&cloudready=' + Date.now();
    }
    if(authReloadDone) clearInterval(authWatcher);
  }, 250);
})();
