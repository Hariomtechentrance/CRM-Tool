import "dotenv/config";
import express from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { prisma } from "./lib/prisma";
import { requestTimeout } from "./middleware/requestTimeout";
import { withCache } from "./middleware/cacheMiddleware";
import { dbBreaker } from "./lib/circuitBreaker";
import { apiCache } from "./lib/cache";
import { redis } from "./lib/redisClient";
import { RedisStore } from "rate-limit-redis";
import { v4 as uuidv4 } from "uuid";
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
import publicProjectRoutes from "./routes/publicProject.routes";
import gmailRoutes from "./routes/gmail.routes";
import emailAccountRoutes from "./routes/emailAccount.routes";
import appointmentRoutes from "./routes/appointment.routes";
import automationRoutes from "./routes/automation.routes";
import whatsappRoutes from "./routes/whatsapp.routes";
import leadFormRoutes from "./routes/leadForm.routes";
import sessionRoutes from "./routes/session.routes";
import apiKeyRoutes from "./routes/apiKey.routes";
import securityRoutes from "./routes/security.routes";
import bugsRoutes from "./routes/bugs.routes";
import timeTrackingRoutes from "./routes/timeTracking.routes";
import telecallingRoutes from "./routes/telecalling.routes";
import servicesRoutes from "./routes/services.routes";
import stockMarketRoutes from "./routes/stockMarket.routes";
import healthRoutes from "./routes/health.routes";
import customFieldRoutes from "./routes/customField.routes";
import brandingRoutes from "./routes/branding.routes";
import complianceRoutes from "./routes/compliance.routes";
import restaurantRoutes from "./routes/restaurant.routes";
import hotelRoutes from "./routes/hotel.routes";
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

// ── HTTPS enforcement (production only) ──────────────────────
if (isProd) {
  app.use((req, res, next) => {
    const proto = req.headers["x-forwarded-proto"] as string;
    if (proto && proto !== "https") {
      return res.redirect(301, `https://${req.get("host")}${req.url}`);
    }
    next();
  });
}

// ── Gzip compression (60-80 % smaller responses) ─────────────
app.use(compression());

// ── Per-request timeout (30 s) — releases hung connections ────
app.use(requestTimeout(30_000));

// ── Request-ID for distributed tracing ───────────────────────
app.use((_req, res, next) => {
  res.setHeader("X-Request-Id", uuidv4());
  next();
});

// ── Circuit breaker — fast-fail when DB is overwhelmed ────────
app.use("/api", (req, res, next) => {
  if (dbBreaker.isOpen && req.path !== "/health" && req.path !== "/metrics") {
    return res.status(503).json({
      success: false,
      message: "Service temporarily unavailable. The database is recovering — please retry in 30 s.",
      retryAfter: 30,
    });
  }
  next();
});

// ── Security headers ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: isProd ? undefined : false,
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  noSniff: true,
  frameguard: { action: "deny" },
}));

// ── Remove fingerprinting header ──────────────────────────────
app.disable("x-powered-by");

// ── CORS ─────────────────────────────────────────────────────
const prodOrigins = (process.env.FRONTEND_URL || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // No Origin = server-to-server request (health checks, keep-alive pings) — always allow
    if (!origin) return cb(null, true);
    // In dev allow any localhost port (Vite picks whatever port is free)
    if (!isProd && /^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    if (prodOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","x-organization-id"],
}));

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Request logging ──────────────────────────────────────────
app.use(morgan(isProd ? "combined" : "dev"));

// ── Rate limits ───────────────────────────────────────────────
// When REDIS_URL is set, counters are stored in Redis so all cluster
// workers share the same window — preventing per-worker bypass.
// passOnStoreError: true means if Redis is temporarily unavailable the
// request passes through rather than returning 500.
function makeRLStore(prefix: string) {
  if (!redis) return undefined;
  return new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).sendCommand(args),
    prefix,
  });
}

