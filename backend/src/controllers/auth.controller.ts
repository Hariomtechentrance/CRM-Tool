import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshExpiryDate,
} from "../lib/jwt";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validator";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  conflict,
  serverError,
  notFound,
} from "../utils/response";
import { sendEmail, verifyEmailTemplate, resetPasswordTemplate } from "../utils/email";
import { AuthRequest } from "../middleware/auth";

// ── In-memory login lockout ──────────────────────────────────
// Resets on process restart — acceptable for a single-process deployment.
const _failMap = new Map<string, { count: number; lockUntil: number }>();
const MAX_FAIL   = 5;
const LOCK_MS    = 15 * 60 * 1000; // 15 minutes

function isLocked(email: string): boolean {
  const e = _failMap.get(email);
  if (!e) return false;
  if (e.lockUntil && Date.now() < e.lockUntil) return true;
  _failMap.delete(email); // lock expired
  return false;
}
function recordFail(email: string): void {
  const e = _failMap.get(email) ?? { count: 0, lockUntil: 0 };
  e.count++;
  if (e.count >= MAX_FAIL) { e.lockUntil = Date.now() + LOCK_MS; e.count = 0; }
  _failMap.set(email, e);
}
function clearFail(email: string): void { _failMap.delete(email); }

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      badRequest(res, "Validation failed", parsed.error.flatten().fieldErrors);
      return;
    }
    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      conflict(res, "An account with this email already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    // In dev mode never require email verification — sendEmail() is a no-op so the catch never fires
    const smtpConfigured = process.env.NODE_ENV === "production" && !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    const emailVerifyToken = smtpConfigured ? uuidv4() : null;

    const user = await prisma.user.create({
      data: {
        name, email, password: hashedPassword,
        emailVerifyToken,
        isEmailVerified: !smtpConfigured, // auto-verify if SMTP not configured
      },
    });

    if (smtpConfigured) {
      try {
        await sendEmail({
          to: email,
          subject: "Verify your BL-CRM account",
          html: verifyEmailTemplate(name, emailVerifyToken!),
        });
      } catch (emailErr) {
        console.error("[Register] Email failed, auto-verifying user:", emailErr);
        await prisma.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true, emailVerifyToken: null },
        });
      }
    }

    const message = smtpConfigured
      ? "Account created. Please verify your email."
      : "Account created. You can log in immediately.";

    created(res, { id: user.id, name: user.name, email: user.email }, message);
  } catch (err) {
    serverError(res, err);
  }
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.query as { token: string };
    if (!token) { badRequest(res, "Token is required"); return; }

    const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });
    if (!user) { badRequest(res, "Invalid or expired verification token"); return; }

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null },
    });

    ok(res, null, "Email verified successfully. You can now log in.");
  } catch (err) {
    serverError(res, err);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      badRequest(res, "Validation failed", parsed.error.flatten().fieldErrors);
      return;
    }
    const { email, password } = parsed.data;

    // Lockout check — must happen before DB lookup to avoid timing leaks
    if (isLocked(email)) {
      unauthorized(res, "Too many failed attempts. Account locked for 15 minutes.");
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      recordFail(email);
      unauthorized(res, "Invalid email or password");
      return;
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      recordFail(email);
      unauthorized(res, "Invalid email or password");
      return;
    }

    clearFail(email); // successful auth — reset counter

    if (!user.isEmailVerified && process.env.NODE_ENV === "production") {
      unauthorized(res, "Please verify your email before logging in");
      return;
    }
    // Auto-verify on first login in dev mode
    if (!user.isEmailVerified && process.env.NODE_ENV !== "production") {
      await prisma.user.update({ where: { id: user.id }, data: { isEmailVerified: true, emailVerifyToken: null } });
    }

    // Fetch user's organizations
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id, isActive: true },
      include: { organization: { select: { id: true, name: true, slug: true, logo: true, currency: true, country: true, businessType: true, isActive: true, enabledModules: true } } },
    });

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    });

    const tokenId = uuidv4();
    const refreshToken = signRefreshToken({ userId: user.id, tokenId });

    await prisma.refreshToken.create({
      data: { id: tokenId, token: refreshToken, userId: user.id, expiresAt: getRefreshExpiryDate() },
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    ok(res, {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, isSuperAdmin: user.isSuperAdmin },
      organizations: memberships.map((m) => ({
        ...m.organization,
        role: m.role,
      })),
    });
  } catch (err) {
    serverError(res, err);
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const parsed = refreshTokenSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Refresh token required"); return; }

    const { refreshToken: token } = parsed.data;
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      unauthorized(res, "Invalid or expired refresh token");
      return;
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      unauthorized(res, "Refresh token expired or revoked");
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) { unauthorized(res); return; }

    // Rotate: delete old, issue new
    await prisma.refreshToken.delete({ where: { token } });

    const newAccessToken = signAccessToken({ userId: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin });
    const newTokenId = uuidv4();
    const newRefreshToken = signRefreshToken({ userId: user.id, tokenId: newTokenId });

    await prisma.refreshToken.create({
      data: { id: newTokenId, token: newRefreshToken, userId: user.id, expiresAt: getRefreshExpiryDate() },
    });

    ok(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    serverError(res, err);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken: token } = req.body;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }
    ok(res, null, "Logged out successfully");
  } catch (err) {
    serverError(res, err);
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, avatar: true, isSuperAdmin: true, createdAt: true },
    });
    if (!user) { notFound(res, "User not found"); return; }
    ok(res, user);
  } catch (err) {
    serverError(res, err);
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Invalid email"); return; }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    // Always return same message to prevent user enumeration
    if (!user) { ok(res, null, "If this email exists, a reset link has been sent."); return; }

    const resetToken = uuidv4();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: resetToken, passwordResetExpiry: expiry },
    });

    await sendEmail({
      to: user.email,
      subject: "Reset your BL-CRM password",
      html: resetPasswordTemplate(user.name, resetToken),
    });

    ok(res, null, "If this email exists, a reset link has been sent.");
  } catch (err) {
    serverError(res, err);
  }
}

// One-time bootstrap: makes YOU super admin if no super admin exists yet
export async function claimSuperAdmin(req: AuthRequest, res: Response): Promise<void> {
  try {
    const existingSuperAdmin = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
    if (existingSuperAdmin) {
      res.status(403).json({ success: false, message: "A super admin already exists. Contact them to be granted access." });
      return;
    }
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { isSuperAdmin: true },
      select: { id: true, name: true, email: true, isSuperAdmin: true },
    });
    ok(res, { user: updated }, "You are now the Super Admin. Please log out and log back in.");
  } catch (err) {
    serverError(res, err);
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, "Validation failed", parsed.error.flatten().fieldErrors); return; }

    const { token, password } = parsed.data;
    const user = await prisma.user.findFirst({
      where: { passwordResetToken: token, passwordResetExpiry: { gt: new Date() } },
    });
    if (!user) { badRequest(res, "Invalid or expired reset token"); return; }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, passwordResetToken: null, passwordResetExpiry: null },
    });
    // Revoke all refresh tokens for security
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    ok(res, null, "Password reset successfully. Please log in.");
  } catch (err) {
    serverError(res, err);
  }
}
