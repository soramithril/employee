// ── SETTINGS.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

function openWHSettings(){
  const h=`<div class="modal-title">Work Hours</div>
  <div class="modal-sub">Set the day range for the schedule. Shifts are shown within this time window.</div>
  <div class="wh-form">
    <div class="wh-field"><label>Day Start</label><select id="wh_start">${buildHourOpts(WH.start)}</select></div>
    <div class="wh-field"><label>Day End</label><select id="wh_end">${buildHourOpts(WH.end)}</select></div>
  </div>
  <div class="info-box">Currently <strong>${fmtHour(WH.start,0)}</strong> to <strong>${fmtHour(WH.end,0)}</strong> — ${WH.end-WH.start}-hour window</div>
  <div style="display:flex;justify-content:space-between;align-items:center">
    <button class="modal-cancel" onclick="closeModal()">Cancel</button>
    <button class="modal-done" onclick="applyWH()">Apply</button>
  </div>`;
  openModal(h,"360px");
}
function applyWH(){
  const s=+document.getElementById("wh_start").value,e=+document.getElementById("wh_end").value;
  if(e<=s){toast("End must be after start","error");return;}
  WH={start:s,end:e};saveWH();closeModal();render();toast("Work hours updated");
}

// ── TASK MANAGER ──
function openTaskMgr(){openModal(buildTMHtml(),"460px");}
function buildTMHtml(){
  let h=`<div class="modal-title">Customize Tasks</div>
  <div class="modal-sub">Rename, recolor, or create tasks specific to your team.</div>
  <div id="tmList">`;
  tasks.forEach((t,i)=>{
    h+=`<div class="titem">
      <div class="tswatch" style="background:${t.dot}"><input type="color" value="${t.dot}" oninput="tmCC(${i},this.value)"></div>
      <input class="tname" value="${esc(t.label)}" oninput="tmLC(${i},this.value)"${t.builtIn?' title="Built-in"':''}>
      ${!t.builtIn?`<button class="tdelbtn" onclick="tmDel(${i})">Remove</button>`:`<span style="font-size:10px;color:rgba(0,0,0,0.28);flex-shrink:0;font-style:italic">default</span>`}
    </div>`;
  });
  h+=`</div>
  <div class="modal-divider"></div>
  <div class="sect-label">Add New Task</div>
  <div class="add-task-row">
    <div class="new-color-wrap" id="ncw" style="background:#1a7a3c"><input type="color" id="ncol" value="#1a7a3c" oninput="document.getElementById('ncw').style.background=this.value"></div>
    <input class="new-tname" id="nname" placeholder="e.g. Showing, Admin, Open House…" onkeydown="if(event.key==='Enter')tmAdd()">
    <button class="add-tbtn" onclick="tmAdd()">Add</button>
  </div>
  <div style="display:flex;justify-content:flex-end;margin-top:20px"><button class="modal-done" onclick="closeModal()">Done</button></div>`;
  return h;
}
function reTMList(){const el=document.getElementById("tmList");if(!el)return;let h="";tasks.forEach((t,i)=>{h+=`<div class="titem"><div class="tswatch" style="background:${t.dot}"><input type="color" value="${t.dot}" oninput="tmCC(${i},this.value)"></div><input class="tname" value="${esc(t.label)}" oninput="tmLC(${i},this.value)"${t.builtIn?' title="Built-in"':''}>` + (!t.builtIn?`<button class="tdelbtn" onclick="tmDel(${i})">Remove</button>`:`<span style="font-size:10px;color:rgba(0,0,0,0.28);flex-shrink:0;font-style:italic">default</span>`) + `</div>`;});el.innerHTML=h;}
function tmLC(i,v){tasks[i].label=v;saveTasks();}
function tmCC(i,hex){
  const[r,g,b]=hex2rgb(hex);
  tasks[i].dot=hex;
  tasks[i].bg=`rgba(${r},${g},${b},0.12)`;
  tasks[i].text=darken(hex);
  const sw=document.querySelectorAll(".tswatch");if(sw[i])sw[i].style.background=hex;
  saveTasks();
}
function tmDel(i){if(tasks[i].builtIn){toast("Can't delete default tasks","error");return;}const id=tasks[i].id;tasks.splice(i,1);Object.values(S.schedule).forEach(emp=>DAYS.forEach(d=>{if(emp[d]?.shifts){emp[d].shifts=emp[d].shifts.map(sh=>{const t=getShiftTasks(sh).filter(t=>t!==id);return{...sh,tasks:t};}).filter(sh=>sh.tasks.length>0);}if(emp[d]?.shifts?.length===0&&emp[d]?.status==="work")emp[d].status="off";}));saveTasks();reTMList();toast("Task deleted");}
function tmAdd(){const n=document.getElementById("nname"),c=document.getElementById("ncol");const nm=(n?.value||"").trim();if(!nm){toast("Enter a task name","error");return;}const hex=c?.value||"#1a7a3c";const[r,g,b]=hex2rgb(hex);tasks.push({id:"c"+Date.now(),label:nm,bg:`rgba(${r},${g},${b},0.12)`,text:darken(hex),dot:hex});saveTasks();if(n)n.value="";reTMList();toast(`"${nm}" added`);}

// ── RENDER ──