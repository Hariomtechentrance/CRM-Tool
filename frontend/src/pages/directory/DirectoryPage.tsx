import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Users2, Search } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface DirectoryEntry {
  id: string;
  name: string;
  designation?: string | null;
  department?: string | null;
  orgRole?: string | null;
}

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#f97316"];
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function DirectoryPage() {
  const { activeOrg } = useAuthStore();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get("/organizations/current/directory")
      .then(r => setEntries(r.data.data ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [activeOrg?.id]);

  const filtered = entries.filter(e =>
    !search.trim() ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.designation || "").toLowerCase().includes(search.toLowerCase()) ||
    (e.department || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-pad">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <Users2 size={20} color="#6366f1" />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Company Directory</h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-ghost)", marginTop: 2, marginBottom: 20 }}>
        Who works at {activeOrg?.name ?? "your organization"} and what they do.
      </p>

      <div style={{ position: "relative", maxWidth: 320, marginBottom: 20 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-ghost)" }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, title, department..."
          style={{ width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "8px 12px 8px 32px", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-ghost)" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-ghost)" }}>
          {search ? "No one matches your search." : "No employees added yet."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {filtered.map(e => (
            <div key={e.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: colorFor(e.name), display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {getInitials(e.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-ghost)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {[e.designation, e.department].filter(Boolean).join(" · ") || "Team member"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
