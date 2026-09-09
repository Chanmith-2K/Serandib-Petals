/* Serendib Petals v11 — delivery calendar, tomorrow reminders, logo branding */
(function(){
  if(window.__SERENDIB_V11__) return;
  window.__SERENDIB_V11__=true;

  const STORAGE_KEY='serendib_orders_preview';
  const REMINDER_PREFIX='sp_tomorrow_reminder_';
  const LOGO='serendib-logo.svg?v=11';
  let calCursor=new Date();
  calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth(),1);
  let selectedDate=localKey(new Date());

  function orders(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')||[]}catch{return[]}}
  function num(v){return Math.max(Number(v||0),0)}
  function total(o){return num(o.amount)+num(o.deliveryFee)}
  function payments(o){if(Array.isArray(o.payments))return o.payments;const a=num(o.advanceAmount);return a>0?[{amount:a}]:[]}
  function paid(o){return Math.min(payments(o).reduce((s,p)=>s+num(p.amount),0),total(o))}
  function due(o){return Math.max(total(o)-paid(o),0)}
  function delivered(o){return o.status==='Delivered'||o.deliveryStatus==='Delivered'}
  function deliveryKey(o){return String(o.deliveryDate||'').slice(0,10)}
  function localKey(d){const x=new Date(d);const off=x.getTimezoneOffset();return new Date(x.getTime()-off*60000).toISOString().slice(0,10)}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function money(v){return Number(v||0).toLocaleString()}
  function timeLabel(v){if(!v)return'';const d=new Date(v);return isNaN(d)?'':d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
  function dateLong(k){if(!k)return'';return new Date(k+'T00:00:00').toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
  function firstDelivery(list){return list.slice().sort((a,b)=>String(a.deliveryDate).localeCompare(String(b.deliveryDate)))[0]}
  function isPrimaryFrame(){try{return window.parent===window.top}catch{return true}}

  function tomorrowOrders(){const key=localKey(addDays(new Date(),1));return orders().filter(o=>deliveryKey(o)===key&&!delivered(o)).sort((a,b)=>String(a.deliveryDate).localeCompare(String(b.deliveryDate)))}
  function reminderSummaryHtml(){
    const list=tomorrowOrders();
    const first=firstDelivery(list);
    const count=list.length;
    const totalDue=list.reduce((s,o)=>s+due(o),0);
    return `<div class="sp-reminder-copy"><span class="sp-reminder-kicker">TOMORROW</span><strong>${count?`${count} deliver${count===1?'y':'ies'} scheduled`:'No deliveries scheduled'}</strong><small>${count?`${first?`First at ${esc(timeLabel(first.deliveryDate))}`:''}${totalDue>0?` • Due Rs. ${money(totalDue)}`:''}`:'Your schedule is clear for tomorrow.'}</small></div><div class="sp-reminder-actions"><button class="sp-reminder-btn secondary" type="button" data-sp-view-calendar>View Calendar</button><button class="sp-reminder-btn" type="button" data-sp-enable-reminders>${reminderButtonLabel()}</button></div>`;
  }

  function reminderButtonLabel(){
    if(!('Notification' in window)) return 'In-app reminders';
    if(Notification.permission==='granted') return 'Reminders On';
    if(Notification.permission==='denied') return 'Notifications Blocked';
    return 'Enable Reminders';
  }

  async function enableReminders(){
    if(!('Notification' in window)){
      alert('Browser notifications are not supported here. The app will still show the day-before reminder inside the system.');
      return;
    }
    if(Notification.permission==='denied'){
      alert('Notifications are blocked for this site. Enable them from your browser/site settings.');
      return;
    }
    try{
      const p=await Notification.requestPermission();
      updateReminderAreas();
      if(p==='granted'){
        const list=tomorrowOrders();
        if(list.length) await maybeNotifyTomorrow(true);
        else alert('Reminders are enabled. The app will alert you when tomorrow has deliveries.');
      }
    }catch(e){alert('Could not enable browser notifications. In-app reminders will still work.');}
  }

  async function maybeNotifyTomorrow(force=false){
    if(!isPrimaryFrame() || !('Notification' in window) || Notification.permission!=='granted') return;
    const list=tomorrowOrders(); if(!list.length) return;
    const today=localKey(new Date());
    const key=REMINDER_PREFIX+today;
    const signature=list.map(o=>o.id||o.orderNumber).join('|');
    if(!force && localStorage.getItem(key)===signature) return;
    const first=firstDelivery(list);
    const title=`Tomorrow: ${list.length} Serendib ${list.length===1?'delivery':'deliveries'}`;
    const body=`${first?`First ${timeLabel(first.deliveryDate)} • ${first.orderNumber||''} ${first.customerName||''}`:'Open Delivery Calendar for details.'}`.trim();
    try{
      if('serviceWorker' in navigator){
        const reg=await Promise.race([navigator.serviceWorker.ready,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),2500))]);
        await reg.showNotification(title,{body,icon:LOGO,badge:LOGO,tag:'serendib-tomorrow',renotify:false});
      }else{
        new Notification(title,{body,icon:LOGO,tag:'serendib-tomorrow'});
      }
      localStorage.setItem(key,signature);
    }catch(e){
      try{new Notification(title,{body,icon:LOGO,tag:'serendib-tomorrow'});localStorage.setItem(key,signature)}catch(_){}
    }
  }

  function openCalendar(){
    if(document.getElementById('calendarView') && typeof window.switchView==='function'){
      window.switchView('calendar',document.querySelector('[data-view="calendar"]'));
      return;
    }
    if(document.getElementById('calendarPage') && typeof window.showPage==='function'){
      window.showPage('calendar');
    }
  }

  function attachReminderButtons(root=document){
    root.querySelectorAll('[data-sp-enable-reminders]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.addEventListener('click',enableReminders)});
    root.querySelectorAll('[data-sp-view-calendar]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.addEventListener('click',openCalendar)});
  }

  function updateReminderAreas(){
    document.querySelectorAll('.sp-tomorrow-reminder').forEach(el=>el.innerHTML=reminderSummaryHtml());
    attachReminderButtons(document);
  }

  function calendarShellHtml(){
    return `<div class="sp-calendar-shell">
      <div class="sp-calendar-topbar">
        <div><span class="sp-calendar-eyebrow">DELIVERY PLANNER</span><h2>Delivery Calendar</h2><p>See every delivery by date and prepare the team before the day arrives.</p></div>
        <div class="sp-calendar-top-actions"><button class="sp-cal-btn" type="button" data-sp-enable-reminders>${reminderButtonLabel()}</button><button class="sp-cal-btn primary" type="button" onclick="openNewFromCalendar()">+ New Order</button></div>
      </div>
      <div class="sp-tomorrow-reminder">${reminderSummaryHtml()}</div>
      <div class="sp-calendar-layout">
        <section class="sp-calendar-card">
          <div class="sp-month-controls"><button type="button" data-sp-prev-month>‹</button><div><strong id="spCalendarMonth"></strong><small id="spCalendarMonthCount"></small></div><button type="button" data-sp-next-month>›</button><button type="button" class="sp-today-btn" data-sp-today>Today</button></div>
          <div class="sp-weekdays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
          <div class="sp-calendar-grid" id="spCalendarGrid"></div>
        </section>
        <aside class="sp-day-panel">
          <div class="sp-day-panel-head"><span>SELECTED DATE</span><h3 id="spSelectedDate"></h3><small id="spSelectedSummary"></small></div>
          <div id="spSelectedOrders" class="sp-selected-orders"></div>
        </aside>
      </div>
    </div>`;
  }

  function openNewFromCalendar(){
    if(document.getElementById('calendarView') && typeof window.openNewFromShell==='function'){window.openNewFromShell();return}
    if(typeof window.showPage==='function')window.showPage('orders');
    if(typeof window.openNew==='function')setTimeout(()=>window.openNew(),50);
  }
  window.openNewFromCalendar=openNewFromCalendar;

  function renderCalendar(){
    const monthEl=document.getElementById('spCalendarMonth');
    const grid=document.getElementById('spCalendarGrid');
    if(!monthEl||!grid)return;
    const all=orders();
    const y=calCursor.getFullYear(),m=calCursor.getMonth();
    monthEl.textContent=calCursor.toLocaleDateString([],{month:'long',year:'numeric'});
    const monthPrefix=`${y}-${String(m+1).padStart(2,'0')}`;
    const monthOrders=all.filter(o=>deliveryKey(o).startsWith(monthPrefix)&&!delivered(o));
    const mc=document.getElementById('spCalendarMonthCount');if(mc)mc.textContent=`${monthOrders.length} upcoming deliver${monthOrders.length===1?'y':'ies'} this month`;

    const first=new Date(y,m,1); const days=new Date(y,m+1,0).getDate();
    const mondayOffset=(first.getDay()+6)%7;
    const cells=[];
    for(let i=0;i<mondayOffset;i++)cells.push('<div class="sp-day empty"></div>');
    const today=localKey(new Date());
    for(let d=1;d<=days;d++){
      const key=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const ds=all.filter(o=>deliveryKey(o)===key&&!delivered(o));
      const urgent=ds.filter(o=>o.priority==='Urgent'||o.priority==='Same Day').length;
      const cls=['sp-day']; if(key===today)cls.push('today'); if(key===selectedDate)cls.push('selected'); if(ds.length)cls.push('has-orders');
      cells.push(`<button type="button" class="${cls.join(' ')}" data-sp-day="${key}"><span class="sp-day-num">${d}</span>${ds.length?`<span class="sp-day-count">${ds.length}</span><small>${ds.length===1?'delivery':'deliveries'}${urgent?` • ${urgent} urgent`:''}</small>`:'<small>—</small>'}</button>`);
    }
    grid.innerHTML=cells.join('');
    grid.querySelectorAll('[data-sp-day]').forEach(b=>b.addEventListener('click',()=>{selectedDate=b.dataset.spDay;renderCalendar()}));
    renderSelectedDay();
    attachReminderButtons(document);
  }

  function renderSelectedDay(){
    const all=orders();
    const list=all.filter(o=>deliveryKey(o)===selectedDate).sort((a,b)=>String(a.deliveryDate).localeCompare(String(b.deliveryDate)));
    const h=document.getElementById('spSelectedDate');if(h)h.textContent=dateLong(selectedDate);
    const s=document.getElementById('spSelectedSummary');if(s)s.textContent=list.length?`${list.length} order${list.length===1?'':'s'} • Due Rs. ${money(list.reduce((a,o)=>a+due(o),0))}`:'No deliveries scheduled';
    const box=document.getElementById('spSelectedOrders');if(!box)return;
    if(!list.length){box.innerHTML='<div class="sp-calendar-empty">No deliveries on this date.<button type="button" onclick="openNewFromCalendar()">Add an order</button></div>';return}
    box.innerHTML=list.map(o=>`<button class="sp-delivery-row" type="button" data-sp-order="${esc(o.id)}"><div class="sp-delivery-time"><b>${esc(timeLabel(o.deliveryDate)||'Time TBD')}</b><span>${esc(o.status||'New')}</span></div><div class="sp-delivery-main"><strong>${esc(o.orderNumber||'Order')} • ${esc(o.customerName||'Customer')}</strong><small>${esc(o.bouquetName||'Bouquet')}${o.deliveryAddress?` • ${esc(o.deliveryAddress)}`:''}</small></div><div class="sp-delivery-money ${due(o)>0?'due':'paid'}">${due(o)>0?`Due Rs. ${money(due(o))}`:'Paid'}</div></button>`).join('');
    box.querySelectorAll('[data-sp-order]').forEach(b=>b.addEventListener('click',()=>{
      const id=b.dataset.spOrder;
      if(typeof window.openOrder==='function')window.openOrder(id); else if(typeof window.openDetail==='function')window.openDetail(id);
    }));
  }

  function bindCalendarControls(root){
    root.querySelectorAll('[data-sp-prev-month]').forEach(b=>b.addEventListener('click',()=>{calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth()-1,1);renderCalendar()}));
    root.querySelectorAll('[data-sp-next-month]').forEach(b=>b.addEventListener('click',()=>{calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth()+1,1);renderCalendar()}));
    root.querySelectorAll('[data-sp-today]').forEach(b=>b.addEventListener('click',()=>{const n=new Date();calCursor=new Date(n.getFullYear(),n.getMonth(),1);selectedDate=localKey(n);renderCalendar()}));
    attachReminderButtons(root);
  }

  function brandDesktop(){
    const mark=document.querySelector('.brand-mark');
    if(mark&&!mark.querySelector('img')){mark.classList.add('sp-logo-mark');mark.innerHTML=`<img src="${LOGO}" alt="Serendib Petals">`;}
    const strong=document.querySelector('.brand strong'); if(strong) strong.textContent='Serendib Petals';
  }

  function setupDesktop(){
    if(!document.querySelector('.desktop-app')||!document.getElementById('dashboardView'))return false;
    brandDesktop();
    const nav=document.querySelector('.nav');
    if(nav&&!nav.querySelector('[data-view="calendar"]')){
      const btn=document.createElement('button');btn.className='nav-item';btn.dataset.view='calendar';btn.innerHTML='<span>▦</span> Delivery Calendar';btn.onclick=()=>window.switchView('calendar',btn);
      const today=nav.querySelector('[data-view="today"]'); today?.after(btn);
    }
    const workspace=document.querySelector('.workspace');
    if(workspace&&!document.getElementById('calendarView')){
      const sec=document.createElement('section');sec.id='calendarView';sec.className='sp-calendar-view hidden';sec.innerHTML=calendarShellHtml();
      workspace.appendChild(sec);bindCalendarControls(sec);
    }
    const body=document.querySelector('#dashboardView .dashboard-body');
    if(body&&!body.querySelector('.sp-dashboard-reminder')){
      const reminder=document.createElement('div');reminder.className='sp-dashboard-reminder sp-tomorrow-reminder';reminder.innerHTML=reminderSummaryHtml();
      const kpi=body.querySelector('.kpi-grid');kpi?.after(reminder);attachReminderButtons(reminder);
    }
    if(typeof window.switchView==='function'&&!window.switchView.__spWrapped){
      const original=window.switchView;
      const wrapped=function(view,button){
        const cal=document.getElementById('calendarView');
        if(view==='calendar'){
          document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view==='calendar'));
          document.getElementById('dashboardView')?.classList.add('hidden');
          document.getElementById('operationsView')?.classList.add('hidden');
          cal?.classList.remove('hidden');renderCalendar();return;
        }
        cal?.classList.add('hidden');return original(view,button);
      };wrapped.__spWrapped=true;window.switchView=wrapped;
    }
    if(typeof window.refreshDashboard==='function'&&!window.refreshDashboard.__spWrapped){
      const original=window.refreshDashboard;
      const wrapped=function(){const r=original.apply(this,arguments);updateReminderAreas();if(!document.getElementById('calendarView')?.classList.contains('hidden'))renderCalendar();return r};wrapped.__spWrapped=true;window.refreshDashboard=wrapped;
    }
    renderCalendar();updateReminderAreas();maybeNotifyTomorrow();
    return true;
  }

  function brandMobile(){
    const header=document.querySelector('#ordersPage .header>div:first-child');
    if(header&&!header.querySelector('.sp-mobile-brand')){
      const row=document.createElement('div');row.className='sp-mobile-brand';row.innerHTML=`<img src="${LOGO}" alt="Serendib Petals"><div><strong>Serendib Orders</strong><small>Cloud order manager</small></div>`;
      header.querySelector('h1')?.remove();header.querySelector('.subtitle')?.remove();header.prepend(row);
    }
  }

  function setupMobile(){
    if(!document.getElementById('ordersPage')||!document.querySelector('.tabs'))return false;
    brandMobile();
    const phone=document.querySelector('.phone');const tabs=document.querySelector('.tabs');
    if(phone&&!document.getElementById('calendarPage')){
      const sec=document.createElement('section');sec.id='calendarPage';sec.className='hidden';sec.innerHTML=`<div class="top"><div class="header"><div><h1>Delivery Calendar</h1><div class="subtitle">Plan tomorrow before it arrives</div></div><button class="plus" onclick="openNewFromCalendar()">+ Order</button></div></div><div class="analytics sp-mobile-calendar-wrap">${calendarShellHtml()}</div>`;
      phone.insertBefore(sec,tabs);bindCalendarControls(sec);
    }
    if(tabs&&!document.getElementById('tabCalendar')){
      const b=document.createElement('button');b.className='tab';b.id='tabCalendar';b.textContent='Calendar';b.onclick=()=>window.showPage('calendar');
      const today=document.getElementById('tabToday');today?.after(b);
    }
    const todayAnalytics=document.querySelector('#todayPage .analytics');
    if(todayAnalytics&&!todayAnalytics.querySelector('.sp-mobile-reminder-card')){
      const r=document.createElement('div');r.className='reportbox sp-mobile-reminder-card sp-tomorrow-reminder';r.innerHTML=reminderSummaryHtml();todayAnalytics.prepend(r);attachReminderButtons(r);
    }
    if(typeof window.showPage==='function'&&!window.showPage.__spWrapped){
      const original=window.showPage;
      const wrapped=function(page){
        const cal=document.getElementById('calendarPage');
        if(page==='calendar'){
          ['orders','today','analytics','team'].forEach(x=>document.getElementById(x+'Page')?.classList.add('hidden'));
          cal?.classList.remove('hidden');document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.id==='tabCalendar'));renderCalendar();return;
        }
        cal?.classList.add('hidden');return original(page);
      };wrapped.__spWrapped=true;window.showPage=wrapped;
    }
    if(typeof window.renderAll==='function'&&!window.renderAll.__spWrapped){
      const original=window.renderAll;
      const wrapped=function(){const r=original.apply(this,arguments);updateReminderAreas();if(!document.getElementById('calendarPage')?.classList.contains('hidden'))renderCalendar();return r};wrapped.__spWrapped=true;window.renderAll=wrapped;
    }
    renderCalendar();updateReminderAreas();maybeNotifyTomorrow();
    return true;
  }

  function init(){
    const desktop=setupDesktop();
    const mobile=setupMobile();
    if(!desktop&&!mobile)setTimeout(init,120);
    window.addEventListener('storage',()=>{updateReminderAreas();renderCalendar()});
    window.addEventListener('focus',()=>{updateReminderAreas();renderCalendar();maybeNotifyTomorrow()});
    setInterval(()=>{updateReminderAreas();if(document.visibilityState==='visible')renderCalendar()},60000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,30));else setTimeout(init,30);
})();
