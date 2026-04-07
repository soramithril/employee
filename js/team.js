// ── TEAM.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

function buildTeam(){
  let h=`<div class="card"><div class="twrap"><div class="stitle" style="margin-bottom:5px">Team</div><div class="ssub" style="margin-bottom:22px">Manage your employees · drag ⠿ to reorder</div>
  <div class="addbox"><div class="sect-label" style="margin-bottom:11px">Add Employee</div>
  <div style="display:flex;gap:9px"><input class="addinput" id="nEmp" placeholder="Full name…" onkeydown="if(event.key==='Enter')addEmp()"><button class="addbtn" onclick="addEmp()">Add</button></div></div>`;
  if(!S.employees.length)h+=`<div class="empty" style="height:100px">No employees yet.</div>`;
  else{
    h+=`<div id="team-list">`;
    S.employees.forEach((emp,i)=>{
      const tot=S.allSchedules.filter(s=>s.employee_id===emp.id).reduce((n,s)=>n+countH(s.schedule_data),0);
      const[abg,afg]=ac(emp.name);
      h+=`<div class="tcard" draggable="true" data-empid="${emp.id}" data-empidx="${i}">
        <span style="cursor:grab;color:rgba(0,0,0,0.18);font-size:18px;padding:0 10px 0 0;user-select:none;flex-shrink:0;display:flex;align-items:center;" title="Drag to reorder">⠿</span>
        <div style="display:flex;align-items:center;gap:11px;flex:1;min-width:0">
          <div class="avatar" style="background:${abg};color:${afg};width:38px;height:38px;font-size:12px;flex-shrink:0">${empInitials(emp.name)}</div>
          <div style="min-width:0"><div style="font-weight:600;font-size:14px;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(emp.name)}</div><div style="font-size:12px;color:var(--fg-muted)">${tot}h total scheduled</div></div>
        </div>
        <button class="rmbtn" onclick="removeEmp('${emp.id}','${esc(emp.name)}')">Remove</button>
      </div>`;
    });
    h+=`</div>`;
  }
  h+=`<div class="sbbox ${USE_SUPABASE?"conn":"local"}" style="margin-top:26px">`;
  if(USE_SUPABASE)h+=`<div style="font-weight:600;font-size:13px;color:var(--accent);margin-bottom:5px">✓ Connected to Supabase</div><div style="font-size:12px;color:var(--fg-muted)">Schedules are syncing to the cloud.</div>`;
  else h+=`<div style="font-weight:600;font-size:13px;color:#a16207;margin-bottom:5px">⚡ Local Storage Mode</div><div style="font-size:12px;color:var(--fg-muted)">Data saves in your browser.</div>`;
  h+=`</div></div></div>`;return h;
}

async function addEmp(){const inp=document.getElementById("nEmp"),name=(inp?.value||"").trim();if(!name){toast("Enter a name","error");return;}if(S.employees.find(e=>e.name.toLowerCase()===name.toLowerCase())){toast("Already exists","error");return;}try{const emp=await saveEmp(name);S.employees.push(emp);S.schedule[emp.id]=defSched();if(inp)inp.value="";toast(`${name} added`);render();}catch(e){toast(e.message,"error");}}
async function removeEmp(id,name){if(!confirm(`Remove ${name}?`))return;try{await delEmp(id);S.employees=S.employees.filter(e=>e.id!==id);delete S.schedule[id];S.allSchedules=S.allSchedules.filter(s=>s.employee_id!==id);toast(`${name} removed`);render();}catch(e){toast(e.message,"error");}}

// ── DRAG & DROP — shared helpers ──
function saveEmpOrder(){const ids=S.employees.map(e=>e.id);localStorage.setItem("ss_emp_order",JSON.stringify(ids));saveSetting("emp_order",ids);}
function applyStoredOrder(){
  const stored=localStorage.getItem("ss_emp_order");
  if(!stored)return;
  try{
    const ids=JSON.parse(stored);
    S.employees.sort((a,b)=>{const ai=ids.indexOf(a.id),bi=ids.indexOf(b.id);if(ai<0)return 1;if(bi<0)return-1;return ai-bi;});
  }catch(e){}
}

