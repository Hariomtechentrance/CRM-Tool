import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listLeads, getLead, createLead, updateLead, addLeadActivity,
  listCampaigns, createCampaign, getLeadStats,
} from "../controllers/leads.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/stats", getLeadStats);
router.get("/campaigns", listCampaigns);
router.post("/campaigns", createCampaign);

router.get("/", listLeads);
router.post("/", createLead);
router.get("/:id", getLead);
router.patch("/:id", updateLead);
router.post("/:id/activities", addLeadActivity);

export default router;
