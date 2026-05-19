import { z } from "zod";
import { PartyType, CommunicationType } from "@prisma/client";

export const createPartySchema = z.object({
  type:             z.nativeEnum(PartyType).default("CUSTOMER"),
  name:             z.string().min(2, "Name must be at least 2 characters"),
  displayName:      z.string().optional(),
  email:            z.string().email("Invalid email").optional().or(z.literal("")),
  phone:            z.string().optional(),
  mobile:           z.string().optional(),
  website:          z.string().url("Invalid URL").optional().or(z.literal("")),
  address:          z.string().optional(),
  city:             z.string().optional(),
  state:            z.string().optional(),
  country:          z.string().optional(),
  pincode:          z.string().optional(),
  gstin:            z.string().optional(),
  pan:              z.string().optional(),
  iecCode:          z.string().optional(),
  currency:         z.string().optional(),
  creditLimit:      z.number().nonnegative().optional(),
  paymentTermsDays: z.number().int().nonnegative().optional(),
  bankName:         z.string().optional(),
  bankAccount:      z.string().optional(),
  bankIfsc:         z.string().optional(),
  bankBranch:       z.string().optional(),
  notes:            z.string().optional(),
});

export const updatePartySchema = createPartySchema.partial();

export const createContactSchema = z.object({
  name:        z.string().min(1, "Contact name is required"),
  designation: z.string().optional(),
  email:       z.string().email("Invalid email").optional().or(z.literal("")),
  phone:       z.string().optional(),
  mobile:      z.string().optional(),
  isPrimary:   z.boolean().optional(),
  notes:       z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const createCommunicationSchema = z.object({
  type:          z.nativeEnum(CommunicationType).default("NOTE"),
  subject:       z.string().optional(),
  description:   z.string().min(1, "Description is required"),
  outcome:       z.string().optional(),
  followUpDate:  z.string().datetime().optional().or(z.literal("")),
});

export const partyQuerySchema = z.object({
  type:   z.nativeEnum(PartyType).optional(),
  search: z.string().optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(20),
});

export type CreatePartyInput      = z.infer<typeof createPartySchema>;
export type CreateContactInput    = z.infer<typeof createContactSchema>;
export type CreateCommunicationInput = z.infer<typeof createCommunicationSchema>;
