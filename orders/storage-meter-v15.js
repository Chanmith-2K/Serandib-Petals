/* Serendib Petals v15 — lightweight database storage meter */
(function(){
  if(window.__SP_STORAGE_METER_V15__) return;
  window.__SP_STORAGE_METER_V15__ = true;

  const LIMIT_BYTES = 500 * 1024 * 1024; // Supabase Free database allowance configured for this app.
  let loading = false;
  let lastLoaded = 0;

  function formatBytes(bytes){
    const mb = Number(bytes || 0) / 1024 / 1024;
    if(mb < 1) return Math.max(0, mb).toFixed(1) + ' MB';
    if(mb < 100) return mb.toFixed(1).replace('.0','') + ' MB';
    return Math.round(mb) + ' MB';
  }

  function ensureMeter(){
    const bottom = document.querySelector('.sidebar-bottom');
    if(!bottom) return null;
    let box = document.getElementById('spStorageMeter');
    if(box) return box;

    const style = document.createElement('style');
    style.id = 'sp-storage-meter-style';
    style.textContent = `
      #spStorageMeter{margin:0 0 14px;padding:11px 10px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.035);cursor:pointer}
      #spStorageMeter .sp-sm-top{display:flex;align-items:center;justify-content:space-between;gap:8px;color:rgba(255,255,255,.72);font-size:9px;font-weight:750}
      #spStorageMeter .sp-sm-top b{color:#fff;font-size:9px}
      #spStorageMeter .sp-sm-bar{height:5px;margin:8px 0 7px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden}
      #spStorageMeter .sp-sm-bar i{display:block;height:100%;width:0;background:#77c79b;border-radius:99px;transition:width .25s ease}
      #spStorageMeter .sp-sm-meta{display:flex;justify-content:space-between;gap:8px;color:rgba(255,255,255,.42);font-size:8px;white-space:nowrap}
    `;
    document.head.appendChild(style);

    box = document.createElement('div');
    box.id = 'spStorageMeter';
    box.title = 'Click to refresh cloud database storage usage';
    box.innerHTML = '<div class="sp-sm-top"><span>Cloud database</span><b id="spStoragePct">—</b></div><div class="sp-sm-bar"><i id="spStorageBar"></i></div><div class="sp-sm-meta"><span id="spStorageUsed">Checking…</span><span id="spStorageFree"></span></div>';
    bottom.prepend(box);
    box.addEventListener('click',()=>load(true));
    return box;
  }

  async function load(force){
    const box = ensureMeter();
    if(!box || loading) return;
    if(!force && Date.now() - lastLoaded < 10 * 60 * 1000) return;
    const cloud = window.SerendibCloud;
    if(!cloud?.connected || !cloud?.client){
      setTimeout(()=>load(false), 700);
      return;
    }
    loading = true;
    try{
      const {data,error} = await cloud.client.rpc('serendib_storage_usage');
      if(error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const used = Number(row?.db_bytes || 0);
      const free = Math.max(LIMIT_BYTES - used, 0);
      const pct = LIMIT_BYTES > 0 ? Math.min(100, used / LIMIT_BYTES * 100) : 0;
      const pctText = pct < 0.1 ? '<0.1%' : pct.toFixed(1).replace('.0','') + '%';
      document.getElementById('spStoragePct').textContent = pctText;
      document.getElementById('spStorageBar').style.width = Math.max(pct, .8) + '%';
      document.getElementById('spStorageUsed').textContent = formatBytes(used) + ' used';
      document.getElementById('spStorageFree').textContent = formatBytes(free) + ' free';
      lastLoaded = Date.now();
    }catch(e){
      document.getElementById('spStoragePct').textContent = '—';
      document.getElementById('spStorageUsed').textContent = 'Storage unavailable';
      document.getElementById('spStorageFree').textContent = '';
    }finally{ loading = false; }
  }

  function boot(){
    ensureMeter();
    load(false);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  setInterval(()=>load(false),10*60*1000);
  window.refreshStorageMeter = ()=>load(true);
})();
