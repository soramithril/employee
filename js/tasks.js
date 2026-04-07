// ── TASKS.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

let WT={tasks:[],filter:"all"};

// ─── SUMMER SERVICES ───────────────────────────────────────────────────────

async function saveWorkshopTask(data){return sbF("POST","workshop_tasks",data);}
async function updateWorkshopTask(id,data){return sbF("PATCH","workshop_tasks?id=eq."+id,data);}
async function deleteWorkshopTask(id){return sbF("DELETE","workshop_tasks?id=eq."+id);}

function buildTasksPage(){
  return`<div class="card"><div class="wt-wrap" id="wt-root"><div style="text-align:center;padding:40px;color:var(--fg-subtle)">Loading tasks…</div></div></div>`;
}

async function initTasksPage(){
  try{
    WT.tasks=await loadWorkshopTasks();
    renderTasksBoard();
  }catch(e){
    const root=document.getElementById("wt-root");
    if(root)root.innerHTML=`<div style="color:#dc2626;padding:20px">Failed to load: ${e.message}</div>`;
  }
}

function wtSetFilter(f){
  WT.filter=f;
  renderTasksBoard();
}

function renderTasksBoard(){
  const root=document.getElementById("wt-root");
  if(!root)return;

  // Sort: by priority then created_at
  const sorted=[...WT.tasks].sort((a,b)=>{
    const pd=(PRIO_ORDER[a.priority]??1)-(PRIO_ORDER[b.priority]??1);
    return pd||0;
  });

  // Apply filter
  const filtered=WT.filter==="all"?sorted:sorted.filter(t=>t.priority===WT.filter);

  const todo=filtered.filter(t=>t.status==="todo");
  const done=filtered.filter(t=>t.status==="done");

  function taskCard(t){
    const isDone=t.status==="done";
    const prio=t.priority||"medium";
    const people=(t.assigned_to_arr||[]);
    let chips="";
    people.forEach(p=>{chips+=`<span class="wt-chip person-chip">👤 ${esc(p)}</span>`;});
    if(t.started_at)chips+=`<span class="wt-chip date-chip">Started ${fmtWTDate(t.started_at)}</span>`;
    if(t.completed_at)chips+=`<span class="wt-chip done-chip">Done ${fmtWTDate(t.completed_at)}</span>`;

    const actions=isDone
      ?`<button class="wt-action-btn wt-btn-reopen" onclick="wtReopen('${t.id}')">↩ Reopen</button>
         <button class="wt-action-btn wt-btn-edit" onclick="wtOpenEdit('${t.id}')">✎ Edit</button>
         <button class="wt-action-btn wt-btn-del" onclick="wtDelete('${t.id}')">✕</button>`
      :`<button class="wt-action-btn wt-btn-done" onclick="wtMarkDone('${t.id}')">✓ Mark Done</button>
         <button class="wt-action-btn wt-btn-edit" onclick="wtOpenEdit('${t.id}')">✎ Edit</button>
         <button class="wt-action-btn wt-btn-del" onclick="wtDelete('${t.id}')">✕</button>`;

    return`<div class="wt-card p-${prio}${isDone?" done-card":""}">
      <div class="wt-card-inner">
        <div class="wt-card-top">
          <div class="wt-card-title">${esc(t.title)}</div>
          <span class="wt-priority-badge ${PRIO_CLASS[prio]}">${PRIO_LABEL[prio]}</span>
        </div>
        ${t.description?`<div class="wt-card-desc">${esc(t.description)}</div>`:""}
        ${chips?`<div class="wt-card-meta">${chips}</div>`:""}
      </div>
      <div class="wt-card-actions">${actions}</div>
    </div>`;
  }

  const f=WT.filter;
  const filterBtns=[
    {k:"all",label:"All"},
    {k:"high",label:"High"},
    {k:"medium",label:"Medium"},
    {k:"low",label:"Low"},
  ].map(({k,label})=>`<button class="wt-filter-btn f-${k}${f===k?" active":""}" onclick="wtSetFilter('${k}')">${label}</button>`).join("");

  root.innerHTML=`
    <div class="wt-header">
      <div class="wt-title">Workshop Tasks <span>Downtime to-do list</span></div>
      <button class="wt-add-btn" onclick="wtOpenAdd()">+ Add Task</button>
    </div>
    <div class="wt-filters">${filterBtns}</div>
    <div class="wt-board">
      <div class="wt-col">
        <div class="wt-col-hdr">
          <span class="wt-col-label">To Do</span>
          <span class="wt-col-count">${todo.length}</span>
        </div>
        ${todo.length?todo.map(taskCard).join(""):`<div class="wt-empty"><div class="wt-empty-icon">✓</div>Nothing pending${f!=="all"?" at this priority":""} — good work!</div>`}
      </div>
      <div class="wt-col">
        <div class="wt-col-hdr">
          <span class="wt-col-label">Done</span>
          <span class="wt-col-count done-count">${done.length}</span>
        </div>
        ${done.length?done.map(taskCard).join(""):`<div class="wt-empty"><div class="wt-empty-icon">📋</div>Completed tasks will appear here.</div>`}
      </div>
    </div>`;
}

