import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Package, ShoppingCart, Truck, Receipt, UserCheck, TrendingUp,
  Briefcase, FileText, Headphones, Warehouse, ShoppingBag, Kanban,
  Globe, Mail, FileBox, Shield, Smartphone, Layers, MapPin,
  ChevronRight, Phone,
} from "lucide-react";

const MODULES = [
  { Icon: Users,       name: "CRM & Parties",        tag: "Core",          color: "#6366f1", desc: "Manage customers, suppliers, contacts and their full communication history in one place.", features: ["Customer & supplier profiles", "Contact management", "Communication log", "Credit limits & payment terms", "GSTIN / PAN / IEC tracking"] },
  { Icon: Package,     name: "Inventory & Stock",     tag: "Core",          color: "#8b5cf6", desc: "Track every SKU, set reorder levels and get instant low-stock alerts before you run out.", features: ["Product catalog with HSN codes", "Real-time stock levels", "Low-stock & out-of-stock alerts", "Category management", "Barcode support"] },
  { Icon: ShoppingCart,name: "Purchase Orders",       tag: "Core",          color: "#10b981", desc: "Raise POs to suppliers, track delivery status and auto-update inventory on receipt.", features: ["PO creation & approval", "Item-level tracking", "Partial receipt support", "Supplier history", "PDF export"] },
  { Icon: Truck,       name: "Sales & Dispatch",      tag: "Core",          color: "#f59e0b", desc: "Process sales orders from confirmation to dispatch with live delivery tracking.", features: ["Sales order management", "Goods outward dispatch", "Vehicle & driver tracking", "Delivery status updates", "Shipping charges"] },
  { Icon: Receipt,     name: "Finance & Invoicing",   tag: "Core",          color: "#ef4444", desc: "GST-compliant invoices, track receivables/payables and print professional invoices instantly.", features: ["GST invoices (CGST/SGST/IGST)", "Receivables & payables", "Payment recording", "Overdue tracking", "Print-ready invoice PDF"] },
  { Icon: UserCheck,   name: "HR & Payroll",          tag: "Core",          color: "#06b6d4", desc: "Full employee lifecycle — onboarding to monthly auto-salary, attendance and leave management.", features: ["Employee profiles & documents", "Attendance tracking", "Auto payroll generation", "PF & ESI auto-calculation", "Leave approvals"] },
  { Icon: TrendingUp,  name: "Leads & Pipeline",      tag: "Growth",        color: "#f97316", desc: "Kanban pipeline to track leads from first contact to closed deal with full activity history.", features: ["Kanban lead board", "Stage-wise tracking", "Lead value & source", "Follow-up reminders", "Conversion analytics"] },
  { Icon: Briefcase,   name: "Deals",                 tag: "Growth",        color: "#a78bfa", desc: "Track high-value deals through stages, forecast revenue and never lose a winning opportunity.", features: ["Deal pipeline stages", "Expected close date", "Deal value tracking", "Activity log per deal", "Win/loss analysis"] },
  { Icon: FileText,    name: "Quotations",            tag: "Growth",        color: "#34d399", desc: "Create professional quotations in seconds, convert them to orders and print or email instantly.", features: ["Multi-item quotations", "GST / discount support", "Valid-until date", "Print & email ready", "Convert to sales order"] },
  { Icon: Headphones,  name: "Support Tickets",       tag: "Growth",        color: "#60a5fa", desc: "Manage customer support requests with priority tracking and SLA-aware resolution.", features: ["Ticket creation & assignment", "Priority levels", "Status tracking", "Customer communication", "Resolution history"] },
  { Icon: Warehouse,   name: "Warehouse",             tag: "Operations",    color: "#fb923c", desc: "Multi-location warehouse with bin-level stock tracking and transfer management.", features: ["Multiple warehouse locations", "Bin / rack management", "Stock transfers", "Inward & outward movements", "Stock take"] },
  { Icon: ShoppingBag, name: "Retail & POS",          tag: "Operations",    color: "#e879f9", desc: "Walk-in sale at the counter — barcode scan, quick billing and daily sales summary.", features: ["Point of sale interface", "Barcode scanning", "Quick checkout", "Daily sales report", "Returns management"] },
  { Icon: Kanban,      name: "Projects & Tasks",      tag: "Operations",    color: "#4ade80", desc: "Plan projects, assign tasks and track milestones — keep every team on schedule.", features: ["Project creation & milestones", "Task assignment & deadlines", "Status tracking", "Team collaboration", "Progress reporting"] },
  { Icon: Globe,       name: "Import-Export Suite",   tag: "Operations",    color: "#38bdf8", desc: "Built for EXIM traders — HS codes, trade documentation, shipping and customs tracking.", features: ["HS code management", "Trade documentation", "Shipping line tracking", "Port of loading/discharge", "Bill of lading management"] },
  { Icon: Mail,        name: "Email & Activities",    tag: "Communication", color: "#facc15", desc: "Send emails to clients, log calls and meetings and keep a full activity timeline.", features: ["Email composition & sending", "Activity logging", "Follow-up scheduling", "Timeline view", "Team visibility"] },
  { Icon: FileBox,     name: "Documents",             tag: "Communication", color: "#94a3b8", desc: "Upload, organise and share business documents — invoices, contracts, compliance, photos.", features: ["Upload any file type", "Link to party / order / employee", "Cloud storage", "Search by name or tag", "Secure download links"] },
];

