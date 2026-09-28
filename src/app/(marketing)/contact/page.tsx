import Link from "next/link";
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with PipelinePrep about billing, content, team pricing or anything else. We reply within one business day.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Get in touch
          </h1>
          <p className="mt-4 text-slate-400">
            Billing questions, content requests, team or college pricing, or a
            correction to an answer. We read everything and reply within one
            business day.
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-6">
            <h2 className="font-mono text-xs uppercase tracking-wider text-slate-500">
              Email
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              <a
                href={`mailto:${env.businessSupportEmail()}`}
                className="text-brand-400 underline underline-offset-4"
              >
                {env.businessSupportEmail()}
              </a>
            </p>
            {env.businessPhone() ? (
              <p className="mt-2 text-sm text-slate-400">{env.businessPhone()}</p>
            ) : null}
          </div>

          <div className="rounded-xl border border-ink-700 bg-ink-900 p-6">
            <h2 className="font-mono text-xs uppercase tracking-wider text-slate-500">
              Before you write
            </h2>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
              <li>
                Found a wrong answer? Tell us which quiz and question and we
                will review it.
              </li>
              <li>
                Refund or billing issue? Include your registered email and the
                payment reference so we can find it faster.
              </li>
              <li>
                Password trouble? Use the reset link on the sign-in page rather
                than emailing us.
              </li>
            </ul>
            <p className="mt-4 text-sm">
              <Link
                href="/refund"
                className="text-brand-400 underline underline-offset-4"
              >
                Read the refund policy
              </Link>
            </p>
          </div>

          <div className="rounded-xl border border-ink-700 bg-ink-900 p-6">
            <h2 className="font-mono text-xs uppercase tracking-wider text-slate-500">
              Response time
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              One business day for most messages. If your email is about a failed
              payment or access, mention it in the subject and we will prioritise
              it.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
