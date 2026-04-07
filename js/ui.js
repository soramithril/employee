// ── UI.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

function switchTab(t){
  const app=document.getElementById("app");
  if(S.tab===t){render();return;}
  app.classList.add("tab-out");
  setTimeout(()=>{
    S.tab=t;
    // Show skeleton for async tabs while data loads
    if(["summer","winter","inventory","tasks"].includes(t)){
      showSkeleton();
    }
    render();
    app.classList.remove("tab-out");
    app.classList.add("tab-in");
    setTimeout(()=>app.classList.remove("tab-in"),300);
  },150);
}

// ── SKELETON LOADER ──
function showSkeleton(){
  const app=document.getElementById("app");
  if(!app)return;
  const rows=Array.from({length:5},(_,i)=>`
    <div class="skel-row">
      <div class="skeleton skel-avatar"></div>
      <div class="skeleton skel-name" style="width:${70+i*15}px"></div>
      <div style="flex:1;display:flex;gap:8px;padding-left:12px">
        ${Array.from({length:5},()=>`<div class="skeleton skel-bar" style="flex:1"></div>`).join("")}
      </div>
    </div>`).join("");
  app.innerHTML=`<div class="card"><div class="skel-wrap">
    <div class="skeleton skel-hdr" style="width:180px;height:16px;margin-bottom:22px"></div>
    ${rows}
  </div></div>`;
}

// ── FAB VISIBILITY (mobile only, schedule tab) ──
function updateFAB(){
  const fab=document.getElementById("fab");
  const stt=document.getElementById("scroll-top");
  if(!fab)return;
  const isMobile=window.innerWidth<=600;
  if(isMobile&&S.tab==="schedule"&&S.employees.length>0){
    fab.classList.add("fab-show");
  } else {
    fab.classList.remove("fab-show");
    fab.style.display="none";
  }
  // Scroll to top — show when scrolled >300px on history tab
  if(stt){
    if(window.scrollY>300&&S.tab==="history"){
      stt.classList.add("stt-show");
    } else {
      stt.classList.remove("stt-show");
      stt.style.display="none";
    }
  }
}
window.addEventListener("scroll",updateFAB,{passive:true});
window.addEventListener("resize",updateFAB);

// ── SAVE STATUS SHIMMER ──
function setSaveStatus(state,msg){
  const bar=document.getElementById("save-bar");
  const el=document.getElementById("save-status");
  if(!el)return;
  if(state==="saving"){
    bar?.classList.add("saving");
    el.className="saving-txt";el.textContent="⟳ Saving…";
  } else if(state==="saved"){
    bar?.classList.remove("saving");
    el.className="saved";el.textContent="✓ Saved";
    setTimeout(()=>{if(el)el.textContent="";},2500);
  } else if(state==="error"){
    bar?.classList.remove("saving");
    el.className="error-txt";el.textContent="✕ "+(msg||"Save failed");
  }
}
function animateCounters(){
  document.querySelectorAll(".stat-num[data-count]").forEach(el=>{
    const target=parseFloat(el.dataset.count)||0;
    const suffix=el.dataset.suffix||"";
    const isFloat=String(target).includes(".");
    const dur=900,steps=50,step=dur/steps;
    let i=0;
    el.classList.add("counting");
    const t=setInterval(()=>{
      i++;
      const progress=1-Math.pow(1-(i/steps),3); // ease-out cubic
      const val=target*progress;
      el.textContent=(isFloat?Math.round(val*10)/10:Math.round(val))+suffix;
      if(i>=steps){clearInterval(t);el.textContent=target+suffix;}
    },step);
  });
}
function playSplitReveal(cb){
  const ov=document.getElementById("split-overlay");
  if(!ov){cb&&cb();return;}
  ov.classList.remove("reveal","done");
  ov.style.display="";
  // Hold logo visible briefly, then split apart
  setTimeout(()=>{
    ov.classList.add("reveal");
    setTimeout(()=>{
      ov.classList.add("done");
      cb&&cb();
    },950);
  },650);
}

// ── WORKSHOP TASKS ──────────────────────────────────────────────────────────────