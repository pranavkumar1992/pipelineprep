import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Route gating.
 *
 * Server components still call `requireUser` / `requireAdmin` as defence in
 * depth, but a `redirect()` thrown during a streamed server render serves the
 * target page's content at the original URL. That leaves an unauthenticated
 * visitor sitting on `/quizzes` looking at a login form with no navigation.
 *
 * Redirecting here, before rendering begins, produces a real 307 and also
 * avoids the database round-trip for requests that cannot succeed anyway.
 */

const SESSION_COOKIE = "pp_session";

/** Routes reachable only when signed in. */
const PROTECTED = [
  "/dashboard",
  "/quizzes",
  "/daily",
  "/attempt",
  "/leaderboard",
  "/practice",
  "/verify-email",
];

/*
 * The auth screens are NOT gated here.
 *
 * Redirecting a signed-in visitor away from `/login` is the one thing this
 * middleware used to do beyond blocking protected routes, and it had to be
 * removed. The middleware runs on the edge and cannot query the database, so all
 * it can see is a valid signature. A cookie that outlives its user — which is
 * exactly what `deleteAccountAction` leaves behind, since the token is valid for
 * 30 days — therefore looks signed in forever:
 *
 *   /dashboard -> page redirects to /login -> middleware bounces to /dashboard
 *
 * and the browser aborts with ERR_TOO_MANY_REDIRECTS. The visitor is stuck on an
 * error page with no way to sign in again.
 *
 * The pages call `redirectIfSignedIn()` instead, which resolves the session
 * against the database first. `/reset-password` deliberately renders for a
 * signed-in user rather than bouncing them: a reset link proves email ownership,
 * and refusing to honour one because the visitor is already logged in is a
 * footgun.
 */

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Fail closed rather than fall back to a guessable key.
    throw new Error("AUTH_SECRET is not set. Refusing to verify sessions.");
  }
  return new TextEncoder().encode(secret);
}

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdmin = matches(pathname, ["/admin"]);
  const isProtected = matches(pathname, PROTECTED);

  if (!isAdmin && !isProtected) {
    return NextResponse.next();
  }

  const token: string | undefined = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return loginRedirect(request);
  }

  let role = "USER";
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "pipelineprep",
    });
    role = String(payload.role ?? "USER");
  } catch {
    // Expired or tampered: treat as signed out and clear the cookie.
    const response = loginRedirect(request);
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  if (isAdmin && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

function loginRedirect(request: NextRequest): NextResponse {
  const url = new URL("/login", request.url);
  /*
   * The query string is carried through as well as the path. Without it, a
   * signed-out user following a confirmation link would be sent to /login with
   * `next=/verify-email` and the token stripped out of the URL, so signing in
   * would land them on a page that can no longer do anything.
   */
  url.searchParams.set(
    "next",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Every request except static assets and image optimisation output, which
     * the negative lookahead filters out before the function is invoked.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$).*)",
  ],
};
