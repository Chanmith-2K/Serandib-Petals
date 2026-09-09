/* Serendib Petals v14 — lightweight customer CRM */
(function(){
  if(window.SerendibCRM)return;
  const KEY='serendib_orders_preview';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const n=v=>Math.max(Number(v||0),0);
  const money=v=>Number(v||0).toLocaleString();
  const orders=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')||[]}catch{return[]}};
  const total=o=>n(o.amount)+n(o.deliveryFee);
  const pays=o=>Array.isArray(o.payments)?o.payments:[];
  const paid=o=>Math.min(pays(o).reduce((s,p)=>s+n(p.amount),0),total(o));
  const due=o=>Math.max(total(o)-paid(o),0);
  const norm=p=>String(p||'').replace(/\D/g,'').replace(/^94/,'0');
  const when=o=>String(o.orderDate||(o.createdAt||'')).slice(0,10);
  let q='';

  function group(){
    const map=new Map();
    orders().forEach(o=>{
      const phone=norm(o.phone),key=phone||String(o.customerName||'').trim().toLowerCase();if(!key)return;
      if(!map.has(key))map.set(key,{key,name:o.customerName||'Customer',phone:o.phone||'',orders:[],spend:0,due:0,last:''});
      const c=map.get(key);c.orders.push(o);c.spend+=total(o);c.due+=due(o);const d=when(o);if(d>c.last)c.last=d;if(!c.phone&&o.phone)c.phone=o.phone;
    });
    return [...map.values()].sort((a,b)=>b.last.localeCompare(a.last));
  }
  function shell(){return `<div class="sp-crm-shell"><div class="sp-crm-top"><div><span>CUSTOMER INTELLIGENCE</span><h2>Customer CRM</h2><p>See repeat customers, spend, due balances and order history without loading a second database.</p></div><input class="sp-crm-search" id="spCrmSearch" placeholder="Search customer or phone…"></div><div class="sp-crm-kpis"><article><span>Customers</span><strong id="spCrmCustomers">0</strong><small>Unique buyers</small></article><article><span>Repeat customers</span><strong id="spCrmRepeat">0</strong><small>2+ orders</small></article><article><span>Customer revenue</span><strong id="spCrmRevenue">Rs. 0</strong><small>Active order value</small></article><article><span>Average order</span><strong id="spCrmAvg">Rs. 0</strong><small>Per active order</small></article></div><section class="sp-crm-panel"><div class="sp-crm-head"><h3>Customers</h3><small id="spCrmCount"></small></div><div id="spCrmTable" class="sp-crm-table"></div></section></div>`}
  function ensureModal(){if(document.getElementById('spCrmModal'))return;const x=document.createElement('div');x.innerHTML='<div class="sp-crm-modal" id="spCrmModal"><div class="sp-crm-dialog"><div class="sp-crm-dialog-head"><h3 id="spCrmModalName">Customer</h3><button type="button" data-crm-close>×</button></div><div class="sp-crm-dialog-body" id="spCrmModalBody"></div></div></div>';document.body.appendChild(x.firstElementChild);document.querySelector('[data-crm-close]')?.addEventListener('click',()=>document.getElementById('spCrmModal').classList.remove('show'));document.getElementById('spCrmModal')?.addEventListener('click',e=>{if(e.target.id==='spCrmModal')e.currentTarget.classList.remove('show')})}
  function render(){const all=group(),filtered=all.filter(c=>!q||[c.name,c.phone].some(v=>String(v||'').toLowerCase().includes(q)));const os=orders(),rev=os.reduce((s,o)=>s+total(o),0);document.getElementById('spCrmCustomers').textContent=all.length;document.getElementById('spCrmRepeat').textContent=all.filter(c=>c.orders.length>1).length;document.getElementById('spCrmRevenue').textContent='Rs. '+money(rev);document.getElementById('spCrmAvg').textContent='Rs. '+money(os.length?rev/os.length:0);document.getElementById('spCrmCount').textContent=`${filtered.length} shown`;const box=document.getElementById('spCrmTable');if(!box)return;box.innerHTML=filtered.length?filtered.map(c=>`<div class="sp-crm-row" data-crm-key="${esc(c.key)}"><div><b>${esc(c.name)}</b><small>${esc(c.phone||'No phone')}</small></div><span>${c.orders.length} order${c.orders.length===1?'':'s'}</span><span>Rs. ${money(c.spend)}</span><span class="${c.due>0?'due':''}">${c.due>0?'Due '+money(c.due):'Paid'}</span><span>${esc(c.last||'—')}</span></div>`).join(''):'<div class="sp-crm-empty">No customers found.</div>';box.querySelectorAll('[data-crm-key]').forEach(r=>r.addEventListener('click',()=>openCustomer(r.dataset.crmKey)))}
  function openCustomer(key){const c=group().find(x=>x.key===key);if(!c)return;ensureModal();document.getElementById('spCrmModalName').textContent=c.name;const hist=c.orders.slice().sort((a,b)=>when(b).localeCompare(when(a)));const ph=String(c.phone||'').replace(/\D/g,'');const wa=ph?`https://wa.me/${ph.startsWith('0')?'94'+ph.slice(1):ph}`:'#';document.getElementById('spCrmModalBody').innerHTML=`<div class="sp-crm-summary"><div><span>Orders</span><b>${c.orders.length}</b></div><div><span>Total spend</span><b>Rs. ${money(c.spend)}</b></div><div><span>Outstanding</span><b>Rs. ${money(c.due)}</b></div></div><div class="sp-crm-orders">${hist.map(o=>`<div class="sp-crm-order"><strong>${esc(o.orderNumber||'Order')} • ${esc(o.bouquetName||'Bouquet')}</strong><small>${esc(when(o)||'')} • Total Rs. ${money(total(o))}${due(o)>0?` • Due Rs. ${money(due(o))}`:' • Paid'}</small></div>`).join('')}</div>${c.phone?`<a class="sp-crm-wa" target="_blank" href="${wa}">Open WhatsApp</a>`:''}`;document.getElementById('spCrmModal').classList.add('show')}
  function mount(container){if(!container)return;if(!container.dataset.crmMounted){container.innerHTML=shell();container.dataset.crmMounted='1';const s=container.querySelector('#spCrmSearch');s?.addEventListener('input',()=>{q=s.value.trim().toLowerCase();render()});window.addEventListener('storage',render);window.addEventListener('focus',render)}render()}
  window.SerendibCRM={mount,refresh:render};
})();