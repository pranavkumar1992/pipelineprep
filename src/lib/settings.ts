import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * Operational settings stored in the database, with environment variables as a
 * fallback.
 *
 * Two reasons this exists rather than reading env directly:
 *   1. The founder should be able to paste Razorpay keys from the admin panel
 *      without editing files on the server or rebuilding the container.
 *   2. Values can be changed without a redeploy, which matters for the GST rate
 *      and for turning checkout off while debugging.
 *
 * Env always wins when it is set, so a deployment that pins credentials in its
 * environment cannot be silently overridden from the UI. That also means the
 * admin panel shows which source is actually in effect.
 */

export const SETTING_KEYS = {
  razorpayKeyId: "razorpay.key_id",
  razorpayKeySecret: "razorpay.key_secret",
  razorpayWebhookSecret: "razorpay.webhook_secret",
  gstRate: "payments.gst_rate",
  /** When "false", checkout is refused even if keys are present. */
  checkoutEnabled: "payments.checkout_enabled",
  careerToolsEnabled: "feature.career_tools_enabled",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export type PaymentSettings = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  gstRate: number;
  checkoutEnabled: boolean;
  /** Where each credential actually came from, for display in the admin UI. */
  sources: Record<string, "env" | "database" | "unset">;
};

/** Reads every settings row in one query, ignoring malformed values. */
async function readAll(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  } catch (error) {
    // A missing settings table must not take down pricing or checkout.
    console.error("[settings] could not read settings:", error);
    return {};
  }
}

/** Env value wins if present; otherwise the database; otherwise nothing. */
function resolve(
  stored: Record<string, string>,
  key: SettingKey,
  envName: string,
): { value: string; source: "env" | "database" | "unset" } {
  const fromEnv = process.env[envName];
  if (fromEnv !== undefined && fromEnv !== "") {
    return { value: fromEnv, source: "env" };
  }

  const fromDb = stored[key];
  if (fromDb !== undefined && fromDb !== "") {
    return { value: fromDb, source: "database" };
  }

  return { value: "", source: "unset" };
}

/**
 * Current payment configuration.
 *
 * Cached per request so the pricing page, the checkout action and the webhook
 * handler each read the database at most once.
 */
export const getPaymentSettings = cache(async (): Promise<PaymentSettings> => {
  const stored = await readAll();

  const keyId = resolve(stored, SETTING_KEYS.razorpayKeyId, "RAZORPAY_KEY_ID");
  const keySecret = resolve(
    stored,
    SETTING_KEYS.razorpayKeySecret,
    "RAZORPAY_KEY_SECRET",
  );
  const webhookSecret = resolve(
    stored,
    SETTING_KEYS.razorpayWebhookSecret,
    "RAZORPAY_WEBHOOK_SECRET",
  );
  const gst = resolve(stored, SETTING_KEYS.gstRate, "GST_RATE");
  const enabled = resolve(
    stored,
    SETTING_KEYS.checkoutEnabled,
    "CHECKOUT_ENABLED",
  );

  const gstRate = Number(gst.value);

  return {
    keyId: keyId.value,
    keySecret: keySecret.value,
    webhookSecret: webhookSecret.value,
    gstRate: Number.isFinite(gstRate) && gstRate >= 0 ? gstRate : 18,
    // Defaulting to enabled means an install with keys works without also
    // having to set a second flag.
    checkoutEnabled: enabled.value === "" ? true : enabled.value === "true",
    sources: {
      keyId: keyId.source,
      keySecret: keySecret.source,
      webhookSecret: webhookSecret.source,
      gstRate: gst.source,
    },
  };
});

/** True when checkout can actually run: keys present and not switched off. */
export async function isCheckoutEnabled(): Promise<boolean> {
  const settings = await getPaymentSettings();
  return (
    settings.checkoutEnabled &&
    settings.keyId !== "" &&
    settings.keySecret !== ""
  );
}

/**
 * True when the Career Tools teaser should be visible.
 *
 * Both the environment variable and the database setting are honoured, so the
 * feature can be switched on either at deploy time or from the admin panel.
 */
export async function isCareerToolsLive(): Promise<boolean> {
  const raw = process.env.CAREER_TOOLS_ENABLED;
  if (raw !== undefined && raw !== "") return raw === "true";

  const stored = await readAll();
  return stored[SETTING_KEYS.careerToolsEnabled] === "true";
}

/** Upserts one setting. Silently ignores blank values so keys can be cleared. */
export async function writeSetting(
  key: SettingKey,
  value: string,
): Promise<void> {
  if (value === "") {
    await prisma.setting.deleteMany({ where: { key } });
    return;
  }
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/** Masks a secret for display: only the last four characters are shown. */
export function maskSecret(value: string): string {
  if (value === "") return "not set";
  if (value.length <= 8) return "\u2022".repeat(value.length);
  return `${"\u2022".repeat(Math.min(12, value.length - 4))}${value.slice(-4)}`;
}
