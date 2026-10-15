import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { dbBreaker } from "../lib/circuitBreaker";

const DB_ERROR_PATTERNS = [
  "Can't reach database",
  "Connection refused",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "connection pool",
  "prepared statement",
];

export function errorHandler(
  err: Error & { type?: string; status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // A payload over express.json()'s size limit (e.g. a very large bulk-import
  // file) throws here rather than reaching the route — without this check it
  // fell through to the generic 500 below, which reads as an unexplained
  // server crash instead of "your file is too big."
  if (err.type === "entity.too.large") {
    res.status(413).json({ success: false, message: "This file is too large to upload in one go. Try splitting it into smaller batches." });
    return;
  }

  // Multer's own rejections (file too big, too many files, wrong field name)
  // throw here rather than reaching the controller — same deal, a document
  // upload that's simply over the 20MB cap was showing as a scary unexplained
  // "Internal server error" instead of telling the person why.
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 20MB)."
      : err.code === "LIMIT_FILE_COUNT" ? "Too many files at once (max 10)."
      : "Upload rejected: " + err.message;
    res.status(400).json({ success: false, message });
    return;
  }
  // The documents upload route's own fileFilter rejects an unsupported file
  // type by throwing a plain Error (not a MulterError) before the request
  // body is even parsed — same fix, surface the real reason instead of 500.
  if (err.message?.startsWith("File type not allowed:")) {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  const isDbError = DB_ERROR_PATTERNS.some((p) => err.message?.includes(p));
  if (isDbError) {
    dbBreaker.fail();
    console.error("[db-error]", err.message);
    if (!res.headersSent) {
      res.status(503).json({ success: false, message: "Database error — please retry shortly." });
      return;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.error("Unhandled error:", err);
  } else {
    console.error("[error]", err.message);
  }
  if (!res.headersSent) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
