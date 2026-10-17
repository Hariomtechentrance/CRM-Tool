import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneCall, Car, Building2, ArrowUpRight, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { isWBAOrg } from "@/lib/org";
import api from "@/lib/api";

// "section" replaces the old flat "kind" — Buyer and Seller car leads used to
// be lumped into one "car" bucket here, which is exactly what crowded out
// smaller groups (e.g. Insurance) once Buyer leads filled the old flat
// top-8 slice. Now each section renders as its own labeled group (see
// SECTION_META) so every section the user has access to is always visible,
// not just whichever one happened to sort first.
type FollowUpSection = "CRM" | "BUYER" | "SELLER" | "INSURANCE";
interface FollowUpItem {
  id: string;
  name: string;
  company?: string; // CRM lead's company, car lead's interested make/model, or insurance policy's vehicle
  status: string;
  nextFollowUpDate?: string;
  assignedTo?: { name: string } | null;
  section: FollowUpSection;
}

const STATUS_COLOR: Record<string, string> = {
  // CRM/Marketing lead statuses
  NEW: "#60a5fa", CONTACTED: "#fbbf24", QUALIFIED: "#34d399", PROPOSAL: "#c084fc", NEGOTIATION: "#f472b6",
  // Car buyer/seller lead statuses
  HOT: "#f87171", WARM: "#fbbf24", COLD: "#60a5fa", URGENT: "#fb923c", NOT_INTERESTED: "#9ca3af",
  // Insurance policy follow-up (no real "status" field — fixed label/color)
  INSURANCE: "#fbbf24",
};

