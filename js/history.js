// ── HISTORY.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

function buildHistory(){
  const tm=TM();
  const period=S.hPeriod||"4w";
  const empFilter=S.hFilter||"all";
  const weekKeys=getHistoryWeekKeys(period);
  // Only weeks that have at least one saved schedule in that period
  const activeKeys=weekKeys.filter(k=>S.allSchedules.some(s=>s.week_start===k));

  let h=`<div class="card"><div class="hwrap">
  <div class="shdr"><div><div class="stitle">Schedule History</div><div class="ssub">Grouped by week — click any week to expand</div></div></div>
  <div class="h-period-bar">`;
  H_PERIODS.forEach(p=>{h+=`<button class="period-btn${period===p.id?" on":""}" onclick="S.hPeriod='${p.id}';render()">${p.label}</button>`;});
  h+=`</div>
  <div class="h-filter-bar">
    <span class="h-filter-label">Employee</span>
    <button class="h-emp-chip${empFilter==="all"?" on":""}" onclick="S.hFilter='all';render()">All</button>`;
  S.employees.forEach(e=>{h+=`<button class="h-emp-chip${empFilter===e.id?" on":""}" onclick="S.hFilter='${e.id}';render()">${esc(e.name.split(" ")[0])}</button>`;});
  h+=`</div>`;

  if(!activeKeys.length){h+=`<div class="empty">No history for this period.</div></div></div>`;return h;}

  activeKeys.forEach(wk=>{
    const ws=new Date(wk+"T12:00:00"),we=new Date(ws);we.setDate(we.getDate()+6);
    const thisWk=wkey(0);
    const isCurrent=wk===thisWk;
    // label
    const wkOff=Math.round((new Date(thisWk+"T12:00:00")-ws)/(7*86400000));
    const wkLabel=isCurrent?"This Week":wkOff===1?"Last Week":wkOff===2?"2 Weeks Ago":wkOff===3?"3 Weeks Ago":`${ws.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`;

    // Employees to show
    const empsToShow=empFilter==="all"?S.employees:S.employees.filter(e=>e.id===empFilter);
    const rows=empsToShow.filter(e=>S.allSchedules.some(s=>s.employee_id===e.id&&s.week_start===wk));
    if(!rows.length)return;

    // Stats
    let totalH=0,sickCount=0;
    rows.forEach(e=>{
      const s=S.allSchedules.find(sc=>sc.employee_id===e.id&&sc.week_start===wk);
      if(!s)return;
      const sched=migrateSched(s.schedule_data);
      totalH+=countH(sched);
      DAYS.forEach(d=>{if(sched[d]?.status==="sick")sickCount++;});
    });
    totalH=Math.round(totalH*10)/10;

    // Auto-open current week on first render
    if(isCurrent&&S.hOpen[wk]===undefined)S.hOpen[wk]=true;
    const isOpen=!!S.hOpen[wk];

    h+=`<div class="wk-group${isOpen?" open":""}" id="wkg_${wk}">
      <div class="wk-hdr${isCurrent?" is-current":""}" onclick="toggleHistoryWeek('${wk}')">
        <div class="wk-hdr-left">
          <span class="wk-badge ${isCurrent?"curr":"past"}">${wkLabel}</span>
          <span class="wk-date-str">${ws.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${we.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}<span>${rows.length} employee${rows.length!==1?"s":""} · ${totalH}h</span></span>
        </div>
        <div class="wk-hdr-right">
          <div class="wk-stat"><div class="wk-stat-v">${totalH}h</div><div class="wk-stat-l">scheduled</div></div>
          ${sickCount>0?`<div class="wk-stat"><div class="wk-stat-v" style="color:#c2410c">${sickCount}</div><div class="wk-stat-l">sick day${sickCount!==1?"s":""}</div></div>`:`<div class="wk-stat"><div class="wk-stat-v" style="color:var(--fg-muted)">—</div><div class="wk-stat-l">sick days</div></div>`}
          <div class="wk-chevron">▼</div>
        </div>
      </div>
      <div class="wk-body">`;

    // Collect tasks used this week for legend
    const usedTaskIds=new Set();

    rows.forEach(emp=>{
      const s=S.allSchedules.find(sc=>sc.employee_id===emp.id&&sc.week_start===wk);
      if(!s)return;
      const sched=migrateSched(s.schedule_data);
      const empH=countH(sched);
      const[abg,afg]=ac(emp.name);
      h+=`<div class="wk-emp-row">
        <div class="wk-name-col">
          <div class="avatar" style="background:${abg};color:${afg};width:28px;height:28px;font-size:11px;flex-shrink:0">${empInitials(emp.name)}</div>
          <div><div class="emp-name">${esc(emp.name)}</div><div class="emp-hrs">${empH}h</div></div>
        </div>
        <div class="wk-days-col">`;
      DAYS.forEach(d=>{
        const day=sched[d]||{status:"off",shifts:[]};
        const status=day.status||"off";
        const note=day.note||"";
        if(status==="sick"){
          h+=`<div class="dc2 chip-sick" title="${d}${note?" · "+esc(note):""}"><span class="dc-d">${d.slice(0,3).toUpperCase()}</span><span class="dc-t">🤒 Sick</span>${note?`<span class="dc-n">${esc(note)}</span>`:""}</div>`;
        } else if(status==="dayoff"){
          h+=`<div class="dc2" style="background:rgba(0,0,0,0.04);color:rgba(0,0,0,0.35);border-color:rgba(0,0,0,0.1)" title="${d}${note?" · "+esc(note):""}"><span class="dc-d">${d.slice(0,3).toUpperCase()}</span><span class="dc-t">📅 Off</span>${note?`<span class="dc-n">${esc(note)}</span>`:""}</div>`;
        } else if(status==="work"&&day.shifts?.length>0){
          const firstTask=getShiftTasks(day.shifts[0])[0];
          const t=tm[firstTask];
          if(t)usedTaskIds.add(firstTask);
          const multiLabel=day.shifts.length>1?`+${day.shifts.length-1}`:"";
          h+=`<div class="dc2" style="background:${t?t.bg:"var(--surface-sm)"};color:${t?t.text:"var(--fg-subtle)"};border-color:${t?t.dot+"40":"var(--border)"}" title="${d}: ${day.shifts.map(sh=>{const tid=getShiftTasks(sh)[0];return(tm[tid]?.label||tid)+(sh.start?` ${fmtRange(sh.start,sh.end)}`:"")+( day.note?" · "+day.note:"");}).join(", ")}">
            <span class="dc-d">${d.slice(0,3).toUpperCase()}</span>
            <span class="dc-t">${esc(t?.label||firstTask||"")}${multiLabel?`<span style="font-size:8px;opacity:.7"> ${multiLabel}</span>`:""}</span>
            ${day.shifts[0].start?`<span class="dc-r">${fmtRange(day.shifts[0].start,day.shifts[0].end)}</span>`:""}
            ${note?`<span class="dc-n">${esc(note)}</span>`:""}
          </div>`;
        } else {
          h+=`<div class="dc2" style="background:transparent;color:rgba(0,0,0,0.18);border-color:transparent"><span class="dc-d">${d.slice(0,3).toUpperCase()}</span><span class="dc-t">—</span></div>`;
        }
      });
      h+=`</div>
        <div class="wk-total-col"><div class="wk-total-v">${empH}h</div><div class="wk-total-l">total</div></div>
      </div>`;
    });

    // Legend
    const legendTasks=tasks.filter(t=>usedTaskIds.has(t.id));
    if(legendTasks.length){
      h+=`<div class="wk-legend"><span class="wk-legend-lbl">Tasks</span>`;
      legendTasks.forEach(t=>{h+=`<div style="display:flex;align-items:center;gap:5px;background:${t.bg};color:${t.text};padding:3px 8px;border-radius:20px;font-size:10px;font-weight:600;border:1px solid ${t.dot}30"><span style="width:5px;height:5px;border-radius:50%;background:${t.dot};display:inline-block"></span>${esc(t.label)}</div>`;});
      h+=`</div>`;
    }
    h+=`</div></div>`;
  });

  h+=`</div></div>`;return h;
}

// Team