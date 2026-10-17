import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus, Search, X, Upload, Download, Phone, Mail, Car, ShieldAlert,
  AlertTriangle, CheckCircle, ArrowRight, Pencil, MoreVertical, FileText, Trash2, Clock,
} from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/utils";
import CustomFieldRenderer from "@/components/CustomFieldRenderer";
import DocumentsPanel from "@/components/DocumentsPanel";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuthStore } from "@/stores/authStore";
import {
  VEHICLE_MAKES, modelsForMake, variantsForModel,
  FUEL_TYPES, TRANSMISSION_TYPES, INSURANCE_PROVIDERS, yearOptions,
} from "@/lib/vehicleCatalog";

const S = {
  inp: { background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "8px 12px", color: "var(--text-primary)", fontSize: 12, outline: "none" } as React.CSSProperties,
  btn: { background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  ghost: { background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5 } as React.CSSProperties,
  card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 } as React.CSSProperties,
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 },
};

const LEAD_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  NEW:            { label: "New",            color: "#818cf8", bg: "#1e1b4b" },
  HOT:            { label: "Hot",            color: "#f87171", bg: "#450a0a" },
  WARM:           { label: "Warm",           color: "#fbbf24", bg: "#451a03" },
  URGENT:         { label: "Urgent",         color: "#fb923c", bg: "#431407" },
  COLD:           { label: "Cold",           color: "#60a5fa", bg: "#1e3a5f" },
  CONTACTED:      { label: "Contacted",      color: "#a78bfa", bg: "#2e1065" },
  NOT_INTERESTED: { label: "Not Interested", color: "#9ca3af", bg: "#374151" },
  CONVERTED:      { label: "Converted",      color: "#4ade80", bg: "#14532d" },
  LOST:           { label: "Lost",           color: "#6b7280", bg: "#1f2937" },
};
const LEAD_STATUSES = Object.keys(LEAD_STATUS);

// "Lead Stage" — the pipeline/funnel filter, separate from "Lead Rating"
// (LEAD_STATUS/status above) AND from the pre-existing "Lead Status" custom
// field (the free-text call-outcome field behind the Contacted/Not Contacted
// filter below) — named "Stage" specifically to avoid colliding with that
// unrelated, already-shipped feature. CNR sits apart from the forward funnel
// since it's a call-outcome flag that can be set at any stage, not a step in it.
const LEAD_STAGE: Record<string, { label: string; color: string; bg: string }> = {
  SEARCHING_CAR:       { label: "Search a Car",   color: "#818cf8", bg: "#1e1b4b" },
  DETAILS_SENT:        { label: "Details Sent",   color: "#60a5fa", bg: "#1e3a5f" },
  TEST_DRIVE_PLANNED:  { label: "TD Planned",     color: "#fbbf24", bg: "#451a03" },
  TEST_DRIVE_DONE:     { label: "TD Done",        color: "#fb923c", bg: "#431407" },
  IN_NEGOTIATION:      { label: "In Nego",        color: "#a78bfa", bg: "#2e1065" },
  BOOKED:               { label: "Booked",         color: "#4ade80", bg: "#14532d" },
  CNR:                  { label: "CNR",            color: "#f87171", bg: "#450a0a" },
  BUSY:                 { label: "Busy",           color: "#f472b6", bg: "#500724" },
  PRODUCT_NOT_FOUND:    { label: "Product Not Found", color: "#9ca3af", bg: "#374151" },
};
const LEAD_STAGES = Object.keys(LEAD_STAGE);

// Matches the client's own tracking sheet — RS, DS and CTE are their exact
// shorthand (not spelled out further since even they use them as-is).
const SOURCES: Record<string, string> = {
  WALK_IN: "Walk-in", PHONE: "Phone", WEBSITE: "Website",
  INSTAGRAM: "Instagram", META_ADS: "Meta Ads", SEO: "SEO (Organic)",
  REFERRAL: "Referral", RS: "RS", DS: "DS", CTE: "CTE (CarTrade)", OTHER: "Other",
};

// Buyer/seller intake-form dropdown catalogs added for the two-filter +
// expanded-fields request.
const REGISTRATION_PREFS: Record<string, string> = { LOCAL: "Local Registration", ANY: "Any Registration" };
const PURCHASE_PLANS: Record<string, string> = { IMMEDIATE: "Immediate", WITHIN_A_WEEK: "In a Week", WITHIN_A_MONTH: "In a Month", ASAP: "ASAP" };
const PAYMENT_PREFS: Record<string, string> = { CASH: "Cash", LOAN: "Loan" };
const SELLER_INSURANCE_TYPES: Record<string, string> = { THIRD_PARTY: "Third Party", COMPREHENSIVE: "Comprehensive", ZERO_DEP: "0 Dep" };
const SHOWROOM_HISTORY_OPTS: Record<string, string> = { YES: "Yes", NO: "No", PARTIAL: "Partial" };
const HYPOTHECATION_OPTS: Record<string, string> = { YES: "Yes", CLOSED: "Closed", NO: "No" };

// Restricted dropdowns for the Lead edit form's "Car Details" block — a
// short, fixed list per the client's ask, deliberately narrower than the
// full VEHICLE_CATALOG fuel/transmission lists used by the actual Vehicle
// inventory forms (AddVehicleModal etc.), which still need the broader set.
const LEAD_FUEL_TYPES = ["Petrol", "Diesel", "EV", "Hybrid", "CNG"] as const;
const LEAD_TRANSMISSION_TYPES = ["AT", "MT", "IMT"] as const;

// Plain fixed-list select that still shows a legacy value saved before this
// list existed (e.g. "Manual" from the old broader catalog) instead of
// silently blanking it — but never offers it going forward.
function FixedSelect({ value, onChange, options, placeholder = "Select…" }: {
  value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string;
}) {
  const shownOptions = value && !options.includes(value as any) ? [value, ...options] : options;
  return (
    <select style={{ ...S.inp, width: "100%" }} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {shownOptions.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

const VEHICLE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  IN_STOCK: { label: "In Stock", color: "#818cf8", bg: "#1e1b4b" },
  RESERVED: { label: "Reserved", color: "#fbbf24", bg: "#451a03" },
  SOLD:     { label: "Sold",     color: "#4ade80", bg: "#14532d" },
};
const INSURANCE_TYPES = ["THIRD_PARTY", "COMPREHENSIVE", "ZERO_DEP"];

interface CarLead {
  id: string; leadType?: string; name: string; phone?: string; email?: string;
  interestedMake?: string; interestedModel?: string; budgetMin?: number; budgetMax?: number;
  additionalInterestedVehicles?: { make: string; model: string }[];
  hasExchangeVehicle?: boolean; tradeInVehicle?: string; source: string; sourceOther?: string; status: string; notes?: string;
  leadStage?: string;
  isDoNotCall?: boolean; testDriveDone?: boolean; bookingDone?: boolean; lastContactedAt?: string;
  assignedToId?: string; assignedTo?: { name: string } | null;
  nextFollowUpDate?: string; convertedVehicleId?: string; createdAt: string;
  // Shared buyer/seller
  location?: string;
  // Buyer-only intake fields
  preferredYearFrom?: number; preferredYearTo?: number;
  fuelPreferences?: string[]; transmissionPreferences?: string[];
  colorPreference?: string; registrationPref?: string;
  purchasePlan?: string; paymentPreference?: string;
  // Seller-only intake fields
  variant?: string; fuelType?: string; transmission?: string;
  mfgYear?: number; mfgMonth?: number; regYear?: number; regMonth?: number;
  sellerInsuranceType?: string; insuranceValidTill?: string; kms?: number;
  showroomHistory?: string; hypothecationStatus?: string; refurbNotes?: string;
  // Buyer-only: deal terms + delivery checklist, present once saved
  booking?: CarBooking | null;
  delivery?: CarDelivery | null;
}
interface CarBooking {
  id: string; carPrice?: number; commission?: number; paymentType?: string;
  rtoCharge?: number; warranty?: string; extraWork?: string;
  rsaIncluded?: boolean; rsaAmount?: number; finalPrice?: number; deliveryDate?: string;
  termsAndConditions?: string; insuranceIncluded?: boolean; notes?: string;
}
interface CarDelivery {
  id: string; checkedOut?: boolean; checkedOutAt?: string;
  documentsAdded?: boolean; documentsAddedAt?: string;
  deliveryNoteAdded?: boolean; deliveryDone?: boolean; deliveryDoneAt?: string; notes?: string;
}
interface Insurance {
  id: string; provider: string; policyNumber?: string; type: string;
  startDate: string; endDate: string; premium?: number;
  idv?: number; odAmount?: number; ncb?: number; paymentMode?: string; sharing?: string;
  source?: string; renewedBy?: string;
  notes?: string;
  nextFollowUpDate?: string;
  convertedFromCarLead?: boolean;
  vehicle?: { id: string; make?: string; model?: string; registrationNo?: string; ownerName?: string; ownerPhone?: string; sellerName?: string; sellerPhone?: string; assignedToId?: string };
}
interface Vehicle {
  id: string; make: string; model: string; variant?: string; year?: number;
  registrationNo?: string; chassisNo?: string; engineNo?: string; color?: string; odometer?: number;
  fuelType?: string; transmission?: string; purchasePrice?: number; salePrice?: number; status: string;
  sellerName?: string; sellerPhone?: string; sellerEmail?: string; purchasedAt?: string;
  registrationDate?: string;
  ownerName?: string; ownerPhone?: string; ownerEmail?: string; ownerAddress?: string; soldAt?: string;
  warrantyMonths?: number; warrantyEndDate?: string;
  assignedToId?: string; notes?: string;
  // Post-sale handoff checklist ("becomes a customer" — buyer flow)
  docSentToRto?: boolean; docSentToRtoAt?: string; docDelayChecklistNote?: string;
  addedToInsuranceGateway?: boolean; addedToInsuranceGatewayAt?: string;
  insurances: Insurance[];
  // Present only when this Vehicle was created by converting a CarLead —
  // leadType tells the UI whether it came from a Buyer or a Seller lead.
  // Absent (undefined/null) means it was added directly via Add Vehicle.
  sourceLead?: { leadType: string } | null;
}
interface Employee { id: string; name: string; }

// Follow-ups tab: one shared shape for the three sections it merges
// (Buyer leads, Seller leads, Vehicles & Insurance) so the section/date
// filters and the grouping-by-due-date logic don't need to know which
// section a given item came from — only `section` and `nextFollowUpDate`.
type FollowUpSection = "BUYER" | "SELLER" | "VEHICLE_INSURANCE";
type FollowUpItem =
  | { kind: "lead"; id: string; section: "BUYER" | "SELLER"; nextFollowUpDate?: string; lead: CarLead }
  | { kind: "insurance"; id: string; section: "VEHICLE_INSURANCE"; nextFollowUpDate?: string; policy: Insurance };
const FOLLOWUP_SECTION_LABEL: Record<FollowUpSection, string> = {
  BUYER: "Buyer", SELLER: "Seller", VEHICLE_INSURANCE: "Vehicles & Insurance",
};
const FOLLOWUP_SECTION_BADGE: Record<FollowUpSection, { color: string; bg: string }> = {
  BUYER: { color: "#818cf8", bg: "#1e1b4b" },
  SELLER: { color: "#fb923c", bg: "#431407" },
  VEHICLE_INSURANCE: { color: "#2dd4bf", bg: "#042f2e" },
};

// ── Insurance due-date helper (red within 30 days or already expired) ──
function insuranceBadge(insurance?: Insurance): { text: string; color: string; bg: string } | null {
  if (!insurance) return { text: "No policy on file", color: "var(--text-ghost)", bg: "var(--bg-hover)" };
  const end = new Date(insurance.endDate);
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, color: "#f87171", bg: "#450a0a" };
  if (days <= 30) return { text: `Expires in ${days}d`, color: "#f87171", bg: "#450a0a" };
  if (days <= 60) return { text: `Expires in ${days}d`, color: "#fbbf24", bg: "#451a03" };
  return { text: `Valid till ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`, color: "#4ade80", bg: "#14532d" };
}

// Visible marker for which conversion path a Vehicle/Insurance record came
// from — the client's ask: tell at a glance whether a sale in Vehicles &
// Insurance originated from a Buyer lead ("Convert to Sale") or a Seller
// lead ("Buy Car"), vs. a vehicle added directly via Add Vehicle (no badge).
function leadOriginBadge(vehicle?: Vehicle | null): { text: string; color: string; bg: string } | null {
  const leadType = vehicle?.sourceLead?.leadType;
  if (leadType === "BUYER") return { text: "FROM BUYER LEAD", color: "#818cf8", bg: "#1e1b4b" };
  if (leadType === "SELLER") return { text: "FROM SELLER LEAD", color: "#fb923c", bg: "#431407" };
  return null;
}

// ── Warranty due-date helper (same red/amber/green convention as insurance) ──
function warrantyBadge(vehicle: Vehicle): { text: string; color: string } | null {
  if (!vehicle.warrantyEndDate) return null;
  const end = new Date(vehicle.warrantyEndDate);
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, color: "#f87171" };
  if (days <= 30) return { text: `Expires in ${days}d`, color: "#f87171" };
  if (days <= 60) return { text: `Expires in ${days}d`, color: "#fbbf24" };
  return { text: `Valid till ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`, color: "#4ade80" };
}

// ── Follow-up due-date helper (mirrors TodaysFollowUps.tsx's dueLabel) ──
function dueLabel(dateStr?: string): { text: string; color: string; group: "overdue" | "today" | "upcoming" } {
  if (!dateStr) return { text: "", color: "var(--text-ghost)", group: "upcoming" };
  const due = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.floor((startOfToday.getTime() - new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()) / 86400000);
  if (days > 0) return { text: `${days}d overdue`, color: "#f87171", group: "overdue" };
  if (days === 0) return { text: "Due today", color: "#fbbf24", group: "today" };
  return { text: due.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), color: "var(--text-ghost)", group: "upcoming" };
}

// ═══════════════════════════════════════════════════════════════
// Reusable catalog dropdowns — every list here (makes, insurance providers,
// fuel/transmission types, model/variant per make) is a curated but
// necessarily incomplete reference set, so every one of these always offers
// an "Other (type manually)" escape hatch. Fully controlled: picking Other
// stores the OTHER sentinel until real text is typed, so the parent never
// needs its own "is this custom?" state.
// ═══════════════════════════════════════════════════════════════
const CATALOG_OTHER = "__OTHER__";

function CatalogSelect({ value, onChange, options, placeholder = "Select…", disabled }: {
  value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string; disabled?: boolean;
}) {
  const isCustom = value === CATALOG_OTHER || (value !== "" && !options.includes(value));
  if (isCustom) {
    return (
      <div className="flex gap-1">
        <input style={{ ...S.inp, width: "100%" }} placeholder="Type manually…" autoFocus={value === CATALOG_OTHER}
          value={value === CATALOG_OTHER ? "" : value} onChange={e => onChange(e.target.value)} />
        <button type="button" onClick={() => onChange("")} title="Back to list"
          style={{ ...S.ghost, padding: "0 9px", fontSize: 13 }}>↩</button>
      </div>
    );
  }
  return (
    <select style={{ ...S.inp, width: "100%" }} disabled={disabled} value={value}
      onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
      <option value={CATALOG_OTHER}>Other (type manually)</option>
    </select>
  );
}