const SECTION_PER_GROUP_LIMIT = 5;
const SECTION_META: Record<FollowUpSection, { label: string; icon: typeof PhoneCall; color: string; bg: string }> = {
  CRM: { label: "CRM Leads", icon: PhoneCall, color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  BUYER: { label: "Buyer Leads", icon: Car, color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
  SELLER: { label: "Seller Leads", icon: Car, color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  INSURANCE: { label: "Vehicles & Insurance", icon: ShieldAlert, color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
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
// dashboard (admin and employee variants) when the Marketing (Leads) and/or
// Cars module is enabled, so nobody has to remember to open those pages to
// find out. Grouped by section (CRM / Buyer / Seller / Vehicles &
// Insurance) so a section-scoped user only ever sees their own section's
// group, and a user with several sections sees each clearly labeled instead
// of interleaved.
export default function TodaysFollowUps() {
  const { moduleAccess, activeOrg, user } = useAuthStore();
  const isOrgAdmin = activeOrg?.role === "OWNER" || activeOrg?.role === "ADMIN";
  const wbaOrg = isWBAOrg(activeOrg);
  // WBA: leads live inside the CRM module now (Marketing is disabled for
  // them), so CRM access earns the same worklist visibility Marketing would.
  const canSeeMarketing = isOrgAdmin || moduleAccess.includes("MARKETING") || (wbaOrg && moduleAccess.includes("CRM"));
  // Cars sections are independently grantable (see requireModuleAccess.ts on
  // the backend) — holding the broad legacy "CARS" key still unlocks every
  // section; holding only "CARS.BUYER" unlocks just that one.
  const canSeeBuyer = isOrgAdmin || moduleAccess.includes("CARS") || moduleAccess.includes("CARS.BUYER");
  const canSeeSeller = isOrgAdmin || moduleAccess.includes("CARS") || moduleAccess.includes("CARS.SELLER");
  const canSeeInsurance = isOrgAdmin || moduleAccess.includes("CARS") || moduleAccess.includes("CARS.VEHICLES_INSURANCE");
  const canSeeCars = canSeeBuyer || canSeeSeller || canSeeInsurance;
  const leadsPath = wbaOrg ? "/crm" : "/marketing";
  const navigate = useNavigate();
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canSeeMarketing && !canSeeCars) { setLoading(false); return; }
    const assignedParam = !isOrgAdmin && user?.id ? `&assignedToId=${user.id}` : "";
    const calls: Promise<FollowUpItem[]>[] = [];
    if (canSeeMarketing) {
      calls.push(
        api.get(`/leads?followUp=due&limit=8${assignedParam}`)
          .then(r => (r.data.data.leads ?? []).map((l: any) => ({ id: l.id, name: l.name, company: l.company, status: l.status, nextFollowUpDate: l.nextFollowUpDate, assignedTo: l.assignedTo, section: "CRM" as const })))
          .catch(() => [])
      );
    }
    if (canSeeBuyer) {
      calls.push(
        api.get(`/cars/leads?followUp=due&leadType=BUYER&limit=8${assignedParam}`)
          .then(r => (r.data.data.leads ?? []).map((l: any) => ({ id: l.id, name: l.name, company: [l.interestedMake, l.interestedModel].filter(Boolean).join(" "), status: l.status, nextFollowUpDate: l.nextFollowUpDate, assignedTo: l.assignedTo, section: "BUYER" as const })))
          .catch(() => [])
      );
    }
    if (canSeeSeller) {
      calls.push(
        api.get(`/cars/leads?followUp=due&leadType=SELLER&limit=8${assignedParam}`)
          .then(r => (r.data.data.leads ?? []).map((l: any) => ({ id: l.id, name: l.name, company: [l.interestedMake, l.interestedModel].filter(Boolean).join(" "), status: l.status, nextFollowUpDate: l.nextFollowUpDate, assignedTo: l.assignedTo, section: "SELLER" as const })))
          .catch(() => [])
      );
    }
    if (canSeeInsurance) {
      // Insurance policies with a manual "next follow-up" reminder due today
      // or overdue — same worklist convention as leads, just on the policy
      // instead of the enquiry. No per-user assignee on a policy, so this
      // isn't filtered by assignedParam — every admin/staff with Cars access
      // sees the same org-wide list.
      calls.push(
        api.get(`/cars/insurance/due-followups`)
          .then(r => (r.data.data.policies ?? []).map((p: any) => ({
            id: p.id,
            name: p.vehicle?.ownerName || p.vehicle?.sellerName || [p.vehicle?.make, p.vehicle?.model].filter(Boolean).join(" ") || "Insurance policy",
            company: [p.vehicle?.make, p.vehicle?.model, p.vehicle?.registrationNo].filter(Boolean).join(" "),
            status: "INSURANCE",
            nextFollowUpDate: p.nextFollowUpDate,
            assignedTo: null,
            section: "INSURANCE" as const,
          })))
          .catch(() => [])
      );
    }
    Promise.all(calls)
      .then(results => setItems(results.flat()))
      .finally(() => setLoading(false));
  }, [canSeeMarketing, canSeeBuyer, canSeeSeller, canSeeInsurance, isOrgAdmin, user?.id, activeOrg?.id]);

  if ((!canSeeMarketing && !canSeeCars) || loading || items.length === 0) return null;

  const hasLeads = items.some(i => i.section === "CRM");
  const hasCars = items.some(i => i.section !== "CRM");
  const totalCount = items.length;

  // One group per section that actually has something due, each sorted by
  // urgency internally and capped so a busy section (e.g. Buyer) can't push
  // a quieter one (e.g. Seller) off the widget entirely.
  const sections: FollowUpSection[] = ["CRM", "BUYER", "SELLER", "INSURANCE"];
  const groups = sections
    .map(section => ({
      section,
      items: items
        .filter(i => i.section === section)
        .sort((a, b) => new Date(a.nextFollowUpDate ?? 0).getTime() - new Date(b.nextFollowUpDate ?? 0).getTime()),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            📞 Follow-ups Due Today {isOrgAdmin ? "· Team" : ""}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-ghost)", margin: "2px 0 0" }}>
            {totalCount} need{totalCount === 1 ? "s" : ""} a call today or are overdue{groups.length > 1 ? ` · across ${groups.length} sections` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {hasLeads && (
            <button onClick={() => navigate(leadsPath)} style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              Leads <ArrowUpRight size={13} />
            </button>
          )}
          {hasCars && (
            <button onClick={() => navigate("/cars")} style={{ background: "none", border: "none", color: "#38bdf8", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              Cars <ArrowUpRight size={13} />
            </button>
          )}
        </div>
      </div>
      <div>
        {groups.map((group, gi) => {
          const meta = SECTION_META[group.section];
          const Icon = meta.icon;
          const shown = group.items.slice(0, SECTION_PER_GROUP_LIMIT);
          const overflow = group.items.length - shown.length;
          return (
            <div key={group.section} style={{ borderTop: gi > 0 ? "1px solid var(--border)" : "none" }}>
              <div style={{ padding: "8px 20px 4px", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon size={12} color={meta.color} />
                <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>{meta.label}</span>
                <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>({group.items.length})</span>
              </div>
              {shown.map((it, i) => {
                const due = dueLabel(it.nextFollowUpDate);
                const navTarget = it.section === "INSURANCE" ? "/cars?insuranceDue=1" : it.section === "BUYER" || it.section === "SELLER" ? `/cars?open=${it.id}` : `${leadsPath}?open=${it.id}`;
                return (
                  <div
                    key={`${it.section}-${it.id}`}
                    onClick={() => navigate(navTarget)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "9px 20px", cursor: "pointer",
                      borderBottom: i < shown.length - 1 || overflow > 0 ? "1px solid var(--bg-hover)" : "none",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={14} color={meta.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {it.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-ghost)", display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {it.company && <><Building2 size={10} /> {it.company}</>}
                        {isOrgAdmin && it.assignedTo?.name && <span>· {it.assignedTo.name}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: (STATUS_COLOR[it.status] || "#818cf8") + "20", color: STATUS_COLOR[it.status] || "#818cf8", fontWeight: 600 }}>
                        {it.status.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontSize: 10, color: due.color, fontWeight: 600 }}>{due.text}</span>
                    </div>
                  </div>
                );
              })}
              {overflow > 0 && (
                <div onClick={() => navigate(group.section === "CRM" ? leadsPath : "/cars")}
                  style={{ padding: "7px 20px", fontSize: 11, color: "var(--text-ghost)", cursor: "pointer" }}>
                  +{overflow} more in {meta.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
