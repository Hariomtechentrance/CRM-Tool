import { Request, Response, NextFunction } from "express";
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
