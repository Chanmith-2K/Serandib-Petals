const SP_STORAGE_KEY="serendib_orders_preview";
let chartDays=30;
const frame=document.getElementById("operationsFrame");

function readOrders(){try{return JSON.parse(localStorage.getItem(SP_STORAGE_KEY)||"[]")||[]}catch{return[]}}
function num(v){return Math.max(Number(v||0),0)}
function bouquetValue(o){return num(o.amount)}
function deliveryFee(o){return num(o.deliveryFee)}
function totalValue(o){return bouquetValue(o)+deliveryFee(o)}
function payments(o){if(Array.isArray(o.payments))return o.payments;const a=num(o.advanceAmount);if(a>0)return[{amount:a,date:o.createdAt||new Date().toISOString()}];if(o.paymentStatus==="Paid")return[{amount:totalValue(o),date:o.createdAt||new Date().toISOString()}];return[]}
function paid(o){return Math.min(payments(o).reduce((s,p)=>s+num(p.amount),0),totalValue(o))}
function due(o){return Math.max(totalValue(o)-paid(o),0)}
function costs(o){return num(o.flowerCost)+num(o.wrappingCost)+num(o.deliveryCost)+num(o.otherCost)}
function profit(o){return totalValue(o)-costs(o)}
function money(v){return Number(v||0).toLocaleString()}
function localDate(d=new Date()){const off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10)}
function orderDate(o){return String(o.orderDate||(o.createdAt||"").slice(0,10)||"").slice(0,10)}
function deliveryDate(o){return String(o.deliveryDate||"").slice(0,10)}
function isDelivered(o){return o.status==="Delivered"||o.deliveryStatus==="Delivered"}
function isOpen(o){return !isDelivered(o)}
function isUrgent(o){return o.priority==="Urgent"||o.priority==="Same Day"}
function escText(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value}

function monthOrders(orders){const now=new Date(),prefix=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;return orders.filter(o=>orderDate(o).startsWith(prefix))}

function refreshDashboard(){
  const orders=readOrders();
  const month=monthOrders(orders);
  const sales=month.reduce((s,o)=>s+totalValue(o),0);
  const collected=month.reduce((s,o)=>s+paid(o),0);
  const outstanding=orders.reduce((s,o)=>s+due(o),0);
  const gp=month.reduce((s,o)=>s+profit(o),0);
  const today=localDate();
  const todays=orders.filter(o=>deliveryDate(o)===today&&!isDelivered(o));
  const open=orders.filter(isOpen);
  const urgent=open.filter(isUrgent);
  const dueOrders=orders.filter(o=>due(o)>0);
  const collectPct=sales>0?Math.round(collected/sales*100):0;
  const margin=sales>0?Math.round(gp/sales*100):0;

  setText("kpiSales","Rs. "+money(sales)); setText("kpiSalesSub",`${month.length} orders this month`);
  setText("kpiCollected","Rs. "+money(collected)); setText("kpiCollectedSub",`${collectPct}% of sales collected`);
  setText("kpiDue","Rs. "+money(outstanding)); setText("kpiDueSub",`${dueOrders.length} orders with balance`);
  setText("kpiProfit","Rs. "+money(gp)); setText("kpiProfitSub",`${margin}% gross margin`);
  setText("kpiToday",todays.length); setText("kpiTodaySub","deliveries scheduled");
  setText("kpiOpen",open.length); setText("kpiOpenSub",`${urgent.length} urgent / same-day`);
  setText("todayLabel",new Date().toLocaleDateString([], {weekday:"long",year:"numeric",month:"long",day:"numeric"})+" • Live local data");

  renderTrend(orders);renderAttention(orders);renderStatus(orders);renderLeads(month);renderUpcoming(orders);
}

