import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import { listGoodsEntries, createGoodsEntry, updateGoodsEntry, deleteGoodsEntry } from "../controllers/goodsEntry.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/",        listGoodsEntries);
router.post("/",       createGoodsEntry);
router.patch("/:id",   updateGoodsEntry);
router.delete("/:id",  deleteGoodsEntry);

export default router;
