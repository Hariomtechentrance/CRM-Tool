import { useState } from "react";
import { Settings2, X, ChevronUp, ChevronDown, RotateCcw, Eye, EyeOff } from "lucide-react";
import { useWidgetStore } from "@/stores/widgetStore";

export default function WidgetCustomizer() {
  const [open, setOpen] = useState(false);
  const { widgets, toggleWidget, moveWidget, resetWidgets } = useWidgetStore();
  const sorted = [...widgets].sort((a, b) => a.order - b.order);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "var(--bg-hover)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "7px 14px",
          color: "var(--text-muted)", fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        <Settings2 size={14} />
        Customise
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setOpen(false)}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, width: 360, maxHeight: "80vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Dashboard Widgets</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={resetWidgets} title="Reset to defaults"
                  style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer", padding: 4 }}>
                  <RotateCcw size={14} />
                </button>
                <button onClick={() => setOpen(false)}
                  style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: "pointer", padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-ghost)", marginBottom: 16 }}>
              Toggle widgets on/off and reorder them on your dashboard.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sorted.map((w, i) => (
                <div key={w.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "var(--bg-hover)", borderRadius: 8, padding: "10px 12px",
                  border: "1px solid var(--border)", opacity: w.visible ? 1 : 0.5,
                }}>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{w.label}</span>

                  {/* Up/Down */}
                  <button disabled={i === 0} onClick={() => moveWidget(w.id, "up")}
                    style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: i === 0 ? "not-allowed" : "pointer", padding: 2, opacity: i === 0 ? 0.3 : 1 }}>
                    <ChevronUp size={14} />
                  </button>
                  <button disabled={i === sorted.length - 1} onClick={() => moveWidget(w.id, "down")}
                    style={{ background: "none", border: "none", color: "var(--text-ghost)", cursor: i === sorted.length - 1 ? "not-allowed" : "pointer", padding: 2, opacity: i === sorted.length - 1 ? 0.3 : 1 }}>
                    <ChevronDown size={14} />
                  </button>

                  {/* Toggle */}
                  <button onClick={() => toggleWidget(w.id)}
                    style={{ background: "none", border: "none", color: w.visible ? "#6366f1" : "var(--text-ghost)", cursor: "pointer", padding: 2 }}>
                    {w.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
