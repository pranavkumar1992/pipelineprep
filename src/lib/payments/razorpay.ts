import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { getPaymentSettings } from "@/lib/settings";

/**
 * Cached per key pair rather than globally: the admin panel can change
 * credentials, and a module-level singleton would keep serving the old ones
 * until the process restarted.
 */
const clients = new Map<string, Razorpay>();

/**
 * Lazily constructed Razorpay client, or null when checkout is disabled or keys
 * are missing. Reads settings from the database with an environment fallback.
 */
export async function getRazorpay(): Promise<Razorpay | null> {
  const settings = await getPaymentSettings();

  if (!settings.checkoutEnabled) return null;
  if (!settings.keyId || !settings.keySecret) return null;

  const cacheKey = `${settings.keyId}:${settings.keySecret}`;
  const existing = clients.get(cacheKey);
  if (existing) return existing;

  const client = new Razorpay({
    key_id: settings.keyId,
    key_secret: settings.keySecret,
  });
  clients.set(cacheKey, client);
  return client;
}

export type GatewayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
};

export async function createGatewayOrder(options: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<GatewayOrder | null> {
  const rzp = await getRazorpay();
  if (!rzp) return null;

  const order = await rzp.orders.create({
    amount: options.amountPaise,
    currency: "INR",
    // Razorpay caps receipts at 40 characters.
    receipt: options.receipt.slice(0, 40),
    notes: options.notes ?? {},
  });

  // Razorpay types these fields loosely; narrow them for our own use.
  return {
    id: String(order.id),
    amount: Number(order.amount),
    currency: String(order.currency),
    receipt: String(order.receipt),
  };
}

export async function fetchGatewayOrder(
  orderId: string,
): Promise<{ id: string; amount: number; currency: string; status: string; paid?: boolean } | null> {
  const rzp = await getRazorpay();
  if (!rzp) return null;
  try {
    const order = await rzp.orders.fetch(orderId);
    return {
      id: String(order.id),
      amount: Number(order.amount),
      currency: String(order.currency),
      status: String(order.status),
      paid: Boolean((order as { paid?: boolean }).paid),
    };
  } catch {
    return null;
  }
}

/** Razorpay refund (P-7: admin refund marking; also used by the admin panel). */
export async function createGatewayRefund(options: {
  paymentId: string;
  amountPaise?: number;
  notes?: Record<string, string>;
}): Promise<{ id: string } | null> {
  const rzp = await getRazorpay();
  if (!rzp) return null;
  try {
    const refund = await rzp.payments.refund(options.paymentId, {
      amount: options.amountPaise,
      notes: options.notes ?? {},
    });
    return { id: refund.id };
  } catch {
    return null;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies the `rzp_checkout_*` signature the browser returns after checkout
 * (P-5). Rejects tampered or replayed amounts.
 */
export async function verifyCheckoutSignature(options: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<boolean> {
  const settings = await getPaymentSettings();
  if (!settings.keySecret) return false;
  const expected = createHmac("sha256", settings.keySecret)
    .update(`${options.razorpayOrderId}|${options.razorpayPaymentId}`)
    .digest("hex");
  return safeEqual(expected, options.signature);
}

/**
 * Verifies the `X-Razorpay-Signature` header on a webhook request (P-5).
 * The signed payload is the exact raw body plus the shared webhook secret.
 */
export async function verifyWebhookSignature(options: {
  rawBody: string;
  signature: string | null;
}): Promise<boolean> {
  const settings = await getPaymentSettings();
  if (!settings.webhookSecret) return false;
  if (!options.signature) return false;
  const expected = createHmac("sha256", settings.webhookSecret)
    .update(options.rawBody)
    .digest("hex");
  return safeEqual(expected, options.signature);
}

/** Subscriptions start on top of any remaining access so purchases stack. */
export function computeAccessWindow(currentExpiry: Date | null): {
  startsAt: Date;
  expiresAt: Date;
} {
  const now = new Date();
  const startsAt =
    currentExpiry && currentExpiry.getTime() > now.getTime()
      ? currentExpiry
      : now;
  return { startsAt, expiresAt: startsAt };
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Far-future expiry used for pay-once ("lifetime") plans.
 *
 * `Subscription.expiresAt` is non-nullable and entitlement is evaluated by
 * comparing it to now, so a lifetime purchase needs a sentinel expiry rather
 * than a nullable one. 100 years out is effectively permanent but keeps the
 * value a real date that sorts and formats correctly.
 */
export const LIFETIME_EXPIRY = new Date("2126-01-01T00:00:00.000Z");

/** Resolves a plan's expiry, honouring the lifetime flag over durationDays. */
export function planExpiry(
  from: Date,
  plan: { durationDays: number; lifetime: boolean },
): Date {
  return plan.lifetime ? LIFETIME_EXPIRY : addDays(from, plan.durationDays);
}

/**
 * Splits a GST-inclusive amount into base and tax parts, in paise.
 * `totalPaise` is what the customer pays.
 */
export function splitGst(totalPaise: number, ratePercent: number) {
  const taxable = Math.round(totalPaise / (1 + ratePercent / 100));
  return {
    subtotalPaise: taxable,
    taxPaise: totalPaise - taxable,
  };
}

/** Sequential invoice number: PP-INV-2026-000123. */
export function buildInvoiceNumber(sequence: number, year = new Date().getFullYear()) {
  return `PP-INV-${year}-${String(sequence).padStart(6, "0")}`;
}
