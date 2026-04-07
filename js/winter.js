// ── WINTER.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

let WIN={locations:[],serviceTypes:[],locationServices:[],saltBins:[],filter:"",sortBy:"name",serviceFilter:""};

async function loadWinterData(){
  try{
    const[locs,types,ls,salt]=await Promise.all([
      sbF("GET","service_locations?has_winter_service=eq.true&is_archived=eq.false&order=client_name"),
      sbF("GET","service_types?season=eq.winter&is_active=eq.true&order=sort_order"),
      sbF("GET","location_services?select=*,service_types!inner(season)&service_types.season=eq.winter"),
      sbF("GET","salt_bins?select=*")
    ]);
    WIN.locations=locs||[];
    WIN.serviceTypes=types||[];
    WIN.locationServices=ls||[];
    WIN.saltBins=salt||[];
  }catch(e){console.error("Load winter data failed:",e);toast("Failed to load winter services","error");}
}

function buildWinterPage(){
  return`<div class="card"><div style="padding:20px;text-align:center;color:var(--fg-muted)">Loading…</div></div>`;
}

async function initWinterPage(){
  await loadWinterData();
  renderWinterPage();
}

function renderWinterPage(){
  const root=document.querySelector(".card");
  if(!root)return;
  let h=`<div class="si-header">
    <div><div class="si-title">Winter Services (De-icing & Snow Removal)</div></div>
    <div class="si-actions">
      <button class="si-action-btn" onclick="openAddWinterLocation()">+ Add Location</button>
      <button class="si-action-btn secondary" onclick="openManageWinterServiceTypes()">⚙ Service Types</button>
      <button class="si-action-btn secondary" onclick="window.print()">🖨 Print</button>
    </div>
  </div>
  <div class="si-filter-bar">
    <input type="text" class="si-filter-input" placeholder="Search location…" id="win-search" oninput="WIN.filter=this.value;filterAndSortWinter()">
    <select class="si-filter-select" id="win-sort" onchange="WIN.sortBy=this.value;filterAndSortWinter()">
      <option value="name">Sort: A–Z</option>
      <option value="city">Sort: by City</option>
      <option value="salt-low">Needs Restock</option>
    </select>
    <select class="si-filter-select" id="win-svc" onchange="WIN.serviceFilter=this.value;filterAndSortWinter()">
      <option value="">All Services</option>
      ${WIN.serviceTypes.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("")}
    </select>
  </div>
  <div style="padding:0 0 14px 0;overflow-x:auto;">`;

  let filtered=WIN.locations.filter(loc=>{
    if(WIN.filter&&!loc.client_name.toLowerCase().includes(WIN.filter.toLowerCase())&&!loc.address.toLowerCase().includes(WIN.filter.toLowerCase()))return false;
    if(WIN.serviceFilter){
      const hasService=WIN.locationServices.some(ls=>ls.location_id===loc.id&&ls.service_type_id===WIN.serviceFilter);
      if(!hasService)return false;
    }
    if(WIN.sortBy==="salt-low"){
      const salt=WIN.saltBins.find(s=>s.location_id===loc.id);
      if(!salt||salt.current_bags>salt.min_threshold)return false;
    }
    return true;
  });

  if(WIN.sortBy==="city")filtered.sort((a,b)=>a.city.localeCompare(b.city));
  else if(WIN.sortBy==="salt-low")filtered.sort((a,b)=>{
    const sa=WIN.saltBins.find(s=>s.location_id===a.id);
    const sb=WIN.saltBins.find(s=>s.location_id===b.id);
    return(sa?.current_bags||0)-(sb?.current_bags||0);
  });

  if(!filtered.length){
    h+=`<div style="padding:24px;"><div class="si-empty"><div class="si-empty-icon">❄️</div><div class="si-empty-text">No winter service locations</div><div class="si-empty-sub">Manage snow removal routes and salt bins</div></div></div>`;
  }else{
    h+=`<table class="win-table">
      <thead><tr>
        <th class="win-th">Client</th>
        <th class="win-th">Address</th>
        <th class="win-th">City</th>
        <th class="win-th">Services</th>
        <th class="win-th">Salt</th>
        <th class="win-th">Notes</th>
        <th class="win-th win-th-actions">Actions</th>
      </tr></thead><tbody>`;
    filtered.forEach(loc=>{
      const salt=WIN.saltBins.find(s=>s.location_id===loc.id);
      const isLow=salt&&salt.current_bags<=salt.min_threshold;
      const wServices=WIN.locationServices?WIN.locationServices.filter(ls=>ls.location_id===loc.id):[];
      h+=`<tr class="win-row">
        <td class="win-td win-td-client">${esc(loc.client_name)}</td>
        <td class="win-td" data-label="Address">${esc(loc.address)}</td>
        <td class="win-td" data-label="City">${esc(loc.city)}</td>
        <td class="win-td" data-label="Services"><div class="loc-services">${wServices.map(s=>{
          const type=WIN.serviceTypes.find(t=>t.id===s.service_type_id);
          const ci=WIN.serviceTypes.findIndex(t=>t.id===s.service_type_id)%8;
          return`<span class="service-badge svc-color-${ci}">${type?esc(type.name):"?"}</span>`;
        }).join("")}</div></td>
        <td class="win-td" data-label="Salt">${salt?`<div class="salt-inline">
          <button class="stock-btn" onclick="adjustWinterSalt('${loc.id}',-1)">−</button>
          <span class="salt-count">${salt.current_bags}</span>
          <span class="salt-threshold">/ ${salt.min_threshold}</span>
          <button class="stock-btn" onclick="adjustWinterSalt('${loc.id}',1)">+</button>
          ${isLow?`<span class="salt-indicator">LOW</span>`:""}
        </div>`:`<span style="color:var(--fg-muted)">—</span>`}</td>
        <td class="win-td win-td-notes" data-label="Notes">${esc(loc.notes||"")}</td>
        <td class="win-td card-actions">
          <button class="loc-action-btn" onclick="editWinterLocation('${loc.id}')">Edit</button>
          <button class="loc-action-btn delete" onclick="if(confirm('Delete this location?'))deleteWinterLocation('${loc.id}')">Delete</button>
        </td>
      </tr>`;
    });
    h+=`</tbody></table>`;
  }

  h+=`</div></div>`;
  root.innerHTML=h;
}

