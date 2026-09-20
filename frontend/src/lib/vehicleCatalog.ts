// Reference data for the Cars module's vehicle forms — Make → Model → Variant
// cascading dropdowns, plus Fuel/Transmission/Insurance-provider lists.
//
// This is a pragmatic, curated list (major 4-wheeler brands sold in India +
// their most common current/recent models), not an exhaustive database of
// every trim ever sold. Every dropdown built from this file must always
// offer an "Other (type manually)" escape hatch so an uncommon make/model/
// variant never blocks data entry.

export const VEHICLE_MAKES = [
  // Mass-market cars
  "Maruti Suzuki", "Hyundai", "Tata Motors", "Mahindra", "Kia", "Honda",
  "Toyota", "Renault", "Nissan", "Skoda", "Volkswagen", "MG Motor",
  "Citroen", "Jeep", "Datsun", "Isuzu", "Force Motors",
  // Legacy brands still commonly seen on the used-car market
  "Ford", "Chevrolet", "Fiat",
  // Luxury
  "BMW", "Mercedes-Benz", "Audi", "Volvo", "Jaguar", "Land Rover", "Lexus", "Porsche", "Mini",
  "Other",
] as const;

export const MODELS_BY_MAKE: Record<string, string[]> = {
  "Maruti Suzuki": ["Swift", "Baleno", "WagonR", "Alto K10", "Dzire", "Ertiga", "Brezza", "Grand Vitara", "Celerio", "S-Presso", "XL6", "Ignis", "Eeco", "Fronx", "Jimny", "Invicto"],
  "Hyundai": ["Creta", "Venue", "i20", "i10 Nios", "Verna", "Alcazar", "Exter", "Tucson", "Aura", "Santro", "Ioniq 5"],
  "Tata Motors": ["Nexon", "Punch", "Tiago", "Tigor", "Harrier", "Safari", "Altroz", "Curvv", "Nano"],
  "Mahindra": ["Thar", "Scorpio-N", "Scorpio Classic", "XUV700", "Bolero", "XUV300", "Marazzo", "Bolero Neo", "XUV400", "KUV100"],
  "Kia": ["Seltos", "Sonet", "Carens", "EV6"],
  "Honda": ["City", "Amaze", "Elevate", "Jazz", "WR-V", "CR-V"],
  "Toyota": ["Innova Crysta", "Innova Hycross", "Fortuner", "Glanza", "Urban Cruiser Hyryder", "Camry", "Vellfire", "Rumion", "Land Cruiser"],
  "Renault": ["Kwid", "Triber", "Kiger", "Duster"],
  "Nissan": ["Magnite", "Kicks", "Terrano"],
  "Skoda": ["Slavia", "Kushaq", "Octavia", "Superb", "Kodiaq"],
  "Volkswagen": ["Virtus", "Taigun", "Tiguan", "Polo", "Vento", "Ameo"],
  "MG Motor": ["Hector", "Astor", "ZS EV", "Gloster", "Comet EV"],
  "Citroen": ["C3", "C3 Aircross", "C5 Aircross", "eC3"],
  "Jeep": ["Compass", "Meridian", "Wrangler", "Grand Cherokee"],
  "Datsun": ["GO", "GO+", "redi-GO"],
  "Isuzu": ["D-Max V-Cross", "MU-X"],
  "Force Motors": ["Gurkha", "Trax", "Traveller"],
  "Ford": ["EcoSport", "Figo", "Aspire", "Endeavour", "Freestyle"],
  "Chevrolet": ["Beat", "Spark", "Cruze", "Tavera", "Enjoy"],
  "Fiat": ["Punto", "Linea", "Avventura"],
  "BMW": ["3 Series", "5 Series", "X1", "X3", "X5", "7 Series", "2 Series Gran Coupe"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLA", "GLC", "S-Class", "A-Class Limousine"],
  "Audi": ["A4", "A6", "Q3", "Q5", "Q7", "e-tron"],
  "Volvo": ["XC40", "XC60", "XC90", "S90"],
  "Jaguar": ["XE", "XF", "F-Pace"],
  "Land Rover": ["Discovery Sport", "Range Rover Evoque", "Range Rover Velar", "Defender", "Range Rover"],
  "Lexus": ["ES", "NX", "RX"],
  "Porsche": ["Macan", "Cayenne", "911", "Panamera"],
  "Mini": ["Cooper", "Countryman"],
};

// Keyed by "Make|Model" to avoid collisions between different makes' models
// that happen to share a variant-name style.
export const VARIANTS_BY_MODEL: Record<string, string[]> = {
  "Maruti Suzuki|Swift": ["LXi", "VXi", "ZXi", "ZXi+", "LDi", "VDi"],
  "Maruti Suzuki|Baleno": ["Sigma", "Delta", "Zeta", "Alpha"],
  "Maruti Suzuki|WagonR": ["LXi", "VXi", "VXi+", "ZXi"],
  "Maruti Suzuki|Dzire": ["LXi", "VXi", "ZXi", "ZXi+"],
  "Maruti Suzuki|Brezza": ["LXi", "VXi", "ZXi", "ZXi+"],
  "Maruti Suzuki|Ertiga": ["LXi", "VXi", "ZXi", "ZXi+"],
  "Maruti Suzuki|Grand Vitara": ["Sigma", "Delta", "Zeta", "Alpha", "Alpha+"],
  "Hyundai|Creta": ["E", "EX", "S", "SX", "SX(O)"],
  "Hyundai|Venue": ["E", "S", "SX", "SX(O)"],
  "Hyundai|i20": ["Era", "Magna", "Sportz", "Asta", "Asta(O)"],
  "Hyundai|Verna": ["EX", "S", "SX", "SX(O)"],
  "Hyundai|i10 Nios": ["Era", "Magna", "Sportz", "Asta"],
  "Tata Motors|Nexon": ["Smart", "Pure", "Creative", "Fearless", "Empowered"],
  "Tata Motors|Punch": ["Pure", "Adventure", "Accomplished", "Creative"],
  "Tata Motors|Tiago": ["XE", "XM", "XT", "XZ", "XZ+"],
  "Tata Motors|Harrier": ["Smart", "Pure", "Adventure", "Fearless"],
  "Tata Motors|Altroz": ["XE", "XM", "XT", "XZ", "XZ+"],
  "Mahindra|Thar": ["AX (O)", "AX Opt", "LX", "RWD Diesel", "4WD Diesel", "RWD Petrol"],
  "Mahindra|Scorpio-N": ["Z2", "Z4", "Z6", "Z8", "Z8L"],
  "Mahindra|XUV700": ["MX", "AX3", "AX5", "AX7", "AX7L"],
  "Mahindra|Bolero": ["B4", "B6", "B6(O)"],
  "Mahindra|XUV300": ["W4", "W6", "W8", "W8(O)"],
  "Kia|Seltos": ["HTE", "HTK", "HTK+", "HTX", "HTX+", "GTX+"],
  "Kia|Sonet": ["HTE", "HTK", "HTK+", "HTX", "GTX+"],
  "Honda|City": ["SV", "V", "VX", "ZX"],
  "Honda|Amaze": ["E", "S", "VX"],
  "Toyota|Innova Crysta": ["GX", "VX", "ZX"],
  "Toyota|Fortuner": ["4x2 MT", "4x2 AT", "4x4 AT", "Legender"],
  "Toyota|Glanza": ["E", "S", "G", "V"],
};

// Fallback variant ladder when a specific model isn't in VARIANTS_BY_MODEL
// above. Indian manufacturers largely reuse the same trim-naming convention
// across their whole range, so a per-MAKE generic list (e.g. every Honda
// uses SV/V/VX/ZX, every Hyundai uses E/S/SX/SX(O)) still gives a real,
// relevant dropdown instead of falling back to free text — which is what
// "Variant must also show dropdown" means here: it should never be empty
// just because that one model wasn't individually curated.
const GENERIC_VARIANTS_BY_MAKE: Record<string, string[]> = {
  "Maruti Suzuki": ["LXi", "VXi", "ZXi", "ZXi+", "Sigma", "Delta", "Zeta", "Alpha"],
  "Hyundai": ["E", "S", "SX", "SX(O)"],
  "Tata Motors": ["XE", "XM", "XT", "XZ", "XZ+"],
  "Mahindra": ["W4", "W6", "W8", "W8(O)"],
  "Kia": ["HTE", "HTK", "HTK+", "HTX", "GTX+"],
  "Honda": ["SV", "V", "VX", "ZX"],
  "Toyota": ["E", "G", "V", "VX", "ZX"],
  "Renault": ["RXE", "RXL", "RXT", "RXZ"],
  "Nissan": ["XE", "XL", "XV"],
  "Skoda": ["Active", "Ambition", "Style", "Laurin & Klement"],
  "Volkswagen": ["Comfortline", "Highline", "Topline"],
  "MG Motor": ["Style", "Super", "Smart", "Sharp"],
  "Citroen": ["Live", "Feel", "Shine"],
  "Jeep": ["Sport", "Longitude", "Limited"],
  "Datsun": ["D", "A", "T"],
  "Ford": ["Ambiente", "Trend", "Titanium"],
  "Chevrolet": ["LS", "LT", "LTZ"],
  "Fiat": ["Active", "Dynamic", "Emotion"],
  "BMW": ["Sport", "Luxury Line", "M Sport"],
  "Mercedes-Benz": ["Base", "AMG Line", "Exclusive"],
  "Audi": ["Premium", "Premium Plus", "Technology"],
};

export const FUEL_TYPES = [
  "Petrol", "Diesel", "CNG", "Electric", "Hybrid", "LPG",
] as const;

export const TRANSMISSION_TYPES = [
  "Manual", "Automatic", "AMT", "CVT", "DCT", "iMT",
] as const;

// Full legal names of every general insurer licensed to write motor
// insurance in India (PSU + private) — kept as the complete registered name
// rather than a shorthand, per the client's own reference list.
export const INSURANCE_PROVIDERS = [
  "ACKO General Insurance Limited",
  "Bajaj Allianz General Insurance Company Limited",
  "Cholamandalam MS General Insurance Company Limited",
  "Future Generali India Insurance Company Limited",
  "Go Digit General Insurance Limited",
  "HDFC ERGO General Insurance Company Limited",
  "ICICI Lombard General Insurance Company Limited",
  "IFFCO-Tokio General Insurance Company Limited",
  "Liberty General Insurance Limited",
  "Magma HDI General Insurance Company Limited",
  "National Insurance Company Limited",
  "Navi General Insurance Limited",
  "Raheja QBE General Insurance Company Limited",
  "Reliance General Insurance Company Limited",
  "Royal Sundaram General Insurance Company Limited",
  "SBI General Insurance Company Limited",
  "Shriram General Insurance Company Limited",
  "Tata AIG General Insurance Company Limited",
  "The New India Assurance Company Limited",
  "The Oriental Insurance Company Limited",
  "United India Insurance Company Limited",
  "Universal Sompo General Insurance Company Limited",
  "Zuno General Insurance Limited (formerly Edelweiss General Insurance)",
  "Zurich Kotak General Insurance Company (India) Limited (formerly Kotak Mahindra General Insurance)",
  "Other",
] as const;

/** Year options from 1995 to the current year, most recent first. */
export function yearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= 1995; y--) years.push(y);
  return years;
}

/** Models for a given make; empty array (not an error) for an unknown make. */
export function modelsForMake(make: string): string[] {
  return MODELS_BY_MAKE[make] ?? [];
}

/**
 * Variants for a given make+model. Falls back to that make's generic trim
 * ladder when the exact model isn't individually curated, so the Variant
 * field is a dropdown for every catalogued make, not just the ~30 models
 * with hand-picked variant lists.
 */
export function variantsForModel(make: string, model: string): string[] {
  return VARIANTS_BY_MODEL[`${make}|${model}`] ?? GENERIC_VARIANTS_BY_MAKE[make] ?? [];
}
