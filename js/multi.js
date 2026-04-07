// ── MULTI.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

// ── MULTI-ASSIGN ──
let _ma={tasks:[],days:[],empIds:[],start:null,end:null};

function openMultiAssign(){
  _ma={tasks:[],days:[],empIds:[],start:null,end:null};
  renderMultiAssign();
}

function renderMultiAssign(){
  const tm=TM();
  const defStart=`${WH.start}:00`,defEnd=`${WH.end}:00`;
  // Preserve any time the user has already selected before re-rendering
  const curStart=document.getElementById("ma_start");
  const curEnd=document.getElementById("ma_end");
  if(curStart)_ma.start=curStart.value;
  if(curEnd)_ma.end=curEnd.value;
  const selStart=_ma.start||defStart;
  const selEnd=_ma.end||defEnd;

  // Task grid
  let taskHtml='<div class="task-grid">';
  tasks.filter(t=>t.id!=="off"&&t.id!=="sick").forEach(t=>{
    const sel=_ma.tasks.includes(t.id);
    taskHtml+=`<button class="task-opt${sel?" sel":""}" id="matopt_${t.id}"
      style="background:${t.bg};color:${t.text};border-color:${sel?t.dot:"transparent"}"
      onclick="maPick('${t.id}')">
      <span style="width:7px;height:7px;border-radius:50%;background:${t.dot};flex-shrink:0;display:inline-block"></span>
      ${esc(t.label)}
    </button>`;
  });
  taskHtml+='</div>';

  // Day picker
  let dayHtml='<div class="ma-day-list">';
  S.activeDays.forEach(d=>{
    const on=_ma.days.includes(d);
    dayHtml+=`<button class="ma-day-btn${on?" on":""}" onclick="maToggleDay('${d}')">${d.slice(0,3)}</button>`;
  });
  // Add "All Days" shortcut
  const allDaysOn=S.activeDays.every(d=>_ma.days.includes(d));
  dayHtml+=`<button class="ma-day-btn${allDaysOn?" on":""}" onclick="maToggleAllDays()" style="font-style:italic">All</button>`;
  dayHtml+='</div>';

  // Employee list
  const allOn=S.employees.length>0&&S.employees.every(e=>_ma.empIds.includes(e.id));
  let empHtml=`<button class="ma-everyone-btn${allOn?" all-on":""}" onclick="maToggleEveryone()">
    ${allOn?"✓ Everyone selected":"👥 Select Everyone"}
  </button>
  <div class="ma-emp-list">`;
  S.employees.forEach(e=>{
    const checked=_ma.empIds.includes(e.id);
    const[abg,afg]=ac(e.name);
    empHtml+=`<div class="ma-emp-row${checked?" checked":""}" onclick="maToggleEmp('${e.id}')">
      <span class="ma-chk">${checked?`<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="7" fill="var(--accent)"/><path d="M4 7l2 2 4-4" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`:`<span style="width:14px;height:14px;border-radius:50%;border:2px solid var(--border);display:inline-block;"></span>`}</span>
      <div class="avatar" style="background:${abg};color:${afg};width:26px;height:26px;font-size:11px;flex-shrink:0">${empInitials(e.name)}</div>
      <span class="ma-emp-name">${esc(e.name)}</span>
    </div>`;
  });
  empHtml+='</div>';

  const selCount=_ma.empIds.length;
  const readyToAssign=_ma.tasks.length>0&&_ma.days.length>0&&selCount>0;

  const h=`
  <div class="modal-title">👥 Assign to Multiple</div>
  <div class="modal-sub">Pick a task, time, days, and employees — all get the same shift added.</div>

  <div class="sect-label">Task</div>
  ${taskHtml}

  <div class="modal-divider"></div>
  <div class="sect-label">Time</div>
  <div class="shift-form">
    <div><div class="sf-label">Start</div><select class="sf-select" id="ma_start">${buildTimeOpts(selStart)}</select></div>
    <div><div class="sf-label">End</div><select class="sf-select" id="ma_end">${buildTimeOpts(selEnd)}</select></div>
  </div>

  <div class="modal-divider"></div>
  <div class="sect-label">Days</div>
  ${dayHtml}

  <div class="modal-divider"></div>
  <div class="sect-label">Employees <span style="font-weight:500;opacity:.6;text-transform:none;letter-spacing:0">${selCount>0?`(${selCount} selected)`:""}</span></div>
  ${S.employees.length?empHtml:'<div style="font-size:12px;color:var(--fg-muted);padding:8px 0">No employees yet — add them in the Team tab.</div>'}

  <div class="modal-divider"></div>
  <div style="display:flex;justify-content:space-between;align-items:center">
    <button class="modal-cancel" onclick="closeModal()">Cancel</button>
    <button class="modal-done" onclick="applyMultiAssign()" ${readyToAssign?"":'disabled style="opacity:.45;cursor:not-allowed"'}>
      Assign${(selCount>0&&_ma.days.length>0)?" to "+selCount+" \xD7 "+_ma.days.length+" day"+(_ma.days.length!==1?"s":""):""}
    </button>
  </div>`;

  updateModal(h,"480px");
}

