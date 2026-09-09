/* Serendib Petals v14 — lazy feature loader */
(function(){
  if(window.parent!==window.top)return;
  if(window.__SP_MODULE_LOADER_V14__)return;window.__SP_MODULE_LOADER_V14__=true;
  const defs={
    crm:{label:'Customers',icon:'◎',css:'crm-v14.css?v=14',js:'crm-v14.js?v=14',global:'SerendibCRM'},
    inventory:{label:'Inventory',icon:'▦',css:'inventory-v14.css?v=14',js:'inventory-v14.js?v=14',global:'SerendibInventory'},
    history:{label:'History',icon:'↺',css:'history-v14.css?v=14',js:'history-v14.js?v=14',global:'SerendibHistory'}
  };
  const loaded={};
  function css(href,id){if(document.getElementById(id))return;const l=document.createElement('link');l.id=id;l.rel='stylesheet';l.href=href;document.head.appendChild(l)}
  function js(src,id){return new Promise((res,rej)=>{if(document.getElementById(id)){res();return}const s=document.createElement('script');s.id=id;s.async=false;s.src=src;s.onload=res;s.onerror=rej;document.body.appendChild(s)})}
  async function ensure(name){const d=defs[name];if(!d)return null;if(!loaded[name]){css(d.css,'sp-'+name+'-css');loaded[name]=js(d.js,'sp-'+name+'-js').then(()=>window[d.global])}return loaded[name]}
  function hideModuleViews(){document.querySelectorAll('[data-sp-module-view]').forEach(x=>x.classList.add('hidden'))}
  function desktop(){return !!document.querySelector('.desktop-app')}
  function phone(){return !!document.querySelector('.phone')}

  async function openDesktop(name,button){
    const mod=await ensure(name);if(!mod)return;
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b===button));
    document.getElementById('dashboardView')?.classList.add('hidden');document.getElementById('operationsView')?.classList.add('hidden');document.getElementById('calendarView')?.classList.add('hidden');document.getElementById('expensesView')?.classList.add('hidden');hideModuleViews();
    let sec=document.getElementById('spModule-'+name);if(!sec){sec=document.createElement('section');sec.id='spModule-'+name;sec.dataset.spModuleView=name;sec.className='sp-module-view';document.querySelector('.workspace')?.appendChild(sec)}sec.classList.remove('hidden');mod.mount(sec)
  }
  function setupDesktop(){
    const nav=document.querySelector('.nav');if(!nav)return;
    Object.entries(defs).forEach(([name,d])=>{if(nav.querySelector(`[data-module="${name}"]`))return;const b=document.createElement('button');b.className='nav-item';b.dataset.module=name;b.innerHTML=`<span>${d.icon}</span> ${d.label}`;b.addEventListener('click',()=>openDesktop(name,b));const anchor=name==='crm'?nav.querySelector('[data-view="orders"]'):name==='inventory'?nav.querySelector('[data-view="calendar"]'):nav.querySelector('[data-view="expenses"]')||nav.querySelector('[data-view="analytics"]');anchor?.after(b)});
    if(typeof window.switchView==='function'&&!window.switchView.__modules14){const old=window.switchView;const wrap=function(view,button){hideModuleViews();return old(view,button)};wrap.__modules14=true;window.switchView=wrap}
  }

  function moreHtml(){return `<div class="sp-more-page hidden" id="morePage"><div class="sp-more-head"><h1>More</h1><p>Extra tools load only when you open them, keeping the app light.</p></div><div class="sp-more-grid"><button class="sp-more-card" data-open-module="crm"><i>◎</i><b>Customers</b><small>Repeat customers, spend, due and order history.</small></button><button class="sp-more-card" data-open-module="inventory"><i>▦</i><b>Inventory</b><small>Stock, low-stock alerts and 7-day requirements.</small></button><button class="sp-more-card" data-open-module="history"><i>↺</i><b>History</b><small>Cancelled orders and audit activity.</small></button><button class="sp-more-card" data-open-expenses><i>◈</i><b>Expenses</b><small>General expenses and operating profit.</small></button></div></div>`}
  function hidePhonePages(){['ordersPage','todayPage','analyticsPage','teamPage','calendarPage','expensesPage','morePage','spMobile-crm','spMobile-inventory','spMobile-history'].forEach(id=>document.getElementById(id)?.classList.add('hidden'))}
  async function openMobile(name){const mod=await ensure(name);if(!mod)return;hidePhonePages();let sec=document.getElementById('spMobile-'+name);if(!sec){sec=document.createElement('section');sec.id='spMobile-'+name;sec.dataset.spModuleView=name;document.querySelector('.phone')?.insertBefore(sec,document.querySelector('.tabs'))}sec.classList.remove('hidden');mod.mount(sec);document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.id==='tabMore'))}
  function setupMobile(){
    const p=document.querySelector('.phone'),tabs=document.querySelector('.tabs');if(!p||!tabs)return;
    if(!document.getElementById('morePage')){const h=document.createElement('div');h.innerHTML=moreHtml();p.insertBefore(h.firstElementChild,tabs);document.querySelectorAll('[data-open-module]').forEach(b=>b.addEventListener('click',()=>openMobile(b.dataset.openModule)));document.querySelector('[data-open-expenses]')?.addEventListener('click',()=>{if(typeof window.showPage==='function')window.showPage('expenses')})}
    if(!document.getElementById('tabMore')){const b=document.createElement('button');b.className='tab';b.id='tabMore';b.textContent='More';b.addEventListener('click',()=>window.showPage('more'));tabs.appendChild(b)}
    if(typeof window.showPage==='function'&&!window.showPage.__modules14){const old=window.showPage;const wrap=function(page){if(page==='more'){hidePhonePages();document.getElementById('morePage')?.classList.remove('hidden');document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.id==='tabMore'));return}hideModuleViews();return old(page)};wrap.__modules14=true;window.showPage=wrap}
  }
  function boot(){if(desktop())setupDesktop();else if(phone())setupMobile();else setTimeout(boot,250)}
  boot();
})();