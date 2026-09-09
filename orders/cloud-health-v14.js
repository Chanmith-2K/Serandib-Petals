/* Serendib Petals v14 — preserve and reconcile pre-cloud local orders */
(function(){
  if(window.parent!==window.top)return;
  if(window.__SP_CLOUD_HEALTH_V14__)return;window.__SP_CLOUD_HEALTH_V14__=true;
  const KEY='serendib_orders_preview', SNAP='sp_v14_precloud_snapshot';
  const n=v=>Math.max(Number(v||0),0);
  const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')||[]}catch{return[]}};
  const snap=read();
  if(snap.length&&!sessionStorage.getItem(SNAP))sessionStorage.setItem(SNAP,JSON.stringify(snap));
  const today=()=>{const d=new Date(),o=d.getTimezoneOffset();return new Date(d.getTime()-o*60000).toISOString().slice(0,10)};
  const dt=v=>{if(!v)return null;const d=new Date(v);return isNaN(d)?null:d.toISOString()};
  function payload(o,user){const p={order_number:String(o.orderNumber||'').trim(),order_date:o.orderDate||String(o.createdAt||'').slice(0,10)||today(),buyer_name:String(o.customerName||'').trim()||'Customer',buyer_phone:String(o.phone||'').trim()||null,recipient_name:String(o.recipientName||'').trim()||null,recipient_phone:String(o.recipientPhone||'').trim()||null,occasion:o.occasion||null,lead_source:o.leadSource||null,priority:['Normal','Urgent','Same Day'].includes(o.priority)?o.priority:'Normal',bouquet_name:String(o.bouquetName||'').trim()||'Bouquet',flower_details:String(o.flowerDetails||'').trim()||null,card_message:String(o.cardMessage||'').trim()||null,delivery_date:dt(o.deliveryDate),delivery_address:String(o.deliveryAddress||'').trim()||null,bouquet_value:n(o.amount),delivery_fee:n(o.deliveryFee),flower_cost:n(o.flowerCost),wrapping_cost:n(o.wrappingCost),delivery_cost:n(o.deliveryCost),other_cost:n(o.otherCost),status:o.status||'New',prep_status:o.prepStatus||'Pending',design_status:o.designStatus||'Pending',delivery_status:o.deliveryStatus||'Pending',notes:String(o.notes||'').trim()||null,created_by:user,updated_by:user};if(uuid(o.id))p.id=o.id;return p}
  function paymentRows(o){if(Array.isArray(o.payments))return o.payments.filter(x=>n(x.amount)>0);const a=n(o.advanceAmount);return a>0?[{amount:a,date:o.createdAt,note:'Advance'}]:[]}
  async function run(){
    if(!window.SerendibCloud?.connected||!window.SerendibCloud.client){setTimeout(run,500);return}
    const c=window.SerendibCloud.client,user=window.SerendibCloud.member?.user_id;
    let source=[];try{source=JSON.parse(sessionStorage.getItem(SNAP)||'[]')||[]}catch{}
    if(!source.length)return;
    const {data:existing,error}=await c.from('orders').select('id,order_number');if(error)return;
    const nums=new Set((existing||[]).map(x=>String(x.order_number||'').trim()));
    let imported=0;
    for(const o of source){const no=String(o.orderNumber||'').trim();if(!no||nums.has(no))continue;let q=await c.from('orders').insert(payload(o,user)).select('id').single();if(q.error&&uuid(o.id)){const p=payload(o,user);delete p.id;q=await c.from('orders').insert(p).select('id').single()}if(q.error)continue;const pays=paymentRows(o).map(x=>({order_id:q.data.id,amount:n(x.amount),note:x.note||null,paid_at:dt(x.date)||new Date().toISOString(),created_by:user}));if(pays.length)await c.from('payments').insert(pays);nums.add(no);imported++}
    if(imported){try{await window.SerendibCloud.pull()}catch{};console.info(`Serendib cloud reconciled ${imported} local order(s).`)}
    sessionStorage.removeItem(SNAP);
  }
  run();
})();