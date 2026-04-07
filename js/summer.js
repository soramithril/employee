// ── SUMMER.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

let SUM={locations:[],serviceTypes:[],locationServices:[],filter:"",sortBy:"name",serviceFilter:""};

async function loadSummerData(){
  try{
    const[locs,types,ls]=await Promise.all([
      sbF("GET","service_locations?has_summer_service=eq.true&is_archived=eq.false&order=client_name"),
      sbF("GET","service_types?season=eq.summer&is_active=eq.true&order=sort_order"),
      sbF("GET","location_services?select=*,service_types!inner(season)&service_types.season=eq.summer")
    ]);
    SUM.locations=locs||[];
    SUM.serviceTypes=types||[];
    SUM.locationServices=ls||[];
  }catch(e){console.error("Load summer data failed:",e);toast("Failed to load summer services","error");}
}

function buildSummerPage(){
  return`<div class="card"><div style="padding:20px;text-align:center;color:var(--fg-muted)">Loading…</div></div>`;
}

async function initSummerPage(){
  await loadSummerData();
  renderSummerPage();
}

function renderSummerPage(){
  const root=document.querySelector(".card");
  if(!root)return;
  const DAY_ORDER=["Monday","Tuesday","Wednesday","Thursday","Friday",""];
  let h=`<div class="si-header">
    <div><div class="si-title">Summer Services (Landscaping)</div></div>
    <div class="si-actions">
      <button class="si-action-btn" onclick="openAddSummerLocation()">+ Add Location</button>
      <button class="si-action-btn secondary" onclick="openManageSummerServiceTypes()">⚙ Service Types</button>
      <button class="si-action-btn secondary" onclick="window.print()">🖨 Print</button>
    </div>
  </div>
  <div class="si-filter-bar">
    <input type="text" class="si-filter-input" placeholder="Search location…" id="sum-search" oninput="SUM.filter=this.value;filterAndSortSummer()">
    <select class="si-filter-select" id="sum-sort" onchange="SUM.sortBy=this.value;filterAndSortSummer()">
      <option value="name">Sort: A–Z</option>
      <option value="city">Sort: by City</option>
      <option value="day">Sort: by Day</option>
      <option value="services">Sort: by # Services</option>
    </select>
    <select class="si-filter-select" id="sum-svc" onchange="SUM.serviceFilter=this.value;filterAndSortSummer()">
      <option value="">All Services</option>
      ${SUM.serviceTypes.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("")}
    </select>
    <select class="si-filter-select" id="sum-day-filter" onchange="SUM.dayFilter=this.value;filterAndSortSummer()">
      <option value="">All Days</option>
      <option value="Monday">Monday</option>
      <option value="Tuesday">Tuesday</option>
      <option value="Wednesday">Wednesday</option>
      <option value="Thursday">Thursday</option>
      <option value="Friday">Friday</option>
    </select>
  </div>
  <div style="padding:0 0 14px 0;overflow-x:auto;">`;

  let filtered=SUM.locations.filter(loc=>{
    if(SUM.filter&&!loc.client_name.toLowerCase().includes(SUM.filter.toLowerCase())&&!loc.address.toLowerCase().includes(SUM.filter.toLowerCase()))return false;
    if(SUM.serviceFilter){
      const hasService=SUM.locationServices.some(ls=>ls.location_id===loc.id&&ls.service_type_id===SUM.serviceFilter);
      if(!hasService)return false;
    }
    if(SUM.dayFilter&&(loc.service_day||"")!==SUM.dayFilter)return false;
    return true;
  });

  if(SUM.sortBy==="city")filtered.sort((a,b)=>a.city.localeCompare(b.city));
  else if(SUM.sortBy==="day")filtered.sort((a,b)=>DAY_ORDER.indexOf(a.service_day||"")-DAY_ORDER.indexOf(b.service_day||""));
  else if(SUM.sortBy==="services")filtered.sort((a,b)=>{
    const countA=SUM.locationServices.filter(ls=>ls.location_id===a.id).length;
    const countB=SUM.locationServices.filter(ls=>ls.location_id===b.id).length;
    return countB-countA;
  });

  if(!filtered.length){
    h+=`<div style="padding:24px;"><div class="si-empty"><div class="si-empty-icon">🌱</div><div class="si-empty-text">No summer service locations</div><div class="si-empty-sub">Track landscaping clients and service schedules</div></div></div>`;
  }else{
    h+=`<table class="sum-table">
      <thead><tr>
        <th class="sum-th">Day</th>
        <th class="sum-th">Client</th>
        <th class="sum-th">Address</th>
        <th class="sum-th">City</th>
        <th class="sum-th">Services</th>
        <th class="sum-th">Notes</th>
        <th class="sum-th sum-th-actions">Actions</th>
      </tr></thead><tbody>`;
    filtered.forEach(loc=>{
      const services=SUM.locationServices.filter(ls=>ls.location_id===loc.id);
      const dayShort=(loc.service_day||"—").substring(0,3);
      const dayFull=loc.service_day||"—";
      const dayClass=loc.service_day?`sum-day-${loc.service_day.toLowerCase()}`:"sum-day-none";
      h+=`<tr class="sum-row">
        <td class="sum-td" data-label="Day"><span class="sum-day-badge ${dayClass}">${esc(dayShort)}</span></td>
        <td class="sum-td sum-td-client">${esc(loc.client_name)}</td>
        <td class="sum-td" data-label="Address">${esc(loc.address)}</td>
        <td class="sum-td" data-label="City">${esc(loc.city)}</td>
        <td class="sum-td" data-label="Services"><div class="loc-services">${services.map(s=>{
          const type=SUM.serviceTypes.find(t=>t.id===s.service_type_id);
          const ci=SUM.serviceTypes.findIndex(t=>t.id===s.service_type_id)%8;
          const freq=s.frequency?` · ${esc(s.frequency)}`:"";
          return`<span class="service-badge svc-color-${ci}">${type?esc(type.name):"?"}${freq}</span>`;
        }).join("")}</div></td>
        <td class="sum-td sum-td-notes" data-label="Notes">${esc(loc.notes||"")}</td>
        <td class="sum-td card-actions">
          <button class="loc-action-btn" onclick="editSummerLocation('${loc.id}')">Edit</button>
          <button class="loc-action-btn delete" onclick="if(confirm('Delete this location?'))deleteSummerLocation('${loc.id}')">Delete</button>
        </td>
      </tr>`;
    });
    h+=`</tbody></table>`;
  }

  // Weekly calendar view
  const DAYS_WEEK=["Monday","Tuesday","Wednesday","Thursday","Friday"];
  h+=`<div class="sum-cal-wrap">
    <div class="sum-cal-header">
      <h3 class="sum-cal-title">Weekly Schedule</h3>
      <span class="sum-cal-sub">Locations grouped by service day</span>
    </div>
    <div class="sum-cal-grid">`;
  DAYS_WEEK.forEach(day=>{
    const dayLocs=SUM.locations.filter(l=>l.service_day===day);
    const dayClass=`sum-cal-col sum-day-${day.toLowerCase()}`;
    h+=`<div class="${dayClass}">
      <div class="sum-cal-day-header">${day}<span class="sum-cal-count">${dayLocs.length}</span></div>
      <div class="sum-cal-day-body">`;
    if(!dayLocs.length){
      h+=`<div class="sum-cal-empty">No sites</div>`;
    }else{
      dayLocs.forEach(loc=>{
        const services=SUM.locationServices.filter(ls=>ls.location_id===loc.id);
        h+=`<div class="sum-cal-item" onclick="editSummerLocation('${loc.id}')">
          <div class="sum-cal-item-name">${esc(loc.client_name)}</div>
          <div class="sum-cal-item-addr">${esc(loc.address)}</div>
          ${services.length?`<div class="sum-cal-item-svcs">${services.slice(0,3).map(s=>{
            const type=SUM.serviceTypes.find(t=>t.id===s.service_type_id);
            const ci=SUM.serviceTypes.findIndex(t=>t.id===s.service_type_id)%8;
            return`<span class="service-badge svc-color-${ci}" style="padding:2px 6px;font-size:10px;">${type?esc(type.name):"?"}</span>`;
          }).join("")}${services.length>3?`<span class="sum-cal-more">+${services.length-3}</span>`:""}</div>`:""}
        </div>`;
      });
    }
    h+=`</div></div>`;
  });
  h+=`</div></div>`;

  h+=`</div></div>`;
  root.innerHTML=h;
}

