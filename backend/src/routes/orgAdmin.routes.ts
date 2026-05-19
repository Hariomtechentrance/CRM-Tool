import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import { getOrgAdminStats, getOrgActivity, getTeamActivity, getAuditLogs, getModuleStats, getAlerts } from "../controllers/orgAdmin.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/stats",         getOrgAdminStats);
router.get("/activity",      getOrgActivity);
router.get("/team",          getTeamActivity);
router.get("/audit-logs",    getAuditLogs);
router.get("/module-stats",  getModuleStats);
router.get("/alerts",        getAlerts);

export default router;
