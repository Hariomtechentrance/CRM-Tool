import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listCategories, createCategory, updateCategory, deleteCategory,
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
  addStockMovement, listMovements, getInventorySummary,
} from "../controllers/inventory.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/summary", getInventorySummary);

router.get("/categories", listCategories);
router.post("/categories", createCategory);
router.patch("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

router.get("/movements", listMovements);
router.post("/movements", addStockMovement);

router.get("/", listProducts);
router.post("/", createProduct);
router.get("/:id", getProduct);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
