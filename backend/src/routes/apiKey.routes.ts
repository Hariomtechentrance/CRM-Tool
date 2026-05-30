import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import { createApiKey, listApiKeys, revokeApiKey, getScopes } from "../controllers/apiKey.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/scopes",  getScopes);
router.get("/",        listApiKeys);
router.post("/",       createApiKey);
router.delete("/:id",  revokeApiKey);

export default router;
