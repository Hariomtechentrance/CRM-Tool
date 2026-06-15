import { Request, Response, NextFunction } from "express";

// Patterns that signal injection or XSS attempts
const SCRIPT_TAG     = /<\/?script\b[^>]*>/gi;
const DANGEROUS_TAGS = /<\/?(iframe|object|embed|form|base|applet|svg|xml|math)\b[^>]*>/gi;
const EVENT_HANDLERS = /\bon\w+\s*=/gi;
const JAVASCRIPT_URI = /javascript\s*:/gi;
const DATA_URI_HTML  = /data\s*:\s*text\s*\/\s*html/gi;
const NULL_BYTES     = /\x00/g;
const NOSQL_OPS      = /^\$|^\./;  // Keys starting with $ or . (MongoDB/NoSQL operators)

function sanitizeString(val: string): string {
  return val
    .replace(NULL_BYTES,     "")        // null byte injection
    .replace(SCRIPT_TAG,     "")        // <script> tags
    .replace(DANGEROUS_TAGS, "")        // dangerous HTML tags
    .replace(EVENT_HANDLERS, "")        // onclick=, onload=, etc.
    .replace(JAVASCRIPT_URI, "")        // javascript: URIs
    .replace(DATA_URI_HTML,  "");       // data:text/html URIs
}

function sanitizeValue(val: unknown, depth = 0): unknown {
  // Prevent deeply nested payloads from DoS-ing the sanitizer
  if (depth > 10) return val;

  if (typeof val === "string") return sanitizeString(val);

  if (Array.isArray(val)) {
    return val.map(item => sanitizeValue(item, depth + 1));
  }

  if (val !== null && typeof val === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(val as Record<string, unknown>)) {
      // Block NoSQL injection operators ($gt, $where, etc.) and path traversal (.)
      if (NOSQL_OPS.test(key)) continue;
      result[key] = sanitizeValue((val as Record<string, unknown>)[key], depth + 1);
    }
    return result;
  }

  return val;
}

/**
 * Sanitizes req.body and req.query to strip:
 *   - XSS vectors (<script>, event handlers, javascript: URIs)
 *   - Null bytes
 *   - NoSQL injection operators ($gt, $where, etc.)
 *
 * This runs BEFORE route handlers so every controller is protected.
 * Note: File uploads (multipart) are skipped — they are handled separately.
 */
export function sanitizeInputs(req: Request, _res: Response, next: NextFunction): void {
  const ct = req.headers["content-type"] || "";
  // Skip multipart/form-data (file uploads) — handled by multer
  if (!ct.includes("multipart/form-data")) {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeValue(req.body);
    }
  }
  // Always sanitize query params
  // Express 5 defines req.query as a read-only getter, so use defineProperty to shadow it
  if (req.query && typeof req.query === "object") {
    Object.defineProperty(req, "query", {
      value: sanitizeValue(req.query) as typeof req.query,
      writable: true,
      configurable: true,
    });
  }
  next();
}

/**
 * Validates that POST/PUT/PATCH requests declare application/json.
 * Rejects requests where the Content-Type is missing or wrong type.
 * (multipart and form-urlencoded are explicitly allowed for file uploads)
 */
export function enforceContentType(req: Request, res: Response, next: NextFunction): void {
  const method = req.method;
  if (!["POST", "PUT", "PATCH"].includes(method)) { next(); return; }

  const ct = (req.headers["content-type"] || "").toLowerCase();
  const allowed =
    ct.includes("application/json") ||
    ct.includes("multipart/form-data") ||
    ct.includes("application/x-www-form-urlencoded");

  if (!allowed) {
    res.status(415).json({ success: false, message: "Unsupported Media Type. Use application/json." });
    return;
  }
  next();
}
