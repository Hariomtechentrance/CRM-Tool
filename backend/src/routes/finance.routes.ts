import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listInvoices, getInvoice, createInvoice,
  addPayment, listPayments, getFinanceSummary,
} from "../controllers/finance.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/summary", getFinanceSummary);
router.get("/payments", listPayments);
router.post("/payments", addPayment);

router.get("/", listInvoices);
router.post("/", createInvoice);
router.get("/:id", getInvoice);

export default router;
