import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import type { Role } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "pp_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.authSecret());
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.isProd,
    path: "/",
    maxAge,
  };
}

/** Mints a signed session token for a user. */
export async function createSessionToken(user: {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer("pipelineprep")
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function setSessionCookie(
  user: { id: string; email: string; name: string | null; role: Role },
): Promise<void> {
  const token = await createSessionToken(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE));
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", cookieOptions(0));
}

async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "pipelineprep",
    });
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: String(payload.email ?? ""),
      name: (payload.name as string | null) ?? null,
      role: (payload.role as Role) ?? "USER",
    };
  } catch {
    return null;
  }
}

/**
 * Loads the live user row behind a verified session cookie.
 *
 * A valid signature is not by itself a session. The user has to still exist.
 * Skipping this check is not a theoretical problem: `deleteAccountAction`
 * removes the row but the browser keeps a 30-day cookie, and the middleware
 * cannot query the database, so it keeps bouncing `/login` back to the protected
 * page. The request then ping-pongs forever and the browser gives up with
 * `ERR_TOO_MANY_REDIRECTS` — the visitor is stuck on an error page with no way
 * to sign in again.
 *
 * One indexed primary-key lookup per request, and `cache` means a Server
 * Component tree pays for it once. `getSession` and `getCurrentUser` both read
 * from here rather than issuing their own query.
 */
const loadUserFromSession = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  return prisma.user.findUnique({
    where: { id: claims.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      targetRole: true,
      experience: true,
      showOnLeaderboard: true,
      displayName: true,
      createdAt: true,
    },
  });
});

/**
 * Returns the current session user, or null when signed out.
 *
 * Wrapped in React `cache` so a Server Component tree reads the cookie and
 * verifies the token once per request.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const user = await loadUserFromSession();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
});

/**
 * The full account record, for anything that depends on live state
 * (entitlements, profile, verification).
 */
export const getCurrentUser = cache(async () => loadUserFromSession());

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export const isAdmin = (user: { role: Role } | null): boolean =>
  user?.role === "ADMIN";

/** For pages that require any signed-in user. Redirects to login otherwise. */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = returnTo
      ? `/login?next=${encodeURIComponent(returnTo)}`
      : "/login";
    redirect(target);
  }
  return user;
}

/** For /admin/**. Non-admins are sent to the dashboard, not a 403 page. */
export async function requireAdmin(returnTo?: string): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (!isAdmin(user)) redirect("/dashboard");
  return user;
}

/**
 * Sends a signed-in visitor away from the auth screens.
 *
 * This lives here rather than in `src/middleware.ts` on purpose. The middleware
 * can only check the token's signature, not whether the account still exists, so
 * bouncing `/login` from there creates an unbreakable loop once a cookie outlives
 * its user: the protected page redirects to `/login`, the middleware bounces it
 * straight back, and the browser aborts with `ERR_TOO_MANY_REDIRECTS` with no
 * way to sign in. Checking against the database here is what makes the redirect
 * safe.
 *
 * Admins land on the admin panel rather than the dashboard, which the middleware
 * used to do.
 */
export async function redirectIfSignedIn(): Promise<void> {
  const session = await getSession();
  if (session) redirect(session.role === "ADMIN" ? "/admin" : "/dashboard");
}

/** Best-effort client IP, for rate limiting. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}
