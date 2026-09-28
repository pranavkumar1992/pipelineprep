import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/auth/entitlement";
import { prisma } from "@/lib/db";
import { getScenarioBySlug } from "@/lib/content";
import { ScenarioRunner, type ScenarioDetail } from "@/components/scenario/scenario-runner";
import { AccessBadge, DifficultyBadge } from "@/components/ui/badges";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scenario = await getScenarioBySlug(slug);
  if (!scenario) return { title: "Scenario not found" };

  return {
    title: scenario.title,
    description: scenario.summary,
    alternates: { canonical: `/scenarios/${slug}` },
  };
}

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scenario = await getScenarioBySlug(slug);
  if (!scenario) notFound();

  const user = await getCurrentUser();

  if (!user) redirect(`/signup?next=${encodeURIComponent(`/scenarios/${slug}`)}`);

  const entitlement = await getEntitlement();

  if (scenario.isPremium && !entitlement.isPremium) {
    return <LockedScenario />;
  }

  // Steps are fetched only for authorised users. The `reveal`/`reasoning`/
  // `codeBlocks` columns for later steps stay server-side until the runner
  // advances, so a client that tampers with the DOM cannot read ahead.
  const [steps, progress] = await Promise.all([
    prisma.scenarioStep.findMany({
      where: { scenarioId: scenario.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        prompt: true,
        options: true,
        correctOptions: true,
        reasoning: true,
        codeBlocks: true,
      },
    }),
    prisma.scenarioProgress.findUnique({
      where: {
        userId_scenarioId: { userId: user.id, scenarioId: scenario.id },
      },
      select: { currentStep: true, completedAt: true },
    }),
  ]);

  const detail: ScenarioDetail = {
    id: scenario.id,
    title: scenario.title,
    summary: scenario.summary,
    context: scenario.context,
    symptoms: scenario.symptoms,
    environment: scenario.environment,
    difficulty: scenario.difficulty,
    isPremium: scenario.isPremium,
    tags: scenario.tags,
    durationMin: scenario.durationMin,
    rootCause: scenario.rootCause,
    fix: scenario.fix,
    prevention: scenario.prevention,
    topic: { name: scenario.topic.name, slug: scenario.topic.slug },
    steps,
    // Completed scenarios restart from the beginning; otherwise resume.
    initialStep: progress?.completedAt ? 0 : (progress?.currentStep ?? 0),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6">
        <Link href="/scenarios" className="text-sm text-slate-500 hover:text-slate-300">
          Scenarios
        </Link>
        <span aria-hidden="true" className="mx-2 text-slate-700">
          /
        </span>
        <Link
          href="/quizzes"
          className="text-sm text-slate-500 hover:text-slate-300"
        >
          {scenario.topic.name}
        </Link>
      </nav>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-[11px] uppercase tracking-wide text-brand-400">
            {scenario.topic.name}
          </span>
          <DifficultyBadge level={scenario.difficulty} />
          <AccessBadge isPremium={scenario.isPremium} />
          {scenario.durationMin ? (
            <span className="font-mono text-[11px] text-slate-500">
              ~{scenario.durationMin} min
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
          {scenario.title}
        </h1>
        <p className="mt-3 text-slate-400">{scenario.summary}</p>
        {progress?.completedAt ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded border border-mint-400/25 bg-mint-400/10 px-2 py-1 font-mono text-[11px] text-mint-300">
            <span aria-hidden="true">&#10003;</span> Completed
          </p>
        ) : null}
      </header>

      <ScenarioRunner scenario={detail} />
    </div>
  );
}

async function LockedScenario() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <div className="rounded-2xl border border-ink-700 bg-ink-900 p-8 text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-brand-400/25 bg-brand-400/10 text-xl text-brand-400"
        >
          {"\u25A6"}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          This scenario is part of Premium
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
          Scenario walkthroughs work through a real troubleshooting session step
          by step: what to check, what the output means, the commands to run, and
          how to stop it recurring. Premium unlocks every scenario.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/pricing">See Premium plans</ButtonLink>
          <ButtonLink href="/scenarios" variant="secondary">
            Browse free scenarios
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