function setChartRange(days,btn){chartDays=days;document.querySelectorAll('.range').forEach(b=>b.classList.toggle('active',b===btn));renderTrend(readOrders())}
function trendSeries(orders){
  const data=[];const today=new Date();
  for(let i=chartDays-1;i>=0;i--){const d=new Date(today);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const key=localDate(d);const dayOrders=orders.filter(o=>orderDate(o)===key);data.push({key,label:chartDays<=7?d.toLocaleDateString([],{weekday:'short'}):d.toLocaleDateString([],{month:'short',day:'numeric'}),sales:dayOrders.reduce((s,o)=>s+totalValue(o),0),profit:dayOrders.reduce((s,o)=>s+profit(o),0)})}return data
}
function renderTrend(orders){
  const box=document.getElementById('trendChart');if(!box)return;const data=trendSeries(orders);const max=Math.max(0,...data.map(d=>Math.max(d.sales,d.profit)));
  if(max<=0){box.innerHTML='<div class="chart-empty">No sales in this range yet.<br>Add orders and the trend will build automatically.</div>';return}
  const W=900,H=250,L=48,R=16,T=18,B=34,plotW=W-L-R,plotH=H-T-B;
  const x=i=>L+(data.length===1?plotW/2:(i/(data.length-1))*plotW),y=v=>T+plotH-(v/max)*plotH;
  const salesPts=data.map((d,i)=>[x(i),y(d.sales)]),profitPts=data.map((d,i)=>[x(i),y(d.profit)]);
  const path=pts=>pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=`${path(salesPts)} L ${x(data.length-1).toFixed(1)} ${(T+plotH).toFixed(1)} L ${x(0).toFixed(1)} ${(T+plotH).toFixed(1)} Z`;
  let grid='';for(let i=0;i<=4;i++){const gy=T+(plotH/4)*i;const val=max-(max/4)*i;grid+=`<line x1="${L}" y1="${gy}" x2="${W-R}" y2="${gy}" stroke="#edf1ed" stroke-width="1"/><text x="${L-9}" y="${gy+3}" text-anchor="end" font-size="9" fill="#8a938d">${compact(val)}</text>`}
  const step=chartDays<=7?1:chartDays<=30?5:15;let labels='';data.forEach((d,i)=>{if(i%step===0||i===data.length-1)labels+=`<text x="${x(i)}" y="${H-7}" text-anchor="middle" font-size="8.5" fill="#8a938d">${escText(d.label)}</text>`});
  const points=data.map((d,i)=>`<g class="hover-point" data-i="${i}"><circle cx="${x(i)}" cy="${y(d.sales)}" r="3.2" fill="#7b1e2b"/><rect x="${Math.max(L,x(i)-plotW/data.length/2)}" y="${T}" width="${Math.max(7,plotW/data.length)}" height="${plotH}" fill="transparent"/></g>`).join('');
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Sales and profit trend"><defs><linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7b1e2b" stop-opacity=".16"/><stop offset="100%" stop-color="#7b1e2b" stop-opacity="0"/></linearGradient></defs>${grid}${labels}<path d="${area}" fill="url(#salesArea)"/><path d="${path(salesPts)}" fill="none" stroke="#7b1e2b" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/><path d="${path(profitPts)}" fill="none" stroke="#78a289" stroke-width="2.3" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>${points}</svg>`;
  box.querySelectorAll('.hover-point').forEach(g=>{g.addEventListener('mouseenter',e=>showTip(box,data[Number(g.dataset.i)],e));g.addEventListener('mouseleave',()=>hideTip(box))})
}
function compact(v){v=Number(v||0);if(v>=1000000)return (v/1000000).toFixed(v>=10000000?0:1)+'M';if(v>=1000)return (v/1000).toFixed(v>=10000?0:1)+'K';return Math.round(v)}
function showTip(box,d,e){hideTip(box);const tip=document.createElement('div');tip.className='chart-tooltip';tip.innerHTML=`<b>${escText(d.label)}</b><br>Sales Rs. ${money(d.sales)}<br>Profit Rs. ${money(d.profit)}`;box.appendChild(tip);const br=box.getBoundingClientRect();tip.style.left=(e.clientX-br.left)+'px';tip.style.top=(e.clientY-br.top)+'px'}function hideTip(box){box.querySelector('.chart-tooltip')?.remove()}

function renderAttention(orders){
  const box=document.getElementById('attentionList');if(!box)return;const now=Date.now();const rows=[];
  orders.filter(o=>due(o)>0).sort((a,b)=>due(b)-due(a)).slice(0,3).forEach(o=>rows.push({id:o.id,title:o.orderNumber+' • '+(o.customerName||'Customer'),sub:'Payment outstanding',value:'Due Rs. '+money(due(o))}));
  orders.filter(o=>isOpen(o)&&isUrgent(o)).slice(0,3).forEach(o=>{if(!rows.some(r=>r.id===o.id))rows.push({id:o.id,title:o.orderNumber+' • '+(o.customerName||'Customer'),sub:(o.priority||'Urgent')+' • '+formatShort(o.deliveryDate),value:'Action'})});
  if(!rows.length){box.innerHTML='<div class="attention-empty">Nothing urgent right now.</div>';return}
  box.innerHTML=rows.slice(0,5).map(r=>`<div class="attention-item" onclick="openOrder('${escText(r.id)}')"><div><b>${escText(r.title)}</b><small>${escText(r.sub)}</small></div><div class="attention-value">${escText(r.value)}</div></div>`).join('')
}
function renderStatus(orders){const box=document.getElementById('statusBreakdown');if(!box)return;const keys=['New','Confirmed','Flowers Ready','Arranging','Wrapping','Ready','Out for Delivery','Delivered'];const counts=keys.map(k=>[k,orders.filter(o=>o.status===k).length]).filter(x=>x[1]>0);const max=Math.max(1,...counts.map(x=>x[1]));box.innerHTML=counts.length?counts.map(([k,c])=>`<div class="status-row"><span>${escText(k)}</span><div class="bar-track"><div class="bar-fill" style="width:${c/max*100}%"></div></div><b>${c}</b></div>`).join(''):'<div class="attention-empty">No order status data yet.</div>'}
function renderLeads(orders){const box=document.getElementById('leadBreakdown');if(!box)return;const map={};orders.forEach(o=>{const k=o.leadSource||'Unknown';map[k]=(map[k]||0)+1});const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,7),max=Math.max(1,...rows.map(x=>x[1]));box.innerHTML=rows.length?rows.map(([k,c])=>`<div class="lead-row"><span>${escText(k)}</span><div class="bar-track"><div class="bar-fill" style="width:${c/max*100}%"></div></div><b>${c}</b></div>`).join(''):'<div class="attention-empty">Lead-source data will appear here.</div>'}
function renderUpcoming(orders){const box=document.getElementById('upcomingTable');if(!box)return;const now=localDate();const upcoming=orders.filter(o=>isOpen(o)&&deliveryDate(o)>=now).sort((a,b)=>String(a.deliveryDate).localeCompare(String(b.deliveryDate))).slice(0,8);box.innerHTML=upcoming.length?upcoming.map(o=>`<div class="upcoming-row" onclick="openOrder('${escText(o.id)}')"><span>${escText(formatShort(o.deliveryDate))}</span><b>${escText(o.orderNumber||'')}</b><span>${escText(o.customerName||'')}</span><span>${escText(o.bouquetName||'')}</span><span class="${due(o)>0?'due':'paid'}">${due(o)>0?'Due '+money(due(o)):'Paid'}</span></div>`).join(''):'<div class="attention-empty">No upcoming deliveries.</div>'}
function formatShort(v){if(!v)return'';const d=new Date(v);return d.toLocaleDateString([],{month:'short',day:'numeric'})+' '+d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}

function switchView(view,button){
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const dash=document.getElementById('dashboardView'),ops=document.getElementById('operationsView');
  if(view==='dashboard'){dash.classList.remove('hidden');ops.classList.add('hidden');refreshDashboard();return}
  dash.classList.add('hidden');ops.classList.remove('hidden');
  callFramePage(view);
}
function callFramePage(view){try{const w=frame.contentWindow;if(typeof w.showPage==='function')w.showPage(view)}catch(e){} }
function prepareFrame(){
  try{const doc=frame.contentDocument;if(!doc)return;let style=doc.getElementById('shell-embed-style');if(!style){style=doc.createElement('style');style.id='shell-embed-style';style.textContent='@media(min-width:900px){.tabs{display:none!important}#ordersPage,#todayPage,#analyticsPage,#teamPage{margin-left:0!important}.phone{width:100%!important;max-width:none!important}.top>.header,.top>.summary,.top>.search,.top>.chips,.list,.analytics{max-width:none!important}.list{grid-template-columns:repeat(3,minmax(0,1fr))!important}}';doc.head.appendChild(style)}}catch(e){}
}
frame.addEventListener('load',()=>{prepareFrame();const active=document.querySelector('.nav-item.active')?.dataset.view;if(active&&active!=='dashboard')callFramePage(active)});
function openNewFromShell(){switchView('orders',document.querySelector('[data-view=orders]'));setTimeout(()=>{try{frame.contentWindow.openNew()}catch(e){}},120)}
function openOrder(id){switchView('orders',document.querySelector('[data-view=orders]'));setTimeout(()=>{try{frame.contentWindow.openDetail(id)}catch(e){}},140)}
async function toggleFullscreen(){try{if(!document.fullscreenElement){await document.documentElement.requestFullscreen();setText('fullscreenBtn','Exit Full Screen')}else{await document.exitFullscreen();setText('fullscreenBtn','Full Screen')}}catch(e){}}
document.addEventListener('fullscreenchange',()=>setText('fullscreenBtn',document.fullscreenElement?'Exit Full Screen':'Full Screen'));
window.addEventListener('storage',refreshDashboard);
window.addEventListener('focus',refreshDashboard);
if(window.innerWidth<900){document.getElementById('dashboardView').classList.add('hidden');document.getElementById('operationsView').classList.remove('hidden')}
refreshDashboard();
