import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { ALL_MODULES } from "@/lib/modules";
import { Puzzle, Check, Lock } from "lucide-react";

const S = {
  page: { padding: "28px 32px", background: "var(--bg-main)", minHeight: "100vh" } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 } as React.CSSProperties,
  sub: { fontSize: 13, color: "var(--text-ghost)", marginTop: 4, marginBottom: 28 } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 } as React.CSSProperties,
};

const ALWAYS_ON = ["DASHBOARD"]; // modules that can't be disabled

export default function AdminModulesPage() {
  const { activeOrg, updateActiveOrgModules, loadModuleAccess } = useAuthStore();
  const [enabled, setEnabled] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadingModules, setLoadingModules] = useState(true);

  // Always fetch from API so we show real DB state, not stale Zustand cache
  const load = useCallback(async () => {
    setLoadingModules(true);
    try {
      const res = await api.get("/organizations/current");
      const mods: string[] = res.data.data?.enabledModules ?? [];
      setEnabled(mods.length === 0 ? ALL_MODULES.map((m) => m.key) : mods);
    } catch {
      // Fall back to Zustand state if API fails
      const mods = activeOrg?.enabledModules ?? [];
      setEnabled(mods.length === 0 ? ALL_MODULES.map((m) => m.key) : mods);
    }
    setLoadingModules(false);
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
    setSaveError("");
    try {
      await api.patch("/organizations/current", { enabledModules: enabled });
      updateActiveOrgModules(enabled);
      await loadModuleAccess(); // re-sync isOrgAdmin + moduleAccess from DB so sidebar updates immediately
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Failed to save. Please try again.");
    }
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
          {saved && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✓ Saved! Sidebar updated.</span>}
          {saveError && <span style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>{saveError}</span>}
          <button onClick={toggleAll} disabled={loadingModules} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-sec)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            {allOn ? "Disable All" : "Enable All"}
          </button>
          <button onClick={save} disabled={saving || loadingModules} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "9px 20px", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {loadingModules ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-ghost)" }}>Loading current module configuration…</div>
      ) : null}

      <div style={{ ...S.grid, opacity: loadingModules ? 0.3 : 1 }}>
        {ALL_MODULES.map((mod) => {
          const isOn = enabled.includes(mod.key);
          const locked = ALWAYS_ON.includes(mod.key);
          return (
            <div
              key={mod.key}
              onClick={() => toggle(mod.key)}
              style={{
                background: "var(--bg-card)", borderRadius: 12, padding: "18px 20px",
                border: `1px solid ${isOn ? "#6366f140" : var(--border)}`,
                cursor: locked ? "default" : "pointer",
                transition: "border-color 0.15s, background 0.15s",
                position: "relative" as const,
                opacity: locked ? 0.7 : 1,
              }}>

              {/* Toggle indicator */}
              <div style={{
                position: "absolute", top: 16, right: 16,
                width: 36, height: 20, borderRadius: 10,
                background: isOn ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : var(--border),
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
                <div style={{ width: 32, height: 32, borderRadius: 8, background: isOn ? "#6366f120" : "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
                  {locked ? <Lock size={14} color="var(--text-ghost)" /> : isOn ? <Check size={14} color="#818cf8" /> : <Puzzle size={14} color="var(--text-ghost)" />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isOn ? "var(--text-primary)" : "var(--text-ghost)", transition: "color 0.15s" }}>{mod.label}</div>
                  {locked && <div style={{ fontSize: 10, color: "var(--text-ghost)" }}>Always enabled</div>}
                </div>
              </div>

              {mod.description && (
                <p style={{ fontSize: 12, color: "var(--text-ghost)", margin: 0, lineHeight: 1.5 }}>{mod.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
