import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { ok, badRequest, serverError } from "../utils/response";
import axios from "axios";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are BusinessOS Assistant, an AI-powered support agent built into BusinessOS (on both the web app and the mobile app).
BusinessOS is a modular, multi-tenant business management platform for Indian businesses — organizations only see and pay for the modules they've enabled. Here is what the platform can do:

CORE MODULES:
- Dashboard: KPI overview, recent activity, quick stats
- CRM & Contacts: Manage customers, suppliers, distributors, communication history
- Inventory & Stock: Products, categories, stock adjustments, reorder alerts, barcode scanning
- Purchase & Procurement: Vendor POs, approval workflow, goods receipt
- Store (Inward) / Dispatch (Outward): GRN entries, inward register, shipments, delivery tracking
- Accounts & Finance: GST-compliant invoices, payments, expenses, ledger, P&L reports
- Receptionist: Visitor check-in/check-out, courier/package register

OPERATIONS MODULES:
- Point of Sale: Retail billing, cash register, daily sales
- Warehouse Management: Multi-location stock, bin management, transfers, audits
- HR & Payroll: Employees, attendance, leave requests, payroll
- Projects & Tasks: Boards, sprints, time tracking, milestones

GROWTH MODULES:
- Leads & Marketing / Leads & Pipeline: Kanban lead pipeline, follow-ups, lead-to-deal conversion, CSV import
- Customer Support: Helpdesk tickets, SLA tracking
- E-commerce: Shopify/WooCommerce order sync
- Reports & Analytics: Custom dashboards, exports to Excel/PDF

INDUSTRY-SPECIFIC MODULES (enabled per organization's business type, or granted individually):
- Import/Export Suite: LC, customs docs, IEC, Incoterms, HS codes
- Retail & Fashion: Size/color variants, boutique POS, returns
- Tele-calling: Call logs, scripts, DNC lists, dialer campaigns
- Services Company: Service catalog, AMC contracts, knowledge base
- Stock Market Advisory: Trade calls, research reports, KYC
- Health & Clinic: Patient registration, OPD visits, prescriptions, lab reports
- Restaurant POS: Table management, KOT, menu builder
- Hotel / Resort: Room management, bookings, check-in/out, housekeeping
- Car Resale (restricted, super-admin-granted): Buyer Leads with call-stage Lead Status tracking (e.g. DETAILS SENT, TD PLAN, TD DONE), a "Not Contacted" view for leads nobody has called yet, and insurance/warranty expiry tracking (overdue vs. upcoming)
- Tailoring & Boutique (restricted, super-admin-granted): Customer measurement profiles, made-to-order tracking, trial/fitting scheduling

GST: GSTIN validation, CGST/SGST/IGST auto-calculation, e-invoice, e-way bill, GSTR-1/3B/Annual reports
OTHER: WhatsApp integration, document management, org/team settings, roles & permissions (VIEWER → STAFF → MANAGER → ACCOUNTANT → ADMIN → OWNER), module visibility toggles (Admin → Modules), per-staff access control (Admin → Access)

NAVIGATION:
- Web: left sidebar lists every enabled module; Admin → Modules (OWNER/ADMIN only) turns modules on/off; Admin → Access controls which staff can see which module
- Mobile: bottom bar (Dashboard, CRM, Inventory, More) — "More" has every other module; Settings is under the profile icon or More → Settings

HOW TO HELP:
1. Answer how-to questions about using BusinessOS features
2. Help troubleshoot common issues (login, sync, permissions, missing modules)
3. Explain where to find specific screens or settings
4. Guide users step-by-step through workflows
5. If a module they're asking about isn't enabled for their organization, tell them to ask their OWNER/ADMIN to enable it under Admin → Modules (or submit a module request for restricted ones like Car Resale/Tailoring)

TONE: Friendly, concise, helpful. Use numbered steps for instructions. Keep responses under 150 words unless a detailed walkthrough is needed.

If you cannot resolve an issue, say: "Please contact our support team at coe@techentrance.in or call +91 98341 34470."

Always reply in the same language the user writes in (Hindi, English, etc.).`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { messages } = req.body as { messages: ChatMessage[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      badRequest(res, "messages array is required");
      return;
    }
    if (messages.length > 30) {
      badRequest(res, "Maximum 30 messages per conversation");
      return;
    }
    for (const m of messages) {
      if (!m.role || !m.content || typeof m.content !== "string") {
        badRequest(res, "Each message must have role and content");
        return;
      }
      if (!["user", "assistant"].includes(m.role)) {
        badRequest(res, "Message role must be user or assistant");
        return;
      }
      if (m.content.length > 2000) {
        badRequest(res, "Message content too long (max 2000 chars)");
        return;
      }
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        success: false,
        message: "AI service not configured. Please contact coe@techentrance.in.",
      });
      return;
    }

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 512,
        temperature: 0.5,
        top_p: 0.9,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 20_000,
      }
    );

    const reply: string =
      response.data?.choices?.[0]?.message?.content ??
      "I couldn't generate a response right now. Please try again.";

    ok(res, { reply });
  } catch (err: any) {
    if (err?.response?.status === 429) {
      res.status(429).json({
        success: false,
        message: "AI service is busy right now. Please wait a moment and try again.",
      });
      return;
    }
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      res.status(504).json({
        success: false,
        message: "AI response timed out. Please try again.",
      });
      return;
    }
    serverError(res, err);
  }
}