// Multi-select checkbox dropdown — e.g. a vehicle that runs on Petrol + CNG,
// or a listing that supports both Manual and Automatic. Stored as a plain
// comma-joined string (no schema change needed on either fuelType or
// transmission, both already free-text columns), parsed back into a list of
// checkboxes on render. Always includes a free-text "Other" add so an
// uncatalogued fuel/transmission type isn't blocked either.
function MultiCatalogSelect({ value, onChange, options, placeholder = "Select…" }: {
  value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = value ? value.split(",").map(s => s.trim()).filter(Boolean) : [];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function toggle(opt: string) {
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
    onChange(next.join(", "));
  }
  function addCustom() {
    const t = customText.trim();
    if (!t || selected.includes(t)) { setCustomText(""); return; }
    onChange([...selected, t].join(", "));
    setCustomText("");
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ ...S.inp, width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", gap: 6 }}>
        <span style={{ color: selected.length ? "var(--text-primary)" : "var(--text-ghost)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected.length ? selected.join(", ") : placeholder}
        </span>
        <span style={{ fontSize: 9, color: "var(--text-ghost)", flexShrink: 0 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 30,
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8,
          padding: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", maxHeight: 230, overflowY: "auto",
        }}>
          {options.map(o => (
            <label key={o} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 6px", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", borderRadius: 5 }}>
              <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
              {o}
            </label>
          ))}
          {selected.filter(s => !options.includes(s)).map(custom => (
            <label key={custom} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 6px", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", borderRadius: 5 }}>
              <input type="checkbox" checked onChange={() => toggle(custom)} />
              {custom} <span style={{ color: "var(--text-ghost)", fontSize: 10 }}>(custom)</span>
            </label>
          ))}
          <div style={{ display: "flex", gap: 4, marginTop: 4, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
            <input value={customText} onChange={e => setCustomText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
              placeholder="Other…" style={{ ...S.inp, flex: 1, fontSize: 11, padding: "5px 8px" }} />
            <button type="button" onClick={addCustom} style={{ ...S.ghost, padding: "0 8px", fontSize: 11 }}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Cascading Make -> Model -> Variant. Changing Make clears Model+Variant;
// changing Model clears Variant — never leaves a stale combination selected.
function MakeModelVariantFields({ make, model, variant, required = true, onChange }: {
  make: string; model: string; variant: string; required?: boolean;
  onChange: (next: { make: string; model: string; variant: string }) => void;
}) {
  const models = modelsForMake(make);
  const variants = variantsForModel(make, model);
  return (
    <>
      <div>
        <label style={S.label}>Make{required && " *"}</label>
        <CatalogSelect value={make} options={VEHICLE_MAKES} placeholder="Select make…"
          onChange={v => onChange({ make: v, model: "", variant: "" })} />
      </div>
      <div>
        <label style={S.label}>Model{required && " *"}</label>
        {models.length > 0 ? (
          <CatalogSelect value={model} options={models} placeholder="Select model…"
            onChange={v => onChange({ make, model: v, variant: "" })} />
        ) : (
          <input style={{ ...S.inp, width: "100%" }} placeholder="Type model…" value={model}
            onChange={e => onChange({ make, model: e.target.value, variant: "" })} />
        )}
      </div>
      <div>
        <label style={S.label}>Variant</label>
        {variants.length > 0 ? (
          <CatalogSelect value={variant} options={variants} placeholder="Select variant…"
            onChange={v => onChange({ make, model, variant: v })} />
        ) : (
          <input style={{ ...S.inp, width: "100%" }} placeholder="Type variant…" value={variant}
            onChange={e => onChange({ make, model, variant: e.target.value })} />
        )}
      </div>
    </>
  );
}

function YearSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select style={{ ...S.inp, width: "100%" }} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Select year…</option>
      {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
    </select>
  );
}

// Shared insurance sub-form — identical field set used by the standalone
// InsuranceModal, the Convert-to-Sale flow, and Mark-as-Sold's inline
// insurance section, so a fix/change to one of them (like the provider
// dropdown) doesn't need to be repeated three times and drift out of sync.
interface InsuranceFormState {
  provider: string; policyNumber: string; type: string;
  startDate: string; endDate: string; premium: string;
  odAmount: string; sharing: string; source: string; renewedBy: string;
  nextFollowUpDate: string;
}
function InsuranceFields({ value, onChange }: { value: InsuranceFormState; onChange: (v: InsuranceFormState) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div className="col-span-2 sm:col-span-1">
        <label style={S.label}>Provider *</label>
        <CatalogSelect value={value.provider} options={INSURANCE_PROVIDERS} placeholder="Select provider…"
          onChange={v => onChange({ ...value, provider: v })} />
      </div>
      <div><label style={S.label}>Policy No.</label><input style={{ ...S.inp, width: "100%" }} value={value.policyNumber} onChange={e => onChange({ ...value, policyNumber: e.target.value })} /></div>
      <div>
        <label style={S.label}>Type</label>
        <select style={{ ...S.inp, width: "100%" }} value={value.type} onChange={e => onChange({ ...value, type: e.target.value })}>
          {INSURANCE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
      </div>
      <div><label style={S.label}>Start Date</label><input type="date" style={{ ...S.inp, width: "100%" }} value={value.startDate} onChange={e => onChange({ ...value, startDate: e.target.value })} /></div>
      <div><label style={S.label}>End Date *</label><input type="date" style={{ ...S.inp, width: "100%" }} value={value.endDate} onChange={e => onChange({ ...value, endDate: e.target.value })} /></div>
      <div><label style={S.label}>Premium (₹)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={value.premium} onChange={e => onChange({ ...value, premium: e.target.value })} /></div>
      <div><label style={S.label}>OD Amount (₹)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={value.odAmount} onChange={e => onChange({ ...value, odAmount: e.target.value })} /></div>
      <div><label style={S.label}>Sharing</label><input style={{ ...S.inp, width: "100%" }} placeholder="e.g. co-owner split" value={value.sharing} onChange={e => onChange({ ...value, sharing: e.target.value })} /></div>
      <div><label style={S.label}>Source</label><input style={{ ...S.inp, width: "100%" }} placeholder="e.g. Agent, Direct, Referral" value={value.source} onChange={e => onChange({ ...value, source: e.target.value })} /></div>
      <div><label style={S.label}>Renewed By</label><input style={{ ...S.inp, width: "100%" }} placeholder="Staff name" value={value.renewedBy} onChange={e => onChange({ ...value, renewedBy: e.target.value })} /></div>
      <div><label style={S.label}>Next Follow-up Date</label><input type="date" style={{ ...S.inp, width: "100%" }} value={value.nextFollowUpDate} onChange={e => onChange({ ...value, nextFollowUpDate: e.target.value })} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Add / Edit Lead modal
// ═══════════════════════════════════════════════════════════════
export function LeadModal({ lead, defaultLeadType, seedValues, onClose, onSaved, onConvert, onExchangeToSell }: {
  lead: CarLead | null; defaultLeadType?: "BUYER" | "SELLER";
  // Pre-fills a brand-new lead (lead must be null) — used when spinning off a
  // Seller Lead from a Buyer's exchange car, so the customer's contact info
  // and car details don't have to be retyped.
  seedValues?: { name?: string; phone?: string; interestedMake?: string; interestedModel?: string };
  onClose: () => void; onSaved: () => void; onConvert?: (lead: CarLead) => void;
  onExchangeToSell?: (seed: { name: string; phone: string; interestedMake: string; interestedModel: string }) => void;
}) {
  // Default-prefilled fields for a brand-new Seller lead (Make, Model,
  // Transmission, Manufacturing Year) — speeds up data entry for the most
  // common case instead of opening every field blank. Never applied when
  // editing an existing lead (its real values always win) or for Buyer
  // leads, which have no equivalent default anywhere else in the app.
  const isNewSellerLead = !lead && (defaultLeadType ?? "BUYER") === "SELLER";
  const DEFAULT_SELLER_MAKE = "Maruti Suzuki";
  const DEFAULT_SELLER_MODEL = modelsForMake(DEFAULT_SELLER_MAKE)[0] ?? "";

  const [form, setForm] = useState({
    leadType: lead?.leadType ?? defaultLeadType ?? "BUYER",
    name: lead?.name ?? seedValues?.name ?? "", phone: lead?.phone ?? seedValues?.phone ?? "", email: lead?.email ?? "",
    interestedMake: lead?.interestedMake ?? seedValues?.interestedMake ?? (isNewSellerLead ? DEFAULT_SELLER_MAKE : ""),
    interestedModel: lead?.interestedModel ?? seedValues?.interestedModel ?? (isNewSellerLead ? DEFAULT_SELLER_MODEL : ""),
    budgetMin: lead?.budgetMin?.toString() ?? "", budgetMax: lead?.budgetMax?.toString() ?? "",
    hasExchangeVehicle: lead?.hasExchangeVehicle ?? false,
    tradeInVehicle: lead?.tradeInVehicle ?? "", source: lead?.source ?? "WALK_IN", sourceOther: lead?.sourceOther ?? "",
    status: lead?.status ?? "NEW", notes: lead?.notes ?? "",
    leadStage: lead?.leadStage ?? "SEARCHING_CAR",
    isDoNotCall: lead?.isDoNotCall ?? false,
    testDriveDone: lead?.testDriveDone ?? false,
    bookingDone: lead?.bookingDone ?? false,
    assignedToId: lead?.assignedToId ?? "",
    nextFollowUpDate: lead?.nextFollowUpDate ? lead.nextFollowUpDate.slice(0, 10) : "",
    location: lead?.location ?? "",
    // Buyer-only
    preferredYearFrom: lead?.preferredYearFrom?.toString() ?? "", preferredYearTo: lead?.preferredYearTo?.toString() ?? "",
    fuelPreferences: lead?.fuelPreferences?.join(", ") ?? "", transmissionPreferences: lead?.transmissionPreferences?.join(", ") ?? "",
    colorPreference: lead?.colorPreference ?? "", registrationPref: lead?.registrationPref ?? "",
    purchasePlan: lead?.purchasePlan ?? "", paymentPreference: lead?.paymentPreference ?? "",
    // Seller-only
    variant: lead?.variant ?? "", fuelType: lead?.fuelType ?? "",
    transmission: lead?.transmission ?? (isNewSellerLead ? "MT" : ""),
    mfgYear: lead?.mfgYear?.toString() ?? (isNewSellerLead ? String(new Date().getFullYear()) : ""),
    mfgMonth: lead?.mfgMonth?.toString() ?? "",
    regYear: lead?.regYear?.toString() ?? "", regMonth: lead?.regMonth?.toString() ?? "",
    sellerInsuranceType: lead?.sellerInsuranceType ?? "", insuranceValidTill: lead?.insuranceValidTill?.slice(0, 10) ?? "",
    kms: lead?.kms?.toString() ?? "", showroomHistory: lead?.showroomHistory ?? "",
    hypothecationStatus: lead?.hypothecationStatus ?? "", refurbNotes: lead?.refurbNotes ?? "",
  });
  // Extra interested cars beyond the primary Make/Model above — e.g. a buyer
  // open to a Swift, a Nexon, or a Venue. Always at least one empty row so
  // there's somewhere to start typing.
  const [extraVehicles, setExtraVehicles] = useState<{ make: string; model: string }[]>(
    lead?.additionalInterestedVehicles?.length ? lead.additionalInterestedVehicles : []
  );
  // Captured once at open — an existing lead can't be re-saved until its
  // status is deliberately changed from whatever it was when opened, so a
  // call never gets logged (notes/follow-up date updated) without the
  // status decision that's supposed to go with it.
  const [initialStatus] = useState(lead?.status ?? null);
  const statusUnchanged = !!lead && form.status === initialStatus;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const role = useAuthStore(s => s.activeOrg?.role);
  const canDelete = !!lead && !!role && !["STAFF", "VIEWER"].includes(role);
  // Older buyer-only preference fields + imported custom fields are real but
  // rarely touched day-to-day — collapsed by default so the curated field
  // set stays the first thing anyone sees on Edit; a chevron reveals them.
  const [showMore, setShowMore] = useState(false);
  // Booking Details / Delivery Checklist — buyer and seller leads, kept local so
  // saving either doesn't have to close or re-fetch the whole Edit Lead modal.
  const [bookingData, setBookingData] = useState<CarBooking | null>(lead?.booking ?? null);
  const [deliveryData, setDeliveryData] = useState<CarDelivery | null>(lead?.delivery ?? null);
  const [showBooking, setShowBooking] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);

  useEffect(() => {
    api.get("/organizations/current/directory").then(r => setEmployees(r.data.data ?? [])).catch(() => {});
  }, []);

  async function save() {
    if (!form.name.trim()) { setErr("Name is required"); return; }
    if (statusUnchanged) { setErr("Update the status before saving — that's what tells the team this lead was actually followed up on."); return; }
    if (["CNR", "BUSY", "PRODUCT_NOT_FOUND"].includes(form.leadStage) && !form.nextFollowUpDate) {
      setErr("Set a Next Follow-up Date — required for CNR / Busy / Product Not Found so this lead doesn't go cold."); return;
    }
    setSaving(true); setErr("");
    try {
      const payload: any = {
        ...form,
        budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
        nextFollowUpDate: form.nextFollowUpDate || undefined,
        additionalInterestedVehicles: extraVehicles.filter(v => v.make || v.model),
        preferredYearFrom: form.preferredYearFrom ? Number(form.preferredYearFrom) : undefined,
        preferredYearTo: form.preferredYearTo ? Number(form.preferredYearTo) : undefined,
        fuelPreferences: form.fuelPreferences ? form.fuelPreferences.split(",").map(s => s.trim()).filter(Boolean) : undefined,
        transmissionPreferences: form.transmissionPreferences ? form.transmissionPreferences.split(",").map(s => s.trim()).filter(Boolean) : undefined,
        registrationPref: form.registrationPref || undefined,
        purchasePlan: form.purchasePlan || undefined,
        paymentPreference: form.paymentPreference || undefined,
        mfgYear: form.mfgYear ? Number(form.mfgYear) : undefined,
        mfgMonth: form.mfgMonth ? Number(form.mfgMonth) : undefined,
        regYear: form.regYear ? Number(form.regYear) : undefined,
        regMonth: form.regMonth ? Number(form.regMonth) : undefined,
        sellerInsuranceType: form.sellerInsuranceType || undefined,
        insuranceValidTill: form.insuranceValidTill || undefined,
        kms: form.kms ? Number(form.kms) : undefined,
        showroomHistory: form.showroomHistory || undefined,
        hypothecationStatus: form.hypothecationStatus || undefined,
      };
      if (lead) await api.patch(`/cars/leads/${lead.id}`, payload);
      else await api.post("/cars/leads", payload);
      onSaved(); onClose();
    } catch (e) { setErr(getApiError(e)); }
    setSaving(false);
  }

  async function doDelete() {
    if (!lead) return;
    try {
      await api.delete(`/cars/leads/${lead.id}`);
      onSaved(); onClose();
    } catch (e) { setErr(getApiError(e)); setConfirmDelete(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="rounded-2xl p-5 w-full max-w-lg mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{lead ? "Edit Lead" : form.leadType === "SELLER" ? "Add Car Seller Lead" : "Add Car Buyer Lead"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <div className="flex gap-2 mb-4">
          {(["BUYER", "SELLER"] as const).map(t => (
            <button key={t} type="button" onClick={() => setForm({ ...form, leadType: t })}
              style={{ flex: 1, padding: "8px", borderRadius: 8, border: form.leadType === t ? "1px solid #38bdf8" : "1px solid var(--border)", background: form.leadType === t ? "rgba(56,189,248,0.12)" : "var(--bg-hover)", color: form.leadType === t ? "#38bdf8" : "var(--text-secondary)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
              {t === "BUYER" ? "Wants to Buy" : "Wants to Sell"}
            </button>
          ))}
        </div>
        {err && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>{err}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Curated field set — identical for Buyer and Seller, shown first
              and always visible. Everything else (old buyer-only preference
              fields, imported custom fields) lives behind "Show more fields". */}
          <div className="sm:col-span-2">
            <label style={S.label}>Name *</label>
            <input style={{ ...S.inp, width: "100%" }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div><label style={S.label}>Phone</label><input style={{ ...S.inp, width: "100%" }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label style={S.label}>Location</label><input style={{ ...S.inp, width: "100%" }} placeholder="City / area" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
          <div><label style={S.label}>Email</label><input style={{ ...S.inp, width: "100%" }} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>

          <div>
            <label style={S.label}>Lead Source</label>
            <select style={{ ...S.inp, width: "100%" }} value={form.source}
              onChange={e => { const v = e.target.value; setForm({ ...form, source: v, sourceOther: v === "OTHER" ? form.sourceOther : "" }); }}>
              {Object.entries(SOURCES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          {form.source === "OTHER" ? (
            <div>
              <label style={S.label}>Specify Source</label>
              <input style={{ ...S.inp, width: "100%" }} placeholder="e.g. Newspaper Ad" value={form.sourceOther} onChange={e => setForm({ ...form, sourceOther: e.target.value })} />
            </div>
          ) : <div />}

          <div className="sm:col-span-2" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            Car Details
          </div>
          <div>
            <label style={S.label}>Make</label>
            <CatalogSelect value={form.interestedMake} options={VEHICLE_MAKES} placeholder="Select make…"
              onChange={v => setForm({ ...form, interestedMake: v, interestedModel: "" })} />
          </div>
          <div>
            <label style={S.label}>Model</label>
            {modelsForMake(form.interestedMake).length > 0 ? (
              <CatalogSelect value={form.interestedModel} options={modelsForMake(form.interestedMake)} placeholder="Select model…"
                onChange={v => setForm({ ...form, interestedModel: v })} />
            ) : (
              <input style={{ ...S.inp, width: "100%" }} placeholder="Type model…" value={form.interestedModel} onChange={e => setForm({ ...form, interestedModel: e.target.value })} />
            )}
          </div>
          <div>
            <label style={S.label}>Variant</label>
            <input style={{ ...S.inp, width: "100%" }} placeholder="Type variant…" value={form.variant} onChange={e => setForm({ ...form, variant: e.target.value })} />
          </div>
          <div>
            <label style={S.label}>Fuel Type</label>
            <FixedSelect value={form.fuelType} options={LEAD_FUEL_TYPES} placeholder="Select fuel type…"
              onChange={v => setForm({ ...form, fuelType: v })} />
          </div>
          <div>
            <label style={S.label}>Transmission</label>
            <FixedSelect value={form.transmission} options={LEAD_TRANSMISSION_TYPES} placeholder="Select transmission…"
              onChange={v => setForm({ ...form, transmission: v })} />
          </div>
          <div>
            <label style={S.label}>Mfg Year / Month</label>
            <div className="flex gap-2">
              <YearSelect value={form.mfgYear} onChange={v => setForm({ ...form, mfgYear: v })} />
              <select style={{ ...S.inp, width: "100%" }} value={form.mfgMonth} onChange={e => setForm({ ...form, mfgMonth: e.target.value })}>
                <option value="">Month…</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={S.label}>Reg Year / Month</label>
            <div className="flex gap-2">
              <YearSelect value={form.regYear} onChange={v => setForm({ ...form, regYear: v })} />
              <select style={{ ...S.inp, width: "100%" }} value={form.regMonth} onChange={e => setForm({ ...form, regMonth: e.target.value })}>
                <option value="">Month…</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={S.label}>Insurance Type</label>
            <select style={{ ...S.inp, width: "100%" }} value={form.sellerInsuranceType} onChange={e => setForm({ ...form, sellerInsuranceType: e.target.value })}>
              <option value="">Select…</option>
              {Object.entries(SELLER_INSURANCE_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Insurance Valid Till</label><input type="date" style={{ ...S.inp, width: "100%" }} value={form.insuranceValidTill} onChange={e => setForm({ ...form, insuranceValidTill: e.target.value })} /></div>
          <div><label style={S.label}>KMs Driven</label><input type="number" style={{ ...S.inp, width: "100%" }} value={form.kms} onChange={e => setForm({ ...form, kms: e.target.value })} /></div>
          <div>
            <label style={S.label}>Showroom History</label>
            <select style={{ ...S.inp, width: "100%" }} value={form.showroomHistory} onChange={e => setForm({ ...form, showroomHistory: e.target.value })}>
              <option value="">Select…</option>
              {Object.entries(SHOWROOM_HISTORY_OPTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>HYP (Hypothecation)</label>
            <select style={{ ...S.inp, width: "100%" }} value={form.hypothecationStatus} onChange={e => setForm({ ...form, hypothecationStatus: e.target.value })}>
              <option value="">Select…</option>
              {Object.entries(HYPOTHECATION_OPTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Asking Price Min (₹)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={form.budgetMin} onChange={e => setForm({ ...form, budgetMin: e.target.value })} /></div>
          <div><label style={S.label}>Asking Price Max (₹)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={form.budgetMax} onChange={e => setForm({ ...form, budgetMax: e.target.value })} /></div>
          <div className="sm:col-span-2"><label style={S.label}>Refurb</label><input style={{ ...S.inp, width: "100%" }} placeholder="Refurbishment notes" value={form.refurbNotes} onChange={e => setForm({ ...form, refurbNotes: e.target.value })} /></div>

          <div>
            <label style={S.label}>Assign To</label>
            <select style={{ ...S.inp, width: "100%" }} value={form.assignedToId} onChange={e => setForm({ ...form, assignedToId: e.target.value })}>
              <option value="">Unassigned</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label style={S.label}>Next Follow-up Date</label>
            <input type="date" style={{ ...S.inp, width: "100%" }} value={form.nextFollowUpDate} onChange={e => setForm({ ...form, nextFollowUpDate: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label style={S.label}>Notes</label>
            <textarea style={{ ...S.inp, width: "100%", minHeight: 70, resize: "vertical" } as React.CSSProperties} placeholder='e.g. "Called twice, not answered"' value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label style={S.label}>
              Status {lead && (
                <span style={{ marginLeft: 6, fontWeight: 700, textTransform: "none", letterSpacing: 0, color: statusUnchanged ? "#f87171" : "#4ade80" }}>
                  {statusUnchanged ? "— update this before saving" : "✓ updated"}
                </span>
              )}
            </label>
            <select style={{ ...S.inp, width: "100%", border: lead && statusUnchanged ? "1px solid #f87171" : undefined }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {LEAD_STATUSES.filter(s => s !== "CONVERTED").map(s => <option key={s} value={s}>{LEAD_STATUS[s].label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label style={S.label}>Lead Stage</label>
            <select style={{ ...S.inp, width: "100%" }} value={form.leadStage} onChange={e => setForm({ ...form, leadStage: e.target.value })}>
              {LEAD_STAGES.map(s => <option key={s} value={s}>{LEAD_STAGE[s].label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <label className="flex items-center gap-2" style={{ fontSize: 12, color: "#f87171", cursor: "pointer" }}>
            <input type="checkbox" checked={form.isDoNotCall} onChange={e => setForm({ ...form, isDoNotCall: e.target.checked })} />
            Do Not Call (DND)
          </label>
          <label className="flex items-center gap-2" style={{ fontSize: 12, color: "#4ade80", cursor: "pointer" }}>
            <input type="checkbox" checked={form.testDriveDone} onChange={e => setForm({ ...form, testDriveDone: e.target.checked })} />
            Test Drive Done
          </label>
          <label className="flex items-center gap-2" style={{ fontSize: 12, color: "#4ade80", cursor: "pointer" }}>
            <input type="checkbox" checked={form.bookingDone} onChange={e => setForm({ ...form, bookingDone: e.target.checked })} />
            Booking Done
          </label>
        </div>

        <button type="button" onClick={() => setShowMore(s => !s)}
          style={{ ...S.ghost, width: "100%", justifyContent: "center", marginTop: 14 }}>
          {showMore ? "▲ Hide more fields" : "▼ Show more fields"}
        </button>
        {showMore && (
          <div className="mt-3">
            {form.leadType === "BUYER" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="sm:col-span-2" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Buyer Preferences
                </div>
                <div><label style={S.label}>Year — From</label><YearSelect value={form.preferredYearFrom} onChange={v => setForm({ ...form, preferredYearFrom: v })} /></div>
                <div><label style={S.label}>Year — To</label><YearSelect value={form.preferredYearTo} onChange={v => setForm({ ...form, preferredYearTo: v })} /></div>
                <div>
                  <label style={S.label}>Fuel Preferences</label>
                  <MultiCatalogSelect value={form.fuelPreferences} options={FUEL_TYPES} placeholder="Select fuel types…"
                    onChange={v => setForm({ ...form, fuelPreferences: v })} />
                </div>
                <div>
                  <label style={S.label}>Transmission Preferences</label>
                  <MultiCatalogSelect value={form.transmissionPreferences} options={TRANSMISSION_TYPES} placeholder="Select transmission types…"
                    onChange={v => setForm({ ...form, transmissionPreferences: v })} />
                </div>
                <div><label style={S.label}>Color Pref.</label><input style={{ ...S.inp, width: "100%" }} value={form.colorPreference} onChange={e => setForm({ ...form, colorPreference: e.target.value })} /></div>
                <div>
                  <label style={S.label}>Local / Any</label>
                  <select style={{ ...S.inp, width: "100%" }} value={form.registrationPref} onChange={e => setForm({ ...form, registrationPref: e.target.value })}>
                    <option value="">Select…</option>
                    {Object.entries(REGISTRATION_PREFS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Purchase Plan</label>
                  <select style={{ ...S.inp, width: "100%" }} value={form.purchasePlan} onChange={e => setForm({ ...form, purchasePlan: e.target.value })}>
                    <option value="">Select…</option>
                    {Object.entries(PURCHASE_PLANS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Payment</label>
                  <select style={{ ...S.inp, width: "100%" }} value={form.paymentPreference} onChange={e => setForm({ ...form, paymentPreference: e.target.value })}>
                    <option value="">Select…</option>
                    {Object.entries(PAYMENT_PREFS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label style={S.label}>Also open to</label>
                  {extraVehicles.map((ev, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                      <CatalogSelect value={ev.make} options={VEHICLE_MAKES} placeholder="Select make…"
                        onChange={v => setExtraVehicles(prev => prev.map((r, idx) => idx === i ? { make: v, model: "" } : r))} />
                      <div className="flex gap-1">
                        {modelsForMake(ev.make).length > 0 ? (
                          <CatalogSelect value={ev.model} options={modelsForMake(ev.make)} placeholder="Select model…"
                            onChange={v => setExtraVehicles(prev => prev.map((r, idx) => idx === i ? { ...r, model: v } : r))} />
                        ) : (
                          <input style={{ ...S.inp, width: "100%" }} placeholder="Type model…" value={ev.model}
                            onChange={e => setExtraVehicles(prev => prev.map((r, idx) => idx === i ? { ...r, model: e.target.value } : r))} />
                        )}
                        <button type="button" onClick={() => setExtraVehicles(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ ...S.ghost, padding: "0 10px", flexShrink: 0 }}>✕</button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setExtraVehicles(prev => [...prev, { make: "", model: "" }])}
                    style={{ ...S.ghost, fontSize: 12 }}>+ Add another car they'd consider</button>
                </div>

                <div className="sm:col-span-2">
                  <label style={S.label}>Exchange Car?</label>
                  <div className="flex gap-2 mb-2">
                    {[["Yes", true], ["No", false]].map(([lbl, val]) => (
                      <button key={lbl as string} type="button"
                        onClick={() => setForm({ ...form, hasExchangeVehicle: val as boolean })}
                        style={{ padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                          border: form.hasExchangeVehicle === val ? "1px solid #38bdf8" : "1px solid var(--border)",
                          background: form.hasExchangeVehicle === val ? "rgba(56,189,248,0.12)" : "var(--bg-hover)",
                          color: form.hasExchangeVehicle === val ? "#38bdf8" : "var(--text-secondary)" }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                  {form.hasExchangeVehicle && (
                    <>
                      <input style={{ ...S.inp, width: "100%" }} placeholder="e.g. 2018 Honda City" value={form.tradeInVehicle} onChange={e => setForm({ ...form, tradeInVehicle: e.target.value })} />
                      {onExchangeToSell && (
                        <button type="button"
                          onClick={() => onExchangeToSell({ name: form.name, phone: form.phone, interestedMake: "", interestedModel: form.tradeInVehicle })}
                          disabled={!form.name.trim()}
                          style={{ ...S.ghost, fontSize: 12, marginTop: 8 }}>
                          <ArrowRight style={{ width: 12, height: 12 }} /> Create Seller Lead for this car
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            {lead && (
              // Anything a bulk import found on the sheet that isn't one of the
              // fields above (city, down payment, insurance details, etc.) shows
              // up here as its own labeled field — imported data isn't silently
              // buried in the Notes box.
              <CustomFieldRenderer entity={form.leadType === "SELLER" ? "CAR_SELLER_LEAD" : "CAR_BUYER_LEAD"} entityId={lead.id} />
            )}
          </div>
        )}
        {lead && (
          <div className="flex items-center gap-2 mt-3">
            <button type="button" onClick={() => setShowBooking(true)} style={S.ghost}>
              {bookingData ? "✓ " : ""}Booking Details
            </button>
            <button type="button" onClick={() => setShowDelivery(true)} style={S.ghost}>
              {deliveryData?.deliveryDone ? "✓ " : ""}Delivery Checklist
            </button>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 mt-4">
          <div className="flex gap-2">
            {lead && lead.status !== "CONVERTED" && onConvert && (
              <button onClick={() => onConvert(lead)} style={S.ghost}>
                {lead.leadType === "SELLER" ? "Buy Car" : "Convert to Sale"} <ArrowRight style={{ width: 12, height: 12 }} />
              </button>
            )}
            {canDelete && (
              <button onClick={() => setConfirmDelete(true)} style={{ ...S.ghost, color: "#f87171" }}><Trash2 style={{ width: 12, height: 12 }} /> Delete</button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} style={S.ghost}>Cancel</button>
            <button onClick={save} disabled={saving || statusUnchanged} style={{ ...S.btn, opacity: statusUnchanged ? 0.5 : 1, cursor: statusUnchanged ? "not-allowed" : "pointer" }}>{saving ? "Saving…" : lead ? "Save Changes" : "Add Lead"}</button>
          </div>
        </div>
      </div>
      {confirmDelete && lead && (
        <ConfirmDialog
          title="Delete Lead"
          message={`"${lead.name}" will be removed from your active leads. This can be restored by support if it was a mistake.`}
          confirmLabel="Delete"
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {showBooking && lead && (
        <BookingModal lead={lead} existing={bookingData} onClose={() => setShowBooking(false)}
          onSaved={booking => setBookingData(booking)} />
      )}
      {showDelivery && lead && (
        <DeliveryChecklistModal lead={lead} existing={deliveryData} onClose={() => setShowDelivery(false)}
          onSaved={delivery => setDeliveryData(delivery)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Booking Details (buyer and seller leads — deal terms once in negotiation/booked)
// ═══════════════════════════════════════════════════════════════
function BookingModal({ lead, existing, onClose, onSaved }: { lead: CarLead; existing: CarBooking | null; onClose: () => void; onSaved: (booking: CarBooking) => void }) {
  const [b, setB] = useState({
    carPrice: existing?.carPrice?.toString() ?? "", commission: existing?.commission?.toString() ?? "",
    paymentType: existing?.paymentType ?? "", rtoCharge: existing?.rtoCharge?.toString() ?? "",
    warranty: existing?.warranty ?? "", extraWork: existing?.extraWork ?? "",
    rsaIncluded: existing?.rsaIncluded ?? false, rsaAmount: existing?.rsaAmount?.toString() ?? "",
    finalPrice: existing?.finalPrice?.toString() ?? "", deliveryDate: existing?.deliveryDate?.slice(0, 10) ?? "",
    termsAndConditions: existing?.termsAndConditions ?? "", insuranceIncluded: existing?.insuranceIncluded ?? false,
    notes: existing?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setSaving(true); setErr("");
    try {
      const payload = {
        ...b,
        carPrice: b.carPrice ? Number(b.carPrice) : undefined,
        commission: b.commission ? Number(b.commission) : undefined,
        paymentType: b.paymentType || undefined,
        rtoCharge: b.rtoCharge ? Number(b.rtoCharge) : undefined,
        rsaAmount: b.rsaAmount ? Number(b.rsaAmount) : undefined,
        finalPrice: b.finalPrice ? Number(b.finalPrice) : undefined,
        deliveryDate: b.deliveryDate || undefined,
      };
      const res = await api.patch(`/cars/leads/${lead.id}/booking`, payload);
      onSaved(res.data.data); onClose();
    } catch (e) { setErr(getApiError(e)); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl p-5 w-full max-w-xl mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Booking Details — {lead.name}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {err && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>{err}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <div><label style={S.label}>Car Price (₹)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={b.carPrice} onChange={e => setB({ ...b, carPrice: e.target.value })} /></div>
          <div><label style={S.label}>Commission (₹)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={b.commission} onChange={e => setB({ ...b, commission: e.target.value })} /></div>
          <div>
            <label style={S.label}>Cash / Finance</label>
            <select style={{ ...S.inp, width: "100%" }} value={b.paymentType} onChange={e => setB({ ...b, paymentType: e.target.value })}>
              <option value="">Select…</option>
              <option value="CASH">Cash</option>
              <option value="FINANCE">Finance</option>
            </select>
          </div>
          <div><label style={S.label}>RTO Charge (₹)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={b.rtoCharge} onChange={e => setB({ ...b, rtoCharge: e.target.value })} /></div>
          <div><label style={S.label}>Warranty</label><input style={{ ...S.inp, width: "100%" }} placeholder="e.g. 1 year" value={b.warranty} onChange={e => setB({ ...b, warranty: e.target.value })} /></div>
          <div><label style={S.label}>Extra Work</label><input style={{ ...S.inp, width: "100%" }} value={b.extraWork} onChange={e => setB({ ...b, extraWork: e.target.value })} /></div>
          <div><label style={S.label}>Final Price (₹)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={b.finalPrice} onChange={e => setB({ ...b, finalPrice: e.target.value })} /></div>
          <div><label style={S.label}>Delivery Date</label><input type="date" style={{ ...S.inp, width: "100%" }} value={b.deliveryDate} onChange={e => setB({ ...b, deliveryDate: e.target.value })} /></div>
        </div>

        <div className="flex items-center gap-4 mb-3">
          <label className="flex items-center gap-2" style={{ fontSize: 12, color: "#4ade80", cursor: "pointer" }}>
            <input type="checkbox" checked={b.rsaIncluded} onChange={e => setB({ ...b, rsaIncluded: e.target.checked })} />
            RSA Included
          </label>
          {b.rsaIncluded && <input type="number" style={{ ...S.inp, width: 140 }} placeholder="RSA amount (₹)" value={b.rsaAmount} onChange={e => setB({ ...b, rsaAmount: e.target.value })} />}
          <label className="flex items-center gap-2" style={{ fontSize: 12, color: "#4ade80", cursor: "pointer" }}>
            <input type="checkbox" checked={b.insuranceIncluded} onChange={e => setB({ ...b, insuranceIncluded: e.target.checked })} />
            Insurance Included
          </label>
        </div>

        <div className="mb-3">
          <label style={S.label}>Terms &amp; Conditions</label>
          <textarea style={{ ...S.inp, width: "100%", minHeight: 60, resize: "vertical" } as React.CSSProperties} value={b.termsAndConditions} onChange={e => setB({ ...b, termsAndConditions: e.target.value })} />
        </div>
        <div className="mb-1">
          <label style={S.label}>Note</label>
          <textarea style={{ ...S.inp, width: "100%", minHeight: 50, resize: "vertical" } as React.CSSProperties} value={b.notes} onChange={e => setB({ ...b, notes: e.target.value })} />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} style={S.ghost}>Cancel</button>
          <button onClick={save} disabled={saving} style={S.btn}>{saving ? "Saving…" : "Save Booking"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Delivery Checklist (buyer and seller leads — post-booking handover)
// ═══════════════════════════════════════════════════════════════
function DeliveryChecklistModal({ lead, existing, onClose, onSaved }: { lead: CarLead; existing: CarDelivery | null; onClose: () => void; onSaved: (delivery: CarDelivery) => void }) {
  const [d, setD] = useState({
    checkedOut: existing?.checkedOut ?? false, documentsAdded: existing?.documentsAdded ?? false,
    deliveryNoteAdded: existing?.deliveryNoteAdded ?? false, deliveryDone: existing?.deliveryDone ?? false,
    notes: existing?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  // The delivery row's own id, needed before a Delivery Note file can be
  // attached (Document is keyed on entityId) — null until the checklist has
  // been saved at least once.
  const [deliveryId, setDeliveryId] = useState<string | null>(existing?.id ?? null);

  async function save() {
    setSaving(true); setErr("");
    try {
      const res = await api.patch(`/cars/leads/${lead.id}/delivery`, d);
      setDeliveryId(res.data.data.id);
      onSaved(res.data.data);
    } catch (e) { setErr(getApiError(e)); }
    setSaving(false);
  }

  const steps: { key: keyof typeof d; label: string; doneAt?: string }[] = [
    { key: "checkedOut", label: "Check Out", doneAt: existing?.checkedOutAt },
    { key: "documentsAdded", label: "Document Added", doneAt: existing?.documentsAddedAt },
    { key: "deliveryNoteAdded", label: "Delivery Note Added" },
    { key: "deliveryDone", label: "Delivery Done", doneAt: existing?.deliveryDoneAt },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl p-5 w-full max-w-md mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Delivery Checklist — {lead.name}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {err && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>{err}</div>}

        <div className="space-y-2 mb-3">
          {steps.map(step => (
            <label key={String(step.key)} className="flex items-center justify-between gap-2" style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg-hover)", cursor: "pointer" }}>
              <span className="flex items-center gap-2" style={{ fontSize: 12, color: "var(--text-primary)" }}>
                <input type="checkbox" checked={d[step.key] as boolean} onChange={e => setD({ ...d, [step.key]: e.target.checked })} />
                {step.label}
              </span>
              {step.doneAt && <span style={{ fontSize: 10, color: "var(--text-ghost)" }}>{new Date(step.doneAt).toLocaleDateString("en-IN")}</span>}
            </label>
          ))}
        </div>

        <label style={S.label}>Notes</label>
        <textarea style={{ ...S.inp, width: "100%", minHeight: 50, resize: "vertical" } as React.CSSProperties} value={d.notes} onChange={e => setD({ ...d, notes: e.target.value })} />

        {deliveryId ? (
          <div className="mt-3">
            <label style={S.label}>Delivery Note File</label>
            <DocumentsPanel entityType="CAR_DELIVERY" entityId={deliveryId} compact />
          </div>
        ) : (
          <p style={{ fontSize: 11, color: "var(--text-ghost)", marginTop: 10 }}>Save the checklist once to attach the Delivery Note file.</p>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} style={S.ghost}>{deliveryId ? "Done" : "Cancel"}</button>
          <button onClick={save} disabled={saving} style={S.btn}>{saving ? "Saving…" : "Save Checklist"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Import CSV modal
// ═══════════════════════════════════════════════════════════════
// Same exact header/example row shown inside each Import CSV modal — kept as
// one constant per format so the downloadable template can never drift out
// of sync with what Import actually expects. Every header here is a real
// column bulkImportCarLeads recognizes (see FIELD_ALIASES / BUYER_LEAD_EXTRA_
// FIELDS / SELLER_LEAD_EXTRA_FIELDS in cars.controller.ts) — not just the
// handful of core CarLead columns, so the full buyer (25-field) / seller
// (37-field) sheet a dealership actually tracks round-trips through
// Export Format -> edit -> Import CSV without losing any column.
const BUYER_LEAD_CSV_TEMPLATE = `Name,Phone,Alternate Number,Email,City,Make,Model,Variant,New/Used,Purchase Type,Fuel Type,Transmission,Body Type,Budget Min,Budget Max,Down Payment,Exchange,Specific Choice,Decision Maker,Status,Lead Source,Assigned Salesperson,Expected Purchase Date,Enquiry Date,Notes
Raj Patel,9876543210,9876500000,raj@abc.com,Pune,Maruti Suzuki,Swift,ZXi,New,Cash,Petrol,Manual,Hatchback,600000,800000,50000,No,No,Yes,HOT,Walk In,Priya Sales,15/10/2026,01/10/2026,Interested in white color`;
const SELLER_LEAD_CSV_TEMPLATE = `Name,Phone,Alternate Number,Email,City,Area,Lead ID,Campaign Name,Make,Model,Variant,Registration Number,Manufacturing Year,Registration Year,Registration Month,Colour,Fuel Type,Transmission,Kilometres,Owners,RTO,Insurance Valid Till,Insurance Type,Insurance Company,Loan / Hypothecation,Finance Company,Loan Outstanding,Service History,Repair Estimate,Budget Min,Budget Max,Expected Retail Selling Price,Status,Lead Source,Assigned Salesperson,Enquiry Date,Notes
Priya Singh,9123456789,9123400000,priya@abc.com,Mumbai,Andheri,LEAD001,Diwali Offer,Hyundai,Creta,SX,MH12AB1234,2019,2019,March,White,Petrol,Manual,45000,1,Andheri RTO,15/03/2027,Comprehensive,ICICI Lombard,No,,0,Regular service done,Minor scratch on bumper,700000,800000,750000,WARM,Referral,Priya Sales,20/10/2026,Wants quick sale`;
const VEHICLE_CSV_TEMPLATE = `name,mob number,reg no,date of reg,address,eng no,chassis no,make,model/var,fuel,ins type,ins co name,idv,od,ncb,prem,expiry/reni,payment mode,sharing\nRaj Patel,9876543210,MH12AB1234,2019-03-14,Pune,EN123,CH456,Maruti Suzuki,Swift,Petrol,Comprehensive,ICICI Lombard,450000,8000,20,9500,2026-03-14,Online,NA`;

function downloadCsvTemplate(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseCsvText(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"(.*)"$/, "$1"));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

function ImportModal({ leadType, onClose, onImported }: { leadType: "BUYER" | "SELLER"; onClose: () => void; onImported: () => void }) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileRows, setFileRows] = useState<Record<string, any>[] | null>(null);
  const [fileError, setFileError] = useState("");
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const sample = leadType === "SELLER" ? SELLER_LEAD_CSV_TEMPLATE : BUYER_LEAD_CSV_TEMPLATE;

  async function handleFile(file: File) {
    setFileError(""); setFileName(file.name); setFileRows(null);
    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        setFileRows(parseCsvText(text));
      } else {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, any>[];
        // Normalise header casing (e.g. "Name" / "Make") to lowercase keys
        setFileRows(rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim().toLowerCase(), v]))));
      }
    } catch {
      setFileError("Could not read this file. Make sure it's a valid .csv or .xlsx file.");
    }
  }

  async function doImport() {
    const rows = fileRows ?? (csvText.trim() ? parseCsvText(csvText) : null);
    if (!rows || rows.length === 0) return;
    setImporting(true);
    const total: { created: number; skipped: number; errors: string[] } = { created: 0, skipped: 0, errors: [] };
    setProgress({ done: 0, total: rows.length });
    try {
      for (let i = 0; i < rows.length; i += IMPORT_BATCH_SIZE) {
        const batch = rows.slice(i, i + IMPORT_BATCH_SIZE);
        const r = await api.post("/cars/leads/bulk-import", { leads: batch, leadType });
        total.created += r.data.data.created;
        total.skipped += r.data.data.skipped;
        total.errors.push(...r.data.data.errors);
        setProgress({ done: Math.min(i + IMPORT_BATCH_SIZE, rows.length), total: rows.length });
      }
      setResult(total);
      if (total.created > 0) onImported();
    } catch (e: any) {
      total.errors.push(getApiError(e));
      setResult(total);
      if (total.created > 0) onImported();
    }
    setImporting(false);
    setProgress(null);
  }

  const canImport = !!fileRows?.length || !!csvText.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl p-5 w-full max-w-lg mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Import {leadType === "SELLER" ? "Seller " : "Buyer "}Leads (CSV)</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {result ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl p-4 text-center" style={{ background: "#064e3b", border: "1px solid #065f46" }}>
                <div className="text-3xl font-bold" style={{ color: "#4ade80" }}>{result.created}</div>
                <div className="text-xs" style={{ color: "#6ee7b7" }}>Leads Created</div>
              </div>
              <div className="flex-1 rounded-xl p-4 text-center" style={{ background: "#1e1b4b", border: "1px solid #312e81" }}>
                <div className="text-3xl font-bold" style={{ color: "#818cf8" }}>{result.skipped}</div>
                <div className="text-xs" style={{ color: "#a5b4fc" }}>Skipped (duplicates)</div>
              </div>
            </div>
            {result.errors.length > 0 && <p className="text-xs text-red-400">{result.errors.join(", ")}</p>}
            <button onClick={onClose} style={{ ...S.btn, width: "100%", justifyContent: "center" }}>Done</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px]" style={{ color: "var(--text-ghost)" }}>
              Works with your own sheet's column names, not just these — Name/Contact/Requirement/Budget/Hot are recognized under many common aliases (e.g. "Contact" or "Mobile" both work as phone), and a full dealership enquiry sheet (Customer Name, WhatsApp Number, City, Lead Source, Assigned Salesperson, Make, Model, Variant, Budget Minimum/Maximum, Down Payment, Exchange, Decision Maker, Enquiry Date, etc.) is recognized directly. Assigned Salesperson is matched to an existing team member by name. Budget ranges like "5-6lac" are parsed automatically when there's no separate Min/Max column. Any column that isn't recognized is still kept — added to that lead's notes instead of being dropped.
            </p>

            <div>
              <label style={S.label}>Upload a File (.csv or .xlsx)</label>
              <label style={{ ...S.ghost, width: "100%", justifyContent: "center", cursor: "pointer", padding: "14px" }}>
                <Upload style={{ width: 14, height: 14 }} />
                {fileName || "Choose a CSV or Excel file…"}
                <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </label>
              {fileError && <p style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{fileError}</p>}
              {fileRows && <p style={{ fontSize: 11, color: "#4ade80", marginTop: 4 }}>{fileRows.length} row{fileRows.length !== 1 ? "s" : ""} ready to import</p>}
            </div>

            <div className="flex items-center gap-3">
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>or paste CSV text</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            <div className="rounded-lg p-3 font-mono text-[10px]" style={{ background: "#0f172a", color: "#4ade80", overflowX: "auto", whiteSpace: "pre" }}>{sample}</div>
            <textarea style={{ ...S.inp, width: "100%", resize: "vertical", minHeight: 100, fontFamily: "monospace", fontSize: 11 } as React.CSSProperties} value={csvText} onChange={e => { setCsvText(e.target.value); setFileRows(null); setFileName(""); }} placeholder={sample} />

            {progress && (
              <div>
                <div style={{ height: 6, borderRadius: 99, background: "var(--bg-hover)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round((progress.done / progress.total) * 100)}%`, background: "#0ea5e9", transition: "width 0.2s" }} />
                </div>
                <p style={{ fontSize: 11, color: "var(--text-ghost)", marginTop: 4 }}>Importing {progress.done.toLocaleString()} of {progress.total.toLocaleString()} rows…</p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} style={S.ghost}>Cancel</button>
              <button onClick={doImport} disabled={importing || !canImport} style={S.btn}><Upload style={{ width: 12, height: 12 }} />{importing ? "Importing…" : "Import"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Import Vehicles & Insurance (CSV) — mirrors ImportModal above, matches the
// client's own sheet: NAME, MOB NUMBER, REG NO, DATE OF REG, ADDRESS, ENG NO,
// CHASSIS NO, MAKE, MODEL/VAR, FUEL, INS TYPE, INS CO NAME, IDV, OD, NCB,
// PREM, EXPIRY/RENEWAL, PAYMENT MODE, SHARING.
// ═══════════════════════════════════════════════════════════════
// Rows per request — keeps each request's JSON payload small and fast enough
// to finish well inside any request timeout. A file with more rows than this
// is sent as several sequential requests instead of one huge one, which is
// what large (thousands-of-rows) sheets were actually failing on before.
const IMPORT_BATCH_SIZE = 1000;

function VehicleImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileRows, setFileRows] = useState<Record<string, any>[] | null>(null);
  const [fileError, setFileError] = useState("");
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const sample = VEHICLE_CSV_TEMPLATE;

  async function handleFile(file: File) {
    setFileError(""); setFileName(file.name); setFileRows(null);
    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        setFileRows(parseCsvText(text));
      } else {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, any>[];
        setFileRows(rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim().toLowerCase(), v]))));
      }
    } catch {
      setFileError("Could not read this file. Make sure it's a valid .csv or .xlsx file.");
    }
  }

  async function doImport() {
    const rows = fileRows ?? (csvText.trim() ? parseCsvText(csvText) : null);
    if (!rows || rows.length === 0) return;
    setImporting(true);
    const total: { created: number; skipped: number; errors: string[] } = { created: 0, skipped: 0, errors: [] };
    setProgress({ done: 0, total: rows.length });
    try {
      for (let i = 0; i < rows.length; i += IMPORT_BATCH_SIZE) {
        const batch = rows.slice(i, i + IMPORT_BATCH_SIZE);
        const r = await api.post("/cars/vehicles/bulk-import", { vehicles: batch });
        total.created += r.data.data.created;
        total.skipped += r.data.data.skipped;
        total.errors.push(...r.data.data.errors);
        setProgress({ done: Math.min(i + IMPORT_BATCH_SIZE, rows.length), total: rows.length });
      }
      setResult(total);
      if (total.created > 0) onImported();
    } catch (e: any) {
      // Whatever succeeded in earlier batches before this one failed is real
      // and already saved — surface both instead of implying nothing happened.
      total.errors.push(getApiError(e));
      setResult(total);
      if (total.created > 0) onImported();
    }
    setImporting(false);
    setProgress(null);
  }

  const canImport = !!fileRows?.length || !!csvText.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl p-5 w-full max-w-lg mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Import Vehicles & Insurance (CSV)</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {result ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl p-4 text-center" style={{ background: "#064e3b", border: "1px solid #065f46" }}>
                <div className="text-3xl font-bold" style={{ color: "#4ade80" }}>{result.created}</div>
                <div className="text-xs" style={{ color: "#6ee7b7" }}>Vehicles Created</div>
              </div>
              <div className="flex-1 rounded-xl p-4 text-center" style={{ background: "#1e1b4b", border: "1px solid #312e81" }}>
                <div className="text-3xl font-bold" style={{ color: "#818cf8" }}>{result.skipped}</div>
                <div className="text-xs" style={{ color: "#a5b4fc" }}>Skipped (duplicates)</div>
              </div>
            </div>
            {result.errors.length > 0 && <p className="text-xs text-red-400">{result.errors.join(", ")}</p>}
            <button onClick={onClose} style={{ ...S.btn, width: "100%", justifyContent: "center" }}>Done</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px]" style={{ color: "var(--text-ghost)" }}>
              Works with your own sheet's column names — NAME, MOB NUMBER, REG NO, DATE OF REG, ADDRESS, ENG NO, CHASSIS NO, MAKE, MODEL/VAR, FUEL, INS TYPE, INS CO NAME, IDV, OD, NCB, PREM, EXPIRY/RENEWAL, PAYMENT MODE, SHARING are all recognized. Each row becomes a Sold vehicle (with its owner) plus its insurance policy, if a provider and expiry date are present. Any unrecognized column is kept in Notes instead of being dropped. Cells that say "NA" are treated as blank.
            </p>

            <div>
              <label style={S.label}>Upload a File (.csv or .xlsx)</label>
              <label style={{ ...S.ghost, width: "100%", justifyContent: "center", cursor: "pointer", padding: "14px" }}>
                <Upload style={{ width: 14, height: 14 }} />
                {fileName || "Choose a CSV or Excel file…"}
                <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </label>
              {fileError && <p style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{fileError}</p>}
              {fileRows && <p style={{ fontSize: 11, color: "#4ade80", marginTop: 4 }}>{fileRows.length} row{fileRows.length !== 1 ? "s" : ""} ready to import</p>}
            </div>

            <div className="flex items-center gap-3">
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>or paste CSV text</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            <div className="rounded-lg p-3 font-mono text-[10px]" style={{ background: "#0f172a", color: "#4ade80", overflowX: "auto", whiteSpace: "pre" }}>{sample}</div>
            <textarea style={{ ...S.inp, width: "100%", resize: "vertical", minHeight: 100, fontFamily: "monospace", fontSize: 11 } as React.CSSProperties} value={csvText} onChange={e => { setCsvText(e.target.value); setFileRows(null); setFileName(""); }} placeholder={sample} />

            {progress && (
              <div>
                <div style={{ height: 6, borderRadius: 99, background: "var(--bg-hover)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round((progress.done / progress.total) * 100)}%`, background: "#0ea5e9", transition: "width 0.2s" }} />
                </div>
                <p style={{ fontSize: 11, color: "var(--text-ghost)", marginTop: 4 }}>Importing {progress.done.toLocaleString()} of {progress.total.toLocaleString()} rows…</p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} style={S.ghost}>Cancel</button>
              <button onClick={doImport} disabled={importing || !canImport} style={S.btn}><Upload style={{ width: 12, height: 12 }} />{importing ? "Importing…" : "Import"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Convert Lead → Sale (creates Vehicle + first Insurance policy)
// ═══════════════════════════════════════════════════════════════
function ConvertModal({ lead, onClose, onConverted }: { lead: CarLead; onClose: () => void; onConverted: () => void }) {
  const [v, setV] = useState({
    make: lead.interestedMake ?? "", model: lead.interestedModel ?? "", variant: "", year: "",
    registrationNo: "", chassisNo: "", color: "", odometer: "", fuelType: "", transmission: "",
    salePrice: "", ownerName: lead.name, ownerPhone: lead.phone ?? "", ownerEmail: lead.email ?? "",
  });
  const [addInsurance, setAddInsurance] = useState(true);
  const [ins, setIns] = useState<InsuranceFormState>({ provider: "", policyNumber: "", type: "THIRD_PARTY", startDate: new Date().toISOString().slice(0, 10), endDate: "", premium: "", odAmount: "", sharing: "", source: "", renewedBy: "", nextFollowUpDate: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!v.make.trim() || !v.model.trim()) { setErr("Make and model are required"); return; }
    if (addInsurance && (!ins.provider.trim() || !ins.endDate)) { setErr("Insurance provider and end date are required (or uncheck 'add insurance now')"); return; }
    setSaving(true); setErr("");
    try {
      await api.post(`/cars/leads/${lead.id}/convert`, {
        vehicle: {
          ...v,
          year: v.year ? Number(v.year) : undefined,
          odometer: v.odometer ? Number(v.odometer) : undefined,
          salePrice: v.salePrice ? Number(v.salePrice) : undefined,
        },
        insurance: addInsurance ? { ...ins, premium: ins.premium ? Number(ins.premium) : undefined, odAmount: ins.odAmount ? Number(ins.odAmount) : undefined } : undefined,
      });
      onConverted(); onClose();
    } catch (e) { setErr(getApiError(e)); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl p-5 w-full max-w-xl mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Convert to Sale — {lead.name}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {err && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>{err}</div>}

        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Vehicle Sold</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <MakeModelVariantFields make={v.make} model={v.model} variant={v.variant}
            onChange={next => setV({ ...v, ...next })} />
          <div><label style={S.label}>Year</label><YearSelect value={v.year} onChange={year => setV({ ...v, year })} /></div>
          <div><label style={S.label}>Registration No.</label><input style={{ ...S.inp, width: "100%" }} value={v.registrationNo} onChange={e => setV({ ...v, registrationNo: e.target.value })} /></div>
          <div><label style={S.label}>Chassis No.</label><input style={{ ...S.inp, width: "100%" }} value={v.chassisNo} onChange={e => setV({ ...v, chassisNo: e.target.value })} /></div>
          <div><label style={S.label}>Color</label><input style={{ ...S.inp, width: "100%" }} value={v.color} onChange={e => setV({ ...v, color: e.target.value })} /></div>
          <div><label style={S.label}>Odometer (km)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={v.odometer} onChange={e => setV({ ...v, odometer: e.target.value })} /></div>
          <div><label style={S.label}>Fuel Type</label><MultiCatalogSelect value={v.fuelType} options={FUEL_TYPES} placeholder="Select fuel type(s)…" onChange={fuelType => setV({ ...v, fuelType })} /></div>
          <div><label style={S.label}>Transmission</label><MultiCatalogSelect value={v.transmission} options={TRANSMISSION_TYPES} placeholder="Select transmission(s)…" onChange={transmission => setV({ ...v, transmission })} /></div>
          <div><label style={S.label}>Sale Price (₹)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={v.salePrice} onChange={e => setV({ ...v, salePrice: e.target.value })} /></div>
          <div><label style={S.label}>Customer Name</label><input style={{ ...S.inp, width: "100%" }} value={v.ownerName} onChange={e => setV({ ...v, ownerName: e.target.value })} /></div>
          <div><label style={S.label}>Customer Phone</label><input style={{ ...S.inp, width: "100%" }} value={v.ownerPhone} onChange={e => setV({ ...v, ownerPhone: e.target.value })} /></div>
          <div><label style={S.label}>Customer Email</label><input style={{ ...S.inp, width: "100%" }} value={v.ownerEmail} onChange={e => setV({ ...v, ownerEmail: e.target.value })} /></div>
        </div>

        <label className="flex items-center gap-2 mb-3" style={{ fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
          <input type="checkbox" checked={addInsurance} onChange={e => setAddInsurance(e.target.checked)} />
          Record their (third-party) insurance now
        </label>
        {addInsurance && <InsuranceFields value={ins} onChange={setIns} />}

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} style={S.ghost}>Cancel</button>
          <button onClick={save} disabled={saving} style={S.btn}>{saving ? "Saving…" : "Confirm Sale"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Add Insurance Renewal modal
// ═══════════════════════════════════════════════════════════════
// Doubles as both "Add Insurance" and "Edit Insurance" — pass `existing` to
// edit (PATCHes /cars/insurance/:id, an endpoint that already existed on the
// backend but had no UI wired to it) or omit it to add a new policy.
function InsuranceModal({ vehicle, existing, onClose, onSaved }: { vehicle: Vehicle; existing?: Insurance; onClose: () => void; onSaved: () => void }) {
  const [ins, setIns] = useState<InsuranceFormState>({
    provider: existing?.provider ?? "", policyNumber: existing?.policyNumber ?? "",
    type: existing?.type ?? "THIRD_PARTY",
    startDate: existing?.startDate ? existing.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    endDate: existing?.endDate ? existing.endDate.slice(0, 10) : "",
    premium: existing?.premium?.toString() ?? "",
    odAmount: existing?.odAmount?.toString() ?? "", sharing: existing?.sharing ?? "",
    source: existing?.source ?? "", renewedBy: existing?.renewedBy ?? "",
    nextFollowUpDate: existing?.nextFollowUpDate ? existing.nextFollowUpDate.slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!ins.provider.trim() || !ins.endDate) { setErr("Provider and end date are required"); return; }
    setSaving(true); setErr("");
    try {
      const payload = { ...ins, premium: ins.premium ? Number(ins.premium) : undefined, odAmount: ins.odAmount ? Number(ins.odAmount) : undefined };
      if (existing) await api.patch(`/cars/insurance/${existing.id}`, payload);
      else await api.post(`/cars/vehicles/${vehicle.id}/insurance`, payload);
      onSaved(); onClose();
    } catch (e) { setErr(getApiError(e)); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="rounded-2xl p-5 w-full max-w-md mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{existing ? "Edit" : "Add"} Insurance — {vehicle.make} {vehicle.model}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {err && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>{err}</div>}
        <InsuranceFields value={ins} onChange={setIns} />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} style={S.ghost}>Cancel</button>
          <button onClick={save} disabled={saving} style={S.btn}>{saving ? "Saving…" : existing ? "Save Changes" : "Save Policy"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Add Vehicle (acquisition — independent of any buyer lead)
// ═══════════════════════════════════════════════════════════════
// Doubles as Add Vehicle and Edit Vehicle — pass `vehicle` to edit (PATCHes
// /cars/vehicles/:id, leaving status untouched) or omit it to acquire a new
// one (POSTs, always starting IN_STOCK).
function AddVehicleModal({ employees, lead, vehicle, onClose, onSaved }: { employees: Employee[]; lead?: CarLead | null; vehicle?: Vehicle | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({
    make: vehicle?.make ?? lead?.interestedMake ?? "", model: vehicle?.model ?? lead?.interestedModel ?? "",
    variant: vehicle?.variant ?? "", year: vehicle?.year?.toString() ?? "",
    registrationNo: vehicle?.registrationNo ?? "", chassisNo: vehicle?.chassisNo ?? "", engineNo: vehicle?.engineNo ?? "",
    color: vehicle?.color ?? "", odometer: vehicle?.odometer?.toString() ?? "",
    fuelType: vehicle?.fuelType ?? "", transmission: vehicle?.transmission ?? "",
    purchasePrice: vehicle?.purchasePrice?.toString() ?? (lead?.budgetMin ? String(lead.budgetMin) : ""),
    sellerName: vehicle?.sellerName ?? lead?.name ?? "", sellerPhone: vehicle?.sellerPhone ?? lead?.phone ?? "", sellerEmail: vehicle?.sellerEmail ?? lead?.email ?? "",
    purchasedAt: vehicle?.purchasedAt ? vehicle.purchasedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    assignedToId: vehicle?.assignedToId ?? "", notes: vehicle?.notes ?? "",
    // Post-sale handoff checklist ("becomes a customer" — buyer flow only)
    docSentToRto: vehicle?.docSentToRto ?? false, docSentToRtoAt: vehicle?.docSentToRtoAt?.slice(0, 10) ?? "",
    docDelayChecklistNote: vehicle?.docDelayChecklistNote ?? "",
    addedToInsuranceGateway: vehicle?.addedToInsuranceGateway ?? false, addedToInsuranceGatewayAt: vehicle?.addedToInsuranceGatewayAt?.slice(0, 10) ?? "",
  });
  const isBuyerSale = vehicle?.status === "SOLD" && vehicle?.sourceLead?.leadType === "BUYER";
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    // Make/Model are deliberately not required here — a vehicle can be
    // logged before those details are known and filled in later via Edit.
    setSaving(true); setErr("");
    try {
      const payload: Record<string, unknown> = {
        ...v,
        year: v.year ? Number(v.year) : undefined,
        odometer: v.odometer ? Number(v.odometer) : undefined,
        purchasePrice: v.purchasePrice ? Number(v.purchasePrice) : undefined,
        assignedToId: v.assignedToId || undefined,
      };
      let vehicleId = vehicle?.id;
      if (vehicle) {
        // No `status` here on purpose — editing colour/odometer/etc. on a
        // SOLD vehicle must never silently revert it back to IN_STOCK.
        await api.patch(`/cars/vehicles/${vehicle.id}`, payload);
      } else {
        const res = await api.post("/cars/vehicles", { ...payload, status: "IN_STOCK" });
        vehicleId = res.data.data.id;
      }
      if (lead && vehicleId) {
        // carLeadSchema's zod .default()s re-apply for any field omitted from
        // a PATCH body (partial() only skips re-wrapping fields that already
        // report as optional, which a defaulted field does) — so leadType and
        // source must be sent explicitly here or they'd silently reset to
        // BUYER/OTHER, same convention LeadModal's save() already follows.
        await api.patch(`/cars/leads/${lead.id}`, { status: "CONVERTED", convertedVehicleId: vehicleId, leadType: lead.leadType, source: lead.source });
      }
      onSaved(); onClose();
    } catch (e) { setErr(getApiError(e)); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="rounded-2xl p-5 w-full max-w-xl mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{vehicle ? `Edit Vehicle — ${vehicle.make} ${vehicle.model}` : lead ? `Buy Car — from ${lead.name}` : "Add Vehicle — Bought a Car"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {err && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>{err}</div>}

        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Vehicle Details</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <MakeModelVariantFields make={v.make} model={v.model} variant={v.variant} required={false}
            onChange={next => setV({ ...v, ...next })} />
          <div><label style={S.label}>Year</label><YearSelect value={v.year} onChange={year => setV({ ...v, year })} /></div>
          <div><label style={S.label}>Registration No.</label><input style={{ ...S.inp, width: "100%" }} value={v.registrationNo} onChange={e => setV({ ...v, registrationNo: e.target.value })} /></div>
          <div><label style={S.label}>Chassis No.</label><input style={{ ...S.inp, width: "100%" }} value={v.chassisNo} onChange={e => setV({ ...v, chassisNo: e.target.value })} /></div>
          <div><label style={S.label}>Engine No.</label><input style={{ ...S.inp, width: "100%" }} value={v.engineNo} onChange={e => setV({ ...v, engineNo: e.target.value })} /></div>
          <div><label style={S.label}>Color</label><input style={{ ...S.inp, width: "100%" }} value={v.color} onChange={e => setV({ ...v, color: e.target.value })} /></div>
          <div><label style={S.label}>Odometer (km)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={v.odometer} onChange={e => setV({ ...v, odometer: e.target.value })} /></div>
          <div><label style={S.label}>Fuel Type</label><MultiCatalogSelect value={v.fuelType} options={FUEL_TYPES} placeholder="Select fuel type(s)…" onChange={fuelType => setV({ ...v, fuelType })} /></div>
          <div><label style={S.label}>Transmission</label><MultiCatalogSelect value={v.transmission} options={TRANSMISSION_TYPES} placeholder="Select transmission(s)…" onChange={transmission => setV({ ...v, transmission })} /></div>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Purchase (who you bought it from)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div><label style={S.label}>Purchase Price (₹)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={v.purchasePrice} onChange={e => setV({ ...v, purchasePrice: e.target.value })} /></div>
          <div><label style={S.label}>Purchase Date</label><input type="date" style={{ ...S.inp, width: "100%" }} value={v.purchasedAt} onChange={e => setV({ ...v, purchasedAt: e.target.value })} /></div>
          <div>
            <label style={S.label}>Handled By</label>
            <select style={{ ...S.inp, width: "100%" }} value={v.assignedToId} onChange={e => setV({ ...v, assignedToId: e.target.value })}>
              <option value="">Unassigned</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Customer Name</label><input style={{ ...S.inp, width: "100%" }} value={v.sellerName} onChange={e => setV({ ...v, sellerName: e.target.value })} /></div>
          <div><label style={S.label}>Customer Phone</label><input style={{ ...S.inp, width: "100%" }} value={v.sellerPhone} onChange={e => setV({ ...v, sellerPhone: e.target.value })} /></div>
          <div><label style={S.label}>Customer Email</label><input style={{ ...S.inp, width: "100%" }} value={v.sellerEmail} onChange={e => setV({ ...v, sellerEmail: e.target.value })} /></div>
        </div>

        <label style={S.label}>Notes</label>
        <textarea style={{ ...S.inp, width: "100%", minHeight: 60, resize: "vertical" } as React.CSSProperties} value={v.notes} onChange={e => setV({ ...v, notes: e.target.value })} />

        {isBuyerSale && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "16px 0 8px" }}>Handoff Checklist — Becomes a Customer</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 flex items-center gap-2">
                <label className="flex items-center gap-2" style={{ fontSize: 12, color: "#4ade80", cursor: "pointer" }}>
                  <input type="checkbox" checked={v.docSentToRto} onChange={e => setV({ ...v, docSentToRto: e.target.checked, docSentToRtoAt: e.target.checked && !v.docSentToRtoAt ? new Date().toISOString().slice(0, 10) : v.docSentToRtoAt })} />
                  Doc Sent to RTO
                </label>
                {v.docSentToRto && <input type="date" style={{ ...S.inp, width: 160 }} value={v.docSentToRtoAt} onChange={e => setV({ ...v, docSentToRtoAt: e.target.value })} />}
              </div>
              <div className="sm:col-span-2">
                <label style={S.label}>Doc Delay Checklist</label>
                <textarea style={{ ...S.inp, width: "100%", minHeight: 50, resize: "vertical" } as React.CSSProperties} placeholder="e.g. Waiting on NOC from financier" value={v.docDelayChecklistNote} onChange={e => setV({ ...v, docDelayChecklistNote: e.target.value })} />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <label className="flex items-center gap-2" style={{ fontSize: 12, color: "#4ade80", cursor: "pointer" }}>
                  <input type="checkbox" checked={v.addedToInsuranceGateway} onChange={e => setV({ ...v, addedToInsuranceGateway: e.target.checked, addedToInsuranceGatewayAt: e.target.checked && !v.addedToInsuranceGatewayAt ? new Date().toISOString().slice(0, 10) : v.addedToInsuranceGatewayAt })} />
                  Added to Insurance Gateway
                </label>
                {v.addedToInsuranceGateway && <input type="date" style={{ ...S.inp, width: 160 }} value={v.addedToInsuranceGatewayAt} onChange={e => setV({ ...v, addedToInsuranceGatewayAt: e.target.value })} />}
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} style={S.ghost}>Cancel</button>
          <button onClick={save} disabled={saving} style={S.btn}>{saving ? "Saving…" : vehicle ? "Save Changes" : "Add to Inventory"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Read-only vehicle detail view — core fields plus every column a bulk
// import found that didn't map onto one of them (registration/insurance/
// loan details, etc.), shown individually via CustomFieldRenderer instead
// of being buried in the vehicle's notes field.
// ═══════════════════════════════════════════════════════════════
function VehicleDetailModal({ vehicle, onClose, onEdit, onEditInsurance }: { vehicle: Vehicle; onClose: () => void; onEdit?: () => void; onEditInsurance?: () => void }) {
  const row = (label: string, value?: string | number | null) => value === undefined || value === null || value === "" ? null : (
    <div>
      <label style={S.label}>{label}</label>
      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl p-5 w-full max-w-lg mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{vehicle.make} {vehicle.model} {vehicle.variant ? `(${vehicle.variant})` : ""}</h3>
          <div className="flex items-center gap-2">
            {onEdit && <button onClick={onEdit} style={{ ...S.ghost, fontSize: 11, padding: "5px 10px" }}><Pencil size={11} /> Edit</button>}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
          </div>
        </div>
        {(() => { const origin = leadOriginBadge(vehicle); return origin ? (
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: origin.bg, color: origin.color, fontWeight: 700 }}>{origin.text}</span>
          </div>
        ) : <div style={{ marginBottom: 12 }} />; })()}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {row("Registration No.", vehicle.registrationNo)}
          {row("Chassis No.", vehicle.chassisNo)}
          {row("Engine No.", vehicle.engineNo)}
          {row("Fuel Type", vehicle.fuelType)}
          {row("Transmission", vehicle.transmission)}
          {row("Colour", vehicle.color)}
          {row("Odometer", vehicle.odometer)}
          {row("Registration Date", vehicle.registrationDate ? new Date(vehicle.registrationDate).toLocaleDateString("en-IN") : undefined)}
          {row("Status", VEHICLE_STATUS[vehicle.status]?.label || vehicle.status)}
          {row("Customer Name (Sold To)", vehicle.ownerName)}
          {row("Customer Phone (Sold To)", vehicle.ownerPhone)}
          {row("Customer Address (Sold To)", vehicle.ownerAddress)}
          {row("Customer Name (Bought From)", vehicle.sellerName)}
          {row("Customer Phone (Bought From)", vehicle.sellerPhone)}
        </div>
        {onEditInsurance && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Insurance</div>
              <button onClick={onEditInsurance} style={{ ...S.ghost, fontSize: 11, padding: "4px 9px" }}>
                <Pencil size={11} /> {vehicle.insurances?.[0] ? "Renew / Edit" : "Add Insurance"}
              </button>
            </div>
            {vehicle.insurances?.[0] ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {row("Provider", vehicle.insurances[0].provider)}
                {row("Type", vehicle.insurances[0].type)}
                {row("Valid Till", new Date(vehicle.insurances[0].endDate).toLocaleDateString("en-IN"))}
                {row("Premium", vehicle.insurances[0].premium)}
                {row("IDV", vehicle.insurances[0].idv)}
                {row("OD Amount", vehicle.insurances[0].odAmount)}
                {row("NCB", vehicle.insurances[0].ncb)}
                {row("Payment Mode", vehicle.insurances[0].paymentMode)}
                {row("Sharing", vehicle.insurances[0].sharing)}
                {row("Source", vehicle.insurances[0].source)}
                {row("Renewed By", vehicle.insurances[0].renewedBy)}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--text-ghost)" }}>No insurance on file yet.</div>
            )}
          </div>
        )}
        {vehicle.notes && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <label style={S.label}>Notes</label>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{vehicle.notes}</div>
          </div>
        )}
        <CustomFieldRenderer entity="VEHICLE" entityId={vehicle.id} readOnly />
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Documents</div>
          <DocumentsPanel entityType="VEHICLE" entityId={vehicle.id} compact />
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} style={S.ghost}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Mark an in-stock vehicle as Sold (independent of the lead-convert flow)
// ═══════════════════════════════════════════════════════════════
function MarkSoldModal({ vehicle, onClose, onSold }: { vehicle: Vehicle; onClose: () => void; onSold: () => void }) {
  const [form, setForm] = useState({
    ownerName: "", ownerPhone: "", ownerEmail: "", salePrice: "", soldAt: new Date().toISOString().slice(0, 10), warrantyMonths: "",
  });
  const [addInsurance, setAddInsurance] = useState(true);
  const [ins, setIns] = useState<InsuranceFormState>({ provider: "", policyNumber: "", type: "THIRD_PARTY", startDate: new Date().toISOString().slice(0, 10), endDate: "", premium: "", odAmount: "", sharing: "", source: "", renewedBy: "", nextFollowUpDate: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!form.ownerName.trim()) { setErr("Customer name is required"); return; }
    if (addInsurance && (!ins.provider.trim() || !ins.endDate)) { setErr("Insurance provider and end date are required (or uncheck 'add insurance now')"); return; }
    setSaving(true); setErr("");
    try {
      await api.patch(`/cars/vehicles/${vehicle.id}`, {
        status: "SOLD",
        ownerName: form.ownerName, ownerPhone: form.ownerPhone, ownerEmail: form.ownerEmail || undefined,
        salePrice: form.salePrice ? Number(form.salePrice) : undefined,
        soldAt: form.soldAt,
        warrantyMonths: form.warrantyMonths ? Number(form.warrantyMonths) : undefined,
      });
      if (addInsurance) {
        await api.post(`/cars/vehicles/${vehicle.id}/insurance`, { ...ins, premium: ins.premium ? Number(ins.premium) : undefined, odAmount: ins.odAmount ? Number(ins.odAmount) : undefined });
      }
      onSold(); onClose();
    } catch (e) { setErr(getApiError(e)); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl p-5 w-full max-w-lg mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Mark as Sold — {vehicle.make} {vehicle.model}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {err && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>{err}</div>}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="col-span-2"><label style={S.label}>Customer Name *</label><input style={{ ...S.inp, width: "100%" }} value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} /></div>
          <div><label style={S.label}>Customer Phone</label><input style={{ ...S.inp, width: "100%" }} value={form.ownerPhone} onChange={e => setForm({ ...form, ownerPhone: e.target.value })} /></div>
          <div><label style={S.label}>Customer Email</label><input style={{ ...S.inp, width: "100%" }} value={form.ownerEmail} onChange={e => setForm({ ...form, ownerEmail: e.target.value })} /></div>
          <div><label style={S.label}>Sale Price (₹)</label><input type="number" style={{ ...S.inp, width: "100%" }} value={form.salePrice} onChange={e => setForm({ ...form, salePrice: e.target.value })} /></div>
          <div><label style={S.label}>Sale Date</label><input type="date" style={{ ...S.inp, width: "100%" }} value={form.soldAt} onChange={e => setForm({ ...form, soldAt: e.target.value })} /></div>
          <div><label style={S.label}>Warranty (months)</label><input type="number" style={{ ...S.inp, width: "100%" }} placeholder="e.g. 6" value={form.warrantyMonths} onChange={e => setForm({ ...form, warrantyMonths: e.target.value })} /></div>
        </div>

        <label className="flex items-center gap-2 mb-3" style={{ fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
          <input type="checkbox" checked={addInsurance} onChange={e => setAddInsurance(e.target.checked)} />
          Record their (third-party) insurance now
        </label>
        {addInsurance && <InsuranceFields value={ins} onChange={setIns} />}

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} style={S.ghost}>Cancel</button>
          <button onClick={save} disabled={saving} style={S.btn}>{saving ? "Saving…" : "Confirm Sale"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Historical Stats import — paste a whole tracking-sheet table at once,
// matching the client's own column order exactly. Pre-software monthly
// totals, kept separate from real leads.
// ═══════════════════════════════════════════════════════════════
const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function parseMonthLabel(label: string): string | null {
  const m = label.trim().toLowerCase().match(/^([a-z]{3,})\s*-?\s*(\d{2,4})$/);
  if (!m) return null;
  const monthNum = MONTH_NAMES[m[1].slice(0, 3)];
  if (!monthNum) return null;
  let year = parseInt(m[2], 10);
  if (year < 100) year += 2000;
  return `${year}-${String(monthNum).padStart(2, "0")}`;
}

interface ParsedHistRow {
  raw: string; month: string | null;
  bySource: Record<string, number>; salesBySource: Record<string, number>;
  hot: number; warm: number; cold: number; notInterested: number;
  testDrivesDone: number; totalEnquiries: number; lost: number;
}

function parseHistoricalTsv(text: string): ParsedHistRow[] {
  const lines = text.split("\n").map(l => l.replace(/\r$/, "")).filter(l => l.trim());
  const rows: ParsedHistRow[] = [];
  for (const line of lines) {
    const cols = line.split("\t").map(c => c.trim());
    if (cols.length < 2) continue;
    const month = parseMonthLabel(cols[0]);
    const n = (i: number) => { const v = parseFloat(cols[i]); return isNaN(v) ? 0 : v; };
    // Some rows only repeat column headers as data (a pasted sub-header, no real numbers) — skip those.
    const isAllNumericOrBlank = cols.slice(1).every(c => c === "" || !isNaN(parseFloat(c)));
    // A row whose data cells aren't numeric is a pasted sub-header, not real
    // data (e.g. "March-25  Insta  Rajesh  Dhruv...") — treat as unparseable
    // (month: null) so it's excluded from import, not saved as an empty month.
    if (!month || !isAllNumericOrBlank) { rows.push({ raw: line, month: isAllNumericOrBlank ? month : null, bySource: {}, salesBySource: {}, hot: 0, warm: 0, cold: 0, notInterested: 0, testDrivesDone: 0, totalEnquiries: 0, lost: 0 }); continue; }
    const bySource = { INSTAGRAM: n(1), RS: n(2), DS: n(3), CTE: n(4), META_ADS: n(5), SEO: n(6), REFERRAL: n(7) };
    // Fall back to summing the source columns when the sheet's own "Total
    // Enquiries" cell is blank — better than silently showing 0.
    const ttlEnq = n(16) || Object.values(bySource).reduce((s, v) => s + v, 0);
    rows.push({
      raw: line, month,
      bySource,
      hot: n(8) + n(13), warm: n(9) + n(14), cold: n(10) + n(15),
      notInterested: n(11), testDrivesDone: n(12), totalEnquiries: ttlEnq,
      salesBySource: { INSTAGRAM: n(17), RS: n(18), DS: n(19), CTE: n(20), META_ADS: n(21), SEO: n(22), REFERRAL: n(23) },
      lost: n(24),
    });
  }
  return rows;
}

function rowHasData(r: ParsedHistRow): boolean {
  return r.totalEnquiries > 0 || r.hot > 0 || r.warm > 0 || r.cold > 0 || r.notInterested > 0
    || r.testDrivesDone > 0 || r.lost > 0
    || Object.values(r.bySource).some(v => v > 0) || Object.values(r.salesBySource).some(v => v > 0);
}

function HistoricalStatsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedHistRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [err, setErr] = useState("");

  function preview() {
    const rows = parseHistoricalTsv(text);
    if (rows.length === 0) { setErr("Couldn't find any rows — paste including the header row is fine, it'll be skipped if unparseable."); return; }
    setErr("");
    setParsed(rows);
  }

  async function doImport() {
    if (!parsed) return;
    const valid = parsed.filter(r => r.month && rowHasData(r));
    if (valid.length === 0) { setErr("No rows had both a parseable month and non-zero data — nothing to import."); return; }
    setImporting(true);
    try {
      const r = await api.post("/cars/historical-stats/bulk-import", { rows: valid });
      setResult(r.data.data);
      if (r.data.data.created > 0) onImported();
    } catch (e) { setErr(getApiError(e)); }
    setImporting(false);
  }

  const sample = `MONTH\tInsta\tRS\tDS\tCTE\tMETA\tSEO\tREF\tH\tW\tC\tNOT INT\tTD DONE\tHOT\tWARM\tCOLD\tTTL/ENQ\tINSTA\tRS\tDS\tCTE\tMETA\tSEO\tREF\tLOST\t%-SALES\nMay-25\t146\t4\t0\t207`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl p-5 w-full max-w-3xl mx-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Import Historical Monthly Data</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {err && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>{err}</div>}

        {result ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl p-4 text-center" style={{ background: "#064e3b", border: "1px solid #065f46" }}>
                <div className="text-3xl font-bold" style={{ color: "#4ade80" }}>{result.created}</div>
                <div className="text-xs" style={{ color: "#6ee7b7" }}>Months Saved</div>
              </div>
              <div className="flex-1 rounded-xl p-4 text-center" style={{ background: "#1e1b4b", border: "1px solid #312e81" }}>
                <div className="text-3xl font-bold" style={{ color: "#818cf8" }}>{result.skipped}</div>
                <div className="text-xs" style={{ color: "#a5b4fc" }}>Skipped</div>
              </div>
            </div>
            {result.errors.length > 0 && <p className="text-xs text-red-400">{result.errors.join(" · ")}</p>}
            <button onClick={onClose} style={{ ...S.btn, width: "100%", justifyContent: "center" }}>Done</button>
          </div>
        ) : parsed ? (
          <div className="space-y-3">
            <p style={{ fontSize: 11, color: "var(--text-ghost)" }}>
              Review before importing — check each month parsed correctly. "H/W/C" and "HOT/WARM/COLD" columns were added together (assumed to be duplicate sections from the sheet). Rows with no month or that look like a repeated header row are skipped.
            </p>
            <div className="table-wrap" style={{ maxHeight: 300, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    {["Month", "Total Enq.", "Hot", "Warm", "Cold", "Not Int.", "Lost", "TD Done", "Sales (sum)"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-ghost)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((r, i) => {
                    const willImport = !!r.month && rowHasData(r);
                    return (
                    <tr key={i} style={{ opacity: willImport ? 1 : 0.4 }}>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--bg-hover)", color: r.month ? "var(--text-primary)" : "#f87171", fontWeight: 600 }}>
                        {r.month || `unparsed: "${r.raw.split("\t")[0]}"`}
                        {r.month && !rowHasData(r) && <span style={{ marginLeft: 6, fontSize: 9, color: "var(--text-ghost)", fontWeight: 400 }}>(empty — skipped)</span>}
                      </td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--bg-hover)" }}>{r.totalEnquiries}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--bg-hover)" }}>{r.hot}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--bg-hover)" }}>{r.warm}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--bg-hover)" }}>{r.cold}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--bg-hover)" }}>{r.notInterested}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--bg-hover)" }}>{r.lost}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--bg-hover)" }}>{r.testDrivesDone}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--bg-hover)" }}>{Object.values(r.salesBySource).reduce((s, n) => s + n, 0)}</td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setParsed(null)} style={S.ghost}>Back</button>
              <button onClick={doImport} disabled={importing} style={S.btn}>{importing ? "Saving…" : `Import ${parsed.filter(r => r.month && rowHasData(r)).length} Months`}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px]" style={{ color: "var(--text-ghost)" }}>
              Paste your tracking sheet rows (tab-separated, straight from Excel/Sheets). Column order must match: MONTH, Insta, RS, DS, CTE, META, SEO, REF, H, W, C, NOT INT, TD DONE, HOT, WARM, COLD, TTL/ENQ, then the same 7 sources again for sales, LOST, %-SALES.
            </p>
            <div className="rounded-lg p-3 font-mono text-[10px]" style={{ background: "#0f172a", color: "#4ade80", overflowX: "auto", whiteSpace: "pre" }}>{sample}</div>
            <textarea style={{ ...S.inp, width: "100%", resize: "vertical", minHeight: 180, fontFamily: "monospace", fontSize: 11 } as React.CSSProperties} value={text} onChange={e => setText(e.target.value)} placeholder="Paste rows here…" />
            <div className="flex justify-end gap-3">
              <button onClick={onClose} style={S.ghost}>Cancel</button>
              <button onClick={preview} disabled={!text.trim()} style={S.btn}>Preview</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════
type CarsTab = "leads" | "sellerleads" | "vehicles" | "warranty" | "followups" | "reports";

export default function CarsPage() {
  // Buyer Leads / Seller Leads / Vehicles & Insurance are independently
  // grantable Cars sections (see requireModuleAccess.ts on the backend) —
  // a user with only CARS.BUYER should only ever see the Buyer Leads tab,
  // not the other two. Holding the broad legacy "CARS" key (or being
  // OWNER/ADMIN) still unlocks every section, unchanged from before.
  const { moduleAccess, activeOrg } = useAuthStore();
  const isOrgAdmin = activeOrg?.role === "OWNER" || activeOrg?.role === "ADMIN";
  const canSeeBuyer = isOrgAdmin || moduleAccess.includes("CARS") || moduleAccess.includes("CARS.BUYER");
  const canSeeSeller = isOrgAdmin || moduleAccess.includes("CARS") || moduleAccess.includes("CARS.SELLER");
  const canSeeInsurance = isOrgAdmin || moduleAccess.includes("CARS") || moduleAccess.includes("CARS.VEHICLES_INSURANCE");
  const VISIBLE_TABS: CarsTab[] = [
    ...(canSeeBuyer ? (["leads"] as const) : []),
    ...(canSeeSeller ? (["sellerleads"] as const) : []),
    ...(canSeeInsurance ? (["vehicles", "warranty"] as const) : []),
    // Follow-ups and Monthly Report are cross-section views — the backend
    // already scopes what each shows down to the sections this user has
    // (listCarLeads/listInsuranceFollowUps), so both stay visible to anyone
    // with at least one Cars section rather than being tied to just one.
    ...((canSeeBuyer || canSeeSeller || canSeeInsurance) ? (["followups", "reports"] as const) : []),
  ];

  const [tab, setTabRaw] = useState<CarsTab>("leads");
  const setTab = (t: CarsTab) => { if (VISIBLE_TABS.includes(t)) setTabRaw(t); };
  // If access changes (or the remembered/default tab isn't one this user
  // can see), land on the first tab they're actually allowed to view.
  useEffect(() => {
    if (!VISIBLE_TABS.includes(tab) && VISIBLE_TABS.length > 0) setTabRaw(VISIBLE_TABS[0]);
  }, [canSeeBuyer, canSeeSeller, canSeeInsurance]); // eslint-disable-line react-hooks/exhaustive-deps
  const [monthlyReport, setMonthlyReport] = useState<any[]>([]);
  const [leads, setLeads] = useState<CarLead[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expiringVehiclesData, setExpiringVehiclesData] = useState<Vehicle[]>([]);
  // Real org-wide totals from the API, not `expiringVehiclesData.length` —
  // that array is capped at 200 rows server-side (an org can have thousands
  // of matches), so the tab labels would silently undercount without these.
  const [insuranceTotals, setInsuranceTotals] = useState({ total: 0, overdueTotal: 0, upcomingTotal: 0, truncated: false });
  const [insuranceDueSubTab, setInsuranceDueSubTab] = useState<"overdue" | "upcoming">("overdue");
  // Manually-set "next follow-up" reminders on a policy (e.g. "call about the
  // renewal quote") — independent of insuranceTotals above, which is about
  // the policy's own endDate/expiry, not a reminder someone set.
  const [insuranceFollowUps, setInsuranceFollowUps] = useState<Insurance[]>([]);
  const [followUps, setFollowUps] = useState<CarLead[]>([]);
  // Vehicles & Insurance's own policy-level follow-up reminders, pulled into
  // this tab too (followUp=all — every date, not just due/overdue) so the
  // Follow-ups tab is a true "all three sections" worklist.
  const [followUpInsurance, setFollowUpInsurance] = useState<Insurance[]>([]);
  const [followUpSection, setFollowUpSection] = useState<"ALL" | "BUYER" | "SELLER" | "VEHICLE_INSURANCE">("ALL");
  const [followUpDateFrom, setFollowUpDateFrom] = useState("");
  const [followUpDateTo, setFollowUpDateTo] = useState("");
  const [warrantyVehicles, setWarrantyVehicles] = useState<Vehicle[]>([]);
  const [warrantyTotals, setWarrantyTotals] = useState({ total: 0, truncated: false });
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [leadStageFilter, setLeadStageFilter] = useState("");
  const [notContactedFilter, setNotContactedFilter] = useState(false);
  const [contactedFilter, setContactedFilter] = useState(false);
  // "" = backend's default recency window (currently 60 days), "all" = every
  // historical buyer lead, or an explicit yyyy-mm-dd — lets "Not Contacted"
  // be narrowed/widened instead of always meaning "the org's entire history."
  const [notContactedSince, setNotContactedSince] = useState("");
  const LEADS_PAGE_SIZE = 50;
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [insuranceFrom, setInsuranceFrom] = useState("");
  const [insuranceTo, setInsuranceTo] = useState("");
  const [loading, setLoading] = useState(false);

  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editLead, setEditLead] = useState<CarLead | null>(null);
  const [convertLead, setConvertLead] = useState<CarLead | null>(null);
  const [exchangeSeed, setExchangeSeed] = useState<{ name: string; phone: string; interestedMake: string; interestedModel: string } | null>(null);
  const [acquireLead, setAcquireLead] = useState<CarLead | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [insuranceFor, setInsuranceFor] = useState<Vehicle | null>(null);
  const [editInsuranceRecord, setEditInsuranceRecord] = useState<Insurance | null>(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showVehicleImport, setShowVehicleImport] = useState(false);
  const [showHistoricalImport, setShowHistoricalImport] = useState(false);
  const [markSoldFor, setMarkSoldFor] = useState<Vehicle | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [vehicleMenuOpenId, setVehicleMenuOpenId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const employeeName = (id?: string) => employees.find(e => e.id === id)?.name;

  useEffect(() => {
    if (!vehicleMenuOpenId) return;
    const close = () => setVehicleMenuOpenId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [vehicleMenuOpenId]);

  useEffect(() => {
    api.get("/organizations/current/directory").then(r => setEmployees(r.data.data ?? [])).catch(() => {});
  }, []);

  // Deep link from the dashboard's "Today's Follow-ups" panel: ?open=<leadId>
  // opens that lead directly instead of making them hunt for it.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    setTab("leads");
    api.get(`/cars/leads/${openId}`).then(r => { setEditLead(r.data.data); setShowLeadModal(true); }).catch(() => {});
    const next = new URLSearchParams(searchParams);
    next.delete("open");
    setSearchParams(next, { replace: true });
  }, [searchParams]);

  // Deep link from the dashboard's "Today's Follow-ups" panel for an
  // insurance policy's reminder: ?insuranceDue=1 lands straight on the
  // Vehicles & Insurance tab, where the "Insurance Follow-ups Due" banner
  // at the top lists it (no specific-policy id needed — that banner already
  // shows every due one).
  useEffect(() => {
    if (!searchParams.get("insuranceDue")) return;
    setTab("vehicles");
    const next = new URLSearchParams(searchParams);
    next.delete("insuranceDue");
    setSearchParams(next, { replace: true });
  }, [searchParams]);

  const [salesPeriod, setSalesPeriod] = useState<"this_month" | "last_month" | "this_year" | "all">("this_month");
  const [salesReport, setSalesReport] = useState<{ count: number; totalRevenue: number } | null>(null);

  // When a filter/search/tab changes, the fetch below should land on page 1
  // immediately (not fetch the old page under new filters, then flash to
  // page 1 a moment later) — compare against the previous call's filter
  // signature and override `page` for just this one fetch when it differs.
  const prevLeadsFilterSig = useRef("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statsParams = new URLSearchParams();
      if (notContactedSince) statsParams.set("notContactedSince", notContactedSince);
      const [statsRes] = await Promise.all([api.get(`/cars/stats?${statsParams}`)]);
      setStats(statsRes.data.data);
      if (tab === "leads" || tab === "sellerleads") {
        const filterSig = `${tab}|${search}|${statusFilter}|${leadStageFilter}|${notContactedFilter}|${contactedFilter}|${notContactedSince}`;
        let page = leadsPage;
        if (filterSig !== prevLeadsFilterSig.current) {
          prevLeadsFilterSig.current = filterSig;
          page = 1;
          if (leadsPage !== 1) setLeadsPage(1);
        }
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (contactedFilter) {
          params.set("contacted", "true");
        } else if (notContactedFilter) {
          params.set("notContacted", "true");
          if (notContactedSince) params.set("notContactedSince", notContactedSince);
        } else if (statusFilter) params.set("status", statusFilter);
        if (leadStageFilter) params.set("leadStage", leadStageFilter);
        params.set("leadType", tab === "sellerleads" ? "SELLER" : "BUYER");
        params.set("page", String(page));
        params.set("limit", String(LEADS_PAGE_SIZE));
        const r = await api.get(`/cars/leads?${params}`);
        setLeads(r.data.data.leads ?? []);
        setLeadsTotal(r.data.data.total ?? 0);
      } else if (tab === "vehicles") {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (statusFilter) params.set("status", statusFilter);
        const insParams = new URLSearchParams();
        if (insuranceFrom) insParams.set("from", insuranceFrom);
        if (insuranceTo) insParams.set("to", insuranceTo); else insParams.set("days", "30");
        const [vr, sr, er, fr] = await Promise.all([
          api.get(`/cars/vehicles?${params}`),
          api.get(`/cars/sales-report?period=${salesPeriod}`),
          api.get(`/cars/insurance/expiring?${insParams}`),
          api.get(`/cars/insurance/due-followups`),
        ]);
        setVehicles(vr.data.data.vehicles ?? []);
        setSalesReport(sr.data.data);
        setExpiringVehiclesData(er.data.data.vehicles ?? []);
        setInsuranceTotals({
          total: er.data.data.total ?? 0,
          overdueTotal: er.data.data.overdueTotal ?? 0,
          upcomingTotal: er.data.data.upcomingTotal ?? 0,
          truncated: er.data.data.truncated ?? false,
        });
        setInsuranceFollowUps(fr.data.data.policies ?? []);
      } else if (tab === "followups") {
        const [lr, ir] = await Promise.all([
          api.get("/cars/leads?followUp=all&limit=200"),
          api.get("/cars/insurance/due-followups?followUp=all"),
        ]);
        setFollowUps(lr.data.data.leads ?? []);
        setFollowUpInsurance(ir.data.data.policies ?? []);
      } else if (tab === "warranty") {
        const r = await api.get("/cars/warranties");
        setWarrantyVehicles(r.data.data.vehicles ?? []);
        setWarrantyTotals({ total: r.data.data.total ?? 0, truncated: r.data.data.truncated ?? false });
      } else {
        const r = await api.get("/cars/leads/monthly-report?months=12");
        setMonthlyReport(r.data.data.months ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [tab, search, statusFilter, leadStageFilter, notContactedFilter, contactedFilter, notContactedSince, leadsPage, salesPeriod, insuranceFrom, insuranceTo]);

  useEffect(() => { load(); }, [load]);

  // expiringVehiclesData comes from GET /cars/insurance/expiring — the real
  // org-wide list (independent of whatever search/status filter the main
  // table happens to be showing), split into already-overdue vs still has
  // time (due within the next 30 days but not lapsed yet).
  const overdueVehicles = expiringVehiclesData.filter(v => v.insurances?.[0] && new Date(v.insurances[0].endDate).getTime() < Date.now());
  const upcomingVehicles = expiringVehiclesData.filter(v => v.insurances?.[0] && new Date(v.insurances[0].endDate).getTime() >= Date.now());

  // Follow-ups tab: merges all three sections (Buyer leads, Seller leads,
  // Vehicles & Insurance) into one worklist, each item tagged with where it
  // came from so the section filter below can slice it — same merge pattern
  // as the dashboard's TodaysFollowUps widget, just scoped to this org's
  // Cars module and including future-dated reminders too (not just due).
  const allFollowUps: FollowUpItem[] = [
    ...followUps.map(l => ({ kind: "lead" as const, id: l.id, section: (l.leadType === "SELLER" ? "SELLER" : "BUYER") as const, nextFollowUpDate: l.nextFollowUpDate, lead: l })),
    ...followUpInsurance.map(p => ({ kind: "insurance" as const, id: p.id, section: "VEHICLE_INSURANCE" as const, nextFollowUpDate: p.nextFollowUpDate, policy: p })),
  ];
  const filteredFollowUps = allFollowUps.filter(f => {
    if (followUpSection !== "ALL" && f.section !== followUpSection) return false;
    if (followUpDateFrom && (!f.nextFollowUpDate || f.nextFollowUpDate.slice(0, 10) < followUpDateFrom)) return false;
    if (followUpDateTo && (!f.nextFollowUpDate || f.nextFollowUpDate.slice(0, 10) > followUpDateTo)) return false;
    return true;
  });

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}><Car size={18} /> Car Resale</h1>
          <p className="text-xs" style={{ color: "var(--text-ghost)" }}>Buyer leads · Sold vehicles · Insurance renewals</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "leads" || tab === "sellerleads" ? (
            <>
              <button onClick={() => downloadCsvTemplate(`${tab === "sellerleads" ? "seller" : "buyer"}-leads-template.csv`, tab === "sellerleads" ? SELLER_LEAD_CSV_TEMPLATE : BUYER_LEAD_CSV_TEMPLATE)} style={S.ghost} title="Download the exact CSV format Import expects">
                <Download style={{ width: 13, height: 13 }} /> Export Format
              </button>
              <button onClick={() => setShowImport(true)} style={S.ghost}><Upload style={{ width: 13, height: 13 }} /> Import CSV</button>
              <button onClick={() => { setEditLead(null); setShowLeadModal(true); }} style={S.btn}><Plus style={{ width: 13, height: 13 }} /> Add {tab === "sellerleads" ? "Seller " : ""}Lead</button>
            </>
          ) : tab === "vehicles" ? (
            <>
              <button onClick={() => downloadCsvTemplate("vehicles-insurance-template.csv", VEHICLE_CSV_TEMPLATE)} style={S.ghost} title="Download the exact CSV format Import expects">
                <Download style={{ width: 13, height: 13 }} /> Export Format
              </button>
              <button onClick={() => setShowVehicleImport(true)} style={S.ghost}><Upload style={{ width: 13, height: 13 }} /> Import CSV</button>
              <button onClick={() => setShowAddVehicle(true)} style={S.btn}><Plus style={{ width: 13, height: 13 }} /> Add Vehicle</button>
            </>
          ) : tab === "reports" ? (
            <button onClick={() => setShowHistoricalImport(true)} style={S.ghost}><Upload style={{ width: 13, height: 13 }} /> Import Historical Data</button>
          ) : null}
        </div>
      </div>

      {/* Stats — scoped to whichever section tab is active, instead of a
          fixed mix that showed Buyer-lead counts even while looking at
          Vehicles & Insurance (or vehicle counts while on Seller Leads). */}
      {stats && (tab === "leads" || tab === "sellerleads" || tab === "vehicles" || tab === "warranty") && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
          {[
            // Buyer and Seller are separate tabs, so these three reflect
            // whichever one is currently active instead of a combined number
            // that hid how many of each type there actually were.
            ...(tab === "leads" || tab === "sellerleads" ? (() => {
              const cat = tab === "sellerleads" ? stats.seller : stats.buyer;
              const catLabel = tab === "sellerleads" ? "Seller" : "Buyer";
              const catTab = tab === "sellerleads" ? "sellerleads" : "leads";
              const byStatusClick = (s: string) => () => { setTab(catTab); setStatusFilter(s); setNotContactedFilter(false); setContactedFilter(false); setNotContactedSince(""); };
              return [
                { label: `${catLabel} Leads`, value: cat?.total ?? 0, color: "#818cf8", onClick: byStatusClick("") },
                // One tile per status (same set as the Status dropdown, minus
                // CONVERTED which isn't manually chosen) so every bucket —
                // not just Hot/Urgent — is visible at a glance here too.
                ...LEAD_STATUSES.filter(s => s !== "CONVERTED").map(s => ({
                  label: LEAD_STATUS[s].label,
                  value: cat?.byStatus?.find((row: any) => row.status === s)?._count ?? 0,
                  color: LEAD_STATUS[s].color,
                  onClick: byStatusClick(s),
                })),
                // Buyer-only: backed by the "Lead Status" custom field (set
                // when a call is logged), not the HOT/WARM/COLD status enum —
                // shrinks as leads get their first call logged.
                ...(tab !== "sellerleads" ? [{ label: "Not Contacted", value: stats.buyer?.notContacted ?? 0, color: "#facc15", onClick: () => { setTab("leads"); setStatusFilter(""); setContactedFilter(false); setNotContactedFilter(true); } }] : []),
              ];
            })() : []),
            ...(tab === "vehicles" || tab === "warranty" ? [
              { label: "Total Vehicles", value: stats.totalVehicles, color: "#38bdf8", onClick: () => { setTab("vehicles"); setStatusFilter(""); setNotContactedFilter(false); setContactedFilter(false); setNotContactedSince(""); } },
              { label: "In Stock", value: stats.inStock, color: "#818cf8", onClick: () => { setTab("vehicles"); setStatusFilter("IN_STOCK"); setNotContactedFilter(false); setContactedFilter(false); setNotContactedSince(""); } },
              { label: "Sold", value: stats.sold, color: "#4ade80", onClick: () => { setTab("vehicles"); setStatusFilter("SOLD"); setNotContactedFilter(false); setContactedFilter(false); setNotContactedSince(""); } },
              { label: "Insurance Due (30d)", value: stats.expiringSoon, color: stats.expiringSoon > 0 ? "#f87171" : "#4ade80", onClick: () => { setTab("vehicles"); setStatusFilter(""); setNotContactedFilter(false); setContactedFilter(false); setNotContactedSince(""); } },
            ] : []),
          ].map(k => (
            <button key={k.label} onClick={k.onClick} style={{ ...S.card, padding: "12px 14px", textAlign: "left", cursor: "pointer", border: "1px solid var(--border)" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = k.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
              <div className="text-[11px] leading-tight" style={{ color: "var(--text-ghost)" }}>{k.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Tabs — only the sections this user has access to */}
      <div className="flex items-center gap-1 mb-4 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
        {VISIBLE_TABS.map(tKey => (
          <button key={tKey} onClick={() => { setTab(tKey); setStatusFilter(""); setNotContactedFilter(false); setContactedFilter(false); setSearch(""); }}
            style={{ padding: "8px 16px", background: "none", border: "none", borderBottom: tab === tKey ? "2px solid #38bdf8" : "2px solid transparent", color: tab === tKey ? "#38bdf8" : "var(--text-ghost)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            {tKey === "leads" ? "Buyer Leads" : tKey === "sellerleads" ? "Seller Leads" : tKey === "vehicles" ? "Vehicles & Insurance"
              : tKey === "warranty" ? "Warranty" : tKey === "followups" ? "Follow-ups" : "Monthly Report"}
          </button>
        ))}
      </div>

      {/* Search + filter */}
      {(tab === "leads" || tab === "sellerleads" || tab === "vehicles") && (
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative" style={{ maxWidth: 280, flex: 1 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-ghost)" }} />
          <input style={{ ...S.inp, width: "100%", paddingLeft: 30 }} placeholder={tab === "vehicles" ? "Search make, model, reg. no, owner…" : "Search name, phone, model…"} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={S.inp} value={contactedFilter ? "__CONTACTED__" : notContactedFilter ? "__NOT_CONTACTED__" : statusFilter} onChange={e => {
          if (e.target.value === "__CONTACTED__") { setContactedFilter(true); setNotContactedFilter(false); setStatusFilter(""); setNotContactedSince(""); }
          else if (e.target.value === "__NOT_CONTACTED__") { setContactedFilter(false); setNotContactedFilter(true); setStatusFilter(""); }
          else { setContactedFilter(false); setNotContactedFilter(false); setNotContactedSince(""); setStatusFilter(e.target.value); }
        }}>
          <option value="">All statuses</option>
          {tab === "vehicles"
            ? Object.keys(VEHICLE_STATUS).map(s => <option key={s} value={s}>{VEHICLE_STATUS[s].label}</option>)
            : LEAD_STATUSES.map(s => <option key={s} value={s}>{LEAD_STATUS[s].label}</option>)}
          {tab === "leads" && <option value="__NOT_CONTACTED__">Not Contacted</option>}
          {tab === "leads" && <option value="__CONTACTED__">Contacted (Lead Status set)</option>}
        </select>
        {(tab === "leads" || tab === "sellerleads") && (
          <select style={S.inp} value={leadStageFilter} onChange={e => setLeadStageFilter(e.target.value)}>
            <option value="">All stages</option>
            {LEAD_STAGES.map(s => <option key={s} value={s}>{LEAD_STAGE[s].label}</option>)}
          </select>
        )}
        {tab === "leads" && notContactedFilter && (
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>Created since</span>
            <select style={S.inp} value={notContactedSince === "all" ? "all" : (notContactedSince ? "custom" : "")}
              onChange={e => { if (e.target.value === "custom") setNotContactedSince(new Date().toISOString().slice(0, 10)); else setNotContactedSince(e.target.value); }}>
              <option value="">Last 60 days (default)</option>
              <option value="custom">Custom date…</option>
              <option value="all">All time ({stats?.buyer?.total ?? 0})</option>
            </select>
            {notContactedSince && notContactedSince !== "all" && (
              <input type="date" style={S.inp} value={notContactedSince} onChange={e => setNotContactedSince(e.target.value)} />
            )}
          </div>
        )}
        {tab === "vehicles" && (
          <select style={S.inp} value={salesPeriod} onChange={e => setSalesPeriod(e.target.value as any)}>
            <option value="this_month">Sales: This Month</option>
            <option value="last_month">Sales: Last Month</option>
            <option value="this_year">Sales: This Year</option>
            <option value="all">Sales: All Time</option>
          </select>
        )}
      </div>
      )}

      {tab === "vehicles" && salesReport && (
        <div style={{ ...S.card, marginBottom: 16, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
              {{ this_month: "This Month", last_month: "Last Month", this_year: "This Year", all: "All Time" }[salesPeriod]} Sales
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#4ade80" }}>{salesReport.count} vehicle{salesReport.count !== 1 ? "s" : ""}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Revenue</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>₹{salesReport.totalRevenue.toLocaleString("en-IN")}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-ghost)" }}>Loading…</div>
      ) : tab === "leads" || tab === "sellerleads" ? (
        leads.length === 0 ? (
          <div style={{ ...S.card, textAlign: "center", padding: 40, color: "var(--text-ghost)" }}>No {tab === "sellerleads" ? "seller " : ""}leads yet — add one or import a CSV.</div>
        ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {leads.map(l => {
              const st = LEAD_STATUS[l.status] || LEAD_STATUS.NEW;
              const stage = LEAD_STAGE[l.leadStage || "SEARCHING_CAR"] || LEAD_STAGE.SEARCHING_CAR;
              return (
              <div key={l.id} style={{ ...S.card, cursor: "pointer" }} onClick={() => { setEditLead(l); setShowLeadModal(true); }}>
                <div className="flex items-start justify-between" style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{l.name}</div>
                  {l.phone && <span style={{ fontSize: 11, color: "var(--text-ghost)" }} className="flex items-center gap-1"><Phone size={10} /> {l.phone}</span>}
                </div>
                {(l.interestedMake || l.interestedModel) && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                    {[l.interestedMake, l.interestedModel].filter(Boolean).join(" ")}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: st.bg, color: st.color, fontWeight: 700 }}>{st.label}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: stage.bg, color: stage.color, fontWeight: 700 }}>{stage.label}</span>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditLead(l); setShowLeadModal(true); }} style={{ ...S.ghost, flex: 1, justifyContent: "center" }}><Pencil size={11} /> Edit</button>
                  <button onClick={() => { setEditLead(l); setShowLeadModal(true); }} style={{ ...S.btn, flex: 1, justifyContent: "center" }}>Follow Up <ArrowRight size={11} /></button>
                </div>
              </div>
              );
            })}
          </div>
          {leadsTotal > LEADS_PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4" style={{ fontSize: 12, color: "var(--text-ghost)" }}>
              <span>
                Showing {(leadsPage - 1) * LEADS_PAGE_SIZE + 1}–{Math.min(leadsPage * LEADS_PAGE_SIZE, leadsTotal)} of {leadsTotal}
              </span>
              <div className="flex items-center gap-2">
                <button disabled={leadsPage <= 1} onClick={() => setLeadsPage(p => Math.max(1, p - 1))}
                  style={{ ...S.ghost, opacity: leadsPage <= 1 ? 0.4 : 1, cursor: leadsPage <= 1 ? "default" : "pointer" }}>Previous</button>
                <span>Page {leadsPage} of {Math.ceil(leadsTotal / LEADS_PAGE_SIZE)}</span>
                <button disabled={leadsPage * LEADS_PAGE_SIZE >= leadsTotal} onClick={() => setLeadsPage(p => p + 1)}
                  style={{ ...S.ghost, opacity: leadsPage * LEADS_PAGE_SIZE >= leadsTotal ? 0.4 : 1, cursor: leadsPage * LEADS_PAGE_SIZE >= leadsTotal ? "default" : "pointer" }}>Next</button>
              </div>
            </div>
          )}
          </>
        )
      ) : tab === "vehicles" ? (
        <>
          {insuranceFollowUps.length > 0 && (
            <div style={{ ...S.card, borderColor: "rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.06)", marginBottom: 16 }}>
              <div className="flex items-center gap-2 mb-3" style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13 }}>
                <Clock size={15} /> Insurance Follow-ups Due ({insuranceFollowUps.length})
              </div>
              <div className="space-y-2">
                {insuranceFollowUps.map(p => {
                  const due = dueLabel(p.nextFollowUpDate);
                  const v = p.vehicle;
                  const customerName = v?.ownerName || v?.sellerName || "";
                  const customerPhone = v?.ownerPhone || v?.sellerPhone || "";
                  return (
                    <div key={p.id}
                      onClick={() => {
                        if (!v) return;
                        setInsuranceFor({ id: v.id, make: v.make ?? "", model: v.model ?? "", status: "IN_STOCK", insurances: [] } as Vehicle);
                        setEditInsuranceRecord(p);
                      }}
                      className="flex items-center justify-between gap-3 rounded-lg p-3 cursor-pointer"
                      style={{ background: "var(--bg-hover)" }}>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {v ? `${v.make ?? ""} ${v.model ?? ""}`.trim() : "Vehicle"} {v?.registrationNo ? `· ${v.registrationNo}` : ""}
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-ghost)" }}>
                          {customerName || "—"}{customerPhone ? ` · ${customerPhone}` : ""} · {p.provider}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: due.color, flexShrink: 0 }}>{due.text || "Due"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ ...S.card, borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.06)", marginBottom: 16 }}>
            <div className="flex items-center gap-2 mb-3" style={{ color: "#f87171", fontWeight: 700, fontSize: 13 }}>
              <ShieldAlert size={15} /> {insuranceFrom || insuranceTo ? "Insurance Due — Custom Range" : "Insurance Due Within 30 Days"}
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>Expired/due from</span>
              <input type="date" style={S.inp} value={insuranceFrom} onChange={e => setInsuranceFrom(e.target.value)} />
              <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>to</span>
              <input type="date" style={S.inp} value={insuranceTo} onChange={e => setInsuranceTo(e.target.value)} />
              {(insuranceFrom || insuranceTo) && (
                <button onClick={() => { setInsuranceFrom(""); setInsuranceTo(""); }} style={S.ghost}>Reset to 30 days</button>
              )}
            </div>
            {expiringVehiclesData.length > 0 && (
              <>
                <div className="flex gap-1 mb-3">
                  <button onClick={() => setInsuranceDueSubTab("overdue")}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                      background: insuranceDueSubTab === "overdue" ? "#f87171" : "var(--bg-hover)",
                      color: insuranceDueSubTab === "overdue" ? "#1a0505" : "var(--text-sec)" }}>
                    Overdue ({insuranceTotals.overdueTotal})
                  </button>
                  <button onClick={() => setInsuranceDueSubTab("upcoming")}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                      background: insuranceDueSubTab === "upcoming" ? "#fbbf24" : "var(--bg-hover)",
                      color: insuranceDueSubTab === "upcoming" ? "#1a1405" : "var(--text-sec)" }}>
                    Upcoming ({insuranceTotals.upcomingTotal})
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-ghost)", marginBottom: 10 }}>
                  Click any entry to open that vehicle and call the customer about renewing their insurance.
                </p>
                {insuranceTotals.truncated && (
                  <p style={{ fontSize: 11, color: "#fbbf24", marginBottom: 10 }}>
                    Showing the {expiringVehiclesData.length} most urgent of {insuranceTotals.total} matches — narrow the date range above to see the rest.
                  </p>
                )}
              </>
            )}
            {(insuranceDueSubTab === "overdue" ? overdueVehicles : upcomingVehicles).length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-ghost)", padding: "8px 0" }}>
                {insuranceDueSubTab === "overdue" ? "Nothing overdue in this range." : (insuranceTo ? "Nothing coming due in this range." : "Nothing coming due in the next 30 days.")}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(insuranceDueSubTab === "overdue" ? overdueVehicles : upcomingVehicles).map(v => {
                  const badge = insuranceBadge(v.insurances?.[0]);
                  const origin = leadOriginBadge(v);
                  return (
                    <div key={v.id} onClick={() => setDetailVehicle(v)}
                      style={{ background: "var(--bg-hover)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{v.make} {v.model} {v.registrationNo ? `· ${v.registrationNo}` : ""}</span>
                          {origin && (
                            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: origin.bg, color: origin.color, fontWeight: 700 }}>
                              {origin.text}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{v.ownerName}</div>
                      </div>
                      {badge && <span style={{ fontSize: 10, fontWeight: 700, color: badge.color }}>{badge.text}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {vehicles.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: 40, color: "var(--text-ghost)" }}>No vehicles yet — convert a lead into a sale to get started.</div>
          ) : (
            <div className="table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Vehicle", "Registration", "Buyer / Seller", "Status", "Insurance", ""].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(v => {
                    const st = VEHICLE_STATUS[v.status] || VEHICLE_STATUS.IN_STOCK;
                    const badge = insuranceBadge(v.insurances?.[0]);
                    const origin = leadOriginBadge(v);
                    const currentInsurance = v.insurances?.[0];
                    return (
                      <tr key={v.id} onClick={() => setDetailVehicle(v)} style={{ cursor: "pointer" }}>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-primary)", fontWeight: 600, borderBottom: "1px solid var(--bg-hover)" }}>
                          {v.make} {v.model} {v.variant ? <span style={{ color: "var(--text-ghost)", fontWeight: 400 }}>({v.variant})</span> : null}
                          {v.year ? <span style={{ color: "var(--text-ghost)", fontWeight: 400 }}> · {v.year}</span> : null}
                          {origin && (
                            <div style={{ marginTop: 3 }}>
                              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: origin.bg, color: origin.color, fontWeight: 700 }}>{origin.text}</span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-hover)" }}>{v.registrationNo || "—"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-hover)" }}>
                          {v.status === "SOLD" ? (
                            <>
                              <div>{v.ownerName || "—"} <span style={{ fontSize: 10, color: "var(--text-ghost)" }}>(buyer)</span></div>
                              {v.ownerPhone && <div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{v.ownerPhone}</div>}
                            </>
                          ) : v.sellerName ? (
                            <>
                              <div>{v.sellerName} <span style={{ fontSize: 10, color: "var(--text-ghost)" }}>(seller)</span></div>
                              {v.sellerPhone && <div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{v.sellerPhone}</div>}
                            </>
                          ) : "—"}
                          {employeeName(v.assignedToId) && <div style={{ fontSize: 10, color: "var(--text-ghost)" }}>Handled by {employeeName(v.assignedToId)}</div>}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--bg-hover)" }}>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: st.bg, color: st.color, fontWeight: 700 }}>{st.label}</span>
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--bg-hover)" }}>
                          {badge && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, display: "flex", alignItems: "center", gap: 4 }}>
                              {badge.color === "#f87171" ? <AlertTriangle size={11} /> : <CheckCircle size={11} />} {badge.text}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--bg-hover)", whiteSpace: "nowrap", position: "relative" }}
                          onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {v.status !== "SOLD" && (
                              <button onClick={() => setMarkSoldFor(v)} style={{ ...S.btn, fontSize: 11, padding: "5px 10px" }}>Mark Sold</button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); setVehicleMenuOpenId(vehicleMenuOpenId === v.id ? null : v.id); }}
                              style={{ ...S.ghost, padding: "5px 7px" }} title="More actions">
                              <MoreVertical size={14} />
                            </button>
                            {vehicleMenuOpenId === v.id && (
                              <div onClick={e => e.stopPropagation()} style={{
                                position: "absolute", top: "100%", right: 12, marginTop: 4, zIndex: 20,
                                background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10,
                                boxShadow: "0 8px 24px rgba(0,0,0,0.25)", minWidth: 180, padding: 4,
                              }}>
                                {[
                                  { label: "Edit Vehicle", icon: <Pencil size={12} />, onClick: () => { setEditVehicle(v); setVehicleMenuOpenId(null); } },
                                  { label: currentInsurance ? "Edit Insurance" : "Add Insurance", icon: <ShieldAlert size={12} />, onClick: () => { setInsuranceFor(v); setEditInsuranceRecord(currentInsurance ?? null); setVehicleMenuOpenId(null); } },
                                  { label: "View Details", icon: <Car size={12} />, onClick: () => { setDetailVehicle(v); setVehicleMenuOpenId(null); } },
                                  { label: "Documents", icon: <FileText size={12} />, onClick: () => { setDetailVehicle(v); setVehicleMenuOpenId(null); } },
                                ].map(item => (
                                  <button key={item.label} onClick={item.onClick} style={{
                                    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px",
                                    background: "none", border: "none", borderRadius: 6, cursor: "pointer",
                                    fontSize: 12, color: "var(--text-secondary)", textAlign: "left",
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                                    {item.icon} {item.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : tab === "warranty" ? (
        warrantyVehicles.length === 0 ? (
          <div style={{ ...S.card, textAlign: "center", padding: 40, color: "var(--text-ghost)" }}>No warranty-tracked vehicles yet — set a warranty period when marking a vehicle sold.</div>
        ) : (
          <>
          {warrantyTotals.truncated && (
            <p style={{ fontSize: 11, color: "#fbbf24", marginBottom: 10 }}>
              Showing the {warrantyVehicles.length} soonest-expiring of {warrantyTotals.total} warranty-tracked vehicles.
            </p>
          )}
          <div className="table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Vehicle", "Registration", "Buyer", "Sold On", "Warranty"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {warrantyVehicles.map(v => {
                  const badge = warrantyBadge(v);
                  return (
                    <tr key={v.id}>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-primary)", fontWeight: 600, borderBottom: "1px solid var(--bg-hover)" }}>
                        {v.make} {v.model} {v.variant ? <span style={{ color: "var(--text-ghost)", fontWeight: 400 }}>({v.variant})</span> : null}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-hover)" }}>{v.registrationNo || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-hover)" }}>
                        <div>{v.ownerName || "—"}</div>
                        {v.ownerPhone && <div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{v.ownerPhone}</div>}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-hover)" }}>
                        {v.soldAt ? new Date(v.soldAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        {v.warrantyMonths ? <div style={{ fontSize: 11, color: "var(--text-ghost)" }}>{v.warrantyMonths} month{v.warrantyMonths !== 1 ? "s" : ""}</div> : null}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--bg-hover)" }}>
                        {badge && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, display: "flex", alignItems: "center", gap: 4 }}>
                            {badge.color === "#f87171" ? <AlertTriangle size={11} /> : <CheckCircle size={11} />} {badge.text}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )
      ) : tab === "followups" ? (
        <>
          {/* Section + date filters — slices the merged Buyer/Seller/Vehicles
              & Insurance worklist below without a re-fetch. */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(["ALL", "BUYER", "SELLER", "VEHICLE_INSURANCE"] as const).map(sec => (
              <button key={sec} onClick={() => setFollowUpSection(sec)}
                style={{
                  ...S.ghost, padding: "6px 12px",
                  ...(followUpSection === sec ? { background: "#38bdf8", color: "#06273a", borderColor: "#38bdf8" } : {}),
                }}>
                {sec === "ALL" ? "All Sections" : FOLLOWUP_SECTION_LABEL[sec]}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-auto">
              <label style={{ fontSize: 11, color: "var(--text-ghost)" }}>From</label>
              <input type="date" style={S.inp} value={followUpDateFrom} onChange={e => setFollowUpDateFrom(e.target.value)} />
              <label style={{ fontSize: 11, color: "var(--text-ghost)" }}>To</label>
              <input type="date" style={S.inp} value={followUpDateTo} onChange={e => setFollowUpDateTo(e.target.value)} />
              {(followUpDateFrom || followUpDateTo) && (
                <button onClick={() => { setFollowUpDateFrom(""); setFollowUpDateTo(""); }} style={S.ghost}>Clear dates</button>
              )}
            </div>
          </div>
          {filteredFollowUps.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: 40, color: "var(--text-ghost)" }}>No follow-ups match this filter.</div>
          ) : (
            <div className="space-y-4">
              {(["overdue", "today", "upcoming"] as const).map(group => {
                const groupItems = filteredFollowUps.filter(f => dueLabel(f.nextFollowUpDate).group === group);
                if (groupItems.length === 0) return null;
                const groupLabel = group === "overdue" ? "Overdue" : group === "today" ? "Due Today" : "Upcoming";
                const groupColor = group === "overdue" ? "#f87171" : group === "today" ? "#fbbf24" : "var(--text-ghost)";
                return (
                  <div key={group}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: groupColor, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>{groupLabel} ({groupItems.length})</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {groupItems.map(f => {
                        const due = dueLabel(f.nextFollowUpDate);
                        const sectionBadge = FOLLOWUP_SECTION_BADGE[f.section];
                        if (f.kind === "lead") {
                          const l = f.lead;
                          const st = LEAD_STATUS[l.status] || LEAD_STATUS.NEW;
                          return (
                            <div key={`lead-${f.id}`} style={S.card}>
                              <div className="flex items-start justify-between mb-2">
                                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{l.name}</div>
                                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, background: sectionBadge.bg, color: sectionBadge.color, fontWeight: 700 }}>
                                  {FOLLOWUP_SECTION_LABEL[f.section]}
                                </span>
                              </div>
                              {(l.interestedMake || l.interestedModel) && (
                                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                                  {[l.interestedMake, l.interestedModel].filter(Boolean).join(" ")}
                                </div>
                              )}
                              <div className="flex items-center gap-3 mb-2" style={{ fontSize: 12, color: "var(--text-ghost)" }}>
                                {l.phone && <span className="flex items-center gap-1"><Phone size={11} /> {l.phone}</span>}
                              </div>
                              <div className="flex items-center justify-between">
                                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: st.bg, color: st.color, fontWeight: 700 }}>{st.label}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: due.color }}>{due.text}</span>
                              </div>
                              {l.assignedTo?.name && <div style={{ fontSize: 11, color: "var(--text-ghost)", marginTop: 6 }}>Assigned to: <strong style={{ color: "var(--text-secondary)" }}>{l.assignedTo.name}</strong></div>}
                              <button onClick={() => { setEditLead(l); setShowLeadModal(true); }} style={{ ...S.ghost, width: "100%", justifyContent: "center", marginTop: 8 }}><Pencil size={11} /> Edit</button>
                            </div>
                          );
                        }
                        const p = f.policy;
                        const v = p.vehicle;
                        const customerName = v?.ownerName || v?.sellerName || "";
                        const customerPhone = v?.ownerPhone || v?.sellerPhone || "";
                        return (
                          <div key={`ins-${f.id}`} style={S.card}>
                            <div className="flex items-start justify-between mb-2">
                              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                                {v ? `${v.make ?? ""} ${v.model ?? ""}`.trim() : "Vehicle"}{v?.registrationNo ? ` · ${v.registrationNo}` : ""}
                              </div>
                              <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, background: sectionBadge.bg, color: sectionBadge.color, fontWeight: 700 }}>
                                {FOLLOWUP_SECTION_LABEL[f.section]}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{p.provider}</div>
                            <div className="flex items-center gap-3 mb-2" style={{ fontSize: 12, color: "var(--text-ghost)" }}>
                              {customerName && <span>{customerName}</span>}
                              {customerPhone && <span className="flex items-center gap-1"><Phone size={11} /> {customerPhone}</span>}
                            </div>
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: 11, fontWeight: 700, color: due.color }}>{due.text || "Due"}</span>
                            </div>
                            {employeeName(v?.assignedToId) && <div style={{ fontSize: 11, color: "var(--text-ghost)", marginTop: 6 }}>Assigned to: <strong style={{ color: "var(--text-secondary)" }}>{employeeName(v?.assignedToId)}</strong></div>}
                            <button
                              onClick={() => { if (!v) return; setInsuranceFor({ id: v.id, make: v.make ?? "", model: v.model ?? "", status: "IN_STOCK", insurances: [] } as Vehicle); setEditInsuranceRecord(p); }}
                              style={{ ...S.ghost, width: "100%", justifyContent: "center", marginTop: 8 }}><Pencil size={11} /> Edit</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Month", "Total Enq.", "Hot", "Warm", "Cold", "Not Int.", "Lost", "TD Done", "Converted", "Conv %"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyReport.map((m: any) => (
                <tr key={m.month}>
                  <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-primary)", fontWeight: 600, borderBottom: "1px solid var(--bg-hover)", whiteSpace: "nowrap" }}>
                    {new Date(`${m.month}-01`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
                    {m.isHistorical && <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "var(--bg-hover)", color: "var(--text-ghost)", fontWeight: 700 }}>IMPORTED</span>}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-primary)", fontWeight: 700, borderBottom: "1px solid var(--bg-hover)" }}>{m.totalEnquiries}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#f87171", borderBottom: "1px solid var(--bg-hover)" }}>{m.byStatus.HOT ?? 0}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#fbbf24", borderBottom: "1px solid var(--bg-hover)" }}>{m.byStatus.WARM ?? 0}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#60a5fa", borderBottom: "1px solid var(--bg-hover)" }}>{m.byStatus.COLD ?? 0}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-ghost)", borderBottom: "1px solid var(--bg-hover)" }}>{m.byStatus.NOT_INTERESTED ?? 0}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-ghost)", borderBottom: "1px solid var(--bg-hover)" }}>{m.byStatus.LOST ?? 0}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#4ade80", borderBottom: "1px solid var(--bg-hover)" }}>{m.testDrivesDone}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#4ade80", fontWeight: 700, borderBottom: "1px solid var(--bg-hover)" }}>{m.converted}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: m.conversionRate > 20 ? "#4ade80" : "var(--text-ghost)", fontWeight: 700, borderBottom: "1px solid var(--bg-hover)" }}>{m.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {monthlyReport.length > 0 && (
            <div style={{ padding: "16px 12px 0" }}>
              <p style={{ fontSize: 11, color: "var(--text-ghost)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>By Source (all months shown)</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  monthlyReport.reduce((acc: Record<string, number>, m: any) => {
                    for (const [k, v] of Object.entries(m.bySource as Record<string, number>)) acc[k] = (acc[k] ?? 0) + v;
                    return acc;
                  }, {})
                ).map(([src, count]) => (
                  <span key={src} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
                    {SOURCES[src] || src}: <strong style={{ color: "var(--text-primary)" }}>{count as number}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
          {monthlyReport.some((m: any) => m.salesBySource) && (
            <div style={{ padding: "12px 12px 16px" }}>
              <p style={{ fontSize: 11, color: "var(--text-ghost)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Sales by Source (imported months)</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  monthlyReport.reduce((acc: Record<string, number>, m: any) => {
                    for (const [k, v] of Object.entries((m.salesBySource ?? {}) as Record<string, number>)) acc[k] = (acc[k] ?? 0) + v;
                    return acc;
                  }, {})
                ).filter(([, count]) => (count as number) > 0).map(([src, count]) => (
                  <span key={src} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
                    {SOURCES[src] || src}: <strong style={{ color: "#4ade80" }}>{count as number}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showLeadModal && (
        <LeadModal
          lead={editLead}
          defaultLeadType={tab === "sellerleads" ? "SELLER" : "BUYER"}
          onClose={() => setShowLeadModal(false)}
          onSaved={load}
          onConvert={(l) => { setShowLeadModal(false); if (l.leadType === "SELLER") setAcquireLead(l); else setConvertLead(l); }}
          onExchangeToSell={(seed) => { setShowLeadModal(false); setExchangeSeed(seed); }}
        />
      )}
      {exchangeSeed && (
        <LeadModal
          lead={null}
          defaultLeadType="SELLER"
          seedValues={exchangeSeed}
          onClose={() => setExchangeSeed(null)}
          onSaved={load}
        />
      )}
      {showImport && <ImportModal leadType={tab === "sellerleads" ? "SELLER" : "BUYER"} onClose={() => setShowImport(false)} onImported={load} />}
      {convertLead && <ConvertModal lead={convertLead} onClose={() => setConvertLead(null)} onConverted={() => { load(); setTab("vehicles"); }} />}
      {insuranceFor && (
        <InsuranceModal vehicle={insuranceFor} existing={editInsuranceRecord ?? undefined}
          onClose={() => { setInsuranceFor(null); setEditInsuranceRecord(null); }} onSaved={load} />
      )}
      {detailVehicle && (
        <VehicleDetailModal vehicle={detailVehicle} onClose={() => setDetailVehicle(null)}
          onEdit={() => { setEditVehicle(detailVehicle); setDetailVehicle(null); }}
          onEditInsurance={() => { setInsuranceFor(detailVehicle); setEditInsuranceRecord(detailVehicle.insurances?.[0] ?? null); setDetailVehicle(null); }} />
      )}
      {(showAddVehicle || acquireLead || editVehicle) && (
        <AddVehicleModal employees={employees} lead={acquireLead} vehicle={editVehicle}
          onClose={() => { setShowAddVehicle(false); setAcquireLead(null); setEditVehicle(null); }}
          onSaved={() => { load(); if (acquireLead) setTab("vehicles"); }} />
      )}
      {showVehicleImport && <VehicleImportModal onClose={() => setShowVehicleImport(false)} onImported={load} />}
      {showHistoricalImport && <HistoricalStatsModal onClose={() => setShowHistoricalImport(false)} onImported={load} />}
      {markSoldFor && <MarkSoldModal vehicle={markSoldFor} onClose={() => setMarkSoldFor(null)} onSold={load} />}
    </div>
  );
}