// ── DRAG — Schedule Grid rows ──
function initGridDrag(){
  const rows=document.querySelectorAll(".emp-row[data-empid]");
  let dragId=null;
  rows.forEach(row=>{
    row.addEventListener("dragstart",e=>{
      dragId=row.dataset.empid;
      row.classList.add("is-dragging");
      e.dataTransfer.effectAllowed="move";
    });
    row.addEventListener("dragend",()=>{
      dragId=null;
      rows.forEach(r=>r.classList.remove("is-dragging","drag-over-above","drag-over-below"));
    });
    row.addEventListener("dragover",e=>{
      if(!dragId||dragId===row.dataset.empid)return;
      e.preventDefault();
      rows.forEach(r=>r.classList.remove("drag-over-above","drag-over-below"));
      const rect=row.getBoundingClientRect();
      const mid=rect.top+rect.height/2;
      row.classList.add(e.clientY<mid?"drag-over-above":"drag-over-below");
    });
    row.addEventListener("dragleave",()=>{
      row.classList.remove("drag-over-above","drag-over-below");
    });
    row.addEventListener("drop",e=>{
      e.preventDefault();
      if(!dragId||dragId===row.dataset.empid)return;
      const rect=row.getBoundingClientRect();
      const mid=rect.top+rect.height/2;
      const insertBefore=e.clientY<mid;
      const fromIdx=S.employees.findIndex(em=>em.id===dragId);
      let toIdx=S.employees.findIndex(em=>em.id===row.dataset.empid);
      if(fromIdx<0||toIdx<0)return;
      const [moved]=S.employees.splice(fromIdx,1);
      toIdx=S.employees.findIndex(em=>em.id===row.dataset.empid);
      S.employees.splice(insertBefore?toIdx:toIdx+1,0,moved);
      saveEmpOrder();
      render();
    });
  });
}

// ── DRAG — Team list cards ──
function initTeamDrag(){
  const cards=document.querySelectorAll("#team-list .tcard[data-empid]");
  let dragId=null;
  cards.forEach(card=>{
    card.addEventListener("dragstart",e=>{
      dragId=card.dataset.empid;
      card.classList.add("is-dragging");
      e.dataTransfer.effectAllowed="move";
    });
    card.addEventListener("dragend",()=>{
      dragId=null;
      cards.forEach(c=>c.classList.remove("is-dragging","drag-over-above","drag-over-below"));
    });
    card.addEventListener("dragover",e=>{
      if(!dragId||dragId===card.dataset.empid)return;
      e.preventDefault();
      cards.forEach(c=>c.classList.remove("drag-over-above","drag-over-below"));
      const rect=card.getBoundingClientRect();
      card.classList.add(e.clientY<rect.top+rect.height/2?"drag-over-above":"drag-over-below");
    });
    card.addEventListener("dragleave",()=>{
      card.classList.remove("drag-over-above","drag-over-below");
    });
    card.addEventListener("drop",e=>{
      e.preventDefault();
      if(!dragId||dragId===card.dataset.empid)return;
      const rect=card.getBoundingClientRect();
      const insertBefore=e.clientY<rect.top+rect.height/2;
      const fromIdx=S.employees.findIndex(em=>em.id===dragId);
      let toIdx=S.employees.findIndex(em=>em.id===card.dataset.empid);
      if(fromIdx<0||toIdx<0)return;
      const[moved]=S.employees.splice(fromIdx,1);
      toIdx=S.employees.findIndex(em=>em.id===card.dataset.empid);
      S.employees.splice(insertBefore?toIdx:toIdx+1,0,moved);
      saveEmpOrder();
      render();
    });
  });
}

// ── AUTH (Supabase) ──
let _currentUser=null;