function maPick(id){
  const i=_ma.tasks.indexOf(id);
  if(i>=0) _ma.tasks.splice(i,1); else _ma.tasks.push(id);
  // Update button styles in-place (no full re-render = no scroll reset)
  const tm=TM();
  document.querySelectorAll(".task-opt[id^='matopt_']").forEach(b=>{b.classList.remove("sel");b.style.borderColor="transparent";});
  _ma.tasks.forEach(tid=>{
    const el=document.getElementById("matopt_"+tid);
    if(el){el.classList.add("sel");const t=tm[tid];if(t)el.style.borderColor=t.dot;}
  });
  // Update the Assign button label/state
  const btn=document.querySelector(".modal-done");
  if(btn){
    const ready=_ma.tasks.length>0&&_ma.days.length>0&&_ma.empIds.length>0;
    btn.disabled=!ready;btn.style.opacity=ready?"1":"0.45";btn.style.cursor=ready?"pointer":"not-allowed";
    if(_ma.empIds.length>0&&_ma.days.length>0)
      btn.textContent=`Assign to ${_ma.empIds.length} × ${_ma.days.length} day${_ma.days.length!==1?"s":""}`;
    else btn.textContent="Assign";
  }
}
function maToggleDay(d){
  const i=_ma.days.indexOf(d);
  if(i>=0)_ma.days.splice(i,1);else _ma.days.push(d);
  renderMultiAssign();
}
function maToggleAllDays(){
  const allOn=S.activeDays.every(d=>_ma.days.includes(d));
  _ma.days=allOn?[]:[...S.activeDays];
  renderMultiAssign();
}
function maToggleEmp(id){
  const i=_ma.empIds.indexOf(id);
  if(i>=0)_ma.empIds.splice(i,1);else _ma.empIds.push(id);
  renderMultiAssign();
}
function maToggleEveryone(){
  const allOn=S.employees.every(e=>_ma.empIds.includes(e.id));
  _ma.empIds=allOn?[]:S.employees.map(e=>e.id);
  renderMultiAssign();
}

function applyMultiAssign(){
  const s=document.getElementById("ma_start")?.value||_ma.start;
  const e=document.getElementById("ma_end")?.value||_ma.end;
  if(!_ma.tasks.length){toast("Select at least one task first","error");return;}
  if(!_ma.days.length){toast("Select at least one day","error");return;}
  if(!_ma.empIds.length){toast("Select at least one employee","error");return;}
  if(s&&e){
    const[sh,sm]=s.split(":").map(Number),[eh,em]=e.split(":").map(Number);
    if((eh+em/60)<=(sh+sm/60)){toast("End time must be after start","error");return;}
  }
  let skipped=0;
  const newShift={tasks:[..._ma.tasks],start:s,end:e};
  _ma.empIds.forEach(empId=>{
    if(!S.schedule[empId])S.schedule[empId]=defSched();
    _ma.days.forEach(day=>{
      if(!S.schedule[empId][day])S.schedule[empId][day]={status:"off",shifts:[]};
      const dayData=S.schedule[empId][day];
      if(hasOverlap(dayData.shifts||[],newShift,-1)){skipped++;return;}
      dayData.status="work";
      dayData.shifts=[...(dayData.shifts||[]),{...newShift}];
    });
    updBadge(empId);
  });
  // Use autoSave(null) which snapshots ALL employees at once right now
  autoSave(null);
  closeModal();
  refreshGrid();
  const tm=TM();
  const tLabel=_ma.tasks.map(id=>tm[id]?.label||id).join(" + ");
  const skipNote=skipped>0?` (${skipped} skipped — overlap)`:"";
  toast(`✓ "${tLabel}" assigned to ${_ma.empIds.length} employee${_ma.empIds.length!==1?"s":""} across ${_ma.days.length} day${_ma.days.length!==1?"s":""}${skipNote}`);
  _ma={tasks:[],days:[],empIds:[]};
}
// ── MULTI-CLEAR ──
let _mc={task:"__all__",days:[],empIds:[]};

