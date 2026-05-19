import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2, Globe, Phone, Mail, Hash, MapPin, Check,
  Users, Package, ShoppingCart, Truck, Receipt,
  ShoppingBag, Warehouse, UserCheck, Kanban,
  Megaphone, Headphones, BarChart3, Container, Shirt,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { getApiError } from "@/lib/utils";
import { ALL_MODULES, MODULE_CATEGORIES, getDefaultModules } from "@/lib/modules";
import type { OrganizationSummary } from "@/types";

// ── icon map ────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Users, Package, ShoppingCart, Truck, Receipt,
  ShoppingBag, Warehouse, UserCheck, Kanban,
  Megaphone, Headphones, BarChart3, Container, Shirt,
  HeadphonesIcon: Headphones,
  Globe,
};

const schema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  businessType: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  currency: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const BUSINESS_TYPES = [
  // Trade & Commerce
  { value: "IMPORT_EXPORT",  label: "Import & Export" },
  { value: "IMPORT",         label: "Import Only" },
  { value: "EXPORT",         label: "Export Only" },
  { value: "TRADING",        label: "Trading / Distribution" },
  { value: "MANUFACTURING",  label: "Manufacturing" },
  // Retail & Consumer
  { value: "RETAIL",         label: "Retail Store" },
  { value: "ECOMMERCE",      label: "E-commerce / Online Store" },
  { value: "FOOD_BEVERAGE",  label: "Food & Beverage / Restaurant" },
  { value: "HOSPITALITY",    label: "Hospitality / Hotel / Travel" },
  // Technology
  { value: "IT_SOFTWARE",    label: "IT / Software Product" },
  { value: "IT_SERVICES",    label: "IT Services / Outsourcing" },
  // Services & Professional
  { value: "CONSULTING",     label: "Consulting / Professional Services" },
  { value: "LEGAL",          label: "Legal / Law Firm" },
  { value: "FINANCE",        label: "Finance / Banking / Insurance" },
  { value: "MEDIA",          label: "Media / Marketing / Agency" },
  // Infrastructure & Industry
  { value: "REAL_ESTATE",    label: "Real Estate / Construction" },
  { value: "LOGISTICS",      label: "Logistics / Transport / Courier" },
  { value: "AGRICULTURE",    label: "Agriculture / Farming" },
  // Social & Public
  { value: "HEALTHCARE",     label: "Healthcare / Medical / Pharma" },
  { value: "EDUCATION",      label: "Education / Training / Coaching" },
  { value: "NGO",            label: "NGO / Non-profit / Trust" },
  { value: "OTHER",          label: "Other" },
];
const CURRENCIES = [
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
];
const COUNTRIES = [
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "AE", label: "UAE" },
  { value: "SG", label: "Singapore" },
  { value: "CN", label: "China" },
];

function getInitials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const STEPS = ["Basic Info", "Contact & Tax", "Select Modules"];

