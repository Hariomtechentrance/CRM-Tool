import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Module data ──────────────────────────────────────────────
const MODULES = [
  {
    icon: "🤝", name: "CRM & Parties",
    tag: "Core",
    color: "#6366f1",
    desc: "Manage customers, suppliers, contacts and their full communication history in one place.",
    features: ["Customer & supplier profiles", "Contact management", "Communication log", "Credit limits & payment terms", "GSTIN / PAN / IEC tracking"],
  },
  {
    icon: "📦", name: "Inventory & Stock",
    tag: "Core",
    color: "#8b5cf6",
    desc: "Track every SKU, set reorder levels and get instant low-stock alerts before you run out.",
    features: ["Product catalog with HSN codes", "Real-time stock levels", "Low-stock & out-of-stock alerts", "Category management", "Barcode support"],
  },
  {
    icon: "🛒", name: "Purchase Orders",
    tag: "Core",
    color: "#10b981",
    desc: "Raise POs to suppliers, track delivery status and auto-update inventory on receipt.",
    features: ["PO creation & approval", "Item-level tracking", "Partial receipt support", "Supplier history", "PDF export"],
  },
  {
    icon: "🚚", name: "Sales & Dispatch",
    tag: "Core",
    color: "#f59e0b",
    desc: "Process sales orders from confirmation to dispatch with live delivery tracking.",
    features: ["Sales order management", "Goods outward dispatch", "Vehicle & driver tracking", "Delivery status updates", "Shipping charges"],
  },
  {
    icon: "💰", name: "Finance & Invoicing",
    tag: "Core",
    color: "#ef4444",
    desc: "GST-compliant invoices, track receivables/payables and print professional invoices instantly.",
    features: ["GST invoices (CGST/SGST/IGST)", "Receivables & payables", "Payment recording", "Overdue tracking", "Print-ready invoice PDF"],
  },
  {
    icon: "👥", name: "HR & Payroll",
    tag: "Core",
    color: "#06b6d4",
    desc: "Full employee lifecycle — from onboarding to monthly auto-salary, attendance and leave management.",
    features: ["Employee profiles & documents", "Attendance tracking (check-in/out)", "Auto payroll generation", "PF & ESI auto-calculation", "Leave approvals"],
  },
  {
    icon: "🎯", name: "Leads & Pipeline",
    tag: "Growth",
    color: "#f97316",
    desc: "Kanban pipeline to track leads from first contact to closed deal with full activity history.",
    features: ["Kanban lead board", "Stage-wise tracking", "Lead value & source", "Follow-up reminders", "Conversion analytics"],
  },
  {
    icon: "🤜", name: "Deals",
    tag: "Growth",
    color: "#a78bfa",
    desc: "Track high-value deals through stages, forecast revenue and never lose a winning opportunity.",
    features: ["Deal pipeline stages", "Expected close date", "Deal value tracking", "Activity log per deal", "Win/loss analysis"],
  },
  {
    icon: "📋", name: "Quotations",
    tag: "Growth",
    color: "#34d399",
    desc: "Create professional quotations in seconds, convert them to orders and print or email instantly.",
    features: ["Multi-item quotations", "GST / discount support", "Valid-until date", "Print & email ready", "Convert to sales order"],
  },
  {
    icon: "🎫", name: "Support Tickets",
    tag: "Growth",
    color: "#60a5fa",
    desc: "Manage customer support requests with priority tracking and SLA-aware resolution.",
    features: ["Ticket creation & assignment", "Priority levels (Low→Critical)", "Status tracking", "Customer communication", "Resolution history"],
  },
  {
    icon: "🏭", name: "Warehouse",
    tag: "Operations",
    color: "#fb923c",
    desc: "Multi-location warehouse with bin-level stock tracking and transfer management.",
    features: ["Multiple warehouse locations", "Bin / rack management", "Stock transfers", "Inward & outward movements", "Stock take (cycle count)"],
  },
  {
    icon: "🏪", name: "Retail & POS",
    tag: "Operations",
    color: "#e879f9",
    desc: "Walk-in sale at the counter — barcode scan, quick billing and daily sales summary.",
    features: ["Point of sale interface", "Barcode scanning", "Quick checkout", "Daily sales report", "Returns management"],
  },
  {
    icon: "📊", name: "Projects & Tasks",
    tag: "Operations",
    color: "#4ade80",
    desc: "Plan projects, assign tasks and track milestones — keep every team on schedule.",
    features: ["Project creation & milestones", "Task assignment & deadlines", "Status tracking", "Team collaboration", "Progress reporting"],
  },
  {
    icon: "🌐", name: "Import-Export Suite",
    tag: "Operations",
    color: "#38bdf8",
    desc: "Built for EXIM traders — HS codes, trade documentation, shipping and customs tracking.",
    features: ["HS code management", "Trade documentation", "Shipping line tracking", "Port of loading/discharge", "Bill of lading management"],
  },
  {
    icon: "📧", name: "Email & Activities",
    tag: "Communication",
    color: "#facc15",
    desc: "Send emails to clients, log calls and meetings and keep a full activity timeline.",
    features: ["Email composition & sending", "Activity logging (call, meeting, note)", "Follow-up scheduling", "Timeline view", "Team visibility"],
  },
  {
    icon: "📄", name: "Documents",
    tag: "Communication",
    color: "#94a3b8",
    desc: "Upload, organise and share business documents — invoices, contracts, compliance, photos.",
    features: ["Upload any file type", "Link to party / order / employee", "Cloud storage (Cloudinary)", "Search by name or tag", "Secure download links"],
  },
];

