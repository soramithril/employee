// ── CONFIG.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

const SUPABASE_URL="https://ghfxpftkdvlaygueyhqh.supabase.co",SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoZnhwZnRrZHZsYXlndWV5aHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwOTM0MjEsImV4cCI6MjA4ODY2OTQyMX0.arx7rS1hfiyixrxprwY05eWvtgRdDmml66KXKxjhspI",USE_SUPABASE=!!(SUPABASE_URL&&SUPABASE_ANON_KEY);
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const WEEKDAYS=["Monday","Tuesday","Wednesday","Thursday","Friday"];
const WEEKEND=["Saturday","Sunday"];

// Work hours – default 7am–5pm
let WH=JSON.parse(localStorage.getItem("ss_wh")||"null")||{start:7,end:17};

// ── APP SETTINGS (Supabase-backed) ──
async function saveSetting(key,value){
  localStorage.setItem("ss_"+key,JSON.stringify(value));
  if(!USE_SUPABASE)return;
  try{await sbF("POST","app_settings?on_conflict=key",{key,value,updated_at:new Date().toISOString()});}catch(e){console.warn("Setting save failed:",e);}
}
async function loadSettings(){
  if(!USE_SUPABASE)return;
  try{
    const rows=await sbF("GET","app_settings?select=*");
    if(!Array.isArray(rows))return;
    rows.forEach(row=>{
      if(row.key==="tasks"){
        const t=row.value;
        if(Array.isArray(t)&&t.length){
          // Only override if remote has custom tasks (more than defaults or different labels)
          tasks=t;localStorage.setItem("ss_tasks",JSON.stringify(t));
        }
      } else if(row.key==="wh"){
        WH=row.value;localStorage.setItem("ss_wh",JSON.stringify(WH));
      } else if(row.key==="emp_order"){
        localStorage.setItem("ss_emp_order",JSON.stringify(row.value));
      }
    });
  }catch(e){console.warn("Settings load failed:",e);}
}

function saveWH(){localStorage.setItem("ss_wh",JSON.stringify(WH));saveSetting("wh",WH);}

function fmtHour(h,m=0){const ap=h<12?"AM":"PM",hh=h===0?12:h>12?h-12:h;return m===0?`${hh}${ap}`:`${hh}:${String(m).padStart(2,"0")}${ap}`;}
function fmtKey(k){if(!k)return"";const[h,m]=k.split(":").map(Number);return fmtHour(h,m);}
function fmtRange(s,e){return s&&e?`${fmtKey(s)}–${fmtKey(e)}`:""}

function buildTimeOpts(sel){
  let h="";
  for(let hr=WH.start;hr<WH.end;hr++){
    const k0=`${hr}:00`,k30=`${hr}:30`;
    h+=`<option value="${k0}"${sel===k0?" selected":""}>${fmtHour(hr,0)}</option>`;
    h+=`<option value="${k30}"${sel===k30?" selected":""}>${fmtHour(hr,30)}</option>`;
  }
  const ke=`${WH.end}:00`;
  h+=`<option value="${ke}"${sel===ke?" selected":""}>${fmtHour(WH.end,0)}</option>`;
  return h;
}
function buildHourOpts(sel){let h="";for(let i=0;i<24;i++)h+=`<option value="${i}"${sel===i?" selected":""}>${fmtHour(i,0)}</option>`;return h;}

// Tasks
const DEFAULT_TASKS=[
  {id:"off",label:"Off",bg:"rgba(0,0,0,0.04)",text:"rgba(0,0,0,0.28)",dot:"rgba(0,0,0,0.2)",builtIn:true},
  {id:"sick",label:"Sick",bg:"#fff7ed",text:"#c2410c",dot:"#f97316",builtIn:true},
  {id:"bins",label:"Bins",bg:"#dcfce7",text:"#15803d",dot:"#22c55e"},
  {id:"junk",label:"Junk Removals",bg:"#dbeafe",text:"#1d4ed8",dot:"#60a5fa"},
  {id:"furniture",label:"Furniture Bank",bg:"#ede9fe",text:"#7c3aed",dot:"#a78bfa"},
  {id:"garbage",label:"Garbage",bg:"#fee2e2",text:"#dc2626",dot:"#f87171"},
  {id:"shop",label:"Shop",bg:"#fef9c3",text:"#a16207",dot:"#eab308"},
];
let tasks=JSON.parse(localStorage.getItem("ss_tasks")||"null");
// Reset tasks if they contain old default task IDs (migration)
if(tasks&&tasks.some(t=>["open","floor","cash","kitchen","delivery","supervisor","training","close","break"].includes(t.id))){
  tasks=null;localStorage.removeItem("ss_tasks");
}
tasks=tasks||DEFAULT_TASKS;
const TM=()=>Object.fromEntries(tasks.map(t=>[t.id,t]));
function saveTasks(){localStorage.setItem("ss_tasks",JSON.stringify(tasks));saveSetting("tasks",tasks);}
function hex2rgb(h){try{return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}catch{return[94,106,210];}}
function darken(h){try{const[r,g,b]=hex2rgb(h);return`rgb(${Math.round(r*.55)},${Math.round(g*.55)},${Math.round(b*.55)})`;}catch{return h;}}

const AVC=[
  ["#dcfce7","#15803d"],["#dbeafe","#1d4ed8"],["#ede9fe","#7c3aed"],
  ["#fee2e2","#dc2626"],["#fef9c3","#a16207"],["#e0f2fe","#0369a1"],
  ["#ffedd5","#c2410c"],["#e8f5ee","#1a7a3c"]
];
const ac=n=>{const s=n||"?";const h=([...s]).reduce((a,c)=>a+c.charCodeAt(0),0);return AVC[h%AVC.length];};
function empInitials(name){const p=(name||"?").trim().split(/\s+/);if(p.length>=2)return(p[0][0]+p[1][0]).toUpperCase();if(name.length>=2)return(name[0]+name[1]).toUpperCase();return name[0].toUpperCase();}
function esc(s){const d=document.createElement("div");d.textContent=s;return d.innerHTML;}
