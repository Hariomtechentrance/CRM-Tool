import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { ALL_MODULES } from "@/lib/modules";
import { Puzzle, Check, Lock } from "lucide-react";

const S = {
  page: { padding: "28px 32px", background: "#07071A", minHeight: "100vh" } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "#EEEEF5", margin: 0 } as React.CSSProperties,
  sub: { fontSize: 13, color: "#505070", marginTop: 4, marginBottom: 28 } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 } as React.CSSProperties,
};

const ALWAYS_ON = ["DASHBOARD"]; // modules that can't be disabled

export default function AdminModulesPage() {
  const { activeOrg, updateActiveOrgModules } = useAuthStore();
  const [enabled, setEnabled] = useState<string[]>(activeOrg?.enabledModules ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    setEnabled(activeOrg?.enabledModules ?? []);
  }, [activeOrg?.id]);

  useEffect(() => { load(); }, [load]);

  const toggle = (key: string) => {
    if (ALWAYS_ON.includes(key)) return;
    setEnabled((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/organizations/current", { enabledModules: enabled });
      updateActiveOrgModules(enabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const allOn = ALL_MODULES.every((m) => enabled.includes(m.key));
  const toggleAll = () => {
    setSaved(false);
    if (allOn) setEnabled(ALWAYS_ON);
    else setEnabled(ALL_MODULES.map((m) => m.key));
  };

  return (
    <div className="page-pad">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={S.title}>Module Management</h1>
          <p style={S.sub}>Enable or disable features for your organisation. Changes take effect immediately.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✓ Saved</span>}
          <button onClick={toggleAll} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #1C1C35", background: "#0D0D1F", color: "#CCCCEE", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            {allOn ? "Disable All" : "Enable All"}
          </button>
          <button onClick={save} disabled={saving} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "9px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div style={S.grid}>
        {ALL_MODULES.map((mod) => {
          const isOn = enabled.includes(mod.key);
          const locked = ALWAYS_ON.includes(mod.key);
          return (
            <div
              key={mod.key}
              onClick={() => toggle(mod.key)}
              style={{
                background: "#0D0D1F", borderRadius: 12, padding: "18px 20px",
                border: `1px solid ${isOn ? "#6366f140" : "#1C1C35"}`,
                cursor: locked ? "default" : "pointer",
                transition: "border-color 0.15s, background 0.15s",
                position: "relative" as const,
                opacity: locked ? 0.7 : 1,
              }}>

              {/* Toggle indicator */}
              <div style={{
                position: "absolute", top: 16, right: 16,
                width: 36, height: 20, borderRadius: 10,
                background: isOn ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1C1C35",
                transition: "background 0.2s", display: "flex", alignItems: "center",
                padding: "0 3px", boxSizing: "border-box",
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%", background: "white",
                  transform: isOn ? "translateX(16px)" : "translateX(0)",
                  transition: "transform 0.2s",
                }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, paddingRight: 48 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: isOn ? "#6366f120" : "#131327", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
                  {locked ? <Lock size={14} color="#505070" /> : isOn ? <Check size={14} color="#818cf8" /> : <Puzzle size={14} color="#505070" />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isOn ? "#EEEEF5" : "#505070", transition: "color 0.15s" }}>{mod.label}</div>
                  {locked && <div style={{ fontSize: 10, color: "#505070" }}>Always enabled</div>}
                </div>
              </div>

              {mod.description && (
                <p style={{ fontSize: 12, color: "#505070", margin: 0, lineHeight: 1.5 }}>{mod.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