function filterAndSortWinter(){renderWinterPage();}

async function adjustWinterSalt(locId,delta){
  const salt=WIN.saltBins.find(s=>s.location_id===locId);
  if(!salt)return;
  const newCount=Math.max(0,salt.current_bags+delta);
  try{
    await sbF("PATCH",`salt_bins?id=eq.${salt.id}`,{current_bags:newCount,updated_at:new Date().toISOString()});
    salt.current_bags=newCount;
    renderWinterPage();
  }catch(e){toast("Failed to update salt count","error");console.error(e);}
}

function openAddWinterLocation(){
  let svcToggles=WIN.serviceTypes.map(t=>{
    return`<div style="background:var(--bg-deep);border-radius:8px;padding:10px 12px;margin-bottom:6px;">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
        <input type="checkbox" class="win-svc-toggle-add" data-type="${t.id}" style="accent-color:var(--accent);width:16px;height:16px;">
        ${esc(t.name)}
      </label>
      <div class="svc-detail" style="margin-top:6px;display:none;gap:8px;">
        <input type="text" class="si-form-input" data-wsnotes-add="${t.id}" placeholder="Notes for this service…" style="flex:1;padding:5px 8px;font-size:12px;">
      </div>
    </div>`;
  }).join("");
  const html=`<div style="flex-direction:column;">
    <h3 style="margin-bottom:14px;">Add Winter Service Location</h3>
    <div class="si-form-group">
      <label class="si-form-label">Client Name</label>
      <input type="text" class="si-form-input" id="win-name" placeholder="Client name">
    </div>
    <div class="si-form-group">
      <label class="si-form-label">Address</label>
      <input type="text" class="si-form-input" id="win-addr" placeholder="Street address">
    </div>
    <div class="si-form-group">
      <label class="si-form-label">City</label>
      <input type="text" class="si-form-input" id="win-city" placeholder="City">
    </div>
    <div class="si-form-group">
      <label class="si-form-label">Notes</label>
      <textarea class="si-form-textarea" id="win-notes" placeholder="Optional notes…"></textarea>
    </div>
    ${WIN.serviceTypes.length?`<div class="si-form-group">
      <button type="button" class="collapse-toggle" onclick="const el=document.getElementById('win-svc-toggles-add');const ic=document.getElementById('win-svc-caret');const hidden=el.style.display==='none';el.style.display=hidden?'block':'none';ic.textContent=hidden?'▾':'▸';">
        <span id="win-svc-caret">▸</span> Services <span class="collapse-hint">(click to expand)</span>
      </button>
      <div id="win-svc-toggles-add" style="display:none;margin-top:8px;">${svcToggles}</div>
    </div>`:""}
    <div class="si-modal-actions">
      <button class="modal-done" onclick="saveWinterLocation()">Save Location</button>
      <button class="modal-cancel" onclick="closeModal()">Cancel</button>
    </div>
  </div>`;
  openModal(html,"520px");
  setTimeout(()=>{
    document.querySelectorAll('.win-svc-toggle-add').forEach(cb=>{
      cb.addEventListener('change',()=>{
        const detail=cb.closest('div').querySelector('.svc-detail');
        if(detail)detail.style.display=cb.checked?'flex':'none';
      });
    });
  },50);
}

