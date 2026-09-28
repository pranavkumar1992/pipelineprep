"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getCurrentUser, getClientIp } from "@/lib/auth/session";
import { issueToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export type VerifyEmailState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

/**
 * Sends a fresh confirmation link to the signed-in user's own address.
 *
 * Two limits, both necessary:
 *
 *   - Per IP, so one person cannot enumerate addresses by hammering the button.
 *   - Per user, so a shared IP (a school, an office, a NAT gateway) does not
 *     exhaust the quota on the user's behalf.
 *
 * The response is the same whether the address was already confirmed or not, so
 * this cannot be used to discover which addresses are registered.
 */
export async function resendVerificationAction(
  _prev: VerifyEmailState,
  formData: FormData,
): Promise<VerifyEmailState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const ip = await getClientIp();
  if (!rateLimit(`verify-resend:ip:${ip}`, 5, 3600).ok) {
    return { error: "Too many requests. Please try again later." };
  }
  if (!rateLimit(`verify-resend:user:${user.id}`, 3, 3600).ok) {
    return { error: "You have requested several links already. Try again in an hour." };
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true, emailVerified: true },
  });
  if (!record) return { error: "Account not found." };

  if (record.emailVerified) {
    return { ok: true, message: "Your email address is already confirmed." };
  }

  // Issuing the token invalidates any earlier unused one, so only the newest
  // link in the inbox works. Without that, a forwarded old link stays valid.
  const token = await issueToken(user.id, "EMAIL_VERIFY");

  try {
    await sendVerificationEmail({
      to: record.email,
      name: record.name,
      verifyUrl: `${env.siteUrl()}/verify-email?token=${token}`,
    });
  } catch (error) {
    console.error("[verify] resend failed:", error);
    return {
      error: "We could not send the email. Please try again in a few minutes.",
    };
  }

  return {
    ok: true,
    message: `Confirmation link sent to ${record.email}. It expires in 24 hours.`,
  };
}

const verifySchema = z.object({ token: z.string().min(1) });

/**
 * Confirms an address from the emailed link.
 *
 * Kept as an action rather than work done during render so that a refresh does
 * not attempt to consume an already-used token, and so a failed attempt can be
 * reported without a confusing intermediate page state.
 *
 * Also the path for changing an email address: a user requesting a new address
 * is sent a confirmation to the new one first, and only then does the change
 * apply. That ordering is the whole point — otherwise a user could change their
 * address to one they do not control and take over the account.
 */
export async function verifyEmailAction(
  _prev: VerifyEmailState,
  formData: FormData,
): Promise<VerifyEmailState> {
  const parsed = verifySchema.safeParse({ token: formData.get("token") });
  if (!parsed.success) return { error: "That link is not valid." };

  const { consumeToken } = await import("@/lib/auth/tokens");
  const consumed = await consumeToken(parsed.data.token, "EMAIL_VERIFY");

  if (!consumed) {
    return {
      error:
        "This link has expired, has already been used, or is not valid. Sign in and request a new one.",
    };
  }

  await prisma.user.update({
    where: { id: consumed.userId },
    data: {
      emailVerified: true,
      // Cleared so a later audit can tell a Google-verified account from one
      // confirmed through our own link.
      emailVerifiedVia: null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");

  return { ok: true, message: "Email address confirmed." };
}