function fmtWTDate(d){
  if(!d)return"";
  const[y,m,day]=d.split("-");
  return new Date(+y,+m-1,+day).toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

function wtOpenAdd(){wtOpenForm(null);}
function wtOpenEdit(id){wtOpenForm(id);}

let _wtSelPeople=[];
let _wtSelPrio="medium";

function wtPickPrio(p){
  _wtSelPrio=p;
  ["high","medium","low"].forEach(v=>{
    const el=document.getElementById("wt_prio_"+v);
    if(el)el.className=`wt-prio-opt opt-${v}${_wtSelPrio===v?" sel-"+v:""}`;
  });
}

function wtTogglePerson(name){
  if(_wtSelPeople.includes(name)){
    _wtSelPeople=_wtSelPeople.filter(n=>n!==name);
  }else{
    _wtSelPeople=[..._wtSelPeople,name];
  }
  document.querySelectorAll(".wt-person-opt").forEach(el=>{
    el.classList.toggle("sel",_wtSelPeople.includes(el.dataset.name));
  });
}

function wtOpenForm(id){
  const t=id?WT.tasks.find(x=>x.id===id):null;
  _wtSelPrio=t?.priority||"medium";
  _wtSelPeople=t?.assigned_to_arr?[...t.assigned_to_arr]:[];

  const prioOpts=["high","medium","low"].map(v=>{
    const labels={high:"🔴 High",medium:"🟡 Medium",low:"🟢 Low"};
    return`<button type="button" id="wt_prio_${v}" class="wt-prio-opt opt-${v}${_wtSelPrio===v?" sel-"+v:""}" onclick="wtPickPrio('${v}')">${labels[v]}</button>`;
  }).join("");

  const personBtns=S.employees.map(e=>`<button type="button" class="wt-person-opt${_wtSelPeople.includes(e.name)?" sel":""}" data-name="${esc(e.name)}" onclick="wtTogglePerson('${esc(e.name)}')">${esc(e.name)}</button>`).join("");

  const h=`
    <div class="modal-title">${t?"Edit Task":"New Workshop Task"}</div>
    <div class="modal-sub">${t?"Update the task details below.":"Add a task to do during downtime."}</div>
    <div class="wt-form-row">
      <label class="wt-form-label">Task Name *</label>
      <input class="wt-input" id="wt_title" placeholder="e.g. Clean paint booth, Organize shelving…" value="${esc(t?.title||"")}">
    </div>
    <div class="wt-form-row">
      <label class="wt-form-label">Description <span style="opacity:.5;font-weight:400;text-transform:none">(optional)</span></label>
      <textarea class="wt-textarea" id="wt_desc" placeholder="Any extra details…">${esc(t?.description||"")}</textarea>
    </div>
    <div class="wt-form-row">
      <label class="wt-form-label">Priority</label>
      <div class="wt-priority-picker">${prioOpts}</div>
    </div>
    <div class="wt-form-row">
      <label class="wt-form-label">Assign To <span style="opacity:.5;font-weight:400;text-transform:none">(select one or more)</span></label>
      <div class="wt-person-grid">${personBtns}</div>
    </div>
    <div class="wt-form-row">
      <label class="wt-form-label">Start Date</label>
      <input class="wt-input" type="date" id="wt_start" value="${t?.started_at||""}">
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
      <button class="modal-cancel" onclick="closeModal()">Cancel</button>
      <button class="modal-done" onclick="wtSaveForm('${id||""}')">${t?"Save Changes":"Add Task"}</button>
    </div>`;
  openModal(h,"500px");
}

async function wtSaveForm(id){
  const title=document.getElementById("wt_title")?.value.trim();
  if(!title){toast("Task name is required","error");return;}
  const data={
    title,
    description:document.getElementById("wt_desc")?.value.trim()||null,
    priority:_wtSelPrio,
    assigned_to_arr:_wtSelPeople,
    started_at:document.getElementById("wt_start")?.value||null,
  };
  try{
    if(id){
      await updateWorkshopTask(id,data);
      const idx=WT.tasks.findIndex(t=>t.id===id);
      if(idx>=0)WT.tasks[idx]={...WT.tasks[idx],...data};
    }else{
      const[created]=await saveWorkshopTask({...data,status:"todo"});
      WT.tasks.unshift(created);
    }
    closeModal();renderTasksBoard();toast(id?"Task updated":"Task added");
  }catch(e){toast(e.message,"error");}
}

async function wtMarkDone(id){
  const today=localDateStr(new Date());
  try{
    await updateWorkshopTask(id,{status:"done",completed_at:today});
    const t=WT.tasks.find(x=>x.id===id);
    if(t){t.status="done";t.completed_at=today;}
    renderTasksBoard();toast("Task marked done ✓");
  }catch(e){toast(e.message,"error");}
}

async function wtReopen(id){
  try{
    await updateWorkshopTask(id,{status:"todo",completed_at:null});
    const t=WT.tasks.find(x=>x.id===id);
    if(t){t.status="todo";t.completed_at=null;}
    renderTasksBoard();toast("Task reopened");
  }catch(e){toast(e.message,"error");}
}

async function wtDelete(id){
  if(!confirm("Delete this task? This can't be undone."))return;
  try{
    await deleteWorkshopTask(id);
    WT.tasks=WT.tasks.filter(t=>t.id!==id);
    renderTasksBoard();toast("Task deleted");
  }catch(e){toast(e.message,"error");}
}

// On load — check session then boot app