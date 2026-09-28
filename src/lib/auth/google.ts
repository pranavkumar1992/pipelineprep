import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

/**
 * Google OAuth 2.0 authorisation-code flow, implemented directly rather than
 * through a provider library.
 *
 * Two reasons for the direct implementation:
 *
 *   1. The surface is small: one redirect, one token exchange, one userinfo
 *      call. A library would add a dependency and a layer of configuration for
 *      three HTTP requests.
 *   2. The pieces worth reviewing are exactly the security-relevant ones. A
 *      hand-written flow makes it obvious that the state parameter is verified,
 *      that the redirect URI is pinned, and that the client secret never leaves
 *      the server.
 *
 * See ARCHITECTURE.md for what would need to change before adding a second
 * provider.
 */

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

/** Ten minutes. Long enough for a slow consent screen, short enough to bound replay. */
const STATE_TTL = 600;

export type GoogleProfile = {
  /** Google's stable subject id. Authoritative for identity; email can change. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

/**
 * Mints the CSRF `state` value.
 *
 * Carries the post-login destination so the user returns where they started.
 * Signed so it cannot be forged, and short-lived so a leaked URL is not useful.
 */
export async function createStateJwt(next: string): Promise<string> {
  return new SignJWT({ next })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("pipelineprep-google")
    .setAudience("google-oauth")
    .setExpirationTime(`${STATE_TTL}s`)
    .sign(new TextEncoder().encode(env.authSecret()));
}

/**
 * Verifies the state value, returning the destination path or null.
 *
 * Returns null on any failure rather than throwing, so the caller can reject the
 * whole callback instead of trusting an unverified parameter.
 */
export async function readStateJwt(
  state: string,
): Promise<{ next: string } | null> {
  try {
    const { payload } = await jwtVerify(
      state,
      new TextEncoder().encode(env.authSecret()),
      { issuer: "pipelineprep-google", audience: "google-oauth" },
    );
    return { next: typeof payload.next === "string" ? payload.next : "/" };
  } catch {
    return null;
  }
}

/** Builds the consent-screen URL the browser is redirected to. */
export function googleAuthUrl(options: {
  state: string;
  redirectUri: string;
}): string {
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: options.redirectUri,
    response_type: "code",
    // `openid` is what makes Google return a stable `sub` claim. Without it a
    // userinfo response is not guaranteed to identify anyone.
    scope: "openid email profile",
    state: options.state,
    access_type: "online",
    // Always prompt, rather than auto-approving. Silent approval would let any
    // page that references the client id log a user in without consent.
    prompt: "select_account",
    include_granted_scopes: "true",
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchanges the authorisation code for the profile.
 *
 * The code is single-use and short-lived, and the redirect URI must be sent
 * identically here as it was in the authorisation request or Google rejects it.
 */
export async function exchangeCodeForProfile(options: {
  code: string;
  redirectUri: string;
}): Promise<GoogleProfile> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: options.code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: options.redirectUri,
      grant_type: "authorization_code",
    }),
    // Never cache: the response carries a bearer token.
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status})`);
  }

  const token = (await response.json()) as { access_token?: string };
  if (!token.access_token) {
    throw new Error("Google token exchange returned no access token");
  }

  const profileResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });

  if (!profileResponse.ok) {
    throw new Error(`Google userinfo failed (${profileResponse.status})`);
  }

  const raw = (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  if (!raw.sub || !raw.email) {
    throw new Error("Google profile is missing an identifier");
  }

  return {
    sub: raw.sub,
    email: raw.email.toLowerCase(),
    // Absent means unverified, not verified. Defaulting to false is the safe
    // direction: we would rather ask someone to click a link than skip it.
    emailVerified: raw.email_verified === true,
    name: raw.name ?? null,
    picture: raw.picture ?? null,
  };
}
