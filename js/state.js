// ── STATE.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

function defSched(){const s={};DAYS.forEach(d=>{s[d]={status:"off",shifts:[]};});return s;}
// Migrate old format (single shift object) to new format (status+shifts array)
function migrateSched(s){
  if(!s)return defSched();
  const out={};
  DAYS.forEach(d=>{
    const v=s[d];
    if(!v){out[d]={status:"off",shifts:[]};return;}
    // Already new format
    if(v.status!==undefined){out[d]=v;return;}
    // Old format: {task, start, end}
    if(v.task==="off"||!v.task){out[d]={status:"off",shifts:[]};}
    else if(v.task==="sick"){out[d]={status:"sick",shifts:[]};}
    else{out[d]={status:"work",shifts:[{task:v.task,start:v.start,end:v.end}]};}
  });
  return out;
}
function countH(s){
  if(!s)return 0;let tot=0;
  DAYS.forEach(d=>{
    const day=s[d];
    if(!day||day.status==="off"||day.status==="sick")return;
    (day.shifts||[]).forEach(sh=>{
      if(sh.start&&sh.end){const[sh2,sm]=sh.start.split(":").map(Number),[eh,em]=sh.end.split(":").map(Number);tot+=(eh+em/60)-(sh2+sm/60);}
    });
  });
  return Math.round(tot*10)/10;
}

// Default: weekdays only
let S={tab:"schedule",weekOffset:0,employees:[],allSchedules:[],schedule:{},activeDays:[...WEEKDAYS],saving:false,aPeriod:"4w",hFilter:"all",hPeriod:"4w",hOpen:{},mobileDayIdx:0};

function getWS(off=0){const n=new Date(),d=n.getDay(),r=new Date(n);r.setDate(n.getDate()-d+(d===0?-6:1)+off*7);r.setHours(0,0,0,0);return r;}
// Use local date (Eastern) not UTC – avoids midnight-UTC rollover mismatching week keys
function localDateStr(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function wkey(off){return localDateStr(getWS(off));}
function fmtW(d){const e=new Date(d);e.setDate(e.getDate()+6);const o={month:"short",day:"numeric"};return`${d.toLocaleDateString("en-US",o)} – ${e.toLocaleDateString("en-US",{...o,year:"numeric"})}`;}
function wlbl(o){return o===0?"This Week":o===1?"Next Week":o===-1?"Last Week":`Week ${o>0?"+":""}${o}`;}
