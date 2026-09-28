"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import {
  AttemptPlayer,
  type AttemptQuestionPayload,
} from "@/components/practice/attempt-player";

export const ATTEMPT_STORAGE_KEY = "pp-attempt";

type StoredAttempt = {
  mode: string;
  label: string;
  durationSec: number | null;
  questions: AttemptQuestionPayload[];
  bankId?: string;
};

/**
 * Renders an attempt started from /quizzes.
 *
 * The drawn questions are held in sessionStorage rather than the URL, so they
 * never reach browser history, referrer headers or server logs. They are not
 * persisted longer than the tab: reloading loses the attempt, which is the
 * safer default. Correct answers are never stored, since grading happens
 * server-side on submit.
 */
export function AttemptClient() {
  const [attempt, setAttempt] = useState<StoredAttempt | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(ATTEMPT_STORAGE_KEY);
    if (raw) {
      try {
        setAttempt(JSON.parse(raw) as StoredAttempt);
      } catch {
        sessionStorage.removeItem(ATTEMPT_STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading attempt">
        <div className="h-4 w-40 rounded bg-ink-850" />
        <div className="h-1.5 rounded-full bg-ink-850" />
        <div className="h-72 rounded-xl bg-ink-850" />
      </div>
    );
  }

  if (!attempt || !Array.isArray(attempt.questions) || attempt.questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-600 py-20 text-center">
        <AlertCircle
          size={24}
          className="mx-auto text-slate-600"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-lg font-semibold text-white">
          No attempt in progress
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
          Attempts are not kept between page loads, so start a new one from the
          quizzes page.
        </p>
        <Link
          href="/quizzes"
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand-400 px-5 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-500"
        >
          Go to quizzes
        </Link>
      </div>
    );
  }

  return (
    <AttemptPlayer
      questions={attempt.questions}
      label={attempt.label}
      mode={attempt.mode}
      bankId={attempt.bankId}
      durationSec={attempt.durationSec}
    />
  );
}
