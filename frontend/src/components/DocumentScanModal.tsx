import { useState, useRef, useEffect, useCallback } from "react";
// @ts-ignore — jscanify ships no type declarations; the browser build is a
// plain UMD module exporting a `jscanify` class that reads everything off
// the global `cv` (OpenCV.js), loaded separately via opencvLoader.
import jscanify from "jscanify/client";
import { X, Check, RotateCcw, ScanLine } from "lucide-react";
import { loadOpenCv } from "@/lib/opencvLoader";

type Point = { x: number; y: number };
type Corners = { topLeftCorner: Point; topRightCorner: Point; bottomLeftCorner: Point; bottomRightCorner: Point };
type Enhance = "original" | "grayscale" | "bw";
type Phase = "loading" | "ready" | "processing" | "error";

const ENHANCE_FILTERS: Record<Enhance, string> = {
  original: "none",
  grayscale: "grayscale(1) contrast(1.1)",
  bw: "grayscale(1) contrast(2.3) brightness(1.18)",
};
const ENHANCE_LABELS: Record<Enhance, string> = { original: "Color", grayscale: "Grayscale", bw: "B&W" };
const MAX_OUTPUT_DIM = 1800; // longest side, px — keeps a 10-15MB phone photo down to a few hundred KB
const JPEG_QUALITY = 0.78;
const DISPLAY_WIDTH = 420; // fixed on-screen width for the crop preview

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function fallbackCorners(w: number, h: number): Corners {
  const inset = Math.round(Math.min(w, h) * 0.04);
  return {
    topLeftCorner: { x: inset, y: inset },
    topRightCorner: { x: w - inset, y: inset },
    bottomLeftCorner: { x: inset, y: h - inset },
    bottomRightCorner: { x: w - inset, y: h - inset },
  };
}
// Rectified output size from the quadrilateral's own on-image dimensions,
// so a landscape ID card doesn't get forced into a portrait frame.
function outputSize(c: Corners): { w: number; h: number } {
  const w = Math.round((dist(c.topLeftCorner, c.topRightCorner) + dist(c.bottomLeftCorner, c.bottomRightCorner)) / 2);
  const h = Math.round((dist(c.topLeftCorner, c.bottomLeftCorner) + dist(c.topRightCorner, c.bottomRightCorner)) / 2);
  return { w: Math.max(w, 80), h: Math.max(h, 80) };
}

interface Props {
  file: File;
  onCancel: () => void;
  onConfirm: (scanned: File) => void;
}

