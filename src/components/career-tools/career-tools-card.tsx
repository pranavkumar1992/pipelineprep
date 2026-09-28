"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import {
  joinCareerWaitlistAction,
  quickJoinWaitlistAction,
  trackTeaserViewAction,
  type WaitlistState,
} from "@/app/actions/career-tools";
import {
  CAREER_FEATURES,
  FEATURE_SLUGS,
  WAITLIST_CONSENT,
} from "@/lib/career-tools";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/form-field";

/**
 * Career Tools teaser (addendum). Teaser and waitlist only: no resume upload,
 * no AI, and every claim is labelled "Coming soon" or "Join the waitlist".
 */
export function CareerToolsCard({
  source,
  isSignedIn,
}: {
  source: "DASHBOARD" | "PRICING" | "LANDING";
  isSignedIn: boolean;
}) {
  useEffect(() => {
    void trackTeaserViewAction(source);
  }, [source]);

  const [state, formAction, pending] = useActionState<WaitlistState, FormData>(
    isSignedIn ? quickJoinWaitlistAction : joinCareerWaitlistAction,
    {},
  );

  return (
    <section
      aria-labelledby="career-tools-heading"
      className="rounded-2xl border border-ink-700 bg-ink-900 p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="career-tools-heading"
              className="font-semibold text-white"
            >
              Career Tools
            </h2>
            <span className="inline-flex items-center gap-1 rounded border border-amber-450/30 bg-amber-450/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-300">
              <Sparkles size={9} aria-hidden="true" />
              Coming soon
            </span>
          </div>
          <p className="mt-1.5 max-w-md text-sm text-slate-400">
            A resume builder, job description matching and resume review, built
            for DevOps and Cloud roles.
          </p>
        </div>

        <Link
          href="/career-tools"
          className="text-sm text-brand-400 hover:underline"
        >
          Details
        </Link>
      </div>

      <ul className="mt-5 grid gap-2.5 sm:grid-cols-3">
        {CAREER_FEATURES.map((feature) => (
          <li
            key={feature.key}
            className="rounded-lg border border-ink-800 bg-ink-850 px-4 py-3"
          >
            {/* Each card links to its reserved route, so the placeholder is
                reachable now rather than only after the feature is built. */}
            <Link
              href={`/career-tools/${FEATURE_SLUGS[feature.key]}`}
              className="text-sm font-medium text-slate-200 transition-colors hover:text-brand-400"
            >
              {feature.title}
            </Link>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {feature.blurb}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        {state.joined ? (
          <div className="space-y-2">
            <FormSuccess message={state.message ?? "You are on the list."} />
            <p className="text-xs text-slate-500">{WAITLIST_CONSENT}</p>
          </div>
        ) : (
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="source" value={source} />

            {isSignedIn ? (
              // One click for a signed-in user: no extra form.
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Notify me"}
              </Button>
            ) : (
              <>
                <p className="font-mono text-xs uppercase tracking-wide text-slate-500">
                  Which do you want most?
                </p>
                <div className="flex flex-col gap-2">
                  {CAREER_FEATURES.map((feature) => (
                    <label
                      key={feature.key}
                      className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300"
                    >
                      <input
                        type="checkbox"
                        name="features"
                        value={feature.key}
                        className="h-4 w-4 rounded border-ink-600 bg-ink-850 text-brand-400 focus:ring-2 focus:ring-brand-400/30"
                      />
                      {feature.title}
                    </label>
                  ))}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="you@example.com"
                    aria-label="Email address"
                    className="flex-1 rounded-lg border border-ink-600 bg-ink-850 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                  />
                  <Button type="submit" disabled={pending}>
                    {pending ? "Joining…" : "Notify me"}
                  </Button>
                </div>
              </>
            )}

            <FormError message={state.error} />

            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Check size={11} aria-hidden="true" />
              {WAITLIST_CONSENT}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
