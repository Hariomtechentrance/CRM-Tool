import { useState, useEffect, useRef } from "react";
import { diagramFor, type GarmentView } from "@/lib/garmentDiagrams";

// Click-the-diagram measurement entry — replaces a flat grid of number
// fields with a garment outline where every measurement is a point you
// click directly on the drawing. Click an empty point -> a small input pops
// up right there -> type the number -> it fills in and turns solid.
// Front/Back toggle switches between the two views — each measurement
// lives on whichever side it's conventionally taken from (e.g. Shoulder
// Width and body Length are back measurements in real tailoring practice;
// Chest/Sleeve/Waist are front).
//
// Falls back to whatever the caller renders instead (the plain field grid)
// when no diagram is defined for this garment type — see `diagramFor()`.
export default function GarmentMeasurementDiagram({ garmentType, values, onChange }: {
  garmentType: string;
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const diagram = diagramFor(garmentType);
  const [view, setView] = useState<"front" | "back">("front");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeKey) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setActiveKey(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [activeKey]);

  // Reset whenever the garment type changes (its points differ)
  useEffect(() => { setActiveKey(null); setView("front"); }, [garmentType]);

  if (!diagram) return null;

  const current: GarmentView = diagram[view];
  const totalPoints = diagram.front.points.length + diagram.back.points.length;
  const filledCount = diagram.front.points.filter(p => values[p.key]).length
    + diagram.back.points.filter(p => values[p.key]).length;

  return (
    <div ref={containerRef}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>Tap a point on the diagram to enter that measurement.</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: filledCount === totalPoints ? "#4ade80" : "var(--text-ghost)" }}>
          {filledCount} / {totalPoints} entered
        </span>
      </div>

      <div className="flex justify-center gap-1" style={{ marginBottom: 10 }}>
        {(["front", "back"] as const).map(v => (
          <button key={v} type="button" onClick={() => { setView(v); setActiveKey(null); }}
            style={{
              padding: "5px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${view === v ? "#f472b6" : "var(--border)"}`,
              background: view === v ? "rgba(244,114,182,0.12)" : "var(--bg-hover)",
              color: view === v ? "#f472b6" : "var(--text-ghost)",
              textTransform: "capitalize",
            }}>
            {v} view {diagram[v].points.length > 0 && `(${diagram[v].points.filter(p => values[p.key]).length}/${diagram[v].points.length})`}
          </button>
        ))}
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 300, margin: "0 auto" }}>
        <svg viewBox={current.viewBox} style={{ width: "100%", height: "auto", display: "block" }}>
          <path d={current.path} fill="var(--bg-hover)" stroke="var(--border-input)" strokeWidth={2.5} strokeLinejoin="round" />
          {current.details?.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="var(--border-input)" strokeWidth={1} strokeDasharray={i === 0 ? "3 2" : undefined} opacity={0.7} />
          ))}
        </svg>
        {current.points.map(p => {
          const filled = !!values[p.key];
          const isActive = activeKey === p.key;
          return (
            <button key={p.key} type="button"
              onClick={() => setActiveKey(isActive ? null : p.key)}
              title={`${p.label}${filled ? ` — ${values[p.key]} ${p.unit}` : ""}`}
              style={{
                position: "absolute", left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-50%)",
                width: 24, height: 24, borderRadius: "50%",
                background: filled ? "#f472b6" : "var(--bg-card)",
                border: `2px solid ${filled ? "#f472b6" : "var(--border-input)"}`,
                color: filled ? "#fff" : "var(--text-ghost)",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: isActive ? "0 0 0 4px rgba(244,114,182,0.28)" : "0 1px 3px rgba(0,0,0,0.2)",
                transition: "box-shadow 0.15s",
                padding: 0,
              }}
            >
              {filled ? "✓" : "+"}
            </button>
          );
        })}
        {activeKey && (() => {
          const p = current.points.find(pt => pt.key === activeKey);
          if (!p) return null;
          const flipLeft = p.x > 55;
          return (
            <div style={{
              position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
              transform: flipLeft ? "translate(-112%,-50%)" : "translate(12%,-50%)",
              zIndex: 10, background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 8, padding: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.3)", minWidth: 148,
            }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                {p.label} ({p.unit})
              </label>
              <input
                autoFocus type="number" inputMode="decimal"
                value={values[p.key] ?? ""}
                onChange={e => onChange({ ...values, [p.key]: e.target.value })}
                onKeyDown={e => { if (e.key === "Enter") setActiveKey(null); }}
                style={{
                  width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border-input)",
                  borderRadius: 6, padding: "6px 8px", color: "var(--text-primary)", fontSize: 13, outline: "none",
                }}
              />
            </div>
          );
        })()}
      </div>

      {/* Compact list of everything entered so far, across both views */}
      {filledCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1" style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          {[...diagram.front.points, ...diagram.back.points].filter(p => values[p.key]).map(p => (
            <div key={p.key} style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {p.label}: <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{values[p.key]}{p.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
