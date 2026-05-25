import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listEmployees, getEmployee, createEmployee, updateEmployee,
  markAttendance, listAttendance, bulkMarkAttendance,
  generatePayroll, listPayrolls, autoGeneratePayroll, markPayrollPaid,
  createLeaveRequest, updateLeaveStatus, listLeaveRequests,
  getHRSummary,
  listShifts, createShift, updateShift, deleteShift, assignShift,
  listLeaveBalances, upsertLeaveBalance,
  listPerformanceGoals, createPerformanceGoal, updatePerformanceGoal, deletePerformanceGoal,
  listPerformanceReviews, createPerformanceReview, updatePerformanceReview,
  listExpenses, createExpense, updateExpense, approveExpense, rejectExpense, markExpensePaid,
  getPayslip,
} from "../controllers/hr.controller";

const router = Router();
router.use(authenticate, requireOrgContext);

router.get("/summary", getHRSummary);

// Payslip
router.get("/payslip", getPayslip);

// Shifts
router.get("/shifts",              listShifts);
router.post("/shifts",             createShift);
router.patch("/shifts/:id",        updateShift);
router.delete("/shifts/:id",       deleteShift);
router.post("/shifts/assign",      assignShift);

// Attendance
router.get("/attendance",       listAttendance);
router.post("/attendance",      markAttendance);
router.post("/attendance/bulk", bulkMarkAttendance);

// Payroll
router.get("/payroll",                listPayrolls);
router.post("/payroll",               generatePayroll);
router.post("/payroll/auto-generate", autoGeneratePayroll);
router.patch("/payroll/:id/paid",     markPayrollPaid);

// Leaves
router.get("/leaves",               listLeaveRequests);
router.post("/leaves",              createLeaveRequest);
router.patch("/leaves/:id/status",  updateLeaveStatus);

// Leave Balances
router.get("/leave-balances",  listLeaveBalances);
router.post("/leave-balances", upsertLeaveBalance);

// Performance Goals
router.get("/goals",        listPerformanceGoals);
router.post("/goals",       createPerformanceGoal);
router.patch("/goals/:id",  updatePerformanceGoal);
router.delete("/goals/:id", deletePerformanceGoal);

// Performance Reviews
router.get("/reviews",        listPerformanceReviews);
router.post("/reviews",       createPerformanceReview);
router.patch("/reviews/:id",  updatePerformanceReview);

// Expenses
router.get("/expenses",                  listExpenses);
router.post("/expenses",                 createExpense);
router.patch("/expenses/:id",            updateExpense);
router.patch("/expenses/:id/approve",    approveExpense);
router.patch("/expenses/:id/reject",     rejectExpense);
router.patch("/expenses/:id/paid",       markExpensePaid);

// Employees (keep at bottom — wildcard :id would swallow named routes above)
router.get("/",      listEmployees);
router.post("/",     createEmployee);
router.get("/:id",   getEmployee);
router.patch("/:id", updateEmployee);

export default router;
