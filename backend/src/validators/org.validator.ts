import { z } from "zod";
import { BusinessType, MemberRole } from "@prisma/client";

export const createOrgSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  businessType: z.nativeEnum(BusinessType).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  currency: z.string().optional(),
  taxId: z.string().optional(),
  iecCode: z.string().optional(),
  panNumber: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  enabledModules: z.array(z.string()).optional().default([]),
});

// partial() but without default on enabledModules — prevents clearing modules on profile save
export const updateOrgSchema = createOrgSchema.omit({ enabledModules: true }).partial().extend({
  enabledModules: z.array(z.string()).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(MemberRole).default("STAFF"),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(MemberRole),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
