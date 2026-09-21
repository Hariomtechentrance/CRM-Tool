import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import { requireModuleAccess } from "../middleware/requireModuleAccess";
import {
  listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
  listMeasurementProfiles, createMeasurementProfile, updateMeasurementProfile, deleteMeasurementProfile,
  listOrders, getOrder, createOrder, updateOrder, deleteOrder,
  getTailoringStats, listDueOrders,
} from "../controllers/tailoring.controller";

const router = Router();
router.use(authenticate, requireOrgContext, requireModuleAccess("TAILORING"));

router.get("/stats",    getTailoringStats);
router.get("/due",      listDueOrders);

router.get("/customers",           listCustomers);
router.post("/customers",          createCustomer);
router.get("/customers/:id",       getCustomer);
router.patch("/customers/:id",     updateCustomer);
router.delete("/customers/:id",    deleteCustomer);

router.get("/measurement-profiles",       listMeasurementProfiles);
router.post("/measurement-profiles",      createMeasurementProfile);
router.patch("/measurement-profiles/:id", updateMeasurementProfile);
router.delete("/measurement-profiles/:id",deleteMeasurementProfile);

router.get("/orders",           listOrders);
router.post("/orders",          createOrder);
router.get("/orders/:id",       getOrder);
router.patch("/orders/:id",     updateOrder);
router.delete("/orders/:id",    deleteOrder);

export default router;
