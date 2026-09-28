"use client";

import { useActionState } from "react";
import { MailCheck, RefreshCw } from "lucide-react";
import {
  resendVerificationAction,
  type VerifyEmailState,
} from "@/app/actions/verify-email";
import { Button } from "@/components/ui/button";

/**
 * Persistent reminder to confirm an email address.
 *
 * Shown on the dashboard rather than in a modal, because it is not blocking:
 * someone can practise freely without confirming. It explains what the
 * confirmation is actually for (checkout) rather than nagging about it in the
 * abstract, because "verify your email" with no stated reason is the sort of
 * banner people learn to dismiss without reading.
 *
 * Renders nothing at all once confirmed, so the dashboard does not have to know
 * about it.
 */
export function VerifyEmailBanner({
  email,
  verified,
  verifiedVia,
}: {
  email: string;
  verified: boolean;
  verifiedVia: string | null;
}) {
  const [state, formAction, pending] = useActionState<VerifyEmailState, FormData>(
    resendVerificationAction,
    {},
  );

  if (verified) return null;

  return (
    <section
      aria-labelledby="verify-email-heading"
      className="mb-6 rounded-xl border border-amber-450/30 bg-amber-450/5 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <MailCheck
            size={18}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-amber-300"
          />
          <div className="min-w-0">
            <h2
              id="verify-email-heading"
              className="text-sm font-semibold text-amber-100"
            >
              Confirm your email address
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
              You can practise freely either way. Confirming{" "}
              <span className="font-mono">{email}</span> is what lets you buy a
              plan &mdash; we do not take payment on an address we have not
              confirmed.
            </p>
          </div>
        </div>

        <form action={formAction} className="shrink-0">
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={pending}
          >
            <RefreshCw
              size={13}
              aria-hidden="true"
              className={pending ? "animate-spin" : undefined}
            />
            {pending ? "Sending…" : "Resend link"}
          </Button>
        </form>
      </div>

      {/*
        Announced politely so a screen reader hears the outcome without focus
        being moved, which would interrupt whatever the user was reading.
      */}
      <p
        role="status"
        aria-live="polite"
        className={`mt-3 text-sm ${
          state.error ? "text-rose-300" : "text-emerald-300"
        }`}
      >
        {state.message ?? state.error ?? ""}
      </p>

      {/*
        Only meaningful when an address was confirmed by the provider rather than
        by our link, which is worth surfacing in settings.
      */}
      {verifiedVia ? (
        <p className="mt-2 text-xs text-slate-500">
          Confirmed via {verifiedVia}.
        </p>
      ) : null}
    </section>
  );
}
