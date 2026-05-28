import { Response } from "express";
import { prisma } from "../lib/prisma";
import { OrgRequest } from "../middleware/orgContext";
import { ok, created, notFound, badRequest, serverError } from "../utils/response";
import crypto from "crypto";
import https from "https";
import http from "http";

const db = () => (prisma as any);

// Supported webhook events
export const WEBHOOK_EVENTS = [
  "invoice.created",
  "invoice.paid",
  "invoice.cancelled",
  "payment.received",
  "contact.created",
  "contact.updated",
  "purchase_order.created",
  "purchase_order.approved",
  "lead.created",
  "lead.converted",
  "stock.low",
  "work_order.completed",
];

// ── List webhook endpoints ────────────────────────────────────
export async function listWebhooks(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const webhooks = await db().webhookEndpoint.findMany({
      where: { organizationId: orgId },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, event: true, success: true, statusCode: true, createdAt: true },
        },
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    ok(res, { webhooks, events: WEBHOOK_EVENTS });
  } catch (err) {
    serverError(res, err);
  }
}

// ── Create webhook endpoint ───────────────────────────────────
export async function createWebhook(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const { url, events, description } = req.body as {
      url: string;
      events: string[];
      description?: string;
    };

    if (!url || !events?.length) {
      badRequest(res, "url and events[] required");
      return;
    }
    try { new URL(url); } catch {
      badRequest(res, "Invalid URL");
      return;
    }

    const invalid = events.filter((e: string) => !WEBHOOK_EVENTS.includes(e));
    if (invalid.length) {
      badRequest(res, `Unknown events: ${invalid.join(", ")}`);
      return;
    }

    const secret = crypto.randomBytes(20).toString("hex");
    const webhook = await db().webhookEndpoint.create({
      data: { organizationId: orgId, url, events, secret, description: description ?? null },
    });

    created(res, webhook);
  } catch (err) {
    serverError(res, err);
  }
}

// ── Update webhook endpoint ───────────────────────────────────
export async function updateWebhook(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id;
    const { url, events, description, isActive } = req.body as {
      url?: string;
      events?: string[];
      description?: string;
      isActive?: boolean;
    };

    const existing = await db().webhookEndpoint.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) { notFound(res, "Webhook not found"); return; }

    if (url) try { new URL(url); } catch { badRequest(res, "Invalid URL"); return; }
    if (events) {
      const invalid = events.filter((e: string) => !WEBHOOK_EVENTS.includes(e));
      if (invalid.length) { badRequest(res, `Unknown events: ${invalid.join(", ")}`); return; }
    }

    const updated = await db().webhookEndpoint.update({
      where: { id },
      data: {
        ...(url !== undefined && { url }),
        ...(events !== undefined && { events }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    ok(res, updated);
  } catch (err) {
    serverError(res, err);
  }
}

// ── Delete webhook endpoint ───────────────────────────────────
export async function deleteWebhook(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id;

    const existing = await db().webhookEndpoint.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) { notFound(res, "Webhook not found"); return; }

    await db().webhookEndpoint.delete({ where: { id } });
    ok(res, { deleted: true });
  } catch (err) {
    serverError(res, err);
  }
}

// ── Rotate secret ─────────────────────────────────────────────
export async function rotateSecret(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id;

    const existing = await db().webhookEndpoint.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) { notFound(res, "Webhook not found"); return; }

    const secret = crypto.randomBytes(20).toString("hex");
    const updated = await db().webhookEndpoint.update({ where: { id }, data: { secret } });
    ok(res, { secret: updated.secret });
  } catch (err) {
    serverError(res, err);
  }
}

// ── Test webhook (send a ping) ────────────────────────────────
export async function testWebhook(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id;

    const webhook = await db().webhookEndpoint.findFirst({ where: { id, organizationId: orgId } });
    if (!webhook) { notFound(res, "Webhook not found"); return; }

    const payload = { event: "ping", timestamp: new Date().toISOString(), data: { message: "Test ping from FlowCRM" } };
    const result = await dispatchWebhook(webhook.url, webhook.secret, payload);

    // Record delivery
    await db().webhookDelivery.create({
      data: {
        webhookId: id,
        event: "ping",
        payload,
        statusCode: result.statusCode,
        success: result.success,
        attempts: 1,
        responseBody: result.body?.slice(0, 500),
        deliveredAt: new Date(),
      },
    });

    ok(res, { success: result.success, statusCode: result.statusCode });
  } catch (err) {
    serverError(res, err);
  }
}

// ── List delivery history ─────────────────────────────────────
export async function listDeliveries(req: OrgRequest, res: Response): Promise<void> {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id;

    const webhook = await db().webhookEndpoint.findFirst({ where: { id, organizationId: orgId } });
    if (!webhook) { notFound(res, "Webhook not found"); return; }

    const deliveries = await db().webhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    ok(res, deliveries);
  } catch (err) {
    serverError(res, err);
  }
}

// ── Internal dispatcher (used by other controllers/cron) ──────
export async function dispatchWebhook(
  url: string,
  secret: string,
  payload: object
): Promise<{ success: boolean; statusCode: number | null; body: string }> {
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");

  return new Promise((resolve) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "X-FlowCRM-Signature": `sha256=${sig}`,
          "X-FlowCRM-Event": (payload as any).event ?? "unknown",
          "User-Agent": "FlowCRM-Webhooks/1.0",
        },
        timeout: 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ success: (res.statusCode ?? 0) < 300, statusCode: res.statusCode ?? null, body: data }));
      }
    );

    req.on("error", () => resolve({ success: false, statusCode: null, body: "Connection error" }));
    req.on("timeout", () => { req.destroy(); resolve({ success: false, statusCode: null, body: "Timeout" }); });
    req.write(body);
    req.end();
  });
}

// ── Fire event to all matching org webhooks (internal utility) ─
export async function fireEvent(organizationId: string, event: string, data: object): Promise<void> {
  try {
    const endpoints = await db().webhookEndpoint.findMany({
      where: { organizationId, isActive: true, events: { has: event } },
    });

    for (const ep of endpoints) {
      const payload = { event, timestamp: new Date().toISOString(), data };
      const result = await dispatchWebhook(ep.url, ep.secret, payload);
      await db().webhookDelivery.create({
        data: {
          webhookId: ep.id,
          event,
          payload,
          statusCode: result.statusCode,
          success: result.success,
          attempts: 1,
          responseBody: result.body?.slice(0, 500),
          deliveredAt: new Date(),
        },
      });
    }
  } catch {
    // non-fatal — webhook delivery failure should not break primary request
  }
}
