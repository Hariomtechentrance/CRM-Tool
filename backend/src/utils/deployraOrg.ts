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
