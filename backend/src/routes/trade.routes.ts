import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listTradeDocuments, getTradeDocument, createTradeDocument,
  updateTradeDocument, updateDocumentStatus, deleteTradeDocument, getTradeSummary,
} from "../controllers/trade.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/summary", getTradeSummary);

router.get("/", listTradeDocuments);
router.post("/", createTradeDocument);
router.get("/:id", getTradeDocument);
router.patch("/:id", updateTradeDocument);
router.patch("/:id/status", updateDocumentStatus);
router.delete("/:id", deleteTradeDocument);

export default router;
