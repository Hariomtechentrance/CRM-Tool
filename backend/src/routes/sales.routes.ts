import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listSalesOrders, getSalesOrder, createSalesOrder, updateSalesOrderStatus,
  listShipments, createShipment, updateShipmentStatus,
} from "../controllers/sales.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/shipments", listShipments);
router.post("/shipments", createShipment);
router.patch("/shipments/:id/status", updateShipmentStatus);

router.get("/", listSalesOrders);
router.post("/", createSalesOrder);
router.get("/:id", getSalesOrder);
router.patch("/:id/status", updateSalesOrderStatus);

export default router;