const TAGS = ["All", "Core", "Growth", "Operations", "Communication"];
const TAG_COLORS: Record<string, string> = {
  Core: "#6366f1", Growth: "#10b981", Operations: "#f59e0b", Communication: "#06b6d4",
};

const WHY = [
  { icon: "🇮🇳", title: "Built for Indian Business", desc: "GSTIN, PAN, IEC, HSN codes, CGST/SGST/IGST — all Indian compliance baked in from day one." },
  { icon: "⚡", title: "Everything in One Place", desc: "CRM, inventory, HR, finance, projects — no switching between 6 apps. One login, one dashboard." },
  { icon: "🔒", title: "Secure & Multi-tenant", desc: "Each organisation is completely isolated. Role-based access, JWT auth, rate limiting and audit logs." },
  { icon: "📱", title: "Fully Responsive", desc: "Works on mobile, tablet and desktop. Manage your business from anywhere, any device." },
];

const STEPS = [
  { n: "01", title: "Register & Create Your Org", desc: "Sign up free, create your organisation and invite your team in under 2 minutes." },
  { n: "02", title: "Enable the Modules You Need", desc: "Turn on only the features relevant to your business — CRM, HR, inventory or all of them." },
  { n: "03", title: "Start Working", desc: "Add parties, products, employees and let FlowCRM handle the calculations, alerts and reports." },
];