async function saveWinterLocation(){
  const name=(document.getElementById("win-name")?.value||"").trim();
  const addr=(document.getElementById("win-addr")?.value||"").trim();
  const city=(document.getElementById("win-city")?.value||"").trim();
  const notes=(document.getElementById("win-notes")?.value||"").trim();
  if(!name||!addr||!city){toast("Please fill in required fields","error");return;}
  try{
    const result=await sbF("POST","service_locations",{client_name:name,address:addr,city,notes,has_winter_service:true,has_summer_service:false,is_archived:false});
    const locId=result[0].id;
    await sbF("POST","salt_bins",{location_id:locId,current_bags:0,min_threshold:10});
    // Save service toggles
    const checkboxes=document.querySelectorAll('.win-svc-toggle-add');
    for(const cb of checkboxes){
      if(!cb.checked)continue;
      const typeId=cb.dataset.type;
      const notesEl=document.querySelector(`[data-wsnotes-add="${typeId}"]`);
      const svcNotes=notesEl?.value||'';
      await sbF("POST","location_services",{location_id:locId,service_type_id:typeId,notes:svcNotes,is_active:true});
    }
    toast("Location added");
    closeModal();
    await loadWinterData();
    renderWinterPage();
  }catch(e){toast("Failed to save location","error");console.error(e);}
}

function editWinterLocation(locId){
  const loc=WIN.locations.find(l=>l.id===locId);
  if(!loc)return;
  const locServices=WIN.locationServices.filter(ls=>ls.location_id===locId);
  const salt=WIN.saltBins.find(s=>s.location_id===locId);
  let svcToggles=WIN.serviceTypes.map(t=>{
    const ls=locServices.find(s=>s.service_type_id===t.id);
    const checked=!!ls;
    const sNotes=ls?.notes||'';
    return`<div style="background:var(--bg-deep);border-radius:8px;padding:10px 12px;margin-bottom:6px;">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
        <input type="checkbox" class="win-svc-toggle" data-type="${t.id}" ${checked?"checked":""} style="accent-color:var(--accent);width:16px;height:16px;">
        ${esc(t.name)}
      </label>
      <div class="svc-detail" style="margin-top:6px;display:${checked?"flex":"none"};gap:8px;">
        <input type="text" class="si-form-input" data-wsnotes="${t.id}" value="${esc(sNotes)}" placeholder="Notes for this service…" style="flex:1;padding:5px 8px;font-size:12px;">
      </div>
    </div>`;
  }).join("");
  const html=`<div style="flex-direction:column;">
    <h3 style="margin-bottom:14px;">Edit Winter Service Location</h3>
    <div class="si-form-group">
      <label class="si-form-label">Client Name</label>
      <input type="text" class="si-form-input" id="win-name" value="${esc(loc.client_name)}">
    </div>
    <div class="si-form-group">
      <label class="si-form-label">Address</label>
      <input type="text" class="si-form-input" id="win-addr" value="${esc(loc.address)}">
    </div>
    <div class="si-form-group">
      <label class="si-form-label">City</label>
      <input type="text" class="si-form-input" id="win-city" value="${esc(loc.city)}">
    </div>
    <div class="si-form-group">
      <label class="si-form-label">Notes</label>
      <textarea class="si-form-textarea" id="win-notes">${esc(loc.notes||"")}</textarea>
    </div>
    <div class="si-form-group">
      <label class="si-form-label">Services</label>
      <div id="win-svc-toggles">${svcToggles}</div>
    </div>
    <div class="si-form-group">
      <label class="si-form-label">Salt Bin</label>
      <div style="background:var(--bg-deep);border-radius:8px;padding:12px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <label style="font-size:13px;font-weight:600;">Min Threshold:</label>
          <input type="number" class="si-form-input" id="win-salt-min" value="${salt?.min_threshold||10}" min="0" style="width:70px;padding:5px 8px;font-size:12px;">
        </div>
        <div style="font-size:11px;color:var(--fg-muted);">Current bags: ${salt?.current_bags||0} (use +/- buttons on the card to adjust)</div>
      </div>
    </div>
    <div class="si-modal-actions">
      <button class="modal-done" onclick="updateWinterLocation('${locId}')">Update</button>
      <button class="modal-cancel" onclick="closeModal()">Cancel</button>
    </div>
  </div>`;
  openModal(html,"520px");
  setTimeout(()=>{
    document.querySelectorAll('.win-svc-toggle').forEach(cb=>{
      cb.addEventListener('change',()=>{
        const detail=cb.closest('div').querySelector('.svc-detail');
        if(detail)detail.style.display=cb.checked?'flex':'none';
      });
    });
  },50);
}

