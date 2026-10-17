import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import { requireCarsSection, requireAnyCarsSection } from "../middleware/requireModuleAccess";
import {
  listCarLeads, getCarLead, createCarLead, updateCarLead, deleteCarLead,
  bulkImportCarLeads, convertCarLead, upsertCarBooking, upsertCarDelivery,
  listCarLeadActivities, addCarLeadActivity,
  listVehicles, getVehicle, createVehicle, updateVehicle, bulkImportVehicles,
  addInsurance, updateInsurance, listExpiringInsurance, listInsuranceFollowUps,
  listInsuranceActivities, addInsuranceActivity,
  getCarsStats, getSalesReport, getMonthlyLeadReport, listWarranties,
  listHistoricalStats, bulkImportHistoricalStats, deleteHistoricalStat,
} from "../controllers/cars.controller";

const router = Router();
// No blanket "CARS" gate here any more — Buyer Leads / Seller Leads /
// Vehicles & Insurance are independently grantable sections (see
// requireModuleAccess.ts). Vehicle/insurance/historical-stats routes are
// unambiguously "Vehicles & Insurance" so they're gated right here; the
// /leads routes serve both Buyer and Seller through the same URL (split
// only by the leadType column), so those controllers call
// assertCarsSection()/hasCarsSectionAccess() themselves once they know
// which leadType a given request/record actually is.
router.use(authenticate, requireOrgContext);

router.get("/stats",                 requireAnyCarsSection(), getCarsStats);
router.get("/sales-report",          requireAnyCarsSection(), getSalesReport);
router.get("/leads/monthly-report",  requireAnyCarsSection(), getMonthlyLeadReport);

router.get("/historical-stats",              requireCarsSection("VEHICLES_INSURANCE"), listHistoricalStats);
router.post("/historical-stats/bulk-import", requireCarsSection("VEHICLES_INSURANCE"), bulkImportHistoricalStats);
router.delete("/historical-stats/:id",       requireCarsSection("VEHICLES_INSURANCE"), deleteHistoricalStat);

router.get("/leads",                 listCarLeads);
router.post("/leads",                createCarLead);
router.post("/leads/bulk-import",    bulkImportCarLeads);
router.get("/leads/:id",             getCarLead);
router.patch("/leads/:id",           updateCarLead);
router.delete("/leads/:id",          deleteCarLead);
router.post("/leads/:id/convert",    convertCarLead);
router.patch("/leads/:id/booking",   upsertCarBooking);
router.patch("/leads/:id/delivery",  upsertCarDelivery);
router.get("/leads/:id/activities",  listCarLeadActivities);
router.post("/leads/:id/activities", addCarLeadActivity);

router.get("/vehicles",              requireCarsSection("VEHICLES_INSURANCE"), listVehicles);
router.post("/vehicles",             requireCarsSection("VEHICLES_INSURANCE"), createVehicle);
router.post("/vehicles/bulk-import", requireCarsSection("VEHICLES_INSURANCE"), bulkImportVehicles);
router.get("/vehicles/:id",          requireCarsSection("VEHICLES_INSURANCE"), getVehicle);
router.patch("/vehicles/:id",        requireCarsSection("VEHICLES_INSURANCE"), updateVehicle);
router.post("/vehicles/:vehicleId/insurance", requireCarsSection("VEHICLES_INSURANCE"), addInsurance);

router.get("/warranties",            requireCarsSection("VEHICLES_INSURANCE"), listWarranties);

router.get("/insurance/expiring",       requireCarsSection("VEHICLES_INSURANCE"), listExpiringInsurance);
router.get("/insurance/due-followups",  requireCarsSection("VEHICLES_INSURANCE"), listInsuranceFollowUps);
router.patch("/insurance/:id",          requireCarsSection("VEHICLES_INSURANCE"), updateInsurance);
router.get("/insurance/:id/activities",  requireCarsSection("VEHICLES_INSURANCE"), listInsuranceActivities);
router.post("/insurance/:id/activities", requireCarsSection("VEHICLES_INSURANCE"), addInsuranceActivity);

export default router;
