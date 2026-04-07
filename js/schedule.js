// ── SCHEDULE.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

function render(){
  const app=document.getElementById("app");
  const labelMap={schedule:"Schedule",history:"History",analytics:"Analytics",team:"Team","tasks":"Tasks",summer:"Summer",winter:"Winter",inventory:"Inventory",clothing:"Clothing"};
  // Sync desktop nav
  document.querySelectorAll(".tab-btn").forEach(b=>{b.classList.toggle("active",b.textContent.trim()===labelMap[S.tab]);});
  // Sync mobile nav
  ["schedule","summer","winter","team","inventory","clothing"].forEach(t=>{
    const el=document.getElementById("mnav-"+t);
    if(el)el.classList.toggle("active",S.tab===t);
  });
  document.getElementById("empCount").textContent=`${S.employees.length} employee${S.employees.length!==1?"s":""}`;
  if(S.tab==="schedule")app.innerHTML=buildSched();
  else if(S.tab==="history")app.innerHTML=buildHistory();
  else if(S.tab==="analytics"){app.innerHTML=buildAnalytics();requestAnimationFrame(()=>animateCounters());}
  else if(S.tab==="tasks"){app.innerHTML=buildTasksPage();initTasksPage();}
  else if(S.tab==="summer"){app.innerHTML=buildSummerPage();initSummerPage();}
  else if(S.tab==="winter"){app.innerHTML=buildWinterPage();initWinterPage();}
  else if(S.tab==="inventory"){app.innerHTML=buildInventoryPage();initInventoryPage();}
  else if(S.tab==="clothing"){app.innerHTML=buildClothingPage();initClothingPage();}
  else{app.innerHTML=buildTeam();initTeamDrag();}
  updateFAB();
}

// ── SCHEDULE ──
function buildSched(){
  const ws=getWS(S.weekOffset);
  let h=`<div class="card">
  <div class="week-nav">
    <button class="nav-btn" onclick="prevW()">← Prev</button>
    <div class="week-label"><strong>${wlbl(S.weekOffset)}</strong><span>${fmtW(ws)}</span></div>
    <div style="display:flex;gap:6px">${S.weekOffset!==0?`<button class="nav-btn" onclick="goToday()">Today</button>`:""}<button class="nav-btn" onclick="nextW()">Next →</button></div>
  </div>
  <div class="ctrl-bar">
    <span class="ctrl-label">Days</span>`;

  // Weekdays first (always shown prominently), weekends as toggleable
  WEEKDAYS.forEach(d=>{
    h+=`<button class="day-toggle${S.activeDays.includes(d)?" on":""}" onclick="toggleDay('${d}')">${d.slice(0,3)}</button>`;
  });
  h+=`<div class="ctrl-sep"></div>
    <span class="ctrl-label" style="font-size:9px;opacity:.7">Weekend</span>`;
  WEEKEND.forEach(d=>{
    h+=`<button class="day-toggle weekend${S.activeDays.includes(d)?" on":""}" onclick="toggleDay('${d}')">${d.slice(0,3)}</button>`;
  });

  h+=`<div class="ctrl-sep"></div>
    <div class="ctrl-actions">
      <button class="ctrl-btn" onclick="openTaskMgr()">⚙ Tasks</button>
      <button class="ctrl-btn ctrl-btn-accent" onclick="openMultiAssign()">👥 Assign</button>
      <button class="ctrl-btn ctrl-btn-danger" onclick="openMultiClear()">🗑 Clear</button>
      <button class="ctrl-btn" onclick="openWHSettings()" title="Change visible work hours">⏰ ${fmtHour(WH.start,0)}–${fmtHour(WH.end,0)}</button>
    </div>
    <button class="ctrl-btn ctrl-more-btn" onclick="this.closest('.ctrl-bar').classList.toggle('ctrl-expanded')"><span class="ctrl-more-btn-label">☰ More</span></button>
  </div>`;
  if(!S.employees.length){
    h+=`<div class="empty" style="padding:52px 24px;display:flex;flex-direction:column;align-items:center;gap:16px">
      <div style="width:72px;height:72px;border-radius:50%;background:var(--accent-light);display:flex;align-items:center;justify-content:center;font-size:32px;">👥</div>
      <div style="text-align:center">
        <div style="font-size:16px;font-weight:700;color:var(--fg);margin-bottom:6px">No employees yet</div>
        <div style="font-size:13px;color:var(--fg-muted);max-width:260px;line-height:1.5">Head to the <strong>Team</strong> tab to add your staff, then come back to start scheduling.</div>
      </div>
      <button class="modal-done" style="padding:10px 24px" onclick="switchTab('team')">Go to Team →</button>
    </div>`;
  } else {
    h+=`<div class="grid-wrap" id="gw">${buildGrid()}</div>`;
    h+=`<div class="mobile-day-view" id="mdv">${buildMobileDayView()}</div>`;
    h+=`<div class="save-bar" id="save-bar"><span id="save-status"></span><span style="font-size:10px;color:var(--fg-subtle)">Auto-saves as you edit</span></div>`;
  }
  const result=h+`</div>`;
  // After HTML is set, init grid drag
  setTimeout(initGridDrag,0);
  return result;
}

