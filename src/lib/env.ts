/**
 * Centralised, typed access to environment variables.
 *
 * Everything is read lazily through a getter so that importing this module
 * never throws at build time (Next.js evaluates modules during `next build`
 * without runtime env vars present).
 */

const isProd = process.env.NODE_ENV === "production";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return value;
}

export const env = {
  get isProd() {
    return isProd;
  },

  siteUrl: () =>
    (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
      /\/$/,
      "",
    ),

  databaseUrl: () => required("DATABASE_URL"),

  /**
   * Session signing key.
   *
   * Falls back to a dev-only constant so `next build` works without secrets
   * present, but that fallback is refused in production. A known signing key
   * means anyone can mint a session for any user id, and the middleware already
   * fails closed on a missing key — so without this guard the two halves
   * disagree and the app dies with an opaque 500 on every request instead of a
   * clear message at boot.
   */
  authSecret: () => {
    const secret = process.env.AUTH_SECRET;
    if (secret) return secret;
    if (isProd) {
      throw new Error(
        "AUTH_SECRET is not set. Generate one with: " +
          `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
      );
    }
    return "insecure-dev-secret-do-not-use-in-production-000000000";
  },

  /**
   * Google sign-in.
   *
   * The client secret is server-only and must never reach the browser: it
   * travels in the authorisation-code exchange, not the URL. The public client
   * id is exposed through the consent screen.
   */
  get googleClientId() {
    return process.env.GOOGLE_CLIENT_ID || "";
  },
  get googleClientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET || "";
  },
  /**
   * True only when both credentials are present. Gates the Google button so an
   * unconfigured install never shows a control that cannot work.
   */
  get googleEnabled() {
    return Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    );
  },
  /*
   * Must match a redirect URI registered in the Google console, byte for byte.
   *
   * `||` rather than `??`: the .env template ships this as an empty string, and
   * `??` would treat that as a configured value and send Google an empty
   * `redirect_uri`, which fails with a much less obvious error than the default
   * would produce.
   */
  googleRedirectUri: () =>
    process.env.GOOGLE_REDIRECT_URI ||
    `${(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")}/api/auth/google/callback`,

  get razorpayKeyId() {
    return process.env.RAZORPAY_KEY_ID || "";
  },
  get razorpayKeySecret() {
    return process.env.RAZORPAY_KEY_SECRET || "";
  },
  get razorpayWebhookSecret() {
    return process.env.RAZORPAY_WEBHOOK_SECRET || "";
  },
  /** True only when both API keys are present; gates the checkout UI. */
  get paymentsEnabled() {
    return Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
    );
  },

  get smtpHost() {
    return process.env.SMTP_HOST || "";
  },
  get smtpPort() {
    return Number(process.env.SMTP_PORT ?? 587);
  },
  get smtpSecure() {
    return process.env.SMTP_SECURE === "true";
  },
  get smtpUser() {
    return process.env.SMTP_USER || "";
  },
  get smtpPassword() {
    return process.env.SMTP_PASSWORD || "";
  },
  /** When SMTP is unconfigured, emails are logged to stdout instead of sent. */
  get emailEnabled() {
    return Boolean(process.env.SMTP_HOST);
  },
  emailFrom: () =>
    process.env.EMAIL_FROM ?? "PipelinePrep <no-reply@pipelineprep.in>",

  businessName: () => process.env.BUSINESS_NAME ?? "PipelinePrep",
  businessGstin: () => process.env.BUSINESS_GSTIN ?? "",
  businessAddress: () => process.env.BUSINESS_ADDRESS ?? "",
  businessSupportEmail: () =>
    process.env.BUSINESS_SUPPORT_EMAIL ?? "support@pipelineprep.in",
  businessPhone: () => process.env.SUPPORT_PHONE ?? "",

  /** GST rate as a percentage, used to split inclusive prices on invoices. */
  gstRate: () => Number(process.env.GST_RATE ?? 18),
};