function openMultiClear(){
  _mc={task:"__all__",days:[],empIds:[]};
  renderMultiClear();
}

function renderMultiClear(){
  // Task filter — "__all__" means clear every task on that day/person
  let taskHtml=`<div class="task-grid">`;
  const allTaskSel=_mc.task==="__all__";
  taskHtml+=`<button class="task-opt${allTaskSel?" sel":""}" style="background:rgba(239,68,68,0.08);color:#dc2626;border-color:${allTaskSel?"#dc2626":"transparent"}" onclick="mcPickTask('__all__')">
    <span style="width:7px;height:7px;border-radius:50%;background:#dc2626;flex-shrink:0;display:inline-block"></span>
    All Tasks
  </button>`;
  tasks.filter(t=>t.id!=="off"&&t.id!=="sick").forEach(t=>{
    const sel=_mc.task===t.id;
    taskHtml+=`<button class="task-opt${sel?" sel":""}" style="background:${t.bg};color:${t.text};border-color:${sel?t.dot:"transparent"}" onclick="mcPickTask('${t.id}')">
      <span style="width:7px;height:7px;border-radius:50%;background:${t.dot};flex-shrink:0;display:inline-block"></span>
      ${esc(t.label)}
    </button>`;
  });
  taskHtml+=`</div>`;

  let dayHtml=`<div class="ma-day-list">`;
  S.activeDays.forEach(d=>{
    const on=_mc.days.includes(d);
    dayHtml+=`<button class="ma-day-btn${on?" on":""}" onclick="mcToggleDay('${d}')">${d.slice(0,3)}</button>`;
  });
  const allDaysOn=S.activeDays.every(d=>_mc.days.includes(d));
  dayHtml+=`<button class="ma-day-btn${allDaysOn?" on":""}" onclick="mcToggleAllDays()" style="font-style:italic">All</button>`;
  dayHtml+=`</div>`;

  const allEmpOn=S.employees.length>0&&S.employees.every(e=>_mc.empIds.includes(e.id));
  let empHtml=`<button class="ma-everyone-btn${allEmpOn?" all-on":""}" onclick="mcToggleEveryone()">
    ${allEmpOn?"✓ Everyone selected":"👥 Select Everyone"}
  </button><div class="ma-emp-list">`;
  S.employees.forEach(e=>{
    const checked=_mc.empIds.includes(e.id);
    const[abg,afg]=ac(e.name);
    empHtml+=`<div class="ma-emp-row${checked?" checked":""}" onclick="mcToggleEmp('${e.id}')">
      <span class="ma-chk">${checked?`<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="7" fill="var(--accent)"/><path d="M4 7l2 2 4-4" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`:`<span style="width:14px;height:14px;border-radius:50%;border:2px solid var(--border);display:inline-block;"></span>`}</span>
      <div class="avatar" style="background:${abg};color:${afg};width:26px;height:26px;font-size:11px;flex-shrink:0">${empInitials(e.name)}</div>
      <span class="ma-emp-name">${esc(e.name)}</span>
    </div>`;
  });
  empHtml+=`</div>`;

  const selCount=_mc.empIds.length;
  const ready=_mc.days.length>0&&selCount>0;
  const taskLabel=_mc.task==="__all__"?"all tasks":(TM()[_mc.task]?.label||_mc.task);

  const h=`
  <div class="modal-title">🗑 Clear Multiple</div>
  <div class="modal-sub">Remove shifts from selected employees and days in one go.</div>
  <div class="sect-label">What to clear</div>
  ${taskHtml}
  <div class="modal-divider"></div>
  <div class="sect-label">Days</div>
  ${dayHtml}
  <div class="modal-divider"></div>
  <div class="sect-label">Employees <span style="font-weight:500;opacity:.6;text-transform:none;letter-spacing:0">${selCount>0?"("+selCount+" selected)":""}</span></div>
  ${S.employees.length?empHtml:'<div style="font-size:12px;color:var(--fg-muted);padding:8px 0">No employees yet.</div>'}
  <div class="modal-divider"></div>
  <div style="display:flex;justify-content:space-between;align-items:center">
    <button class="modal-cancel" onclick="closeModal()">Cancel</button>
    <button style="background:#dc2626;color:white;border:none;border-radius:var(--radius-sm);padding:10px 22px;font-size:13px;font-weight:600;cursor:pointer;opacity:${ready?1:0.45};pointer-events:${ready?"auto":"none"}" onclick="applyMultiClear()">
      Clear${ready?" "+selCount+" × "+_mc.days.length+" day"+(_mc.days.length!==1?"s":""):""}
    </button>
  </div>`;
  updateModal(h,"480px");
}

