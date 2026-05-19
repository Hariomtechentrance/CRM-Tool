import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "./auth";
import { MemberRole } from "@prisma/client";
import { forbidden, notFound } from "../utils/response";

export interface OrgRequest extends AuthRequest {
  organizationId?: string;
  memberRole?: MemberRole;
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
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org || !org.isActive) {
    notFound(res, "Organization not found");
    return;
  }
  const member = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: req.userId!, organizationId: orgId } },
  });
  if (!member || !member.isActive) {
    forbidden(res, "You are not a member of this organization");
    return;
  }
  req.organizationId = orgId;
  req.memberRole = member.role;
  next();
}

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
