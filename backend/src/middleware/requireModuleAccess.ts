import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { OrgRequest } from "./orgContext";
import { MemberRole } from "@prisma/client";
import { forbidden } from "../utils/response";
import { apiCache } from "../lib/cache";

// Same short-TTL cache convention as orgContext.ts's usersec/orgctx caches —
// a non-OWNER/ADMIN hits this on every request to a module-gated route, so an
// uncached lookup here is a third DB round trip stacked on top of auth's and
// orgContext's on every single page load for most non-admin staff accounts.
const MODULE_ACCESS_TTL_MS = 15_000;

/**
 * Middleware that enforces module-level access control on the backend.
 * OWNER and ADMIN always pass through.
 * For all other roles the user must have an approved UserModuleAccess record
 * for the given moduleKey in the active organisation.
 */
export function requireModuleAccess(moduleKey: string) {
  return async (req: OrgRequest, res: Response, next: NextFunction): Promise<void> => {
    const role = req.memberRole;

    // OWNER / ADMIN bypass module checks — they can see everything
    if (role === MemberRole.OWNER || role === MemberRole.ADMIN) {
      next(); return;
    }

    // Everyone else must have an explicit module grant
    try {
      const cacheKey = `modaccess:${req.userId}:${req.organizationId}:${moduleKey}`;
      let hasGrant = apiCache.get<boolean>(cacheKey);
      if (hasGrant === undefined) {
        const grant = await prisma.userModuleAccess.findUnique({
          where: {
            userId_organizationId_moduleKey: {
              userId: req.userId!,
              organizationId: req.organizationId!,
              moduleKey,
            },
          },
          select: { id: true },
        });
        hasGrant = !!grant;
        apiCache.set(cacheKey, hasGrant, MODULE_ACCESS_TTL_MS);
      }

      if (!hasGrant) {
        forbidden(res, `You do not have access to the ${moduleKey} module.`);
        return;
      }
      next();
    } catch {
      forbidden(res, "Access check failed.");
    }
  };
}
