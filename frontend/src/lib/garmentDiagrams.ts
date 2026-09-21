// Garment outlines + clickable measurement points, front AND back view for
// each garment type. These are hand-authored SVG line illustrations (no
// photos involved — there's no image-generation tool available in this
// environment, and unlicensed stock photos have no business being embedded
// in a commercial product), styled with real garment details (collar fold,
// button placket, side seams, cuffs, back yoke/seam) rather than a plain
// outline, so they read as an actual garment diagram rather than an
// abstract shape.
//
// Measurements are split across front/back by real tailoring convention,
// not arbitrarily: Shoulder Width and body Length are conventionally taken
// down the BACK (nape-to-hem along the spine); Back/Front Neck Depth are
// exactly what they say; everything else (chest, sleeve, waist, cuff, etc.)
// is a front/side measurement. Every field for a garment appears on exactly
// one of the two views, never both, never neither.

export interface GarmentPoint {
  key: string;    // matches tailoringCatalog field keys (universal or extra)
  label: string;
  unit: string;
  x: number;      // 0-100, % of viewBox width
  y: number;      // 0-100, % of viewBox height
}

export interface GarmentView {
  viewBox: string;
  path: string;        // main silhouette outline (filled)
  details?: string[];  // decorative stroke-only accent lines (collar fold, seams, placket, pockets, cuffs) — purely visual, not interactive
  points: GarmentPoint[];
}

export interface GarmentDiagramDef {
  front: GarmentView;
  back: GarmentView;
}

// ── Shared "top" silhouette (shirt/kurta/sherwani/blouse all use this same
// body+sleeve construction, just with different length/sleeve proportions).
// Front and back share the exact same outer body shape — only the collar
// treatment and the decorative detail lines differ, which is exactly how a
// real front/back pattern pair works. ──
function topBody(hemY: number, sleeveBottomY: number): string {
  return [
    "L 138 28", "L 165 40",
    `L 170 ${sleeveBottomY}`, `L 128 ${sleeveBottomY}`,
    `L 122 ${hemY - 10}`, `L 132 ${hemY}`,
    `L 68 ${hemY}`, `L 78 ${hemY - 10}`,
    `L 72 ${sleeveBottomY}`, `L 30 ${sleeveBottomY}`,
    "L 35 40", "L 62 28",
  ].join(" ");
}

function topFront(hemY: number, sleeveBottomY: number): string {
  return `M 85 15 L 100 25 L 115 15 ${topBody(hemY, sleeveBottomY)} Z`;
}

function topBack(hemY: number, sleeveBottomY: number): string {
  // Curved back neckline (no collar V) — a shallow scoop instead of a notch.
  return `M 85 15 Q 100 22 115 15 ${topBody(hemY, sleeveBottomY)} Z`;
}

function frontDetails(hemY: number): string[] {
  return [
    "M 100 25 L 100 " + (hemY - 5),          // button placket, centre front
    "M 78 45 L 74 " + (hemY - 15),           // left side seam
    "M 122 45 L 126 " + (hemY - 15),         // right side seam
    "M 72 60 L 72 78 L 90 78 L 90 60",       // chest pocket (left)
  ];
}

function backDetails(hemY: number): string[] {
  return [
    "M 100 22 L 100 " + hemY,                // centre back seam
    "M 62 32 L 138 32",                      // back yoke line
    "M 78 45 L 74 " + (hemY - 15),           // left side seam
    "M 122 45 L 126 " + (hemY - 15),         // right side seam
  ];
}

function cuffDetails(sleeveBottomY: number): string[] {
  return [
    `M 30 ${sleeveBottomY - 6} L 72 ${sleeveBottomY - 6}`,
    `M 128 ${sleeveBottomY - 6} L 170 ${sleeveBottomY - 6}`,
  ];
}

