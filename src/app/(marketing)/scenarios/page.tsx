import type { Metadata } from "next";
import { getContentStats, getTopics, listScenarios } from "@/lib/content";
import { prisma } from "@/lib/db";
import { ScenarioFilters } from "@/components/scenario/scenario-filters";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Real-world DevOps incident scenarios",
  description:
    "Guided troubleshooting walkthroughs for incidents that actually happen: ALB 502s, CrashLoopBackOff, evictions, disk exhaustion, flaky pipelines. Step by step, with real commands.",
  alternates: { canonical: "/scenarios" },
};

export default async function ScenariosPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;

  const [scenarios, topics, stats] = await Promise.all([
    listScenarios(),
    getTopics(),
    getContentStats(),
  ]);

  // Per-topic scenario counts for the filter chips.
  const counts = await prisma.scenario.groupBy({
    by: ["topicId"],
    where: { status: "PUBLISHED" },
    _count: { _all: true },
  });
  const topicIdToSlug = new Map(topics.map((t) => [t.id, t.slug]));
  const countBySlug = new Map(
    counts.map((c) => [topicIdToSlug.get(c.topicId) ?? "", c._count._all]),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Incident scenarios
        </h1>
        <p className="mt-4 text-slate-400">
          Guided troubleshooting walkthroughs modelled on incidents that
          actually happen on call. Each step asks what you would check next,
          then explains the reasoning and shows the commands. Ends with root
          cause, fix and prevention.
        </p>
        <p className="mt-5 font-mono text-xs text-slate-500">
          {pluralize(stats.scenarios, "scenario")} &middot;{" "}
          {stats.freeScenarios} free
        </p>
      </header>

      <div className="mt-10">
        <ScenarioFilters
          scenarios={scenarios}
          topics={topics.map((t) => ({
            slug: t.slug,
            name: t.name,
            count: countBySlug.get(t.slug) ?? 0,
          }))}
          initialTopic={topic ?? ""}
        />
      </div>
    </div>
  );
}
