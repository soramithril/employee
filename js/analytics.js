// ── ANALYTICS.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

function buildAnalytics(){
  const tm=TM();
  const period=S.aPeriod||"4w";
  const weeks=getPeriodWeeks(period);
  const allWks=weeks.map(w=>w.key);
  const periodLabel=PERIODS.find(p=>p.id===period)?.label||period;

  let h=`<div class="card"><div class="awrap">
  <div class="shdr">
    <div><div class="stitle">Weekly Analytics</div><div class="ssub">Stats broken down by week</div></div>
  </div>
  <div class="period-selector">`;
  PERIODS.forEach(p=>{h+=`<button class="period-btn${period===p.id?" on":""}" onclick="S.aPeriod='${p.id}';render()">${p.label}</button>`;});
  h+=`</div>`;

  if(!S.employees.length){h+=`<div class="empty">No data yet.</div></div></div>`;return h;}

  // Aggregate stats across period
  const empData=S.employees.map(emp=>{
    const ss=S.allSchedules.filter(s=>s.employee_id===emp.id&&allWks.includes(s.week_start));
    const totalH=ss.reduce((n,s)=>n+countH(migrateSched(s.schedule_data)),0);
    const tally=Object.fromEntries(tasks.map(t=>[t.id,0]));
    let daysOff=0,daysSick=0;
    ss.forEach(s=>{
      const sched=migrateSched(s.schedule_data);
      DAYS.forEach(d=>{
        const day=sched?.[d];
        if(!day)return;
        if(day.status==="sick")daysSick++;
        else if(day.status==="dayoff")daysOff++;  // only explicit day-off
        else if(day.status==="work"&&day.shifts)day.shifts.forEach(sh=>{getShiftTasks(sh).forEach(tid=>{tally[tid]=(tally[tid]||0)+1;});});
      });
    });
    return{...emp,totalH:Math.round(totalH*10)/10,tally,daysOff,daysSick};
  }).sort((a,b)=>b.totalH-a.totalH);

  const mxH=Math.max(...empData.map(d=>d.totalH),1);
  const totH=Math.round(empData.reduce((n,e)=>n+e.totalH,0)*10)/10;
  const totSick=empData.reduce((n,e)=>n+e.daysSick,0);
  const totOff=empData.reduce((n,e)=>n+e.daysOff,0);

  // Summary stat tiles
  h+=`<div class="stat-grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px">
    <div class="stat-tile green">
      <div class="stat-num" data-count="${totH}" data-suffix="h">0h</div>
      <div class="stat-label">Total Hours</div>
    </div>
    <div class="stat-tile orange">
      <div class="stat-num" data-count="${totSick}">0</div>
      <div class="stat-label">Sick Days</div>
    </div>
    <div class="stat-tile grey">
      <div class="stat-num" data-count="${totOff}">0</div>
      <div class="stat-label">Days Off</div>
    </div>
  </div>`;

  // Employee totals
  h+=`<div class="sect-label" style="margin-bottom:10px">Employee Totals — ${periodLabel}</div>`;
  empData.forEach(emp=>{
    const[abg,afg]=ac(emp.name);
    const top=Object.entries(emp.tally).filter(([k])=>k!=="off"&&k!=="sick").sort((a,b)=>b[1]-a[1])[0];
    h+=`<div class="acard"><div style="display:flex;align-items:center;gap:12px">
      <div class="avatar" style="background:${abg};color:${afg}">${empInitials(emp.name)}</div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span style="font-weight:600;font-size:14px;color:var(--fg)">${esc(emp.name)}</span>
          <div style="display:flex;gap:8px;align-items:center">
            ${top?`<span class="chip" style="background:${tm[top[0]]?.bg};color:${tm[top[0]]?.text}">${tm[top[0]]?.label}</span>`:""}
            <span style="font-weight:700;font-size:15px;color:var(--accent)">${emp.totalH}h</span>
          </div>
        </div>
      </div></div>
    <div class="ptrack"><div class="pbar" style="width:${(emp.totalH/mxH*100).toFixed(1)}%"></div></div>
    <div class="chips">`;
    tasks.filter(t=>t.id!=="off"&&t.id!=="sick"&&emp.tally[t.id]>0).forEach(t=>{h+=`<span class="chip" style="background:${t.bg};color:${t.text}">${esc(t.label)}: ${emp.tally[t.id]}d</span>`;});
    if(emp.daysSick>0)h+=`<span class="chip" style="background:#fff7ed;color:#c2410c;border:1px solid rgba(249,115,22,0.25)">🤒 Sick: ${emp.daysSick}d</span>`;
    if(emp.daysOff>0)h+=`<span class="chip" style="background:rgba(0,0,0,0.06);color:rgba(0,0,0,0.5);border:1px solid rgba(0,0,0,0.15)">📅 Off: ${emp.daysOff}d</span>`;
    h+=`</div></div>`;
  });

  // Week-by-week breakdown
  if(weeks.length>0){
    h+=`<div class="modal-divider" style="margin:22px 0"></div>
    <div class="sect-label" style="margin-bottom:14px">Week-by-Week Breakdown</div>`;
    weeks.forEach(wk=>{
      const st=getWeekStats(wk.key);
      const ws=new Date(wk.key+"T12:00:00"),we=new Date(ws);we.setDate(we.getDate()+6);
      const dateRange=`${ws.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${we.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`;
      const hasData=S.allSchedules.some(s=>s.week_start===wk.key);
      h+=`<div class="week-stat-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${hasData?10:0}px">
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--fg)">${wk.label}</div>
            <div style="font-size:11px;color:var(--fg-muted);margin-top:2px">${dateRange}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            ${st.daysSick>0?`<span style="background:#fff7ed;color:#c2410c;border:1px solid rgba(249,115,22,0.25);padding:3px 9px;border-radius:10px;font-size:11px;font-weight:700">🤒 ${st.daysSick} sick</span>`:""}
            ${st.daysOff>0?`<span style="background:rgba(0,0,0,0.06);color:rgba(0,0,0,0.5);border:1px solid rgba(0,0,0,0.15);padding:3px 9px;border-radius:10px;font-size:11px;font-weight:700">📅 ${st.daysOff} off</span>`:""}
            <span style="font-weight:800;font-size:16px;color:${st.totalH>0?"var(--accent)":"var(--fg-subtle)"}">${st.totalH}h</span>
          </div>
        </div>`;
      if(!hasData){
        h+=`<div style="font-size:11px;color:var(--fg-subtle);font-style:italic;padding:2px 0">No schedule saved</div>`;
      } else {
        h+=`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">`;
        const activeTasks=tasks.filter(t=>t.id!=="off"&&t.id!=="sick"&&st.tally[t.id]>0);
        activeTasks.forEach(t=>{h+=`<span style="background:${t.bg};color:${t.text};border:1px solid ${t.dot}30;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:600">${esc(t.label)}: ${st.tally[t.id]}d</span>`;});
        if(!activeTasks.length&&!st.daysSick&&!st.daysOff)h+=`<span style="font-size:11px;color:var(--fg-subtle);font-style:italic">No tasks scheduled</span>`;
        h+=`</div><div style="display:flex;flex-wrap:wrap;gap:6px">`;
        S.employees.forEach(emp=>{
          const s=S.allSchedules.find(sc=>sc.employee_id===emp.id&&sc.week_start===wk.key);
          if(!s)return;
          const sched=migrateSched(s.schedule_data);
          const hrs=countH(sched);
          const sick=DAYS.filter(d=>sched[d]?.status==="sick").length;
          const off=DAYS.filter(d=>sched[d]?.status==="dayoff").length;
          const[abg,afg]=ac(emp.name);
          h+=`<div style="display:flex;align-items:center;gap:6px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:5px 10px">
            <div style="width:20px;height:20px;border-radius:50%;background:${abg};color:${afg};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0">${empInitials(emp.name)}</div>
            <span style="font-size:11px;font-weight:600;color:var(--fg)">${esc(emp.name)}</span>
            <span style="font-size:11px;font-weight:700;color:var(--accent)">${hrs}h</span>
            ${sick>0?`<span style="font-size:10px;color:#c2410c">🤒${sick}</span>`:""}
            ${off>0?`<span style="font-size:10px;color:rgba(0,0,0,0.4)">📅${off}</span>`:""}
          </div>`;
        });
        h+=`</div>`;
      }
      h+=`</div>`;
    });
  }

  h+=`<div class="legbox" style="margin-top:18px"><div class="sect-label" style="margin-bottom:12px">Task Legend</div><div class="chips">`;
  tasks.filter(t=>t.id!=="off"&&t.id!=="sick").forEach(t=>{h+=`<div style="display:flex;align-items:center;gap:6px;background:${t.bg};color:${t.text};padding:5px 11px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${t.dot}30"><span style="width:6px;height:6px;border-radius:50%;background:${t.dot};display:inline-block"></span>${esc(t.label)}</div>`;});
  h+=`</div></div></div></div>`;return h;
}

