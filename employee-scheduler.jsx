import { useState, useEffect } from "react";

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  return res.status === 204 ? null : res.json();
}

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_LABELS = HOURS.map(h =>
  h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`
);

const TASK_TYPES = [
  { id: "off",        label: "Off",          bg: "#F1F5F9", text: "#94A3B8", dot: "#CBD5E1" },
  { id: "open",       label: "Opening",      bg: "#DCFCE7", text: "#15803D", dot: "#22C55E" },
  { id: "floor",      label: "Floor",        bg: "#DBEAFE", text: "#1D4ED8", dot: "#3B82F6" },
  { id: "cash",       label: "Cash/Reg",     bg: "#FEF9C3", text: "#A16207", dot: "#EAB308" },
  { id: "kitchen",    label: "Kitchen",      bg: "#FFE4E6", text: "#BE123C", dot: "#F43F5E" },
  { id: "delivery",   label: "Delivery",     bg: "#E0E7FF", text: "#4338CA", dot: "#6366F1" },
  { id: "supervisor", label: "Supervisor",   bg: "#F3E8FF", text: "#7E22CE", dot: "#A855F7" },
  { id: "training",   label: "Training",     bg: "#FFEDD5", text: "#C2410C", dot: "#F97316" },
  { id: "close",      label: "Closing",      bg: "#E2E8F0", text: "#475569", dot: "#64748B" },
  { id: "break",      label: "Break",        bg: "#FDF4FF", text: "#86198F", dot: "#D946EF" },
];
const TASK_MAP = Object.fromEntries(TASK_TYPES.map(t => [t.id, t]));
const DEFAULT_SCHEDULE = Object.fromEntries(
  DAYS.map(d => [d, Object.fromEntries(HOURS.map(h => [h, "off"]))])
);
const USE_SUPABASE = SUPABASE_URL !== "YOUR_SUPABASE_URL";

function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function lsSet(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

async function loadEmployees() {
  if (USE_SUPABASE) return supabase("GET", "employees?select=*&order=name");
  return lsGet("employees") || [];
}
async function saveEmployee(name) {
  if (USE_SUPABASE) { const r = await supabase("POST", "employees", { name }); return r[0]; }
  const list = lsGet("employees") || [];
  const emp = { id: Date.now().toString(), name };
  lsSet("employees", [...list, emp]); return emp;
}
async function deleteEmployee(id) {
  if (USE_SUPABASE) return supabase("DELETE", `employees?id=eq.${id}`);
  lsSet("employees", (lsGet("employees") || []).filter(e => e.id !== id));
}
async function loadSchedules() {
  if (USE_SUPABASE) return supabase("GET", "schedules?select=*");
  return lsGet("schedules") || [];
}
async function upsertSchedule(employeeId, weekStart, scheduleData) {
  const week = weekStart.toISOString().split("T")[0];
  if (USE_SUPABASE) {
    return supabase("POST", "schedules?on_conflict=employee_id,week_start", {
      employee_id: employeeId, week_start: week,
      schedule_data: scheduleData, updated_at: new Date().toISOString(),
    });
  }
  const list = lsGet("schedules") || [];
  const idx = list.findIndex(s => s.employee_id === employeeId && s.week_start === week);
  const entry = { id: `${employeeId}_${week}`, employee_id: employeeId, week_start: week, schedule_data: scheduleData };
  if (idx >= 0) list[idx] = entry; else list.push(entry);
  lsSet("schedules", list);
}

function getWeekStart(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function formatWeek(date) {
  const end = new Date(date); end.setDate(end.getDate() + 6);
  return `${date.toLocaleDateString("en-CA", { month: "short", day: "numeric" })} to ${end.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`;
}
function countHoursWorked(schedule) {
  let n = 0;
  for (const d of DAYS) for (const h of HOURS) {
    const t = schedule?.[d]?.[h];
    if (t && t !== "off" && t !== "break") n++;
  }
  return n;
}

const AVATAR_PALETTE = [
  ["#DBEAFE","#1D4ED8"],["#DCFCE7","#15803D"],["#FFE4E6","#BE123C"],
  ["#F3E8FF","#7E22CE"],["#FFEDD5","#C2410C"],["#E0E7FF","#4338CA"],
  ["#FEF9C3","#A16207"],["#FDF4FF","#86198F"],
];
function avatarColor(name) {
  return AVATAR_PALETTE[(name.charCodeAt(0) + name.length) % AVATAR_PALETTE.length];
}

function TaskPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const task = TASK_MAP[value] || TASK_MAP.off;
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          width: "100%", height: 22, background: task.bg, color: task.text,
          border: "none", borderRadius: 4, cursor: "pointer",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.03em",
          fontFamily: "inherit", padding: "0 4px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
        }}
        title={task.label}
      >
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: task.dot, flexShrink: 0 }} />
        {value !== "off" && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.label}</span>}
      </button>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{
          position: "fixed", zIndex: 9999, background: "#fff",
          border: "1px solid #E2E8F0", borderRadius: 12, padding: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, minWidth: 220,
        }}>
          <div style={{ gridColumn: "1/-1", fontSize: 10, fontWeight: 700, color: "#94A3B8", padding: "0 2px 6px", letterSpacing: "0.07em" }}>SELECT TASK</div>
          {TASK_TYPES.map(t => (
            <button key={t.id} onClick={() => { onChange(t.id); setOpen(false); }} style={{
              background: t.bg, color: t.text,
              border: value === t.id ? `2px solid ${t.dot}` : "2px solid transparent",
              borderRadius: 8, padding: "8px 10px", cursor: "pointer",
              fontSize: 11, fontWeight: 600, fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 7, textAlign: "left",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.dot, flexShrink: 0 }} />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleGrid({ employees, schedule, onCellChange, weekStart }) {
  const [visibleDays, setVisibleDays] = useState(DAYS);
  const [hourRange, setHourRange] = useState([7, 22]);
  const [collapsed, setCollapsed] = useState({});
  const visibleHours = HOURS.slice(hourRange[0], hourRange[1] + 1);

  if (!employees.length) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, color: "#94A3B8", gap: 12 }}>
      <div style={{ fontSize: 48 }}>👥</div>
      <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Go to Team tab to add your first employee</p>
    </div>
  );

  const SS2 = { background: "#fff", color: "#475569", border: "1.5px solid #E2E8F0", borderRadius: 7, padding: "4px 8px", fontFamily: "inherit", fontSize: 11, cursor: "pointer", outline: "none" };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "12px 20px", borderBottom: "1px solid #F1F5F9", background: "#FAFAFA", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {DAYS.map(d => {
            const on = visibleDays.includes(d);
            return (
              <button key={d} onClick={() => setVisibleDays(v => on ? v.filter(x => x !== d) : [...v, d])} style={{
                background: on ? "#16A34A" : "#fff", color: on ? "#fff" : "#64748B",
                border: `1.5px solid ${on ? "#16A34A" : "#E2E8F0"}`,
                borderRadius: 7, padding: "4px 12px", cursor: "pointer",
                fontSize: 11, fontWeight: 600, fontFamily: "inherit",
              }}>{d.slice(0, 3)}</button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <span style={{ color: "#94A3B8", fontSize: 11, fontWeight: 500 }}>Hours:</span>
          <select value={hourRange[0]} onChange={e => setHourRange(r => [+e.target.value, r[1]])} style={SS2}>
            {HOURS.slice(0, 21).map(h => <option key={h} value={h}>{HOUR_LABELS[h]}</option>)}
          </select>
          <span style={{ color: "#CBD5E1" }}>-</span>
          <select value={hourRange[1]} onChange={e => setHourRange(r => [r[0], +e.target.value])} style={SS2}>
            {HOURS.slice(3).map(h => <option key={h} value={h}>{HOUR_LABELS[h]}</option>)}
          </select>
        </div>
      </div>

      {employees.map((emp, ei) => {
        const empSched = schedule[emp.id] || DEFAULT_SCHEDULE;
        const hrs = countHoursWorked(empSched);
        const isCollapsed = collapsed[emp.id];
        const [bg, fg] = avatarColor(emp.name);
        return (
          <div key={emp.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
            <div onClick={() => setCollapsed(c => ({ ...c, [emp.id]: !c[emp.id] }))}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", cursor: "pointer", background: "#fff", userSelect: "none" }}
              onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: bg, color: fg, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {emp.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 14 }}>{emp.name}</div>
                  <div style={{ color: "#94A3B8", fontSize: 11, marginTop: 1 }}>{hrs} hours scheduled this week</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {DAYS.map(d => {
                    const tasks = new Set(Object.values(empSched[d] || {}).filter(v => v !== "off"));
                    const primary = [...tasks][0];
                    const t = primary ? TASK_MAP[primary] : null;
                    return (
                      <div key={d} title={d} style={{
                        width: 20, height: 20, borderRadius: 5, background: t ? t.bg : "#F8FAFC",
                        border: `1.5px solid ${t ? t.dot + "66" : "#F1F5F9"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {t && <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot, display: "block" }} />}
                      </div>
                    );
                  })}
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "#CBD5E1", transition: "transform 0.2s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", flexShrink: 0 }}>
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {!isCollapsed && (
              <div style={{ overflowX: "auto", borderTop: "1px solid #F8FAFC" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", minWidth: visibleDays.length * 88 + 68 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      <th style={{ width: 68, padding: "7px 8px 7px 4px", textAlign: "right", borderRight: "1px solid #F1F5F9", color: "#CBD5E1", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em" }}>TIME</th>
                      {visibleDays.map(d => {
                        const dd = new Date(weekStart);
                        dd.setDate(dd.getDate() + DAYS.indexOf(d));
                        const isToday = dd.toDateString() === new Date().toDateString();
                        return (
                          <th key={d} style={{ padding: "7px 4px", textAlign: "center", borderRight: "1px solid #F1F5F9", minWidth: 88 }}>
                            <span style={{ color: isToday ? "#16A34A" : "#475569", fontWeight: 700, fontSize: 10, letterSpacing: "0.06em" }}>{d.slice(0,3).toUpperCase()}</span>
                            <span style={{ display: "block", color: isToday ? "#16A34A" : "#94A3B8", fontSize: 9, marginTop: 1, fontWeight: isToday ? 700 : 400 }}>
                              {dd.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleHours.map((h, hi) => (
                      <tr key={h} style={{ background: hi % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                        <td style={{ padding: "2px 8px 2px 4px", textAlign: "right", color: "#CBD5E1", fontSize: 9, fontWeight: 600, borderRight: "1px solid #F1F5F9", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                          {HOUR_LABELS[h]}
                        </td>
                        {visibleDays.map(d => (
                          <td key={d} style={{ padding: "2px 3px", borderRight: "1px solid #F8FAFC", verticalAlign: "middle" }}>
                            <TaskPicker value={empSched[d]?.[h] || "off"} onChange={val => onCellChange(emp.id, d, h, val)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Analytics({ employees, allSchedules }) {
  const [range, setRange] = useState(4);
  const weekStarts = Array.from({ length: range }, (_, i) => getWeekStart(-i).toISOString().split("T")[0]);
  const data = employees.map(emp => {
    const scheds = allSchedules.filter(s => s.employee_id === emp.id && weekStarts.includes(s.week_start));
    const hours = scheds.reduce((sum, s) => sum + countHoursWorked(s.schedule_data), 0);
    const weeks = new Set(scheds.filter(s => countHoursWorked(s.schedule_data) > 0).map(s => s.week_start)).size;
    return { ...emp, hours, weeks };
  }).sort((a, b) => b.hours - a.hours);
  const maxH = Math.max(...data.map(d => d.hours), 1);
  const taskTotals = {};
  TASK_TYPES.filter(t => t.id !== "off").forEach(t => { taskTotals[t.id] = 0; });
  for (const s of allSchedules.filter(s => weekStarts.includes(s.week_start))) {
    for (const d of DAYS) for (const h of HOURS) {
      const t = s.schedule_data?.[d]?.[h];
      if (t && t !== "off" && taskTotals[t] !== undefined) taskTotals[t]++;
    }
  }
  const totalTaskH = Object.values(taskTotals).reduce((a, b) => a + b, 0);
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2 style={{ color: "#0F172A", fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Analytics</h2>
          <p style={{ color: "#94A3B8", fontSize: 13, margin: "4px 0 0" }}>Employee hours over time</p>
        </div>
        <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 10, padding: 3, gap: 2 }}>
          {[2, 4, 8, 12].map(w => (
            <button key={w} onClick={() => setRange(w)} style={{
              background: range === w ? "#fff" : "transparent", color: range === w ? "#0F172A" : "#94A3B8",
              border: "none", borderRadius: 8, padding: "5px 14px", cursor: "pointer",
              fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              boxShadow: range === w ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>{w}W</button>
          ))}
        </div>
      </div>
      {!data.length ? (
        <div style={{ textAlign: "center", color: "#94A3B8", marginTop: 80 }}>No data yet.</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 36 }}>
            {data.map(d => {
              const [bg, fg] = avatarColor(d.name);
              return (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: bg, color: fg, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {d.name[0].toUpperCase()}
                  </div>
                  <div style={{ width: 130, color: "#334155", fontSize: 13, fontWeight: 600, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                  <div style={{ flex: 1, background: "#F1F5F9", borderRadius: 8, height: 34, overflow: "hidden" }}>
                    <div style={{
                      width: `${(d.hours / maxH) * 100}%`, height: "100%",
                      background: "linear-gradient(90deg, #16A34A 0%, #4ADE80 100%)",
                      borderRadius: 8, minWidth: d.hours > 0 ? 52 : 0,
                      display: "flex", alignItems: "center", paddingLeft: 12,
                    }}>
                      {d.hours > 0 && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{d.hours}h</span>}
                    </div>
                  </div>
                  <div style={{ width: 100, color: "#94A3B8", fontSize: 11, textAlign: "right", flexShrink: 0 }}>{d.weeks}w active</div>
                </div>
              );
            })}
          </div>
          {totalTaskH > 0 && (
            <div>
              <h3 style={{ color: "#334155", fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>Task Breakdown</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TASK_TYPES.filter(t => t.id !== "off" && taskTotals[t.id] > 0)
                  .sort((a, b) => taskTotals[b.id] - taskTotals[a.id])
                  .map(t => {
                    const pct = Math.round((taskTotals[t.id] / totalTaskH) * 100);
                    return (
                      <div key={t.id} style={{ background: t.bg, border: `1.5px solid ${t.dot}44`, borderRadius: 12, padding: "12px 16px", minWidth: 105 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.dot }} />
                          <span style={{ color: t.text, fontSize: 10, fontWeight: 700 }}>{t.label.toUpperCase()}</span>
                        </div>
                        <div style={{ color: t.text, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{pct}%</div>
                        <div style={{ color: t.text, fontSize: 10, opacity: 0.65, marginTop: 3 }}>{taskTotals[t.id]}h</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function HistoryView({ employees, allSchedules }) {
  const [selectedEmp, setSelectedEmp] = useState("all");
  const SS3 = { background: "#fff", color: "#475569", border: "1.5px solid #E2E8F0", borderRadius: 7, padding: "7px 12px", fontFamily: "inherit", fontSize: 12, cursor: "pointer", outline: "none" };
  const sorted = [...allSchedules].sort((a, b) => new Date(b.week_start) - new Date(a.week_start));
  const filtered = selectedEmp === "all" ? sorted : sorted.filter(s => s.employee_id === selectedEmp);
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ color: "#0F172A", fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>History</h2>
          <p style={{ color: "#94A3B8", fontSize: 13, margin: "4px 0 0" }}>All saved schedules</p>
        </div>
        <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} style={SS3}>
          <option value="all">All Employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      {!filtered.length ? (
        <div style={{ textAlign: "center", color: "#94A3B8", marginTop: 80 }}>No history found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(s => {
            const emp = employees.find(e => e.id === s.employee_id);
            const hours = countHoursWorked(s.schedule_data);
            const ws = new Date(s.week_start + "T12:00:00");
            const we = new Date(ws); we.setDate(we.getDate() + 6);
            const [bg, fg] = emp ? avatarColor(emp.name) : ["#F1F5F9","#64748B"];
            return (
              <div key={s.id} style={{ background: "#fff", border: "1.5px solid #F1F5F9", borderRadius: 12, padding: "16px 20px" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.06)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: bg, color: fg, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {emp ? emp.name[0].toUpperCase() : "?"}
                    </div>
                    <div>
                      <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 14 }}>{emp ? emp.name : "Unknown"}</div>
                      <div style={{ color: "#94A3B8", fontSize: 11 }}>
                        {ws.toLocaleDateString("en-CA", { month: "short", day: "numeric" })} to {we.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                  <span style={{ background: hours > 0 ? "#DCFCE7" : "#F1F5F9", color: hours > 0 ? "#15803D" : "#94A3B8", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                    {hours}h
                  </span>
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {DAYS.map(d => {
                    const tasks = new Set(Object.values(s.schedule_data?.[d] || {}).filter(v => v !== "off"));
                    const primary = [...tasks][0];
                    const t = primary ? TASK_MAP[primary] : null;
                    return (
                      <div key={d} style={{ background: t ? t.bg : "#F8FAFC", border: `1.5px solid ${t ? t.dot + "55" : "#F1F5F9"}`, borderRadius: 7, padding: "5px 10px", fontSize: 10, fontWeight: 600, color: t ? t.text : "#CBD5E1", display: "flex", alignItems: "center", gap: 4 }}>
                        {t && <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot, flexShrink: 0 }} />}
                        {d.slice(0, 3)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Team({ employees, allSchedules, onAdd, onDelete }) {
  const [newName, setNewName] = useState("");
  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#0F172A", fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Team</h2>
        <p style={{ color: "#94A3B8", fontSize: 13, margin: "4px 0 0" }}>Manage your employees</p>
      </div>
      <div style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ color: "#334155", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Add New Employee</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && newName.trim()) { onAdd(newName.trim()); setNewName(""); } }}
            placeholder="Enter full name..."
            style={{ flex: 1, background: "#fff", color: "#0F172A", border: "1.5px solid #E2E8F0", borderRadius: 9, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", outline: "none" }}
            onFocus={e => e.target.style.borderColor = "#16A34A"}
            onBlur={e => e.target.style.borderColor = "#E2E8F0"}
          />
          <button onClick={() => { if (newName.trim()) { onAdd(newName.trim()); setNewName(""); } }} style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}
            onMouseEnter={e => e.currentTarget.style.background = "#15803D"}
            onMouseLeave={e => e.currentTarget.style.background = "#16A34A"}
          >+ Add</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {!employees.length ? (
          <p style={{ color: "#94A3B8", textAlign: "center", marginTop: 40 }}>No employees yet.</p>
        ) : employees.map(emp => {
          const totalH = allSchedules.filter(s => s.employee_id === emp.id).reduce((sum, s) => sum + countHoursWorked(s.schedule_data), 0);
          const [bg, fg] = avatarColor(emp.name);
          return (
            <div key={emp.id} style={{ background: "#fff", border: "1.5px solid #F1F5F9", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: bg, color: fg, fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {emp.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 14 }}>{emp.name}</div>
                  <div style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>{totalH} hours logged total</div>
                </div>
              </div>
              <button onClick={() => onDelete(emp.id, emp.name)} style={{ background: "#FFF1F2", color: "#BE123C", border: "1.5px solid #FECDD3", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
                Remove
              </button>
            </div>
          );
        })}
      </div>
      {!USE_SUPABASE && (
        <div style={{ marginTop: 32, background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 14, padding: 22 }}>
          <div style={{ color: "#92400E", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Connect Supabase for cloud sync</div>
          <p style={{ color: "#A16207", fontSize: 12, lineHeight: 1.7, margin: "0 0 14px" }}>
            Running in local storage mode. Set SUPABASE_URL and SUPABASE_ANON_KEY at the top of this file, then run this SQL in your Supabase dashboard:
          </p>
          <pre style={{ background: "#0F172A", color: "#86EFAC", borderRadius: 10, padding: 16, fontSize: 10, overflowX: "auto", margin: 0, lineHeight: 1.7 }}>{`create table employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);
create table schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  week_start date not null,
  schedule_data jsonb not null,
  updated_at timestamptz default now(),
  unique(employee_id, week_start)
);
alter table employees enable row level security;
alter table schedules enable row level security;
create policy "allow all" on employees for all using (true);
create policy "allow all" on schedules for all using (true);`}</pre>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("schedule");
  const [weekOffset, setWeekOffset] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const weekStart = getWeekStart(weekOffset);
  const weekKey = weekStart.toISOString().split("T")[0];

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [emps, scheds] = await Promise.all([loadEmployees(), loadSchedules()]);
        setEmployees(emps || []);
        setAllSchedules(scheds || []);
        const map = {};
        for (const emp of (emps || [])) {
          const found = (scheds || []).find(s => s.employee_id === emp.id && s.week_start === weekKey);
          map[emp.id] = found ? found.schedule_data : JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
        }
        setSchedule(map);
      } catch (e) { showToast("Failed to load: " + e.message, "error"); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!employees.length) return;
    const map = {};
    for (const emp of employees) {
      const found = allSchedules.find(s => s.employee_id === emp.id && s.week_start === weekKey);
      map[emp.id] = found ? found.schedule_data : JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
    }
    setSchedule(map);
  }, [weekOffset, employees, allSchedules]);

  const handleAddEmployee = async (name) => {
    if (employees.find(e => e.name.toLowerCase() === name.toLowerCase())) { showToast("Employee already exists", "error"); return; }
    try {
      const emp = await saveEmployee(name);
      setEmployees(p => [...p, emp]);
      setSchedule(p => ({ ...p, [emp.id]: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)) }));
      showToast(`${name} added to team`);
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleDeleteEmployee = async (id, name) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try {
      await deleteEmployee(id);
      setEmployees(p => p.filter(e => e.id !== id));
      setSchedule(p => { const n = { ...p }; delete n[id]; return n; });
      setAllSchedules(p => p.filter(s => s.employee_id !== id));
      showToast(`${name} removed`);
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleCellChange = (empId, day, hour, value) => {
    setSchedule(p => ({ ...p, [empId]: { ...p[empId], [day]: { ...p[empId]?.[day], [hour]: value } } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(employees.map(emp => upsertSchedule(emp.id, weekStart, schedule[emp.id] || DEFAULT_SCHEDULE)));
      setAllSchedules(prev => {
        const u = [...prev];
        for (const emp of employees) {
          const idx = u.findIndex(s => s.employee_id === emp.id && s.week_start === weekKey);
          const entry = { id: `${emp.id}_${weekKey}`, employee_id: emp.id, week_start: weekKey, schedule_data: schedule[emp.id] };
          if (idx >= 0) u[idx] = entry; else u.push(entry);
        }
        return u;
      });
      showToast("Schedule saved successfully");
    } catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };

  const NBS = { background: "#fff", color: "#475569", border: "1.5px solid #E2E8F0", borderRadius: 9, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 };

  const TABS = [
    { id: "schedule", label: "Schedule" },
    { id: "history",  label: "History" },
    { id: "analytics",label: "Analytics" },
    { id: "team",     label: "Team" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #F8FAFC; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {toast && (
        <div style={{ position: "fixed", top: 18, right: 18, zIndex: 99999, background: toast.type === "error" ? "#FFF1F2" : "#F0FDF4", color: toast.type === "error" ? "#BE123C" : "#15803D", border: `1.5px solid ${toast.type === "error" ? "#FECDD3" : "#BBF7D0"}`, borderRadius: 10, padding: "11px 18px", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 24px rgba(0,0,0,0.10)", animation: "fadeDown 0.2s ease", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.type === "error" ? "⚠" : "✓"} {toast.msg}
        </div>
      )}

      <header style={{ background: "#fff", borderBottom: "1px solid #F1F5F9", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, background: "#16A34A", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(22,163,74,0.28)" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="3" width="14" height="13" rx="2.5" stroke="#fff" strokeWidth="1.6"/>
              <path d="M2 7.5h14" stroke="#fff" strokeWidth="1.6"/>
              <path d="M6 2v2M12 2v2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="5.5" cy="11" r="1" fill="#fff"/>
              <circle cx="9" cy="11" r="1" fill="#fff"/>
              <circle cx="12.5" cy="11" r="1" fill="#fff"/>
            </svg>
          </div>
          <span style={{ color: "#0F172A", fontWeight: 800, fontSize: 17, letterSpacing: "-0.03em" }}>StaffSchedule</span>
          {!USE_SUPABASE && <span style={{ background: "#FEF9C3", color: "#A16207", border: "1.5px solid #FDE68A", fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>Local</span>}
        </div>
        <nav style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? "#F0FDF4" : "transparent", color: tab === t.id ? "#16A34A" : "#64748B", border: "none", borderRadius: 9, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 700 : 500, fontFamily: "inherit" }}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 20px 40px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, flexDirection: "column", gap: 16 }}>
            <div style={{ width: 36, height: 36, border: "3px solid #E2E8F0", borderTopColor: "#16A34A", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            <span style={{ color: "#94A3B8", fontSize: 13, fontWeight: 500 }}>Loading...</span>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 18, border: "1.5px solid #F1F5F9", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", overflow: "hidden" }}>
            {tab === "schedule" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #F1F5F9" }}>
                  <button onClick={() => setWeekOffset(o => o - 1)} style={NBS} onMouseEnter={e => e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background="#fff"}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8 10.5L4 6.5l4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Prev
                  </button>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em" }}>
                      {weekOffset === 0 ? "This Week" : weekOffset === 1 ? "Next Week" : weekOffset === -1 ? "Last Week" : `${weekOffset > 0 ? "+" : ""}${weekOffset} Weeks`}
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>{formatWeek(weekStart)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} style={{ ...NBS, color: "#16A34A", background: "#F0FDF4", borderColor: "#BBF7D0" }}>Today</button>}
                    <button onClick={() => setWeekOffset(o => o + 1)} style={NBS} onMouseEnter={e => e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background="#fff"}>
                      Next
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
                <ScheduleGrid employees={employees} schedule={schedule} onCellChange={handleCellChange} weekStart={weekStart} />
                {employees.length > 0 && (
                  <div style={{ padding: "14px 20px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FAFAFA", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {TASK_TYPES.filter(t => t.id !== "off").map(t => (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.dot, display: "block" }} />
                          <span style={{ color: "#64748B", fontSize: 11, fontWeight: 500 }}>{t.label}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={handleSave} disabled={saving} style={{ background: saving ? "#86EFAC" : "#16A34A", color: "#fff", border: "none", borderRadius: 10, padding: "10px 28px", cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", boxShadow: saving ? "none" : "0 2px 12px rgba(22,163,74,0.28)" }}>
                      {saving ? "Saving..." : "Save Schedule"}
                    </button>
                  </div>
                )}
              </>
            )}
            {tab === "history" && <HistoryView employees={employees} allSchedules={allSchedules} />}
            {tab === "analytics" && <Analytics employees={employees} allSchedules={allSchedules} />}
            {tab === "team" && <Team employees={employees} allSchedules={allSchedules} onAdd={handleAddEmployee} onDelete={handleDeleteEmployee} />}
          </div>
        )}
      </main>
    </div>
  );
}
