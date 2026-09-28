"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Flag, RotateCcw } from "lucide-react";
import {
  finishAttemptAction,
  flagQuestionAction,
  submitAnswerAction,
} from "@/app/actions/practice";
import { cn, formatDuration } from "@/lib/utils";

export type AttemptQuestionPayload = {
  id: string;
  text: string;
  options: string[];
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topicName: string;
};

type Graded = {
  correct: boolean;
  correctOption: number;
  correctText: string;
  explanation: string;
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Shared with the attempt page so both read and clear the same key. */
const ATTEMPT_KEY = "pp-attempt";

export function AttemptPlayer({
  questions,
  label,
  mode,
  bankId,
  durationSec,
}: {
  questions: AttemptQuestionPayload[];
  label: string;
  mode: string;
  bankId?: string;
  durationSec: number | null;
}) {
  const router = useRouter();

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isHard, setIsHard] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    percentage: number;
    duration: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(durationSec ?? 0);

  const startedAt = useRef(Date.now());
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Mock test countdown: auto-submits at zero, and hides feedback until then.
  const isTimed = durationSec !== null && mode === "MOCK";
  const [timedOut, setTimedOut] = useState(false);

  const total = questions.length;
  const question = questions[index];
  const isLast = index === total - 1;

  async function finish() {
    const res = await finishAttemptAction({
      mode: mode as never,
      bankId,
      total,
      score,
      duration: Math.round((Date.now() - startedAt.current) / 1000),
    });

    if (res.ok) {
      setResult({
        score: res.score,
        total: res.total,
        percentage: res.percentage,
        duration: res.duration,
      });
      setFinished(true);
    } else {
      setError(res.error);
    }
  }

  useEffect(() => {
    if (!isTimed || finished) return;

    const timer = setInterval(() => {
      setRemaining((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimed, finished]);

  // Auto-submit when the countdown reaches zero.
  useEffect(() => {
    if (isTimed && remaining === 0 && !finished && !timedOut) {
      setTimedOut(true);
      void finish();
    }
  }, [isTimed, remaining, finished, timedOut]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [index]);

  const percentage = useMemo(() => {
    if (!result) return 0;
    return Math.round((result.score / result.total) * 100);
  }, [result]);

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-600 py-16 text-center">
        <p className="text-slate-400">No questions available right now.</p>
        <Link href="/quizzes" className="mt-3 inline-block text-sm text-brand-400">
          Back to quizzes
        </Link>
      </div>
    );
  }

  if (finished && result) {
    return (
      <AttemptResult
        label={label}
        score={result.score}
        total={result.total}
        percentage={percentage}
        duration={result.duration}
        mode={mode}
        bankId={bankId}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between font-mono text-xs text-slate-500">
          <span>{label}</span>
          <span className="flex items-center gap-4">
            <span className="text-slate-400">
              {score} / {total}
            </span>
            {isTimed ? (
              <span
                role="timer"
                className={cn(
                  remaining < 60 && "font-semibold text-rose-400",
                  remaining < 60 && !timedOut && "animate-pulse",
                )}
              >
                {formatDuration(remaining)}
              </span>
            ) : null}
          </span>
        </div>

        <div
          className="h-1.5 overflow-hidden rounded-full bg-ink-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          aria-label="Attempt progress"
        >
          <div
            className="h-full rounded-full bg-brand-400 transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </header>

      <article className="rounded-xl border border-ink-700 bg-ink-900 p-6">
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px]">
          <span className="uppercase tracking-wide text-brand-400">
            {question.topicName}
          </span>
          <span className="uppercase tracking-wide text-slate-600">
            {question.difficulty}
          </span>
          <span className="text-slate-700">
            Question {index + 1} of {total}
          </span>
        </div>

        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-3 text-lg font-medium leading-relaxed text-white outline-none"
        >
          {question.text}
        </h2>

        <fieldset className="mt-6 space-y-2.5" disabled={graded !== null}>
          <legend className="sr-only">Choose one answer</legend>
          {question.options.map((option, i) => {
            const isSelected = selected === i;
            const isAnswer = graded?.correctOption === i;

            return (
              <label
                key={i}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                  graded
                    ? isAnswer
                      ? "cursor-default border-mint-400/40 bg-mint-400/10 text-mint-200"
                      : isSelected
                        ? "cursor-default border-rose-400/40 bg-rose-400/10 text-rose-200"
                        : "cursor-default border-ink-700 bg-ink-850 text-slate-500"
                    : "border-ink-700 bg-ink-850 hover:border-ink-600 hover:bg-ink-800",
                  isSelected && !graded && "border-brand-400/50 bg-brand-400/5",
                )}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  checked={isSelected}
                  onChange={() => setSelected(i)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[11px]",
                    graded && isAnswer
                      ? "border-mint-400 bg-mint-400 text-ink-950"
                      : graded && isSelected
                        ? "border-rose-400 bg-rose-400 text-ink-950"
                        : isSelected
                          ? "border-brand-400 bg-brand-400 text-ink-950"
                          : "border-ink-600 text-slate-500",
                  )}
                >
                  {graded && isAnswer
                    ? "\u2713"
                    : graded && isSelected
                      ? "\u2715"
                      : LETTERS[i]}
                </span>
                <span className="flex-1 leading-relaxed">{option}</span>
                {isSelected && !graded ? (
                  <span className="sr-only">Selected</span>
                ) : null}
              </label>
            );
          })}
        </fieldset>

        {/* Bookmark and hard-mark feed Revision mode (addendum §3). */}
        {!isTimed ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <FlagButton
              active={isHard}
              onClick={async () => {
                const next = !isHard;
                setIsHard(next);
                const res = await flagQuestionAction({
                  questionId: question.id,
                  isHard: next,
                });
                if (res.ok) setIsHard(res.isHard);
              }}
              icon={<Flag size={13} aria-hidden="true" />}
              label="Mark as hard"
            />
            <FlagButton
              active={bookmarked}
              onClick={async () => {
                const next = !bookmarked;
                setBookmarked(next);
                const res = await flagQuestionAction({
                  questionId: question.id,
                  isBookmarked: next,
                });
                if (res.ok) setBookmarked(res.bookmarked);
              }}
              icon={<Bookmark size={13} aria-hidden="true" />}
              label="Bookmark"
            />
          </div>
        ) : null}

        {graded ? (
          <div
            role="status"
            className={cn(
              "mt-5 rounded-lg border p-4",
              graded.correct
                ? "border-mint-400/30 bg-mint-400/5"
                : "border-amber-450/30 bg-amber-450/5",
            )}
          >
            <p
              className={cn(
                "font-semibold",
                graded.correct ? "text-mint-300" : "text-amber-300",
              )}
            >
              {graded.correct
                ? "Correct"
                : `Incorrect. The answer is: ${graded.correctText}`}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {graded.explanation}
            </p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 text-sm text-rose-400">
            {error}
          </p>
        ) : null}
      </article>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setIndex((i) => Math.max(0, i - 1));
            setSelected(null);
            setGraded(null);
          }}
          disabled={index === 0 || submitting}
          className="cursor-pointer rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-ink-800 hover:text-white disabled:opacity-40"
        >
          Previous
        </button>

        {graded === null ? (
          <button
            type="button"
            disabled={selected === null || submitting}
            onClick={async () => {
              if (selected === null) return;
              setSubmitting(true);
              setError(null);

              const res = await submitAnswerAction({
                questionId: question.id,
                selectedOption: selected,
              });
              setSubmitting(false);

              if (!res.ok) {
                setError(res.error);
                return;
              }

              setGraded({
                correct: res.correct,
                correctOption: res.correctOption,
                correctText: res.correctText,
                explanation: res.explanation,
              });
              if (res.correct) setScore((s) => s + 1);
            }}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-semibold transition-colors",
              selected === null
                ? "cursor-not-allowed bg-ink-800 text-slate-600"
                : "cursor-pointer bg-brand-400 text-ink-950 hover:bg-brand-500",
            )}
          >
            {submitting ? "Submitting…" : "Submit answer"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (isLast) {
                void finish();
                return;
              }
              setIndex((i) => i + 1);
              setSelected(null);
              setGraded(null);
            }}
            className="rounded-lg bg-brand-400 px-5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-500"
          >
            {isLast ? "See results" : "Next question"}
          </button>
        )}
      </div>

      <p className="text-center text-xs text-slate-600">
        Answered {index + (graded ? 1 : 0)} of {total}
      </p>

      {timedOut ? (
        <p role="status" className="text-center text-sm text-amber-300">
          Time is up. Submitting your answers.
        </p>
      ) : null}
    </div>
  );
}

function FlagButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] transition-colors",
        active
          ? "border-brand-400/40 bg-brand-400/10 text-brand-400"
          : "border-ink-600 bg-ink-850 text-slate-500 hover:text-slate-300",
      )}
    >
      {icon}
      {active ? `${label} · on` : label}
    </button>
  );
}

function AttemptResult({
  label,
  score,
  total,
  percentage,
  duration,
  mode,
  bankId,
}: {
  label: string;
  score: number;
  total: number;
  percentage: number;
  duration: number;
  mode: string;
  bankId?: string;
}) {
  const router = useRouter();

  const verdict =
    percentage >= 90
      ? { label: "Excellent", tone: "text-mint-400" }
      : percentage >= 70
        ? { label: "Good", tone: "text-brand-400" }
        : percentage >= 50
          ? { label: "Getting there", tone: "text-amber-450" }
          : { label: "Worth another pass", tone: "text-amber-450" };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-ink-700 bg-ink-900 p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-4 font-mono text-6xl font-bold text-white">
          {score}
          <span className="text-2xl text-slate-600">/{total}</span>
        </p>
        <p className={cn("mt-3 text-lg font-medium", verdict.tone)}>
          {verdict.label} &middot; {percentage}%
        </p>
        <p className="mt-2 font-mono text-xs text-slate-500">
          Completed in {formatDuration(duration)}
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              // Reload and re-draw rather than reusing the same questions.
              sessionStorage.removeItem(ATTEMPT_KEY);
              router.push("/quizzes");
            }}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-brand-400 px-5 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-500"
          >
            <RotateCcw size={14} aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/dashboard/performance"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 px-5 text-sm font-medium text-slate-200 transition-colors hover:bg-ink-700"
          >
            See performance
          </Link>
          <Link
            href="/quizzes"
            className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium text-slate-400 transition-colors hover:bg-ink-800 hover:text-white"
          >
            Back to quizzes
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-slate-600">
        Progress and mastery counts update on your dashboard as you answer.
      </p>
    </div>
  );
}
