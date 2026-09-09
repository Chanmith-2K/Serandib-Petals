const STATUSES=["New","Confirmed","Flowers Ready","Arranging","Wrapping","Ready","Out for Delivery","Delivered"];
const PAYMENTS=["Unpaid","Deposit Paid","Paid"];
const STORAGE_KEY="serendib_orders_preview";
let selectedStatus="All",editingId=null,currentId=null,reportMode="month";

function todayAt(h){const d=new Date();d.setHours(h,0,0,0);return toLocalInput(d)}
function toLocalInput(d){const off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,16)}
function getOrders(){const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return[];try{return JSON.parse(raw)}catch{return[]}}
function setOrders(v){localStorage.setItem(STORAGE_KEY,JSON.stringify(v))}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function isToday(v){const d=new Date(v),n=new Date();return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate()}
function formatDate(v){return new Date(v).toLocaleString([], {year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}
function currentMonthValue(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function monthLabel(v){if(!v)return"All Time";const [y,m]=v.split("-").map(Number);return new Date(y,m-1,1).toLocaleDateString([], {month:"long",year:"numeric"})}
function orderAmount(o){return Number(o.amount||0)}
function orderAdvance(o){if(o.advanceAmount!==undefined&&o.advanceAmount!==null)return Number(o.advanceAmount||0);return o.paymentStatus==="Paid"?orderAmount(o):0}
function orderDue(o){return Math.max(orderAmount(o)-orderAdvance(o),0)}
function money(v){return Number(v||0).toLocaleString()}

function init(){
 document.getElementById("chips").innerHTML=["All",...STATUSES].map(s=>`<button class="chip ${s==="All"?"active":""}" onclick="setStatus('${s.replace(/'/g,"\\'")}')">${s}</button>`).join("");
 document.getElementById("paymentStatus").innerHTML=PAYMENTS.map(x=>`<option>${x}</option>`).join("");
 document.getElementById("status").innerHTML=STATUSES.map(x=>`<option>${x}</option>`).join("");
 const month=document.getElementById("reportMonth");if(month)month.value=currentMonthValue();
 renderOrders();renderAnalytics();
 if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js?v=5").then(reg=>reg.update()).catch(()=>{})}
}
function setStatus(s){selectedStatus=s;[...document.querySelectorAll(".chip")].forEach(b=>b.classList.toggle("active",b.textContent===s));renderOrders()}
function renderOrders(){
 const orders=getOrders(),q=document.getElementById("search").value.trim().toLowerCase();
 const filtered=orders.filter(o=>selectedStatus==="All"||o.status===selectedStatus).filter(o=>!q||[o.orderNumber,o.customerName,o.phone,o.bouquetName].some(x=>(x||"").toLowerCase().includes(q))).sort((a,b)=>new Date(a.deliveryDate)-new Date(b.deliveryDate));
 document.getElementById("openCount").textContent=orders.filter(o=>o.status!=="Delivered").length;
 document.getElementById("todayCount").textContent=orders.filter(o=>o.status!=="Delivered"&&isToday(o.deliveryDate)).length;
 document.getElementById("deliveredCount").textContent=orders.filter(o=>o.status==="Delivered").length;
 const list=document.getElementById("orderList");
 if(!filtered.length){list.innerHTML='<div class="empty">No orders found.<br>Tap + to add one.</div>';return}
 list.innerHTML=filtered.map(o=>{const due=orderDue(o);return `<div class="order" onclick="openDetail('${o.id}')"><div class="row"><h3>${esc(o.orderNumber)}</h3><span class="badge">${esc(o.status)}</span></div><div class="customer">${esc(o.customerName)}</div><div class="bouquet">${esc(o.bouquetName)}</div><div class="meta"><span>${formatDate(o.deliveryDate)}</span><span>Value Rs. ${money(orderAmount(o))} • ${due>0?`Due Rs. ${money(due)}`:"Paid"}</span></div></div>`}).join("")
}
function nextOrderNumber(){const nums=getOrders().map(o=>parseInt((o.orderNumber||"").replace(/\D/g,""))||0);return"SP-"+String((Math.max(0,...nums)+1)).padStart(3,"0")}
function syncPaymentFields(){
 const amount=Math.max(Number(document.getElementById("amount")?.value||0),0);
 let advance=Math.max(Number(document.getElementById("advanceAmount")?.value||0),0);
 if(advance>amount&&amount>0){advance=amount;document.getElementById("advanceAmount").value=amount}
 const due=Math.max(amount-advance,0);
 const dueEl=document.getElementById("dueAmount");if(dueEl)dueEl.value=due;
 const p=document.getElementById("paymentStatus");if(p){p.value=amount>0&&advance>=amount?"Paid":advance>0?"Deposit Paid":"Unpaid"}
}
function openNew(){editingId=null;document.getElementById("formTitle").textContent="New Order";["customerName","phone","bouquetName","flowerDetails","cardMessage","deliveryAddress","amount","advanceAmount","dueAmount","notes"].forEach(id=>document.getElementById(id).value="");document.getElementById("orderNumber").value=nextOrderNumber();document.getElementById("deliveryDate").value=toLocalInput(new Date());document.getElementById("paymentStatus").value="Unpaid";document.getElementById("status").value="New";syncPaymentFields();document.getElementById("orderModal").classList.add("show")}
function saveOrder(){
 const name=document.getElementById("customerName").value.trim(),bouquet=document.getElementById("bouquetName").value.trim();if(!name||!bouquet){alert("Please enter customer name and bouquet name.");return}
 syncPaymentFields();
 let orders=getOrders();const old=editingId?orders.find(o=>o.id===editingId):null;
 const obj={id:editingId||crypto.randomUUID(),orderNumber:document.getElementById("orderNumber").value.trim(),customerName:name,phone:document.getElementById("phone").value.trim(),bouquetName:bouquet,flowerDetails:document.getElementById("flowerDetails").value.trim(),cardMessage:document.getElementById("cardMessage").value.trim(),deliveryAddress:document.getElementById("deliveryAddress").value.trim(),deliveryDate:document.getElementById("deliveryDate").value,amount:Number(document.getElementById("amount").value||0),advanceAmount:Number(document.getElementById("advanceAmount").value||0),paymentStatus:document.getElementById("paymentStatus").value,status:document.getElementById("status").value,notes:document.getElementById("notes").value.trim(),createdAt:old?.createdAt||new Date().toISOString()};
 if(editingId)orders=orders.map(o=>o.id===editingId?obj:o);else orders.push(obj);setOrders(orders);closeModal();renderOrders();renderAnalytics()
}
function openDetail(id){
 currentId=id;const o=getOrders().find(x=>x.id===id);if(!o)return;document.getElementById("detailTitle").textContent=o.orderNumber;
 const items=[["Customer",o.customerName],["Phone",o.phone],["Bouquet",o.bouquetName],["Flowers / Colours",o.flowerDetails],["Card Message",o.cardMessage],["Delivery",formatDate(o.deliveryDate)],["Address",o.deliveryAddress],["Bouquet Value","Rs. "+money(orderAmount(o))],["Advance Paid","Rs. "+money(orderAdvance(o))],["Due Payment","Rs. "+money(orderDue(o))],["Payment",o.paymentStatus],["Status",o.status],["Notes",o.notes]].filter(x=>x[1]!==undefined&&x[1]!==null&&x[1]!=="");
 document.getElementById("detailBody").innerHTML=items.map(([a,b])=>`<div class="detail-card"><div class="detail-label">${esc(a)}</div><div class="detail-value">${esc(b)}</div></div>`).join("");document.getElementById("detailModal").classList.add("show")
}
function editCurrent(){const o=getOrders().find(x=>x.id===currentId);if(!o)return;closeDetail();editingId=o.id;document.getElementById("formTitle").textContent="Edit Order";Object.entries({orderNumber:o.orderNumber,customerName:o.customerName,phone:o.phone,bouquetName:o.bouquetName,flowerDetails:o.flowerDetails,cardMessage:o.cardMessage,deliveryAddress:o.deliveryAddress,deliveryDate:o.deliveryDate,amount:orderAmount(o),advanceAmount:orderAdvance(o),paymentStatus:o.paymentStatus,status:o.status,notes:o.notes}).forEach(([k,v])=>document.getElementById(k).value=v??"");syncPaymentFields();document.getElementById("orderModal").classList.add("show")}
function deleteCurrent(){if(!confirm("Delete this order?"))return;setOrders(getOrders().filter(o=>o.id!==currentId));closeDetail();renderOrders();renderAnalytics()}
function closeModal(){document.getElementById("orderModal").classList.remove("show")}
function closeDetail(){document.getElementById("detailModal").classList.remove("show")}
function backdropClose(e){if(e.target.id==="orderModal")closeModal()}
function backdropCloseDetail(e){if(e.target.id==="detailModal")closeDetail()}
function showPage(page){["orders","analytics","team"].forEach(x=>{document.getElementById(x+"Page").classList.toggle("hidden",x!==page);document.getElementById("tab"+x.charAt(0).toUpperCase()+x.slice(1)).classList.toggle("active",x===page)});if(page==="analytics")renderAnalytics()}

function selectedReportOrders(){const all=getOrders();const month=document.getElementById("reportMonth")?.value||"";if(reportMode==="all"||!month)return all;return all.filter(o=>(o.deliveryDate||"").slice(0,7)===month)}
function renderAnalytics(){
 const monthEl=document.getElementById("reportMonth");if(monthEl&&monthEl.value)reportMode="month";
 const orders=selectedReportOrders(),revenue=orders.reduce((s,o)=>s+orderAmount(o),0),advance=orders.reduce((s,o)=>s+orderAdvance(o),0),due=orders.reduce((s,o)=>s+orderDue(o),0),paid=orders.filter(o=>orderDue(o)===0&&orderAmount(o)>0).length,open=orders.filter(o=>o.status!=="Delivered").length,del=orders.filter(o=>o.status==="Delivered").length;
 const period=reportMode==="all"?"All Time":monthLabel(monthEl?.value||"");
 document.getElementById("periodLabel").textContent=period;
 document.getElementById("revStat").textContent="Rs. "+money(revenue);document.getElementById("advanceStat").textContent="Rs. "+money(advance);document.getElementById("dueStat").textContent="Rs. "+money(due);document.getElementById("paidStat").textContent=paid;document.getElementById("pendingStat").textContent=open;document.getElementById("deliveryStat").textContent=del;
 document.getElementById("reportDate").textContent=`Period: ${period} • Generated: ${new Date().toLocaleString()}`;
 document.getElementById("reportSummary").textContent=`Orders: ${orders.length} | Value: Rs. ${money(revenue)} | Advance: Rs. ${money(advance)} | Due: Rs. ${money(due)} | Delivered: ${del}`;
 document.getElementById("reportTable").innerHTML=orders.length?`<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr><th style="text-align:left;padding:7px;border-bottom:1px solid #ddd">Order</th><th style="text-align:left;padding:7px;border-bottom:1px solid #ddd">Customer</th><th style="text-align:right;padding:7px;border-bottom:1px solid #ddd">Value</th><th style="text-align:right;padding:7px;border-bottom:1px solid #ddd">Advance</th><th style="text-align:right;padding:7px;border-bottom:1px solid #ddd">Due</th><th style="text-align:left;padding:7px;border-bottom:1px solid #ddd">Status</th></tr></thead><tbody>${orders.map(o=>`<tr><td style="padding:7px;border-bottom:1px solid #eee">${esc(o.orderNumber)}</td><td style="padding:7px;border-bottom:1px solid #eee">${esc(o.customerName)}</td><td style="padding:7px;border-bottom:1px solid #eee;text-align:right">Rs. ${money(orderAmount(o))}</td><td style="padding:7px;border-bottom:1px solid #eee;text-align:right">Rs. ${money(orderAdvance(o))}</td><td style="padding:7px;border-bottom:1px solid #eee;text-align:right">Rs. ${money(orderDue(o))}</td><td style="padding:7px;border-bottom:1px solid #eee">${esc(o.status)}</td></tr>`).join("")}</tbody></table></div>`:"<p>No orders for this period.</p>"
}
function showAllTimeReport(){reportMode="all";document.getElementById("reportMonth").value="";renderAnalytics()}
function csvEscape(v){v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function exportCSV(){
 const orders=selectedReportOrders();const headers=["Order ID","Customer","Phone","Bouquet","Flower Details","Card Message","Delivery Date","Delivery Address","Bouquet Value LKR","Advance LKR","Due LKR","Payment Status","Order Status","Notes"];
 const rows=orders.map(o=>[o.orderNumber,o.customerName,o.phone,o.bouquetName,o.flowerDetails,o.cardMessage,formatDate(o.deliveryDate),o.deliveryAddress,orderAmount(o),orderAdvance(o),orderDue(o),o.paymentStatus,o.status,o.notes]);
 const csv=[headers,...rows].map(r=>r.map(csvEscape).join(",")).join("\n");const suffix=reportMode==="all"?"all-time":(document.getElementById("reportMonth").value||"report");downloadBlob(csv,`serendib-orders-${suffix}.csv`,"text/csv;charset=utf-8")
}
function backupJSON(){downloadBlob(JSON.stringify({version:3,exportedAt:new Date().toISOString(),orders:getOrders()},null,2),"serendib-orders-backup-"+new Date().toISOString().slice(0,10)+".json","application/json")}
function restoreBackup(event){const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(reader.result);const orders=Array.isArray(parsed)?parsed:parsed.orders;if(!Array.isArray(orders))throw new Error("Invalid backup");if(!confirm(`Restore ${orders.length} orders? This will replace the orders currently on this device.`))return;setOrders(orders);renderOrders();renderAnalytics();alert("Backup restored successfully.")}catch{alert("That file is not a valid Serendib Orders backup.")}finally{event.target.value=""}};reader.readAsText(file)}
function resetAllData(){if(!confirm("This will delete ALL orders stored on this device. Continue?"))return;const code=prompt('Type RESET to permanently delete all orders on this device.');if(code!=="RESET"){alert("Reset cancelled.");return}setOrders([]);renderOrders();renderAnalytics();alert("All orders on this device have been reset.")}
function downloadBlob(content,name,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function shareSummary(){
 const orders=selectedReportOrders(),rev=orders.reduce((s,o)=>s+orderAmount(o),0),adv=orders.reduce((s,o)=>s+orderAdvance(o),0),due=orders.reduce((s,o)=>s+orderDue(o),0),period=reportMode==="all"?"All Time":monthLabel(document.getElementById("reportMonth")?.value||"");
 const text=`Serendib Petals Orders — ${period}\nOrders: ${orders.length}\nOrder value: Rs. ${money(rev)}\nAdvance collected: Rs. ${money(adv)}\nDue outstanding: Rs. ${money(due)}\nDelivered: ${orders.filter(o=>o.status==="Delivered").length}`;
 if(navigator.share){try{await navigator.share({title:"Serendib Petals Order Report",text})}catch(e){}}else{navigator.clipboard?.writeText(text);alert("Summary copied.")}
}
init();