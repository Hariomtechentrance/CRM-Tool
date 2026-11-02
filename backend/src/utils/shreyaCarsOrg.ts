import { prisma } from "../lib/prisma";

/**
 * Shreya Cars — resilient id/slug/name match, same pattern as isWBAOrg /
 * isDeployraOrg.
 */
export function isShreyaCarsOrg(
  org: { id: string; slug: string | null; name: string | null } | null | undefined,
): boolean {
  if (!org) return false;
  return (
    org.id === "cmtwopdf700002tgratd6cymj" ||
    (org.slug ?? "").toLowerCase() === "shreya-cars" ||
    (org.name ?? "").trim().toLowerCase() === "shreya cars"
  );
}

/** Same check, given only an organization id. */
export async function isShreyaCarsOrgId(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, slug: true, name: true },
  });
  return isShreyaCarsOrg(org);
}
