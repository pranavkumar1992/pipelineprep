"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PublicScenario } from "@/lib/content";
import { AccessBadge, DifficultyBadge } from "@/components/ui/badges";
import { cn, pluralize } from "@/lib/utils";

export function ScenarioFilters({
  scenarios,
  topics,
  initialTopic,
}: {
  scenarios: PublicScenario[];
  topics: Array<{ slug: string; name: string; count: number }>;
  initialTopic: string;
}) {
  const [topic, setTopic] = useState(initialTopic);
  const [access, setAccess] = useState<"ALL" | "FREE" | "PREMIUM">("ALL");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return scenarios.filter((scenario) => {
      if (access === "FREE" && scenario.isPremium) return false;
      if (access === "PREMIUM" && !scenario.isPremium) return false;
      if (needle) {
        const haystack =
          `${scenario.title} ${scenario.summary} ${scenario.topic.name} ${scenario.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [scenarios, access, query]);

  // Topic chips filter client-side; `topic` only narrows what is displayed.
  const visibleTopics = topics.filter((t) => (topic ? t.slug === topic : true));
  const scoped = topic
    ? filtered.filter((s) => s.topic.slug === topic)
    : filtered;

  return (
    <div className="space-y-6">
      <div className="relative">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <label htmlFor="scenario-search" className="sr-only">
          Search scenarios
        </label>
        <input
          id="scenario-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search scenarios, symptoms or topics…"
          className="w-full rounded-lg border border-ink-600 bg-ink-900 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTopic("")}
          aria-pressed={topic === ""}
          className={cn(
            "cursor-pointer rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors",
            topic === ""
              ? "border-brand-400/50 bg-brand-400/15 text-brand-400"
              : "border-ink-700 bg-ink-850 text-slate-400 hover:text-slate-200",
          )}
        >
          All topics
        </button>
        {visibleTopics.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => setTopic(topic === t.slug ? "" : t.slug)}
            aria-pressed={topic === t.slug}
            className={cn(
              "cursor-pointer rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors",
              topic === t.slug
                ? "border-brand-400/50 bg-brand-400/15 text-brand-400"
                : "border-ink-700 bg-ink-850 text-slate-400 hover:text-slate-200",
            )}
          >
            {t.name} <span className="text-slate-600">{t.count}</span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {(["ALL", "FREE", "PREMIUM"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setAccess(key)}
              aria-pressed={access === key}
              className={cn(
                "cursor-pointer rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors",
                access === key
                  ? "border-brand-400/50 bg-brand-400/15 text-brand-400"
                  : "border-ink-700 bg-ink-850 text-slate-400 hover:text-slate-200",
              )}
            >
              {key === "ALL" ? "Any" : key === "FREE" ? "Free" : "Premium"}
            </button>
          ))}
        </div>
      </div>

      <p className="font-mono text-xs text-slate-500" aria-live="polite">
        {pluralize(scoped.length, "scenario")}
      </p>

      {scoped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-600 py-16 text-center">
          <p className="text-sm text-slate-400">No scenarios match those filters.</p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {scoped.map((scenario) => (
            <li key={scenario.id}>
              <Link
                href={`/scenarios/${scenario.slug}`}
                className="group flex flex-col gap-3 rounded-xl border border-ink-700 bg-ink-900 p-5 transition-all hover:border-brand-400/40 sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="min-w-0 flex-1">
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
                  <h3 className="mt-2 font-semibold text-white group-hover:text-brand-400">
                    {scenario.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                    {scenario.summary}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-slate-600 group-hover:text-brand-400 sm:text-sm">
                  {scenario.stepCount} steps &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
