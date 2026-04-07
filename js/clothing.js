// ── CLOTHING.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

const CLOTHING_TYPES=["T-Shirt","Long Sleeve","Crewneck Sweater","Hoodie","Coat","Toque","Cap","Windbreaker"];
const CLOTHING_SIZES=["XS","S","M","L","XL","2XL","3XL","One Size"];
let CL={items:[],filter:"all",sort:"employee",sortDir:"asc"};

async function loadClothingItems(){
  return sbF("GET","employee_clothing?select=*,employees(name)&order=date_given.desc");
}
async function saveClothingItem(data){return sbF("POST","employee_clothing",data);}
async function updateClothingItem(id,data){return sbF("PATCH","employee_clothing?id=eq."+id,data);}
async function deleteClothingItem(id){return sbF("DELETE","employee_clothing?id=eq."+id);}

function buildClothingPage(){
  return`<div class="card"><div class="cl-wrap" id="cl-root"><div style="text-align:center;padding:40px;color:var(--fg-subtle)">Loading clothing records…</div></div></div>`;
}

async function initClothingPage(){
  try{
    CL.items=await loadClothingItems()||[];
    renderClothingBoard();
  }catch(e){
    const root=document.getElementById("cl-root");
    if(root)root.innerHTML=`<div style="color:#dc2626;padding:20px">Failed to load: ${e.message}</div>`;
  }
}

function clSetFilter(f){CL.filter=f;renderClothingBoard();}

function clSort(col){
  if(CL.sort===col){CL.sortDir=CL.sortDir==="asc"?"desc":"asc";}
  else{CL.sort=col;CL.sortDir="asc";}
  renderClothingBoard();
}

