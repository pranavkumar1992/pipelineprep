import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createStateJwt, googleAuthUrl } from "@/lib/auth/google";
import { getClientIp } from "@/lib/auth/session";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

/**
 * Starts Google sign-in by redirecting to the consent screen.
 *
 * GET rather than POST because this is a navigation the browser follows, not a
 * form submission. Nothing is trusted from the query string except the
 * destination, which is validated and signed into `state` on the way out.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);

  const origin = env.siteUrl();

  if (!env.googleEnabled) {
    return NextResponse.redirect(
      new URL("/login?error=google-not-configured", origin),
    );
  }

  const ip = await getClientIp();
  const limit = rateLimit(`google-oauth:${ip}`, LIMITS.login.limit, LIMITS.login.window);
  if (!limit.ok) {
    return NextResponse.redirect(
      new URL("/login?error=too-many-attempts", origin),
    );
  }

  /*
   * Only same-origin relative paths survive. Anything else is replaced with the
   * dashboard, so `next` cannot be used to bounce someone to another site after
   * they authenticate.
   */
  const raw = url.searchParams.get("next") ?? "";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";

  const state = await createStateJwt(next);
  const redirectUri = env.googleRedirectUri();

  return NextResponse.redirect(googleAuthUrl({ state, redirectUri }));
}
