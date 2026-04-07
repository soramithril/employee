// ── SHIFTS.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

// ── OVERLAP CHECK ──
function shiftsOverlap(a,b){
  if(!a.start||!a.end||!b.start||!b.end)return false;
  const[as2,am]=a.start.split(":").map(Number),[ae,aem]=a.end.split(":").map(Number);
  const[bs,bm]=b.start.split(":").map(Number),[be,bem]=b.end.split(":").map(Number);
  return(as2+am/60)<(be+bem/60)&&(ae+aem/60)>(bs+bm/60);
}
function hasOverlap(shifts,newShift,skipIdx){
  return shifts.some((sh,i)=>i!==skipIdx&&shiftsOverlap(newShift,sh));
}
// Returns an array of task IDs for a shift (handles both new {tasks:[]} and legacy {task:""} format)
function getShiftTasks(sh){if(!sh)return[];return sh.tasks&&sh.tasks.length?sh.tasks:(sh.task?[sh.task]:[]);}
// Returns display label for shift tasks, joining with " + "
function shiftTaskLabel(sh,tm){return getShiftTasks(sh).map(id=>(tm[id]?.label||id)).join(" + ")||"(no task)";}

// ── SHIFT MODAL ──
let _selTasks=[];  // array of selected task IDs (supports multi-task)
let _editShiftIdx=null;
let _editEmpId=null;
let _editDay=null;
function openShiftModal(empId,day){
  const emp=S.employees.find(e=>e.id===empId);
  if(!S.schedule[empId])S.schedule[empId]=defSched();
  const dayData=S.schedule[empId][day]||{status:"off",shifts:[]};
  _selTasks=[];
  _editShiftIdx=null;
  renderShiftModal(empId,day,emp,dayData);
}
function renderShiftModal(empId,day,emp,dayData){
  const tm=TM();
  const defStart=`${WH.start}:00`,defEnd=`${WH.end}:00`;
  const shifts=dayData.shifts||[];
  const status=dayData.status||"off";

  // Status banners for sick / dayoff
  let statusBanner="";
  if(status==="sick"){
    statusBanner=`<div style="background:rgba(249,115,22,0.08);border:1.5px solid rgba(249,115,22,0.3);border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-weight:700;font-size:13px;color:#c2410c">🤒 Called In Sick</span>
      <button onclick="clearDayStatus('${empId}','${day}')" style="background:rgba(239,68,68,0.1);color:#dc2626;border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:5px 11px;font-size:11px;font-weight:600;cursor:pointer;">Remove</button>
    </div>`;
  } else if(status==="dayoff"){
    statusBanner=`<div style="background:rgba(0,0,0,0.05);border:1.5px solid rgba(0,0,0,0.14);border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-weight:700;font-size:13px;color:rgba(0,0,0,0.45)">📅 Day Off</span>
      <button onclick="clearDayStatus('${empId}','${day}')" style="background:rgba(239,68,68,0.1);color:#dc2626;border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:5px 11px;font-size:11px;font-weight:600;cursor:pointer;">Remove</button>
    </div>`;
  }

  // Build existing shifts list — with edit support
  let shiftListHtml="";
  if(shifts.length>0){
    shiftListHtml=`<div class="sect-label" style="margin-top:4px;margin-bottom:6px">Scheduled Tasks</div>`;
    shifts.forEach((sh,i)=>{
      const taskIds=getShiftTasks(sh);
      const firstT=tm[taskIds[0]];
      const allLabels=taskIds.map(id=>tm[id]?.label||id).join(" + ");
      if(_editShiftIdx===i){
        // Editing this entry inline
        shiftListHtml+=`<div style="background:${firstT?.bg||"#f5f5f5"};border:2px solid ${firstT?.dot||"#ccc"};border-radius:8px;padding:10px 12px;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${firstT?.dot||"#ccc"};display:inline-block;flex-shrink:0"></span>
            <span style="font-weight:700;font-size:12px;color:${firstT?.text||"#333"}">${esc(allLabels)}</span>
            <span style="font-size:10px;color:${firstT?.text||"#333"};opacity:.6;margin-left:auto">editing</span>
          </div>
          <div class="shift-form" style="margin-bottom:8px;">
            <div><div class="sf-label">Start</div><select class="sf-select" id="edit_s${i}">${buildTimeOpts(sh.start||defStart)}</select></div>
            <div><div class="sf-label">End</div><select class="sf-select" id="edit_e${i}">${buildTimeOpts(sh.end||defEnd)}</select></div>
          </div>
          <div style="display:flex;gap:6px;justify-content:flex-end;">
            <button onclick="cancelEditShift()" style="background:transparent;border:1px solid rgba(0,0,0,0.15);border-radius:5px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;color:var(--fg-muted)">Cancel</button>
            <button onclick="saveEditShift('${empId}','${day}',${i})" style="background:var(--accent);color:white;border:none;border-radius:5px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;">Save</button>
          </div>
        </div>`;
      } else {
        shiftListHtml+=`<div style="background:${firstT?.bg||"#f5f5f5"};border:1.5px solid ${firstT?.dot||"#ccc"}40;border-radius:8px;padding:8px 10px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:6px;">
          <div style="display:flex;align-items:center;gap:7px;min-width:0;">
            <span style="width:8px;height:8px;border-radius:50%;background:${firstT?.dot||"#ccc"};display:inline-block;flex-shrink:0"></span>
            <span style="font-weight:700;font-size:12px;color:${firstT?.text||"#333"}">${esc(allLabels)}</span>
            <span style="font-size:11px;color:${firstT?.text||"#333"};opacity:.7;white-space:nowrap">${fmtRange(sh.start,sh.end)}</span>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;">
            <button onclick="startEditShift('${empId}','${day}',${i})" style="background:rgba(26,122,60,0.1);color:var(--accent);border:1px solid rgba(26,122,60,0.2);border-radius:5px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer">✎</button>
            <button onclick="removeShiftEntry('${empId}','${day}',${i})" style="background:rgba(239,68,68,0.1);color:#dc2626;border:1px solid rgba(239,68,68,0.2);border-radius:5px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer">✕</button>
          </div>
        </div>`;
      }
    });
  }

  let h=`<div class="modal-title">${esc(emp?.name||"")} — ${day}</div>
  <div class="modal-sub">Manage tasks for this day, or mark as Day Off / Sick.</div>
  ${statusBanner}
  ${shiftListHtml}
  <div class="modal-divider"></div>
  <div class="sect-label">Add Task</div>
  <div class="shift-form">
    <div><div class="sf-label">Start</div><select class="sf-select" id="sm_start">${buildTimeOpts(defStart)}</select></div>
    <div><div class="sf-label">End</div><select class="sf-select" id="sm_end">${buildTimeOpts(defEnd)}</select></div>
  </div>
  <div class="sect-label">Role / Task</div>
  <div class="task-grid">`;
  tasks.filter(t=>t.id!=="off"&&t.id!=="sick").forEach(t=>{
    h+=`<button class="task-opt" id="topt_${t.id}"
      style="background:${t.bg};color:${t.text};border-color:transparent"
      onclick="pickTask('${t.id}')">
      <span style="width:7px;height:7px;border-radius:50%;background:${t.dot};flex-shrink:0;display:inline-block"></span>
      ${esc(t.label)}
    </button>`;
  });
  h+=`</div>
  <div class="modal-divider"></div>
  <div class="day-note-wrap">
    <div class="sect-label">📝 Notes <span style="font-weight:400;opacity:.6;text-transform:none;letter-spacing:0">(optional)</span></div>
    <textarea class="day-note" id="day_note" rows="2" placeholder="e.g. Leaving early at 2pm, covering for Sarah, key with manager…" oninput="saveDayNote('${empId}','${day}',this.value)">${esc(dayData.note||"")}</textarea>
  </div>
  <div class="modal-divider"></div>
  <div class="modal-footer-status">
    <button class="mfs-btn mfs-dayoff" onclick="markDayOff('${empId}','${day}')">📅 Day Off</button>
    <button class="mfs-btn mfs-sick" onclick="markDaySick('${empId}','${day}')">🤒 Called In Sick</button>
  </div>
  <div class="modal-footer-main">
    <button class="modal-cancel" onclick="closeSaveShift('${empId}','${day}')">Cancel</button>
    <button class="modal-add-btn" onclick="addShiftEntry('${empId}','${day}')">+ Add Task &amp; Save</button>
  </div>`;
  openModal(h,"460px");
}

