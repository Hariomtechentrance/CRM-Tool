import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import { getBranding, updateBranding } from "../controllers/branding.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/",   getBranding);
router.patch("/", updateBranding);

export default router;