const SHIRT: GarmentDiagramDef = {
  front: {
    viewBox: "0 0 200 300", path: topFront(195, 112), details: [...frontDetails(195), ...cuffDetails(112)],
    points: [
      { key: "neck",         label: "Neck / Collar", unit: "in", x: 50, y: 8 },
      { key: "chest",        label: "Chest",         unit: "in", x: 67, y: 32 },
      { key: "sleeveLength", label: "Sleeve Length", unit: "in", x: 87, y: 25 },
      { key: "cuff",         label: "Cuff",          unit: "in", x: 85, y: 35 },
      { key: "armRound",     label: "Arm Round",     unit: "in", x: 82, y: 30 },
      { key: "waist",        label: "Waist",         unit: "in", x: 66, y: 55 },
    ],
  },
  back: {
    viewBox: "0 0 200 300", path: topBack(195, 112), details: [...backDetails(195), ...cuffDetails(112)],
    points: [
      { key: "shoulder", label: "Shoulder Width", unit: "in", x: 50, y: 11 },
      { key: "length",   label: "Shirt Length",   unit: "in", x: 50, y: 66 },
    ],
  },
};

const KURTA: GarmentDiagramDef = {
  front: {
    viewBox: "0 0 200 300", path: topFront(280, 120), details: frontDetails(280),
    points: [
      { key: "neckRound",    label: "Neck Round",    unit: "in", x: 50, y: 8 },
      { key: "chest",        label: "Chest",         unit: "in", x: 67, y: 30 },
      { key: "sleeveLength", label: "Sleeve Length", unit: "in", x: 89, y: 27 },
      { key: "waist",        label: "Waist",         unit: "in", x: 66, y: 55 },
    ],
  },
  back: {
    viewBox: "0 0 200 300", path: topBack(280, 120), details: backDetails(280),
    points: [
      { key: "shoulder", label: "Shoulder Width", unit: "in", x: 50, y: 11 },
      { key: "length",   label: "Kurta Length",   unit: "in", x: 50, y: 90 },
    ],
  },
};

const SHERWANI: GarmentDiagramDef = {
  front: {
    viewBox: "0 0 200 300", path: topFront(292, 125), details: frontDetails(292),
    points: [
      { key: "neck",         label: "Neck",          unit: "in", x: 50, y: 8 },
      { key: "chest",        label: "Chest",         unit: "in", x: 67, y: 30 },
      { key: "sleeveLength", label: "Sleeve Length", unit: "in", x: 90, y: 27 },
      { key: "stomach",      label: "Stomach",       unit: "in", x: 65, y: 48 },
      { key: "hip",          label: "Hip",           unit: "in", x: 66, y: 60 },
    ],
  },
  back: {
    viewBox: "0 0 200 300", path: topBack(292, 125), details: backDetails(292),
    points: [
      { key: "shoulder", label: "Shoulder",       unit: "in", x: 50, y: 11 },
      { key: "length",   label: "Sherwani Length", unit: "in", x: 50, y: 94 },
    ],
  },
};

const BLOUSE: GarmentDiagramDef = {
  front: {
    viewBox: "0 0 200 220", path: topFront(140, 88), details: [...frontDetails(140), ...cuffDetails(88)],
    points: [
      { key: "chest",           label: "Bust",              unit: "in", x: 68, y: 38 },
      { key: "underbust",       label: "Underbust",         unit: "in", x: 68, y: 50 },
      { key: "sleeveLength",    label: "Sleeve Length",     unit: "in", x: 87, y: 32 },
      { key: "armhole",         label: "Armhole",           unit: "in", x: 80, y: 34 },
      { key: "frontNeckDepth",  label: "Front Neck Depth",  unit: "in", x: 50, y: 12 },
      { key: "shoulderToApex",  label: "Shoulder to Apex",  unit: "in", x: 58, y: 28 },
    ],
  },
  back: {
    viewBox: "0 0 200 220", path: topBack(140, 88), details: [...backDetails(140), ...cuffDetails(88)],
    points: [
      { key: "shoulder",       label: "Shoulder Width",  unit: "in", x: 50, y: 12 },
      { key: "backNeckDepth",  label: "Back Neck Depth", unit: "in", x: 50, y: 20 },
      { key: "length",         label: "Blouse Length",   unit: "in", x: 50, y: 62 },
    ],
  },
};

