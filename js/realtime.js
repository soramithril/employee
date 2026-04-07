// ── REALTIME.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

let _sbClient=null;
let _realtimeChannel=null;

function isModalOpen(){return !!document.getElementById("moverlay");}

function initRealtime(){
  if(!USE_SUPABASE||!window.supabase)return;
  try{
    _sbClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  }catch(e){console.warn("Realtime init failed:",e);return;}

  _realtimeChannel=_sbClient.channel("live-sync")

    // ── Workshop Tasks ──
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"workshop_tasks"},payload=>{
      const row=payload.new;
      if(!row||WT.tasks.some(t=>t.id===row.id))return;
      WT.tasks.unshift(row);
      if(S.tab==="tasks"&&!isModalOpen())renderTasksBoard();
    })
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"workshop_tasks"},payload=>{
      const row=payload.new;
      if(!row)return;
      const idx=WT.tasks.findIndex(t=>t.id===row.id);
      if(idx>=0)WT.tasks[idx]={...WT.tasks[idx],...row};
      else WT.tasks.unshift(row);
      if(S.tab==="tasks"&&!isModalOpen())renderTasksBoard();
    })
    .on("postgres_changes",{event:"DELETE",schema:"public",table:"workshop_tasks"},payload=>{
      const old=payload.old;
      if(!old)return;
      WT.tasks=WT.tasks.filter(t=>t.id!==old.id);
      if(S.tab==="tasks"&&!isModalOpen())renderTasksBoard();
    })

    // ── Schedules ──
    .on("postgres_changes",{event:"*",schema:"public",table:"schedules"},payload=>{
      const row=payload.eventType==="DELETE"?payload.old:payload.new;
      if(!row)return;
      if(payload.eventType==="DELETE"){
        S.allSchedules=S.allSchedules.filter(s=>!(s.employee_id===row.employee_id&&s.week_start===row.week_start));
      }else{
        const idx=S.allSchedules.findIndex(s=>s.employee_id===row.employee_id&&s.week_start===row.week_start);
        if(idx>=0)S.allSchedules[idx]=row;
        else S.allSchedules.push(row);
      }
      // Update current view if it's for the week we're looking at
      const currentWeek=wkey(S.weekOffset);
      if(row.week_start===currentWeek){
        const emp=S.employees.find(e=>e.id===row.employee_id);
        if(emp){
          if(payload.eventType==="DELETE"){
            S.schedule[row.employee_id]=defSched();
          }else{
            S.schedule[row.employee_id]=migrateSched(JSON.parse(JSON.stringify(row.schedule_data)));
          }
          // Only refresh the grid if not mid-edit (modal open)
          if(!isModalOpen()){
            if(S.tab==="schedule")refreshGrid();
            else if(S.tab==="history"||S.tab==="analytics")render();
          }
        }
      }
    })

    // ── Employees ──
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"employees"},payload=>{
      const row=payload.new;
      if(!row||S.employees.some(e=>e.id===row.id))return;
      S.employees.push(row);
      S.schedule[row.id]=defSched();
      if(!isModalOpen())render();
    })
    .on("postgres_changes",{event:"DELETE",schema:"public",table:"employees"},payload=>{
      const old=payload.old;
      if(!old)return;
      S.employees=S.employees.filter(e=>e.id!==old.id);
      delete S.schedule[old.id];
      if(!isModalOpen())render();
    })
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"employees"},payload=>{
      const row=payload.new;
      if(!row)return;
      const idx=S.employees.findIndex(e=>e.id===row.id);
      if(idx>=0)S.employees[idx]={...S.employees[idx],...row};
      if(!isModalOpen())render();
    })

    // ── App Settings (tasks list, work hours, emp order) ──
    .on("postgres_changes",{event:"*",schema:"public",table:"app_settings"},payload=>{
      const row=payload.new;
      if(!row)return;
      if(row.key==="tasks"&&Array.isArray(row.value)){
        tasks=row.value;localStorage.setItem("ss_tasks",JSON.stringify(tasks));
        if(!isModalOpen()&&(S.tab==="schedule"))refreshGrid();
      }else if(row.key==="wh"){
        WH=row.value;localStorage.setItem("ss_wh",JSON.stringify(WH));
        if(!isModalOpen()&&S.tab==="schedule")refreshGrid();
      }else if(row.key==="emp_order"){
        localStorage.setItem("ss_emp_order",JSON.stringify(row.value));
        applyStoredOrder();
        if(!isModalOpen())render();
      }
    })

    // ── Service Locations ──
    .on("postgres_changes",{event:"*",schema:"public",table:"service_locations"},payload=>{
      const row=payload.eventType==="DELETE"?payload.old:payload.new;
      if(!row)return;
      if((S.tab==="summer"||S.tab==="winter")&&!isModalOpen()){
        if(S.tab==="summer")loadSummerData().then(()=>renderSummerPage());
        else if(S.tab==="winter")loadWinterData().then(()=>renderWinterPage());
      }
    })

    // ── Service Types ──
    .on("postgres_changes",{event:"*",schema:"public",table:"service_types"},payload=>{
      const row=payload.eventType==="DELETE"?payload.old:payload.new;
      if(!row)return;
      if((S.tab==="summer"||S.tab==="winter")&&!isModalOpen()){
        if(S.tab==="summer")loadSummerData().then(()=>renderSummerPage());
        else if(S.tab==="winter")loadWinterData().then(()=>renderWinterPage());
      }
    })

    // ── Location Services ──
    .on("postgres_changes",{event:"*",schema:"public",table:"location_services"},payload=>{
      const row=payload.eventType==="DELETE"?payload.old:payload.new;
      if(!row)return;
      if((S.tab==="summer"||S.tab==="winter")&&!isModalOpen()){
        if(S.tab==="summer")loadSummerData().then(()=>renderSummerPage());
        else if(S.tab==="winter")loadWinterData().then(()=>renderWinterPage());
      }
    })

    // ── Salt Bins ──
    .on("postgres_changes",{event:"*",schema:"public",table:"salt_bins"},payload=>{
      const row=payload.eventType==="DELETE"?payload.old:payload.new;
      if(!row)return;
      if(S.tab==="winter"&&!isModalOpen()){
        const idx=WIN.saltBins.findIndex(s=>s.id===row.id);
        if(payload.eventType==="DELETE"){if(idx>=0)WIN.saltBins.splice(idx,1);}
        else if(idx>=0)WIN.saltBins[idx]={...WIN.saltBins[idx],...row};
        else WIN.saltBins.push(row);
        renderWinterPage();
      }
    })

    // ── Inventory Items ──
    .on("postgres_changes",{event:"*",schema:"public",table:"inventory_items"},payload=>{
      const row=payload.eventType==="DELETE"?payload.old:payload.new;
      if(!row)return;
      if(S.tab==="inventory"&&!isModalOpen()){
        if(payload.eventType==="DELETE")INV.items=INV.items.filter(i=>i.id!==row.id);
        else{
          const idx=INV.items.findIndex(i=>i.id===row.id);
          if(idx>=0)INV.items[idx]={...INV.items[idx],...row};
          else INV.items.push(row);
        }
        renderInventoryPage();
      }
    })

    // ── Inventory Categories ──
    .on("postgres_changes",{event:"*",schema:"public",table:"inventory_categories"},payload=>{
      const row=payload.eventType==="DELETE"?payload.old:payload.new;
      if(!row)return;
      if(S.tab==="inventory"&&!isModalOpen()){
        if(payload.eventType==="DELETE")INV.categories=INV.categories.filter(c=>c.id!==row.id);
        else{
          const idx=INV.categories.findIndex(c=>c.id===row.id);
          if(idx>=0)INV.categories[idx]={...INV.categories[idx],...row};
          else INV.categories.push(row);
        }
        renderInventoryPage();
      }
    })

    .subscribe(status=>{
      if(status==="SUBSCRIBED")console.log("Realtime: connected");
      else if(status==="CHANNEL_ERROR")console.warn("Realtime: channel error, will retry");
    });
}

// Re-render after modal closes to catch any changes that arrived while editing
const _origCloseModal=closeModal;
closeModal=function(){
  _origCloseModal();
  // Small delay to let DOM settle, then refresh current view
  setTimeout(()=>{
    if(S.tab==="tasks")renderTasksBoard();
    else if(S.tab==="schedule")refreshGrid();
    else render();
  },50);
};