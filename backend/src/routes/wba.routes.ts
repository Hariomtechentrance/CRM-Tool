import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import { requireModuleAccess } from "../middleware/requireModuleAccess";
import {
  listProjects, getProject, createProject, updateProject,
  addMember, removeMember,
  listOpportunities, convertOpportunity,
  getMyProjects, getMyAccessLevel,
} from "../controllers/wba.controller";

const router = Router();
router.use(authenticate, requireOrgContext, requireModuleAccess("WBA"));

router.get("/me",                             getMyAccessLevel);
router.get("/projects",                       listProjects);
router.post("/projects",                      createProject);
router.get("/projects/my",                    getMyProjects);
router.get("/projects/:id",                   getProject);
router.put("/projects/:id",                   updateProject);
router.post("/projects/:id/members",          addMember);
router.delete("/projects/:id/members/:memberId", removeMember);

router.get("/opportunities",                  listOpportunities);
router.post("/opportunities/:quotationId/convert", convertOpportunity);

export default router;
