import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, Package, Truck, Receipt, Users, AlertCircle,
  Clock, ArrowUpRight, DollarSign, ShoppingCart, Headphones, FileText,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";

interface Stats {
  members: number; parties: number; invoices: number; orders: number;
  leads: number; tickets: number; products: number; tasks: number;
}
interface ModuleStats {
  invoiceStats: Array<{ status: string; _count: { _all: number }; _sum: { total: number | null } }>;
  orderStats: Array<{ status: string; _count: { _all: number } }>;
  purchaseStats: Array<{ status: string; _count: { _all: number } }>;
  leadStats: Array<{ status: string; _count: { _all: number } }>;
}
interface FeedItem {
  type: string; id: string; title: string; subtitle: string; meta: string; createdAt: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  DRAFT:     { bg: "rgba(129,140,248,0.1)", color: "#818CF8", dot: "#6366F1" },
  PENDING:   { bg: "rgba(245,158,11,0.1)",  color: "#FCD34D", dot: "#F59E0B" },
  CONFIRMED: { bg: "rgba(96,165,250,0.1)",  color: "#60A5FA", dot: "#3B82F6" },
  DISPATCHED:{ bg: "rgba(16,185,129,0.1)",  color: "#34D399", dot: "#10B981" },
  DELIVERED: { bg: "rgba(16,185,129,0.1)",  color: "#34D399", dot: "#10B981" },
  PAID:      { bg: "rgba(139,92,246,0.12)", color: "#C084FC", dot: "#8B5CF6" },
  CANCELLED: { bg: "rgba(239,68,68,0.08)",  color: "#F87171", dot: "#EF4444" },
  OPEN:      { bg: "rgba(129,140,248,0.1)", color: "#818CF8", dot: "#6366F1" },
  RESOLVED:  { bg: "rgba(16,185,129,0.1)",  color: "#34D399", dot: "#10B981" },
  WON:       { bg: "rgba(16,185,129,0.1)",  color: "#34D399", dot: "#10B981" },
  LOST:      { bg: "rgba(239,68,68,0.08)",  color: "#F87171", dot: "#EF4444" },
  NEW:       { bg: "rgba(129,140,248,0.1)", color: "#818CF8", dot: "#6366F1" },
  ADDED:     { bg: "rgba(99,102,241,0.12)", color: "#818CF8", dot: "#6366F1" },
  INVOICE:   { bg: "rgba(16,185,129,0.1)",  color: "#34D399", dot: "#10B981" },
  ORDER:     { bg: "rgba(99,102,241,0.12)", color: "#818CF8", dot: "#6366F1" },
  LEAD:      { bg: "rgba(245,158,11,0.1)",  color: "#FCD34D", dot: "#F59E0B" },
  TICKET:    { bg: "rgba(239,68,68,0.08)",  color: "#F87171", dot: "#EF4444" },
  PARTY:     { bg: "rgba(129,140,248,0.1)", color: "#818CF8", dot: "#6366F1" },
};

const FEED_ICONS: Record<string, { icon: typeof DollarSign; color: string }> = {
  INVOICE: { icon: DollarSign,   color: "#10b981" },
  ORDER:   { icon: ShoppingCart, color: "#6366f1" },
  LEAD:    { icon: TrendingUp,   color: "#f59e0b" },
  TICKET:  { icon: Headphones,   color: "#ef4444" },
  PARTY:   { icon: Users,        color: "#818cf8" },
};

const card: React.CSSProperties = { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 14, overflow: "hidden" };
const cardHeader: React.CSSProperties = { padding: "16px 20px", borderBottom: "1px solid #1C1C35", display: "flex", alignItems: "center", justifyContent: "space-between" };