function mcPickTask(id){_mc.task=id;renderMultiClear();}
function mcToggleDay(d){const i=_mc.days.indexOf(d);if(i>=0)_mc.days.splice(i,1);else _mc.days.push(d);renderMultiClear();}
function mcToggleAllDays(){const allOn=S.activeDays.every(d=>_mc.days.includes(d));_mc.days=allOn?[]:[...S.activeDays];renderMultiClear();}
function mcToggleEmp(id){const i=_mc.empIds.indexOf(id);if(i>=0)_mc.empIds.splice(i,1);else _mc.empIds.push(id);renderMultiClear();}
function mcToggleEveryone(){const allOn=S.employees.every(e=>_mc.empIds.includes(e.id));_mc.empIds=allOn?[]:S.employees.map(e=>e.id);renderMultiClear();}

function applyMultiClear(){
  if(!_mc.days.length||!_mc.empIds.length)return;
  let cleared=0;
  _mc.empIds.forEach(empId=>{
    if(!S.schedule[empId])return;
    _mc.days.forEach(day=>{
      const dayData=S.schedule[empId][day];
      if(!dayData)return;
      if(_mc.task==="__all__"){
        // Wipe entire day
        S.schedule[empId][day]={status:"off",shifts:[]};
        cleared++;
      } else {
        // Remove only shifts matching this task (handles both legacy {task} and new {tasks:[]} format)
        const before=dayData.shifts.length;
        dayData.shifts=dayData.shifts.filter(sh=>!getShiftTasks(sh).includes(_mc.task));
        if(dayData.shifts.length===0)dayData.status="off";
        cleared+=before-dayData.shifts.length;
      }
    });
    updBadge(empId);
  });
  autoSave(null);
  closeModal();
  refreshGrid();
  const taskLabel=_mc.task==="__all__"?"all tasks":(TM()[_mc.task]?.label||_mc.task);
  toast(`Cleared ${taskLabel} for ${_mc.empIds.length} employee${_mc.empIds.length!==1?"s":""} across ${_mc.days.length} day${_mc.days.length!==1?"s":""}`);
  _mc={task:"__all__",days:[],empIds:[]};
}

function updBadge(empId){
  const el=document.getElementById(`hbadge_${empId}`);
  if(!el)return;
  const h=countH(S.schedule[empId]||{});
  const maxH=Math.max(...Object.values(S.schedule).map(s=>countH(s)),1);
  const pct=h/maxH;
  el.textContent=`${h}h`;
  el.className="emp-hrs "+(pct>0.6?"hrs-high":pct>0.3?"hrs-mid":"hrs-low");
}
function refreshGrid(){
  const gw=document.getElementById("gw");if(gw)gw.innerHTML=buildGrid();
  const mdv=document.getElementById("mdv");if(mdv)mdv.innerHTML=buildMobileDayView();
}

// ── WORK HOURS ──