import "server-only";
import { prisma } from "@/lib/db";
import { evaluateCoupon, incrementCouponUsage } from "@/lib/coupons";
import {
  buildInvoiceNumber,
  createGatewayOrder,
  LIFETIME_EXPIRY,
  planExpiry,
  splitGst,
} from "@/lib/payments/razorpay";
import { getPaymentSettings } from "@/lib/settings";
import { sendInvoiceEmail } from "@/lib/email";

export type CheckoutQuote = {
  planId: string;
  planName: string;
  durationDays: number;
  lifetime: boolean;
  pricePaise: number;
  discountPaise: number;
  payablePaise: number;
  taxPaise: number;
  totalPaise: number;
  couponCode: string | null;
  couponError: string | null;
};

/**
 * Prices a plan, optionally with a coupon. Prices in the database are GST
 * inclusive, matching how the pricing page advertises them; the tax portion is
 * split out for the invoice (P-6).
 */
export async function quote(options: {
  planId: string;
  couponCode?: string | null;
  userId?: string | null;
}): Promise<QuoteResult> {
  const plan = await prisma.plan.findFirst({
    where: { id: options.planId, active: true },
  });
  if (!plan) {
    return { ok: false, error: "That plan is not available." };
  }

  const pricePaise = plan.priceInr * 100;
  let discountPaise = 0;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  let couponError: string | null = null;

  if (options.couponCode?.trim()) {
    const result = await evaluateCoupon({
      code: options.couponCode,
      plan,
      userId: options.userId,
    });
    if (result.ok) {
      discountPaise = result.discountPaise;
      couponId = result.coupon.id;
      couponCode = result.coupon.code;
    } else {
      couponError = result.reason;
    }
  }

  const payablePaise = pricePaise - discountPaise;
  const { gstRate } = await getPaymentSettings();
  const { taxPaise } = splitGst(payablePaise, gstRate);

  return {
    ok: true,
    quote: {
      planId: plan.id,
      planName: plan.name,
      durationDays: plan.durationDays,
      lifetime: plan.lifetime,
      pricePaise,
      discountPaise,
      payablePaise,
      taxPaise,
      totalPaise: payablePaise,
      couponCode,
      couponError,
    } satisfies CheckoutQuote,
    couponId,
  };
}

type QuoteResult =
  | { ok: true; quote: CheckoutQuote; couponId: string | null }
  | { ok: false; error: string };

/**
 * Creates the local Order row and, when the gateway is configured, the
 * matching gateway order. The webhook is what activates access, so a user who
 * abandons the checkout simply leaves a CREATED order behind.
 */
export async function beginCheckout(options: {
  userId: string;
  planId: string;
  couponCode?: string | null;
}): Promise<
  | { ok: true; orderId: string; gatewayOrderId: string | null; amountPaise: number; quote: CheckoutQuote }
  | { ok: false; error: string }
> {
  const priced = await quote({
    planId: options.planId,
    couponCode: options.couponCode,
    userId: options.userId,
  });
  if (!priced.ok) return priced;

  const plan = await prisma.plan.findUnique({
    where: { id: options.planId },
  });
  if (!plan) return { ok: false, error: "That plan is not available." };

  // A 100% coupon should not create a zero-amount gateway order.
  if (priced.quote.payablePaise <= 0) {
    return {
      ok: false,
      error:
        "This coupon makes the plan free. Contact support and we will grant it for you.",
    };
  }

  const order = await prisma.order.create({
    data: {
      userId: options.userId,
      planId: plan.id,
      couponId: priced.couponId,
      amount: priced.quote.totalPaise,
      subtotal: priced.quote.pricePaise,
      discount: priced.quote.discountPaise,
      taxPaise: priced.quote.taxPaise,
      status: "CREATED",
    },
  });

  let gatewayOrderId: string | null = null;
  // When the gateway is unavailable the order is still created and the user can
  // pay by other means; `gatewayOrderId` staying null is what the checkout form
  // checks before showing the payment dialog.
  const gateway = await createGatewayOrder({
    amountPaise: priced.quote.totalPaise,
    receipt: order.id,
    notes: { orderId: order.id, userId: options.userId, planId: plan.id },
  });
  if (gateway) {
    gatewayOrderId = gateway.id;
    await prisma.order.update({
      where: { id: order.id },
      data: { gatewayOrderId: gateway.id },
    });
  }

  return {
    ok: true,
    orderId: order.id,
    gatewayOrderId,
    amountPaise: priced.quote.totalPaise,
    quote: priced.quote,
  };
}

