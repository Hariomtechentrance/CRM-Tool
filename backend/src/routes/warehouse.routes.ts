import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listWarehouses, createWarehouse, updateWarehouse,
  createTransfer, completeTransfer, listTransfers,
} from "../controllers/warehouse.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/transfers", listTransfers);
router.post("/transfers", createTransfer);
router.patch("/transfers/:id/complete", completeTransfer);

router.get("/", listWarehouses);
router.post("/", createWarehouse);
router.patch("/:id", updateWarehouse);

export default router;
