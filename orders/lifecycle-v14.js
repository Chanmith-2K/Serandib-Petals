/* Serendib Petals v14 — safe cancel/archive workflow */
(function(){
  if(window.__SP_LIFECYCLE_V14__)return;window.__SP_LIFECYCLE_V14__=true;
  let action='cancelled';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const n=v=>Math.max(Number(v||0),0);
  const currentOrder=()=>{
    try{
      const no=document.getElementById('detailTitle')?.textContent?.trim();
      return (typeof getOrders==='function'?getOrders():[]).find(o=>String(o.orderNumber||'').trim()===no)||null;
    }catch{return null}
  };
  const client=()=>window.SerendibCloud?.client||null;
  const member=()=>window.SerendibCloud?.member||null;

  function ensureModal(){
    if(document.getElementById('spLifeModal'))return;
    const wrap=document.createElement('div');wrap.innerHTML=`<div class="sp-life-modal" id="spLifeModal"><div class="sp-life-dialog"><div class="sp-life-head"><span>ORDER LIFECYCLE</span><h3>Cancel or archive order</h3></div><div class="sp-life-body"><div class="sp-life-choice"><button type="button" data-life-action="cancelled" class="active">Cancel Order</button><button type="button" data-life-action="archived">Archive Order</button></div><div class="sp-life-field"><span>Reason</span><textarea id="spLifeReason" placeholder="Why is this order being cancelled or archived?"></textarea></div><div id="spLifeRefundFields"><div class="sp-life-field"><span>Refund amount (LKR)</span><input type="number" min="0" step="0.01" id="spLifeRefund" placeholder="0"></div><div class="sp-life-field" style="margin-top:10px"><span>Refund note</span><input id="spLifeRefundNote" placeholder="Optional note"></div></div><div class="sp-life-note">The order will leave the active dashboard, but its full snapshot stays in cloud history. This is safer than permanent deletion.</div></div><div class="sp-life-actions"><button type="button" data-life-close>Keep Order</button><button type="button" class="danger" data-life-confirm>Confirm</button></div></div></div>`;
    document.body.appendChild(wrap.firstElementChild);
    document.querySelectorAll('[data-life-action]').forEach(b=>b.addEventListener('click',()=>setAction(b.dataset.lifeAction)));
    document.querySelector('[data-life-close]')?.addEventListener('click',close);
    document.querySelector('[data-life-confirm]')?.addEventListener('click',confirmAction);
    document.getElementById('spLifeModal')?.addEventListener('click',e=>{if(e.target.id==='spLifeModal')close()});
  }
  function setAction(v){action=v==='archived'?'archived':'cancelled';document.querySelectorAll('[data-life-action]').forEach(b=>b.classList.toggle('active',b.dataset.lifeAction===action));const f=document.getElementById('spLifeRefundFields');if(f)f.style.display=action==='cancelled'?'block':'none'}
  function open(){const o=currentOrder();if(!o){alert('Open an order first.');return}ensureModal();setAction('cancelled');document.getElementById('spLifeReason').value='';document.getElementById('spLifeRefund').value='';document.getElementById('spLifeRefundNote').value='';document.getElementById('spLifeModal').classList.add('show')}
  function close(){document.getElementById('spLifeModal')?.classList.remove('show')}
  async function confirmAction(){
    const o=currentOrder(),c=client();
    if(!o){alert('Order could not be found.');return}
    if(!c||!window.SerendibCloud?.connected){alert('Cloud connection is required to cancel or archive an order safely.');return}
    const reason=document.getElementById('spLifeReason')?.value.trim()||null;
    const refund=action==='cancelled'?n(document.getElementById('spLifeRefund')?.value):0;
    const refundNote=action==='cancelled'?(document.getElementById('spLifeRefundNote')?.value.trim()||null):null;
    const confirmBtn=document.querySelector('[data-life-confirm]');if(confirmBtn){confirmBtn.disabled=true;confirmBtn.textContent='Saving…'}
    try{
      const {data:payRows,error:pErr}=await c.from('payments').select('*').eq('order_id',o.id);
      if(pErr)throw pErr;
      const snapshot={...o,payments_cloud:payRows||[]};
      const payload={original_order_id:/^[0-9a-f-]{36}$/i.test(String(o.id||''))?o.id:null,order_number:o.orderNumber||'Order',action,reason,refund_amount:refund,refund_note:refundNote,snapshot,archived_by:member()?.user_id||null};
      const {error:aErr}=await c.from('archived_orders').insert(payload);if(aErr)throw aErr;
      const {error:dErr}=await c.from('orders').delete().eq('id',o.id);if(dErr)throw dErr;
      try{localStorage.setItem('serendib_orders_preview',JSON.stringify((typeof getOrders==='function'?getOrders():[]).filter(x=>x.id!==o.id)))}catch{}
      close();
      if(typeof closeDetail==='function')closeDetail();
      if(typeof renderAll==='function')renderAll();
      if(window.parent&&window.parent!==window&&typeof window.parent.refreshDashboard==='function')window.parent.refreshDashboard();
      alert(`${o.orderNumber||'Order'} ${action==='cancelled'?'cancelled':'archived'} and kept in History.`);
    }catch(e){alert('Could not save this lifecycle change: '+(e?.message||e))}
    finally{if(confirmBtn){confirmBtn.disabled=false;confirmBtn.textContent='Confirm'}}
  }

  function patch(){
    if(typeof window.deleteCurrent==='function'&&!window.deleteCurrent.__spLifecycle){const f=function(){open()};f.__spLifecycle=true;window.deleteCurrent=f}
    const btn=[...document.querySelectorAll('button.danger')].find(b=>/delete order/i.test(b.textContent||''));if(btn){btn.textContent='Cancel / Archive Order';btn.style.background='#7b1e2b'}
  }
  patch();new MutationObserver(patch).observe(document.documentElement,{subtree:true,childList:true});setInterval(patch,1400);
})();