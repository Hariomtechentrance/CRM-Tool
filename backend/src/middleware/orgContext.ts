import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "./auth";
import { MemberRole } from "@prisma/client";
import { forbidden, notFound } from "../utils/response";
import { apiCache } from "../lib/cache";

export interface OrgRequest extends AuthRequest {
  organizationId?: string;
  memberRole?: MemberRole;
}

// Short-lived cache of (org active? / member active+role?) so this doesn't
// cost two DB round trips on EVERY authenticated request across the whole
// app — same idea and TTL as auth.ts's usersec cache. A role change or
// removal takes up to this TTL to take effect instead of immediately; that
// trade is already made the same way for account deactivation in auth.ts.
interface OrgCtxState { orgActive: boolean; memberActive: boolean; memberRole: MemberRole | null }
const ORG_CTX_TTL_MS = 15_000;

async function loadOrgCtxState(userId: string, orgId: string): Promise<OrgCtxState | null> {
  const cacheKey = `orgctx:${userId}:${orgId}`;
  const hit = apiCache.get<OrgCtxState>(cacheKey);
  if (hit) return hit;

  // Independent reads — no reason to pay for them one after another. This is
  // the same fix already applied to the login flow, just for the check that
  // now runs on every single request instead of once at sign-in.
  const [org, member] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { isActive: true } }),
    prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      select: { isActive: true, role: true },
    }),
  ]);
  if (!org) return null;

  const state: OrgCtxState = {
    orgActive: org.isActive,
    memberActive: member?.isActive ?? false,
    memberRole: member?.role ?? null,
  };
  apiCache.set(cacheKey, state, ORG_CTX_TTL_MS);
  return state;
}

// Call after any change that must take effect immediately (role change,
// membership removed, org deactivated) to drop the cached state.
export function invalidateOrgCtxState(userId: string, orgId: string): void {
  apiCache.del(`orgctx:${userId}:${orgId}`);
}

// Reads x-organization-id header, verifies user is a member, attaches to request
export async function requireOrgContext(
  req: OrgRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const orgId = req.headers["x-organization-id"] as string;
  if (!orgId) {
    forbidden(res, "Organization context required. Send x-organization-id header.");
    return;
  }
  const state = await loadOrgCtxState(req.userId!, orgId);
  if (!state || !state.orgActive) {
    notFound(res, "Organization not found");
    return;
  }
  if (!state.memberActive || !state.memberRole) {
    forbidden(res, "You are not a member of this organization");
    return;
  }
  req.organizationId = orgId;
  req.memberRole = state.memberRole;

  // ── Read-only role enforcement ──────────────────────────────
  // VIEWER is the lowest role and is defined as read-only, but almost no route
  // file adds an explicit requireRole, so without this a VIEWER member could
  // POST/PUT/PATCH/DELETE across the whole app. Block write verbs for VIEWER at
  // the context layer; a short allowlist keeps genuinely personal actions
  // (marking notifications read, registering a push token, posting a comment,
  // running a search/export) working.
  if (state.memberRole === MemberRole.VIEWER && WRITE_METHODS.has(req.method)) {
    const p = req.baseUrl + req.path;
    const allowed = VIEWER_WRITE_ALLOW.some((frag) => p.includes(frag));
    if (!allowed) {
      forbidden(res, "Your role is read-only in this organization.");
      return;
    }
  }
  next();
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// Path fragments a VIEWER may still write to (self-scoped / non-destructive).
const VIEWER_WRITE_ALLOW = [
  "/notifications",
  "/push",
  "/comments",
  "/search",
  "/time-tracking",
  "/2fa",
  "/sessions",
];

const roleHierarchy: Record<MemberRole, number> = {
  OWNER: 6,
  ADMIN: 5,
  MANAGER: 4,
  ACCOUNTANT: 3,
  STAFF: 2,
  VIEWER: 1,
};

export function requireRole(...roles: MemberRole[]) {
  return (req: OrgRequest, res: Response, next: NextFunction): void => {
    const role = req.memberRole;
    if (!role || !roles.some((r) => roleHierarchy[role] >= roleHierarchy[r])) {
      forbidden(res, "Insufficient permissions");
      return;
    }
    next();
  };
}
