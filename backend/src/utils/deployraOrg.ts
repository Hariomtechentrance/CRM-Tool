import { prisma } from "../lib/prisma";

/**
 * Deployra Private Limited (our own org) — CRM only tracks Customers, no
 * Supplier concept. Matches the same resilient id/slug/name pattern as
 * isWBAOrg. The UI hint lives in frontend/src/lib/org.ts; this is the
 * actual enforcement.
 */
export function isDeployraOrg(
  org: { id: string; slug: string | null; name: string | null } | null | undefined,
): boolean {
  if (!org) return false;
  return (
    org.id === "cmtwpl9wt0000yojyu7he2z6n" ||
    (org.slug ?? "").toLowerCase() === "deployra-private-limited" ||
    (org.name ?? "").trim().toLowerCase() === "deployra private limited"
  );
}

/** Same check, given only an organization id. */
export async function isDeployraOrgId(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, slug: true, name: true },
  });
  return isDeployraOrg(org);
}

/**
 * Deployra's "fresh/raw leads" pool (unassigned, just-imported) is only
 * visible to Sales + Admin/Manager — everyone else only sees leads already
 * assigned to them (enforced in leads.controller.ts listLeads). "Sales" has
 * no dedicated role in the schema, so — same resilient-match idea as WBA's
 * designation list in frontend/src/lib/org.ts — it's identified by the
 * linked Employee's designation containing "sales", case-insensitive.
 */
export async function isDeployraSalesEmployee(userId: string | undefined, organizationId: string): Promise<boolean> {
  if (!userId) return false;
  const employee = await prisma.employee.findFirst({
    where: { organizationId, userId },
    select: { designation: true },
  });
  return (employee?.designation ?? "").toLowerCase().includes("sales");
}

/**
 * Deployra: assigning/removing a developer on a Project converted from a
 * lead is restricted to Owner/Admin/Manager or whoever is marked as the
 * Project Manager (Employee.orgRole) — enforced in projects.controller.ts
 * upsertProjectMember/removeProjectMember.
 */
export async function isDeployraProjectManagerEmployee(userId: string | undefined, organizationId: string): Promise<boolean> {
  if (!userId) return false;
  const employee = await prisma.employee.findFirst({
    where: { organizationId, userId },
    select: { orgRole: true },
  });
  return (employee?.orgRole ?? "").toUpperCase() === "PROJECT_MANAGER";
}
