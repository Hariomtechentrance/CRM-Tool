import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/auth.routes";
import orgRoutes from "./routes/org.routes";
import partyRoutes from "./routes/party.routes";
import inventoryRoutes from "./routes/inventory.routes";
import purchaseRoutes from "./routes/purchase.routes";
import salesRoutes from "./routes/sales.routes";
import financeRoutes from "./routes/finance.routes";
import hrRoutes from "./routes/hr.routes";
import projectsRoutes from "./routes/projects.routes";
import leadsRoutes from "./routes/leads.routes";
import supportRoutes from "./routes/support.routes";
import tradeRoutes from "./routes/trade.routes";
import retailRoutes from "./routes/retail.routes";
import warehouseRoutes from "./routes/warehouse.routes";
import superAdminRoutes from "./routes/superAdmin.routes";
import orgAdminRoutes from "./routes/orgAdmin.routes";
import accessControlRoutes from "./routes/accessControl.routes";
import goodsEntryRoutes from "./routes/goodsEntry.routes";
import emailRoutes from "./routes/email.routes";
import dealRoutes from "./routes/deal.routes";
import quotationRoutes from "./routes/quotation.routes";
import searchRoutes from "./routes/search.routes";
import documentRoutes from "./routes/document.routes";
import notificationRoutes from "./routes/notifications.routes";
import gstRoutes from "./routes/gst.routes";
import approvalRoutes from "./routes/approval.routes";
import paymentRoutes from "./routes/payment.routes";
import batchRoutes from "./routes/batch.routes";
import twoFactorRoutes from "./routes/twoFactor.routes";
import commentsRoutes from "./routes/comments.routes";
import tdsRoutes from "./routes/tds.routes";
import duplicateRoutes from "./routes/duplicate.routes";
import einvoiceRoutes from "./routes/einvoice.routes";
import ewaybillRoutes from "./routes/ewaybill.routes";
import budgetRoutes from "./routes/budget.routes";
import bomRoutes from "./routes/bom.routes";
import portalRoutes from "./routes/portal.routes";
import currencyRoutes from "./routes/currency.routes";
import reconciliationRoutes from "./routes/reconciliation.routes";
import webhookRoutes from "./routes/webhook.routes";
import itProjectRoutes from "./routes/itProject.routes";
import sprintRoutes from "./routes/sprint.routes";
import { errorHandler } from "./middleware/errorHandler";
import { startCronJobs } from "./cron/jobs";

const app = express();
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT) || 5000;
const isProd = process.env.NODE_ENV === "production";

// ── Startup env validation ────────────────────────────────────
const REQUIRED_ENV = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

// ── Security headers ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: isProd ? undefined : false,
}));

// ── CORS ─────────────────────────────────────────────────────
const defaultOrigins = isProd ? "" : "http://localhost:5173,http://localhost:5174,http://localhost:5175";
const allowedOrigins = (process.env.FRONTEND_URL || defaultOrigins).split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","x-organization-id"],
}));

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Request logging ──────────────────────────────────────────
app.use(morgan(isProd ? "combined" : "dev"));

// ── Rate limits ───────────────────────────────────────────────
// Strict limit for auth — prevents brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: "Too many requests. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limit — generous but stops abuse
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  message: { success: false, message: "Rate limit exceeded. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health",
});

app.use("/api/auth/login",          authLimiter);
app.use("/api/auth/register",       authLimiter);
app.use("/api/auth/forgot-password",authLimiter);
app.use("/api/auth/refresh",        authLimiter); // prevent refresh token brute-force
app.use("/api/auth/reset-password", authLimiter);
app.use("/api", apiLimiter);

// ── Health check ─────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString(), app: "FlowCRM API" });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected", timestamp: new Date().toISOString() });
  }
});

// ── Routes ───────────────────────────────────────────────────
app.use("/api/auth",           authRoutes);
app.use("/api/organizations",  orgRoutes);
app.use("/api/parties",        partyRoutes);
app.use("/api/inventory",      inventoryRoutes);
app.use("/api/purchase-orders",purchaseRoutes);
app.use("/api/sales-orders",   salesRoutes);
app.use("/api/finance",        financeRoutes);
app.use("/api/hr",             hrRoutes);
app.use("/api/projects",       projectsRoutes);
app.use("/api/leads",          leadsRoutes);
app.use("/api/support",        supportRoutes);
app.use("/api/trade",          tradeRoutes);
app.use("/api/retail",         retailRoutes);
app.use("/api/warehouses",     warehouseRoutes);
app.use("/api/super-admin",    superAdminRoutes);
app.use("/api/org-admin",      orgAdminRoutes);
app.use("/api/access",         accessControlRoutes);
app.use("/api/goods-entries",  goodsEntryRoutes);
app.use("/api/email",          emailRoutes);
app.use("/api/deals",          dealRoutes);
app.use("/api/quotations",     quotationRoutes);
app.use("/api/search",         searchRoutes);
app.use("/api/documents",      documentRoutes);
app.use("/api/notifications",  notificationRoutes);
app.use("/api/gst",            gstRoutes);
app.use("/api/approvals",      approvalRoutes);
app.use("/api/payments",       paymentRoutes);
app.use("/api/batches",        batchRoutes);
app.use("/api/2fa",            twoFactorRoutes);
app.use("/api/comments",       commentsRoutes);
app.use("/api/tds",            tdsRoutes);
app.use("/api/duplicates",    duplicateRoutes);
app.use("/api/einvoice",      einvoiceRoutes);
app.use("/api/ewaybill",      ewaybillRoutes);
app.use("/api/budgets",       budgetRoutes);
app.use("/api/bom",           bomRoutes);
app.use("/api/portal",        portalRoutes);
app.use("/api/currency",      currencyRoutes);
app.use("/api/reconciliation", reconciliationRoutes);
app.use("/api/webhooks",       webhookRoutes);
app.use("/api/it-projects",   itProjectRoutes);
app.use("/api/sprints",       sprintRoutes);

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n  FlowCRM API  ->  http://localhost:${PORT}`);
  console.log(`  Health       ->  http://localhost:${PORT}/api/health`);
  console.log(`  Env          ->  ${process.env.NODE_ENV || "development"}\n`);
  startCronJobs();
});

// ── Graceful shutdown ─────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully…`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("Server closed. Bye.");
    process.exit(0);
  });
  // Force exit after 10s if connections linger
  setTimeout(() => { console.error("Forced exit."); process.exit(1); }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("uncaughtException",  (err) => { console.error("Uncaught exception:", err); });
process.on("unhandledRejection", (reason) => { console.error("Unhandled rejection:", reason); });

export default app;
