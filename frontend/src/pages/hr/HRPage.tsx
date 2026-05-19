import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Users, Plus, Search, X, Calendar, DollarSign, UserCheck, Check, XCircle, Clock } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const now = new Date();

const S = {
  page: { padding: "24px 28px", background: "#07071A", minHeight: "100vh" } as React.CSSProperties,
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "#EEEEF5", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#505070", marginTop: 2 } as React.CSSProperties,
  btn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  btnSm: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 } as React.CSSProperties,
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 } as React.CSSProperties,
  kpi: { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 12, padding: "18px 20px" } as React.CSSProperties,
  kpiValue: { fontSize: 26, fontWeight: 700, color: "#EEEEF5", margin: "4px 0 0" } as React.CSSProperties,
  kpiLabel: { fontSize: 12, color: "#505070", fontWeight: 500 } as React.CSSProperties,
  card: { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 12, padding: 20 } as React.CSSProperties,
  tabs: { display: "flex", gap: 4, marginBottom: 24 } as React.CSSProperties,
  tab: (a: boolean) => ({ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: a ? "rgba(99,102,241,0.15)" : "transparent", color: a ? "#818CF8" : "#505070" }) as React.CSSProperties,
  toolbar: { display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" as const },
  searchWrap: { position: "relative" as const, flex: 1, maxWidth: 280 },
  searchInput: { width: "100%", background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "8px 12px 8px 34px", color: "#EEEEF5", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  searchIcon: { position: "absolute" as const, left: 10, top: "50%", transform: "translateY(-50%)", color: "#505070" },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#404060", textTransform: "uppercase" as const, borderBottom: "1px solid #1C1C35" },
  td: { padding: "12px 12px", fontSize: 13, color: "#CCCCEE", borderBottom: "1px solid #131327" },
  modal: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modalBox: { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 16, padding: 28, width: 520, maxHeight: "90vh", overflowY: "auto" as const },
  input: { width: "100%", background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "9px 12px", color: "#EEEEF5", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#505070", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 },
  select: { width: "100%", background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "9px 12px", color: "#EEEEF5", fontSize: 13, outline: "none", colorScheme: "dark" as const, boxSizing: "border-box" as const },
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as React.CSSProperties,
  filterSel: { background: "#131327", border: "1px solid #1E1E38", borderRadius: 8, padding: "7px 10px", color: "#EEEEF5", fontSize: 12, outline: "none", colorScheme: "dark" as const },
  empty: { padding: "48px 20px", textAlign: "center" as const, color: "#505070", fontSize: 13 },
};

interface Summary { total: number; active: number; onLeave: number; departments: Array<{ department: string | null; _count: number }>; }
interface Employee { id: string; employeeCode: string; name: string; designation?: string; department?: string; employmentType: string; status: string; basicSalary: number; joiningDate: string; }
interface AttRecord { id: string; employeeId: string; date: string; status: string; checkIn?: string; checkOut?: string; notes?: string; employee: { id: string; name: string; employeeCode: string }; }
interface Payroll { id: string; employeeId: string; month: number; year: number; basicSalary: number; hra: number; allowances: number; grossSalary: number; pfDeduction: number; esiDeduction: number; deductions: number; netSalary: number; presentDays: number; workingDays: number; employee: { id: string; name: string; employeeCode: string; designation?: string }; }
interface LeaveReq { id: string; employeeId: string; leaveType: string; fromDate: string; toDate: string; days: number; reason?: string; status: string; employee: { id: string; name: string; employeeCode: string }; }

const ATT_STATUSES = ["PRESENT","ABSENT","HALF_DAY","LEAVE","HOLIDAY"];
const ATT_COLORS: Record<string,string> = { PRESENT:"#10b981", ABSENT:"#ef4444", HALF_DAY:"#f59e0b", LEAVE:"#6366f1", HOLIDAY:"#8b5cf6" };
const LEAVE_STATUS_COLORS: Record<string,string> = { PENDING:"#f59e0b", APPROVED:"#10b981", REJECTED:"#ef4444" };

const empEmpty = { employeeCode:"", name:"", email:"", phone:"", designation:"", department:"", employmentType:"FULL_TIME", joiningDate:"", basicSalary:"", bankAccount:"", bankIfsc:"", panNumber:"" };
const attEmpty = { employeeId:"", date: now.toISOString().slice(0,10), status:"PRESENT", checkIn:"", checkOut:"", notes:"" };
const payEmpty = { employeeId:"", month: String(now.getMonth()+1), year: String(now.getFullYear()), workingDays:"26", presentDays:"", hra:"0", allowances:"0", deductions:"0" };
const leaveEmpty = { employeeId:"", leaveType:"Annual", fromDate:"", toDate:"", reason:"" };

function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:600, background: color+"20", color }}>{text.replace("_"," ")}</span>;
}

