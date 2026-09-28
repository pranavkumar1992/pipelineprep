import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "./session";

export type Entitlement = {
  isPremium: boolean;
  expiresAt: Date | null;
  planName: string | null;
};

/**
 * Resolves the caller's Premium entitlement.
 *
 * This is the single gate used by every premium content path (P-1, and the
 * "free user cannot access premium content through direct URLs or API calls"
 * acceptance criterion). Expiry is evaluated against the current time on every
 * call rather than trusting the stored `status`, so a lapsed subscription
 * loses access immediately without needing a scheduled job to run.
 */
export const getEntitlement = cache(async (): Promise<Entitlement> => {
  const user = await getCurrentUser();
  if (!user) return { isPremium: false, expiresAt: null, planName: null };

  // Admins can review all content regardless of subscription state.
  if (user.role === "ADMIN") {
    return { isPremium: true, expiresAt: null, planName: "Admin" };
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { expiresAt: "desc" },
    include: { plan: { select: { name: true } } },
  });

  if (!sub) return { isPremium: false, expiresAt: null, planName: null };

  if (sub.expiresAt.getTime() <= Date.now()) {
    // Lazily flip the row so dashboards and reports stay accurate.
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "EXPIRED" },
    });
    return { isPremium: false, expiresAt: sub.expiresAt, planName: null };
  }

  return {
    isPremium: true,
    expiresAt: sub.expiresAt,
    planName: sub.plan.name,
  };
});

/** True when the user may open premium content. Use in pages and API routes. */
export async function canAccessPremium(): Promise<boolean> {
  return (await getEntitlement()).isPremium;
}

/**
 * Why an unconfirmed address matters.
 *
 * Verification is required for checkout, not for signing in or practising. That
 * split is deliberate:
 *
 *   - Gating sign-in would lock someone out of content they legitimately paid
 *     for and punish them for an email delivery problem.
 *   - Gating checkout is proportionate: money is involved, and an unconfirmed
 *     address is exactly what payment-account-takeover attempts rely on.
 *
 * An address confirmed by Google is trusted directly, so those users never hit
 * this gate at all.
 */
export async function getEmailVerificationState(): Promise<{
  verified: boolean;
  verifiedVia: string | null;
  email: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { verified: true, verifiedVia: null, email: "" };

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, emailVerified: true, emailVerifiedVia: true },
  });

  if (!record) return { verified: true, verifiedVia: null, email: "" };

  // Admins can grant premium by hand, which is usually a support action on an
  // account that cannot receive mail. Blocking their checkout would be wrong.
  if (user.role === "ADMIN") {
    return { verified: true, verifiedVia: "admin", email: record.email };
  }

  return {
    verified: record.emailVerified,
    verifiedVia: record.emailVerifiedVia,
    email: record.email,
  };
}

/** True when the user must confirm their address before paying. */
export async function checkoutRequiresVerifiedEmail(): Promise<boolean> {
  return !(await getEmailVerificationState()).verified;
}

/** Flips ACTIVE -> EXPIRED for anything past its expiry date. */
export async function expireStaleSubscriptions(): Promise<number> {
  const { count } = await prisma.subscription.updateMany({
    where: { status: "ACTIVE", expiresAt: { lte: new Date() } },
    data: { status: "EXPIRED" },
  });
  return count;
}