function renderClothingBoard(){
  const root=document.getElementById("cl-root");
  if(!root)return;

  let items=[...CL.items];

  // Filter by item type
  if(CL.filter!=="all")items=items.filter(i=>i.item_type===CL.filter);

  // Sort
  items.sort((a,b)=>{
    let va,vb;
    if(CL.sort==="employee"){va=(a.employees?.name||"").toLowerCase();vb=(b.employees?.name||"").toLowerCase();}
    else if(CL.sort==="item_type"){va=a.item_type;vb=b.item_type;}
    else if(CL.sort==="size"){va=CLOTHING_SIZES.indexOf(a.size);vb=CLOTHING_SIZES.indexOf(b.size);}
    else if(CL.sort==="price"){va=+a.price||0;vb=+b.price||0;}
    else{va=a.date_given||"";vb=b.date_given||"";}
    if(va<vb)return CL.sortDir==="asc"?-1:1;
    if(va>vb)return CL.sortDir==="asc"?1:-1;
    return 0;
  });

  // Summary stats
  const totalItems=CL.items.length;
  const totalSpent=CL.items.reduce((s,i)=>s+(+i.price||0),0);
  const uniqueEmps=new Set(CL.items.map(i=>i.employee_id)).size;
  const arrow=col=>CL.sort===col?(CL.sortDir==="asc"?" ↑":" ↓"):"";

  // Filter buttons
  const types=["all",...CLOTHING_TYPES];
  const filterBtns=types.map(t=>`<button class="cl-filter-btn${CL.filter===t?" active":""}" onclick="clSetFilter('${esc(t)}')">${t==="all"?"All":t}</button>`).join("");

  // Group items by employee
  const grouped={};
  items.forEach(i=>{
    const eid=i.employee_id;
    if(!grouped[eid])grouped[eid]={name:i.employees?.name||"Unknown",items:[]};
    grouped[eid].items.push(i);
  });
  const empList=Object.entries(grouped).sort((a,b)=>a[1].name.localeCompare(b[1].name));

  // Build employee cards
  let cards="";
  empList.forEach(([eid,emp],idx)=>{
    const grpClass=idx%2===0?"cl-group-a":"cl-group-b";
    const empTotal=emp.items.reduce((s,i)=>s+(+i.price||0),0);
    let itemRows="";
    emp.items.forEach(i=>{
      const d=i.date_given?new Date(i.date_given+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—";
      itemRows+=`<tr class="${grpClass}">
        <td><span class="cl-item-badge">${esc(i.item_type)}</span></td>
        <td><span class="cl-size">${esc(i.size||"—")}</span></td>
        <td><span class="cl-price">$${(+i.price||0).toFixed(2)}</span></td>
        <td>${d}</td>
        <td style="font-size:12px;color:var(--fg-muted)">${esc(i.notes||"")}</td>
        <td><div class="cl-actions">
          <button class="cl-act-btn" onclick="clOpenEdit('${i.id}')">Edit</button>
          <button class="cl-act-btn del" onclick="clDelete('${i.id}')">Remove</button>
        </div></td>
      </tr>`;
    });
    cards+=`<tr class="cl-emp-header ${grpClass}">
      <td colspan="6">
        <span class="cl-emp-name">${esc(emp.name)}</span>
        <span class="cl-emp-count">${emp.items.length} item${emp.items.length!==1?"s":""} · $${empTotal.toFixed(2)}</span>
      </td>
    </tr>${itemRows}`;
  });

  root.innerHTML=`
    <div class="cl-header">
      <div class="cl-title">Employee Clothing <span>Track what's been given out</span></div>
      <button class="cl-add-btn" onclick="clOpenAdd()">+ Add Item</button>
    </div>
    <div class="cl-summary">
      <div class="cl-stat"><div class="cl-stat-val">${totalItems}</div><div class="cl-stat-lbl">Items Given</div></div>
      <div class="cl-stat"><div class="cl-stat-val">$${totalSpent.toFixed(2)}</div><div class="cl-stat-lbl">Total Spent</div></div>
      <div class="cl-stat"><div class="cl-stat-val">${uniqueEmps}</div><div class="cl-stat-lbl">Employees</div></div>
    </div>
    <div class="cl-filters">${filterBtns}</div>
    ${empList.length?`<div class="cl-table-wrap"><table class="cl-table">
      <thead><tr>
        <th>Item</th>
        <th>Size</th>
        <th>Price</th>
        <th>Date Given</th>
        <th>Notes</th>
        <th>Actions</th>
      </tr></thead>
      <tbody>${cards}</tbody>
    </table></div>`:`<div class="cl-empty"><div class="cl-empty-icon">👕</div>No clothing records yet${CL.filter!=="all"?" for this type":""}. Click "+ Add Item" to get started.</div>`}`;
}

function clOpenAdd(){clOpenForm(null);}
function clOpenEdit(id){clOpenForm(id);}

function clOpenForm(id){
  const item=id?CL.items.find(x=>x.id===id):null;
  const empOpts=S.employees.map(e=>`<option value="${e.id}"${item&&item.employee_id===e.id?" selected":""}>${esc(e.name)}</option>`).join("");
  const typeOpts=CLOTHING_TYPES.map(t=>`<option value="${t}"${item&&item.item_type===t?" selected":""}>${t}</option>`).join("");
  const sizeOpts=CLOTHING_SIZES.map(s=>`<option value="${s}"${item&&item.size===s?" selected":""}>${s}</option>`).join("");
  const today=localDateStr(new Date());

  const h=`
    <div class="modal-title">${item?"Edit Clothing Item":"Add Clothing Item"}</div>
    <div class="modal-sub">${item?"Update the details below.":"Record a clothing item given to an employee."}</div>
    <div class="cl-form-row">
      <div class="cl-form-label">Employee *</div>
      <select class="cl-select" id="cl_emp">${empOpts}</select>
    </div>
    <div class="cl-form-grid">
      <div class="cl-form-row">
        <div class="cl-form-label">Item Type *</div>
        <select class="cl-select" id="cl_type">${typeOpts}</select>
      </div>
      <div class="cl-form-row">
        <div class="cl-form-label">Size</div>
        <select class="cl-select" id="cl_size"><option value="">—</option>${sizeOpts}</select>
      </div>
    </div>
    <div class="cl-form-grid">
      <div class="cl-form-row">
        <div class="cl-form-label">Price ($)</div>
        <input class="cl-input" type="number" step="0.01" min="0" id="cl_price" placeholder="0.00" value="${item?((+item.price)||""):""}">
      </div>
      <div class="cl-form-row">
        <div class="cl-form-label">Date Given</div>
        <input class="cl-input" type="date" id="cl_date" value="${item?.date_given||today}">
      </div>
    </div>
    <div class="cl-form-row">
      <div class="cl-form-label">Notes <span style="opacity:.5;font-weight:400;text-transform:none">(optional)</span></div>
      <input class="cl-input" id="cl_notes" placeholder="Any extra details…" value="${esc(item?.notes||"")}">
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
      <button class="modal-cancel" onclick="closeModal()">Cancel</button>
      <button class="modal-done" onclick="clSaveForm('${id||""}')">${item?"Save Changes":"Add Item"}</button>
    </div>`;
  openModal(h,"480px");
}

async function clSaveForm(id){
  const emp=document.getElementById("cl_emp")?.value;
  const type=document.getElementById("cl_type")?.value;
  if(!emp){toast("Select an employee","error");return;}
  if(!type){toast("Select an item type","error");return;}
  const data={
    employee_id:emp,
    item_type:type,
    size:document.getElementById("cl_size")?.value||"",
    price:parseFloat(document.getElementById("cl_price")?.value)||0,
    date_given:document.getElementById("cl_date")?.value||localDateStr(new Date()),
    notes:document.getElementById("cl_notes")?.value.trim()||"",
  };
  try{
    if(id){
      const[updated]=await updateClothingItem(id,data);
      const idx=CL.items.findIndex(x=>x.id===id);
      if(idx>=0){
        const empObj=S.employees.find(e=>e.id===data.employee_id);
        CL.items[idx]={...CL.items[idx],...data,employees:{name:empObj?.name||"Unknown"}};
      }
    }else{
      const[created]=await saveClothingItem(data);
      const empObj=S.employees.find(e=>e.id===data.employee_id);
      created.employees={name:empObj?.name||"Unknown"};
      CL.items.unshift(created);
    }
    closeModal();renderClothingBoard();toast(id?"Item updated":"Item added");
  }catch(e){toast(e.message,"error");}
}

async function clDelete(id){
  if(!confirm("Remove this clothing record?"))return;
  try{
    await deleteClothingItem(id);
    CL.items=CL.items.filter(x=>x.id!==id);
    renderClothingBoard();toast("Item removed");
  }catch(e){toast(e.message,"error");}
}