/**
 * Activates Premium for a paid order. Idempotent: safe to call from both the
 * browser callback and the webhook for the same payment (P-5).
 */
export async function activateSubscription(options: {
  orderId: string;
  gatewayPaymentId: string;
}): Promise<{ ok: boolean; error?: string; invoiceNumber?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: options.orderId },
    include: { plan: true, user: true, coupon: true },
  });

  if (!order) return { ok: false, error: "Order not found." };

  // Already settled: treat as success so retries are no-ops.
  if (order.status === "PAID") {
    return { ok: true, invoiceNumber: order.invoiceNumber ?? undefined };
  }

  if (order.gatewayPaymentId && order.gatewayPaymentId !== options.gatewayPaymentId) {
    return { ok: false, error: "Payment id does not match this order." };
  }

  const paidAt = new Date();
  const existing = await prisma.subscription.findFirst({
    where: { userId: order.userId, status: "ACTIVE" },
    orderBy: { expiresAt: "desc" },
  });

  // Renewals extend from the current expiry rather than today.
  const base =
    existing && existing.expiresAt.getTime() > paidAt.getTime()
      ? existing.expiresAt
      : paidAt;
  const expiresAt = planExpiry(base, order.plan);

  const year = paidAt.getFullYear();
  const sequence = await prisma.order.count({
    where: { invoiceNumber: { startsWith: `PP-INV-${year}-` } },
  });
  const invoiceNumber = buildInvoiceNumber(sequence + 1, year);

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        gatewayPaymentId: options.gatewayPaymentId,
        invoiceNumber,
      },
    });

    await tx.subscription.create({
      data: {
        userId: order.userId,
        planId: order.planId,
        orderId: order.id,
        startsAt: base,
        expiresAt,
        status: "ACTIVE",
        source: "checkout",
      },
    });

    if (order.couponId) {
      await tx.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }
  });

  // Notifications are best-effort and must not fail the transaction above.
  try {
    await sendInvoiceEmail({
      to: order.user.email,
      orderId: order.id,
      invoiceNumber,
      planName: order.plan.name,
      amountPaise: order.subtotal - order.discount,
      taxPaise: order.taxPaise,
      startsAt: base,
      expiresAt,
    });
  } catch (error) {
    console.error("[checkout] invoice email failed:", error);
  }

  return { ok: true, invoiceNumber };
}

export async function markOrderFailed(orderId: string): Promise<void> {
  await prisma.order.updateMany({
    where: { id: orderId, status: "CREATED" },
    data: { status: "FAILED" },
  });
}

/** P-8: admin manual grant. Extends from current expiry like a purchase. */
export async function grantPremium(options: {
  userId: string;
  planId: string;
  days?: number;
  note?: string;
  grantedBy: string;
}): Promise<{ ok: boolean; error?: string; expiresAt?: Date }> {
  const plan = await prisma.plan.findUnique({ where: { id: options.planId } });
  if (!plan) return { ok: false, error: "Plan not found." };

  const now = new Date();
  const existing = await prisma.subscription.findFirst({
    where: { userId: options.userId, status: "ACTIVE" },
    orderBy: { expiresAt: "desc" },
  });

  const base =
    existing && existing.expiresAt.getTime() > now.getTime()
      ? existing.expiresAt
      : now;

  // A manual grant of days overrides the plan, except for lifetime access where
  // there is nothing to add.
  const expiresAt = plan.lifetime
    ? LIFETIME_EXPIRY
    : planExpiry(base, { ...plan, durationDays: options.days ?? plan.durationDays });

  await prisma.subscription.create({
    data: {
      userId: options.userId,
      planId: plan.id,
      startsAt: base,
      expiresAt,
      status: "ACTIVE",
      source: `admin:${options.grantedBy}`,
    },
  });

  return { ok: true, expiresAt };
}