// ── GRID ──
function buildGrid(){
  const ws=getWS(S.weekOffset),tm=TM();
  const daySpan=WH.end-WH.start;
  const todayName=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
  const isCurrentWeek=S.weekOffset===0;

  let ticksHtml="";
  for(let hr=WH.start;hr<=WH.end;hr+=2){
    ticksHtml+=`<div class="time-tick">${fmtHour(hr,0)}</div>`;
  }

  let h=`<table class="sched-grid"><thead><tr><th class="name-col">EMPLOYEE</th>`;
  S.activeDays.forEach(d=>{
    const dt=new Date(ws);dt.setDate(dt.getDate()+DAYS.indexOf(d));
    const isWknd=WEEKEND.includes(d);
    const isToday=isCurrentWeek&&d===todayName;
    h+=`<th class="day-col${isToday?" is-today":""}"${isWknd&&!isToday?' style="background:#fafaf8;"':''}>
      <div class="th-day-wrap${isToday?" is-today":""}">
        <div class="th-day${isToday?" is-today":""}"${isWknd&&!isToday?' style="color:#888;"':''}>${d.slice(0,3).toUpperCase()}</div>
        <div class="th-date${isToday?" is-today":""}">${dt.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
        ${isToday?`<div class="today-dot"></div>`:""}
      </div>
      <div class="time-ruler">${ticksHtml}</div>
    </th>`;
  });
  h+=`</tr></thead><tbody>`;

  S.employees.forEach((emp,empIdx)=>{
    const sc=S.schedule[emp.id]||defSched();
    const hrs=countH(sc);
    const[abg,afg]=ac(emp.name);
    // Workload ring: max ~40h/week
    const maxH=Math.max(...Object.values(S.schedule).map(s=>countH(s)),1);
    const pct=Math.min(hrs/Math.max(maxH,1),1);
    const r=16,circ=2*Math.PI*r,dash=(pct*circ).toFixed(2),gap=(circ-pct*circ).toFixed(2);
    const ringColor=pct>0.7?"#1a7a3c":pct>0.35?"#f59e0b":"transparent";
    const hrsCls=pct>0.6?"hrs-high":pct>0.3?"hrs-mid":"hrs-low";
    const tipText=hrs>0?`${hrs}h scheduled this week`:"No hours this week";
    h+=`<tr class="emp-row" draggable="true" data-empid="${emp.id}" data-empidx="${empIdx}">
      <td class="name-col">
        <div class="emp-cell-inner">
          <span class="drag-handle" data-tip="Drag to reorder" title="Drag to reorder">⠿</span>
          <div class="avatar" data-tip="${tipText}" style="background:${abg};color:${afg};width:38px;height:38px;font-size:12px;flex-shrink:0">${empInitials(emp.name)}</div>
          <div><div class="emp-name">${esc(emp.name)}</div><div class="emp-hrs ${hrsCls}" id="hbadge_${emp.id}">${hrs}h</div></div>
        </div>
      </td>`;
    S.activeDays.forEach(d=>{
      const dayData=sc[d]||{status:"off",shifts:[]};
      const status=dayData.status||"off";
      const shifts=dayData.shifts||[];
      const isWknd=WEEKEND.includes(d);
      let cellContent="";

      if(status==="off"){
        cellContent=``;
      } else if(status==="dayoff"){
        cellContent=`<div class="status-label day-off-label">📅 Day Off</div>`;
      } else if(status==="sick"){
        cellContent=`<div class="status-label sick-label">🤒 Sick</div>`;
      } else if(shifts.length>0){
        cellContent=`<div class="shift-stack">`;
        shifts.forEach((sh,i)=>{
          const taskIds=getShiftTasks(sh);
          const firstT=tm[taskIds[0]]||{bg:"#dcfce7",text:"#15803d",dot:"#22c55e",label:taskIds[0]||"?"};
          const allLabels=taskIds.map(id=>tm[id]?.label||id).join(" + ");
          const timeStr=sh.start&&sh.end?fmtRange(sh.start,sh.end):"";
          cellContent+=`<div class="shift-bar shift-bar-flow" style="background:${firstT.bg};color:${firstT.text};border:1.5px solid ${firstT.dot}40;"
            onclick="event.stopPropagation();openShiftModal('${emp.id}','${d}')">
            <span class="shift-label">${esc(allLabels)}</span>
            ${timeStr?`<span class="shift-times">${timeStr}</span>`:""}
          </div>`;
        });
        cellContent+=`</div>`;
      } else {
        cellContent=``;
      }

      const cellStyle=isWknd?'background:#fafaf8;':'';
      const sickStyle=status==="sick"?'background:rgba(249,115,22,0.06);':'';
      const dayOffStyle=status==="dayoff"?'background:rgba(0,0,0,0.04);':'';
      const isTodayCell=isCurrentWeek&&d===todayName;
      const noteIndicator=dayData.note?`<span title="${esc(dayData.note)}" data-tip="${esc(dayData.note)}" style="position:absolute;top:4px;right:4px;width:7px;height:7px;border-radius:50%;background:#f59e0b;box-shadow:0 0 0 2px white,0 0 6px rgba(245,158,11,0.5);z-index:2;pointer-events:none;animation:notePulse 2s ease-in-out infinite"></span>`:'';
      h+=`<td class="day-cell${isTodayCell?" is-today":""}" style="${cellStyle}${sickStyle}${dayOffStyle}" onclick="openShiftModal('${emp.id}','${d}')">${cellContent}${noteIndicator}</td>`;
    });
    h+=`</tr>`;
  });
  h+=`</tbody></table>`;
  return h;
}

