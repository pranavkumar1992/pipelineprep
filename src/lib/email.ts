import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";
import { getPaymentSettings } from "@/lib/settings";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.emailEnabled) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth:
      env.smtpUser && env.smtpPassword
        ? { user: env.smtpUser, pass: env.smtpPassword }
        : undefined,
  });

  return transporter;
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0b1120;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1120;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111a2e;border:1px solid #1e293b;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:20px 28px;border-bottom:1px solid #1e293b;">
          <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:15px;font-weight:700;color:#7dd3fc;">&#9635;&nbsp;PipelinePrep</span>
        </td></tr>
        <tr><td style="padding:28px;color:#e2e8f0;font-size:15px;line-height:1.65;">
          <h1 style="margin:0 0 16px;font-size:19px;font-weight:650;color:#f8fafc;">${title}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;line-height:1.6;">
          Need help? Reply to <a href="mailto:${env.businessSupportEmail()}" style="color:#7dd3fc;">${env.businessSupportEmail()}</a>.<br />
          &copy; ${new Date().getFullYear()} ${env.businessName()}. Digital goods &mdash; no physical shipment.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Sends an email. When SMTP is not configured (local dev, or a misconfigured
 * EC2), the message is logged instead of thrown so flows still complete.
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ delivered: boolean }> {
  const tx = getTransporter();

  if (!tx) {
    console.info(
      `\n[email:console] to=${options.to}\n[email:console] subject=${options.subject}\n${options.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400)}\n`,
    );
    return { delivered: false };
  }

  try {
    await tx.sendMail({
      from: env.emailFrom(),
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return { delivered: true };
  } catch (error) {
    // Never let a mail failure break signup or checkout.
    console.error("[email] send failed:", error);
    return { delivered: false };
  }
}

export async function sendPasswordResetEmail(options: {
  to: string;
  name: string | null;
  resetUrl: string;
}): Promise<void> {
  await sendEmail({
    to: options.to,
    subject: "Reset your PipelinePrep password",
    html: layout(
      "Reset your password",
      `<p style="margin:0 0 16px;">Hi ${options.name ?? "there"},</p>
       <p style="margin:0 0 20px;">Use the link below to choose a new password. It expires in <strong>1 hour</strong> and can be used once.</p>
       <p style="margin:0 0 20px;"><a href="${options.resetUrl}" style="display:inline-block;background:#38bdf8;color:#04121f;text-decoration:none;font-weight:650;padding:12px 22px;border-radius:8px;">Reset password</a></p>
       <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">If the button does not work, copy this URL into your browser:</p>
       <p style="margin:0 0 20px;word-break:break-all;color:#7dd3fc;font-size:13px;">${options.resetUrl}</p>
       <p style="margin:0;color:#94a3b8;font-size:13px;">Did not request this? You can safely ignore this email &mdash; your password has not changed.</p>`,
    ),
  });
}

export async function sendWelcomeEmail(options: {
  to: string;
  name: string | null;
  verifyUrl?: string;
}): Promise<void> {
  const verifyBlock = options.verifyUrl
    ? `<p style="margin:0 0 20px;"><a href="${options.verifyUrl}" style="display:inline-block;background:#38bdf8;color:#04121f;text-decoration:none;font-weight:650;padding:12px 22px;border-radius:8px;">Verify my email</a></p>`
    : "";

  await sendEmail({
    to: options.to,
    subject: "Welcome to PipelinePrep",
    html: layout(
      "Welcome aboard",
      `<p style="margin:0 0 16px;">Hi ${options.name ?? "there"},</p>
       <p style="margin:0 0 16px;">Your account is ready. Start with a free AWS or Linux quiz, then work through guided incident scenarios that mirror real on-call pages.</p>
       ${verifyBlock}
       <p style="margin:0 0 20px;"><a href="${env.siteUrl()}/quizzes" style="display:inline-block;background:#38bdf8;color:#04121f;text-decoration:none;font-weight:650;padding:12px 22px;border-radius:8px;">Browse the question bank</a></p>
       <p style="margin:0;color:#94a3b8;font-size:13px;">Premium unlocks every quiz and scenario for ${env.businessName()}.</p>`,
    ),
  });
}

/**
 * Confirmation request sent from the resend button and after a password change.
 *
 * Deliberately states the address it was sent to. A confirmation link is a
 * bearer credential for the address it names, so a message that does not say
 * which address is being confirmed is not much of a safeguard.
 */
export async function sendVerificationEmail(options: {
  to: string;
  name: string | null;
  verifyUrl: string;
}): Promise<void> {
  await sendEmail({
    to: options.to,
    subject: "Confirm your email address",
    html: layout(
      "Confirm your email",
      `<p style="margin:0 0 16px;">Hi ${options.name ?? "there"},</p>
       <p style="margin:0 0 16px;">Confirm this address to finish setting up your account. The link works once and expires in 24 hours.</p>
       <p style="margin:0 0 20px;"><a href="${options.verifyUrl}" style="display:inline-block;background:#38bdf8;color:#04121f;text-decoration:none;font-weight:650;padding:12px 22px;border-radius:8px;">Confirm my email</a></p>
       <p style="margin:0 0 16px;word-break:break-all;color:#7dd3fc;font-size:13px;">${options.verifyUrl}</p>
       <p style="margin:0 0 16px;color:#94a3b8;font-size:13px;">This was sent to ${options.to}. If that is not your address, ignore this email &mdash; nothing has been confirmed.</p>
       <p style="margin:0;color:#94a3b8;font-size:13px;">Need a new link? Sign in and use the resend button on your dashboard.</p>`,
    ),
  });
}

/** P-6: GST invoice for a completed payment. */
export async function sendInvoiceEmail(options: {
  to: string;
  orderId: string;
  invoiceNumber: string;
  planName: string;
  amountPaise: number;
  taxPaise: number;
  startsAt: Date;
  expiresAt: Date;
}): Promise<void> {  const rupees = (p: number) => (p / 100).toFixed(2);
  const total = rupees(options.amountPaise + options.taxPaise);
  const base = rupees(options.amountPaise);
  const tax = rupees(options.taxPaise);

  await sendEmail({
    to: options.to,
    subject: `Invoice ${options.invoiceNumber} - ${env.businessName()}`,
    html: layout(
      `Payment received - invoice ${options.invoiceNumber}`,
      `<p style="margin:0 0 16px;">Thanks for your purchase. Your Premium access is active.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;font-size:14px;">
         <tr><td style="padding:8px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">Plan</td><td style="padding:8px 0;border-bottom:1px solid #1e293b;text-align:right;">${options.planName}</td></tr>
         <tr><td style="padding:8px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">Amount</td><td style="padding:8px 0;border-bottom:1px solid #1e293b;text-align:right;">INR ${base}</td></tr>
         <tr><td style="padding:8px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">GST @ ${(await getPaymentSettings()).gstRate}%</td><td style="padding:8px 0;border-bottom:1px solid #1e293b;text-align:right;">INR ${tax}</td></tr>
         <tr><td style="padding:10px 0;font-weight:700;">Total paid</td><td style="padding:10px 0;text-align:right;font-weight:700;">INR ${total}</td></tr>
       </table>
       <p style="margin:0 0 6px;color:#94a3b8;font-size:13px;">Access period: ${options.startsAt.toDateString()} to ${options.expiresAt.toDateString()}</p>
       <p style="margin:0 0 20px;color:#94a3b8;font-size:13px;">${env.businessGstin() ? `GSTIN: ${env.businessGstin()}` : ""} ${env.businessAddress()}</p>
       <p style="margin:0;"><a href="${env.siteUrl()}/dashboard" style="color:#7dd3fc;">View in your dashboard</a></p>`,
    ),
  });
}

/** P-7: expiry reminders at 7 days and 1 day. */
export async function sendExpiryReminderEmail(options: {
  to: string;
  name: string | null;
  expiresAt: Date;
  daysLeft: number;
}): Promise<void> {
  const when =
    options.daysLeft <= 1 ? "tomorrow" : `in ${options.daysLeft} days`;

  await sendEmail({
    to: options.to,
    subject: `Your PipelinePrep Premium access ends ${when}`,
    html: layout(
      "Your Premium access is ending soon",
      `<p style="margin:0 0 16px;">Hi ${options.name ?? "there"},</p>
       <p style="margin:0 0 16px;">Your Premium plan expires on <strong>${options.expiresAt.toDateString()}</strong> &mdash; ${when}. After that, your progress and history stay safe, but premium quizzes and scenarios lock again.</p>
       <p style="margin:0 0 20px;"><a href="${env.siteUrl()}/pricing" style="display:inline-block;background:#38bdf8;color:#04121f;text-decoration:none;font-weight:650;padding:12px 22px;border-radius:8px;">Renew Premium</a></p>
       <p style="margin:0;color:#94a3b8;font-size:13px;">Plans start at INR 199. No auto-renewal &mdash; you decide when to extend.</p>`,
    ),
  });
}

/** Career Tools waitlist confirmation (addendum). Unsubscribe token is the email. */
export async function sendCareerWaitlistEmail(options: {
  to: string;
  features: Array<"RESUME_MAKER" | "JD_MATCH" | "AI_REVIEW">;
}) {
  const labels: Record<string, string> = {
    RESUME_MAKER: "ATS-Friendly Resume Maker",
    JD_MATCH: "Job Description Match",
    AI_REVIEW: "AI Resume Review",
  };

  const chosen = options.features.map((f) => labels[f] ?? f);

  await sendEmail({
    to: options.to,
    subject: "You are on the PipelinePrep Career Tools waitlist",
    html: layout(
      "You are on the Career Tools waitlist",
      `<p style="margin:0 0 16px;">Thanks for signing up. These tools are still being built, so this is a note for when they are ready rather than something you can use today.</p>
       <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">You asked to hear about:</p>
       <ul style="margin:0 0 20px;padding-left:20px;">
         ${chosen.map((c) => `<li style="margin-bottom:4px;">${c}</li>`).join("")}
       </ul>
       <p style="margin:0 0 20px;">We will email you when Career Tools launches, and nothing else. No marketing, no sharing your details.</p>
       <p style="margin:0 0 6px;color:#94a3b8;font-size:13px;">Changed your mind?</p>
       <p style="margin:0 0 20px;font-size:13px;"><a href="${env.siteUrl()}/api/career-tools/unsubscribe?email=${encodeURIComponent(options.to)}" style="color:#7dd3fc;text-decoration:underline;">Unsubscribe from launch notifications</a></p>
       <p style="margin:0;color:#94a3b8;font-size:13px;">In the meantime, <a href="${env.siteUrl()}/quizzes" style="color:#7dd3fc;">the question bank and Daily Challenge are live</a>.</p>`,
    ),
  });
}

export async function sendAdminAlertEmail(options: {
  to: string;
  subject: string;
  lines: string[];
}): Promise<void> {
  await sendEmail({
    to: options.to,
    subject: options.subject,
    html: layout(
      options.subject,
      options.lines
        .map((l) => `<p style="margin:0 0 10px;">${l}</p>`)
        .join(""),
    ),
  });
}
