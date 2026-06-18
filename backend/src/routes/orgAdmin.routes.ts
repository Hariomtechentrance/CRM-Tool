import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext, requireRole } from "../middleware/orgContext";
import { getOrgAdminStats, getOrgActivity, getTeamActivity, getAuditLogs, getModuleStats, getAlerts, getChartData } from "../controllers/orgAdmin.controller";

const router = Router();
router.use(authenticate, requireOrgContext, requireRole("ADMIN"));

router.get("/stats",         getOrgAdminStats);
router.get("/activity",      getOrgActivity);
router.get("/team",          getTeamActivity);
router.get("/audit-logs",    getAuditLogs);
router.get("/module-stats",  getModuleStats);
router.get("/alerts",        getAlerts);
router.get("/charts",        getChartData);

export default router;