const TAGS = ["All", "Core", "Growth", "Operations", "Communication"];
const TAG_COLORS: Record<string, string> = {
  Core: "#6366f1", Growth: "#10b981", Operations: "#f59e0b", Communication: "#06b6d4",
};

const WHY = [
  { Icon: MapPin,     title: "Built for Indian Business",  desc: "GSTIN, PAN, IEC, HSN codes, CGST/SGST/IGST — all Indian compliance baked in from day one." },
  { Icon: Layers,     title: "Everything in One Place",    desc: "CRM, inventory, HR, finance, projects — no switching between 6 apps. One login, one dashboard." },
  { Icon: Shield,     title: "Secure & Multi-tenant",      desc: "Each organisation is completely isolated. Role-based access, JWT auth, rate limiting and audit logs." },
  { Icon: Smartphone, title: "Fully Responsive",           desc: "Works on mobile, tablet and desktop. Manage your business from anywhere, any device." },
];

const STEPS = [
  { n: "01", title: "Register & Create Your Org",    desc: "Sign up free, create your organisation and invite your team in under 2 minutes." },
  { n: "02", title: "Enable the Modules You Need",   desc: "Turn on only the features relevant to your business — CRM, HR, inventory or all of them." },
  { n: "03", title: "Start Working",                  desc: "Add parties, products, employees and let FlowCRM handle the calculations, alerts and reports." },
];

