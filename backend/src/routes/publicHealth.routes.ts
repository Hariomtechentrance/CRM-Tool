import { Router } from "express";
import { listPublicDoctors, getPublicSlots, publicBookAppointment } from "../controllers/publicHealth.controller";

const router = Router();

// All public — no auth, same convention as leadForm.routes.ts's /public/:id
router.get("/:orgSlug",         listPublicDoctors);
router.get("/:orgSlug/slots",   getPublicSlots);
router.post("/:orgSlug/book",   publicBookAppointment);

export default router;
