import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import { listFields, createField, updateField, deleteField, getValues, saveValues } from "../controllers/customField.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/",             listFields);
router.post("/",            createField);
router.patch("/:id",        updateField);
router.delete("/:id",       deleteField);

router.get("/values",       getValues);
router.post("/values",      saveValues);

export default router;