export default function LandingPage() {
  const navigate  = useNavigate();
  const [filter, setFilter]     = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter === "All" ? MODULES : MODULES.filter(m => m.tag === filter);

  return (
    <div style={{ background: "var(--bg-main)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── Navbar ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--bg-card)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)", padding: "0 clamp(16px,4vw,64px)", display: "flex", alignItems: "center", height: 60, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontWeight: 800, fontSize: 13, letterSpacing: "-0.5px" }}>FC</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>FlowCRM</span>
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
        <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, background: "#6366f115", border: "1px solid #6366f130", fontSize: 12, fontWeight: 600, color: "#818CF8", marginBottom: 24 }}>
          The all-in-one business platform for Indian enterprises
        </div>
        <h1 style={{ fontSize: "clamp(32px,5vw,56px)", fontWeight: 800, lineHeight: 1.15, margin: "0 0 20px", maxWidth: 760, marginInline: "auto", color: "var(--text-primary)" }}>
          Run Your Entire Business{" "}
          <span style={{ color: "#6366f1" }}>from One Platform</span>
        </h1>
        <p style={{ fontSize: "clamp(15px,2vw,17px)", color: "var(--text-faint)", maxWidth: 580, marginInline: "auto", lineHeight: 1.7, marginBottom: 36 }}>
          CRM, Inventory, HR &amp; Payroll, Finance, Projects, Import-Export and more — all integrated, all GST-compliant, built for India.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/register")} style={{ padding: "13px 30px", borderRadius: 8, background: "#6366f1", border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            Start for Free <ChevronRight size={16} />
          </button>
          <button onClick={() => navigate("/login")} style={{ padding: "13px 30px", borderRadius: 8, background: "transparent", border: "1px solid var(--border-input)", color: "var(--text-sec)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Sign In
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "clamp(24px,4vw,64px)", justifyContent: "center", marginTop: 56, flexWrap: "wrap" }}>
          {[
            { value: "16+",     label: "Modules" },
            { value: "100%",    label: "GST Compliant" },
            { value: "Multi-org", label: "Support" },
            { value: "Free",    label: "to Start" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 800, color: "#6366f1" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-ghost)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Module Showcase ── */}
      <section id="features" style={{ padding: "0 clamp(16px,4vw,64px) 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: "clamp(22px,3vw,34px)", fontWeight: 800, margin: "0 0 10px" }}>Everything Your Business Needs</h2>
          <p style={{ color: "var(--text-ghost)", fontSize: 14 }}>Select a module to explore its features</p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
          {TAGS.map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: "6px 16px", borderRadius: 6, border: "1px solid",
              borderColor: filter === t ? (TAG_COLORS[t] || "#6366f1") : "var(--border-input)",
              background: filter === t ? (TAG_COLORS[t] || "#6366f1") + "15" : "transparent",
              color: filter === t ? (TAG_COLORS[t] || "#6366f1") : "var(--text-ghost)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>{t}</button>
          ))}
        </div>

        {/* Module grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,280px),1fr))", gap: 14, maxWidth: 1200, marginInline: "auto" }}>
          {filtered.map(mod => {
            const isOpen = expanded === mod.name;
            return (
              <div
                key={mod.name}
                onClick={() => setExpanded(isOpen ? null : mod.name)}
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${isOpen ? mod.color + "50" : "var(--border)"}`,
                  borderRadius: 10, padding: 18, cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: isOpen ? 12 : 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: mod.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <mod.Icon size={17} color={mod.color} strokeWidth={1.8} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{mod.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: (TAG_COLORS[mod.tag] || "#6366f1") + "15", color: TAG_COLORS[mod.tag] || "#6366f1" }}>{mod.tag}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-faint)", margin: 0, lineHeight: 1.5 }}>{mod.desc}</p>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: `1px solid ${mod.color}25`, paddingTop: 12, marginTop: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: mod.color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Included features</div>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                      {mod.features.map(f => (
                        <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-sec)" }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: mod.color, flexShrink: 0 }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={e => { e.stopPropagation(); navigate("/register"); }}
                      style={{ marginTop: 14, width: "100%", padding: "9px 0", borderRadius: 7, background: mod.color, border: "none", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      Use {mod.name}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Why FlowCRM ── */}
      <section style={{ padding: "60px clamp(16px,4vw,64px)", background: "var(--bg-card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(20px,3vw,30px)", fontWeight: 800, margin: "0 0 40px" }}>Why FlowCRM?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,220px),1fr))", gap: 18, maxWidth: 960, marginInline: "auto" }}>
          {WHY.map(w => (
            <div key={w.title} style={{ background: "var(--bg-hover)", borderRadius: 10, padding: 22, border: "1px solid var(--border)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#6366f115", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <w.Icon size={17} color="#6366f1" strokeWidth={1.8} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{w.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-faint)", lineHeight: 1.6 }}>{w.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: "60px clamp(16px,4vw,64px)" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(20px,3vw,30px)", fontWeight: 800, margin: "0 0 48px" }}>Get Running in 3 Steps</h2>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", maxWidth: 860, marginInline: "auto" }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ flex: "1 1 220px", maxWidth: 260, textAlign: "center" }}>
              <div style={{ fontSize: 42, fontWeight: 900, color: "var(--border)", lineHeight: 1, marginBottom: 8 }}>{s.n}</div>
              <div style={{ width: 32, height: 3, background: "#6366f1", borderRadius: 2, marginInline: "auto", marginBottom: 14 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-faint)", lineHeight: 1.6 }}>{s.desc}</div>
              {i < STEPS.length - 1 && (
                <div style={{ fontSize: 20, color: "var(--border)", marginTop: 14 }}>↓</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: "60px clamp(16px,4vw,64px)", textAlign: "center", background: "var(--bg-card)", borderTop: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "clamp(22px,3.5vw,36px)", fontWeight: 800, margin: "0 0 14px", color: "var(--text-primary)" }}>
          Ready to streamline your business?
        </h2>
        <p style={{ color: "var(--text-faint)", fontSize: 15, marginBottom: 32 }}>
          Free to start. No credit card required.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/register")} style={{ padding: "13px 32px", borderRadius: 8, background: "#6366f1", border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Create Free Account
          </button>
          <button onClick={() => navigate("/login")} style={{ padding: "13px 26px", borderRadius: 8, background: "transparent", border: "1px solid var(--border-input)", color: "var(--text-sec)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Sign In
          </button>
        </div>
      </section>

      {/* ── Contact / Support ── */}
      <section style={{ padding: "40px clamp(16px,4vw,64px)", borderTop: "1px solid var(--border)", background: "var(--bg-main)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>Contact &amp; Support</h3>
          <p style={{ fontSize: 13, color: "var(--text-ghost)", marginBottom: 24 }}>Need help? Reach out to us on any of the channels below.</p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
            <a href="tel:9834134470" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-sec)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <Phone size={14} color="#6366f1" /> 98341 34470
            </a>
            <a href="tel:7397962433" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-sec)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <Phone size={14} color="#6366f1" /> 73979 62433
            </a>
            <a href="mailto:hariomvimal33333@gmail.com" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-sec)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <Mail size={14} color="#6366f1" /> hariomvimal33333@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "24px clamp(16px,4vw,64px)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontWeight: 800, fontSize: 10 }}>FC</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>FlowCRM</span>
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
