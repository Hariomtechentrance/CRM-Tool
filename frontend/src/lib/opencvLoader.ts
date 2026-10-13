// Lazy-loads OpenCV.js (self-hosted at /vendor/opencv.js, ~9 MB) — only
// fetched the first time the document scanner actually opens, never on
// normal page loads. OpenCV.js is an Emscripten build: the script tag only
// parses the JS/WASM loader, the actual runtime finishes initializing
// asynchronously afterward, signaled via `cv.onRuntimeInitialized`.
let loadPromise: Promise<void> | null = null;

export function loadOpenCv(): Promise<void> {
  if (typeof window !== "undefined" && (window as any).cv?.Mat) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-opencv-loader="true"]') as HTMLScriptElement | null;
    const onReady = () => {
      const cv = (window as any).cv;
      if (!cv) { reject(new Error("OpenCV.js failed to load")); return; }
      if (cv.Mat) { resolve(); return; }
      cv["onRuntimeInitialized"] = () => resolve();
    };
    if (existing) { onReady(); return; }

    const script = document.createElement("script");
    script.src = "/vendor/opencv.js";
    script.async = true;
    script.dataset.opencvLoader = "true";
    script.onload = onReady;
    script.onerror = () => { loadPromise = null; reject(new Error("Could not load the document scanner (OpenCV.js failed to load)")); };
    document.head.appendChild(script);
  });

  return loadPromise;
}