// ── MOBILE DAY CARD VIEW ──
function setMobileDay(idx){S.mobileDayIdx=idx;render();}

function buildMobileDayView(){
  const ws=getWS(S.weekOffset),tm=TM();
  const todayName=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
  const isCurrentWeek=S.weekOffset===0;
  const days=S.activeDays;
  if(!days.length)return`<div class="empty" style="padding:24px;text-align:center;color:var(--fg-muted);">No days selected</div>`;
  if(S.mobileDayIdx>=days.length)S.mobileDayIdx=0;
  const selDay=days[S.mobileDayIdx];

  // Day tabs row
  let h=`<div class="mday-tabs">`;
  days.forEach((d,i)=>{
    const dt=new Date(ws);dt.setDate(dt.getDate()+DAYS.indexOf(d));
    const isToday=isCurrentWeek&&d===todayName;
    h+=`<button class="mday-tab${S.mobileDayIdx===i?" active":""}${isToday?" is-today":""}" onclick="setMobileDay(${i})">
      <span class="mdt-name">${d.slice(0,3).toUpperCase()}</span>
      <span class="mdt-date">${dt.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
      <span class="mdt-dot"></span>
    </button>`;
  });
  h+=`</div>`;

  // Employee cards for selected day
  h+=`<div class="mday-cards">`;
  if(!S.employees.length){
    h+=`<div class="empty" style="padding:32px 16px;text-align:center;color:var(--fg-muted);font-size:13px;">No employees yet — go to Team tab to add staff</div>`;
  } else {
    S.employees.forEach(emp=>{
      const sc=S.schedule[emp.id]||defSched();
      const dayData=sc[selDay]||{status:"off",shifts:[]};
      const status=dayData.status||"off";
      const shifts=dayData.shifts||[];
      const[abg,afg]=ac(emp.name);

      let badgeCls="off",badgeTxt="Off",shiftInfo="Tap to schedule";
      if(status==="sick"){
        badgeCls="sick";badgeTxt="🤒 Sick";shiftInfo="Sick day";
      } else if(status==="dayoff"){
        badgeCls="dayoff";badgeTxt="📅 Day Off";shiftInfo="Day off";
      } else if(shifts.length>0){
        const taskLabels=shifts.map(sh=>shiftTaskLabel(sh,tm));
        const firstTime=shifts[0].start&&shifts[0].end?` · ${fmtRange(shifts[0].start,shifts[0].end)}`:"";
        shiftInfo=taskLabels.slice(0,2).join(", ")+(shifts.length>2?` +${shifts.length-2} more`:"")+firstTime;
        badgeCls="working";badgeTxt=`${shifts.length} task${shifts.length>1?"s":""}`;
      }
      const noteIcon=dayData.note?` <span title="${esc(dayData.note)}" style="color:#f59e0b;font-size:11px;">●</span>`:"";
      h+=`<div class="mday-emp-card" onclick="openShiftModal('${emp.id}','${selDay}')">
        <div class="mday-card-avatar" style="background:${abg};color:${afg};">${empInitials(emp.name)}</div>
        <div class="mday-card-info">
          <div class="mday-card-name">${esc(emp.name)}${noteIcon}</div>
          <div class="mday-card-shift">${esc(shiftInfo)}</div>
        </div>
        <span class="mday-card-badge ${badgeCls}">${badgeTxt}</span>
      </div>`;
    });
  }
  h+=`</div>`;
  return h;
}