function startEditShift(empId,day,idx){
  _editShiftIdx=idx;
  _editEmpId=empId;
  _editDay=day;
  const emp=S.employees.find(e=>e.id===empId);
  const dayData=S.schedule[empId][day];
  renderShiftModal(empId,day,emp,dayData);
}
function cancelEditShift(){
  _editShiftIdx=null;
  if(_editEmpId&&_editDay){
    const emp=S.employees.find(e=>e.id===_editEmpId);
    const dayData=S.schedule[_editEmpId]?.[_editDay];
    if(emp&&dayData)renderShiftModal(_editEmpId,_editDay,emp,dayData);
  }
}

function saveEditShift(empId,day,idx){
  const s=document.getElementById(`edit_s${idx}`)?.value;
  const e=document.getElementById(`edit_e${idx}`)?.value;
  if(s&&e){
    const[sh,sm]=s.split(":").map(Number),[eh,em]=e.split(":").map(Number);
    if((eh+em/60)<=(sh+sm/60)){toast("End time must be after start","error");return;}
  }
  if(hasOverlap(S.schedule[empId][day].shifts||[],{start:s,end:e},idx)){toast("This shift overlaps with an existing one — adjust the times","error");return;}
  S.schedule[empId][day].shifts[idx].start=s;
  S.schedule[empId][day].shifts[idx].end=e;
  _editShiftIdx=null;
  const emp=S.employees.find(e=>e.id===empId);
  renderShiftModal(empId,day,emp,S.schedule[empId][day]);
  refreshGrid();updBadge(empId);
  autoSave(empId);
  toast("Time updated");
}

