import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listEmployees, getEmployee, createEmployee, updateEmployee,
  markAttendance, listAttendance, bulkMarkAttendance,
  generatePayroll, listPayrolls, autoGeneratePayroll, markPayrollPaid,
  createLeaveRequest, updateLeaveStatus, listLeaveRequests,
  getHRSummary,
} from "../controllers/hr.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/summary", getHRSummary);

router.get("/attendance",       listAttendance);
router.post("/attendance",      markAttendance);
router.post("/attendance/bulk", bulkMarkAttendance);

router.get("/payroll",                listPayrolls);
router.post("/payroll",               generatePayroll);
router.post("/payroll/auto-generate", autoGeneratePayroll);
router.patch("/payroll/:id/paid",     markPayrollPaid);

router.get("/leaves",               listLeaveRequests);
router.post("/leaves",              createLeaveRequest);
router.patch("/leaves/:id/status",  updateLeaveStatus);

router.get("/",     listEmployees);
router.post("/",    createEmployee);
router.get("/:id",  getEmployee);
router.patch("/:id",updateEmployee);

export default router;
