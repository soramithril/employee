// ── APP.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

async function bootApp(){
  showSkeleton();
  startSessionKeepAlive();
  startInactivityTimer();
  try{
    await loadSettings();
    const[emps,scheds]=await Promise.all([loadEmps(),loadScheds()]);
    S.employees=emps||[];S.allSchedules=scheds||[];applyStoredOrder();
    const w=wkey(S.weekOffset);
    S.employees.forEach(e=>{const f=(scheds||[]).find(s=>s.employee_id===e.id&&s.week_start===w);S.schedule[e.id]=f?migrateSched(JSON.parse(JSON.stringify(f.schedule_data))):defSched();});
  }catch(e){toast("Load failed: "+e.message,"error");}
  // Auto-select today in mobile day view for current week
  const todayName=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
  const todayIdx=S.activeDays.indexOf(todayName);
  if(todayIdx>=0)S.mobileDayIdx=todayIdx;
  render();
}

(async()=>{
  const authed=await checkAuth();
  if(authed){
    document.getElementById("login-screen").style.display="none";
    playSplitReveal(()=>{bootApp();initRealtime();});
  } else {
    playSplitReveal(()=>{
      render();
      setTimeout(()=>document.getElementById("li-user")?.focus(),100);
    });
  }
})();

