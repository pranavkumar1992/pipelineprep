"use client";

import Link from "next/link";

/**
 * Divider between the third-party sign-in and the email form.
 *
 * `or` is exposed to assistive technology so the relationship is not purely
 * visual.
 */
export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="relative my-5">
      <div aria-hidden="true" className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-ink-800" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-ink-950 px-3 text-xs uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
    </div>
  );
}

/**
 * Google sign-in button.
 *
 * A link rather than a form or a script tag: the OAuth flow starts by
 * navigating to Google, and building that URL client-side would mean shipping
 * credentials logic to the browser for no benefit. The server route mints the
 * signed state and redirects.
 *
 * `next` is carried through so the user returns to where they started rather
 * than always landing on the dashboard.
 */
export function GoogleSignInButton({
  next,
  variant = "signin",
}: {
  next?: string;
  variant?: "signin" | "signup";
}) {
  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <a
      href={`/api/auth/google${query}`}
      className="flex h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-ink-600 bg-ink-800 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-ink-500 hover:bg-ink-700"
    >
      <GoogleMark />
      <span>
        {variant === "signup" ? "Sign up with Google" : "Continue with Google"}
      </span>
    </a>
  );
}

/** Google's brand mark, drawn inline so there is no external image request. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H1v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H1a9 9 0 0 0 0 8.1l2.97-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 1 4.95l2.97 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/**
 * Explains the callback's `error` codes.
 *
 * The callback deliberately sends every genuine failure to the same generic
 * code. These are the recoverable cases a user can actually act on, so they are
 * the only ones with specific copy. Anything else gets the fallback.
 */
export function AuthErrorBanner({ code }: { code?: string }) {
  if (!code) return null;

  const messages: Record<string, string> = {
    "google-not-configured":
      "Google sign-in is not available on this installation. Use your email and password.",
    "google-account-exists":
      "An account with that email already exists and uses a password. Sign in with your password, then link Google from your settings.",
    "google-failed":
      "Google sign-in did not complete. Please try again, or use your email and password.",
    "too-many-attempts":
      "Too many attempts. Please wait a few minutes and try again.",
  };

  return (
    <p
      role="alert"
      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-200"
    >
      {messages[code] ?? "Something went wrong. Please try again."}
    </p>
  );
}

/**
 * Google sign-in, shown only when the server has credentials configured.
 *
 * Rendering the button unconditionally would offer a control that cannot work on
 * an installation without them, so the page passes the flag in.
 */
export function GoogleSignInSection({
  next,
  variant = "signin",
}: {
  next?: string;
  variant?: "signin" | "signup";
}) {
  return (
    <>
      <GoogleSignInButton next={next} variant={variant} />
      <AuthDivider />
    </>
  );
}

export function AuthFooterLink({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-sm text-slate-500">
      <Link href="/" className="hover:text-slate-300">
        {children}
      </Link>
    </p>
  );
}
