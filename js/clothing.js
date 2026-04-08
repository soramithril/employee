// ── CLOTHING.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

const CLOTHING_TYPES=["T-Shirt","Long Sleeve","Crewneck Sweater","Hoodie","Coat","Toque","Cap","Windbreaker"];
const CLOTHING_SIZES=["XS","S","M","L","XL","2XL","3XL","One Size"];
const CLOTHING_COMPANIES=["Jeffs Junk","Jeff White Group"];
const BADGE_CLASS={"T-Shirt":"cl-badge-tshirt","Long Sleeve":"cl-badge-longsleeve","Crewneck Sweater":"cl-badge-crewneck","Hoodie":"cl-badge-hoodie","Coat":"cl-badge-coat","Toque":"cl-badge-toque","Cap":"cl-badge-cap","Windbreaker":"cl-badge-windbreaker"};
let CL={items:[],filter:"all",sort:"employee",sortDir:"asc",period:"all",company:"all"};

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
function clSetPeriod(p){CL.period=p;renderClothingBoard();}
function clSetCompany(c){CL.company=c;renderClothingBoard();}

function clSort(col){
  if(CL.sort===col){CL.sortDir=CL.sortDir==="asc"?"desc":"asc";}
  else{CL.sort=col;CL.sortDir="asc";}
  renderClothingBoard();
}

function clGetPeriodRange(period){
  const now=new Date();
  const y=now.getFullYear();
  const m=now.getMonth();
  if(period==="q1")return{start:`${y}-01-01`,end:`${y}-03-31`,label:"Q1 "+y};
  if(period==="q2")return{start:`${y}-04-01`,end:`${y}-06-30`,label:"Q2 "+y};
  if(period==="q3")return{start:`${y}-07-01`,end:`${y}-09-30`,label:"Q3 "+y};
  if(period==="q4")return{start:`${y}-10-01`,end:`${y}-12-31`,label:"Q4 "+y};
  if(period==="h1")return{start:`${y}-01-01`,end:`${y}-06-30`,label:"H1 "+y};
  if(period==="h2")return{start:`${y}-07-01`,end:`${y}-12-31`,label:"H2 "+y};
  if(period==="year")return{start:`${y}-01-01`,end:`${y}-12-31`,label:""+y};
  if(period==="last-year"){const ly=y-1;return{start:`${ly}-01-01`,end:`${ly}-12-31`,label:""+ly};}
  return null;
}

