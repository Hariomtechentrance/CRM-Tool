import { Response } from "express";

export function ok(res: Response, data: unknown, message = "Success") {
  return res.status(200).json({ success: true, message, data });
}

export function created(res: Response, data: unknown, message = "Created successfully") {
  return res.status(201).json({ success: true, message, data });
}

export function badRequest(res: Response, message: string, errors?: unknown) {
  return res.status(400).json({ success: false, message, errors });
}

export function unauthorized(res: Response, message = "Unauthorized") {
  return res.status(401).json({ success: false, message });
}

export function forbidden(res: Response, message = "Forbidden") {
  return res.status(403).json({ success: false, message });
}

export function notFound(res: Response, message = "Not found") {
  return res.status(404).json({ success: false, message });
}

export function conflict(res: Response, message: string) {
  return res.status(409).json({ success: false, message });
}

export function serverError(res: Response, error: unknown) {
  console.error("Server error:", error);
  return res.status(500).json({ success: false, message: "Internal server error" });
}
