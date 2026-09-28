"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bookmark,
  Flame,
  Shuffle,
  Target,
  Timer,
  Zap,
} from "lucide-react";
import { startAttemptAction } from "@/app/actions/practice";
import { QUICK_PRACTICE_QUESTIONS } from "@/lib/practice-config";
import { cn } from "@/lib/utils";

type Availability = Record<string, { available: boolean; count: number }>;

const MODES = [
  {
    key: "REVISION",
    icon: Bookmark,
    title: "Revision",
    body: "Practise the questions you bookmarked or marked as hard.",
    emptyHint: "Bookmark or mark questions as hard while practising and they collect here.",
  },
  {
    key: "FOCUS",
    icon: Target,
    title: "Focus Areas",
    body: "Automatically targets the topics you are weakest in.",
    emptyHint: "Answer questions across a few topics and weak areas get detected.",
  },
  {
    key: "MISTAKES",
    icon: Flame,
    title: "Practice Mistakes",
    body: "Retry only the questions you have previously answered wrong.",
    emptyHint: "Nothing missed yet. Any wrong answers will appear here.",
  },
  {
    key: "QUICK",
    icon: Zap,
    title: "Quick Practice",
    body: `${QUICK_PRACTICE_QUESTIONS} random questions, one click, no setup.`,
    badge: "Instant",
  },
  {
    key: "MOCK",
    icon: Timer,
    title: "Mixed Mock Test",
    body: "Random questions across every topic with a countdown timer.",
    badge: "Timed",
  },
] as const;

export function PracticeModeCards({
  availability,
}: {
  availability: Availability;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(mode: string) {
    setStarting(mode);
    setError(null);

    const result = await startAttemptAction({ mode });
    setStarting(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    // Stored in sessionStorage rather than the URL: question text in a query
    // string would end up in browser history and server logs. Correct answers
    // are not included, only question text and options.
    sessionStorage.setItem(
      "pp-attempt",
      JSON.stringify({
        mode: result.mode,
        label: result.label,
        durationSec: result.durationSec,
        questions: result.questions,
      }),
    );
    router.push("/attempt");
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {MODES.map((mode) => {
          const info = availability[mode.key];
          const Icon = mode.icon;
          // Only the data-driven modes can be empty; Quick and Mock always can.
          const needsData = mode.key !== "QUICK" && mode.key !== "MOCK";
          const isEmpty = needsData && info !== undefined && !info.available;
          const busy = starting === mode.key;

          return (
            <div
              key={mode.key}
              className="flex flex-col rounded-xl border border-ink-700 bg-ink-900 p-5 transition-colors hover:border-brand-400/40"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-400/25 bg-brand-400/10 text-brand-400"
                >
                  <Icon size={16} />
                </span>
                {"badge" in mode && mode.badge ? (
                  <span className="rounded border border-ink-600 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-400">
                    {mode.badge}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-3 text-sm font-semibold text-white">{mode.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-400">
                {mode.body}
              </p>

              {info?.available && needsData ? (
                <p className="mt-2 font-mono text-[11px] text-slate-500">
                  {info.count} question{info.count === 1 ? "" : "s"} ready
                </p>
              ) : null}

              <div className="mt-4">
                {isEmpty ? (
                  <p className="flex items-start gap-1.5 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {"emptyHint" in mode ? mode.emptyHint : null}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => start(mode.key)}
                    disabled={starting !== null}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                      "bg-brand-400 text-ink-950 hover:bg-brand-500 disabled:opacity-60",
                    )}
                  >
                    <Shuffle size={14} aria-hidden="true" />
                    {busy ? "Starting…" : "Start"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