async function updateWinterLocation(locId){
  const name=(document.getElementById("win-name")?.value||"").trim();
  const addr=(document.getElementById("win-addr")?.value||"").trim();
  const city=(document.getElementById("win-city")?.value||"").trim();
  const notes=(document.getElementById("win-notes")?.value||"").trim();
  if(!name||!addr||!city){toast("Please fill in required fields","error");return;}
  try{
    await sbF("PATCH",`service_locations?id=eq.${locId}`,{client_name:name,address:addr,city,notes,updated_at:new Date().toISOString()});
    // Save service toggles
    const checkboxes=document.querySelectorAll('.win-svc-toggle');
    const existing=WIN.locationServices.filter(ls=>ls.location_id===locId);
    for(const cb of checkboxes){
      const typeId=cb.dataset.type;
      const wasActive=existing.some(ls=>ls.service_type_id===typeId);
      const notesEl=document.querySelector(`[data-wsnotes="${typeId}"]`);
      const svcNotes=notesEl?.value||'';
      if(cb.checked&&!wasActive){
        await sbF("POST","location_services",{location_id:locId,service_type_id:typeId,notes:svcNotes,is_active:true});
      }else if(cb.checked&&wasActive){
        await sbF("PATCH",`location_services?location_id=eq.${locId}&service_type_id=eq.${typeId}`,{notes:svcNotes,updated_at:new Date().toISOString()});
      }else if(!cb.checked&&wasActive){
        await sbF("DELETE",`location_services?location_id=eq.${locId}&service_type_id=eq.${typeId}`);
      }
    }
    // Update salt bin threshold
    const minEl=document.getElementById("win-salt-min");
    if(minEl){
      const newMin=parseInt(minEl.value)||5;
      const salt=WIN.saltBins.find(s=>s.location_id===locId);
      if(salt)await sbF("PATCH",`salt_bins?id=eq.${salt.id}`,{min_threshold:newMin,updated_at:new Date().toISOString()});
    }
    toast("Location updated");
    closeModal();
    await loadWinterData();
    renderWinterPage();
  }catch(e){toast("Failed to update location","error");console.error(e);}
}

async function deleteWinterLocation(locId){
  try{
    await sbF("DELETE",`service_locations?id=eq.${locId}`);
    toast("Location deleted");
    await loadWinterData();
    renderWinterPage();
  }catch(e){toast("Failed to delete location","error");console.error(e);}
}

function openManageWinterServiceTypes(){
  const html=`<div style="flex-direction:column;">
    <h3 style="margin-bottom:14px;">Winter Service Types</h3>
    <div id="win-types-list" style="margin-bottom:14px;">
      ${WIN.serviceTypes.map(t=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--bg-deep);border-radius:6px;margin-bottom:6px;">
        <span>${esc(t.name)}</span>
        <button class="loc-action-btn delete" onclick="deleteWinterServiceType('${t.id}')">Remove</button>
      </div>`).join("")}
    </div>
    <div style="border-top:1px solid var(--border);padding-top:14px;">
      <input type="text" class="si-form-input" id="new-win-type" placeholder="New service type…" style="margin-bottom:8px;">
      <button class="si-action-btn" onclick="addWinterServiceType()" style="width:100%;">Add Type</button>
    </div>
    <button class="modal-cancel" onclick="closeModal()" style="margin-top:14px;width:100%;">Done</button>
  </div>`;
  openModal(html,"480px");
}

async function addWinterServiceType(){
  const input=document.getElementById("new-win-type");
  const name=(input?.value||"").trim();
  if(!name){toast("Enter a service type name","error");return;}
  try{
    const maxSort=Math.max(...WIN.serviceTypes.map(t=>t.sort_order||0),0);
    await sbF("POST","service_types",{season:"winter",name,sort_order:maxSort+1,is_active:true});
    toast("Service type added");
    await loadWinterData();
    openManageWinterServiceTypes();
  }catch(e){toast("Failed to add type","error");console.error(e);}
}

async function deleteWinterServiceType(typeId){
  try{
    await sbF("PATCH",`service_types?id=eq.${typeId}`,{is_active:false});
    toast("Service type removed");
    await loadWinterData();
    openManageWinterServiceTypes();
  }catch(e){toast("Failed to remove type","error");console.error(e);}
}

// ─── INVENTORY ───────────────────────────────────────────────────────────────