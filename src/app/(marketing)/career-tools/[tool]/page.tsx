import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CareerFeature } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { isCareerToolsLive } from "@/lib/settings";
import { CareerToolsCard } from "@/components/career-tools/career-tools-card";

/**
 * Reserved routes for the three Career Tools features.
 *
 * These are placeholders, not implementations. Nothing here uploads a file,
 * parses a document or calls a model. When a feature is built out, its route
 * already exists, is already linked from the teaser, and is already behind the
 * `career_tools_enabled` flag, so only the page body needs replacing.
 *
 * Build notes for whoever implements them (the addendum asks for these to be
 * recorded rather than built):
 *   - File upload needs a hard size limit and a content-type allowlist, enforced
 *     server-side. Never trust the client-supplied type or extension.
 *   - Text extraction should happen in a short-lived job with the original file
 *     discarded afterwards, not streamed into memory on the request.
 *   - The LLM call needs a per-user rate limit and a hard token cap, otherwise a
 *     single account can run up an unbounded bill.
 *   - Premium gating must be enforced server-side in the action, not only by
 *     hiding the link, or the endpoint is callable directly.
 *   - Resumes are personal data: publish a retention window, a deletion path, and
 *     a stated policy before storing any of it.
 */

const RESERVED: Record<
  string,
  { title: string; blurb: string; feature: CareerFeature }
> = {
  resume: {
    title: "ATS-Friendly Resume Maker",
    blurb:
      "Single-column, parseable templates built for DevOps and Cloud roles. No tables, columns, text boxes or graphics that a parser would drop.",
    feature: "RESUME_MAKER",
  },
  "jd-match": {
    title: "Job Description Match",
    blurb:
      "Paste a job description and see the skill gaps against your quiz performance, so you know what to revise before the interview.",
    feature: "JD_MATCH",
  },
  review: {
    title: "AI Resume Review",
    blurb:
      "Feedback on bullet wording and impact: name the problem, the action and the measurable result rather than listing tools.",
    feature: "AI_REVIEW",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const entry = RESERVED[tool];

  // Unknown slugs still need a title for the not-found page.
  if (!entry) return { title: "Coming soon" };

  return {
    title: `${entry.title} (coming soon)`,
    description: `${entry.blurb} Join the waitlist to be told when it launches.`,
    robots: { index: false, follow: true },
  };
}

export default async function ReservedToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  const entry = RESERVED[tool];

  // A slug outside the reserved set is a genuine 404, not a soft placeholder.
  if (!entry) notFound();

  // Same flag as the teaser: with the feature off, none of these routes exist.
  if (!(await isCareerToolsLive())) notFound();

  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-1.5 text-sm text-slate-500">
          <li>
            <Link href="/" className="transition-colors hover:text-brand-400">
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="text-slate-600">
            /
          </li>
          <li>
            <Link href="/career-tools" className="transition-colors hover:text-brand-400">
              Career Tools
            </Link>
          </li>
          <li aria-hidden="true" className="text-slate-600">
            /
          </li>
          <li aria-current="page" className="text-slate-300">
            {entry.title}
          </li>
        </ol>
      </nav>

      <span className="inline-flex items-center gap-1.5 rounded border border-amber-450/30 bg-amber-450/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-300">
        Coming soon
      </span>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {entry.title}
      </h1>

      <p className="mt-4 text-slate-400">{entry.blurb}</p>

      {/*
        The boundary matters as much as the copy: this page accepts no upload and
        calls no model. Saying so plainly is what makes the waitlist signup
        credible.
      */}
      <div className="mt-8 rounded-xl border border-ink-700 bg-ink-900 p-6">
        <h2 className="font-semibold text-white">This is a placeholder</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          The page exists so the feature has somewhere to live, but nothing is
          built yet. No file is uploaded, no document is parsed and no analysis
          runs. Nothing you send here is stored.
        </p>
        <p className="mt-4 text-sm text-slate-400">
          Join the waitlist and we will email you once when it launches.
        </p>
      </div>

      <div className="mt-6">
        <CareerToolsCard source="LANDING" isSignedIn={Boolean(user)} />
      </div>
    </div>
  );
}