function filterAndSortSummer(){renderSummerPage();}

function openAddSummerLocation(){
  let svcToggles=SUM.serviceTypes.map(t=>{
    return`<div style="background:var(--bg-deep);border-radius:8px;padding:10px 12px;margin-bottom:6px;">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
        <input type="checkbox" class="sum-svc-toggle-add" data-type="${t.id}" style="accent-color:var(--accent);width:16px;height:16px;">
        ${esc(t.name)}
      </label>
      <div class="svc-detail" style="margin-top:6px;display:none;gap:8px;flex-wrap:wrap;">
        <select class="si-form-input" data-freq-add="${t.id}" style="flex:1;min-width:120px;padding:5px 8px;font-size:12px;">
          <option value="">Frequency…</option>
          <option value="Weekly">Weekly</option>
          <option value="Bi-weekly">Bi-weekly</option>
          <option value="Monthly">Monthly</option>
          <option value="One-time">One-time</option>
          <option value="As needed">As needed</option>
        </select>
        <input type="text" class="si-form-input" data-snotes-add="${t.id}" placeholder="Notes for this service…" style="flex:2;min-width:140px;padding:5px 8px;font-size:12px;">
      </div>
    </div>`;
  }).join("");
  const html=`<div style="flex-direction:column;margin-top:0;">
    <h3 style="margin-bottom:14px;">Add Summer Service Location</h3>
    <div class="si-form-group">
      <label class="si-form-label">Client Name</label>
      <input type="text" class="si-form-input" id="sum-name" placeholder="Client name">
    </div>
    <div class="si-form-group">
      <label class="si-form-label">Address</label>
      <input type="text" class="si-form-input" id="sum-addr" placeholder="Street address">
    </div>
    <div class="si-form-group">
      <label class="si-form-label">City</label>
      <input type="text" class="si-form-input" id="sum-city" placeholder="City">
    </div>
    <div class="si-form-group">
      <label class="si-form-label">Service Day</label>
      <select class="si-form-input" id="sum-day">
        <option value="">Select day…</option>
        <option value="Monday">Monday</option>
        <option value="Tuesday">Tuesday</option>
        <option value="Wednesday">Wednesday</option>
        <option value="Thursday">Thursday</option>
        <option value="Friday">Friday</option>
      </select>
    </div>
    <div class="si-form-group">
      <label class="si-form-label">Notes</label>
      <textarea class="si-form-textarea" id="sum-notes" placeholder="Optional notes…"></textarea>
    </div>
    ${SUM.serviceTypes.length?`<div class="si-form-group">
      <button type="button" class="collapse-toggle" onclick="const el=document.getElementById('sum-svc-toggles-add');const ic=document.getElementById('sum-svc-caret');const hidden=el.style.display==='none';el.style.display=hidden?'block':'none';ic.textContent=hidden?'▾':'▸';">
        <span id="sum-svc-caret">▸</span> Services <span class="collapse-hint">(click to expand)</span>
      </button>
      <div id="sum-svc-toggles-add" style="display:none;margin-top:8px;">${svcToggles}</div>
    </div>`:""}
    <div class="si-modal-actions">
      <button class="modal-done" onclick="saveSummerLocation()">Save Location</button>
      <button class="modal-cancel" onclick="closeModal()">Cancel</button>
    </div>
  </div>`;
  openModal(html,"520px");
  setTimeout(()=>{
    document.querySelectorAll('.sum-svc-toggle-add').forEach(cb=>{
      cb.addEventListener('change',()=>{
        const detail=cb.closest('div').querySelector('.svc-detail');
        if(detail)detail.style.display=cb.checked?'flex':'none';
      });
    });
  },50);
}