// ── Component ────────────────────────────────────────────────
export default function LandingPage() {
  const navigate  = useNavigate();
  const [filter, setFilter]     = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter === "All" ? MODULES : MODULES.filter(m => m.tag === filter);

  return (
    <div style={{ background: "var(--bg-main)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── Navbar ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(7,7,26,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)", padding: "0 clamp(16px,4vw,64px)", display: "flex", alignItems: "center", height: 60, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <span style={{ fontSize: 18, fontWeight: 800, background: "linear-gradient(135deg,#818CF8,#C084FC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FlowCRM</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/login")} style={{ padding: "8px 18px", borderRadius: 8, background: "transparent", border: "1px solid var(--border-input)", color: "var(--text-sec)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Login
          </button>
          <button onClick={() => navigate("/register")} style={{ padding: "8px 18px", borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Get Started Free
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ textAlign: "center", padding: "80px clamp(16px,4vw,64px) 64px" }}>
        <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, background: "#6366f120", border: "1px solid #6366f140", fontSize: 12, fontWeight: 600, color: "#818CF8", marginBottom: 24 }}>
          🚀 The all-in-one business OS for Indian enterprises
        </div>
        <h1 style={{ fontSize: "clamp(32px,5vw,60px)", fontWeight: 900, lineHeight: 1.15, margin: "0 0 20px", maxWidth: 800, marginInline: "auto" }}>
          Run Your Entire Business{" "}
          <span style={{ background: "linear-gradient(135deg,#818CF8,#C084FC,#F472B6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            from One Platform
          </span>
        </h1>
        <p style={{ fontSize: "clamp(15px,2vw,18px)", color: "var(--text-faint)", maxWidth: 620, marginInline: "auto", lineHeight: 1.7, marginBottom: 36 }}>
          CRM, Inventory, HR &amp; Payroll, Finance, Projects, Import-Export and more — all integrated, all GST-compliant, built for India.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/register")} style={{ padding: "14px 32px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 32px #6366f140" }}>
            Start for Free →
          </button>
          <button onClick={() => navigate("/login")} style={{ padding: "14px 32px", borderRadius: 10, background: "transparent", border: "1px solid var(--border-input)", color: "var(--text-sec)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Login to Dashboard
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "clamp(24px,4vw,64px)", justifyContent: "center", marginTop: 56, flexWrap: "wrap" }}>
          {[
            { value: "16+", label: "Modules" },
            { value: "100%", label: "GST Compliant" },
            { value: "Multi-org", label: "Support" },
            { value: "Free", label: "to Start" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, background: "linear-gradient(135deg,#818CF8,#C084FC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "var(--text-ghost)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Module Showcase ── */}
      <section id="features" style={{ padding: "0 clamp(16px,4vw,64px) 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, margin: "0 0 12px" }}>Everything Your Business Needs</h2>
          <p style={{ color: "var(--text-ghost)", fontSize: 15 }}>Click any module to see what it does</p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
          {TAGS.map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: "7px 18px", borderRadius: 20, border: "1px solid",
              borderColor: filter === t ? (TAG_COLORS[t] || "#6366f1") : "var(--border-input)",
              background: filter === t ? (TAG_COLORS[t] || "#6366f1") + "20" : "transparent",
              color: filter === t ? (TAG_COLORS[t] || "#818CF8") : "var(--text-ghost)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>{t}</button>
          ))}
        </div>

        {/* Module grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,300px),1fr))", gap: 16, maxWidth: 1200, marginInline: "auto" }}>
          {filtered.map(mod => (
            <div
              key={mod.name}
              onClick={() => setExpanded(expanded === mod.name ? null : mod.name)}
              style={{
                background: "var(--bg-card)", border: `1px solid ${expanded === mod.name ? mod.color + "60" : "var(--border)"}`,
                borderRadius: 14, padding: 20, cursor: "pointer",
                transition: "border-color 0.2s, transform 0.15s",
                boxShadow: expanded === mod.name ? `0 0 24px ${mod.color}20` : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: expanded === mod.name ? 12 : 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: mod.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {mod.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{mod.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: (TAG_COLORS[mod.tag] || "#6366f1") + "20", color: TAG_COLORS[mod.tag] || "#818CF8" }}>{mod.tag}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-faint)", margin: 0, lineHeight: 1.5 }}>{mod.desc}</p>
                </div>
              </div>

              {/* Expanded feature list */}
              {expanded === mod.name && (
                <div style={{ borderTop: `1px solid ${mod.color}30`, paddingTop: 12, marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: mod.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>What's included</div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                    {mod.features.map(f => (
                      <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-sec)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: mod.color, flexShrink: 0 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={e => { e.stopPropagation(); window.location.href = "/register"; }}
                    style={{ marginTop: 14, width: "100%", padding: "9px 0", borderRadius: 8, background: mod.color, border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    Use {mod.name} →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Why FlowCRM ── */}
      <section style={{ padding: "60px clamp(16px,4vw,64px)", background: "var(--bg-card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, margin: "0 0 40px" }}>Why FlowCRM?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,240px),1fr))", gap: 20, maxWidth: 1000, marginInline: "auto" }}>
          {WHY.map(w => (
            <div key={w.title} style={{ background: "var(--bg-hover)", borderRadius: 12, padding: 24, border: "1px solid var(--border-input)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{w.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{w.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-faint)", lineHeight: 1.6 }}>{w.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: "60px clamp(16px,4vw,64px)" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, margin: "0 0 48px" }}>Get Running in 3 Steps</h2>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", maxWidth: 900, marginInline: "auto" }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ flex: "1 1 240px", maxWidth: 280, textAlign: "center" }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: "var(--border)", lineHeight: 1, marginBottom: 8 }}>{s.n}</div>
              <div style={{ width: 40, height: 3, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 2, marginInline: "auto", marginBottom: 16 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-faint)", lineHeight: 1.6 }}>{s.desc}</div>
              {i < STEPS.length - 1 && (
                <div style={{ fontSize: 24, color: "var(--border)", marginTop: 16 }}>↓</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: "60px clamp(16px,4vw,64px)", textAlign: "center", background: "linear-gradient(135deg,#6366f110,#8b5cf610)", borderTop: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "clamp(24px,3.5vw,40px)", fontWeight: 900, margin: "0 0 16px" }}>
          Ready to streamline your business?
        </h2>
        <p style={{ color: "var(--text-faint)", fontSize: 15, marginBottom: 32 }}>
          Join businesses already running on FlowCRM. Free to start, no credit card required.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/register")} style={{ padding: "14px 36px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 32px #6366f140" }}>
            Create Free Account
          </button>
          <button onClick={() => navigate("/login")} style={{ padding: "14px 28px", borderRadius: 10, background: "transparent", border: "1px solid var(--border-input)", color: "var(--text-sec)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Already have an account? Login
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "28px clamp(16px,4vw,64px)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>⚡</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-ghost)" }}>FlowCRM</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-ghost)" }}>
          Built for Indian businesses · GST-compliant · Multi-org · Secure
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={() => navigate("/login")} style={{ background: "none", border: "none", color: "var(--text-ghost)", fontSize: 12, cursor: "pointer" }}>Login</button>
          <button onClick={() => navigate("/register")} style={{ background: "none", border: "none", color: "var(--text-ghost)", fontSize: 12, cursor: "pointer" }}>Register</button>
        </div>
      </footer>
    </div>
  );
}