export default function HRPage() {
  const [tab, setTab] = useState<"employees"|"attendance"|"payroll"|"leaves">("employees");
  const [summary, setSummary] = useState<Summary|null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Employee modal
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [empForm, setEmpForm] = useState({ ...empEmpty });

  // Attendance
  const [attRecords, setAttRecords] = useState<AttRecord[]>([]);
  const [attMonth, setAttMonth] = useState(now.getMonth()+1);
  const [attYear, setAttYear] = useState(now.getFullYear());
  const [attLoading, setAttLoading] = useState(false);
  const [showAttModal, setShowAttModal] = useState(false);
  const [attForm, setAttForm] = useState({ ...attEmpty });

  // Payroll
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [payMonth, setPayMonth] = useState(now.getMonth()+1);
  const [payYear, setPayYear] = useState(now.getFullYear());
  const [payLoading, setPayLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ ...payEmpty });

  // Leaves
  const [leaves, setLeaves] = useState<LeaveReq[]>([]);
  const [leaveFilter, setLeaveFilter] = useState("");
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ ...leaveEmpty });

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, empRes] = await Promise.all([
        api.get("/hr/summary"),
        api.get(`/hr?search=${search}&limit=100`),
      ]);
      setSummary(sumRes.data.data);
      setEmployees(empRes.data.data.employees || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  const loadAttendance = useCallback(async () => {
    setAttLoading(true);
    try {
      const r = await api.get(`/hr/attendance?month=${attMonth}&year=${attYear}`);
      setAttRecords(r.data.data || []);
    } catch { /* ignore */ }
    setAttLoading(false);
  }, [attMonth, attYear]);

  const loadPayroll = useCallback(async () => {
    setPayLoading(true);
    try {
      const r = await api.get(`/hr/payroll?month=${payMonth}&year=${payYear}`);
      setPayrolls(r.data.data || []);
    } catch { /* ignore */ }
    setPayLoading(false);
  }, [payMonth, payYear]);

  const loadLeaves = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const r = await api.get(`/hr/leaves${leaveFilter ? `?status=${leaveFilter}` : ""}`);
      setLeaves(r.data.data || []);
    } catch { /* ignore */ }
    setLeaveLoading(false);
  }, [leaveFilter]);

  useEffect(() => { loadBase(); }, [loadBase]);
  useEffect(() => { if (tab === "attendance") loadAttendance(); }, [tab, loadAttendance]);
  useEffect(() => { if (tab === "payroll") loadPayroll(); }, [tab, loadPayroll]);
  useEffect(() => { if (tab === "leaves") loadLeaves(); }, [tab, loadLeaves]);

  // Employee CRUD
  const openAdd = () => { setEditId(null); setEmpForm({ ...empEmpty }); setError(""); setShowEmpModal(true); };
  const openEdit = (e: Employee) => {
    setEditId(e.id);
    setEmpForm({ employeeCode:e.employeeCode, name:e.name, email:"", phone:"", designation:e.designation||"", department:e.department||"", employmentType:e.employmentType, joiningDate:new Date(e.joiningDate).toISOString().slice(0,10), basicSalary:String(e.basicSalary), bankAccount:"", bankIfsc:"", panNumber:"" });
    setError(""); setShowEmpModal(true);
  };
  const saveEmployee = async () => {
    setSaving(true); setError("");
    try {
      const payload = { ...empForm, basicSalary:parseFloat(empForm.basicSalary)||0, email:empForm.email||undefined, phone:empForm.phone||undefined };
      if (editId) await api.patch(`/hr/${editId}`, payload);
      else await api.post("/hr", payload);
      setShowEmpModal(false); loadBase();
    } catch (e: unknown) { setError((e as {response?:{data?:{message?:string}}})?.response?.data?.message || "Failed to save"); }
    setSaving(false);
  };

  // Attendance save
  const saveAttendance = async () => {
    setSaving(true); setError("");
    try {
      await api.post("/hr/attendance", { ...attForm, checkIn:attForm.checkIn||undefined, checkOut:attForm.checkOut||undefined, notes:attForm.notes||undefined });
      setShowAttModal(false); loadAttendance();
    } catch (e: unknown) { setError((e as {response?:{data?:{message?:string}}})?.response?.data?.message || "Failed"); }
    setSaving(false);
  };

  // Payroll save
  const savePayroll = async () => {
    setSaving(true); setError("");
    try {
      await api.post("/hr/payroll", { employeeId:payForm.employeeId, month:parseInt(payForm.month), year:parseInt(payForm.year), workingDays:parseInt(payForm.workingDays)||26, presentDays:parseFloat(payForm.presentDays)||0, hra:parseFloat(payForm.hra)||0, allowances:parseFloat(payForm.allowances)||0, deductions:parseFloat(payForm.deductions)||0 });
      setShowPayModal(false); loadPayroll();
    } catch (e: unknown) { setError((e as {response?:{data?:{message?:string}}})?.response?.data?.message || "Failed"); }
    setSaving(false);
  };

  // Leave save
  const saveLeave = async () => {
    setSaving(true); setError("");
    try {
      await api.post("/hr/leaves", { ...leaveForm, reason:leaveForm.reason||undefined });
      setShowLeaveModal(false); loadLeaves(); loadBase();
    } catch (e: unknown) { setError((e as {response?:{data?:{message?:string}}})?.response?.data?.message || "Failed"); }
    setSaving(false);
  };

  const updateLeaveStatus = async (id: string, status: "APPROVED"|"REJECTED") => {
    try {
      await api.patch(`/hr/leaves/${id}/status`, { status });
      loadLeaves(); loadBase();
    } catch { /* ignore */ }
  };

  const ef = (k: keyof typeof empEmpty, v: string) => setEmpForm(p => ({ ...p, [k]:v }));
  const af = (k: keyof typeof attEmpty, v: string) => setAttForm(p => ({ ...p, [k]:v }));
  const pf = (k: keyof typeof payEmpty, v: string) => setPayForm(p => ({ ...p, [k]:v }));
  const lf = (k: keyof typeof leaveEmpty, v: string) => setLeaveForm(p => ({ ...p, [k]:v }));

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits:0 })}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });

  const years = Array.from({ length:4 }, (_,i) => now.getFullYear()-i);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>HR & Payroll</h1>
          <p style={S.subtitle}>Employees, attendance, salary and leave management</p>
        </div>
        {tab === "employees" && <button style={S.btn} onClick={openAdd}><Plus size={15}/> Add Employee</button>}
        {tab === "attendance" && <button style={S.btn} onClick={() => { setAttForm({ ...attEmpty }); setError(""); setShowAttModal(true); }}><Plus size={15}/> Mark Attendance</button>}
        {tab === "payroll" && <button style={S.btn} onClick={() => { setPayForm({ ...payEmpty }); setError(""); setShowPayModal(true); }}><Plus size={15}/> Generate Payroll</button>}
        {tab === "leaves" && <button style={S.btn} onClick={() => { setLeaveForm({ ...leaveEmpty }); setError(""); setShowLeaveModal(true); }}><Plus size={15}/> Apply Leave</button>}
      </div>

      {/* KPIs */}
      <div style={S.kpiGrid}>
        {[
          { label:"Total Employees", value:summary?.total ?? "—", icon:<Users size={18} color="#6366f1"/>, color:"#6366f1" },
          { label:"Active", value:summary?.active ?? "—", icon:<UserCheck size={18} color="#10b981"/>, color:"#10b981" },
          { label:"On Leave Today", value:summary?.onLeave ?? "—", icon:<Calendar size={18} color="#f59e0b"/>, color:"#f59e0b" },
          { label:"Departments", value:summary?.departments.length ?? "—", icon:<DollarSign size={18} color="#8b5cf6"/>, color:"#8b5cf6" },
        ].map(k => (
          <div key={k.label} style={S.kpi}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={S.kpiLabel}>{k.label}</span>
              <div style={{ padding:6, borderRadius:8, background:k.color+"20" }}>{k.icon}</div>
            </div>
            <div style={S.kpiValue}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {(["employees","attendance","payroll","leaves"] as const).map(t => (
          <button key={t} style={S.tab(tab===t)} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {/* ── Employees Tab ── */}
      {tab === "employees" && (
        <div style={S.card}>
          <div style={S.toolbar}>
            <div style={S.searchWrap}>
              <Search size={14} style={S.searchIcon}/>
              <input style={S.searchInput} placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>
          {loading ? <div style={S.empty}>Loading...</div> : (
            <table style={S.table}>
              <thead><tr>{["Emp Code","Name","Designation","Department","Type","Salary","Joined","Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {employees.length === 0
                  ? <tr><td colSpan={8} style={S.empty}>No employees yet. Add your first employee.</td></tr>
                  : employees.map(e => (
                    <tr key={e.id} onClick={() => openEdit(e)} style={{ cursor:"pointer" }}>
                      <td style={{ ...S.td, color:"#818CF8", fontWeight:600 }}>{e.employeeCode}</td>
                      <td style={{ ...S.td, color:"#EEEEF5", fontWeight:500 }}>{e.name}</td>
                      <td style={S.td}>{e.designation || "—"}</td>
                      <td style={S.td}>{e.department || "—"}</td>
                      <td style={S.td}><Badge text={e.employmentType} color="#6366f1"/></td>
                      <td style={{ ...S.td, color:"#EEEEF5" }}>{fmt(e.basicSalary)}/mo</td>
                      <td style={S.td}>{fmtDate(e.joiningDate)}</td>
                      <td style={S.td}><Badge text={e.status} color={e.status==="ACTIVE"?"#10b981":"#ef4444"}/></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Attendance Tab ── */}
      {tab === "attendance" && (
        <div style={S.card}>
          <div style={S.toolbar}>
            <span style={{ fontSize:13, color:"#CCCCEE", fontWeight:600 }}>Filter:</span>
            <select style={S.filterSel} value={attMonth} onChange={e => setAttMonth(parseInt(e.target.value))}>
              {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <select style={S.filterSel} value={attYear} onChange={e => setAttYear(parseInt(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ marginLeft:"auto", fontSize:12, color:"#505070" }}>{attRecords.length} records</span>
          </div>
          {attLoading ? <div style={S.empty}>Loading...</div> : (
            <table style={S.table}>
              <thead>
                <tr>{["Employee","Code","Date","Status","Check-In","Check-Out","Notes"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {attRecords.length === 0
                  ? <tr><td colSpan={7} style={S.empty}>No attendance records for {MONTHS[attMonth-1]} {attYear}.</td></tr>
                  : attRecords.map(r => (
                    <tr key={r.id}>
                      <td style={{ ...S.td, color:"#EEEEF5", fontWeight:500 }}>{r.employee.name}</td>
                      <td style={{ ...S.td, color:"#818CF8", fontSize:12 }}>{r.employee.employeeCode}</td>
                      <td style={S.td}>{fmtDate(r.date)}</td>
                      <td style={S.td}><Badge text={r.status} color={ATT_COLORS[r.status]||"#CCCCEE"}/></td>
                      <td style={S.td}>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : "—"}</td>
                      <td style={S.td}>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : "—"}</td>
                      <td style={{ ...S.td, fontSize:12, color:"#505070" }}>{r.notes || "—"}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Payroll Tab ── */}
      {tab === "payroll" && (
        <div style={S.card}>
          <div style={S.toolbar}>
            <span style={{ fontSize:13, color:"#CCCCEE", fontWeight:600 }}>Filter:</span>
            <select style={S.filterSel} value={payMonth} onChange={e => setPayMonth(parseInt(e.target.value))}>
              {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <select style={S.filterSel} value={payYear} onChange={e => setPayYear(parseInt(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ marginLeft:"auto", fontSize:12, color:"#505070" }}>
              {payrolls.length} payslips &nbsp;|&nbsp; Total: {fmt(payrolls.reduce((s,p)=>s+p.netSalary,0))}
            </span>
          </div>
          {payLoading ? <div style={S.empty}>Loading...</div> : (
            <table style={S.table}>
              <thead>
                <tr>{["Employee","Month","Days Present","Basic Earned","HRA+Allowances","Deductions","Gross","Net Salary"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {payrolls.length === 0
                  ? <tr><td colSpan={8} style={S.empty}>No payrolls for {MONTHS[payMonth-1]} {payYear}.</td></tr>
                  : payrolls.map(p => (
                    <tr key={p.id}>
                      <td style={{ ...S.td, color:"#EEEEF5", fontWeight:500 }}>
                        <div>{p.employee.name}</div>
                        <div style={{ fontSize:11, color:"#505070" }}>{p.employee.employeeCode} {p.employee.designation ? `· ${p.employee.designation}` : ""}</div>
                      </td>
                      <td style={S.td}>{MONTHS[p.month-1]} {p.year}</td>
                      <td style={S.td}>{p.presentDays}/{p.workingDays}</td>
                      <td style={S.td}>{fmt(p.basicSalary)}</td>
                      <td style={{ ...S.td, color:"#10b981" }}>{fmt(p.hra + p.allowances)}</td>
                      <td style={{ ...S.td, color:"#ef4444" }}>{fmt(p.pfDeduction + p.esiDeduction + p.deductions)}</td>
                      <td style={S.td}>{fmt(p.grossSalary)}</td>
                      <td style={{ ...S.td, color:"#EEEEF5", fontWeight:700 }}>{fmt(p.netSalary)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Leaves Tab ── */}
      {tab === "leaves" && (
        <div style={S.card}>
          <div style={S.toolbar}>
            <span style={{ fontSize:13, color:"#CCCCEE", fontWeight:600 }}>Status:</span>
            {["","PENDING","APPROVED","REJECTED"].map(s => (
              <button key={s||"ALL"} onClick={() => setLeaveFilter(s)} style={{ ...S.btnSm, background:leaveFilter===s?"rgba(99,102,241,0.2)":"transparent", color:leaveFilter===s?"#818CF8":"#505070", border:"1px solid "+(leaveFilter===s?"#6366f130":"transparent") }}>
                {s||"All"}
              </button>
            ))}
            <span style={{ marginLeft:"auto", fontSize:12, color:"#505070" }}>{leaves.length} requests</span>
          </div>
          {leaveLoading ? <div style={S.empty}>Loading...</div> : (
            <table style={S.table}>
              <thead>
                <tr>{["Employee","Leave Type","From","To","Days","Reason","Status","Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {leaves.length === 0
                  ? <tr><td colSpan={8} style={S.empty}>No leave requests{leaveFilter ? ` with status ${leaveFilter}` : ""}.</td></tr>
                  : leaves.map(l => (
                    <tr key={l.id}>
                      <td style={{ ...S.td, color:"#EEEEF5", fontWeight:500 }}>
                        <div>{l.employee.name}</div>
                        <div style={{ fontSize:11, color:"#505070" }}>{l.employee.employeeCode}</div>
                      </td>
                      <td style={S.td}>{l.leaveType}</td>
                      <td style={S.td}>{fmtDate(l.fromDate)}</td>
                      <td style={S.td}>{fmtDate(l.toDate)}</td>
                      <td style={{ ...S.td, color:"#EEEEF5", fontWeight:600 }}>{l.days}</td>
                      <td style={{ ...S.td, fontSize:12, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{l.reason || "—"}</td>
                      <td style={S.td}><Badge text={l.status} color={LEAVE_STATUS_COLORS[l.status]||"#CCCCEE"}/></td>
                      <td style={S.td}>
                        {l.status === "PENDING" && (
                          <div style={{ display:"flex", gap:6 }}>
                            <button onClick={() => updateLeaveStatus(l.id,"APPROVED")} style={{ padding:"3px 8px", borderRadius:5, border:"none", cursor:"pointer", background:"#10b98120", color:"#10b981", fontSize:11, display:"flex", alignItems:"center", gap:3 }}>
                              <Check size={11}/> Approve
                            </button>
                            <button onClick={() => updateLeaveStatus(l.id,"REJECTED")} style={{ padding:"3px 8px", borderRadius:5, border:"none", cursor:"pointer", background:"#ef444420", color:"#ef4444", fontSize:11, display:"flex", alignItems:"center", gap:3 }}>
                              <XCircle size={11}/> Reject
                            </button>
                          </div>
                        )}
                        {l.status !== "PENDING" && <span style={{ fontSize:11, color:"#505070" }}><Clock size={10}/> Resolved</span>}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Employee Modal ── */}
      {showEmpModal && (
        <div style={S.modal} onClick={e => e.target===e.currentTarget && setShowEmpModal(false)}>
          <div style={S.modalBox}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h3 style={{ color:"#EEEEF5", margin:0, fontSize:16, fontWeight:700 }}>{editId?"Edit Employee":"Add Employee"}</h3>
              <button onClick={() => setShowEmpModal(false)} style={{ background:"none", border:"none", color:"#505070", cursor:"pointer" }}><X size={18}/></button>
            </div>
            {error && <div style={{ background:"#ef444420", border:"1px solid #ef4444", borderRadius:8, padding:"8px 12px", color:"#ef4444", fontSize:12, marginBottom:14 }}>{error}</div>}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={S.g2}>
                <div><label style={S.label}>Employee Code *</label><input style={S.input} value={empForm.employeeCode} onChange={e=>ef("employeeCode",e.target.value)} placeholder="EMP-001"/></div>
                <div><label style={S.label}>Full Name *</label><input style={S.input} value={empForm.name} onChange={e=>ef("name",e.target.value)}/></div>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>Email</label><input type="email" style={S.input} value={empForm.email} onChange={e=>ef("email",e.target.value)}/></div>
                <div><label style={S.label}>Phone</label><input style={S.input} value={empForm.phone} onChange={e=>ef("phone",e.target.value)}/></div>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>Designation</label><input style={S.input} value={empForm.designation} onChange={e=>ef("designation",e.target.value)}/></div>
                <div><label style={S.label}>Department</label><input style={S.input} value={empForm.department} onChange={e=>ef("department",e.target.value)}/></div>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>Employment Type</label>
                  <select style={S.select} value={empForm.employmentType} onChange={e=>ef("employmentType",e.target.value)}>
                    {["FULL_TIME","PART_TIME","CONTRACT","INTERN"].map(t=><option key={t} value={t}>{t.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div><label style={S.label}>Joining Date *</label><input type="date" style={S.input} value={empForm.joiningDate} onChange={e=>ef("joiningDate",e.target.value)}/></div>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>Basic Salary (₹/month)</label><input type="number" style={S.input} value={empForm.basicSalary} onChange={e=>ef("basicSalary",e.target.value)}/></div>
                <div><label style={S.label}>PAN Number</label><input style={S.input} value={empForm.panNumber} onChange={e=>ef("panNumber",e.target.value)} placeholder="ABCDE1234F"/></div>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>Bank Account</label><input style={S.input} value={empForm.bankAccount} onChange={e=>ef("bankAccount",e.target.value)}/></div>
                <div><label style={S.label}>IFSC Code</label><input style={S.input} value={empForm.bankIfsc} onChange={e=>ef("bankIfsc",e.target.value)}/></div>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
              <button onClick={() => setShowEmpModal(false)} style={{ ...S.btn, background:"#1C1C35", color:"#CCCCEE" }}>Cancel</button>
              <button onClick={saveEmployee} style={S.btn} disabled={saving}>{saving?"Saving...":editId?"Update":"Add Employee"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark Attendance Modal ── */}
      {showAttModal && (
        <div style={S.modal} onClick={e => e.target===e.currentTarget && setShowAttModal(false)}>
          <div style={{ ...S.modalBox, width:460 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h3 style={{ color:"#EEEEF5", margin:0, fontSize:16, fontWeight:700 }}>Mark Attendance</h3>
              <button onClick={() => setShowAttModal(false)} style={{ background:"none", border:"none", color:"#505070", cursor:"pointer" }}><X size={18}/></button>
            </div>
            {error && <div style={{ background:"#ef444420", border:"1px solid #ef4444", borderRadius:8, padding:"8px 12px", color:"#ef4444", fontSize:12, marginBottom:14 }}>{error}</div>}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div><label style={S.label}>Employee *</label>
                <select style={S.select} value={attForm.employeeId} onChange={e=>af("employeeId",e.target.value)}>
                  <option value="">Select employee...</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>)}
                </select>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>Date *</label><input type="date" style={S.input} value={attForm.date} onChange={e=>af("date",e.target.value)}/></div>
                <div><label style={S.label}>Status *</label>
                  <select style={S.select} value={attForm.status} onChange={e=>af("status",e.target.value)}>
                    {ATT_STATUSES.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
                  </select>
                </div>
              </div>
              {(attForm.status==="PRESENT"||attForm.status==="HALF_DAY") && (
                <div style={S.g2}>
                  <div><label style={S.label}>Check-In Time</label><input type="time" style={S.input} value={attForm.checkIn} onChange={e=>af("checkIn",e.target.value)}/></div>
                  <div><label style={S.label}>Check-Out Time</label><input type="time" style={S.input} value={attForm.checkOut} onChange={e=>af("checkOut",e.target.value)}/></div>
                </div>
              )}
              <div><label style={S.label}>Notes</label><input style={S.input} value={attForm.notes} onChange={e=>af("notes",e.target.value)} placeholder="Optional notes..."/></div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
              <button onClick={() => setShowAttModal(false)} style={{ ...S.btn, background:"#1C1C35", color:"#CCCCEE" }}>Cancel</button>
              <button onClick={saveAttendance} style={S.btn} disabled={saving||!attForm.employeeId}>{saving?"Saving...":"Mark Attendance"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Generate Payroll Modal ── */}
      {showPayModal && (
        <div style={S.modal} onClick={e => e.target===e.currentTarget && setShowPayModal(false)}>
          <div style={{ ...S.modalBox, width:500 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h3 style={{ color:"#EEEEF5", margin:0, fontSize:16, fontWeight:700 }}>Generate Payroll</h3>
              <button onClick={() => setShowPayModal(false)} style={{ background:"none", border:"none", color:"#505070", cursor:"pointer" }}><X size={18}/></button>
            </div>
            {error && <div style={{ background:"#ef444420", border:"1px solid #ef4444", borderRadius:8, padding:"8px 12px", color:"#ef4444", fontSize:12, marginBottom:14 }}>{error}</div>}
            <div style={{ background:"#131327", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#505070" }}>
              PF (12% of basic) and ESI (0.75% if gross ≤ ₹21,000) are auto-calculated.
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div><label style={S.label}>Employee *</label>
                <select style={S.select} value={payForm.employeeId} onChange={e=>pf("employeeId",e.target.value)}>
                  <option value="">Select employee...</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name} ({e.employeeCode}) — ₹{e.basicSalary.toLocaleString("en-IN")}/mo</option>)}
                </select>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>Month *</label>
                  <select style={S.select} value={payForm.month} onChange={e=>pf("month",e.target.value)}>
                    {MONTHS.map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
                  </select>
                </div>
                <div><label style={S.label}>Year *</label>
                  <select style={S.select} value={payForm.year} onChange={e=>pf("year",e.target.value)}>
                    {years.map(y=><option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>Working Days</label><input type="number" style={S.input} value={payForm.workingDays} onChange={e=>pf("workingDays",e.target.value)} min="1" max="31"/></div>
                <div><label style={S.label}>Days Present *</label><input type="number" style={S.input} value={payForm.presentDays} onChange={e=>pf("presentDays",e.target.value)} min="0" max="31"/></div>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>HRA (₹)</label><input type="number" style={S.input} value={payForm.hra} onChange={e=>pf("hra",e.target.value)} min="0"/></div>
                <div><label style={S.label}>Other Allowances (₹)</label><input type="number" style={S.input} value={payForm.allowances} onChange={e=>pf("allowances",e.target.value)} min="0"/></div>
              </div>
              <div><label style={S.label}>Other Deductions (₹)</label><input type="number" style={S.input} value={payForm.deductions} onChange={e=>pf("deductions",e.target.value)} min="0"/></div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
              <button onClick={() => setShowPayModal(false)} style={{ ...S.btn, background:"#1C1C35", color:"#CCCCEE" }}>Cancel</button>
              <button onClick={savePayroll} style={S.btn} disabled={saving||!payForm.employeeId||!payForm.presentDays}>{saving?"Generating...":"Generate Payroll"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Apply Leave Modal ── */}
      {showLeaveModal && (
        <div style={S.modal} onClick={e => e.target===e.currentTarget && setShowLeaveModal(false)}>
          <div style={{ ...S.modalBox, width:460 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h3 style={{ color:"#EEEEF5", margin:0, fontSize:16, fontWeight:700 }}>Apply for Leave</h3>
              <button onClick={() => setShowLeaveModal(false)} style={{ background:"none", border:"none", color:"#505070", cursor:"pointer" }}><X size={18}/></button>
            </div>
            {error && <div style={{ background:"#ef444420", border:"1px solid #ef4444", borderRadius:8, padding:"8px 12px", color:"#ef4444", fontSize:12, marginBottom:14 }}>{error}</div>}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div><label style={S.label}>Employee *</label>
                <select style={S.select} value={leaveForm.employeeId} onChange={e=>lf("employeeId",e.target.value)}>
                  <option value="">Select employee...</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>)}
                </select>
              </div>
              <div><label style={S.label}>Leave Type</label>
                <select style={S.select} value={leaveForm.leaveType} onChange={e=>lf("leaveType",e.target.value)}>
                  {["Annual","Sick","Casual","Maternity","Paternity","Unpaid","Other"].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>From Date *</label><input type="date" style={S.input} value={leaveForm.fromDate} onChange={e=>lf("fromDate",e.target.value)}/></div>
                <div><label style={S.label}>To Date *</label><input type="date" style={S.input} value={leaveForm.toDate} onChange={e=>lf("toDate",e.target.value)}/></div>
              </div>
              <div><label style={S.label}>Reason</label><textarea style={{ ...S.input, height:70, resize:"none" as const }} value={leaveForm.reason} onChange={e=>lf("reason",e.target.value)} placeholder="Reason for leave..."/></div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
              <button onClick={() => setShowLeaveModal(false)} style={{ ...S.btn, background:"#1C1C35", color:"#CCCCEE" }}>Cancel</button>
              <button onClick={saveLeave} style={S.btn} disabled={saving||!leaveForm.employeeId||!leaveForm.fromDate||!leaveForm.toDate}>{saving?"Submitting...":"Submit Request"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
