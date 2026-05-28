import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listWebhooks, createWebhook, updateWebhook, deleteWebhook,
  rotateSecret, testWebhook, listDeliveries,
} from "../controllers/webhook.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/",                   listWebhooks);
router.post("/",                  createWebhook);
router.put("/:id",                updateWebhook);
router.delete("/:id",             deleteWebhook);
router.post("/:id/rotate-secret", rotateSecret);
router.post("/:id/test",          testWebhook);
router.get("/:id/deliveries",     listDeliveries);

export default router;
