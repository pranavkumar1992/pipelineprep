import "server-only";
import type { Coupon, Plan } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CouponCheck =
  | { ok: true; coupon: Coupon; discountPaise: number; finalPaise: number }
  | { ok: false; reason: string };

/**
 * Validates a coupon against a plan and price, and computes the discount (P-4).
 *
 * Rules enforced:
 *  - code exists, is active, and is within its validity window
 *  - global usage cap not reached
 *  - the plan is in the coupon's allowed list (an empty list means "all plans")
 *  - the signed-in user has not already used it `perUserLimit` times
 *
 * All amounts are paise.
 */
export async function evaluateCoupon(options: {
  code: string;
  plan: Pick<Plan, "id" | "priceInr">;
  userId?: string | null;
}): Promise<CouponCheck> {
  const code = options.code.trim().toUpperCase();
  if (!code) return { ok: false, reason: "Enter a coupon code." };

  const coupon = await prisma.coupon.findUnique({
    where: { code },
    include: { plans: { select: { planId: true } } },
  });

  if (!coupon) return { ok: false, reason: "That coupon code is not valid." };
  if (!coupon.active) {
    return { ok: false, reason: "That coupon has been deactivated." };
  }

  const now = new Date();
  if (coupon.validFrom > now) {
    return { ok: false, reason: "That coupon is not active yet." };
  }
  if (coupon.validTo && coupon.validTo < now) {
    return { ok: false, reason: "That coupon has expired." };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, reason: "That coupon has reached its usage limit." };
  }

  const allowedPlans = coupon.plans.map((p) => p.planId);
  if (allowedPlans.length > 0 && !allowedPlans.includes(options.plan.id)) {
    return { ok: false, reason: "That coupon does not apply to this plan." };
  }

  if (options.userId) {
    const usedByUser = await prisma.order.count({
      where: {
        userId: options.userId,
        couponId: coupon.id,
        status: "PAID",
      },
    });
    if (usedByUser >= coupon.perUserLimit) {
      return {
        ok: false,
        reason: "You have already used this coupon.",
      };
    }
  }

  const pricePaise = options.plan.priceInr * 100;
  let discountPaise =
    coupon.type === "PERCENT"
      ? Math.round((pricePaise * coupon.value) / 100)
      : coupon.value * 100;

  // Never discount below zero, and never above the price itself.
  discountPaise = Math.max(0, Math.min(discountPaise, pricePaise));

  return {
    ok: true,
    coupon,
    discountPaise,
    finalPaise: pricePaise - discountPaise,
  };
}

/** Applies the increment atomically enough for our single-node deployment. */
export async function incrementCouponUsage(couponId: string): Promise<void> {
  await prisma.coupon.update({
    where: { id: couponId },
    data: { usedCount: { increment: 1 } },
  });
}
