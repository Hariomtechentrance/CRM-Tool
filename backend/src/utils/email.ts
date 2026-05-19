import nodemailer from "nodemailer";

const smtpPort = Number(process.env.SMTP_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465, // SSL on 465, STARTTLS on 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
});

interface SendMailOptions { to: string; subject: string; html: string; }

export async function sendEmail({ to, subject, html }: SendMailOptions) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n📧 [DEV EMAIL] To: ${to} | Subject: ${subject}\n`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "BL-CRM <noreply@blcrm.com>",
      to, subject, html,
    });
  } catch (err) {
    console.error("[Email] Failed to send:", err);
    throw new Error("Email delivery failed. Please try again later.");
  }
}

// ── Shared layout wrapper ────────────────────────────────────
function emailLayout(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 20px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 40px;text-align:center">
        <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">BL-CRM</span>
      </td></tr>
      <tr><td style="padding:36px 40px">${body}</td></tr>
      <tr><td style="padding:20px 40px;background:#f8f8fc;text-align:center;font-size:12px;color:#9090b0;border-top:1px solid #ebebf5">
        &copy; ${new Date().getFullYear()} BL-CRM &middot; Automated message, please do not reply.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const btn = (url: string, label: string) =>
  `<a href="${url}" style="display:inline-block;margin:20px 0;padding:13px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">${label}</a>`;

const h1 = (t: string) => `<h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a1a2e">${t}</h2>`;
const p  = (t: string) => `<p style="margin:0 0 12px;font-size:15px;color:#505070;line-height:1.6">${t}</p>`;
const note = (t: string) => `<p style="margin:16px 0 0;font-size:13px;color:#a0a0b8">${t}</p>`;

// ── Email verification ───────────────────────────────────────
export function verifyEmailTemplate(name: string, token: string): string {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  return emailLayout("Verify your email", `
    ${h1(`Welcome to BL-CRM, ${name}!`)}
    ${p("Thanks for signing up. Please verify your email address to activate your account.")}
    ${btn(url, "Verify Email Address")}
    ${note("This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.")}
  `);
}

// ── Team invite ──────────────────────────────────────────────
export function inviteEmailTemplate(orgName: string, inviterName: string, token: string): string {
  const url = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
  return emailLayout(`You're invited to join ${orgName}`, `
    ${h1("You're Invited!")}
    ${p(`<strong style="color:#1a1a2e">${inviterName}</strong> has invited you to join <strong style="color:#6366f1">${orgName}</strong> on BL-CRM.`)}
    ${p("BL-CRM is an all-in-one business management platform for CRM, inventory, sales, and more.")}
    ${btn(url, "Accept Invitation")}
    ${note("This invitation expires in 48 hours. If you weren't expecting this, you can safely ignore this email.")}
  `);
}

// ── Password reset ───────────────────────────────────────────
export function resetPasswordTemplate(name: string, token: string): string {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  return emailLayout("Reset your password", `
    ${h1("Reset Your Password")}
    ${p(`Hi <strong style="color:#1a1a2e">${name}</strong>, we received a request to reset your password.`)}
    ${btn(url, "Reset Password")}
    ${note("This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.")}
  `);
}
