"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { startAttemptAction } from "@/app/actions/practice";
import { cn } from "@/lib/utils";

type Bank = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  total: number;
  seen: number;
  mastered: number;
  locked: boolean;
};

type Section = {
  topic: { id: string; name: string; slug: string; icon: string };
  banks: Bank[];
};

const LEVEL_LABEL: Record<Bank["level"], string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

const LEVEL_TONE: Record<Bank["level"], string> = {
  BEGINNER: "text-emerald-300",
  INTERMEDIATE: "text-amber-300",
  ADVANCED: "text-rose-300",
};

/**
 * One section per topic, three columns for the levels (addendum §2B). The lock
 * state is decided on the server; this component only renders it, with a lock
 * icon and the word "Premium" so the state never depends on colour alone.
 */
export function BankGrid({ section }: { section: Section }) {
  return (
    <section aria-labelledby={`bank-${section.topic.slug}`}>
      <h3
        id={`bank-${section.topic.slug}`}
        className="text-lg font-semibold text-white"
      >
        {section.topic.name}
      </h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.banks.map((bank) => (
          <BankCard key={bank.id} bank={bank} topicSlug={section.topic.slug} />
        ))}
      </div>
    </section>
  );
}

function BankCard({
  bank,
  topicSlug,
}: {
  bank: Bank;
  topicSlug: string;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seenPct = bank.total > 0 ? Math.round((bank.seen / bank.total) * 100) : 0;
  const masteredPct =
    bank.total > 0 ? Math.round((bank.mastered / bank.total) * 100) : 0;

  if (bank.locked) {
    return (
      <Link
        href="/pricing"
        className="flex flex-col rounded-xl border border-ink-700 bg-ink-900 p-5 transition-colors hover:border-brand-400/40"
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "font-mono text-[11px] uppercase tracking-wide",
              LEVEL_TONE[bank.level],
            )}
          >
            {LEVEL_LABEL[bank.level]}
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-brand-400/30 bg-brand-400/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-brand-400">
            <Lock size={9} aria-hidden="true" />
            Premium
          </span>
        </div>

        <h4 className="mt-2 text-sm font-semibold text-slate-400">
          {bank.title}
        </h4>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500">
          {bank.description}
        </p>

        <p className="mt-4 font-mono text-[11px] text-slate-600">
          Locked &middot; {bank.total} questions
        </p>
      </Link>
    );
  }

  async function start() {
    setStarting(true);
    setError(null);

    const result = await startAttemptAction({ mode: "BANK", bankId: bank.id });
    setStarting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    // sessionStorage rather than the URL: question text in a query string
    // would end up in browser history and server logs.
    sessionStorage.setItem(
      "pp-attempt",
      JSON.stringify({
        mode: result.mode,
        label: result.label,
        durationSec: result.durationSec,
        questions: result.questions,
        bankId: bank.id,
      }),
    );
    router.push("/attempt");
  }

  return (
    <div className="flex flex-col rounded-xl border border-ink-700 bg-ink-900 p-5 transition-colors hover:border-brand-400/40">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "font-mono text-[11px] uppercase tracking-wide",
            LEVEL_TONE[bank.level],
          )}
        >
          {LEVEL_LABEL[bank.level]}
        </span>
        {bank.seen >= bank.total && bank.total > 0 ? (
          <span className="rounded border border-mint-400/30 bg-mint-400/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mint-300">
            Seen
          </span>
        ) : null}
      </div>

      <h4 className="mt-2 text-sm font-semibold text-white">{bank.title}</h4>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-400">
        {bank.description}
      </p>

      <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-slate-500">
        <span>
          {bank.seen} / {bank.total} seen
        </span>
        <span>{masteredPct}% mastered</span>
      </div>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={masteredPct}
        aria-label={`${bank.title} mastered`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            masteredPct >= 80
              ? "bg-mint-400"
              : masteredPct >= 50
                ? "bg-brand-400"
                : "bg-amber-450",
          )}
          style={{ width: `${masteredPct}%` }}
        />
      </div>

      <p className="mt-1.5 font-mono text-[11px] text-slate-600">
        {seenPct}% attempted
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-rose-400">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={start}
        disabled={starting || bank.total === 0}
        className={cn(
          "mt-4 w-full cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
          "bg-brand-400 text-ink-950 hover:bg-brand-500 disabled:opacity-50",
        )}
      >
        {bank.total === 0 ? "No questions yet" : starting ? "Starting…" : "Start"}
      </button>
    </div>
  );
}
