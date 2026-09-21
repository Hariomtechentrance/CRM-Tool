// Reference data for the Tailoring & Boutique module — garment types and
// their measurement field templates. Field sets are based on real Indian
// tailoring/boutique measurement conventions (bust/waist/hip/shoulder are
// universal; blouse/lehenga/sherwani/trouser each need their own
// garment-specific fields that genuinely don't overlap).

export const GARMENT_TYPES = [
  "SHIRT", "TROUSER", "BLOUSE", "LEHENGA", "SHERWANI", "KURTA", "SUIT", "SAREE_FALL", "ALTERATION", "OTHER",
] as const;
export type GarmentType = (typeof GARMENT_TYPES)[number];

export const GARMENT_LABELS: Record<GarmentType, string> = {
  SHIRT: "Shirt",
  TROUSER: "Trouser / Pant",
  BLOUSE: "Blouse",
  LEHENGA: "Lehenga",
  SHERWANI: "Sherwani",
  KURTA: "Kurta",
  SUIT: "Suit",
  SAREE_FALL: "Saree Fall & Pico",
  ALTERATION: "Alteration",
  OTHER: "Other",
};

// Universal fields (real DB columns on TailorMeasurementProfile / captured
// in every order's measurements snapshot) — shown for every garment type
// where they're relevant. Each entry is [fieldKey, label, unit].
export const UNIVERSAL_FIELDS: [string, string, string][] = [
  ["chest", "Chest / Bust", "in"],
  ["waist", "Waist", "in"],
  ["hip", "Hip", "in"],
  ["shoulder", "Shoulder Width", "in"],
  ["sleeveLength", "Sleeve Length", "in"],
  ["length", "Garment Length", "in"],
];

// Garment-specific extra fields — stored in extraMeasurements (JSON) since
// they genuinely don't overlap across garment types. [fieldKey, label, unit]
export const EXTRA_FIELDS_BY_GARMENT: Record<GarmentType, [string, string, string][]> = {
  SHIRT: [
    ["neck", "Neck / Collar", "in"],
    ["cuff", "Cuff", "in"],
    ["armRound", "Arm Round (Bicep)", "in"],
  ],
  TROUSER: [
    ["inseam", "Inseam", "in"],
    ["thighRound", "Thigh Round", "in"],
    ["bottomWidth", "Bottom / Ankle Width", "in"],
    ["fly", "Fly", "in"],
  ],
  BLOUSE: [
    ["underbust", "Underbust", "in"],
    ["frontNeckDepth", "Front Neck Depth", "in"],
    ["backNeckDepth", "Back Neck Depth", "in"],
    ["shoulderToApex", "Shoulder to Apex", "in"],
    ["armhole", "Armhole", "in"],
  ],
  LEHENGA: [
    ["blouseBackLength", "Blouse Back Length", "in"],
    ["shoulderStrap", "Shoulder Strap", "in"],
    ["frontNeckDepth", "Front Neck Depth", "in"],
    ["backNeckDepth", "Back Neck Depth", "in"],
    ["shoulderToApex", "Shoulder to Apex", "in"],
    ["frontLength", "Front Length", "in"],
    ["armRound", "Arm Round", "in"],
    ["sleeveRound", "Sleeve Round", "in"],
    ["armhole", "Armhole", "in"],
  ],
  SHERWANI: [
    ["neck", "Neck", "in"],
    ["stomach", "Stomach", "in"],
  ],
  KURTA: [
    ["neckRound", "Neck Round", "in"],
  ],
  SUIT: [
    ["neck", "Neck / Collar", "in"],
    ["cuff", "Cuff", "in"],
    ["thighRound", "Thigh Round", "in"],
    ["bottomWidth", "Bottom Width", "in"],
  ],
  SAREE_FALL: [],
  ALTERATION: [],
  OTHER: [],
};

export function extraFieldsFor(garmentType: string): [string, string, string][] {
  return EXTRA_FIELDS_BY_GARMENT[garmentType as GarmentType] ?? [];
}

export const ORDER_STATUSES = [
  "ORDER_PLACED", "CUTTING", "STITCHING", "TRIAL", "ALTERATION", "READY", "DELIVERED", "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  ORDER_PLACED: { label: "Order Placed", color: "#818cf8", bg: "#1e1b4b" },
  CUTTING:      { label: "Cutting",      color: "#fbbf24", bg: "#451a03" },
  STITCHING:    { label: "Stitching",    color: "#fb923c", bg: "#431407" },
  TRIAL:        { label: "Trial",        color: "#38bdf8", bg: "#0c2d48" },
  ALTERATION:   { label: "Alteration",   color: "#f472b6", bg: "#4a1942" },
  READY:        { label: "Ready",        color: "#4ade80", bg: "#14532d" },
  DELIVERED:    { label: "Delivered",    color: "#6b7280", bg: "#1f2937" },
  CANCELLED:    { label: "Cancelled",    color: "#f87171", bg: "#450a0a" },
};

export const FABRIC_PROVIDED_BY = ["CUSTOMER", "SHOP"] as const;
