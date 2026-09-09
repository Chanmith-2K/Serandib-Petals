/* Serendib Petals Orders — Supabase cloud sync */
(function(){
  const PROJECT_URL = "https://gbxvextepfxhjutzwycg.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_kaIpO0KfwG4Pj0moa5i1kg_M1_WXj80";
  const ORDER_STORAGE_KEY = "serendib_orders_preview";
  const CLOUD_CONNECTED_KEY = "serendib_cloud_connected_once";
  const IS_TOP = window.top === window.self;
  let client = null;
  let member = null;
  let activeUserId = null;
  let realtimeChannel = null;
  let pullTimer = null;
  let overridesInstalled = false;
  let activating = false;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const num = v => Math.max(Number(v || 0), 0);
  const isUuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ""));
  const today = () => {
    const d = new Date(), off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0,10);
  };
  const toLocalDateTime = iso => {
    if(!iso) return "";
    const d = new Date(iso);
    if(Number.isNaN(d.getTime())) return String(iso).slice(0,16);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0,16);
  };
  const toDbDateTime = value => {
    if(!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };
  const localOrders = () => {
    try { return JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || "[]") || []; }
    catch { return []; }
  };
  const storeLocalOrders = orders => localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders || []));
  const localOrderTotal = o => num(o.amount) + num(o.deliveryFee);
  const localPaymentRows = o => {
    if(Array.isArray(o.payments)) return o.payments.filter(p => num(p.amount) > 0);
    const advance = num(o.advanceAmount);
    if(advance > 0) return [{ amount: advance, date: o.createdAt || new Date().toISOString(), note: "Advance" }];
    if(o.paymentStatus === "Paid" && localOrderTotal(o) > 0) return [{ amount: localOrderTotal(o), date: o.createdAt || new Date().toISOString(), note: "Paid" }];
    return [];
  };

  function dbOrderToLocal(row){
    return {
      id: row.id,
      orderNumber: row.order_number,
      orderDate: row.order_date || today(),
      customerName: row.buyer_name || "",
      phone: row.buyer_phone || "",
      recipientName: row.recipient_name || "",
      recipientPhone: row.recipient_phone || "",
      occasion: row.occasion || "Other",
      leadSource: row.lead_source || "Other",
      priority: row.priority || "Normal",
      bouquetName: row.bouquet_name || "",
      flowerDetails: row.flower_details || "",
      cardMessage: row.card_message || "",
      deliveryDate: toLocalDateTime(row.delivery_date),
      deliveryAddress: row.delivery_address || "",
      deliveryFee: num(row.delivery_fee),
      amount: num(row.bouquet_value),
      payments: (row.payments || []).slice().sort((a,b) => String(a.paid_at).localeCompare(String(b.paid_at))).map(p => ({
        id: p.id,
        amount: num(p.amount),
        date: p.paid_at,
        note: p.note || ""
      })),
      flowerCost: num(row.flower_cost),
      wrappingCost: num(row.wrapping_cost),
      deliveryCost: num(row.delivery_cost),
      otherCost: num(row.other_cost),
      status: row.status || "New",
      prepStatus: row.prep_status || "Pending",
      designStatus: row.design_status || "Pending",
      deliveryStatus: row.delivery_status || "Pending",
      notes: row.notes || "",
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || row.created_at || new Date().toISOString()
    };
  }

  function localOrderToDb(o, userId, includeId){
    const payload = {
      order_number: String(o.orderNumber || "").trim(),
      order_date: o.orderDate || String(o.createdAt || "").slice(0,10) || today(),
      buyer_name: String(o.customerName || "").trim() || "Customer",
      buyer_phone: String(o.phone || "").trim() || null,
      recipient_name: String(o.recipientName || "").trim() || null,
      recipient_phone: String(o.recipientPhone || "").trim() || null,
      occasion: o.occasion || null,
      lead_source: o.leadSource || null,
      priority: ["Normal","Urgent","Same Day"].includes(o.priority) ? o.priority : "Normal",
      bouquet_name: String(o.bouquetName || "").trim() || "Bouquet",
      flower_details: String(o.flowerDetails || "").trim() || null,
      card_message: String(o.cardMessage || "").trim() || null,
      delivery_date: toDbDateTime(o.deliveryDate),
      delivery_address: String(o.deliveryAddress || "").trim() || null,
      bouquet_value: num(o.amount),
      delivery_fee: num(o.deliveryFee),
      flower_cost: num(o.flowerCost),
      wrapping_cost: num(o.wrappingCost),
      delivery_cost: num(o.deliveryCost),
      other_cost: num(o.otherCost),
      status: ["New","Confirmed","Flowers Ready","Arranging","Wrapping","Ready","Out for Delivery","Delivered"].includes(o.status) ? o.status : "New",
      prep_status: ["Pending","In Progress","Done"].includes(o.prepStatus) ? o.prepStatus : "Pending",
      design_status: ["Pending","In Progress","Done"].includes(o.designStatus) ? o.designStatus : "Pending",
      delivery_status: ["Pending","Out for Delivery","Delivered"].includes(o.deliveryStatus) ? o.deliveryStatus : "Pending",
      notes: String(o.notes || "").trim() || null,
      updated_by: userId || null
    };
    if(includeId && isUuid(o.id)) payload.id = o.id;
    return payload;
  }

  function renderAfterCloudChange(){
    try { if(typeof renderAll === "function") renderAll(); }
    catch(e){}
    try { if(typeof renderOrders === "function") renderOrders(); }
    catch(e){}
    try { if(typeof refreshDashboard === "function") refreshDashboard(); }
    catch(e){}
    try {
      if(window.parent && window.parent !== window && typeof window.parent.refreshDashboard === "function") window.parent.refreshDashboard();
    } catch(e){}
  }

  function toast(message, isError){
    if(!IS_TOP) return;
    let el = document.getElementById("cloudToast");
    if(!el){ el = document.createElement("div"); el.id = "cloudToast"; el.className = "cloud-toast"; document.body.appendChild(el); }
    el.textContent = message;
    el.classList.toggle("error", !!isError);
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  function gate(){ return document.getElementById("spCloudGate"); }
  function gateMessage(message, type){
    const el = document.getElementById("spCloudMessage");
    if(!el) return;
    el.textContent = message || "";
    el.className = "cloud-msg" + (type ? " " + type : "");
  }
  function setGateBusy(busy){
    document.querySelectorAll("#spCloudGate button").forEach(b => b.disabled = !!busy);
  }

  function buildGate(){
    if(!IS_TOP || gate()) return;
    const el = document.createElement("div");
    el.id = "spCloudGate";
    el.className = "cloud-gate";
    el.innerHTML = `
      <div class="cloud-card">
        <div class="cloud-brand"><div class="cloud-logo">SP</div><div><strong>Serendib Petals</strong><span>Secure cloud order manager</span></div></div>
        <h1>Team sign in</h1>
        <p>Sign in to load the live Serendib Petals orders from the cloud. The same data will stay synced across the approved team devices.</p>
        <div class="cloud-field"><label>Email</label><input id="spCloudEmail" type="email" autocomplete="email" placeholder="you@example.com"></div>
        <div class="cloud-field"><label>Password</label><input id="spCloudPassword" type="password" autocomplete="current-password" placeholder="Your app password"></div>
        <div class="cloud-actions">
          <button class="cloud-btn primary" id="spCloudSignIn">Sign In</button>
          <button class="cloud-btn secondary" id="spCloudSignUp">Create Account</button>
        </div>
        <div id="spCloudMessage" class="cloud-msg">Only approved Serendib Petals team emails can access cloud orders.</div>
        <div class="cloud-note">First time? Tap <b>Create Account</b>. If Supabase asks you to confirm your email, open that email once, then return here and Sign In.</div>
      </div>`;
    document.body.appendChild(el);
    document.getElementById("spCloudSignIn").addEventListener("click", signIn);
    document.getElementById("spCloudSignUp").addEventListener("click", signUp);
    ["spCloudEmail","spCloudPassword"].forEach(id => document.getElementById(id).addEventListener("keydown", e => { if(e.key === "Enter") signIn(); }));
  }

  function showGate(message, type){
    if(!IS_TOP) return;
    buildGate();
    gate()?.classList.remove("hidden");
    if(message) gateMessage(message, type);
  }
  function hideGate(){ if(IS_TOP) gate()?.classList.add("hidden"); }

  async function signIn(){
    const email = document.getElementById("spCloudEmail")?.value.trim();
    const password = document.getElementById("spCloudPassword")?.value || "";
    if(!email || !password){ gateMessage("Enter your email and password.", "error"); return; }
    setGateBusy(true); gateMessage("Signing in…");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    setGateBusy(false);
    if(error){ gateMessage(error.message || "Could not sign in.", "error"); return; }
    if(data?.session) await activateSession(data.session, true);
  }

  async function signUp(){
    const email = document.getElementById("spCloudEmail")?.value.trim();
    const password = document.getElementById("spCloudPassword")?.value || "";
    if(!email || !password){ gateMessage("Enter an approved email and a password first.", "error"); return; }
    if(password.length < 8){ gateMessage("Use a password with at least 8 characters.", "error"); return; }
    setGateBusy(true); gateMessage("Creating your team account…");
    const { data, error } = await client.auth.signUp({ email, password });
    setGateBusy(false);
    if(error){ gateMessage(error.message || "Could not create account.", "error"); return; }
    if(data?.session){ await activateSession(data.session, true); return; }
    gateMessage("Account created. Check your email to confirm it, then return here and tap Sign In.", "ok");
  }

  async function ensureTeamMember(userId){
    const { data, error } = await client.from("team_members").select("user_id,full_name,role").eq("user_id", userId).maybeSingle();
    if(error) throw error;
    if(!data) throw new Error("This email is not approved for the Serendib Petals team.");
    return data;
  }

  async function pullCloud(silent){
    if(!client || !activeUserId) return [];
    const { data, error } = await client.from("orders").select("*,payments(id,amount,note,paid_at,created_by)").order("delivery_date", { ascending: true, nullsFirst: false });
    if(error){ if(!silent) toast("Cloud sync failed: " + error.message, true); throw error; }
    const orders = (data || []).map(dbOrderToLocal);
    storeLocalOrders(orders);
    renderAfterCloudChange();
    if(!silent) toast("Cloud data refreshed");
    return orders;
  }

  async function uploadMissingLocalOrders(snapshot){
    if(!snapshot?.length || !activeUserId) return 0;
    const { data: existing, error } = await client.from("orders").select("id,order_number");
    if(error) throw error;
    const existingNumbers = new Set((existing || []).map(r => String(r.order_number || "").trim()).filter(Boolean));
    let imported = 0;
    for(const o of snapshot){
      const orderNumber = String(o.orderNumber || "").trim();
      if(!orderNumber || existingNumbers.has(orderNumber)) continue;
      const payload = localOrderToDb(o, activeUserId, true);
      payload.created_by = activeUserId;
      let q = client.from("orders").insert(payload).select("id").single();
      let { data: created, error: insertError } = await q;
      if(insertError && isUuid(o.id)){
        const retry = localOrderToDb(o, activeUserId, false);
        retry.created_by = activeUserId;
        ({ data: created, error: insertError } = await client.from("orders").insert(retry).select("id").single());
      }
      if(insertError){ console.warn("Serendib cloud import skipped", orderNumber, insertError.message); continue; }
      const paymentPayload = localPaymentRows(o).map(p => {
        const row = { order_id: created.id, amount: num(p.amount), note: p.note || null, paid_at: toDbDateTime(p.date) || new Date().toISOString(), created_by: activeUserId };
        if(isUuid(p.id)) row.id = p.id;
        return row;
      });
      if(paymentPayload.length){
        let { error: pErr } = await client.from("payments").insert(paymentPayload);
        if(pErr){
          const withoutIds = paymentPayload.map(({id,...rest}) => rest);
          ({ error: pErr } = await client.from("payments").insert(withoutIds));
        }
        if(pErr) console.warn("Payment import issue", orderNumber, pErr.message);
      }
      existingNumbers.add(orderNumber);
      imported++;
    }
    return imported;
  }

  function schedulePull(){
    clearTimeout(pullTimer);
    pullTimer = setTimeout(() => pullCloud(true).catch(() => {}), 220);
  }

  function startRealtime(){
    if(realtimeChannel) client.removeChannel(realtimeChannel).catch?.(() => {});
    realtimeChannel = client.channel("serendib-orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, schedulePull)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, schedulePull)
      .subscribe(status => {
        if(status === "SUBSCRIBED") updateCloudIndicator();
      });
  }

  function updateCloudIndicator(){
    if(!member) return;
    const status = document.querySelector(".status-dot span");
    if(status) status.textContent = "Cloud connected • " + member.role;
    if(!IS_TOP) return;
    let chip = document.getElementById("cloudAccountChip");
    if(!chip){
      chip = document.createElement("div"); chip.id = "cloudAccountChip"; chip.className = "cloud-chip";
      chip.innerHTML = `<i></i><span></span><button type="button">Sign out</button>`;
      chip.querySelector("button").addEventListener("click", signOut);
      document.body.appendChild(chip);
    }
    chip.querySelector("span").textContent = `${member.full_name || "Team"} • ${member.role}`;
  }

  async function signOut(){
    try { await client.auth.signOut(); } catch(e){}
    activeUserId = null; member = null;
    if(realtimeChannel){ try { await client.removeChannel(realtimeChannel); } catch(e){} realtimeChannel = null; }
    if(localStorage.getItem(CLOUD_CONNECTED_KEY) === "1") storeLocalOrders([]);
    renderAfterCloudChange();
    document.getElementById("cloudAccountChip")?.remove();
    showGate("Signed out. Your cloud data is safe.", "ok");
  }

  function installMutationOverrides(){
    if(overridesInstalled || typeof window.formData !== "function") return;
    overridesInstalled = true;

    saveOrder = async function(){
      const name = document.getElementById("customerName")?.value.trim();
      const bouquet = document.getElementById("bouquetName")?.value.trim();
      if(!name || !bouquet){ alert("Please enter buyer name and bouquet name."); return; }
      try{
        const obj = formData();
        const payload = localOrderToDb(obj, activeUserId, false);
        let savedId = obj.id;
        if(editingId){
          const { error } = await client.from("orders").update(payload).eq("id", editingId);
          if(error) throw error;
          savedId = editingId;
        } else {
          const insertPayload = localOrderToDb(obj, activeUserId, true);
          insertPayload.created_by = activeUserId;
          const { data, error } = await client.from("orders").insert(insertPayload).select("id").single();
          if(error) throw error;
          savedId = data.id;
          const firstPayments = localPaymentRows(obj).map(p => ({
            order_id: savedId,
            amount: num(p.amount),
            note: p.note || "Advance",
            paid_at: toDbDateTime(p.date) || new Date().toISOString(),
            created_by: activeUserId
          }));
          if(firstPayments.length){ const { error: pe } = await client.from("payments").insert(firstPayments); if(pe) throw pe; }
        }
        await pullCloud(true);
        closeModal();
        toast(editingId ? "Order updated in cloud" : "Order saved to cloud");
      }catch(e){ alert("Could not save to cloud: " + (e.message || e)); }
    };

    addPayment = async function(){
      try{
        const amount = num(document.getElementById("newPaymentAmount")?.value);
        const note = document.getElementById("newPaymentNote")?.value.trim() || "";
        const o = localOrders().find(x => x.id === currentId);
        if(!o || amount <= 0){ alert("Enter a payment amount."); return; }
        const totalPaid = localPaymentRows(o).reduce((s,p) => s + num(p.amount), 0);
        const due = Math.max(localOrderTotal(o) - totalPaid, 0);
        if(due <= 0){ alert("This order is already fully paid."); return; }
        const pay = Math.min(amount, due);
        const { error } = await client.from("payments").insert({ order_id: currentId, amount: pay, note: note || null, created_by: activeUserId });
        if(error) throw error;
        document.getElementById("newPaymentAmount").value = "";
        document.getElementById("newPaymentNote").value = "";
        await pullCloud(true);
        openDetail(currentId);
        toast("Payment added to cloud");
      }catch(e){ alert("Could not add payment: " + (e.message || e)); }
    };

    removePayment = async function(pid){
      if(!confirm("Remove this payment record?")) return;
      try{
        const { error } = await client.from("payments").delete().eq("id", pid);
        if(error) throw error;
        await pullCloud(true);
        openDetail(currentId);
        toast("Payment removed");
      }catch(e){ alert("Could not remove payment: " + (e.message || e)); }
    };

    deleteCurrent = async function(){
      if(!confirm("Delete this order from the cloud? This cannot be undone.")) return;
      try{
        const { error } = await client.from("orders").delete().eq("id", currentId);
        if(error) throw error;
        closeDetail();
        await pullCloud(true);
        toast("Order deleted from cloud");
      }catch(e){ alert("Could not delete order. Admin access may be required.\n\n" + (e.message || e)); }
    };

    restoreBackup = function(event){
      const file = event.target.files?.[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try{
          const parsed = JSON.parse(reader.result);
          const orders = Array.isArray(parsed) ? parsed : parsed.orders;
          if(!Array.isArray(orders)) throw new Error("Invalid backup");
          if(!confirm(`Import ${orders.length} backup orders into the cloud? Existing cloud order numbers will not be overwritten.`)) return;
          const count = await uploadMissingLocalOrders(orders);
          await pullCloud(true);
          alert(`${count} missing order(s) imported to the cloud.`);
        }catch(e){ alert("Backup import failed: " + (e.message || e)); }
        finally { event.target.value = ""; }
      };
      reader.readAsText(file);
    };
  }

  async function activateSession(session, fromLogin){
    if(!session?.user?.id || activating) return;
    if(activeUserId === session.user.id && member) return;
    activating = true;
    const snapshot = localOrders();
    try{
      const teamMember = await ensureTeamMember(session.user.id);
      activeUserId = session.user.id;
      member = teamMember;
      hideGate();
      const imported = await uploadMissingLocalOrders(snapshot);
      await pullCloud(true);
      installMutationOverrides();
      startRealtime();
      updateCloudIndicator();
      localStorage.setItem(CLOUD_CONNECTED_KEY, "1");
      if(imported > 0) toast(`${imported} existing order(s) moved to cloud`);
      else if(fromLogin) toast("Cloud connected");
      if(IS_TOP){
        const frame = document.getElementById("operationsFrame");
        if(frame && !String(frame.src).includes("cloudsession=")){
          frame.src = "v7.html?v=10&cloudsession=" + Date.now();
        }
      }
    }catch(e){
      activeUserId = null; member = null;
      try { await client.auth.signOut(); } catch(_){}
      showGate(e.message || "This account cannot access Serendib Petals orders.", "error");
    }finally{ activating = false; }
  }

  async function boot(){
    for(let i=0;i<80 && !(window.supabase && typeof window.supabase.createClient === "function");i++) await sleep(50);
    if(!(window.supabase && typeof window.supabase.createClient === "function")){
      showGate("Could not load the secure cloud client. Check your internet connection and refresh.", "error");
      return;
    }
    client = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    window.SerendibCloud = {
      pull: () => pullCloud(false),
      signOut,
      get client(){ return client; },
      get member(){ return member; },
      get connected(){ return !!activeUserId; }
    };

    client.auth.onAuthStateChange((event, session) => {
      if(session?.user?.id) setTimeout(() => activateSession(session, event === "SIGNED_IN"), 0);
      else if(event === "SIGNED_OUT") showGate("Sign in to continue.");
    });

    const { data } = await client.auth.getSession();
    if(data?.session) await activateSession(data.session, false);
    else showGate();
  }

  boot();
})();
