"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, getClientIp } from "@/lib/auth/session";
import { evaluateCoupon } from "@/lib/coupons";
import { splitGst } from "@/lib/payments/razorpay";
import { getPaymentSettings } from "@/lib/settings";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export type CouponState =
  | {
      ok: true;
      code: string;
      label: string;
      discountPaise: number;
      payablePaise: number;
      taxPaise: number;
    }
  | { ok: false; error: string };

const couponSchema = z.object({
  planId: z.string().min(1, "Choose a plan first."),
  code: z.string().trim().min(1, "Enter a coupon code."),
});

/**
 * Validates a coupon and returns the recalculated totals (P-4).
 *
 * Read-only: the coupon is only counted as used once the webhook confirms
 * payment, so an abandoned checkout does not burn a use.
 */
export async function checkCouponAction(
  input: unknown,
): Promise<CouponState> {
  const ip = await getClientIp();
  const limit = rateLimit(`coupon:${ip}`, 30, 60);
  if (!limit.ok) return { ok: false, error: "Too many attempts." };

  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const user = await getCurrentUser();

  const plan = await prisma.plan.findFirst({
    where: { id: parsed.data.planId, active: true, isFreeTier: false },
    select: {
      id: true,
      name: true,
      priceInr: true,
      durationDays: true,
      lifetime: true,
    },
  });
  if (!plan) return { ok: false, error: "That plan is not available." };

  const result = await evaluateCoupon({
    code: parsed.data.code,
    plan,
    userId: user?.id ?? null,
  });

  if (!result.ok) return { ok: false, error: result.reason };

  const payablePaise = plan.priceInr * 100 - result.discountPaise;
  const { taxPaise } = splitGst(payablePaise, (await getPaymentSettings()).gstRate);

  return {
    ok: true,
    code: result.coupon.code,
    label:
      result.coupon.type === "PERCENT"
        ? `${result.coupon.value}% off`
        : `\u20b9${result.coupon.value} off`,
    discountPaise: result.discountPaise,
    payablePaise,
    taxPaise,
  };
}

export type CheckoutState =
  | {
      ok: true;
      orderId: string;
      gatewayOrderId: string | null;
      amountPaise: number;
      planName: string;
      couponCode: string | null;
      razorpayKeyId: string | null;
    }
  | { ok: false; error: string };

const checkoutSchema = z.object({
  planId: z.string().min(1),
  couponCode: z.string().trim().max(40).optional(),
});

/**
 * Creates the pending order and the gateway order (P-3, P-5).
 *
 * Premium is NOT granted here. It is granted by the webhook handler, or by
 * verifying the checkout signature as a fallback if the webhook is delayed.
 */
export async function startCheckoutAction(
  input: unknown,
): Promise<CheckoutState> {
  const ip = await getClientIp();
  const limit = rateLimit(`checkout:${ip}`, LIMITS.checkout.limit, LIMITS.checkout.window);
  if (!limit.ok) {
    return { ok: false, error: "Too many checkout attempts. Please wait a moment." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to purchase Premium." };

  /*
   * Payment requires a confirmed address. This is checked server-side here
   * rather than only by hiding the button, because the endpoint is callable
   * directly. Practising is deliberately not gated: locking someone out of
   * content they can already see because an email bounced is a worse failure
   * than accepting the risk on a free account.
   */
  const { checkoutRequiresVerifiedEmail } = await import("@/lib/auth/entitlement");
  if (await checkoutRequiresVerifiedEmail()) {
    return {
      ok: false,
      error:
        "Confirm your email address before purchasing. Use the resend button on your dashboard.",
    };
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid checkout request." };

  // Imported here so the Razorpay client is only constructed when needed.
  const { beginCheckout } = await import("@/lib/orders");
  const result = await beginCheckout({
    userId: user.id,
    planId: parsed.data.planId,
    couponCode: parsed.data.couponCode || null,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/pricing");

  return {
    ok: true,
    orderId: result.orderId,
    gatewayOrderId: result.gatewayOrderId,
    amountPaise: result.amountPaise,
    planName: result.quote.planName,
    couponCode: result.quote.couponCode,
    razorpayKeyId: (await getPaymentSettings()).keyId || null,
  };
}

export type VerifyState =
  | { ok: true; invoiceNumber?: string }
  | { ok: false; error: string };

const verifySchema = z.object({
  orderId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

/**
 * Browser-side fallback for confirming payment.
 *
 * The webhook is the source of truth, but it can lag by a second or two. This
 * verifies the checkout signature (P-5) and activates access immediately.
 * `activateSubscription` is idempotent, so both paths running is safe.
 */
export async function verifyPaymentAction(input: unknown): Promise<VerifyState> {
  const ip = await getClientIp();
  const limit = rateLimit(`verify:${ip}`, 20, 300);
  if (!limit.ok) return { ok: false, error: "Too many verification attempts." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to complete your purchase." };

  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payment confirmation." };

  const { prisma: db } = await import("@/lib/db");
  const { verifyCheckoutSignature } = await import("@/lib/payments/razorpay");
  const { activateSubscription } = await import("@/lib/orders");

  const order = await db.order.findUnique({
    where: { id: parsed.data.orderId },
    select: { userId: true, gatewayOrderId: true, status: true },
  });

  if (!order || order.userId !== user.id) {
    return { ok: false, error: "Order not found." };
  }

  // Idempotent: already settled, so just succeed.
  if (order.status === "PAID") return { ok: true };

  if (
    !order.gatewayOrderId ||
    order.gatewayOrderId !== parsed.data.razorpayOrderId
  ) {
    return { ok: false, error: "Payment does not match this order." };
  }

  const signatureOk = await verifyCheckoutSignature({
    razorpayOrderId: parsed.data.razorpayOrderId,
    razorpayPaymentId: parsed.data.razorpayPaymentId,
    signature: parsed.data.razorpaySignature,
  });

  if (!signatureOk) {
    return { ok: false, error: "Payment verification failed. Contact support." };
  }

  const result = await activateSubscription({
    orderId: parsed.data.orderId,
    gatewayPaymentId: parsed.data.razorpayPaymentId,
  });

  if (!result.ok) return { ok: false, error: result.error ?? "Could not activate." };

  revalidatePath("/dashboard");
  revalidatePath("/pricing");

  return { ok: true, invoiceNumber: result.invoiceNumber };
}
