/* Serendib Orders v7 — reporting + usability enhancements */
let reportRangeMode = "range";

function v7Date(d){
  const x = new Date(d);
  const off = x.getTimezoneOffset();
  return new Date(x.getTime()-off*60000).toISOString().slice(0,10);
}
function startOfMonth(d=new Date()){ return v7Date(new Date(d.getFullYear(),d.getMonth(),1)); }
function endOfMonth(d=new Date()){ return v7Date(new Date(d.getFullYear(),d.getMonth()+1,0)); }
function reportOrderDate(o){
  const basis=document.getElementById("reportBasis")?.value||"delivery";
  if(basis==="order") return (o.orderDate || (o.createdAt||"").slice(0,10) || "").slice(0,10);
  return (o.deliveryDate||"").slice(0,10);
}
function reportRangeLabel(){
  const s=document.getElementById("reportStart")?.value||"";
  const e=document.getElementById("reportEnd")?.value||"";
  if(reportRangeMode==="all" || (!s&&!e)) return "All Time";
  const f=v=>v?new Date(v+"T00:00:00").toLocaleDateString([], {year:"numeric",month:"short",day:"numeric"}):"…";
  return `${f(s)} – ${f(e)}`;
}
function selectedReportOrders(){
  const all=getOrders();
  if(reportRangeMode==="all") return all;
  const s=document.getElementById("reportStart")?.value||"";
  const e=document.getElementById("reportEnd")?.value||"";
  return all.filter(o=>{
    const d=reportOrderDate(o); if(!d) return false;
    if(s && d<s) return false;
    if(e && d>e) return false;
    return true;
  });
}
function setReportPreset(type){
  reportRangeMode="range";
  const now=new Date(); let s,e;
  if(type==="today"){ s=e=v7Date(now); }
  else if(type==="week"){
    const day=(now.getDay()+6)%7; const a=new Date(now); a.setDate(now.getDate()-day); const b=new Date(a); b.setDate(a.getDate()+6); s=v7Date(a); e=v7Date(b);
  } else if(type==="lastMonth"){
    const d=new Date(now.getFullYear(),now.getMonth()-1,1); s=startOfMonth(d); e=endOfMonth(d);
  } else { s=startOfMonth(now); e=endOfMonth(now); }
  document.getElementById("reportStart").value=s;
  document.getElementById("reportEnd").value=e;
  renderAnalytics();
  v7PresetActive(type);
}
function v7PresetActive(type){
  document.querySelectorAll("[data-report-preset]").forEach(b=>b.classList.toggle("active",b.dataset.reportPreset===type));
}
function showAllTimeReport(){
  reportRangeMode="all";
  document.getElementById("reportStart").value="";
  document.getElementById("reportEnd").value="";
  v7PresetActive("");
  renderAnalytics();
}
function onReportRangeChange(){ reportRangeMode="range"; v7PresetActive(""); renderAnalytics(); }
function renderAnalytics(){
  const orders=selectedReportOrders();
  const revenue=orders.reduce((s,o)=>s+orderTotal(o),0);
  const collected=orders.reduce((s,o)=>s+orderPaid(o),0);
  const due=orders.reduce((s,o)=>s+orderDue(o),0);
  const profit=orders.reduce((s,o)=>s+orderProfit(o),0);
  const delivered=orders.filter(o=>o.status==="Delivered" || o.deliveryStatus==="Delivered").length;
  const period=reportRangeLabel();
  const basis=document.getElementById("reportBasis")?.value==="order"?"Order date":"Delivery date";
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};
  set("periodLabel",`${period} • ${basis}`);
  set("revStat","Rs. "+money(revenue));
  set("collectedStat","Rs. "+money(collected));
  set("dueStat","Rs. "+money(due));
  set("profitStat","Rs. "+money(profit));
  set("ordersStat",orders.length);
  set("deliveryStat",delivered);
  set("reportDate",`${period} • ${basis} • Generated ${new Date().toLocaleString()}`);
  set("reportSummary",`Orders ${orders.length}  |  Sales Rs. ${money(revenue)}  |  Collected Rs. ${money(collected)}  |  Due Rs. ${money(due)}  |  Gross profit Rs. ${money(profit)}`);

  const bySource={}; orders.forEach(o=>{const k=o.leadSource||"Unknown";bySource[k]=(bySource[k]||0)+1});
  const sb=document.getElementById("sourceBreakdown");
  if(sb) sb.innerHTML=Object.keys(bySource).length?`<div class="source-chips">${Object.entries(bySource).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<span>${esc(k)} <b>${v}</b></span>`).join("")}</div>`:"";

  const rt=document.getElementById("reportTable");
  if(!rt)return;
  if(!orders.length){rt.innerHTML='<div class="empty compact">No orders in this period.</div>';return}
  rt.innerHTML=`<div class="report-preview-list">${orders.slice().sort((a,b)=>reportOrderDate(a).localeCompare(reportOrderDate(b))).map(o=>`
    <div class="report-preview-row">
      <div><b>${esc(o.orderNumber||"")}</b><small>${esc(o.customerName||"")} • ${esc(o.bouquetName||"")}</small></div>
      <div class="right"><b>Rs. ${money(orderTotal(o))}</b><small>${orderDue(o)>0?`Due Rs. ${money(orderDue(o))}`:"Paid"}</small></div>
    </div>`).join("")}</div>`;
}

function reportCell(label,value){
  if(value===undefined||value===null||value==="") return "";
  return `<div class="r-cell"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}