function prevW(){S.weekOffset--;loadWeekSched();render();}
function nextW(){S.weekOffset++;loadWeekSched();render();}
function goToday(){S.weekOffset=0;loadWeekSched();render();}
function toggleDay(d){
  const i=S.activeDays.indexOf(d);
  if(i>=0)S.activeDays.splice(i,1);
  else S.activeDays=[...DAYS.filter(x=>[...S.activeDays,d].includes(x))];
  // Clamp mobileDayIdx if days were removed
  if(S.mobileDayIdx>=S.activeDays.length)S.mobileDayIdx=0;
  render();
}
function loadWeekSched(){const w=wkey(S.weekOffset);S.employees.forEach(e=>{const f=S.allSchedules.find(s=>s.employee_id===e.id&&s.week_start===w);S.schedule[e.id]=f?migrateSched(JSON.parse(JSON.stringify(f.schedule_data))):defSched();});}

// ── AUTO-SAVE (debounced) ──
let _autoSaveTimer=null;
// Snapshot: {weekKey, ws, snapshot[]} captured at call time so navigation can't corrupt the save
let _pendingSave=null;
function autoSave(empId){
  const ws=getWS(S.weekOffset);
  const w=localDateStr(ws);
  // Snapshot the changed employee(s) RIGHT NOW
  const toSave=empId?S.employees.filter(e=>e.id===empId):S.employees;
  const newEntries=toSave.map(e=>({emp:e,data:JSON.parse(JSON.stringify(S.schedule[e.id]||defSched()))}));
  if(_pendingSave&&_pendingSave.w===w){
    // Merge: update existing entries for same week, add any new ones
    newEntries.forEach(ne=>{const idx=_pendingSave.snapshot.findIndex(s=>s.emp.id===ne.emp.id);if(idx>=0)_pendingSave.snapshot[idx]=ne;else _pendingSave.snapshot.push(ne);});
  } else {
    _pendingSave={w,ws,snapshot:newEntries};
  }
  showSaveStatus("saving");
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer=setTimeout(()=>_doAutoSave(),800);
}
async function _doAutoSave(){
  if(!_pendingSave)return;
  const{w,ws,snapshot}=_pendingSave;
  _pendingSave=null;
  try{
    await Promise.all(snapshot.map(({emp,data})=>upsertSched(emp.id,ws,data)));
    snapshot.forEach(({emp,data})=>{const i=S.allSchedules.findIndex(s=>s.employee_id===emp.id&&s.week_start===w);const en={id:`${emp.id}_${w}`,employee_id:emp.id,week_start:w,schedule_data:data};if(i>=0)S.allSchedules[i]=en;else S.allSchedules.push(en);});
    showSaveStatus("saved");
  }catch(e){showSaveStatus("error");toast("Auto-save failed: "+e.message,"error");}
}
function showSaveStatus(state){setSaveStatus(state);}

