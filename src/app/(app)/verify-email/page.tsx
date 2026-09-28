import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { VerifyEmailClient } from "./verify-email-client";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};

/**
 * Confirmation landing page.
 *
 * The page renders and then submits the token; it does not consume it during
 * render. Consuming during render would mean a refresh attempts to reuse a
 * spent token and shows a failure for a link that actually worked.
 *
 * A session is required so the token cannot be confirmed against a signed-out
 * browser that happens to have the link open, and so the landing page after
 * confirming has somewhere to send the user.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await requireUser("/verify-email");
  const { token } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <VerifyEmailClient token={token ?? ""} />
    </div>
  );
}
