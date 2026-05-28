import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import { listBudgets, createBudget, updateBudget, deleteBudget, updateBudgetItem, getBudgetSummary } from "../controllers/budget.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/",                  listBudgets);
router.get("/summary",           getBudgetSummary);
router.post("/",                 createBudget);
router.patch("/:id",             updateBudget);
router.delete("/:id",            deleteBudget);
router.patch("/items/:itemId",   updateBudgetItem);

export default router;
