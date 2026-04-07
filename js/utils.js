// ── UTILS.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

async function sbF(m,p,b){
  // Use the logged-in user's access token if available, else fall back to anon key
  let authHeader=SUPABASE_ANON_KEY;
  try{const sess=JSON.parse(localStorage.getItem("ss_session")||"{}");if(sess.access_token)authHeader=sess.access_token;}catch(e){}
  const isUpsert=m==="POST"&&p.includes("on_conflict");
  const prefer=isUpsert?"return=representation,resolution=merge-duplicates":m==="POST"?"return=representation":"";
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${p}`,{method:m,headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${authHeader}`,"Content-Type":"application/json",...(prefer?{Prefer:prefer}:{})},body:b?JSON.stringify(b):undefined});
  // If 401/403, try refreshing the token and retry once
  if((r.status===401||r.status===403)&&authHeader!==SUPABASE_ANON_KEY){
    const refreshed=await refreshSession();
    if(refreshed){
      const sess2=JSON.parse(localStorage.getItem("ss_session")||"{}");
      const r2=await fetch(`${SUPABASE_URL}/rest/v1/${p}`,{method:m,headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${sess2.access_token}`,"Content-Type":"application/json",...(prefer?{Prefer:prefer}:{})},body:b?JSON.stringify(b):undefined});
      if(!r2.ok)throw new Error(await r2.text());
      return r2.status===204?null:r2.json();
    }
    toast("Session expired — please sign in again","error");
    doLogout();
    throw new Error("Session expired");
  }
  if(!r.ok)throw new Error(await r.text());
  return r.status===204?null:r.json();
}
function lsG(k){try{return JSON.parse(localStorage.getItem(k))}catch{return null}}
function lsS(k,v){localStorage.setItem(k,JSON.stringify(v))}
async function loadEmps(){if(USE_SUPABASE)return sbF("GET","employees?select=*&order=name");return lsG("ss_emps")||[];}
async function saveEmp(name){if(USE_SUPABASE){const r=await sbF("POST","employees",{name});return r[0];}const l=lsG("ss_emps")||[],e={id:Date.now().toString(),name};lsS("ss_emps",[...l,e]);return e;}
async function delEmp(id){if(USE_SUPABASE)return sbF("DELETE",`employees?id=eq.${id}`);lsS("ss_emps",(lsG("ss_emps")||[]).filter(e=>e.id!==id));}
async function loadScheds(){if(USE_SUPABASE){const since=new Date();since.setFullYear(since.getFullYear()-1);return sbF("GET","schedules?select=*&week_start=gte."+localDateStr(since));}return lsG("ss_scheds")||[];}
async function upsertSched(eid,ws,data){const w=localDateStr(ws);if(USE_SUPABASE)return sbF("POST","schedules?on_conflict=employee_id,week_start",{employee_id:eid,week_start:w,schedule_data:data,updated_at:new Date().toISOString()});const l=lsG("ss_scheds")||[],i=l.findIndex(s=>s.employee_id===eid&&s.week_start===w);const e={id:`${eid}_${w}`,employee_id:eid,week_start:w,schedule_data:data};if(i>=0)l[i]=e;else l.push(e);lsS("ss_scheds",l);}

let toastT;
const TOAST_ICONS={success:"✓",error:"✕",info:"ℹ"};
function toast(msg,type="success"){
  const el=document.getElementById("toast");
  el.className=type+" show";
  el.innerHTML=`<span class="t-icon">${TOAST_ICONS[type]||"✓"}</span><span class="t-msg">${msg}</span><span class="t-close" onclick="dismissToast()">✕</span>`;
  clearTimeout(toastT);
  toastT=setTimeout(()=>dismissToast(),3200);
}
function dismissToast(){
  const el=document.getElementById("toast");
  el.classList.remove("show");el.classList.add("hide");
  setTimeout(()=>{el.className="";el.innerHTML="";},280);
}

function closeModal(){const o=document.getElementById("moverlay");if(o)o.remove();}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
function updateModal(html,width){
  // Update existing modal content in-place (preserves scroll, no flicker)
  const m=document.querySelector("#moverlay .modal");
  if(m){
    const scrollTop=m.scrollTop;
    m.innerHTML=html;
    if(width)m.style.width=width;
    m.scrollTop=scrollTop;
  } else {
    openModal(html,width);
  }
}
function openModal(html,width){
  closeModal();
  const ov=document.createElement("div");ov.className="moverlay";ov.id="moverlay";
  ov.onmousedown=e=>{if(e.target===ov)closeModal();};
  const m=document.createElement("div");m.className="modal";
  if(width)m.style.width=width;
  m.innerHTML=html;ov.appendChild(m);document.body.appendChild(ov);
}
