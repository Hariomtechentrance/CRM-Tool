import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Search, X, Pencil, MoreVertical, FileText, Scissors,
  AlertTriangle, CheckCircle, Users, ShoppingBag, IndianRupee, Clock,
} from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/utils";
import DocumentsPanel from "@/components/DocumentsPanel";
import GarmentMeasurementDiagram from "@/components/tailoring/GarmentMeasurementDiagram";
import { diagramFor } from "@/lib/garmentDiagrams";
import {
  GARMENT_TYPES, GARMENT_LABELS, UNIVERSAL_FIELDS, extraFieldsFor,
  ORDER_STATUSES, ORDER_STATUS_META, FABRIC_PROVIDED_BY,
  type GarmentType,
} from "@/lib/tailoringCatalog";

const S = {
  inp: { background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "8px 12px", color: "var(--text-primary)", fontSize: 12, outline: "none" } as React.CSSProperties,
  btn: { background: "linear-gradient(135deg,#ec4899,#f472b6)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  ghost: { background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5 } as React.CSSProperties,
  card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 } as React.CSSProperties,
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 },
};

// ── Types ────────────────────────────────────────────────────
interface Employee { id: string; name: string; }
interface Customer {
  id: string; name: string; gender?: "MALE" | "FEMALE" | "OTHER"; phone?: string; email?: string; address?: string; notes?: string;
  createdAt: string;
  _count?: { orders: number; measurementProfiles: number };
}
interface MeasurementProfile {
  id: string; customerId: string; garmentType: GarmentType; label?: string;
  chest?: number; waist?: number; hip?: number; shoulder?: number; sleeveLength?: number; length?: number;
  extraMeasurements?: Record<string, string | number>;
  notes?: string; createdAt: string;
}
interface Order {
  id: string; orderNumber: string; customerId: string;
  customer?: { id: string; name: string; phone?: string };
  garmentType: GarmentType; measurementProfileId?: string;
  measurements?: Record<string, string | number>;
  quantity: number; fabricProvidedBy: "CUSTOMER" | "SHOP"; fabricDetails?: string; styleNotes?: string;
  price?: number; advancePaid?: number; status: string;
  orderDate?: string; trialDate?: string; expectedDeliveryDate?: string; deliveredAt?: string;
  assignedToId?: string; notes?: string; createdAt: string;
}

// ── Small reusable dropdown with an "Other" free-text escape hatch ──
const OTHER = "__OTHER__";
function CatalogSelect({ value, onChange, options, placeholder = "Select…" }: {
  value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string;
}) {
  const isCustom = value === OTHER || (value !== "" && !options.includes(value));
  if (isCustom) {
    return (
      <div className="flex gap-1">
        <input style={{ ...S.inp, width: "100%" }} placeholder="Type manually…" autoFocus={value === OTHER}
          value={value === OTHER ? "" : value} onChange={e => onChange(e.target.value)} />
        <button type="button" onClick={() => onChange("")} title="Back to list" style={{ ...S.ghost, padding: "0 9px", fontSize: 13 }}>↩</button>
      </div>
    );
  }
  return (
    <select style={{ ...S.inp, width: "100%" }} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function dueBadge(dateStr?: string): { text: string; color: string } | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, color: "#f87171" };
  if (days === 0) return { text: "Due today", color: "#fbbf24" };
  if (days <= 7) return { text: `Due in ${days}d`, color: "#fbbf24" };
  return { text: end.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), color: "var(--text-ghost)" };
}

