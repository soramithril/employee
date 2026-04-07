// ── AUTH.JS ──────────────────────────────────────────
// Part of JWG Staff Scheduler

// ── SESSION KEEP-ALIVE: refresh token before it expires ──
let _refreshTimer=null;
async function refreshSession(){
  try{
    const stored=localStorage.getItem("ss_session");
    if(!stored)return false;
    const session=JSON.parse(stored);
    if(!session.refresh_token)return false;
    const ref=await sbAuth("token?grant_type=refresh_token",{refresh_token:session.refresh_token});
    if(ref.access_token){
      localStorage.setItem("ss_session",JSON.stringify(ref));
      _currentUser=ref.user;
      updateUserBadge(ref.user);
      console.log("[session] Token refreshed successfully");
      return true;
    }
  }catch(e){console.warn("[session] Refresh failed:",e);}
  return false;
}
let _visibilityHandler=null;
function startSessionKeepAlive(){
  clearInterval(_refreshTimer);
  // Refresh every 45 minutes (Supabase tokens expire after 1 hour)
  _refreshTimer=setInterval(async()=>{
    const ok=await refreshSession();
    if(!ok){
      toast("Your session expired — please sign in again","error");
      doLogout();
    }
  },45*60*1000);
  // Remove previous listener before adding a new one (prevents leak on re-login)
  if(_visibilityHandler)document.removeEventListener("visibilitychange",_visibilityHandler);
  _visibilityHandler=async()=>{
    if(document.visibilityState==="visible"){
      const ok=await refreshSession();
      if(!ok){
        toast("Your session expired — please sign in again","error");
        doLogout();
      }
    }
  };
  document.addEventListener("visibilitychange",_visibilityHandler);
}

// ── INACTIVITY TIMEOUT: sign out after 30 min of no interaction ──
const IDLE_WARN_MS   = 25*60*1000;   // show warning at 25 min
const IDLE_LOGOUT_MS = 30*60*1000;   // force logout at 30 min
let _idleTimer=null, _idleWarnTimer=null, _idleCountdown=null, _idleSecondsLeft=0;

function resetInactivityTimer(){
  // Hide warning if showing
  const overlay=document.getElementById("timeout-overlay");
  const wasWarning=overlay&&overlay.classList.contains("show");
  if(overlay)overlay.classList.remove("show");
  clearTimeout(_idleTimer);
  clearTimeout(_idleWarnTimer);
  clearInterval(_idleCountdown);

  // Only run timeout when user is authenticated
  if(!_currentUser)return;

  // If the warning was showing, the user's been idle 25+ min — refresh token now
  // so their next save uses a fresh token
  if(wasWarning)refreshSession();

  // Set warning at 25 min
  _idleWarnTimer=setTimeout(()=>showTimeoutWarning(), IDLE_WARN_MS);
  // Set hard logout at 30 min
  _idleTimer=setTimeout(()=>{
    toast("Signed out due to inactivity","info");
    doLogout();
  }, IDLE_LOGOUT_MS);
}

function showTimeoutWarning(){
  const overlay=document.getElementById("timeout-overlay");
  if(!overlay)return;
  overlay.classList.add("show");
  _idleSecondsLeft=Math.round((IDLE_LOGOUT_MS-IDLE_WARN_MS)/1000);
  updateCountdownDisplay();
  clearInterval(_idleCountdown);
  _idleCountdown=setInterval(()=>{
    _idleSecondsLeft--;
    if(_idleSecondsLeft<=0){clearInterval(_idleCountdown);return;}
    updateCountdownDisplay();
  },1000);
}

function updateCountdownDisplay(){
  const el=document.getElementById("timeout-countdown");
  if(!el)return;
  const m=Math.floor(_idleSecondsLeft/60);
  const s=_idleSecondsLeft%60;
  el.textContent=`${m}:${String(s).padStart(2,"0")}`;
}

function startInactivityTimer(){
  // Include input/change so form interactions (dropdowns, time pickers) count as activity
  const events=["mousedown","mousemove","keydown","scroll","touchstart","click","input","change"];
  // Throttle resets to avoid performance overhead
  let _lastReset=0;
  function onActivity(){
    const now=Date.now();
    if(now-_lastReset<5000)return; // only reset every 5s at most
    _lastReset=now;
    resetInactivityTimer();
  }
  events.forEach(ev=>document.addEventListener(ev,onActivity,{passive:true}));
  resetInactivityTimer();
}


// ── AUTH FUNCTIONS ──

async function sbAuth(endpoint,body){
  const r=await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`,{
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY},
    body:JSON.stringify(body)
  });
  return r.json();
}

async function checkAuth(){
  // Try to restore session from localStorage
  const stored=localStorage.getItem("ss_session");
  if(!stored)return false;
  try{
    const session=JSON.parse(stored);
    // Check if token is still valid by hitting /auth/v1/user
    const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{
      headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`}
    });
    if(r.ok){
      const u=await r.json();
      _currentUser=u;
      updateUserBadge(u);
      return true;
    }
    // Try refresh
    if(session.refresh_token){
      const ref=await sbAuth("token?grant_type=refresh_token",{refresh_token:session.refresh_token});
      if(ref.access_token){
        localStorage.setItem("ss_session",JSON.stringify(ref));
        _currentUser=ref.user;
        updateUserBadge(ref.user);
        return true;
      }
    }
  }catch(e){}
  localStorage.removeItem("ss_session");
  return false;
}

