import { Request, Response } from "express";
import { z } from "zod";
import { sendEmail } from "../utils/email";
import { ok, badRequest, serverError } from "../utils/response";

const contactSchema = z.object({
  name:         z.string().min(2, "Name must be at least 2 characters").max(100),
  email:        z.string().email("Invalid email address"),
  phone:        z.string().min(7, "Enter a valid phone number").max(20),
  organization: z.string().min(2, "Organisation name must be at least 2 characters").max(150),
  teamSize:     z.string().optional(),
  message:      z.string().max(1000).optional(),
});

// ── HTML template for admin notification ────────────────────
function contactNotificationTemplate(data: z.infer<typeof contactSchema>): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 16px;background:#f8f8fc;font-size:13px;font-weight:700;color:#6366f1;width:140px;border-bottom:1px solid #ebebf5;white-space:nowrap">${label}</td>
      <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;border-bottom:1px solid #ebebf5">${value}</td>
    </tr>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 20px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 40px;text-align:center">
        <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">BL-CRM</span>
        <p style="color:#c7d2fe;font-size:13px;margin:6px 0 0">New Account Request</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px 40px">
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1a1a2e">🙋 New User Registration Request</h2>
        <p style="margin:0 0 24px;font-size:14px;color:#505070;line-height:1.6">
          Someone has submitted a request to create an account on BL-CRM. Review the details below and reach out to onboard them.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ebebf5;border-radius:8px;overflow:hidden">
          ${row("Full Name", data.name)}
          ${row("Email", data.email)}
          ${row("Phone", data.phone)}
          ${row("Organisation", data.organization)}
          ${data.teamSize ? row("Team Size", data.teamSize) : ""}
          ${data.message ? row("Message", data.message.replace(/\n/g, "<br>")) : ""}
        </table>
        <p style="margin:24px 0 0;font-size:13px;color:#a0a0b8">
          Received on ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" })} IST
        </p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 40px;background:#f8f8fc;text-align:center;font-size:12px;color:#9090b0;border-top:1px solid #ebebf5">
        &copy; ${new Date().getFullYear()} BL-CRM &middot; This is an automated notification.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ── HTML auto-reply for the requester ───────────────────────
function contactAutoReplyTemplate(name: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 20px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 40px;text-align:center">
        <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">BL-CRM</span>
      </td></tr>
      <tr><td style="padding:36px 40px">
        <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a1a2e">Thanks, ${name}! We've received your request.</h2>
        <p style="margin:0 0 12px;font-size:15px;color:#505070;line-height:1.6">
          Our team will review your request and contact you within <strong style="color:#1a1a2e">1–2 business days</strong> to set up your account and get your organisation onboarded.
        </p>
        <p style="margin:0 0 12px;font-size:15px;color:#505070;line-height:1.6">
          In the meantime, feel free to reach us directly:
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:16px 0">
          <tr><td style="padding:6px 0;font-size:14px;color:#505070">📞 <strong>98341 34470</strong> &nbsp;/&nbsp; <strong>73979 62433</strong></td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#505070">✉️ <strong>hariomvimal33333@gmail.com</strong></td></tr>
        </table>
        <p style="margin:20px 0 0;font-size:13px;color:#a0a0b8">
          If you didn't submit this request, please ignore this email.
        </p>
      </td></tr>
      <tr><td style="padding:20px 40px;background:#f8f8fc;text-align:center;font-size:12px;color:#9090b0;border-top:1px solid #ebebf5">
        &copy; ${new Date().getFullYear()} BL-CRM &middot; Automated message, please do not reply.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ── Controller ───────────────────────────────────────────────
export async function submitContactRequest(req: Request, res: Response) {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.errors[0].message);
  }

  const data = parsed.data;
  const adminEmail = process.env.SMTP_USER || process.env.ADMIN_EMAIL || "omimportomexport@gmail.com";

  try {
    // 1. Notify admin
    await sendEmail({
      to:      adminEmail,
      subject: `[BL-CRM] New Account Request — ${data.name} (${data.organization})`,
      html:    contactNotificationTemplate(data),
    });

    // 2. Auto-reply to requester
    await sendEmail({
      to:      data.email,
      subject: "We've received your BL-CRM request!",
      html:    contactAutoReplyTemplate(data.name),
    });
  } catch (err) {
    console.error("[Contact] Email send failed:", err);
    // Still return success — the form data was received even if email fails
    // Log it so admin can manually follow up
    console.log("[Contact] Request data:", JSON.stringify(data, null, 2));
  }

  return ok(res, null, "Your request has been received. We'll contact you within 1–2 business days.");
}
