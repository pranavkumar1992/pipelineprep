"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, MailWarning } from "lucide-react";
import { verifyEmailAction, type VerifyEmailState } from "@/app/actions/verify-email";
import { Button } from "@/components/ui/button";

/**
 * Confirmation result screen.
 *
 * The token is submitted by a form rather than consumed during server render,
 * for two reasons: a refresh must not try to reuse an already-spent token, and
 * a failure needs somewhere to be reported without the page being in a state
 * where the link appears broken.
 */
export function VerifyEmailClient({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<VerifyEmailState, FormData>(
    verifyEmailAction,
    {},
  );

  // Null token means the URL had no token at all, so nothing to submit.
  if (!token) {
    return (
      <Result
        ok={false}
        heading="This link is not valid"
        body={
          <>
            The address did not include a confirmation token. Sign in and use the
            resend button on your dashboard to get a fresh link.
          </>
        }
      />
    );
  }

  if (state.ok) {
    return (
      <Result
        ok
        heading="Email address confirmed"
        body={<>You can close this page. Premium plans can now be purchased.</>}
      />
    );
  }

  if (state.error) {
    return (
      <Result
        ok={false}
        heading="That link did not work"
        body={state.error}
        action={
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center rounded-lg bg-brand-400 px-5 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-500"
          >
            Go to dashboard
          </Link>
        }
      />
    );
  }

  return (
    <div className="text-center">
      <form action={formAction}>
        <input type="hidden" name="token" value={token} />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Confirming…" : "Confirm my email"}
        </Button>
      </form>
      <p className="mt-4 text-xs text-slate-500">
        This link works once and expires in 24 hours.
      </p>
    </div>
  );
}

function Result({
  ok,
  heading,
  body,
  action,
}: {
  ok: boolean;
  heading: string;
  body: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <span
        aria-hidden="true"
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
          ok
            ? "border border-mint-400/30 bg-mint-400/10 text-mint-300"
            : "border border-amber-450/30 bg-amber-450/10 text-amber-300"
        }`}
      >
        {ok ? <CheckCircle2 size={22} /> : <MailWarning size={22} />}
      </span>

      <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
        {heading}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
        {body}
      </p>

      <div className="mt-7">{action}</div>
    </div>
  );
}
