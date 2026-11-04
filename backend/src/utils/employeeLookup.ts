import { prisma } from "../lib/prisma";

/**
 * "Assign To" fields across the app (Lead.assignedToId, CarLead.assignedToId,
 * Vehicle.assignedToId, ...) store the Employee.id of whoever was picked in
 * the Assign To dropdown (that dropdown is populated from
 * GET /organizations/current/directory, which returns Employee rows) — NOT
 * the User.id the logged-in caller is authenticated as. Any "only show me
 * what's assigned to me" check must resolve the caller's own User.id to
 * their Employee.id first, or it will never match a real assignment.
 */
export async function getEmployeeIdForUser(userId: string | undefined, organizationId: string): Promise<string | null> {
  if (!userId) return null;
  const employee = await prisma.employee.findFirst({
    where: { organizationId, userId },
    select: { id: true },
  });
  return employee?.id ?? null;
}