export default function DashboardPage() {
  const { activeOrg, moduleAccess, isOrgAdmin } = useAuthStore();
  const navigate = useNavigate();
  const currency = activeOrg?.currency || "INR";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const [stats, setStats] = useState<Stats | null>(null);
  const [moduleStats, setModuleStats] = useState<ModuleStats | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, activityRes, modStatsRes] = await Promise.all([
          api.get("/org-admin/stats"),
          api.get("/org-admin/activity?limit=20"),
          api.get("/org-admin/module-stats"),
        ]);
        setStats(statsRes.data.data);
        setFeed(activityRes.data.data.feed || []);
        setModuleStats(modStatsRes.data.data);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [activeOrg?.id]);

  // Derived financials from module stats
  const totalRevenue = moduleStats?.invoiceStats
    ?.filter(s => ["PAID", "DELIVERED"].includes(s.status))
    ?.reduce((sum, s) => sum + (s._sum?.total || 0), 0) ?? 0;

  const pendingRevenue = moduleStats?.invoiceStats
    ?.filter(s => ["PENDING", "CONFIRMED", "DISPATCHED"].includes(s.status))
    ?.reduce((sum, s) => sum + (s._sum?.total || 0), 0) ?? 0;

  const openOrders = moduleStats?.orderStats
    ?.filter(s => !["DELIVERED", "CANCELLED"].includes(s.status))
    ?.reduce((sum, s) => sum + s._count._all, 0) ?? 0;

  const pendingPurchases = moduleStats?.purchaseStats
    ?.filter(s => !["RECEIVED", "CANCELLED"].includes(s.status))
    ?.reduce((sum, s) => sum + s._count._all, 0) ?? 0;

  const canSee = (key: string) => isOrgAdmin || moduleAccess.includes(key);

  return (
    <div className="page-pad" style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1400 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#EEEEF5", margin: 0 }}>
            Welcome back 👋
          </h1>
          <p style={{ fontSize: 13, color: "#505070", marginTop: 4 }}>{today} · {activeOrg?.name}</p>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#7070A0", background: "#131327", border: "1px solid #1C1C35", padding: "6px 14px", borderRadius: 8 }}>
          {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "#505070" }}>Loading dashboard...</div>
      ) : (
        <>
          {/* KPI Row — financial */}
          {(canSee("ACCOUNTS") || canSee("DISPATCH")) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {canSee("ACCOUNTS") && (
                <div style={{ background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 14, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <TrendingUp size={20} color="#34D399" />
                    </div>
                    <span style={{ fontSize: 10, color: "#505070", background: "#131327", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>PAID</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#7070A0", margin: "0 0 4px", fontWeight: 500 }}>Total Revenue</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: "#34D399", margin: 0 }}>{formatCurrency(totalRevenue, currency)}</p>
                </div>
              )}
              {canSee("ACCOUNTS") && (
                <div style={{ background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 14, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Receipt size={20} color="#F87171" />
                    </div>
                    <span style={{ fontSize: 10, color: "#f87171", background: "#ef444415", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>PENDING</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#7070A0", margin: "0 0 4px", fontWeight: 500 }}>Outstanding Dues</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: "#F87171", margin: 0 }}>{formatCurrency(pendingRevenue, currency)}</p>
                </div>
              )}
              {canSee("DISPATCH") && (
                <div style={{ background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 14, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Truck size={20} color="#FBBF24" />
                    </div>
                    <span style={{ fontSize: 10, color: "#FBBF24", background: "#f59e0b15", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>ACTIVE</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#7070A0", margin: "0 0 4px", fontWeight: 500 }}>Open Orders</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: "#FBBF24", margin: 0 }}>{openOrders}</p>
                </div>
              )}
              {canSee("PURCHASE") && (
                <div style={{ background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 14, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Package size={20} color="#C084FC" />
                    </div>
                    <span style={{ fontSize: 10, color: "#C084FC", background: "#8b5cf615", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>OPEN</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#7070A0", margin: "0 0 4px", fontWeight: 500 }}>Pending Purchases</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: "#C084FC", margin: 0 }}>{pendingPurchases}</p>
                </div>
              )}
            </div>
          )}

          {/* Mini stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {[
              { label: "Team Members",  value: stats?.members  ?? 0, icon: <Users size={18} />,       bg: "rgba(99,102,241,0.12)",  color: "#818CF8", show: true },
              { label: "Parties/Contacts", value: stats?.parties  ?? 0, icon: <FileText size={18} />, bg: "rgba(129,140,248,0.1)", color: "#818CF8", show: canSee("CRM") },
              { label: "Products",      value: stats?.products  ?? 0, icon: <Package size={18} />,    bg: "rgba(16,185,129,0.1)",   color: "#34D399", show: canSee("INVENTORY") },
              { label: "Active Leads",  value: stats?.leads     ?? 0, icon: <TrendingUp size={18} />, bg: "rgba(245,158,11,0.1)",   color: "#FBBF24", show: canSee("MARKETING") },
              { label: "Open Tickets",  value: stats?.tickets   ?? 0, icon: <Headphones size={18} />, bg: "rgba(239,68,68,0.08)",   color: "#F87171", show: canSee("SUPPORT") },
              { label: "Active Tasks",  value: stats?.tasks     ?? 0, icon: <Clock size={18} />,      bg: "rgba(139,92,246,0.12)",  color: "#C084FC", show: canSee("PROJECTS") },
            ].filter(s => s.show).map(s => (
              <div key={s.label} style={{ background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 500, color: "#7070A0", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#EEEEF5", margin: 0 }}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom section — Activity + Quick links */}
          <div className="dash-bottom">

            {/* Activity Feed */}
            <div style={card}>
              <div style={cardHeader}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#EEEEF5", margin: 0 }}>Recent Activity</p>
                  <p style={{ fontSize: 11, color: "#505070", margin: "3px 0 0" }}>Latest across all modules</p>
                </div>
                <button onClick={() => navigate("/admin")} style={{ background: "none", border: "none", color: "#818CF8", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  View all <ArrowUpRight size={13} />
                </button>
              </div>
              <div>
                {feed.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#505070" }}>
                    <AlertCircle size={28} style={{ margin: "0 auto 10px", display: "block", opacity: 0.4 }} />
                    No activity yet. Start by adding parties, products or creating orders.
                  </div>
                ) : feed.slice(0, 10).map((item, i) => {
                  const cfg = FEED_ICONS[item.type] || { icon: FileText, color: "#818cf8" };
                  const statusStyle = STATUS_COLORS[item.meta] || STATUS_COLORS[item.type] || { bg: "rgba(129,140,248,0.1)", color: "#818CF8", dot: "#6366F1" };
                  return (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "12px 20px", borderBottom: i < Math.min(feed.length, 10) - 1 ? "1px solid #131327" : "none", alignItems: "center" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: cfg.color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <cfg.icon size={15} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#EEEEF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                        {item.subtitle && <div style={{ fontSize: 11, color: "#505070", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subtitle}</div>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: statusStyle.bg, color: statusStyle.color, fontWeight: 600 }}>{item.meta}</span>
                        <span style={{ fontSize: 10, color: "#404060" }}>{new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Links */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={card}>
                <div style={{ ...cardHeader, borderBottom: "none" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#EEEEF5", margin: 0 }}>Quick Actions</p>
                </div>
                <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { label: "Add Party / Contact", href: "/crm",       color: "#818CF8", show: canSee("CRM") },
                    { label: "Create Sales Order",  href: "/dispatch",  color: "#FBBF24", show: canSee("DISPATCH") },
                    { label: "New Invoice",         href: "/accounts",  color: "#34D399", show: canSee("ACCOUNTS") },
                    { label: "Add Product",         href: "/inventory", color: "#C084FC", show: canSee("INVENTORY") },
                    { label: "New Purchase Order",  href: "/purchase",  color: "#F87171", show: canSee("PURCHASE") },
                    { label: "Log Lead",            href: "/marketing", color: "#60A5FA", show: canSee("MARKETING") },
                  ].filter(a => a.show).map(a => (
                    <button key={a.href} onClick={() => navigate(a.href)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${a.color}20`, background: a.color + "10", color: a.color, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" as const }}>
                      {a.label} →
                    </button>
                  ))}
                </div>
              </div>

              {/* Module Stats Summary */}
              {moduleStats && (
                <div style={card}>
                  <div style={{ ...cardHeader, borderBottom: "none" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#EEEEF5", margin: 0 }}>Module Overview</p>
                  </div>
                  <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "Invoices",  total: moduleStats.invoiceStats?.reduce((s, i) => s + i._count._all, 0) ?? 0,  color: "#34D399", show: canSee("ACCOUNTS") },
                      { label: "Orders",    total: moduleStats.orderStats?.reduce((s, i) => s + i._count._all, 0) ?? 0,    color: "#818CF8", show: canSee("DISPATCH") },
                      { label: "Purchases", total: moduleStats.purchaseStats?.reduce((s, i) => s + i._count._all, 0) ?? 0, color: "#C084FC", show: canSee("PURCHASE") },
                      { label: "Leads",     total: moduleStats.leadStats?.reduce((s, i) => s + i._count._all, 0) ?? 0,     color: "#FBBF24", show: canSee("MARKETING") },
                    ].filter(m => m.show && m.total > 0).map(m => (
                      <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #131327" }}>
                        <span style={{ fontSize: 12, color: "#CCCCEE" }}>{m.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
