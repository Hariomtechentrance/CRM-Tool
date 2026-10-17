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

// ═══════════════════════════════════════════════════════════════
// Cars module sub-sections — Buyer Leads / Seller Leads / Vehicles &
// Insurance each independently grantable, so an org admin can give a user
// access to just one section instead of all-or-nothing on the whole Cars
// module. No schema change needed: moduleKey is a free-form string, so a
// sub-section is just stored as "CARS.<SECTION>" alongside the existing
// whole-module "CARS" key. A user holding the broad legacy "CARS" grant (or
// OWNER/ADMIN) still sees every section — this only adds a narrower option,
// it doesn't take anything away from whoever already had full Cars access.
//
// Some Cars routes (buyer/seller leads both live under /leads, split only
// by the `leadType` column, not the URL) can't be gated by route alone —
// those controllers call hasCarsSectionAccess()/assertCarsSection()
// directly once they know which leadType a given request/record is. Routes
// that are unambiguous (vehicles, insurance, historical stats) use
// requireCarsSection() as router middleware instead.
export type CarsSection = "BUYER" | "SELLER" | "VEHICLES_INSURANCE";
export const CARS_SECTION_LABEL: Record<CarsSection, string> = {
  BUYER: "Buyer Leads", SELLER: "Seller Leads", VEHICLES_INSURANCE: "Vehicles & Insurance",
};
const ALL_CARS_SECTIONS: CarsSection[] = ["BUYER", "SELLER", "VEHICLES_INSURANCE"];

export async function hasCarsSectionAccess(req: OrgRequest, section: CarsSection): Promise<boolean> {
  const role = req.memberRole;
  if (role === MemberRole.OWNER || role === MemberRole.ADMIN) return true;
  const cacheKey = `modaccess:${req.userId}:${req.organizationId}:CARS.${section}`;
  const cached = apiCache.get<boolean>(cacheKey);
  if (cached !== undefined) return cached;
  const grant = await prisma.userModuleAccess.findFirst({
    where: {
      userId: req.userId!,
      organizationId: req.organizationId!,
      moduleKey: { in: ["CARS", `CARS.${section}`] },
    },
    select: { id: true },
  });
  const has = !!grant;
  apiCache.set(cacheKey, has, MODULE_ACCESS_TTL_MS);
  return has;
}

// For cross-section endpoints (org-wide stats/reports) that should be
// reachable by anyone with at least one Cars sub-section, not gated to a
// single one.
export async function hasAnyCarsSectionAccess(req: OrgRequest): Promise<boolean> {
  const role = req.memberRole;
  if (role === MemberRole.OWNER || role === MemberRole.ADMIN) return true;
  for (const section of ALL_CARS_SECTIONS) {
    if (await hasCarsSectionAccess(req, section)) return true;
  }
  return false;
}

export function requireCarsSection(section: CarsSection) {
  return async (req: OrgRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(await hasCarsSectionAccess(req, section))) {
        forbidden(res, `You do not have access to the Cars — ${CARS_SECTION_LABEL[section]} section.`);
        return;
      }
      next();
    } catch {
      forbidden(res, "Access check failed.");
    }
  };
}

export function requireAnyCarsSection() {
  return async (req: OrgRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(await hasAnyCarsSectionAccess(req))) {
        forbidden(res, "You do not have access to the Cars module.");
        return;
      }
      next();
    } catch {
      forbidden(res, "Access check failed.");
    }
  };
}

// For the shared /leads/:id-style controllers: call once the record's
// leadType (hence its section) is known, after fetching it. Sends the 403
// response itself and returns false so the caller can just `if (!ok) return`.
export async function assertCarsSection(req: OrgRequest, res: Response, section: CarsSection): Promise<boolean> {
  if (await hasCarsSectionAccess(req, section)) return true;
  forbidden(res, `You do not have access to the Cars — ${CARS_SECTION_LABEL[section]} section.`);
  return false;
}