export default function CreateOrgPage() {
  const navigate = useNavigate();
  const addOrganization = useAuthStore((s) => s.addOrganization);
  const [apiError, setApiError] = useState("");
  const [step, setStep] = useState(1);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: "INR", country: "IN", businessType: "IMPORT_EXPORT" },
  });

  const businessType = watch("businessType") || "IMPORT_EXPORT";
  const orgName = watch("name") || "";

  // Auto-set default modules when businessType changes
  useEffect(() => {
    setSelectedModules(getDefaultModules(businessType));
  }, [businessType]);

  const toggleModule = (key: string) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter((k) => k !== key) : prev) : [...prev, key]
    );
  };

  const doSubmit = async (data: FormData) => {
    setApiError("");
    setSubmitting(true);
    try {
      const payload = { ...data, enabledModules: selectedModules };
      const res = await api.post<{ data: OrganizationSummary }>("/organizations", payload);
      addOrganization({ ...res.data.data, role: "OWNER", enabledModules: selectedModules });
      navigate("/dashboard");
    } catch (err) {
      setApiError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Styles
  const S = {
    page:    { minHeight: "100vh", background: "#07071A", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" } as React.CSSProperties,
    glow:    { position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)", pointerEvents: "none" } as React.CSSProperties,
    wrap:    { width: "100%", maxWidth: step === 3 ? 760 : 500, position: "relative", zIndex: 1 } as React.CSSProperties,
    card:    { background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 16, padding: "32px 36px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" } as React.CSSProperties,
    btnPri:  { width: "100%", height: 44, borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(99,102,241,0.35)", transition: "opacity 0.15s" } as React.CSSProperties,
    btnOut:  { flex: 1, height: 44, borderRadius: 10, border: "1px solid #252545", background: "transparent", color: "#CCCCEE", fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <div style={S.glow} />
      <div style={S.wrap}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: 13, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", marginBottom: 14, boxShadow: "0 8px 28px rgba(99,102,241,0.4)" }}>
            <span style={{ color: "white", fontWeight: 800, fontSize: 15 }}>BL</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#EEEEF5", margin: 0 }}>
            {step === 1 ? "Create your organization" : step === 2 ? "Contact & tax details" : "Choose your modules"}
          </h1>
          <p style={{ fontSize: 13, color: "#7070A0", marginTop: 5 }}>
            {step === 1 ? "Set up your company workspace on BL-CRM."
             : step === 2 ? "Optional — fill these anytime in Settings."
             : `${selectedModules.length} module${selectedModules.length !== 1 ? "s" : ""} selected · You can change this later in Settings.`}
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 24 }}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                    background: done || active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#131327",
                    color: done || active ? "white" : "#505070",
                    border: active ? "3px solid rgba(99,102,241,0.3)" : "2px solid #1C1C35",
                    boxShadow: done || active ? "0 4px 12px rgba(99,102,241,0.35)" : "none",
                    flexShrink: 0,
                  }}>
                    {done ? <Check style={{ width: 13, height: 13 }} /> : n}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: active ? "#CCCCEE" : done ? "#7070A0" : "#404060", whiteSpace: "nowrap" }}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 32, height: 2, margin: "0 10px", background: step > n ? "linear-gradient(90deg,#6366f1,#8b5cf6)" : "#1C1C35", borderRadius: 2 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {apiError && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, fontSize: 13, color: "#F87171", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", flexShrink: 0 }} />
            {apiError}
          </div>
        )}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div style={S.card}>
            <form onSubmit={(e) => { e.preventDefault(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Input
                label="Company / Organization Name *"
                placeholder="OM Import Export Ltd"
                leftIcon={<Building2 style={{ width: 16, height: 16 }} />}
                error={errors.name?.message}
                {...register("name")}
              />
              <Select label="Business Type" options={BUSINESS_TYPES} placeholder="Select type" value={watch("businessType")} onChange={(e) => setValue("businessType", e.target.value)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Select label="Base Currency" options={CURRENCIES} value={watch("currency")} onChange={(e) => setValue("currency", e.target.value)} />
                <Select label="Country" options={COUNTRIES} value={watch("country")} onChange={(e) => setValue("country", e.target.value)} />
              </div>
              {orgName.length >= 2 && (
                <div style={{ padding: "13px 15px", background: "#131327", borderRadius: 10, border: "1px solid #1E1E38", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {getInitials(orgName)}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#EEEEF5", margin: 0 }}>{orgName}</p>
                    <p style={{ fontSize: 11, color: "#505070", margin: "2px 0 0" }}>Workspace preview</p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleSubmit(() => setStep(2))()}
                style={{ ...S.btnPri, marginTop: 4 }}
              >
                Continue →
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div style={S.card}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Email" type="email" placeholder="info@company.com" leftIcon={<Mail style={{ width: 16, height: 16 }} />} error={errors.email?.message} {...register("email")} />
                <Input label="Phone" placeholder="+91 98765 43210" leftIcon={<Phone style={{ width: 16, height: 16 }} />} {...register("phone")} />
              </div>
              <Input label="GST Number" placeholder="22AAAAA0000A1Z5" hint="Your 15-digit GSTIN (optional)" leftIcon={<Hash style={{ width: 16, height: 16 }} />} {...register("taxId")} />
              <Input label="Address" placeholder="123, MG Road" leftIcon={<MapPin style={{ width: 16, height: 16 }} />} {...register("address")} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="City" placeholder="Mumbai" {...register("city")} />
                <Input label="State" placeholder="Maharashtra" {...register("state")} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setStep(1)} style={S.btnOut}>← Back</button>
                <button type="button" onClick={() => setStep(3)} style={{ ...S.btnPri, flex: 1, width: "auto" }}>
                  Continue →
                </button>
              </div>
              <button type="button" onClick={() => setStep(3)} style={{ background: "none", border: "none", color: "#505070", fontSize: 12, cursor: "pointer", textAlign: "center", padding: "3px 0" }}>
                Skip and choose modules
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — MODULE SELECTION ── */}
        {step === 3 && (
          <div>
            {MODULE_CATEGORIES.map((cat) => {
              const mods = ALL_MODULES.filter((m) => m.category === cat.key);
              return (
                <div key={cat.key} style={{ marginBottom: 24 }}>
                  {/* Category header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#7070A0", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{cat.label}</p>
                    <div style={{ flex: 1, height: 1, background: "#1C1C35" }} />
                    <p style={{ fontSize: 11, color: "#404060", margin: 0 }}>{cat.desc}</p>
                  </div>

                  {/* Module cards grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
                    {mods.map((mod) => {
                      const selected = selectedModules.includes(mod.key);
                      const Icon = ICON_MAP[mod.iconName] || Package;
                      return (
                        <button
                          key={mod.key}
                          type="button"
                          onClick={() => toggleModule(mod.key)}
                          style={{
                            background: selected ? mod.accentBg : "#0D0D1F",
                            border: `1px solid ${selected ? mod.accentBorder : "#1C1C35"}`,
                            borderRadius: 12, padding: "14px 14px", textAlign: "left", cursor: "pointer",
                            position: "relative", transition: "all 0.15s",
                            boxShadow: selected ? `0 0 0 1px ${mod.accentBorder}` : "none",
                          }}
                        >
                          {/* Selected tick */}
                          {selected && (
                            <div style={{ position: "absolute", top: 10, right: 10, width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Check style={{ width: 11, height: 11, color: "white" }} />
                            </div>
                          )}
                          {/* Icon */}
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: mod.accentBg, border: `1px solid ${mod.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                            <Icon style={{ width: 18, height: 18, color: mod.accentColor }} />
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: selected ? "#EEEEF5" : "#CCCCEE", margin: "0 0 4px", paddingRight: selected ? 20 : 0 }}>
                            {mod.label}
                          </p>
                          <p style={{ fontSize: 11, color: "#505070", margin: 0, lineHeight: 1.5 }}>
                            {mod.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Bottom actions */}
            <div style={{ background: "#0D0D1F", border: "1px solid #1C1C35", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button type="button" onClick={() => setStep(2)} style={{ ...S.btnOut, width: "auto", padding: "0 18px" }}>← Back</button>
                <p style={{ fontSize: 13, color: "#7070A0", margin: 0 }}>
                  <span style={{ color: "#818CF8", fontWeight: 700 }}>{selectedModules.length}</span> module{selectedModules.length !== 1 ? "s" : ""} selected
                </p>
              </div>
              <button
                type="button"
                disabled={submitting || selectedModules.length === 0}
                onClick={handleSubmit(doSubmit)}
                style={{ ...S.btnPri, width: "auto", padding: "0 28px", opacity: (submitting || selectedModules.length === 0) ? 0.6 : 1, cursor: (submitting || selectedModules.length === 0) ? "not-allowed" : "pointer" }}
              >
                {submitting ? "Creating workspace…" : "Create Organization →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
