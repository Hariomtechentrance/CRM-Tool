import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listProjects, getProject, createProject, updateProject,
  listTasks, createTask, updateTask, addTaskComment,
} from "../controllers/projects.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/tasks", listTasks);
router.post("/tasks", createTask);
router.patch("/tasks/:id", updateTask);
router.post("/tasks/:id/comments", addTaskComment);

router.get("/", listProjects);
router.post("/", createProject);
router.get("/:id", getProject);
router.patch("/:id", updateProject);

export default router;
