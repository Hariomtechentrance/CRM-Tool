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
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDbError = DB_ERROR_PATTERNS.some((p) => err.message?.includes(p));
  if (isDbError) {
    dbBreaker.fail();
    console.error("[db-error]", err.message);
    if (!res.headersSent) {
      res.status(503).json({ success: false, message: "Database error — please retry shortly." });
      return;
    }
  }

  console.error("Unhandled error:", err);
  if (!res.headersSent) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
