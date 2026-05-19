import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { BarChart3, TrendingUp, Package, Users, ShoppingCart, DollarSign, Download } from "lucide-react";

const S = {
  page: { padding: "24px 28px", background: "#07071A", minHeight: "100vh" } as React.CSSProperties,
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "#EEEEF5", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#505070", marginTop: 2, marginBottom: 24 } as React.CSSProperties,
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 } as React.CSSProperties,
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 } as React.CSSProperties,
  kpi: { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 12, padding: "18px 20px" } as React.CSSProperties,
  card: { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 12, padding: 20 } as React.CSSProperties,
  cardTitle: { fontSize: 14, fontWeight: 700, color: "#EEEEF5", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #131327" } as React.CSSProperties,
};

function downloadCsv(filename: string, rows: string[][], headers: string[]) {
  const lines = [headers, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { activeOrg } = useAuthStore();
  const activeOrgId = activeOrg?.id;

  const [stats, setStats] = useState<{ parties:number; orders:number; products:number; tasks:number } | null>(null);
  const [invStats, setInvStats] = useState<{ totalProducts:number; lowStock:number; totalValue:number } | null>(null);
  const [finStats, setFinStats] = useState<{ totalReceivable:number; totalPayable:number; paidInvoices:number; overdueInvoices:number } | null>(null);
  const [leadStats, setLeadStats] = useState<{ total:number; won:number; pipeline:number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, iRes, fRes, lRes] = await Promise.all([
        api.get("/org-admin/stats").catch(() => ({ data: { data: {} } })),
        api.get("/inventory/summary").catch(() => ({ data: { data: {} } })),
        api.get("/finance/summary").catch(() => ({ data: { data: {} } })),
        api.get("/leads/stats").catch(() => ({ data: { data: {} } })),
      ]);
      setStats(dRes.data.data);
      setInvStats(iRes.data.data);
      setFinStats(fRes.data.data);
      setLeadStats(lRes.data.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [activeOrgId]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n?: number) => n ? `₹${(n / 100000).toFixed(1)}L` : "₹0";

  const kpis = [
    { icon: Users, label: "Total Contacts", value: stats?.parties ?? "—", color: "#6366f1" },
    { icon: ShoppingCart, label: "Total Orders", value: stats?.orders ?? "—", color: "#f59e0b" },
    { icon: Package, label: "Products", value: invStats?.totalProducts ?? stats?.products ?? "—", color: "#10b981" },
    { icon: TrendingUp, label: "Lead Pipeline", value: leadStats ? fmt(leadStats.pipeline) : "—", color: "#a78bfa" },
  ];

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      if (type === "parties") {
        const r = await api.get("/parties?limit=1000");
        const parties = r.data.data?.parties || r.data.data || [];
        downloadCsv("contacts.csv", parties.map((p: any) => [p.name, p.type, p.email||"", p.phone||"", p.city||"", p.country||"", p.gstin||"", p.balance||0, p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : ""]),
          ["Name","Type","Email","Phone","City","Country","GSTIN","Balance","Created"]);
      } else if (type === "inventory") {
        const r = await api.get("/inventory?limit=1000");
        const items = r.data.data?.products || r.data.data || [];
        downloadCsv("inventory.csv", items.map((p: any) => [p.name, p.sku||"", p.category||"", p.unit||"", p.quantity||0, p.reorderLevel||0, p.costPrice||0, p.sellingPrice||0]),
          ["Name","SKU","Category","Unit","Qty","Reorder Level","Cost Price","Selling Price"]);
      } else if (type === "invoices") {
        const r = await api.get("/finance?limit=1000");
        const invoices = r.data.data?.invoices || r.data.data || [];
        downloadCsv("invoices.csv", invoices.map((inv: any) => [inv.invoiceNumber||"", inv.party?.name||"", inv.status||"", inv.total||0, inv.paidAmount||0, (inv.total||0)-(inv.paidAmount||0), inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "", inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-IN") : ""]),
          ["Invoice #","Party","Status","Total","Paid","Outstanding","Due Date","Created"]);
      } else if (type === "leads") {
        const r = await api.get("/leads?limit=1000");
        const leads = r.data.data?.leads || r.data.data || [];
        downloadCsv("leads.csv", leads.map((l: any) => [l.title||l.name||"", l.status||"", l.source||"", l.value||0, l.contactName||"", l.contactEmail||"", l.contactPhone||"", l.assignedTo?.name||"", l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN") : ""]),
          ["Lead","Status","Source","Value","Contact","Email","Phone","Assigned To","Created"]);
      }
    } catch { /* ignore */ }
    setExporting(null);
  };

  const exports = [
    { key:"parties", label:"Party / Customer List", note:"All CRM contacts", icon:"👥" },
    { key:"inventory", label:"Inventory Stock Report", note:"All products with quantities", icon:"📦" },
    { key:"invoices", label:"Outstanding Invoices", note:"All invoices with balance due", icon:"🧾" },
    { key:"leads", label:"Lead Pipeline Report", note:"All leads with status & value", icon:"📈" },
  ];

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Reports & Analytics</h1>
          <p style={S.subtitle}>Business overview, financial summaries and performance metrics</p>
        </div>
      </div>

      {loading ? <div style={{ padding:40, textAlign:"center", color:"#505070" }}>Loading analytics...</div> : (
        <>
          {/* KPI Row */}
          <div style={S.grid4}>
            {kpis.map(k => (
              <div key={k.label} style={S.kpi}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:"#505070", fontWeight:500 }}>{k.label}</span>
                  <k.icon size={16} color={k.color}/>
                </div>
                <div style={{ fontSize:26, fontWeight:700, color:k.color, marginTop:6 }}>{k.value}</div>
              </div>
            ))}
          </div>

          <div style={S.grid2}>
            {/* Finance Summary */}
            <div style={S.card}>
              <div style={S.cardTitle}><DollarSign size={16} color="#10b981"/> Finance Summary</div>
              {[
                { label:"Total Receivable", value:fmt(finStats?.totalReceivable), color:"#10b981" },
                { label:"Total Payable", value:fmt(finStats?.totalPayable), color:"#ef4444" },
                { label:"Paid Invoices", value:finStats?.paidInvoices ?? 0, color:"#6366f1" },
              ].map(r => (
                <div key={r.label} style={S.row}>
                  <span style={{ fontSize:13, color:"#CCCCEE" }}>{r.label}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:r.color }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Inventory Summary */}
            <div style={S.card}>
              <div style={S.cardTitle}><Package size={16} color="#f59e0b"/> Inventory Summary</div>
              {[
                { label:"Total Products", value:invStats?.totalProducts ?? 0, color:"#EEEEF5" },
                { label:"Low Stock Alerts", value:invStats?.lowStock ?? 0, color:invStats?.lowStock ? "#ef4444" : "#EEEEF5" },
                { label:"Inventory Value", value:fmt(invStats?.totalValue), color:"#10b981" },
              ].map(r => (
                <div key={r.label} style={S.row}>
                  <span style={{ fontSize:13, color:"#CCCCEE" }}>{r.label}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:r.color }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Leads Summary */}
            <div style={S.card}>
              <div style={S.cardTitle}><TrendingUp size={16} color="#a78bfa"/> Sales Pipeline</div>
              {[
                { label:"Total Leads", value:leadStats?.total ?? 0, color:"#EEEEF5" },
                { label:"Won Deals", value:leadStats?.won ?? 0, color:"#10b981" },
                { label:"Pipeline Value", value:fmt(leadStats?.pipeline), color:"#f59e0b" },
              ].map(r => (
                <div key={r.label} style={S.row}>
                  <span style={{ fontSize:13, color:"#CCCCEE" }}>{r.label}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:r.color }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* CSV Exports */}
            <div style={S.card}>
              <div style={S.cardTitle}><BarChart3 size={16} color="#818cf8"/> Quick Exports</div>
              {exports.map(e => (
                <div key={e.key} style={{ ...S.row, cursor:"pointer" }} onClick={() => handleExport(e.key)}>
                  <div>
                    <div style={{ fontSize:13, color:"#CCCCEE", display:"flex", alignItems:"center", gap:6 }}>
                      <span>{e.icon}</span>{e.label}
                    </div>
                    <div style={{ fontSize:11, color:"#505070", marginTop:2 }}>{e.note}</div>
                  </div>
                  <button
                    disabled={exporting===e.key}
                    style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #1C1C35", cursor:"pointer", background:exporting===e.key?"#6366f120":"#131327", color:exporting===e.key?"#818CF8":"#6366f1", fontSize:11, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}
                  >
                    <Download size={12}/>{exporting===e.key?"Exporting...":"Export CSV"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