function pickTask(id){
  const i=_selTasks.indexOf(id);
  if(i>=0) _selTasks.splice(i,1); else _selTasks.push(id);
  const tm=TM();
  document.querySelectorAll(".task-opt[id^='topt_']").forEach(b=>{b.classList.remove("sel");b.style.borderColor="transparent";});
  _selTasks.forEach(tid=>{
    const el=document.getElementById("topt_"+tid);
    if(el){el.classList.add("sel");const t=tm[tid];if(t)el.style.borderColor=t.dot;}
  });
}

function addShiftEntry(empId,day){
  const s=document.getElementById("sm_start")?.value;
  const e=document.getElementById("sm_end")?.value;
  if(!_selTasks.length){toast("Select at least one task first","error");return;}
  if(s&&e){
    const[sh,sm]=s.split(":").map(Number),[eh,em]=e.split(":").map(Number);
    if((eh+em/60)<=(sh+sm/60)){toast("End time must be after start","error");return;}
  }
  if(!S.schedule[empId])S.schedule[empId]=defSched();
  const dayData=S.schedule[empId][day];
  const newShift={tasks:[..._selTasks],start:s,end:e};
  if(hasOverlap(dayData.shifts||[],newShift,-1)){toast("This shift overlaps with an existing one — adjust the times","error");return;}
  dayData.status="work";
  dayData.shifts=[...(dayData.shifts||[]),newShift];
  _selTasks=[];
  closeModal();
  refreshGrid();updBadge(empId);autoSave(empId);
  const tm=TM();
  const label=newShift.tasks.map(id=>tm[id]?.label||id).join(" + ");
  toast(`"${label}" added ✓`);
}

function removeShiftEntry(empId,day,idx){
  if(!S.schedule[empId])return;
  const dayData=S.schedule[empId][day];
  dayData.shifts.splice(idx,1);
  if(dayData.shifts.length===0)dayData.status="off";
  const emp=S.employees.find(e=>e.id===empId);
  renderShiftModal(empId,day,emp,dayData);
  refreshGrid();updBadge(empId);autoSave(empId);
}

function markDayOff(empId,day){
  if(!S.schedule[empId])S.schedule[empId]=defSched();
  S.schedule[empId][day]={status:"dayoff",shifts:[]};
  closeModal();refreshGrid();updBadge(empId);autoSave(empId);
}

function markDaySick(empId,day){
  if(!S.schedule[empId])S.schedule[empId]=defSched();
  S.schedule[empId][day]={status:"sick",shifts:[]};
  closeModal();refreshGrid();updBadge(empId);autoSave(empId);
}

function clearDayStatus(empId,day){
  if(!S.schedule[empId])S.schedule[empId]=defSched();
  S.schedule[empId][day]={status:"off",shifts:[]};
  const emp=S.employees.find(e=>e.id===empId);
  renderShiftModal(empId,day,emp,S.schedule[empId][day]);
  refreshGrid();updBadge(empId);autoSave(empId);
}

function closeSaveShift(empId,day){
  closeModal();refreshGrid();updBadge(empId);
}
function saveDayNote(empId,day,val){
  if(!S.schedule[empId])S.schedule[empId]=defSched();
  S.schedule[empId][day].note=val.trim();
  autoSave(empId);
}
