import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listPurchaseOrders, getPurchaseOrder, createPurchaseOrder,
  updatePurchaseOrderStatus, deletePurchaseOrder,
} from "../controllers/purchase.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/", listPurchaseOrders);
router.post("/", createPurchaseOrder);
router.get("/:id", getPurchaseOrder);
router.patch("/:id/status", updatePurchaseOrderStatus);
router.delete("/:id", deletePurchaseOrder);

export default router;
