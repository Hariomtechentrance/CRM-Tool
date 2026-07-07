import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireSuperAdmin } from "../middleware/superAdmin";
import {
  getSuperAdminStats, listAllOrganizations, getOrganizationDetail,
  updateOrganization, listAllUsers, createUser, toggleUserActive, makeSuperAdmin,
} from "../controllers/superAdmin.controller";
import { listDemoRequests, updateDemoRequest } from "../controllers/contact.controller";

const router = Router();
router.use(authenticate, requireSuperAdmin);

router.get("/stats",         getSuperAdminStats);
router.get("/organizations", listAllOrganizations);
router.get("/organizations/:id", getOrganizationDetail);
router.patch("/organizations/:id", updateOrganization);
router.get("/users",         listAllUsers);
router.post("/users",        createUser);
router.patch("/users/:id/toggle-active", toggleUserActive);
router.patch("/users/:id/super-admin",   makeSuperAdmin);

// Demo / access requests from landing page
router.get("/demo-requests",         listDemoRequests);
router.patch("/demo-requests/:id",   updateDemoRequest);

export default router;