// Strict limit for auth — prevents brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  store: makeRLStore("rl_auth:"),
  passOnStoreError: true,
  message: { success: false, message: "Too many requests. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limit — generous but stops abuse
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  store: makeRLStore("rl_api:"),
  passOnStoreError: true,
  message: { success: false, message: "Rate limit exceeded. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health" || req.path === "/api/metrics",
});

// Heavy endpoints — PDF/report generation, exports
const heavyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  store: makeRLStore("rl_heavy:"),
  passOnStoreError: true,
  message: { success: false, message: "Too many export/report requests. Wait 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login",          authLimiter);
app.use("/api/auth/register",       authLimiter);
app.use("/api/auth/forgot-password",authLimiter);
app.use("/api/auth/refresh",        authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/gst",                 heavyLimiter);
app.use("/api",                     apiLimiter);

// ── Health + readiness checks ─────────────────────────────────
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbBreaker.success();
    res.json({
      status: "ok",
      db: "connected",
      circuitBreaker: dbBreaker.getState(),
      pid: process.pid,
      timestamp: new Date().toISOString(),
      app: "FlowCRM API",
    });
  } catch (err) {
    dbBreaker.fail();
    res.status(503).json({
      status: "error",
      db: "disconnected",
      circuitBreaker: dbBreaker.getState(),
      timestamp: new Date().toISOString(),
    });
  }
});

// ── Metrics — latency, cache, circuit breaker ─────────────────
app.get("/api/metrics", (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    pid: process.pid,
    uptime: Math.round(process.uptime()),
    memoryMB: {
      heapUsed:  Math.round(mem.heapUsed  / 1_048_576),
      heapTotal: Math.round(mem.heapTotal / 1_048_576),
      rss:       Math.round(mem.rss       / 1_048_576),
    },
    cache: apiCache.stats(),
    circuitBreaker: {
      state:    dbBreaker.getState(),
      failures: dbBreaker.getFailures(),
    },
    node: process.version,
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ───────────────────────────────────────────────────
app.use("/api/auth",           authRoutes);
app.use("/api/organizations",  orgRoutes);
app.use("/api/parties",        withCache(30_000), partyRoutes);
app.use("/api/inventory",      withCache(30_000), inventoryRoutes);
app.use("/api/purchase-orders",purchaseRoutes);
app.use("/api/sales-orders",   salesRoutes);
app.use("/api/finance",        financeRoutes);
app.use("/api/hr",             withCache(60_000), hrRoutes);
app.use("/api/projects",       withCache(20_000), projectsRoutes);
app.use("/api/leads",          withCache(20_000), leadsRoutes);
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
app.use("/api/it-projects",   withCache(15_000), itProjectRoutes);
app.use("/api/sprints",       sprintRoutes);
app.use("/api/public",        publicProjectRoutes);
app.use("/api/gmail",         gmailRoutes);
app.use("/api/email-accounts", emailAccountRoutes);
app.use("/api/appointments",  appointmentRoutes);
app.use("/api/automations",   automationRoutes);
app.use("/api/whatsapp",      whatsappRoutes);
app.use("/api/lead-forms",    leadFormRoutes);
app.use("/api/sessions",      sessionRoutes);
app.use("/api/api-keys",      apiKeyRoutes);
app.use("/api/security",      securityRoutes);
app.use("/api/bugs",          bugsRoutes);
app.use("/api/time-tracking", timeTrackingRoutes);
app.use("/api/telecalling",   telecallingRoutes);
app.use("/api/services",      servicesRoutes);
app.use("/api/stock-market",  stockMarketRoutes);
app.use("/api/health",        healthRoutes);
app.use("/api/custom-fields", customFieldRoutes);
app.use("/api/branding",      brandingRoutes);
app.use("/api/compliance",    complianceRoutes);
app.use("/api/restaurant",    restaurantRoutes);
app.use("/api/hotel",         hotelRoutes);

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
