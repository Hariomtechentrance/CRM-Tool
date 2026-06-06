import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listPatients, getPatient, createPatient, updatePatient,
  listVisits, createVisit, updateVisit,
  listPrescriptions, createPrescription,
  listLabReports, createLabReport,
  getHealthStats,
} from "../controllers/health.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

// Dashboard stats
router.get("/stats",              getHealthStats);

// Patients
router.get("/patients",           listPatients);
router.post("/patients",          createPatient);
router.get("/patients/:id",       getPatient);
router.patch("/patients/:id",     updatePatient);

// Visits
router.get("/visits",             listVisits);
router.post("/visits",            createVisit);
router.patch("/visits/:id",       updateVisit);

// Prescriptions
router.get("/prescriptions",      listPrescriptions);
router.post("/prescriptions",     createPrescription);

// Lab reports
router.get("/lab-reports",        listLabReports);
router.post("/lab-reports",       createLabReport);

export default router;
