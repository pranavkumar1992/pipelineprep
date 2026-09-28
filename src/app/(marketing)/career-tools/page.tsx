import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isCareerToolsLive } from "@/lib/settings";
import { CareerToolsCard } from "@/components/career-tools/career-tools-card";

export const metadata: Metadata = {
  title: "Career Tools (coming soon)",
  description:
    "An ATS-friendly resume maker, job description match and resume review for DevOps and Cloud roles. Join the waitlist.",
  robots: { index: false, follow: true },
};

export default async function CareerToolsPage() {
  // Feature flag: when the teaser is off, the route does not exist.
  if (!(await isCareerToolsLive())) notFound();

  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-wider text-amber-300">
          Coming soon
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">
          Career Tools
        </h1>
        <p className="mt-4 max-w-xl text-slate-400">
          Three tools aimed at the DevOps and Cloud job market. They are not
          built yet, so everything here is a preview and a way to tell us what
          would be useful. We are not taking resumes or running any analysis at
          this stage.
        </p>
      </header>

      <div className="mt-8 space-y-4">
        <FeaturePreview
          index="01"
          title="ATS-Friendly Resume Maker"
          body="Clean, single-column, parseable templates written for DevOps and Cloud roles, so the content survives whatever applicant tracking system reads it first."
          points={[
            "Templates built around the keywords cloud roles actually screen on",
            "No columns, tables, text boxes or graphics that parsers drop",
            "Export to PDF and plain text",
          ]}
        />
        <FeaturePreview
          index="02"
          title="Job Description Match"
          body="Paste a job description and see the skill gaps against your quiz performance, so you know what to revise before an interview."
          points={[
            "Highlights requirements you have not practised",
            "Uses your existing topic accuracy, not a generic checklist",
            "Suggests specific banks to work through",
          ]}
        />
        <FeaturePreview
          index="03"
          title="AI Resume Review"
          body="Feedback on bullet wording and impact, focused on describing outcomes rather than listing tools."
          points={[
            "Bullets that name the problem, the action and the measurable result",
            "Suggests cutting filler and unsupported claims",
            "Runs per-user with usage caps so costs stay predictable",
          ]}
        />
      </div>

      <div className="mt-10">
        <CareerToolsCard source="LANDING" isSignedIn={Boolean(user)} />
      </div>
    </div>
  );
}

function FeaturePreview({
  index,
  title,
  body,
  points,
}: {
  index: string;
  title: string;
  body: string;
  points: string[];
}) {
  return (
    <article className="rounded-2xl border border-ink-700 bg-ink-900 p-6">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="font-mono text-sm text-brand-400/60"
        >
          {index}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-white">{title}</h2>
            <span className="rounded border border-amber-450/30 bg-amber-450/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-300">
              Coming soon
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
          <ul className="mt-4 space-y-1.5">
            {points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2 text-sm text-slate-400"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400"
                />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
