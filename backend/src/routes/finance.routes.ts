import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  addPayment, listPayments, deletePayment, getFinanceSummary,
  listRecurringInvoices, createRecurringInvoice, updateRecurringInvoice, deleteRecurringInvoice,
} from "../controllers/finance.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/summary", getFinanceSummary);
router.get("/payments", listPayments);
router.post("/payments", addPayment);
router.delete("/payments/:id", deletePayment);

router.get("/", listInvoices);
router.post("/", createInvoice);
router.get("/:id", getInvoice);
router.patch("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);

// Recurring invoices
router.get("/recurring/list", listRecurringInvoices);
router.post("/recurring", createRecurringInvoice);
router.patch("/recurring/:id", updateRecurringInvoice);
router.delete("/recurring/:id", deleteRecurringInvoice);

export default router;