export default function DocumentScanModal({ file, onCancel, onConfirm }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [detected, setDetected] = useState(true);
  const [corners, setCorners] = useState<Corners | null>(null);
  const [enhance, setEnhance] = useState<Enhance>("original");
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const objectUrl = useRef<string>(URL.createObjectURL(file));
  const imgRef = useRef<HTMLImageElement>(null); // hidden, natural-size — feeds OpenCV
  const containerRef = useRef<HTMLDivElement>(null); // visible crop-preview area

  useEffect(() => () => URL.revokeObjectURL(objectUrl.current), []);

  // Kicked off once the hidden <img> has actually decoded (naturalWidth/Height
  // available) — OpenCV needs real pixel data, not just a src attribute.
  const handleImageLoad = useCallback(async () => {
    const img = imgRef.current;
    if (!img) return;
    const width = img.naturalWidth, height = img.naturalHeight;
    setNaturalSize({ width, height });
    try {
      await loadOpenCv();
      const cv = (window as any).cv;
      const scanner = new jscanify();
      const mat = cv.imread(img);
      let nextCorners: Corners | null = null;
      try {
        const contour = scanner.findPaperContour(mat);
        if (contour) {
          const pts = scanner.getCornerPoints(contour) as Partial<Corners>;
          contour.delete();
          if (pts.topLeftCorner && pts.topRightCorner && pts.bottomLeftCorner && pts.bottomRightCorner) {
            nextCorners = pts as Corners;
          }
        }
      } finally {
        mat.delete();
      }
      if (nextCorners) {
        setDetected(true);
      } else {
        setDetected(false);
        nextCorners = fallbackCorners(width, height);
      }
      setCorners(nextCorners);
      setPhase("ready");
    } catch (e: any) {
      setError(e?.message || "Could not load the document scanner.");
      setPhase("error");
    }
  }, []);

  const displayScale = naturalSize.width > 0 ? Math.min(DISPLAY_WIDTH, naturalSize.width) / naturalSize.width : 1;
  const displayWidth = naturalSize.width * displayScale;
  const displayHeight = naturalSize.height * displayScale;

  function updateCorner(key: keyof Corners, clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp((clientX - rect.left) / displayScale, 0, naturalSize.width);
    const y = clamp((clientY - rect.top) / displayScale, 0, naturalSize.height);
    setCorners(prev => (prev ? { ...prev, [key]: { x, y } } : prev));
  }

  async function produceFinal(useOriginal: boolean): Promise<File> {
    const img = imgRef.current!;
    let sourceCanvas: HTMLCanvasElement;
    if (useOriginal || !corners) {
      sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = naturalSize.width;
      sourceCanvas.height = naturalSize.height;
      sourceCanvas.getContext("2d")!.drawImage(img, 0, 0);
    } else {
      const scanner = new jscanify();
      const { w, h } = outputSize(corners);
      const extracted = scanner.extractPaper(img, w, h, corners) as HTMLCanvasElement | null;
      if (!extracted) throw new Error("Could not extract the document — try adjusting the corners, or use the original photo.");
      sourceCanvas = extracted;
    }

    let { width, height } = sourceCanvas;
    if (Math.max(width, height) > MAX_OUTPUT_DIM) {
      const scale = MAX_OUTPUT_DIM / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = width;
    finalCanvas.height = height;
    const ctx = finalCanvas.getContext("2d")!;
    ctx.filter = ENHANCE_FILTERS[enhance];
    ctx.drawImage(sourceCanvas, 0, 0, width, height);

    const blob: Blob = await new Promise((resolve, reject) =>
      finalCanvas.toBlob(b => (b ? resolve(b) : reject(new Error("Compression failed"))), "image/jpeg", JPEG_QUALITY)
    );
    const base = file.name.replace(/\.[^.]+$/, "") || "document";
    return new File([blob], `${base}-scanned.jpg`, { type: "image/jpeg" });
  }

  async function handleConfirm(useOriginal: boolean) {
    setPhase("processing"); setError("");
    try {
      const scanned = await produceFinal(useOriginal);
      onConfirm(scanned);
    } catch (e: any) {
      setError(e?.message || "Scan failed — please try again or use the original photo.");
      setPhase("ready");
    }
  }

  const cornerKeys: (keyof Corners)[] = ["topLeftCorner", "topRightCorner", "bottomRightCorner", "bottomLeftCorner"];
  const polygonPoints = corners ? cornerKeys.map(k => `${corners[k].x * displayScale},${corners[k].y * displayScale}`).join(" ") : "";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="rounded-2xl p-5 w-full max-w-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "92vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <ScanLine size={16} /> Scan Document
          </h3>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X size={16} /></button>
        </div>

        {/* Hidden full-resolution image — OpenCV reads pixels from this */}
        <img ref={imgRef} src={objectUrl.current} onLoad={handleImageLoad} style={{ display: "none" }} alt="" />

        {phase === "loading" && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-ghost)", fontSize: 13 }}>
            Loading scanner (first time only)…
          </div>
        )}

        {phase === "error" && (
          <div style={{ padding: "16px 0" }}>
            <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>{error}</div>
            <button onClick={() => handleConfirm(true)} style={{ background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
              Upload Original Photo Instead
            </button>
          </div>
        )}

        {(phase === "ready" || phase === "processing") && corners && (
          <>
            {!detected && (
              <div style={{ marginBottom: 10, padding: "6px 10px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 8, fontSize: 11, color: "#fbbf24" }}>
                Couldn't auto-detect the document edges — drag the blue corners to match it.
              </div>
            )}
            {error && (
              <div style={{ marginBottom: 10, padding: "6px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 11, color: "#f87171" }}>{error}</div>
            )}

            <div ref={containerRef} style={{ position: "relative", width: displayWidth, height: displayHeight, margin: "0 auto 14px", touchAction: "none", borderRadius: 8, overflow: "hidden", background: "#000" }}>
              <img src={objectUrl.current} alt="" style={{ width: displayWidth, height: displayHeight, display: "block", filter: ENHANCE_FILTERS[enhance] }} draggable={false} />
              <svg width={displayWidth} height={displayHeight} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <polygon points={polygonPoints} fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeWidth={2} />
              </svg>
              {cornerKeys.map(key => (
                <div
                  key={key}
                  onPointerDown={e => { (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); }}
                  onPointerMove={e => { if (e.buttons === 1) updateCorner(key, e.clientX, e.clientY); }}
                  style={{
                    position: "absolute",
                    left: corners[key].x * displayScale - 11, top: corners[key].y * displayScale - 11,
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#38bdf8", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                    cursor: "grab", touchAction: "none",
                  }}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 }}>
              {(Object.keys(ENHANCE_LABELS) as Enhance[]).map(key => (
                <button key={key} type="button" onClick={() => setEnhance(key)}
                  style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: enhance === key ? "1px solid #38bdf8" : "1px solid var(--border)",
                    background: enhance === key ? "rgba(56,189,248,0.12)" : "var(--bg-hover)",
                    color: enhance === key ? "#38bdf8" : "var(--text-secondary)" }}>
                  {ENHANCE_LABELS[key]}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => handleConfirm(true)} disabled={phase === "processing"}
                style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "8px 14px", borderRadius: 8, cursor: phase === "processing" ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <RotateCcw size={12} /> Use Original
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={onCancel} disabled={phase === "processing"}
                  style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
                  Cancel
                </button>
                <button type="button" onClick={() => handleConfirm(false)} disabled={phase === "processing"}
                  style={{ background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, cursor: phase === "processing" ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 6, opacity: phase === "processing" ? 0.6 : 1 }}>
                  <Check size={13} /> {phase === "processing" ? "Processing…" : "Scan & Use"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