function renderClothingBoard(){
  const root=document.getElementById("cl-root");
  if(!root)return;

  let items=[...CL.items];

  // Filter by company
  if(CL.company!=="all")items=items.filter(i=>(i.company||"Jeffs Junk")===CL.company);

  // Filter by period
  const range=clGetPeriodRange(CL.period);
  if(range)items=items.filter(i=>i.date_given>=range.start&&i.date_given<=range.end);

  // Filter by item type
  if(CL.filter!=="all")items=items.filter(i=>i.item_type===CL.filter);

  // Sort
  items.sort((a,b)=>{
    let va,vb;
    if(CL.sort==="employee"){va=(a.employees?.name||"").toLowerCase();vb=(b.employees?.name||"").toLowerCase();}
    else if(CL.sort==="item_type"){va=a.item_type;vb=b.item_type;}
    else if(CL.sort==="size"){va=CLOTHING_SIZES.indexOf(a.size);vb=CLOTHING_SIZES.indexOf(b.size);}
    else if(CL.sort==="price"){va=+a.price||0;vb=+b.price||0;}
    else if(CL.sort==="purchase_price"){va=+a.purchase_price||0;vb=+b.purchase_price||0;}
    else{va=a.date_given||"";vb=b.date_given||"";}
    if(va<vb)return CL.sortDir==="asc"?-1:1;
    if(va>vb)return CL.sortDir==="asc"?1:-1;
    return 0;
  });

  // Summary stats
  const totalItems=items.length;
  const totalEmployeePrice=items.reduce((s,i)=>s+(+i.price||0),0);
  const totalPurchaseCost=items.reduce((s,i)=>s+(+i.purchase_price||0),0);
  const uniqueEmps=new Set(items.map(i=>i.employee_id)).size;

  // Company stats
  const jjItems=items.filter(i=>(i.company||"Jeffs Junk")==="Jeffs Junk");
  const jwgItems=items.filter(i=>(i.company||"Jeffs Junk")==="Jeff White Group");
  const jjCost=jjItems.reduce((s,i)=>s+(+i.purchase_price||0),0);
  const jwgCost=jwgItems.reduce((s,i)=>s+(+i.purchase_price||0),0);

  // Filter buttons
  const types=["all",...CLOTHING_TYPES];
  const filterBtns=types.map(t=>`<button class="cl-filter-btn${CL.filter===t?" active":""}" data-type="${esc(t)}" onclick="clSetFilter('${esc(t)}')">${t==="all"?"All":t}</button>`).join("");

  // Period buttons
  const periods=[
    {v:"all",l:"All Time"},{v:"q1",l:"Q1"},{v:"q2",l:"Q2"},{v:"q3",l:"Q3"},{v:"q4",l:"Q4"},
    {v:"h1",l:"H1"},{v:"h2",l:"H2"},{v:"year",l:"This Year"},{v:"last-year",l:"Last Year"}
  ];
  const periodBtns=periods.map(p=>`<button class="cl-filter-btn${CL.period===p.v?" active":""}" onclick="clSetPeriod('${p.v}')">${p.l}</button>`).join("");

  // Company filter buttons
  const companyBtns=`<button class="cl-filter-btn${CL.company==="all"?" active":""}" onclick="clSetCompany('all')">Both</button>`+
    CLOTHING_COMPANIES.map(c=>`<button class="cl-filter-btn${CL.company===c?" active":""}" onclick="clSetCompany('${esc(c)}')">${c}</button>`).join("");

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
    const empPurchase=emp.items.reduce((s,i)=>s+(+i.purchase_price||0),0);
    let itemRows="";
    emp.items.forEach(i=>{
      const d=i.date_given?new Date(i.date_given+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—";
      const co=i.company||"Jeffs Junk";
      const coBadge=co==="Jeff White Group"?`<span class="cl-co-badge jwg">JWG</span>`:`<span class="cl-co-badge jj">JJ</span>`;
      itemRows+=`<tr class="${grpClass}">
        <td><span class="cl-item-badge ${BADGE_CLASS[i.item_type]||''}">${esc(i.item_type)}</span></td>
        <td><span class="cl-size">${esc(i.size||"—")}</span></td>
        <td><span class="cl-price">$${(+i.price||0).toFixed(2)}</span></td>
        <td><span class="cl-price" style="color:var(--fg-muted)">$${(+i.purchase_price||0).toFixed(2)}</span></td>
        <td>${coBadge}</td>
        <td>${d}</td>
        <td style="font-size:12px;color:var(--fg-muted)">${esc(i.notes||"")}</td>
        <td><div class="cl-actions">
          <button class="cl-act-btn" onclick="clOpenEdit('${i.id}')">Edit</button>
          <button class="cl-act-btn del" onclick="clDelete('${i.id}')">Remove</button>
        </div></td>
      </tr>`;
    });
    cards+=`<tr class="cl-emp-header ${grpClass}">
      <td colspan="8">
        <span class="cl-emp-name">${esc(emp.name)}</span>
        <span class="cl-emp-count">${emp.items.length} item${emp.items.length!==1?"s":""} · Employee: $${empTotal.toFixed(2)} · Cost: $${empPurchase.toFixed(2)}</span>
      </td>
    </tr>${itemRows}`;
  });

  const periodLabel=range?range.label:"All Time";

  root.innerHTML=`
    <div class="cl-header">
      <div class="cl-title">Employee Clothing <span>Track what's been given out</span></div>
      <button class="cl-add-btn" onclick="clOpenAdd()">+ Add Item</button>
    </div>
    <div class="cl-summary">
      <div class="cl-stat"><div class="cl-stat-val">${totalItems}</div><div class="cl-stat-lbl">Items (${periodLabel})</div></div>
      <div class="cl-stat"><div class="cl-stat-val">$${totalEmployeePrice.toFixed(2)}</div><div class="cl-stat-lbl">Employee Value</div></div>
      <div class="cl-stat"><div class="cl-stat-val" style="color:#dc2626">$${totalPurchaseCost.toFixed(2)}</div><div class="cl-stat-lbl">Purchase Cost</div></div>
      <div class="cl-stat"><div class="cl-stat-val">${uniqueEmps}</div><div class="cl-stat-lbl">Employees</div></div>
    </div>
    <div class="cl-summary" style="margin-top:0;padding-top:0;border:none;gap:24px">
      <div class="cl-stat"><div class="cl-stat-val" style="font-size:16px">$${jjCost.toFixed(2)}<span style="font-size:11px;color:var(--fg-muted);margin-left:4px">(${jjItems.length})</span></div><div class="cl-stat-lbl">Jeffs Junk Cost</div></div>
      <div class="cl-stat"><div class="cl-stat-val" style="font-size:16px">$${jwgCost.toFixed(2)}<span style="font-size:11px;color:var(--fg-muted);margin-left:4px">(${jwgItems.length})</span></div><div class="cl-stat-lbl">Jeff White Group Cost</div></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:600;color:var(--fg-muted);text-transform:uppercase;letter-spacing:.5px">Period:</span>${periodBtns}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:600;color:var(--fg-muted);text-transform:uppercase;letter-spacing:.5px">Company:</span>${companyBtns}
    </div>
    <div class="cl-filters">${filterBtns}</div>
    ${empList.length?`<div class="cl-table-wrap"><table class="cl-table">
      <thead><tr>
        <th>Item</th>
        <th>Size</th>
        <th>Emp. Price</th>
        <th>Purchase Cost</th>
        <th>Company</th>
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
  const companyOpts=CLOTHING_COMPANIES.map(c=>`<option value="${c}"${item&&item.company===c?" selected":""}>${c}</option>`).join("");
  const today=localDateStr(new Date());

  const h=`
    <div class="modal-title">${item?"Edit Clothing Item":"Add Clothing Item"}</div>
    <div class="modal-sub">${item?"Update the details below.":"Record a clothing item given to an employee."}</div>
    <div class="cl-form-row">
      <div class="cl-form-label">Employee *</div>
      <select class="cl-select" id="cl_emp">${empOpts}</select>
    </div>
    <div class="cl-form-row">
      <div class="cl-form-label">Company *</div>
      <select class="cl-select" id="cl_company">${companyOpts}</select>
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
        <div class="cl-form-label">Employee Price ($) <span style="opacity:.5;font-weight:400;text-transform:none">what they "pay"</span></div>
        <input class="cl-input" type="number" step="0.01" min="0" id="cl_price" placeholder="0.00" value="${item?((+item.price)||""):""}">
      </div>
      <div class="cl-form-row">
        <div class="cl-form-label">Purchase Cost ($) <span style="opacity:.5;font-weight:400;text-transform:none">what we actually paid</span></div>
        <input class="cl-input" type="number" step="0.01" min="0" id="cl_purchase" placeholder="0.00" value="${item?((+item.purchase_price)||""):""}">
      </div>
    </div>
    <div class="cl-form-row">
      <div class="cl-form-label">Date Given</div>
      <input class="cl-input" type="date" id="cl_date" value="${item?.date_given||today}">
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
  const company=document.getElementById("cl_company")?.value;
  if(!emp){toast("Select an employee","error");return;}
  if(!type){toast("Select an item type","error");return;}
  if(!company){toast("Select a company","error");return;}
  const data={
    employee_id:emp,
    item_type:type,
    size:document.getElementById("cl_size")?.value||"",
    price:parseFloat(document.getElementById("cl_price")?.value)||0,
    purchase_price:parseFloat(document.getElementById("cl_purchase")?.value)||0,
    company:company,
    date_given:document.getElementById("cl_date")?.value||localDateStr(new Date()),
    notes:document.getElementById("cl_notes")?.value.trim()||"",
  };
  try{
    if(id){
      await updateClothingItem(id,data);
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
