import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import { listRules, createRule, updateRule, deleteRule, toggleRule } from "../controllers/automation.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/",             listRules);
router.post("/",            createRule);
router.patch("/:id",        updateRule);
router.patch("/:id/toggle", toggleRule);
router.delete("/:id",       deleteRule);

export default router;