// Analytics
function getPeriodWeeks(period){
  // Returns array of {key, label} for weeks in the selected period, most recent first
  const thisMonday=getWS(0);
  const weeks=[];
  const addW=(off,lbl)=>{
    const k=localDateStr(getWS(off));
    weeks.push({key:k,label:lbl||( off===0?"This Week":off===-1?"Last Week":`${-off} Weeks Ago`),offset:off});
  };
  if(period==="this_week"){addW(0,"This Week");}
  else if(period==="last_week"){addW(-1,"Last Week");}
  else if(period==="2w"){addW(0);addW(-1);}
  else if(period==="4w"){for(let i=0;i<4;i++)addW(-i);}
  else if(period==="this_month"){
    // Weeks whose Monday falls in current calendar month
    const m=thisMonday.getMonth(),y=thisMonday.getFullYear();
    for(let i=0;i<6;i++){const d=getWS(-i);if(d.getFullYear()===y&&d.getMonth()===m)addW(-i);}
  }
  else if(period==="last_month"){
    const ref=new Date(thisMonday);ref.setDate(1);ref.setMonth(ref.getMonth()-1);
    const lm=ref.getMonth(),ly=ref.getFullYear();
    for(let i=1;i<9;i++){const d=getWS(-i);if(d.getFullYear()===ly&&d.getMonth()===lm)addW(-i);}
  }
  else if(period==="3m"){for(let i=0;i<13;i++)addW(-i);}
  else if(period==="6m"){for(let i=0;i<26;i++)addW(-i);}
  else if(period==="year"){for(let i=0;i<52;i++)addW(-i);}
  else if(period==="all"){
    // Use all saved schedule weeks, sorted descending
    const allKeys=[...new Set(S.allSchedules.map(s=>s.week_start))].sort((a,b)=>b.localeCompare(a));
    allKeys.forEach((k,i)=>{const ws=new Date(k+"T12:00:00");weeks.push({key:k,label:i===0?"Most Recent":`${ws.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`,offset:null});});
  }
  return weeks;
}

function getWeekStats(weekKey){
  const tally=Object.fromEntries(tasks.map(t=>[t.id,0]));
  let totalH=0,daysOff=0,daysSick=0,daysWorked=0;
  S.employees.forEach(emp=>{
    const s=S.allSchedules.find(sc=>sc.employee_id===emp.id&&sc.week_start===weekKey);
    if(!s)return;
    const sched=migrateSched(s.schedule_data);
    totalH+=countH(sched);
    DAYS.forEach(d=>{
      const day=sched?.[d];
      if(!day)return;
      if(day.status==="sick")daysSick++;
      else if(day.status==="dayoff")daysOff++;  // only explicit day-off, not default "off"
      else if(day.status==="work"&&day.shifts?.length>0){daysWorked++;day.shifts.forEach(sh=>{getShiftTasks(sh).forEach(t=>{tally[t]=(tally[t]||0)+1;});});}
    });
  });
  return{totalH:Math.round(totalH*10)/10,daysOff,daysSick,daysWorked,tally};
}

const PERIODS=[
  {id:"this_week",label:"This Week"},
  {id:"last_week",label:"Last Week"},
  {id:"2w",label:"2 Weeks"},
  {id:"4w",label:"4 Weeks"},
  {id:"this_month",label:"This Month"},
  {id:"last_month",label:"Last Month"},
  {id:"3m",label:"3 Months"},
  {id:"6m",label:"6 Months"},
  {id:"year",label:"1 Year"},
  {id:"all",label:"All Time"},
];