// ── Measurement fields — universal + garment-specific, shared by the
// measurement-profile modal and the order modal's inline measurement entry.
type MeasurementValues = Record<string, string>;
function MeasurementFields({ garmentType, values, onChange }: {
  garmentType: string; values: MeasurementValues; onChange: (v: MeasurementValues) => void;
}) {
  const extras = extraFieldsFor(garmentType);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {UNIVERSAL_FIELDS.map(([key, label, unit]) => (
        <div key={key}>
          <label style={S.label}>{label} ({unit})</label>
          <input type="number" style={{ ...S.inp, width: "100%" }} value={values[key] ?? ""} onChange={e => onChange({ ...values, [key]: e.target.value })} />
        </div>
      ))}
      {extras.map(([key, label, unit]) => (
        <div key={key}>
          <label style={S.label}>{label} ({unit})</label>
          <input type="number" style={{ ...S.inp, width: "100%" }} value={values[key] ?? ""} onChange={e => onChange({ ...values, [key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}

// Picks the diagram view when one exists for this garment type (the normal
// case — click points on the outline instead of filling a form), always
// with a manual toggle to the plain list, since a few garment types
// (Suit, Saree Fall, Alteration, Other) have no diagram defined yet and a
// few people will just prefer typing into a list either way.
function MeasurementEntry({ garmentType, values, onChange }: {
  garmentType: string; values: MeasurementValues; onChange: (v: MeasurementValues) => void;
}) {
  const hasDiagram = !!diagramFor(garmentType);
  const [mode, setMode] = useState<"diagram" | "list">(hasDiagram ? "diagram" : "list");
  useEffect(() => { setMode(diagramFor(garmentType) ? "diagram" : "list"); }, [garmentType]);

  return (
    <div>
      {hasDiagram && (
        <div className="flex justify-end mb-2">
          <button type="button" onClick={() => setMode(mode === "diagram" ? "list" : "diagram")}
            style={{ ...S.ghost, fontSize: 11, padding: "4px 10px" }}>
            {mode === "diagram" ? "Switch to list view" : "Switch to diagram view"}
          </button>
        </div>
      )}
      {mode === "diagram" && hasDiagram
        ? <GarmentMeasurementDiagram garmentType={garmentType} values={values} onChange={onChange} />
        : <MeasurementFields garmentType={garmentType} values={values} onChange={onChange} />}
    </div>
  );
}

// ── Searchable customer picker — client-side filter over the loaded list ──
function CustomerPicker({ customers, value, onChange, onAddNew }: {
  customers: Customer[]; value: string; onChange: (id: string) => void; onAddNew: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = customers.find(c => c.id === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const filtered = query.trim()
    ? customers.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || (c.phone ?? "").includes(query)).slice(0, 30)
    : customers.slice(0, 30);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        style={{ ...S.inp, width: "100%" }}
        placeholder="Search customer by name or phone…"
        value={open ? query : (selected ? `${selected.name}${selected.phone ? " · " + selected.phone : ""}` : "")}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={e => setQuery(e.target.value)}
      />
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 30, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
          <button type="button" onClick={() => { onAddNew(); setOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "8px 10px", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", fontSize: 12, color: "#f472b6", textAlign: "left" }}>
            <Plus size={12} /> Add new customer…
          </button>
          {filtered.map(c => (
            <button key={c.id} type="button" onClick={() => { onChange(c.id); setOpen(false); }}
              style={{ display: "block", width: "100%", padding: "8px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", textAlign: "left" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              {c.name} {c.phone ? <span style={{ color: "var(--text-ghost)" }}>· {c.phone}</span> : null}
            </button>
          ))}
          {filtered.length === 0 && <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-ghost)" }}>No matches</div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Customer modal — add/edit
// ═══════════════════════════════════════════════════════════════
function CustomerModal({ customer, onClose, onSaved }: { customer?: Customer | null; onClose: () => void; onSaved: (c: Customer) => void }) {
  const [form, setForm] = useState({
    name: customer?.name ?? "", gender: customer?.gender ?? "", phone: customer?.phone ?? "", email: customer?.email ?? "",
    address: customer?.address ?? "", notes: customer?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!form.name.trim()) { setErr("Name is required"); return; }
    setSaving(true); setErr("");
    try {
      const payload = { ...form, gender: form.gender || undefined };
      const res = customer
        ? await api.patch(`/tailoring/customers/${customer.id}`, payload)
        : await api.post("/tailoring/customers", payload);
      onSaved(res.data.data); onClose();
    } catch (e) { setErr(getApiError(e)); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl p-5 w-full max-w-md mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{customer ? "Edit Customer" : "Add Customer"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {err && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label style={S.label}>Name *</label><input style={{ ...S.inp, width: "100%" }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <label style={S.label}>Gender</label>
            <select style={{ ...S.inp, width: "100%" }} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as typeof form.gender })}>
              <option value="">Unspecified</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div><label style={S.label}>Phone</label><input style={{ ...S.inp, width: "100%" }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label style={S.label}>Email</label><input style={{ ...S.inp, width: "100%" }} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div className="col-span-2"><label style={S.label}>Address</label><input style={{ ...S.inp, width: "100%" }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div className="col-span-2"><label style={S.label}>Notes</label><textarea style={{ ...S.inp, width: "100%", minHeight: 60, resize: "vertical" } as React.CSSProperties} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} style={S.ghost}>Cancel</button>
          <button onClick={save} disabled={saving} style={S.btn}>{saving ? "Saving…" : customer ? "Save Changes" : "Add Customer"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Measurement profile modal — add/edit, tied to a customer
// ═══════════════════════════════════════════════════════════════
function MeasurementProfileModal({ customerId, profile, onClose, onSaved }: {
  customerId: string; profile?: MeasurementProfile | null; onClose: () => void; onSaved: () => void;
}) {
  const [garmentType, setGarmentType] = useState<string>(profile?.garmentType ?? "SHIRT");
  const [label, setLabel] = useState(profile?.label ?? "");
  const [values, setValues] = useState<MeasurementValues>(() => {
    const v: MeasurementValues = {};
    if (profile) {
      for (const [key] of UNIVERSAL_FIELDS) {
        const val = (profile as any)[key];
        if (val != null) v[key] = String(val);
      }
      for (const [key, val] of Object.entries(profile.extraMeasurements ?? {})) v[key] = String(val);
    }
    return v;
  });
  const [notes, setNotes] = useState(profile?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setSaving(true); setErr("");
    try {
      const universalKeys = new Set(UNIVERSAL_FIELDS.map(([k]) => k));
      const payload: Record<string, unknown> = { customerId, garmentType, label: label || undefined, notes: notes || undefined };
      const extra: Record<string, number> = {};
      for (const [key, val] of Object.entries(values)) {
        if (val === "" || val === undefined) continue;
        const num = Number(val);
        if (universalKeys.has(key)) payload[key] = num;
        else extra[key] = num;
      }
      if (Object.keys(extra).length > 0) payload.extraMeasurements = extra;

      if (profile) await api.patch(`/tailoring/measurement-profiles/${profile.id}`, payload);
      else await api.post("/tailoring/measurement-profiles", payload);
      onSaved(); onClose();
    } catch (e) { setErr(getApiError(e)); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl p-5 w-full max-w-xl mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{profile ? "Edit Measurement Profile" : "Add Measurement Profile"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {err && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>{err}</div>}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label style={S.label}>Garment Type *</label>
            <select style={{ ...S.inp, width: "100%" }} value={garmentType} onChange={e => { setGarmentType(e.target.value); setValues({}); }}>
              {GARMENT_TYPES.map(g => <option key={g} value={g}>{GARMENT_LABELS[g]}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Profile Label</label><input style={{ ...S.inp, width: "100%" }} placeholder="e.g. Formal Shirt - Blue" value={label} onChange={e => setLabel(e.target.value)} /></div>
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Measurements</p>
        <MeasurementEntry garmentType={garmentType} values={values} onChange={setValues} />
        <div className="mt-3"><label style={S.label}>Notes</label><textarea style={{ ...S.inp, width: "100%", minHeight: 50, resize: "vertical" } as React.CSSProperties} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} style={S.ghost}>Cancel</button>
          <button onClick={save} disabled={saving} style={S.btn}>{saving ? "Saving…" : "Save Profile"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Customer detail modal — profiles + recent orders + documents
// ═══════════════════════════════════════════════════════════════
function CustomerDetailModal({ customerId, onClose, onEdit }: { customerId: string; onClose: () => void; onEdit: (c: Customer) => void }) {
  const [customer, setCustomer] = useState<(Customer & { measurementProfiles: MeasurementProfile[]; orders: Order[] }) | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editProfile, setEditProfile] = useState<MeasurementProfile | null>(null);

  const load = useCallback(() => {
    api.get(`/tailoring/customers/${customerId}`).then(r => setCustomer(r.data.data)).catch(() => {});
  }, [customerId]);
  useEffect(() => { load(); }, [load]);

  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl p-5 w-full max-w-2xl mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{customer.name}</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(customer)} style={{ ...S.ghost, fontSize: 11, padding: "5px 10px" }}><Pencil size={11} /> Edit</button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {customer.phone && <div>📞 {customer.phone}</div>}
          {customer.email && <div>✉️ {customer.email}</div>}
          {customer.address && <div className="col-span-2">📍 {customer.address}</div>}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 8 }}>
          <div className="flex items-center justify-between mb-2">
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Measurement Profiles</div>
            <button onClick={() => { setEditProfile(null); setShowProfileModal(true); }} style={{ ...S.ghost, fontSize: 11, padding: "4px 8px" }}><Plus size={11} /> Add Profile</button>
          </div>
          {customer.measurementProfiles.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-ghost)" }}>No saved measurement profiles yet.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {customer.measurementProfiles.map(p => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{GARMENT_LABELS[p.garmentType]}</span>
                    {p.label && <span style={{ fontSize: 11, color: "var(--text-ghost)" }}> — {p.label}</span>}
                  </div>
                  <button onClick={() => { setEditProfile(p); setShowProfileModal(true); }} style={{ ...S.ghost, fontSize: 10, padding: "3px 8px" }}>Edit</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Recent Orders</div>
          {customer.orders.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-ghost)" }}>No orders yet.</div>
          ) : (
            <div className="flex flex-col gap-1">
              {customer.orders.map(o => {
                const st = ORDER_STATUS_META[o.status as keyof typeof ORDER_STATUS_META];
                return (
                  <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 10px", background: "var(--bg-hover)", borderRadius: 8 }}>
                    <span>{o.orderNumber} · {GARMENT_LABELS[o.garmentType]}</span>
                    <span style={{ color: st?.color, fontWeight: 700 }}>{st?.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Documents</div>
          <DocumentsPanel entityType="TAILOR_CUSTOMER" entityId={customer.id} compact />
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={onClose} style={S.ghost}>Close</button>
        </div>
      </div>
      {showProfileModal && (
        <MeasurementProfileModal customerId={customer.id} profile={editProfile}
          onClose={() => setShowProfileModal(false)} onSaved={load} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Order modal — add/edit
// ═══════════════════════════════════════════════════════════════
function OrderModal({ order, customers, employees, onClose, onSaved, onCustomersChanged }: {
  order?: Order | null; customers: Customer[]; employees: Employee[];
  onClose: () => void; onSaved: () => void; onCustomersChanged: () => void;
}) {
  const [customerId, setCustomerId] = useState(order?.customerId ?? "");
  const [garmentType, setGarmentType] = useState<string>(order?.garmentType ?? "SHIRT");
  const [profiles, setProfiles] = useState<MeasurementProfile[]>([]);
  const [profileId, setProfileId] = useState(order?.measurementProfileId ?? "");
  const [values, setValues] = useState<MeasurementValues>(() => {
    const v: MeasurementValues = {};
    if (order?.measurements) for (const [key, val] of Object.entries(order.measurements)) v[key] = String(val);
    return v;
  });
  const [form, setForm] = useState({
    quantity: String(order?.quantity ?? 1),
    fabricProvidedBy: order?.fabricProvidedBy ?? "CUSTOMER",
    fabricDetails: order?.fabricDetails ?? "",
    styleNotes: order?.styleNotes ?? "",
    price: order?.price?.toString() ?? "",
    advancePaid: order?.advancePaid?.toString() ?? "",
    status: order?.status ?? "ORDER_PLACED",
    orderDate: order?.orderDate ? order.orderDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    trialDate: order?.trialDate ? order.trialDate.slice(0, 10) : "",
    expectedDeliveryDate: order?.expectedDeliveryDate ? order.expectedDeliveryDate.slice(0, 10) : "",
    assignedToId: order?.assignedToId ?? "",
    notes: order?.notes ?? "",
  });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!customerId) { setProfiles([]); return; }
    api.get("/tailoring/measurement-profiles", { params: { customerId } }).then(r => setProfiles(r.data.data?.profiles ?? [])).catch(() => setProfiles([]));
  }, [customerId]);

  const profilesForGarment = profiles.filter(p => p.garmentType === garmentType);

  function applyProfile(id: string) {
    setProfileId(id);
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    const v: MeasurementValues = {};
    for (const [key] of UNIVERSAL_FIELDS) { const val = (p as any)[key]; if (val != null) v[key] = String(val); }
    for (const [key, val] of Object.entries(p.extraMeasurements ?? {})) v[key] = String(val);
    setValues(v);
  }

  async function save() {
    if (!customerId) { setErr("Select a customer"); return; }
    setSaving(true); setErr("");
    try {
      const universalKeys = new Set(UNIVERSAL_FIELDS.map(([k]) => k));
      const measurements: Record<string, number> = {};
      for (const [key, val] of Object.entries(values)) {
        if (val === "" || val === undefined) continue;
        measurements[key] = Number(val);
      }
      void universalKeys;
      const payload: Record<string, unknown> = {
        customerId, garmentType, measurementProfileId: profileId || undefined,
        measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
        quantity: Number(form.quantity) || 1,
        fabricProvidedBy: form.fabricProvidedBy,
        fabricDetails: form.fabricDetails || undefined,
        styleNotes: form.styleNotes || undefined,
        price: form.price ? Number(form.price) : undefined,
        advancePaid: form.advancePaid ? Number(form.advancePaid) : undefined,
        status: form.status,
        orderDate: form.orderDate || undefined,
        trialDate: form.trialDate || undefined,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
        assignedToId: form.assignedToId || undefined,
        notes: form.notes || undefined,
      };
      if (order) await api.patch(`/tailoring/orders/${order.id}`, payload);
      else await api.post("/tailoring/orders", payload);
      onSaved(); onClose();
    } catch (e) { setErr(getApiError(e)); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl p-5 w-full max-w-2xl mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{order ? `Edit Order — ${order.orderNumber}` : "New Order"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {err && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>{err}</div>}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2">
            <label style={S.label}>Customer *</label>
            <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} onAddNew={() => setShowCustomerModal(true)} />
          </div>
          <div>
            <label style={S.label}>Garment Type *</label>
            <select style={{ ...S.inp, width: "100%" }} value={garmentType} onChange={e => { setGarmentType(e.target.value); setProfileId(""); setValues({}); }}>
              {GARMENT_TYPES.map(g => <option key={g} value={g}>{GARMENT_LABELS[g]}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Use Saved Measurement Profile</label>
            <select style={{ ...S.inp, width: "100%" }} value={profileId} onChange={e => applyProfile(e.target.value)} disabled={!customerId}>
              <option value="">{customerId ? (profilesForGarment.length ? "Select a saved profile…" : "No saved profiles for this garment") : "Select a customer first"}</option>
              {profilesForGarment.map(p => <option key={p.id} value={p.id}>{p.label || `${GARMENT_LABELS[p.garmentType]} profile`}</option>)}
            </select>
          </div>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Measurements</p>
        <MeasurementEntry garmentType={garmentType} values={values} onChange={setValues} />

        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "16px 0 8px" }}>Order Details</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div><label style={S.label}>Quantity</label><input type="number" min={1} style={{ ...S.inp, width: "100%" }} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
          <div>
            <label style={S.label}>Fabric Provided By</label>
            <select style={{ ...S.inp, width: "100%" }} value={form.fabricProvidedBy} onChange={e => setForm({ ...form, fabricProvidedBy: e.target.value as "CUSTOMER" | "SHOP" })}>
              {FABRIC_PROVIDED_BY.map(f => <option key={f} value={f}>{f === "CUSTOMER" ? "Customer" : "Shop"}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Status</label>
            <select style={{ ...S.inp, width: "100%" }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_META[s].label}</option>)}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-3"><label style={S.label}>Fabric Details</label><input style={{ ...S.inp, width: "100%" }} placeholder="e.g. Cotton, sky blue, 2.5m" value={form.fabricDetails} onChange={e => setForm({ ...form, fabricDetails: e.target.value })} /></div>
          <div className="col-span-2 sm:col-span-3"><label style={S.label}>Style / Design Notes</label><textarea style={{ ...S.inp, width: "100%", minHeight: 50, resize: "vertical" } as React.CSSProperties} placeholder="Collar style, sleeve style, special instructions…" value={form.styleNotes} onChange={e => setForm({ ...form, styleNotes: e.target.value })} /></div>
          <div><label style={S.label}>Price (₹)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
          <div><label style={S.label}>Advance Paid (₹)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={form.advancePaid} onChange={e => setForm({ ...form, advancePaid: e.target.value })} /></div>
          <div>
            <label style={S.label}>Assigned Tailor</label>
            <select style={{ ...S.inp, width: "100%" }} value={form.assignedToId} onChange={e => setForm({ ...form, assignedToId: e.target.value })}>
              <option value="">Unassigned</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Order Date</label><input type="date" style={{ ...S.inp, width: "100%" }} value={form.orderDate} onChange={e => setForm({ ...form, orderDate: e.target.value })} /></div>
          <div><label style={S.label}>Trial Date</label><input type="date" style={{ ...S.inp, width: "100%" }} value={form.trialDate} onChange={e => setForm({ ...form, trialDate: e.target.value })} /></div>
          <div><label style={S.label}>Expected Delivery</label><input type="date" style={{ ...S.inp, width: "100%" }} value={form.expectedDeliveryDate} onChange={e => setForm({ ...form, expectedDeliveryDate: e.target.value })} /></div>
        </div>
        <label style={S.label}>Notes</label>
        <textarea style={{ ...S.inp, width: "100%", minHeight: 50, resize: "vertical" } as React.CSSProperties} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} style={S.ghost}>Cancel</button>
          <button onClick={save} disabled={saving} style={S.btn}>{saving ? "Saving…" : order ? "Save Changes" : "Create Order"}</button>
        </div>
      </div>
      {showCustomerModal && (
        <CustomerModal onClose={() => setShowCustomerModal(false)} onSaved={(c) => { setCustomerId(c.id); onCustomersChanged(); }} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Order detail modal — read-only + documents
// ═══════════════════════════════════════════════════════════════
function OrderDetailModal({ order, onClose, onEdit }: { order: Order; onClose: () => void; onEdit: () => void }) {
  const st = ORDER_STATUS_META[order.status as keyof typeof ORDER_STATUS_META];
  const row = (label: string, value?: string | number | null) => value === undefined || value === null || value === "" ? null : (
    <div><label style={S.label}>{label}</label><div style={{ fontSize: 13, color: "var(--text-primary)" }}>{value}</div></div>
  );
  const balance = (order.price ?? 0) - (order.advancePaid ?? 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl p-5 w-full max-w-lg mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{order.orderNumber} — {GARMENT_LABELS[order.garmentType]}</h3>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} style={{ ...S.ghost, fontSize: 11, padding: "5px 10px" }}><Pencil size={11} /> Edit</button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
          </div>
        </div>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: st?.bg, color: st?.color, fontWeight: 700 }}>{st?.label}</span>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {row("Customer", order.customer?.name)}
          {row("Phone", order.customer?.phone)}
          {row("Quantity", order.quantity)}
          {row("Fabric Provided By", order.fabricProvidedBy === "CUSTOMER" ? "Customer" : "Shop")}
          {row("Fabric Details", order.fabricDetails)}
          {row("Price", order.price ? `₹${order.price}` : undefined)}
          {row("Advance Paid", order.advancePaid ? `₹${order.advancePaid}` : undefined)}
          {row("Balance Due", order.price ? `₹${balance}` : undefined)}
          {row("Order Date", order.orderDate ? new Date(order.orderDate).toLocaleDateString("en-IN") : undefined)}
          {row("Trial Date", order.trialDate ? new Date(order.trialDate).toLocaleDateString("en-IN") : undefined)}
          {row("Expected Delivery", order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN") : undefined)}
          {row("Delivered On", order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString("en-IN") : undefined)}
        </div>
        {order.styleNotes && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <label style={S.label}>Style / Design Notes</label>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{order.styleNotes}</div>
          </div>
        )}
        {order.measurements && Object.keys(order.measurements).length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Measurements Used</div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(order.measurements).map(([k, v]) => (
                <div key={k} style={{ fontSize: 12, color: "var(--text-secondary)" }}>{k}: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{v}</span></div>
              ))}
            </div>
          </div>
        )}
        {order.notes && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <label style={S.label}>Notes</label>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{order.notes}</div>
          </div>
        )}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Documents (reference photos, bills)</div>
          <DocumentsPanel entityType="TAILOR_ORDER" entityId={order.id} compact />
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} style={S.ghost}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════
export default function TailoringPage() {
  const [tab, setTab] = useState<"orders" | "customers">("orders");
  const [stats, setStats] = useState<any>(null);
  const [due, setDue] = useState<{ trialsDue: Order[]; deliveriesDue: Order[] }>({ trialsDue: [], deliveriesDue: [] });
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, dueRes, ordersRes, customersRes] = await Promise.all([
        api.get("/tailoring/stats"),
        api.get("/tailoring/due"),
        api.get("/tailoring/orders", { params: { search: search || undefined, status: statusFilter || undefined, limit: 100 } }),
        api.get("/tailoring/customers", { params: { limit: 500 } }),
      ]);
      setStats(statsRes.data.data);
      setDue(dueRes.data.data);
      setOrders(ordersRes.data.data.orders);
      setCustomers(customersRes.data.data.customers);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/organizations/current/directory").then(r => setEmployees(r.data.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!menuOpenId) return;
    const close = () => setMenuOpenId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpenId]);

  const employeeName = (id?: string) => employees.find(e => e.id === id)?.name;
  const customerFor = (o: Order) => customers.find(c => c.id === o.customerId);

  return (
    <div className="page-pad" style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div className="flex items-center justify-between mb-4" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <Scissors size={20} color="#f472b6" /> Tailoring & Boutique
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-ghost)" }}>Customer measurements, made-to-order garment tracking and delivery scheduling.</p>
        </div>
        <div className="flex gap-2">
          {tab === "orders"
            ? <button onClick={() => { setEditOrder(null); setShowOrderModal(true); }} style={S.btn}><Plus size={13} /> New Order</button>
            : <button onClick={() => { setEditCustomer(null); setShowCustomerModal(true); }} style={S.btn}><Plus size={13} /> Add Customer</button>}
        </div>
      </div>

      {stats && (
        <div className="grid-r3" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total Orders", value: stats.totalOrders, icon: <ShoppingBag size={14} />, color: "#818cf8" },
            { label: "Pending", value: stats.pending, icon: <Clock size={14} />, color: "#fbbf24" },
            { label: "Trials Due (7d)", value: stats.trialsDue, icon: <AlertTriangle size={14} />, color: "#38bdf8" },
            { label: "Deliveries Due (7d)", value: stats.deliveriesDue, icon: <CheckCircle size={14} />, color: "#4ade80" },
            { label: "Customers", value: stats.totalCustomers, icon: <Users size={14} />, color: "#f472b6" },
            { label: "Outstanding (₹)", value: stats.totalOutstanding, icon: <IndianRupee size={14} />, color: "#f87171" },
          ].map(s => (
            <div key={s.label} style={S.card}>
              <div className="flex items-center gap-2" style={{ color: s.color, marginBottom: 6 }}>{s.icon}<span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" }}>{s.label}</span></div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {(due.trialsDue.length > 0 || due.deliveriesDue.length > 0) && (
        <div style={{ ...S.card, borderColor: "rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.06)", marginBottom: 16 }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13 }}>
            <AlertTriangle size={15} /> Trials & Deliveries Due Within 7 Days
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {due.trialsDue.map(o => {
              const b = dueBadge(o.trialDate);
              return (
                <div key={"t" + o.id} style={{ background: "var(--bg-hover)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{o.orderNumber} · Trial</div><div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{o.customer?.name}</div></div>
                  {b && <span style={{ fontSize: 10, fontWeight: 700, color: b.color }}>{b.text}</span>}
                </div>
              );
            })}
            {due.deliveriesDue.map(o => {
              const b = dueBadge(o.expectedDeliveryDate);
              return (
                <div key={"d" + o.id} style={{ background: "var(--bg-hover)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{o.orderNumber} · Delivery</div><div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{o.customer?.name}</div></div>
                  {b && <span style={{ fontSize: 10, fontWeight: 700, color: b.color }}>{b.text}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-4" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["orders", "customers"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 4px", background: "none", border: "none", borderBottom: tab === t ? "2px solid #f472b6" : "2px solid transparent", color: tab === t ? "#f472b6" : "var(--text-ghost)", fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "orders" ? (
        <>
          <div className="flex gap-2 mb-4">
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-ghost)" }} />
              <input style={{ ...S.inp, width: "100%", paddingLeft: 30 }} placeholder="Search order#, customer, phone…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select style={{ ...S.inp, minWidth: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_META[s].label}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ ...S.card, textAlign: "center", padding: 40, color: "var(--text-ghost)" }}>Loading…</div>
          ) : orders.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: 40, color: "var(--text-ghost)" }}>No orders yet — click "New Order" to get started.</div>
          ) : (
            <div className="table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Order", "Customer", "Garment", "Status", "Trial", "Delivery", ""].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    const st = ORDER_STATUS_META[o.status as keyof typeof ORDER_STATUS_META];
                    const trialBadge = dueBadge(o.trialDate);
                    const deliveryBadge = dueBadge(o.expectedDeliveryDate);
                    return (
                      <tr key={o.id} onClick={() => setDetailOrder(o)} style={{ cursor: "pointer" }}>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", borderBottom: "1px solid var(--bg-hover)" }}>{o.orderNumber}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-hover)" }}>
                          {o.customer?.name || customerFor(o)?.name || "—"}
                          {employeeName(o.assignedToId) && <div style={{ fontSize: 10, color: "var(--text-ghost)" }}>Tailor: {employeeName(o.assignedToId)}</div>}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-hover)" }}>{GARMENT_LABELS[o.garmentType]}</td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--bg-hover)" }}>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: st?.bg, color: st?.color, fontWeight: 700 }}>{st?.label}</span>
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--bg-hover)" }}>{trialBadge && <span style={{ fontSize: 11, fontWeight: 700, color: trialBadge.color }}>{trialBadge.text}</span>}</td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--bg-hover)" }}>{deliveryBadge && <span style={{ fontSize: 11, fontWeight: 700, color: deliveryBadge.color }}>{deliveryBadge.text}</span>}</td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--bg-hover)", position: "relative" }} onClick={e => e.stopPropagation()}>
                          <button onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === o.id ? null : o.id); }} style={{ ...S.ghost, padding: "5px 7px" }} title="More actions">
                            <MoreVertical size={14} />
                          </button>
                          {menuOpenId === o.id && (
                            <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "100%", right: 12, marginTop: 4, zIndex: 20, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", minWidth: 160, padding: 4 }}>
                              {[
                                { label: "Edit Order", icon: <Pencil size={12} />, onClick: () => { setEditOrder(o); setShowOrderModal(true); setMenuOpenId(null); } },
                                { label: "View Details", icon: <ShoppingBag size={12} />, onClick: () => { setDetailOrder(o); setMenuOpenId(null); } },
                                { label: "Documents", icon: <FileText size={12} />, onClick: () => { setDetailOrder(o); setMenuOpenId(null); } },
                              ].map(item => (
                                <button key={item.label} onClick={item.onClick} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", background: "none", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", textAlign: "left" }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                                  {item.icon} {item.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-ghost)" }} />
            <input style={{ ...S.inp, width: "100%", maxWidth: 320, paddingLeft: 30 }} placeholder="Search name or phone…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div style={{ ...S.card, textAlign: "center", padding: 40, color: "var(--text-ghost)" }}>Loading…</div>
          ) : customers.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: 40, color: "var(--text-ghost)" }}>No customers yet — click "Add Customer" to get started.</div>
          ) : (
            <div className="table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Name", "Gender", "Phone", "Email", "Orders", "Profiles", ""].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id} onClick={() => setDetailCustomerId(c.id)} style={{ cursor: "pointer" }}>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", borderBottom: "1px solid var(--bg-hover)" }}>{c.name}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-hover)" }}>{c.gender ? c.gender.charAt(0) + c.gender.slice(1).toLowerCase() : "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-hover)" }}>{c.phone || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-hover)" }}>{c.email || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-hover)" }}>{c._count?.orders ?? 0}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-hover)" }}>{c._count?.measurementProfiles ?? 0}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--bg-hover)" }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditCustomer(c); setShowCustomerModal(true); }} style={{ ...S.ghost, fontSize: 11, padding: "5px 10px" }}><Pencil size={11} /> Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showOrderModal && (
        <OrderModal order={editOrder} customers={customers} employees={employees}
          onClose={() => { setShowOrderModal(false); setEditOrder(null); }}
          onSaved={load} onCustomersChanged={load} />
      )}
      {detailOrder && (
        <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)}
          onEdit={() => { setEditOrder(detailOrder); setShowOrderModal(true); setDetailOrder(null); }} />
      )}
      {showCustomerModal && (
        <CustomerModal customer={editCustomer}
          onClose={() => { setShowCustomerModal(false); setEditCustomer(null); }}
          onSaved={load} />
      )}
      {detailCustomerId && (
        <CustomerDetailModal customerId={detailCustomerId} onClose={() => setDetailCustomerId(null)}
          onEdit={(c) => { setEditCustomer(c); setShowCustomerModal(true); setDetailCustomerId(null); }} />
      )}
    </div>
  );
}