async function saveSummerLocation(){
  const name=(document.getElementById("sum-name")?.value||"").trim();
  const addr=(document.getElementById("sum-addr")?.value||"").trim();
  const city=(document.getElementById("sum-city")?.value||"").trim();
  const day=(document.getElementById("sum-day")?.value||"");
  const notes=(document.getElementById("sum-notes")?.value||"").trim();
  if(!name||!addr||!city){toast("Please fill in required fields","error");return;}
  try{
    const result=await sbF("POST","service_locations",{client_name:name,address:addr,city,notes,service_day:day,has_summer_service:true,has_winter_service:false,is_archived:false});
    // Save service toggles if any were selected
    const checkboxes=document.querySelectorAll('.sum-svc-toggle-add');
    if(result&&result.length>0){
      const locId=result[0].id;
      for(const cb of checkboxes){
        if(!cb.checked)continue;
        const typeId=cb.dataset.type;
        const freqEl=document.querySelector(`[data-freq-add="${typeId}"]`);
        const notesEl=document.querySelector(`[data-snotes-add="${typeId}"]`);
        const freq=freqEl?.value||'';
        const svcNotes=notesEl?.value||'';
        await sbF("POST","location_services",{location_id:locId,service_type_id:typeId,frequency:freq,notes:svcNotes,is_active:true});
      }
    }
    toast("Location added");
    closeModal();
    await loadSummerData();
    renderSummerPage();
  }catch(e){toast("Failed to save location","error");console.error(e);}
}