const trouserBody = "L 140 20 L 135 60 L 150 280 L 115 280 L 103 92 L 97 92 L 85 280 L 50 280 L 65 60 Z";
const TROUSER: GarmentDiagramDef = {
  front: {
    viewBox: "0 0 200 300", path: `M 60 20 ${trouserBody}`,
    details: ["M 100 22 L 100 90", "M 60 20 L 60 60", "M 140 20 L 140 60"], // fly front + waistband darts
    points: [
      { key: "waist",       label: "Waist",                 unit: "in", x: 50, y: 7 },
      { key: "thighRound",  label: "Thigh Round",           unit: "in", x: 68, y: 34 },
      { key: "fly",         label: "Fly",                   unit: "in", x: 50, y: 32 },
      { key: "bottomWidth", label: "Bottom / Ankle Width",  unit: "in", x: 66, y: 94 },
    ],
  },
  back: {
    viewBox: "0 0 200 300", path: `M 60 20 ${trouserBody}`,
    details: ["M 100 20 L 100 60", "M 70 55 L 130 55"], // centre back seam + back yoke
    points: [
      { key: "hip",     label: "Hip",     unit: "in", x: 68, y: 20 },
      { key: "length",  label: "Length",  unit: "in", x: 62, y: 60 },
      { key: "inseam",  label: "Inseam",  unit: "in", x: 55, y: 65 },
    ],
  },
};

const LEHENGA: GarmentDiagramDef = {
  front: {
    viewBox: "0 0 200 320",
    path: topFront(140, 88) + " M 70 140 L 20 300 L 180 300 L 130 140 Z",
    details: [...frontDetails(140), "M 100 140 L 100 300"], // skirt centre seam
    points: [
      { key: "chest",           label: "Chest",              unit: "in", x: 68, y: 34 },
      { key: "frontNeckDepth",  label: "Front Neck Depth",   unit: "in", x: 50, y: 11 },
      { key: "shoulderToApex",  label: "Shoulder to Apex",   unit: "in", x: 58, y: 26 },
      { key: "sleeveLength",    label: "Sleeve Length",      unit: "in", x: 87, y: 29 },
      { key: "armRound",        label: "Arm Round",          unit: "in", x: 82, y: 31 },
      { key: "sleeveRound",     label: "Sleeve Round",       unit: "in", x: 84, y: 33 },
      { key: "armhole",         label: "Armhole",            unit: "in", x: 78, y: 33 },
      { key: "frontLength",     label: "Blouse Front Length",unit: "in", x: 50, y: 45 },
      { key: "waist",           label: "Waist",              unit: "in", x: 60, y: 46 },
    ],
  },
  back: {
    viewBox: "0 0 200 320",
    path: topBack(140, 88) + " M 70 140 L 20 300 L 180 300 L 130 140 Z",
    details: [...backDetails(140), "M 100 140 L 100 300"],
    points: [
      { key: "shoulder",       label: "Full Shoulder",   unit: "in", x: 50, y: 12 },
      { key: "shoulderStrap",  label: "Shoulder Strap",  unit: "in", x: 60, y: 10 },
      { key: "backNeckDepth",  label: "Back Neck Depth", unit: "in", x: 50, y: 19 },
      { key: "length",         label: "Skirt Length",    unit: "in", x: 50, y: 80 },
    ],
  },
};

export const GARMENT_DIAGRAMS: Partial<Record<string, GarmentDiagramDef>> = {
  SHIRT, KURTA, SHERWANI, BLOUSE, TROUSER, LEHENGA,
};

export function diagramFor(garmentType: string): GarmentDiagramDef | undefined {
  return GARMENT_DIAGRAMS[garmentType];
}
