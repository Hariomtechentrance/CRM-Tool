import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { unauthorized } from "../utils/response";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  isSuperAdmin?: boolean;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    unauthorized(res);
    return;
  }
  const token = header.split(" ")[1];
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    req.isSuperAdmin = payload.isSuperAdmin;
    next();
  } catch {
    unauthorized(res, "Invalid or expired token");
  }
}