function editSummerLocation(locId){
  const loc=SUM.locations.find(l=>l.id===locId);
  if(!loc)return;
  const locServices=SUM.locationServices.filter(ls=>ls.location_id===locId);
  let svcToggles=SUM.serviceTypes.map(t=>{
    const ls=locServices.find(s=>s.service_type_id===t.id);
    const checked=!!ls;
    const freq=ls?.frequency||'';
    const sNotes=ls?.notes||'';
    return`<div style="background:var(--bg-deep);border-radius:8px;padding:10px 12px;margin-bottom:6px;">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
        <input type="checkbox" class="sum-svc-toggle" data-type="${t.id}" ${checked?"checked":""} style="accent-color:var(--accent);width:16px;height:16px;">
        ${esc(t.name)}
      </label>
      <div class="svc-detail" style="margin-top:6px;display:${checked?"flex":"none"};gap:8px;flex-wrap:wrap;">
        <select class="si-form-input" data-freq="${t.id}" style="flex:1;min-width:120px;padding:5px 8px;font-size:12px;">
          <option value=""${!freq?" selected":""}>Frequency…</option>
          <option value="Weekly"${freq==="Weekly"?" selected":""}>Weekly</option>
          <option value="Bi-weekly"${freq==="Bi-weekly"?" selected":""}>Bi-weekly</option>
          <option value="Monthly"${freq==="Monthly"?" selected":""}>Monthly</option>
          <option value="One-time"${freq==="One-time"?" selected":""}>One-time</option>
          <option value="As needed"${freq==="As needed"?" selected":""}>As needed</option>
        </select>
        <input type="text" class="si-form-input" data-snotes="${t.id}" value="${esc(sNotes)}" placeholder="Notes for this service…" style="flex:2;min-width:140px;padding:5px 8px;font-size:12px;">
      </div>
    </div>`;
  }).join("");
  const html=`<div style="flex-direction:column;">
    <h3 style="margin-bottom:14px;">Edit Summer Service Location</h3>
    <div class="si-form-group">
      <label class="si-form-label">Client Name</label>
      <input type="text" class="si-form-input" id="sum-name" value="${esc(loc.client_name)}">
    </div>
    <div class="si-form-group">
      <label class="si-form-label">Address</label>
      <input type="text" class="si-form-input" id="sum-addr" value="${esc(loc.address)}">
    </div>
    <div class="si-form-group">
      <label class="si-form-label">City</label>
      <input type="text" class="si-form-input" id="sum-city" value="${esc(loc.city)}">
    </div>
    <div class="si-form-group">
      <label class="si-form-label">Service Day</label>
      <select class="si-form-input" id="sum-day">
        <option value=""${!loc.service_day?" selected":""}>Select day…</option>
        <option value="Monday"${loc.service_day==="Monday"?" selected":""}>Monday</option>
        <option value="Tuesday"${loc.service_day==="Tuesday"?" selected":""}>Tuesday</option>
        <option value="Wednesday"${loc.service_day==="Wednesday"?" selected":""}>Wednesday</option>
        <option value="Thursday"${loc.service_day==="Thursday"?" selected":""}>Thursday</option>
        <option value="Friday"${loc.service_day==="Friday"?" selected":""}>Friday</option>
      </select>
    </div>
    <div class="si-form-group">
      <label class="si-form-label">Notes</label>
      <textarea class="si-form-textarea" id="sum-notes">${esc(loc.notes||"")}</textarea>
    </div>
    <div class="si-form-group">
      <label class="si-form-label">Services</label>
      <div id="sum-svc-toggles">${svcToggles}</div>
    </div>
    <div class="si-modal-actions">
      <button class="modal-done" onclick="updateSummerLocation('${locId}')">Update</button>
      <button class="modal-cancel" onclick="closeModal()">Cancel</button>
    </div>
  </div>`;
  openModal(html,"520px");
  // Wire up checkbox show/hide for detail rows
  setTimeout(()=>{
    document.querySelectorAll('.sum-svc-toggle').forEach(cb=>{
      cb.addEventListener('change',()=>{
        const detail=cb.closest('div').querySelector('.svc-detail');
        if(detail)detail.style.display=cb.checked?'flex':'none';
      });
    });
  },50);
}

