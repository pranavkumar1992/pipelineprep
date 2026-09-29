import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { setSessionCookie } from "@/lib/auth/session";
import {
  exchangeCodeForProfile,
  readStateJwt,
} from "@/lib/auth/google";
import { resolveGoogleLogin } from "@/lib/auth/google-link";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * Google's redirect target: exchanges the code, resolves the account and starts
 * a session.
 *
 * Error handling is deliberately uniform from the outside. Google itself sends
 * `error=access_denied` when a user clicks Cancel, which is not an error at all
 * and must not be logged or rendered as one. Every genuine failure lands on the
 * same page with the same generic message; the detail goes to the server log,
 * where an operator can read it and a user cannot probe for it.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const origin = env.siteUrl();

  const failure = (reason: string, detail?: unknown) => {
    if (detail) console.error(`[google-oauth] ${reason}:`, detail);
    return NextResponse.redirect(
      new URL(`/login?error=google-failed`, origin),
    );
  };

  if (!env.googleEnabled) {
    return NextResponse.redirect(
      new URL("/login?error=google-not-configured", origin),
    );
  }

  // The user declined consent. Not an error, just a return trip.
  if (url.searchParams.get("error")) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) return failure("missing code or state");

  // An unverified or expired state is treated as a failed attempt, full stop.
  // Falling back to a default destination here would drop CSRF protection.
  const verifiedState = await readStateJwt(state);
  if (!verifiedState) return failure("state verification failed");

  let profile;
  try {
    profile = await exchangeCodeForProfile({
      code,
      redirectUri: env.googleRedirectUri(),
    });
  } catch (error) {
    return failure("token exchange failed", error);
  }

  let result;
  try {
    result = await resolveGoogleLogin(profile);
  } catch (error) {
    return failure("account resolution failed", error);
  }

  if (result.status === "account-exists") {
    /*
     * An account with a password already owns this address. Send them to the
     * password form rather than silently merging, because a merge would hand
     * over attempts, progress and any active subscription.
     */
    return NextResponse.redirect(
      new URL("/login?error=google-account-exists", origin),
    );
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: result.userId },
    select: { id: true, email: true, name: true, role: true, emailVerified: true },
  });

  await setSessionCookie({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  /*
   * Welcome email on first sign-in only. A returning user who clicks the Google
   * button again should not receive a "welcome aboard" message.
   *
   * This is also the fallback for the rare case where Google returns an address
   * it has not verified: the account starts unverified and the user gets an
   * email they can actually click to fix it.
   */
  if (result.status === "created") {
    try {
      const { issueToken } = await import("@/lib/auth/tokens");
      const token = await issueToken(user.id, "EMAIL_VERIFY");
      await sendWelcomeEmail({
        to: user.email,
        name: user.name,
        verifyUrl: user.emailVerified
          ? undefined
          : `${env.siteUrl()}/verify-email?token=${token}`,
      });
    } catch (error) {
      console.error("[google-oauth] welcome email failed:", error);
    }
  }

  return NextResponse.redirect(new URL(verifiedState.next, origin));
}