function reportOrderCard(o){
  const payments=orderPayments(o);
  return `<section class="r-order">
    <div class="r-order-head"><div><h2>${esc(o.orderNumber||"Order")}</h2><p>${esc(o.bouquetName||"")}</p></div><div class="r-status">${esc(o.status||"New")}</div></div>
    <div class="r-grid">
      ${reportCell("Order date",o.orderDate||((o.createdAt||"").slice(0,10)))}
      ${reportCell("Delivery",formatDate(o.deliveryDate))}
      ${reportCell("Buyer",o.customerName)}
      ${reportCell("Buyer phone",o.phone)}
      ${reportCell("Recipient",o.recipientName)}
      ${reportCell("Recipient phone",o.recipientPhone)}
      ${reportCell("Occasion",o.occasion)}
      ${reportCell("Lead source",o.leadSource)}
      ${reportCell("Priority",o.priority)}
      ${reportCell("Address",o.deliveryAddress)}
    </div>
    ${o.flowerDetails?`<div class="r-note"><span>Flowers / colours</span><p>${esc(o.flowerDetails)}</p></div>`:""}
    ${o.cardMessage?`<div class="r-note"><span>Card message</span><p>${esc(o.cardMessage)}</p></div>`:""}
    <div class="r-money">
      ${reportCell("Bouquet value","Rs. "+money(orderBouquetValue(o)))}
      ${reportCell("Delivery fee","Rs. "+money(orderDeliveryFee(o)))}
      ${reportCell("Total","Rs. "+money(orderTotal(o)))}
      ${reportCell("Paid","Rs. "+money(orderPaid(o)))}
      ${reportCell("Due","Rs. "+money(orderDue(o)))}
      ${reportCell("Gross profit","Rs. "+money(orderProfit(o)))}
    </div>
    <div class="r-grid r-workflow">
      ${reportCell("Pasidu — prep",o.prepStatus||"Pending")}
      ${reportCell("Nangi — bouquet",o.designStatus||"Pending")}
      ${reportCell("Pasidu — delivery",o.deliveryStatus||"Pending")}
      ${reportCell("Payment",paymentStatus(o))}
    </div>
    ${payments.length?`<div class="r-payments"><span>Payments</span>${payments.map(p=>`<p><b>Rs. ${money(p.amount)}</b> • ${new Date(p.date).toLocaleString()}${p.note?` • ${esc(p.note)}`:""}</p>`).join("")}</div>`:""}
    ${o.notes?`<div class="r-note"><span>Internal notes</span><p>${esc(o.notes)}</p></div>`:""}
  </section>`;
}
function createPDFReport(){
  const orders=selectedReportOrders().slice().sort((a,b)=>reportOrderDate(a).localeCompare(reportOrderDate(b)));
  if(!orders.length){alert("No orders in the selected period.");return}
  const period=reportRangeLabel();
  const basis=document.getElementById("reportBasis")?.value==="order"?"Order Date":"Delivery Date";
  const revenue=orders.reduce((s,o)=>s+orderTotal(o),0), collected=orders.reduce((s,o)=>s+orderPaid(o),0), due=orders.reduce((s,o)=>s+orderDue(o),0), profit=orders.reduce((s,o)=>s+orderProfit(o),0);
  const w=window.open("","_blank");
  if(!w){alert("Please allow pop-ups for this site, then tap Create PDF Report again.");return}
  const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Serendib Petals Report</title><style>
  @page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#202521;margin:0;background:#fff;font-size:11px}.r-header{border-bottom:3px solid #7b1e2b;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;gap:20px}.r-header h1{margin:0;font-size:23px;color:#7b1e2b}.r-header p{margin:4px 0 0;color:#667068}.r-meta{text-align:right}.r-summary{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin:0 0 16px}.r-summary div{border:1px solid #e5e8e5;border-radius:8px;padding:9px}.r-summary span,.r-cell span,.r-note span,.r-payments>span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.5px;color:#737b75;margin-bottom:3px}.r-summary b{font-size:13px}.r-order{border:1px solid #dfe4df;border-radius:10px;padding:12px;margin:0 0 10px;break-inside:avoid}.r-order-head{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #ecefec;padding-bottom:8px;margin-bottom:9px}.r-order-head h2{margin:0;font-size:15px}.r-order-head p{margin:2px 0 0;color:#677068}.r-status{font-size:9px;font-weight:700;background:#f4eaec;color:#7b1e2b;padding:5px 8px;border-radius:99px;height:max-content}.r-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 12px}.r-cell strong{font-size:10px;font-weight:600;white-space:pre-wrap}.r-money{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0;padding:8px;background:#faf7f8;border-radius:8px}.r-note,.r-payments{margin-top:8px;padding-top:7px;border-top:1px dashed #e3e5e3}.r-note p,.r-payments p{margin:2px 0;white-space:pre-wrap}.r-workflow{margin-top:8px}.r-footer{margin-top:15px;color:#7a817b;font-size:9px;text-align:center}.toolbar{position:sticky;top:0;background:#fff;padding:10px 0 12px;display:flex;gap:8px;z-index:2}.toolbar button{border:0;border-radius:8px;padding:9px 13px;font-weight:700;background:#7b1e2b;color:#fff}.toolbar button.secondary{background:#f1f2f1;color:#303630}@media print{.toolbar{display:none}.r-order{break-inside:avoid}body{font-size:10px}}
  </style></head><body>
  <div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button><button class="secondary" onclick="window.close()">Close</button></div>
  <header class="r-header"><div><h1>Serendib Petals</h1><p>Order Report</p></div><div class="r-meta"><b>${esc(period)}</b><p>Based on ${esc(basis)}<br>Generated ${new Date().toLocaleString()}</p></div></header>
  <div class="r-summary"><div><span>Orders</span><b>${orders.length}</b></div><div><span>Sales</span><b>Rs. ${money(revenue)}</b></div><div><span>Collected</span><b>Rs. ${money(collected)}</b></div><div><span>Due</span><b>Rs. ${money(due)}</b></div><div><span>Gross Profit</span><b>Rs. ${money(profit)}</b></div></div>
  ${orders.map(reportOrderCard).join("")}
  <div class="r-footer">Serendib Petals • Internal Order Report</div>
  </body></html>`;
  w.document.open(); w.document.write(html); w.document.close();
  setTimeout(()=>{try{w.focus();w.print()}catch(e){}},500);
}

function exportCSV(){
  const orders=selectedReportOrders();
  const headers=["Order ID","Order Date","Delivery Date","Buyer","Buyer Phone","Recipient","Recipient Phone","Occasion","Lead Source","Priority","Bouquet","Flower Details","Card Message","Delivery Address","Bouquet Value","Delivery Fee","Total","Paid","Due","Flower Cost","Wrapping Cost","Delivery Cost","Other Cost","Gross Profit","Order Status","Prep Status","Design Status","Delivery Status","Notes"];
  const rows=orders.map(o=>[o.orderNumber,o.orderDate||((o.createdAt||"").slice(0,10)),formatDate(o.deliveryDate),o.customerName,o.phone,o.recipientName,o.recipientPhone,o.occasion,o.leadSource,o.priority,o.bouquetName,o.flowerDetails,o.cardMessage,o.deliveryAddress,orderBouquetValue(o),orderDeliveryFee(o),orderTotal(o),orderPaid(o),orderDue(o),n(o.flowerCost),n(o.wrappingCost),n(o.deliveryCost),n(o.otherCost),orderProfit(o),o.status,o.prepStatus,o.designStatus,o.deliveryStatus,o.notes]);
  const csv=[headers,...rows].map(r=>r.map(csvEscape).join(",")).join("\n");
  const s=document.getElementById("reportStart")?.value||"start",e=document.getElementById("reportEnd")?.value||"end";
  downloadBlob(csv,`serendib-orders-${s}-to-${e}.csv`,"text/csv;charset=utf-8");
}

function orderMatchesFilter(o){
  if(selectedStatus==="All")return true;
  if(selectedStatus==="Today")return isToday(o.deliveryDate);
  if(selectedStatus==="Tomorrow"){
    const d=new Date();d.setDate(d.getDate()+1);return (o.deliveryDate||"").slice(0,10)===v7Date(d);
  }
  if(selectedStatus==="Due")return orderDue(o)>0;
  if(selectedStatus==="Urgent")return o.priority==="Urgent"||o.priority==="Same Day";
  if(selectedStatus==="Ready")return o.status==="Ready";
  if(selectedStatus==="Delivered")return o.status==="Delivered"||o.deliveryStatus==="Delivered";
  return o.status===selectedStatus;
}
function initV7(){
  const chips=document.getElementById("chips");
  if(chips) chips.innerHTML=["All","Today","Due","Urgent","Ready","Delivered"].map(s=>`<button class="chip ${s==="All"?"active":""}" onclick="setStatus('${s}')">${s}</button>`).join("");
  const hiddenMonth=document.getElementById("reportMonth"); if(hiddenMonth) hiddenMonth.value=currentMonthValue();
  setReportPreset("month");
  renderOrders();
}
initV7();