async function updateSummerLocation(locId){
  const name=(document.getElementById("sum-name")?.value||"").trim();
  const addr=(document.getElementById("sum-addr")?.value||"").trim();
  const city=(document.getElementById("sum-city")?.value||"").trim();
  const day=(document.getElementById("sum-day")?.value||"");
  const notes=(document.getElementById("sum-notes")?.value||"").trim();
  if(!name||!addr||!city){toast("Please fill in required fields","error");return;}
  try{
    await sbF("PATCH",`service_locations?id=eq.${locId}`,{client_name:name,address:addr,city,notes,service_day:day,updated_at:new Date().toISOString()});
    // Save service toggles
    const checkboxes=document.querySelectorAll('.sum-svc-toggle');
    const existing=SUM.locationServices.filter(ls=>ls.location_id===locId);
    for(const cb of checkboxes){
      const typeId=cb.dataset.type;
      const wasActive=existing.some(ls=>ls.service_type_id===typeId);
      const freqEl=document.querySelector(`[data-freq="${typeId}"]`);
      const notesEl=document.querySelector(`[data-snotes="${typeId}"]`);
      const freq=freqEl?.value||'';
      const svcNotes=notesEl?.value||'';
      if(cb.checked&&!wasActive){
        await sbF("POST","location_services",{location_id:locId,service_type_id:typeId,frequency:freq,notes:svcNotes,is_active:true});
      }else if(cb.checked&&wasActive){
        await sbF("PATCH",`location_services?location_id=eq.${locId}&service_type_id=eq.${typeId}`,{frequency:freq,notes:svcNotes,updated_at:new Date().toISOString()});
      }else if(!cb.checked&&wasActive){
        await sbF("DELETE",`location_services?location_id=eq.${locId}&service_type_id=eq.${typeId}`);
      }
    }
    toast("Location updated");
    closeModal();
    await loadSummerData();
    renderSummerPage();
  }catch(e){toast("Failed to update location","error");console.error(e);}
}

async function deleteSummerLocation(locId){
  try{
    await sbF("DELETE",`service_locations?id=eq.${locId}`);
    toast("Location deleted");
    await loadSummerData();
    renderSummerPage();
  }catch(e){toast("Failed to delete location","error");console.error(e);}
}

function openManageSummerServiceTypes(){
  const html=`<div style="flex-direction:column;">
    <h3 style="margin-bottom:14px;">Summer Service Types</h3>
    <div id="sum-types-list" style="margin-bottom:14px;">
      ${SUM.serviceTypes.map(t=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--bg-deep);border-radius:6px;margin-bottom:6px;">
        <span>${esc(t.name)}</span>
        <button class="loc-action-btn delete" onclick="deleteSummerServiceType('${t.id}')">Remove</button>
      </div>`).join("")}
    </div>
    <div style="border-top:1px solid var(--border);padding-top:14px;">
      <input type="text" class="si-form-input" id="new-sum-type" placeholder="New service type…" style="margin-bottom:8px;">
      <button class="si-action-btn" onclick="addSummerServiceType()" style="width:100%;">Add Type</button>
    </div>
    <button class="modal-cancel" onclick="closeModal()" style="margin-top:14px;width:100%;">Done</button>
  </div>`;
  openModal(html,"480px");
}

async function addSummerServiceType(){
  const input=document.getElementById("new-sum-type");
  const name=(input?.value||"").trim();
  if(!name){toast("Enter a service type name","error");return;}
  try{
    const maxSort=Math.max(...SUM.serviceTypes.map(t=>t.sort_order||0),0);
    await sbF("POST","service_types",{season:"summer",name,sort_order:maxSort+1,is_active:true});
    toast("Service type added");
    await loadSummerData();
    openManageSummerServiceTypes();
  }catch(e){toast("Failed to add type","error");console.error(e);}
}

async function deleteSummerServiceType(typeId){
  try{
    await sbF("PATCH",`service_types?id=eq.${typeId}`,{is_active:false});
    toast("Service type removed");
    await loadSummerData();
    openManageSummerServiceTypes();
  }catch(e){toast("Failed to remove type","error");console.error(e);}
}

// ─── WINTER SERVICES ───────────────────────────────────────────────────────