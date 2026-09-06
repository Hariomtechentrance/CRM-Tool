import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneCall, Building2, ArrowUpRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";

interface FollowUpLead {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  status: string;
  nextFollowUpDate?: string;
  assignedTo?: { name: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  NEW: "#60a5fa", CONTACTED: "#fbbf24", QUALIFIED: "#34d399",
  PROPOSAL: "#c084fc", NEGOTIATION: "#f472b6",
};

function dueLabel(dateStr?: string): { text: string; color: string } {
  if (!dateStr) return { text: "", color: "var(--text-ghost)" };
  const due = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.floor((startOfToday.getTime() - new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()) / 86400000);
  if (days > 0) return { text: `${days}d overdue`, color: "#f87171" };
  if (days === 0) return { text: "Due today", color: "#fbbf24" };
  return { text: "Upcoming", color: "var(--text-ghost)" };
}

// Platform-wide "who needs a call today" worklist — shows on every org's
// dashboard (admin and employee variants) when the Marketing (Leads) module
// is enabled, so nobody has to remember to open the Leads page to find out.
export default function TodaysFollowUps() {
  const { moduleAccess, activeOrg, user } = useAuthStore();
  const isOrgAdmin = activeOrg?.role === "OWNER" || activeOrg?.role === "ADMIN";
  const canSeeMarketing = isOrgAdmin || moduleAccess.includes("MARKETING");
  const navigate = useNavigate();
  const [leads, setLeads] = useState<FollowUpLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canSeeMarketing) { setLoading(false); return; }
    const params = new URLSearchParams({ followUp: "due", limit: "8" });
    if (!isOrgAdmin && user?.id) params.set("assignedToId", user.id);
    api.get(`/leads?${params}`)
      .then(r => setLeads(r.data.data.leads ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [canSeeMarketing, isOrgAdmin, user?.id, activeOrg?.id]);

  if (!canSeeMarketing || loading || leads.length === 0) return null;

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            📞 Follow-ups Due Today {isOrgAdmin ? "· Team" : ""}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-ghost)", margin: "2px 0 0" }}>
            {leads.length} lead{leads.length !== 1 ? "s" : ""} need{leads.length === 1 ? "s" : ""} a call today or are overdue
          </p>
        </div>
        <button onClick={() => navigate("/marketing")} style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          View all <ArrowUpRight size={13} />
        </button>
      </div>
      <div>
        {leads.map((l, i) => {
          const due = dueLabel(l.nextFollowUpDate);
          return (
            <div
              key={l.id}
              onClick={() => navigate(`/marketing?open=${l.id}`)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", cursor: "pointer",
                borderBottom: i < leads.length - 1 ? "1px solid var(--bg-hover)" : "none",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(96,165,250,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PhoneCall size={15} color="#60a5fa" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-ghost)", display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.company && <><Building2 size={10} /> {l.company}</>}
                  {isOrgAdmin && l.assignedTo?.name && <span>· {l.assignedTo.name}</span>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: (STATUS_COLOR[l.status] || "#818cf8") + "20", color: STATUS_COLOR[l.status] || "#818cf8", fontWeight: 600 }}>
                  {l.status}
                </span>
                <span style={{ fontSize: 10, color: due.color, fontWeight: 600 }}>{due.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
