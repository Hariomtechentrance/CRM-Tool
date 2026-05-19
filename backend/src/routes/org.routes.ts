import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  createOrganization,
  getMyOrganizations,
  getOrganization,
  updateOrganization,
  inviteMember,
  getInviteInfo,
  acceptInvite,
  listMembers,
  updateMemberRole,
  removeMember,
} from "../controllers/org.controller";

const router = Router();

// Public — no auth required
router.get("/invite/info", getInviteInfo);

// All routes below require authentication
router.use(authenticate);

// No org context needed
router.post("/", createOrganization);
router.get("/", getMyOrganizations);
router.post("/invite/accept", acceptInvite);

// Org context required (x-organization-id header)
router.get("/current", requireOrgContext, getOrganization);
router.patch("/current", requireOrgContext, updateOrganization);
router.get("/current/members", requireOrgContext, listMembers);
router.post("/current/members/invite", requireOrgContext, inviteMember);
router.patch("/current/members/:memberId/role", requireOrgContext, updateMemberRole);
router.delete("/current/members/:memberId", requireOrgContext, removeMember);

export default router;