function updateUserBadge(user){
  const el=document.getElementById("user-badge");
  if(el&&user?.email){
    const name=user.user_metadata?.name||user.email.split("@")[0];
    el.textContent=name;
    el.style.display="inline-flex";
  }
}

async function doLogin(){
  const email=(document.getElementById("li-user")?.value||"").trim();
  const password=(document.getElementById("li-pass")?.value||"");
  const err=document.getElementById("li-err");
  const btn=document.getElementById("li-btn");
  err.classList.remove("show");

  if(!email||!password){
    err.textContent="Please enter your email and password.";
    err.classList.add("show");return;
  }

  btn.textContent="Signing in…";btn.disabled=true;

  try{
    const url=`${SUPABASE_URL}/auth/v1/token?grant_type=password`;
    const res=await fetch(url,{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY},
      body:JSON.stringify({email,password})
    });
    const data=await res.json();
    if(data.access_token){
      localStorage.setItem("ss_session",JSON.stringify(data));
      _currentUser=data.user;
      updateUserBadge(data.user);
      btn.textContent="Welcome!";
      const ls=document.getElementById("login-screen");
      setTimeout(async()=>{
        ls.classList.add("hiding");
        setTimeout(()=>{ls.style.display="none";},600);
        playSplitReveal(()=>bootApp());
      },400);
    } else {
      const msg=data.error_description||data.message||data.msg||data.error||"Incorrect email or password.";
      console.error("Login failed:",data);
      err.textContent=msg;
      err.classList.add("show");
      document.getElementById("li-pass").value="";
      document.getElementById("li-pass").focus();
      btn.textContent="Sign In";btn.disabled=false;
      const card=document.querySelector(".login-card");
      card.style.animation="none";card.offsetHeight;
      card.style.animation="shake .35s ease";
    }
  }catch(e){
    console.error("Login fetch error:",e);
    err.textContent="Connection error: "+e.message;
    err.classList.add("show");
    btn.textContent="Sign In";btn.disabled=false;
  }
}

async function doLogout(){
  clearTimeout(_idleTimer);clearTimeout(_idleWarnTimer);clearInterval(_idleCountdown);
  try{
    const stored=localStorage.getItem("ss_session");
    if(stored){
      const session=JSON.parse(stored);
      await fetch(`${SUPABASE_URL}/auth/v1/logout`,{
        method:"POST",
        headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`}
      });
    }
  }catch(e){}
  localStorage.removeItem("ss_session");
  location.reload();
}

// Shake animation
const shakeStyle=document.createElement("style");
shakeStyle.textContent=`@keyframes shake{0%,100%{transform:translateX(0);}20%{transform:translateX(-8px);}40%{transform:translateX(8px);}60%{transform:translateX(-5px);}80%{transform:translateX(5px);}}`;
document.head.appendChild(shakeStyle);

// Update login input placeholder to say Email
document.addEventListener("DOMContentLoaded",()=>{
  const u=document.getElementById("li-user");
  if(u){u.type="email";u.placeholder="Enter your email";}
});

// ── TOOLTIP ENGINE (fixed position, escapes overflow:hidden) ──
(()=>{
  const tip=document.getElementById("tooltip-el");
  let hideT;
  document.addEventListener("mouseover",e=>{
    const el=e.target.closest("[data-tip]");
    if(!el)return;
    clearTimeout(hideT);
    const text=el.getAttribute("data-tip");
    if(!text)return;
    tip.textContent=text;
    tip.classList.remove("visible");
    // position above element
    const r=el.getBoundingClientRect();
    const tw=Math.min(tip.offsetWidth||200,window.innerWidth-16);
    let left=r.left+r.width/2-tw/2;
    left=Math.max(8,Math.min(left,window.innerWidth-tw-8));
    let top=r.top-tip.offsetHeight-10;
    if(top<8)top=r.bottom+10;
    tip.style.left=left+"px";
    tip.style.top=top+"px";
    requestAnimationFrame(()=>{
      // recalc after paint
      const th=tip.offsetHeight,tww=tip.offsetWidth;
      let l2=r.left+r.width/2-tww/2;
      l2=Math.max(8,Math.min(l2,window.innerWidth-tww-8));
      let t2=r.top-th-10+window.scrollY;
      if(r.top-th-10<8)t2=r.bottom+10+window.scrollY;
      else t2=r.top-th-10+window.scrollY;
      tip.style.left=l2+"px";
      tip.style.top=t2+"px";
      tip.classList.add("visible");
    });
  });
  document.addEventListener("mouseout",e=>{
    if(!e.target.closest("[data-tip]"))return;
    hideT=setTimeout(()=>tip.classList.remove("visible"),80);
  });
  document.addEventListener("scroll",()=>tip.classList.remove("visible"),{passive:true});
})();

// ── TAB TRANSITIONS ──