// History
const H_PERIODS=[
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
function getHistoryWeekKeys(period){
  const thisMonday=getWS(0);
  const keys=[];
  const addK=(off)=>{const k=localDateStr(getWS(off));if(!keys.includes(k))keys.push(k);};
  if(period==="this_week"){addK(0);}
  else if(period==="last_week"){addK(-1);}
  else if(period==="2w"){addK(0);addK(-1);}
  else if(period==="4w"){for(let i=0;i<4;i++)addK(-i);}
  else if(period==="this_month"){const m=thisMonday.getMonth(),y=thisMonday.getFullYear();for(let i=0;i<6;i++){const d=getWS(-i);if(d.getFullYear()===y&&d.getMonth()===m)addK(-i);}}
  else if(period==="last_month"){const ref=new Date(thisMonday);ref.setDate(1);ref.setMonth(ref.getMonth()-1);const lm=ref.getMonth(),ly=ref.getFullYear();for(let i=1;i<9;i++){const d=getWS(-i);if(d.getFullYear()===ly&&d.getMonth()===lm)addK(-i);}}
  else if(period==="3m"){for(let i=0;i<13;i++)addK(-i);}
  else if(period==="6m"){for(let i=0;i<26;i++)addK(-i);}
  else if(period==="year"){for(let i=0;i<52;i++)addK(-i);}
  else if(period==="all"){[...new Set(S.allSchedules.map(s=>s.week_start))].sort((a,b)=>b.localeCompare(a)).forEach(k=>keys.push(k));}
  return keys;
}
function toggleHistoryWeek(wk){
  S.hOpen[wk]=!S.hOpen[wk];
  // just toggle DOM, no full re-render
  const grp=document.getElementById("wkg_"+wk);
  if(grp)grp.classList.toggle("open",!!S.hOpen[wk]);
}